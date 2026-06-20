export function isSafeHttpUrl(value = '') {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function buildTableContent(rowsInput, columnsInput, includeHeader) {
  const rows = Math.min(Math.max(Number(rowsInput) || 1, 1), 20);
  const columns = Math.min(Math.max(Number(columnsInput) || 1, 1), 12);

  return Array.from({ length: rows }, (_, rowIndex) => (
    Array.from({ length: columns }, (_, columnIndex) => (
      includeHeader && rowIndex === 0 ? `Encabezado ${columnIndex + 1}` : ''
    ))
  ));
}

export function buildRelValue({
  newTab = false,
  noopener = false,
  noreferrer = false,
  nofollow = false,
  ugc = false,
  sponsored = false,
} = {}) {
  const tokens = new Set([
    newTab && noopener ? 'noopener' : '',
    newTab && noreferrer ? 'noreferrer' : '',
    nofollow ? 'nofollow' : '',
    ugc ? 'ugc' : '',
    sponsored ? 'sponsored' : '',
  ].filter(Boolean));

  return [...tokens].join(' ');
}
