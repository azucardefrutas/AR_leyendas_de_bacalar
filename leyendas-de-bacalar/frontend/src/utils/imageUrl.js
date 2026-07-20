// Redimensiona una imagen de Supabase Storage con su Image Transformation, para no bajar
// el original (una portada PNG puede pesar VARIOS MB). Solo transforma objetos publicos de
// Supabase (/storage/v1/object/public/...); cualquier otra URL (local, externa, ya
// transformada) se devuelve intacta. Si la transformacion fallara en runtime, el <img>
// debe usar onError -> onImageError para volver a la URL original (ver abajo).
//
// IMPORTANTE: `size` es el lado maximo de una caja CUADRADA con resize=contain. Hay que
// mandar width Y height + resize=contain; con solo `width`, Supabase NO reescala la altura
// (deja la original) y deforma/recorta la imagen. Con contain se mantiene la proporcion
// real y nunca se recorta: cuadrada -> size x size, retrato/apaisada -> proporcional dentro
// de la caja. El aspecto lo define la imagen; el <img>/CSS del consumidor decide el encuadre.
export function resizedImageUrl(url, size, quality = 72) {
  if (typeof url !== 'string' || !size) return url;
  const marker = '/storage/v1/object/public/';
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const base = `${url.slice(0, i)}/storage/v1/render/image/public/${url.slice(i + marker.length)}`;
  const [path, query] = base.split('?');
  const params = new URLSearchParams(query || '');
  const dim = String(Math.round(size));
  params.set('width', dim);
  params.set('height', dim);
  params.set('resize', 'contain');
  params.set('quality', String(quality));
  return `${path}?${params.toString()}`;
}

// Handler de <img onError>: si la version redimensionada no carga, vuelve UNA vez a la URL
// original (sin transformar). Evita bucles con un data-attribute. Uso:
//   <img src={resizedImageUrl(url, 600)} onError={(e) => onImageError(e, url)} />
export function onImageError(event, originalUrl) {
  const img = event?.currentTarget;
  if (!img || !originalUrl || img.dataset.imgFallback === '1') return;
  img.dataset.imgFallback = '1';
  img.src = originalUrl;
}
