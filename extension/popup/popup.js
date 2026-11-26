import { AuthApi, SitesApi } from '../utils/api.js';
import { normalizeDomain } from '../utils/domain.js';

const $ = (id) => document.getElementById(id);
const today = () => new Date().toLocaleDateString('en-CA'); // misma clave de fecha que background.js

let isRegister = false;
let rules = [];

/* ---------- Utilidades de interfaz ---------- */

function showView(name) {
  $('auth-view').hidden = name !== 'auth';
  $('main-view').hidden = name !== 'main';
}

function setMessage(id, text = '', ok = false) {
  const node = $(id);
  node.textContent = text;
  node.classList.toggle('ok', ok);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text; // textContent: nunca se interpreta HTML
  return node;
}

// Avisa al background para que recalcule los bloqueos de inmediato
function notifyBackground() {
  chrome.runtime.sendMessage({ type: 'RULES_CHANGED' }).catch(() => {});
}

/* ---------- Acceso (login / registro) ---------- */

function renderAuthMode() {
  $('auth-title').textContent = isRegister ? 'Crea tu cuenta' : 'Inicia sesión';
  $('auth-submit').textContent = isRegister ? 'Crear cuenta' : 'Iniciar sesión';
  $('auth-toggle').textContent = isRegister
    ? '¿Ya tienes cuenta? Inicia sesión'
    : '¿No tienes cuenta? Crea una';
  $('name-field').hidden = !isRegister;
  $('password').autocomplete = isRegister ? 'new-password' : 'current-password';
  setMessage('auth-message');
}

async function handleAuth(event) {
  event.preventDefault();
  const name = $('name').value.trim();
  const email = $('email').value.trim();
  const password = $('password').value;

  if (!email || !password || (isRegister && !name)) {
    return setMessage('auth-message', 'Completa todos los campos.');
  }

  const button = $('auth-submit');
  button.disabled = true;
  setMessage('auth-message');

  try {
    const user = isRegister
      ? await AuthApi.register(name, email, password)
      : await AuthApi.login(email, password);

    await chrome.storage.local.set({ token: user.token, user: { name: user.name, email: user.email } });
    $('auth-form').reset();
    await openMain();
  } catch (error) {
    setMessage('auth-message', error.message);
  } finally {
    button.disabled = false;
  }
}

async function logout() {
  await chrome.storage.local.remove(['token', 'user', 'rules', 'usage']);
  notifyBackground(); // con reglas vacías, el background retira todos los bloqueos
  rules = [];
  isRegister = false;
  renderAuthMode();
  showView('auth');
}

/* ---------- Sitios ---------- */

async function loadRules() {
  try {
    rules = await SitesApi.list();
    await chrome.storage.local.set({ rules });
    setMessage('main-message');
  } catch (error) {
    if (error.status === 401) return logout(); // token vencido
    // Sin conexión: se muestran las reglas guardadas
    ({ rules = [] } = await chrome.storage.local.get('rules'));
    setMessage('main-message', 'Sin conexión: mostrando los datos guardados.');
  }
}

async function renderSites() {
  const { usage = {} } = await chrome.storage.local.get('usage');
  const list = $('site-list');
  list.replaceChildren();
  $('empty').hidden = rules.length > 0;

  for (const rule of rules) {
    const seconds = usage[`${today()}|${rule.domain}`] || 0;
    const usedMin = Math.floor(seconds / 60);

    const item = el('li', rule.enabled ? 'site' : 'site off');

    const top = el('div', 'site-top');
    top.append(el('span', 'domain', rule.domain));

    const actions = el('div', 'actions');
    const toggle = el('input');
    toggle.type = 'checkbox';
    toggle.checked = rule.enabled;
    toggle.title = rule.enabled ? 'Desactivar' : 'Activar';
    toggle.setAttribute('aria-label', `Activar o desactivar ${rule.domain}`);
    toggle.addEventListener('change', () => toggleRule(rule));

    const remove = el('button', 'delete', 'Quitar');
    remove.type = 'button';
    remove.addEventListener('click', () => removeRule(rule));

    actions.append(toggle, remove);
    top.append(actions);
    item.append(top);

    if (rule.mode === 'block') {
      item.append(el('div', 'status', 'Bloqueado siempre'));
    } else {
      const limitSeconds = rule.dailyLimitMinutes * 60;
      const ratio = limitSeconds ? seconds / limitSeconds : 1;
      const reached = ratio >= 1;

      item.append(
        el('div', 'status', reached
          ? `Límite alcanzado (${rule.dailyLimitMinutes} min)`
          : `${usedMin} de ${rule.dailyLimitMinutes} min hoy`)
      );

      const bar = el('div', ratio >= 1 ? 'bar full' : ratio >= 0.8 ? 'bar warn' : 'bar');
      const fill = el('span');
      fill.style.width = `${Math.min(ratio, 1) * 100}%`;
      bar.append(fill);
      item.append(bar);
    }

    list.append(item);
  }
}

async function addSite(event) {
  event.preventDefault();
  setMessage('main-message');

  const domain = normalizeDomain($('domain').value);
  if (!domain) return setMessage('main-message', 'Escribe un sitio válido, por ejemplo youtube.com.');

  const mode = $('mode').value;
  const dailyLimitMinutes = Number($('limit').value);
  if (mode === 'limit' && !(dailyLimitMinutes >= 1)) {
    return setMessage('main-message', 'El límite debe ser de al menos 1 minuto.');
  }

  try {
    const created = await SitesApi.create({ domain, mode, dailyLimitMinutes });
    rules.push(created);
    await saveAndRefresh();
    $('domain').value = '';
  } catch (error) {
    setMessage('main-message', error.message);
  }
}

async function toggleRule(rule) {
  try {
    const updated = await SitesApi.update(rule._id, { enabled: !rule.enabled });
    rules = rules.map((r) => (r._id === rule._id ? updated : r));
    await saveAndRefresh();
  } catch (error) {
    setMessage('main-message', error.message);
    await renderSites(); // devuelve el interruptor a su estado real
  }
}

async function removeRule(rule) {
  try {
    await SitesApi.remove(rule._id);
    rules = rules.filter((r) => r._id !== rule._id);
    await saveAndRefresh();
  } catch (error) {
    setMessage('main-message', error.message);
  }
}

async function saveAndRefresh() {
  await chrome.storage.local.set({ rules });
  notifyBackground();
  await renderSites();
}

/* ---------- Arranque ---------- */

async function openMain() {
  showView('main');
  await loadRules();
  notifyBackground();
  await renderSites();
}

async function init() {
  $('auth-form').addEventListener('submit', handleAuth);
  $('auth-toggle').addEventListener('click', () => {
    isRegister = !isRegister;
    renderAuthMode();
  });
  $('logout').addEventListener('click', logout);
  $('site-form').addEventListener('submit', addSite);
  $('mode').addEventListener('change', () => {
    $('limit-field').hidden = $('mode').value === 'block';
  });

  renderAuthMode();

  const { token } = await chrome.storage.local.get('token');
  if (token) {
    await openMain();
    setInterval(renderSites, 15000); // refresca el tiempo mientras el popup está abierto
  } else {
    showView('auth');
  }
}

init();
