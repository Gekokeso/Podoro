const API = 'http://localhost:5000/api';

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (auth) {
    const { token } = await chrome.storage.local.get('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const error = new Error('No se pudo conectar con el servidor');
    error.status = 0;
    throw error;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || 'Ocurrió un error');
    error.status = res.status;
    throw error;
  }
  return data;
}

// Interfaces pequeñas por rol (principio I de SOLID)
export const AuthApi = {
  login: (email, password) =>
    request('/users/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (name, email, password) =>
    request('/users', { method: 'POST', body: { name, email, password }, auth: false }),
};

export const SitesApi = {
  list: () => request('/sites'),
  create: (rule) => request('/sites', { method: 'POST', body: rule }),
  update: (id, changes) => request(`/sites/${id}`, { method: 'PUT', body: changes }),
  remove: (id) => request(`/sites/${id}`, { method: 'DELETE' }),
};