import { normalizeAnimationConfig } from './modelAnimationConfig.js';

const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;

const extensionOf = (filename = '') => String(filename).split('.').pop()?.toLowerCase() || '';

export function getAnimationClipNames(gltf = {}) {
  return [...new Set((Array.isArray(gltf.animations) ? gltf.animations : [])
    .map((animation, index) => animation?.name || `animation_${index}`))];
}

function readGlbJson(bytes) {
  if (bytes.byteLength < 20) throw new Error('El archivo GLB esta incompleto.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error('El archivo no tiene una cabecera GLB valida.');
  if (view.getUint32(4, true) !== 2) throw new Error('Solo se admite GLB 2.0.');

  const declaredLength = view.getUint32(8, true);
  if (declaredLength !== bytes.byteLength || declaredLength < 20) throw new Error('El archivo GLB esta truncado o tiene una longitud invalida.');

  let offset = 12;
  while (offset + 8 <= declaredLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > declaredLength) throw new Error('El archivo GLB contiene un bloque incompleto.');
    if (chunkType === GLB_JSON_CHUNK) {
      let jsonEnd = chunkEnd;
      while (jsonEnd > chunkStart && [0, 9, 10, 13, 32].includes(bytes[jsonEnd - 1])) jsonEnd -= 1;
      const jsonText = new TextDecoder().decode(bytes.subarray(chunkStart, jsonEnd));
      return JSON.parse(jsonText);
    }
    offset = chunkEnd;
  }
  throw new Error('El GLB no contiene metadatos glTF.');
}

export function inspectModelBytes(input, filename, fallbackTrigger = 'load') {
  const bytes = input instanceof Uint8Array
    ? input
    : new Uint8Array(input.buffer || input, input.byteOffset || 0, input.byteLength || undefined);
  const extension = extensionOf(filename);
  let gltf;

  if (extension === 'glb') gltf = readGlbJson(bytes);
  else if (extension === 'gltf') gltf = JSON.parse(new TextDecoder().decode(bytes));
  else throw new Error('Selecciona un archivo GLB o GLTF.');

  const dependencies = [...(gltf.buffers || []), ...(gltf.images || [])];
  if (dependencies.some((item) => item.uri && !String(item.uri).startsWith('data:'))) {
    throw new Error('El modelo depende de archivos externos. Exportalo como GLB con texturas y animaciones incluidas.');
  }

  const clips = getAnimationClipNames(gltf);
  return normalizeAnimationConfig({
    clips,
    inspected: true,
    defaultClip: clips[0] || '',
    autoplay: clips.length > 0,
    loop: 'repeat',
    speed: 1,
    trigger: fallbackTrigger,
  }, fallbackTrigger);
}

export async function inspectModelFile(file, fallbackTrigger = 'load') {
  if (!file?.arrayBuffer) throw new Error('No se pudo leer el modelo seleccionado.');
  return inspectModelBytes(new Uint8Array(await file.arrayBuffer()), file.name, fallbackTrigger);
}
