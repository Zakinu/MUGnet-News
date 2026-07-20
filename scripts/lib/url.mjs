/** Normalize a public directory URL without dropping a GitHub Pages path prefix. */
export function normalizePublicBaseUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('config/feed-channels.json: publicBaseUrl must be a plain HTTP(S) URL');
  }
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`;
  return url;
}
