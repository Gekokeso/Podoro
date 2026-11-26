// Convierte lo que escribe el usuario ("https://www.YouTube.com/watch?v=1")
// en un dominio limpio ("youtube.com"). Devuelve null si no es válido.
export function normalizeDomain(input) {
  let value = (input || '').trim().toLowerCase();
  if (!value) return null;

  if (!/^https?:\/\//.test(value)) value = 'https://' + value;

  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
  } catch {
    return null;
  }
}