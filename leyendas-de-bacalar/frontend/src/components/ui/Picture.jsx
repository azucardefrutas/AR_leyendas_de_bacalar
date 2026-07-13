import React from 'react';

/**
 * Renderiza <picture> con una fuente .webp derivada de un src LOCAL (/assets/…png|jpg)
 * mas el <img> original como fallback (navegadores sin webp o si el .webp faltara).
 * Para URLs remotas (Supabase) o no-imagen, renderiza un <img> normal (no hay .webp).
 */
export default function Picture({ src, alt = '', className, ...rest }) {
  const isLocal = typeof src === 'string' && src.startsWith('/') && /\.(png|jpe?g)$/i.test(src);

  if (!isLocal) {
    return <img src={src} alt={alt} className={className} {...rest} />;
  }

  const webp = encodeURI(src.replace(/\.(png|jpe?g)$/i, '.webp'));
  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      <img src={src} alt={alt} className={className} {...rest} />
    </picture>
  );
}
