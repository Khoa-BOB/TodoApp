export async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    // Fetch per mutation: signing in changes the identity bound to the CSRF token.
    const csrf = await request('/auth/csrf');
    headers['X-CSRF-TOKEN'] = csrf.csrfToken;
  }
  let response;
  try {
    response = await fetch(`/api${path}`, { ...options, method, headers, credentials: 'same-origin' });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  const body = await response.text();
  let data;
  try { data = body ? JSON.parse(body) : null; } catch { data = null; }
  if (!response.ok) {
    const error = new Error(response.status === 401
      ? (path === '/auth/login' ? 'Email or password is incorrect.' : 'Your session has expired. Please sign in again.')
      : response.status === 403 ? 'Administrator access is required.'
      : data?.detail || data?.title || (typeof data === 'string' && data) || 'The request failed. Check that the API is running and try again.');
    error.status = response.status;
    throw error;
  }
  return data;
}
