const API = 'http://localhost:5000/api';

const today = () => new Date().toLocaleDateString('en-CA'); // "2026-11-11" en hora local
const getDomain = (url) => new URL(url).hostname.replace(/^www\./, '');
const matches = (host, ruleDomain) => host === ruleDomain || host.endsWith('.' + ruleDomain);

// Los service workers de MV3 se duermen: usa alarms, no setInterval
chrome.alarms.create('tick', { periodInMinutes: 0.5 });  // cada 30 s
chrome.alarms.create('sync', { periodInMinutes: 5 });    // refrescar reglas

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'tick') tick();
  if (alarm.name === 'sync') fetchRules();
});
chrome.runtime.onStartup.addListener(fetchRules);
chrome.runtime.onInstalled.addListener(fetchRules);

// 1. Traer reglas del backend y guardarlas localmente
async function fetchRules() {
  const { token } = await chrome.storage.local.get('token');
  if (!token) return;
  try {
    const res = await fetch(`${API}/sites`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) await chrome.storage.local.set({ rules: await res.json() });
  } catch { /* sin conexión: se usan las reglas guardadas */ }
  await syncBlockRules();
}

// 2. Medir el tiempo de la pestaña activa
async function tick() {
  if ((await chrome.idle.queryState(60)) !== 'active') return; // no contar si está inactivo

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.url?.startsWith('http')) return;

  const host = getDomain(tab.url);
  const { rules = [], usage = {}, token } = await chrome.storage.local.get(['rules', 'usage', 'token']);
  const rule = rules.find((r) => r.enabled && matches(host, r.domain));
  if (!rule) return;

  const key = `${today()}|${rule.domain}`;
  usage[key] = (usage[key] || 0) + 30;
  await chrome.storage.local.set({ usage });

  if (token) {
    fetch(`${API}/usage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ domain: rule.domain, date: today(), seconds: 30 }),
    }).catch(() => {});
  }
  await syncBlockRules();
}

// 3. Bloquear: crear reglas de redirección para sitios que llegaron al límite
async function syncBlockRules() {
  const { rules = [], usage = {} } = await chrome.storage.local.get(['rules', 'usage']);

  const toBlock = rules.filter((r) =>
    r.enabled &&
    (r.mode === 'block' || (usage[`${today()}|${r.domain}`] || 0) >= r.dailyLimitMinutes * 60)
  );

  const old = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map((r) => r.id),
    addRules: toBlock.map((r, i) => ({
      id: i + 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { extensionPath: `/blocked.html?site=${encodeURIComponent(r.domain)}` },
      },
      condition: { requestDomains: [r.domain], resourceTypes: ['main_frame'] }, // incluye subdominios
    })),
  });

  // Las pestañas ya abiertas no se recargan solas: sácalas manualmente
  for (const r of toBlock) {
    const tabs = await chrome.tabs.query({ url: [`*://${r.domain}/*`, `*://*.${r.domain}/*`] });
    for (const t of tabs) {
      chrome.tabs.update(t.id, { url: chrome.runtime.getURL(`blocked.html?site=${r.domain}`) });
    }
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'RULES_CHANGED') syncBlockRules();
});