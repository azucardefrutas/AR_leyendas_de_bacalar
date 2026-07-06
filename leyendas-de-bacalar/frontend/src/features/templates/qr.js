// Self-contained QR Code generator — byte mode, ECC level M, no dependencies.
// Implements ISO/IEC 18004 for versions 1–10 (a URL up to ~180 bytes). Returns a
// square matrix of booleans (true = dark module). The Reed-Solomon core is
// validated against the ISO worked example and the output against structural
// invariants (see qr self-test). Kept dependency-free on purpose: node_modules is
// tracked in this repo, so we do not add a QR library.

// ---- Galois field GF(256), primitive polynomial 0x11D ----
const EXP = new Array(256);
const LOG = new Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  EXP[255] = EXP[0];
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] + LOG[b]) % 255];
}

// Reed-Solomon divisor (generator) polynomial coefficients, high power → low.
function rsDivisor(degree) {
  const result = new Array(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

// Reed-Solomon error-correction codewords for `data` (Uint8-like array).
function rsRemainder(data, divisor) {
  const result = new Array(divisor.length).fill(0);
  for (let d = 0; d < data.length; d += 1) {
    const factor = data[d] ^ result[0];
    result.shift();
    result.push(0);
    for (let i = 0; i < result.length; i += 1) {
      result[i] ^= gfMul(divisor[i], factor);
    }
  }
  return result;
}

// ---- Version tables (ECC level M) ----
// [ecPerBlock, numBlocksG1, dataPerBlockG1, numBlocksG2, dataPerBlockG2]
const EC_M = {
  1: [10, 1, 16, 0, 0],
  2: [16, 1, 28, 0, 0],
  3: [26, 1, 44, 0, 0],
  4: [18, 2, 32, 0, 0],
  5: [24, 2, 43, 0, 0],
  6: [16, 4, 27, 0, 0],
  7: [18, 4, 31, 0, 0],
  8: [22, 2, 38, 2, 39],
  9: [22, 3, 36, 2, 37],
  10: [26, 4, 43, 1, 44],
};

const ALIGN_POS = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

function totalDataCodewords(version) {
  const [, n1, d1, n2, d2] = EC_M[version];
  return n1 * d1 + n2 * d2;
}

function charCountBits(version) {
  return version <= 9 ? 8 : 16; // byte mode
}

// Smallest version (1–10) whose data capacity fits `byteLen`.
function pickVersion(byteLen) {
  for (let v = 1; v <= 10; v += 1) {
    const capacityBits = totalDataCodewords(v) * 8;
    const needed = 4 + charCountBits(v) + byteLen * 8;
    if (needed <= capacityBits) return v;
  }
  return null;
}

// ---- Bit buffer ----
function makeBits() {
  const bits = [];
  return {
    bits,
    put(value, len) {
      for (let i = len - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
    },
  };
}

function encodeData(bytes, version) {
  const buf = makeBits();
  buf.put(0b0100, 4); // byte mode
  buf.put(bytes.length, charCountBits(version));
  for (let i = 0; i < bytes.length; i += 1) buf.put(bytes[i], 8);

  const capacityBits = totalDataCodewords(version) * 8;
  // Terminator (up to 4 zero bits)
  const remaining = capacityBits - buf.bits.length;
  buf.put(0, Math.min(4, Math.max(0, remaining)));
  // Pad to a byte boundary
  while (buf.bits.length % 8 !== 0) buf.bits.push(0);
  // Pad codewords 0xEC / 0x11 alternating
  const padBytes = [0xec, 0x11];
  let p = 0;
  while (buf.bits.length < capacityBits) {
    buf.put(padBytes[p % 2], 8);
    p += 1;
  }

  // Bits → data codewords
  const codewords = [];
  for (let i = 0; i < buf.bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | buf.bits[i + j];
    codewords.push(byte);
  }
  return codewords;
}

// Split data into blocks, compute ECC, and interleave per ISO/IEC 18004.
function buildFinalCodewords(dataCodewords, version) {
  const [ecPerBlock, n1, d1, n2, d2] = EC_M[version];
  const divisor = rsDivisor(ecPerBlock);
  const blocks = [];
  let offset = 0;
  const specs = [];
  for (let i = 0; i < n1; i += 1) specs.push(d1);
  for (let i = 0; i < n2; i += 1) specs.push(d2);
  for (const size of specs) {
    const data = dataCodewords.slice(offset, offset + size);
    offset += size;
    blocks.push({ data, ec: rsRemainder(data, divisor) });
  }

  const result = [];
  const maxData = Math.max(...specs);
  for (let i = 0; i < maxData; i += 1) {
    for (const block of blocks) {
      if (i < block.data.length) result.push(block.data[i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (const block of blocks) result.push(block.ec[i]);
  }
  return result;
}

// ---- Matrix construction ----
function createMatrix(size) {
  const modules = [];
  const reserved = [];
  for (let i = 0; i < size; i += 1) {
    modules.push(new Array(size).fill(false));
    reserved.push(new Array(size).fill(false));
  }
  return { size, modules, reserved };
}

function setModule(m, r, c, dark, reserve = true) {
  m.modules[r][c] = dark;
  if (reserve) m.reserved[r][c] = true;
}

function placeFinder(m, row, col) {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || rr >= m.size || cc < 0 || cc >= m.size) continue;
      const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      setModule(m, rr, cc, inRing || inCore);
    }
  }
}

function placeAlignment(m, version) {
  const pos = ALIGN_POS[version];
  for (const r of pos) {
    for (const c of pos) {
      // Skip the three finder-pattern corners
      if ((r === 6 && c === 6) || (r === 6 && c === pos[pos.length - 1]) || (r === pos[pos.length - 1] && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const isBorder = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setModule(m, r + dr, c + dc, isBorder);
        }
      }
    }
  }
}

function placeTiming(m) {
  for (let i = 8; i < m.size - 8; i += 1) {
    const dark = i % 2 === 0;
    if (!m.reserved[6][i]) setModule(m, 6, i, dark);
    if (!m.reserved[i][6]) setModule(m, i, 6, dark);
  }
}

function reserveFormatAndVersion(m, version) {
  const size = m.size;
  // Format info areas (around the finders) + dark module
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      m.reserved[8][i] = true;
      m.reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    m.reserved[8][size - 1 - i] = true;
    m.reserved[size - 1 - i][8] = true;
  }
  setModule(m, size - 8, 8, true); // dark module (always set later too)
  // Version info (v7+)
  if (version >= 7) {
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        m.reserved[i][size - 11 + j] = true;
        m.reserved[size - 11 + j][i] = true;
      }
    }
  }
}

