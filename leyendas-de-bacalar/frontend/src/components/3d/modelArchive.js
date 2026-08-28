import { Unzip, UnzipInflate } from 'three/addons/libs/fflate.module.js';

const MAX_MODELS = 40;
const MAX_ZIP_ENTRIES = 256;
const MAX_MODEL_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;
const CHUNK_BYTES = 64 * 1024;
const extensionOf = (filename = '') => String(filename).split('.').pop()?.toLowerCase() || '';
const basename = (filename = '') => String(filename).split(/[\\/]/).pop() || 'modelo.glb';

export async function extractGlbFilesFromZip(file) {
  if (file.size > MAX_TOTAL_BYTES) throw new Error('El ZIP supera 250 MB. Divide el lote.');
  const files = [];
  const activeEntries = new Set();
  let entryCount = 0;
  let totalBytes = 0;
  let failure = null;
  const unzip = new Unzip((entry) => {
    entryCount += 1;
    if (entryCount > MAX_ZIP_ENTRIES) {
      failure = new Error('El ZIP contiene demasiados archivos. Divide el lote.');
      return;
    }
    if (entry.name.endsWith('/') || extensionOf(entry.name) !== 'glb') return;
    if (entry.originalSize > MAX_MODEL_BYTES || files.length + activeEntries.size >= MAX_MODELS) {
      failure = new Error('El ZIP supera 40 modelos o contiene un modelo de mas de 100 MB.');
      return;
    }
    const chunks = [];
    let size = 0;
    activeEntries.add(entry);
    entry.ondata = (error, data, final) => {
      if (error) { failure = new Error('No se pudo descomprimir el ZIP. Revisa el archivo.'); return; }
      size += data.byteLength;
      totalBytes += data.byteLength;
      if (size > MAX_MODEL_BYTES || totalBytes > MAX_TOTAL_BYTES) {
        failure = new Error('El contenido extraido supera el limite de 100 MB por modelo o 250 MB por lote.');
        entry.terminate();
        return;
      }
      chunks.push(data);
      if (final) {
        files.push(new File(chunks, basename(entry.name), { type: 'model/gltf-binary' }));
        activeEntries.delete(entry);
      }
    };
    entry.start();
  });
  unzip.register(UnzipInflate);
  try {
    for (let offset = 0; offset < file.size; offset += CHUNK_BYTES) {
      const end = Math.min(file.size, offset + CHUNK_BYTES);
      const chunk = new Uint8Array(await file.slice(offset, end).arrayBuffer());
      unzip.push(chunk, end === file.size);
      if (failure) throw failure;
    }
    if (activeEntries.size) throw new Error('El ZIP esta incompleto.');
    if (!files.length) throw new Error('El ZIP no contiene archivos GLB.');
    return files;
  } finally {
    activeEntries.forEach((entry) => entry.terminate());
  }
}

export async function expandModelFiles(selection) {
  const input = Array.from(selection || []);
  if (input.reduce((size, file) => size + file.size, 0) > MAX_TOTAL_BYTES) {
    throw new Error('Los archivos seleccionados superan 250 MB. Divide el lote.');
  }
  const output = [];
  let totalBytes = 0;
  for (const file of input) {
    const extension = extensionOf(file.name);
    if (extension === 'glb' && file.size > MAX_MODEL_BYTES) throw new Error(`${file.name} supera 100 MB.`);
    const models = extension === 'glb' ? [file]
      : extension === 'zip' ? await extractGlbFilesFromZip(file) : null;
    if (!models) throw new Error(`${file.name} no es GLB ni ZIP.`);
    totalBytes += models.reduce((size, model) => size + model.size, 0);
    output.push(...models);
    if (output.length > MAX_MODELS || totalBytes > MAX_TOTAL_BYTES) {
      throw new Error('El lote supera 40 modelos o 250 MB extraidos.');
    }
  }
  if (!output.length) throw new Error('Selecciona al menos un modelo GLB.');
  return output;
}
