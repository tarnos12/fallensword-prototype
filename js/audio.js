// Sound / SFX feedback layer. A lightweight, procedural audio-feedback layer
// built on the **Web Audio API only** — no audio asset files at all, so the game
// stays fully offline and self-contained. Every cue is a short synthesised blip
// (oscillator + gain envelope), tasteful and gentle.
//
// Public API:
//   • sfx(name)         — play a named cue (no-op if muted / unknown / no ctx).
//   • initAudio()       — lazy AudioContext + a document-level delegated click
//                         listener that plays `click` on any #nav-menu button and
//                         `open` when a feature/nav button is pressed. Resumes the
//                         context on the first user gesture (browsers block audio
//                         until then).
//   • initAudioControl()— self-injects a "Sound" section (mute + volume) into the
//                         ⚙ Settings modal, mirroring theme.js initThemeControl().
//
// Mute + volume are a *display preference*, not save state: they live in their own
// localStorage key (`fallen-immortal-audio`), never in the save schema — so they
// survive save export/import/reset and aren't tied to a character. Default:
// unmuted, gentle volume. Nothing here ever throws to the caller.

const KEY = 'fallen-immortal-audio';
const DEFAULTS = { muted: false, volume: 0.5 };

// ── preference (own localStorage key) ────────────────────────────────────────
let prefs = loadPrefs();

function loadPrefs() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        muted: typeof p.muted === 'boolean' ? p.muted : DEFAULTS.muted,
        volume: clamp01(typeof p.volume === 'number' ? p.volume : DEFAULTS.volume),
      };
    }
  } catch { /* private mode / bad blob → defaults */ }
  return { ...DEFAULTS };
}

function savePrefs() {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

function clamp01(n) {
  n = Number(n);
  if (!Number.isFinite(n)) return DEFAULTS.volume;
  return Math.max(0, Math.min(1, n));
}

export function isMuted() { return prefs.muted; }
export function getVolume() { return prefs.volume; }

export function setMuted(m) {
  prefs.muted = !!m;
  savePrefs();
}

export function setVolume(v) {
  prefs.volume = clamp01(v);
  savePrefs();
}

// ── synth ────────────────────────────────────────────────────────────────────
let ctx = null;      // lazy AudioContext
let master = null;   // master gain (scaled by the volume pref per-play)

function ensureContext() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

function resume() {
  try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch { /* ignore */ }
}

// A cue is a tiny recipe: one or more oscillator "voices" scheduled over a short
// window with a soft attack/decay envelope. All well under 200ms, gentle gain.
const CUES = {
  // pleasant two-note chime (loot / success)
  reward: { gain: 0.5, voices: [
    { type: 'sine', freq: 660, start: 0,    dur: 0.16 },
    { type: 'sine', freq: 990, start: 0.06, dur: 0.16 },
  ] },
  // low buzz (error / warn)
  deny: { gain: 0.42, voices: [
    { type: 'sawtooth', freq: 150, start: 0,    dur: 0.16 },
    { type: 'square',   freq: 110, start: 0.03, dur: 0.14 },
  ] },
  // soft tick (UI button)
  click: { gain: 0.24, voices: [
    { type: 'triangle', freq: 520, start: 0, dur: 0.05 },
  ] },
  // subtle upward swell (modal open)
  open: { gain: 0.3, voices: [
    { type: 'sine', freq: 380, start: 0,    dur: 0.12, glideTo: 560 },
  ] },
  // neutral blip (info)
  info: { gain: 0.3, voices: [
    { type: 'sine', freq: 620, start: 0, dur: 0.09 },
  ] },
};

/**
 * Play a named cue. No-op (never throws) if muted, unknown name, or no audio.
 */
export function sfx(name) {
  try {
    if (prefs.muted) return;
    const cue = CUES[name];
    if (!cue) return; // unknown name → silent no-op
    if (!ensureContext()) return;
    resume();
    const now = ctx.currentTime;
    const level = clamp01(prefs.volume) * (cue.gain ?? 0.4);
    if (level <= 0) return;
    for (const v of cue.voices) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = v.type || 'sine';
      const t0 = now + (v.start || 0);
      const t1 = t0 + (v.dur || 0.1);
      osc.frequency.setValueAtTime(v.freq, t0);
      if (v.glideTo) osc.frequency.linearRampToValueAtTime(v.glideTo, t1);
      // soft attack + exponential decay so nothing clicks/pops
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(level, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t1);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t1 + 0.02);
    }
  } catch { /* audio must never break the game */ }
}

// ── wiring: delegated click listener (self-contained, no other-module edits) ──
let inited = false;

export function initAudio() {
  if (inited) return;
  inited = true;
  // A single delegated listener. First gesture also resumes/creates the context.
  document.addEventListener('click', (e) => {
    ensureContext();
    resume();
    const btn = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!btn) return;
    // Feature/nav buttons open modals → play the "open" swell; other buttons tick.
    if (btn.closest('#nav-menu')) sfx('open');
    else sfx('click');
  }, true); // capture so we hear the gesture even if a handler stops propagation
}

// ── settings control (mirrors theme.js initThemeControl) ──────────────────────
export function initAudioControl() {
  const body = document.getElementById('settings-body');
  if (!body || document.getElementById('chk-audio-mute')) return;
  const section = document.createElement('div');
  section.className = 'settings-section';
  section.innerHTML =
    '<h3>Sound</h3>' +
    '<label class="instant-toggle"><input type="checkbox" id="chk-audio-mute"> Mute sound effects</label>' +
    '<label class="audio-volume-row" for="rng-audio-vol">Volume' +
    '<input type="range" id="rng-audio-vol" min="0" max="100" step="1"></label>' +
    '<p class="settings-hint">Gentle procedural blips for actions, rewards and errors. ' +
    'Saved to this browser, not your character.</p>';
  body.appendChild(section);

  const mute = section.querySelector('#chk-audio-mute');
  const vol = section.querySelector('#rng-audio-vol');
  mute.checked = prefs.muted;
  vol.value = String(Math.round(prefs.volume * 100));
  vol.disabled = prefs.muted;

  mute.addEventListener('change', () => {
    setMuted(mute.checked);
    vol.disabled = prefs.muted;
    if (!prefs.muted) sfx('info'); // little confirmation when re-enabling
  });
  vol.addEventListener('input', () => {
    setVolume(Number(vol.value) / 100);
  });
  // Preview the new level when the user releases the slider.
  vol.addEventListener('change', () => { if (!prefs.muted) sfx('reward'); });
}

// Self-init the delegated click listener as soon as this module is evaluated
// (imported via toast.js/settings.js in main.js's graph), mirroring theme.js's
// eval-time apply — so no main.js edit is needed. Idempotent (initAudio guards).
if (typeof document !== 'undefined') initAudio();
