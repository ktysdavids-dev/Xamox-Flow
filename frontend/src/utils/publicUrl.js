/**
 * Public base URL for the app (shares, links).
 * Set REACT_APP_PUBLIC_URL when building for Google Play so no Emergent/preview URL appears.
 * If unset, uses current origin (e.g. your production domain).
 */
export function getPublicUrl() {
  if (process.env.REACT_APP_PUBLIC_URL) return process.env.REACT_APP_PUBLIC_URL.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}