function placeData(m, codewords) {
  const size = m.size;
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  const getBit = (idx) => (idx < totalBits ? (codewords[idx >> 3] >> (7 - (idx & 7))) & 1 : 0);

  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    const c0 = col === 6 ? col - 1 : col; // skip vertical timing column
    for (let i = 0; i < size; i += 1) {
      const row = upward ? size - 1 - i : i;
      for (let k = 0; k < 2; k += 1) {
        const c = c0 - k;
        if (m.reserved[row][c]) continue;
        m.modules[row][c] = getBit(bitIndex) === 1;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function applyMask(m, maskIndex) {
  const mask = MASKS[maskIndex];
  const out = createMatrix(m.size);
  for (let r = 0; r < m.size; r += 1) {
    for (let c = 0; c < m.size; c += 1) {
      out.reserved[r][c] = m.reserved[r][c];
      let dark = m.modules[r][c];
      if (!m.reserved[r][c] && mask(r, c)) dark = !dark;
      out.modules[r][c] = dark;
    }
  }
  return out;
}

function penalty(m) {
  const size = m.size;
  const mod = m.modules;
  let score = 0;
  // Rule 1: runs of 5+ same-color in row/col
  for (let r = 0; r < size; r += 1) {
    let runC = 1; let runR = 1;
    for (let c = 1; c < size; c += 1) {
      if (mod[r][c] === mod[r][c - 1]) { runC += 1; } else { if (runC >= 5) score += runC - 2; runC = 1; }
      if (mod[c][r] === mod[c - 1][r]) { runR += 1; } else { if (runR >= 5) score += runR - 2; runR = 1; }
    }
    if (runC >= 5) score += runC - 2;
    if (runR >= 5) score += runR - 2;
  }
  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const v = mod[r][c];
      if (v === mod[r][c + 1] && v === mod[r + 1][c] && v === mod[r + 1][c + 1]) score += 3;
    }
  }
  // Rule 3: finder-like patterns 1:1:3:1:1 with 4 light on either side
  const pat1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pat2 = [false, false, false, false, true, false, true, true, true, false, true];
  const matchAt = (line, i, pat) => {
    for (let k = 0; k < pat.length; k += 1) if (line[i + k] !== pat[k]) return false;
    return true;
  };
  const cols = [];
  for (let c = 0; c < size; c += 1) {
    const col = new Array(size);
    for (let r = 0; r < size; r += 1) col[r] = mod[r][c];
    cols.push(col);
  }
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j <= size - 11; j += 1) {
      if (matchAt(mod[i], j, pat1) || matchAt(mod[i], j, pat2)) score += 40;
      if (matchAt(cols[i], j, pat1) || matchAt(cols[i], j, pat2)) score += 40;
    }
  }
  // Rule 4: proportion of dark modules
  let dark = 0;
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) if (mod[r][c]) dark += 1;
  const percent = (dark * 100) / (size * size);
  const prev = Math.floor(percent / 5) * 5;
  score += Math.min(Math.abs(prev - 50), Math.abs(prev + 5 - 50)) / 5 * 10;
  return score;
}

