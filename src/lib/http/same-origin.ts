export function hasSameOrigin(request: Request) {
  try {
    const internal = new URL(request.url);
    if (!['http:', 'https:'].includes(internal.protocol)) return false;
    // Next may normalize the internal hostname to localhost. Use the incoming
    // Host authority; never trust client-supplied forwarded-host as an allowlist.
    const host = request.headers.get('host') ?? internal.host;
    const target = new URL(`${internal.protocol}//${host}`);
    if (target.username || target.password || target.pathname !== '/' || target.search || target.hash) return false;
    return request.headers.get('origin') === target.origin;
  } catch { return false; }
}
