// Theme system (Stage 3, task AA). A light/dark palette switch driven entirely
// by CSS custom properties. The dark "parchment" palette is the default and
// lives in style.css `:root`; this module toggles a `data-theme` attribute on
// `<html>`, and css/theme.css supplies the light-palette token overrides (plus a
// few targeted surface fixes for elements that hardcode a colour).
//
// The choice is a *display preference*, not save state: it lives in its own
// localStorage key (`fallen-immortal-theme`), never in the save schema — so it
// survives save export/import/reset and isn't tied to a character. To avoid a
// flash of the wrong theme before this module loads, index.html <head> has a
// tiny inline bootstrap that sets `data-theme` immediately; this module then
// re-applies idempotently and owns the toggle UI in the ⚙ Settings modal.

const KEY = 'fallen-immortal-theme';
const VALID = new Set(['dark', 'light']);

export function getTheme() {
  let stored = null;
  try { stored = localStorage.getItem(KEY); } catch { /* private mode */ }
  return VALID.has(stored) ? stored : 'dark'; // dark is the default
}

export function applyTheme(theme) {
  const t = VALID.has(theme) ? theme : 'dark';
  document.documentElement.setAttribute('data-theme', t);
}

export function setTheme(theme) {
  const t = VALID.has(theme) ? theme : 'dark';
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  applyTheme(t);
  return t;
}

export function toggleTheme() {
  return setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// Apply the stored theme as soon as this module is evaluated (idempotent with
// the inline <head> bootstrap).
applyTheme(getTheme());

// Inject an "Appearance" section with the light-theme toggle into the ⚙ Settings
// modal. Self-contained (reuses the existing settings section/toggle classes) so
// settings.js only has to call this once.
export function initThemeControl() {
  const body = document.getElementById('settings-body');
  if (!body || document.getElementById('chk-theme-light')) return;
  const section = document.createElement('div');
  section.className = 'settings-section';
  section.innerHTML =
    '<h3>Appearance</h3>' +
    '<label class="instant-toggle"><input type="checkbox" id="chk-theme-light"> Light theme</label>' +
    '<p class="settings-hint">Switch between the dark parchment and a light palette. Saved to this browser, not your character.</p>';
  body.appendChild(section);
  const chk = section.querySelector('#chk-theme-light');
  chk.checked = getTheme() === 'light';
  chk.addEventListener('change', () => setTheme(chk.checked ? 'light' : 'dark'));
}
