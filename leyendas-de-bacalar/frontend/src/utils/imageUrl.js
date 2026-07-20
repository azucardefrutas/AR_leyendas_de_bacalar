// Redimensiona una imagen de Supabase Storage con su Image Transformation, para no bajar
// el original (una portada PNG puede pesar VARIOS MB). Solo transforma objetos publicos de
// Supabase (/storage/v1/object/public/...); cualquier otra URL (local, externa, ya
// transformada) se devuelve intacta. Si la transformacion fallara en runtime, el <img>
// debe usar onError -> onImageError para volver a la URL original (ver abajo).
export function resizedImageUrl(url, width, quality = 72) {
  if (typeof url !== 'string' || !width) return url;
  const marker = '/storage/v1/object/public/';
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const base = `${url.slice(0, i)}/storage/v1/render/image/public/${url.slice(i + marker.length)}`;
  const [path, query] = base.split('?');
  const params = new URLSearchParams(query || '');
  params.set('width', String(Math.round(width)));
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