// BCH(15,5) format info; ecLevel M = 0b00.
function formatBits(maskIndex) {
  const data = (0b00 << 3) | maskIndex;
  let d = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if ((d >> i) & 1) d ^= 0x537 << (i - 10);
  }
  const bits = ((data << 10) | d) ^ 0x5412;
  return bits & 0x7fff;
}

function placeFormat(m, maskIndex) {
  const size = m.size;
  const bits = formatBits(maskIndex);
  const get = (i) => (bits >> i) & 1;
  // Around top-left finder
  for (let i = 0; i <= 5; i += 1) setModule(m, 8, i, get(i) === 1);
  setModule(m, 8, 7, get(6) === 1);
  setModule(m, 8, 8, get(7) === 1);
  setModule(m, 7, 8, get(8) === 1);
  for (let i = 9; i <= 14; i += 1) setModule(m, 14 - i, 8, get(i) === 1);
  // Around the other two finders
  for (let i = 0; i <= 7; i += 1) setModule(m, size - 1 - i, 8, get(i) === 1);
  for (let i = 8; i <= 14; i += 1) setModule(m, 8, size - 15 + i, get(i) === 1);
  setModule(m, size - 8, 8, true); // dark module
}

// 18-bit version info (BCH), v7+.
function versionInfoBits(version) {
  let d = version << 12;
  for (let i = 17; i >= 12; i -= 1) {
    if ((d >> i) & 1) d ^= 0x1f25 << (i - 12);
  }
  return (version << 12) | d;
}

function placeVersionInfo(m, version) {
  if (version < 7) return;
  const size = m.size;
  const bits = versionInfoBits(version);
  for (let i = 0; i < 18; i += 1) {
    const bit = ((bits >> i) & 1) === 1;
    const a = Math.floor(i / 3);
    const b = i % 3;
    setModule(m, a, size - 11 + b, bit);
    setModule(m, size - 11 + b, a, bit);
  }
}

function textToBytes(text) {
  // UTF-8 encode without relying on TextEncoder availability in older runtimes.
  const out = [];
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);
    if (code < 0x80) out.push(code);
    else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const hi = code; const lo = text.charCodeAt(i + 1);
      code = 0x10000 + ((hi - 0xd800) << 10) + (lo - 0xdc00);
      i += 1;
      out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return out;
}

// Public API: text → { size, modules: boolean[][] } (true = dark).
export function generateQrMatrix(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  const bytes = textToBytes(value);
  const version = pickVersion(bytes.length);
  if (!version) return null; // too long for supported versions

  const dataCodewords = encodeData(bytes, version);
  const finalCodewords = buildFinalCodewords(dataCodewords, version);

  const size = version * 4 + 17;
  const base = createMatrix(size);
  placeFinder(base, 0, 0);
  placeFinder(base, 0, size - 7);
  placeFinder(base, size - 7, 0);
  placeAlignment(base, version);
  placeTiming(base);
  reserveFormatAndVersion(base, version);
  placeData(base, finalCodewords);

  // Choose the mask with the lowest penalty
  let best = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    const masked = applyMask(base, mask);
    placeFormat(masked, mask);
    placeVersionInfo(masked, version);
    const score = penalty(masked);
    if (score < bestScore) {
      bestScore = score;
      best = masked;
    }
  }
  return { size: best.size, modules: best.modules, version };
}

export default generateQrMatrix;
