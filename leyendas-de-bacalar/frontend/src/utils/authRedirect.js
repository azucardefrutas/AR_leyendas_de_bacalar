export function getLoginPathForRedirect(locationOrPath) {
  const rawPath =
    typeof locationOrPath === 'string'
      ? locationOrPath
      : `${locationOrPath?.pathname ?? '/'}${locationOrPath?.search ?? ''}${locationOrPath?.hash ?? ''}`;

  return `/login?redirect=${encodeURIComponent(rawPath || '/')}`;
}

export function getSafeRedirect(searchParams) {
  const redirect = searchParams.get('redirect');

  if (!redirect || !redirect.startsWith('/')) return null;
  if (redirect.startsWith('//')) return null;
  if (redirect.startsWith('/login') || redirect.startsWith('/register')) return null;

  return redirect;
}
