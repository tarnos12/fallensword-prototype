// Sound / SFX feedback layer. A lightweight, procedural audio-feedback layer
// built on the **Web Audio API only** — no audio asset files at all, so the game
// stays fully offline and self-contained. Every cue is a short synthesised
// gesture (oscillator and/or filtered-noise voices + gain envelope), tuned to
// the game's ink-and-cinnabar feel: wood-block ticks, plucked-string rewards,
// a low temple-gong under the big moments.
//
// Public API:
//   • sfx(name)         — play a named cue (no-op if muted / unknown / no ctx).
//                         Aliases are accepted (e.g. 'levelup' → 'breakthrough').
//   • initAudio()       — lazy AudioContext + ONE document-level delegated click
//                         listener: tab-bar buttons tick 'tab', HUD icon buttons
//                         swell 'open', everything else ticks 'click'. A button
//                         may override its own cue with data-sfx="cueName"
//                         (data-sfx="" silences it) — a markup-only hook, no JS
//                         wiring needed. Resumes the context on the first user
//                         gesture (browsers block audio until then).
//   • initAudioControl()— self-injects a "Sound" section (mute + volume) into
//                         the Settings modal, mirroring theme.js initThemeControl().
//
// Cue vocabulary (call sites live in other modules; all are safe no-ops today):
//   UI       — click, tab, open, info, reward, deny
//   Combat   — hit, crit, whiff, kill, hurt, victory, defeat
//   Loot     — loot (ordinary drop), lootRare (Legendary / Super-Elite / Titan
//              sting: low gong + rising pentatonic + silk shimmer)
//   Progress — breakthrough (level-up / realm breakthrough), merit (premium
//              Merit earned)
//
// Mute + volume are a *display preference*, not save state: they live in their
// own localStorage key (`fallen-immortal-audio`), never in the save schema — so
// they survive save export/import/reset and aren't tied to a character.
// Default: unmuted, gentle volume. Nothing here ever throws to the caller.

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
let noiseBuf = null; // shared 0.6s white-noise buffer for 'noise' voices

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

function ensureNoise() {
  if (noiseBuf || !ctx) return noiseBuf;
  const len = Math.floor(ctx.sampleRate * 0.6);
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

// A cue is a tiny recipe: one or more voices scheduled over a short window with
// a soft attack + exponential decay so nothing clicks or pops.
//   { type, freq, start, dur }       — oscillator voice ('sine'/'triangle'/…)
//   ... glideTo: <hz>                — linear pitch ramp across the voice
//   ... level: 0–1                   — per-voice gain multiplier (default 1)
//   { type: 'noise', freq, q, ... }  — filtered white noise: freq/q describe a
//                                      bandpass (shimmer, silk, air)
const CUES = {
  // ── UI ──────────────────────────────────────────────────────────────────────
  // soft wood tick (generic button)
  click: { gain: 0.24, voices: [
    { type: 'triangle', freq: 520, start: 0, dur: 0.05 },
  ] },
  // duller, lower wood-block knock — switching a top-level tab
  tab: { gain: 0.22, voices: [
    { type: 'triangle', freq: 340, start: 0,    dur: 0.045 },
    { type: 'sine',     freq: 640, start: 0.02, dur: 0.05, level: 0.6 },
  ] },
  // subtle upward swell (modal / HUD panel open)
  open: { gain: 0.3, voices: [
    { type: 'sine', freq: 380, start: 0, dur: 0.12, glideTo: 560 },
  ] },
  // neutral blip (info)
  info: { gain: 0.3, voices: [
    { type: 'sine', freq: 620, start: 0, dur: 0.09 },
  ] },
  // pleasant two-note chime (generic success)
  reward: { gain: 0.5, voices: [
    { type: 'sine', freq: 660, start: 0,    dur: 0.16 },
    { type: 'sine', freq: 990, start: 0.06, dur: 0.16 },
  ] },
  // low buzz (error / warn)
  deny: { gain: 0.42, voices: [
    { type: 'sawtooth', freq: 150, start: 0,    dur: 0.16 },
    { type: 'square',   freq: 110, start: 0.03, dur: 0.14 },
  ] },

  // ── Combat ──────────────────────────────────────────────────────────────────
  // short percussive thud — a normal hit landing. Punchy, not harsh.
  hit: { gain: 0.4, voices: [
    { type: 'triangle', freq: 180, start: 0, dur: 0.08, glideTo: 90 },
  ] },
  // bigger, brighter version of hit — reads as a "big swing" crit.
  crit: { gain: 0.5, voices: [
    { type: 'triangle', freq: 260, start: 0, dur: 0.11, glideTo: 120 },
    { type: 'square',   freq: 520, start: 0, dur: 0.06 },
  ] },
  // soft airy miss — very quiet, quick blip.
  whiff: { gain: 0.15, voices: [
    { type: 'triangle', freq: 900, start: 0, dur: 0.06, glideTo: 1300 },
  ] },
  // the foe falls: a heavier double thump with a dark tail.
  kill: { gain: 0.46, voices: [
    { type: 'triangle', freq: 200, start: 0,    dur: 0.16, glideTo: 60 },
    { type: 'sine',     freq: 100, start: 0.02, dur: 0.3,  glideTo: 50 },
    { type: 'noise',    freq: 900, q: 0.8, start: 0, dur: 0.1, level: 0.25 },
  ] },
  // the PLAYER takes a hit — low, slightly dissonant, unmistakably "ouch".
  hurt: { gain: 0.42, voices: [
    { type: 'sawtooth', freq: 140, start: 0,    dur: 0.12, glideTo: 90 },
    { type: 'square',   freq: 96,  start: 0.01, dur: 0.1,  level: 0.7 },
  ] },
  // triumphant rising arpeggio (win).
  victory: { gain: 0.42, voices: [
    { type: 'sine', freq: 523, start: 0,    dur: 0.16 },
    { type: 'sine', freq: 659, start: 0.12, dur: 0.16 },
    { type: 'sine', freq: 784, start: 0.24, dur: 0.2 },
  ] },
  // somber descending two-note tone (loss).
  defeat: { gain: 0.4, voices: [
    { type: 'sine',     freq: 330, start: 0,    dur: 0.18, glideTo: 262 },
    { type: 'triangle', freq: 196, start: 0.16, dur: 0.2,  glideTo: 147 },
  ] },

  // ── Loot ────────────────────────────────────────────────────────────────────
  // an ordinary drop hits the pack: two plucked notes, quicker & woodier than
  // 'reward' so loot reads distinctly from generic success.
  loot: { gain: 0.4, voices: [
    { type: 'triangle', freq: 523, start: 0,    dur: 0.09 },
    { type: 'triangle', freq: 784, start: 0.07, dur: 0.14 },
  ] },
  // RARE loot sting (Legendary / Super-Elite / Titan): a low temple gong under
  // a rising pentatonic run, finished with a silk-noise shimmer. Longer and
  // unmistakably bigger than anything else in the vocabulary — on purpose.
  lootRare: { gain: 0.5, voices: [
    { type: 'sine',  freq: 98,      start: 0,    dur: 0.9,  glideTo: 96, level: 0.9 },
    { type: 'sine',  freq: 523.25,  start: 0.05, dur: 0.14 },
    { type: 'sine',  freq: 659.25,  start: 0.17, dur: 0.14 },
    { type: 'sine',  freq: 783.99,  start: 0.29, dur: 0.16 },
    { type: 'sine',  freq: 1046.5,  start: 0.41, dur: 0.34 },
    { type: 'noise', freq: 5200, q: 1.6, start: 0.05, dur: 0.5, level: 0.25 },
  ] },

  // ── Progression ─────────────────────────────────────────────────────────────
  // breakthrough / level-up: temple-bell root + a five-note pentatonic ascent
  // with an airy crown. The biggest cue in the game.
  breakthrough: { gain: 0.5, voices: [
    { type: 'sine',  freq: 130.8,  start: 0,    dur: 0.7, level: 0.9 },
    { type: 'sine',  freq: 392,    start: 0,    dur: 0.16 },
    { type: 'sine',  freq: 523.25, start: 0.11, dur: 0.16 },
    { type: 'sine',  freq: 659.25, start: 0.22, dur: 0.16 },
    { type: 'sine',  freq: 784,    start: 0.33, dur: 0.18 },
    { type: 'sine',  freq: 1046.5, start: 0.44, dur: 0.4 },
    { type: 'noise', freq: 6000, q: 1.2, start: 0.44, dur: 0.4, level: 0.2 },
  ] },
  // Merit (premium currency) earned: a small bright coin-sparkle.
  merit: { gain: 0.4, voices: [
    { type: 'sine', freq: 1318.5, start: 0,    dur: 0.07 },
    { type: 'sine', freq: 1760,   start: 0.05, dur: 0.1 },
  ] },
};

// Friendly aliases so call sites can use the name that reads naturally there.
const ALIASES = {
  'levelup': 'breakthrough',
  'level-up': 'breakthrough',
  'player-hurt': 'hurt',
  'damage': 'hurt',
  'drop': 'loot',
  'loot-drop': 'loot',
  'rare': 'lootRare',
  'rareLoot': 'lootRare',
  'loot-rare': 'lootRare',
  'legendary': 'lootRare',
  'superElite': 'lootRare',
  'titan': 'lootRare',
};

/**
 * Play a named cue. No-op (never throws) if muted, unknown name, or no audio.
 */
export function sfx(name) {
  try {
    if (prefs.muted) return;
    const cue = CUES[name] || CUES[ALIASES[name]];
    if (!cue) return; // unknown name → silent no-op
    if (!ensureContext()) return;
    resume();
    const now = ctx.currentTime;
    const level = clamp01(prefs.volume) * (cue.gain ?? 0.4);
    if (level <= 0) return;
    for (const v of cue.voices) {
      const g = ctx.createGain();
      const t0 = now + (v.start || 0);
      const t1 = t0 + (v.dur || 0.1);
      const vLevel = level * (v.level ?? 1);
      let src;
      if (v.type === 'noise') {
        // filtered white noise (shimmer / silk / air)
        const buf = ensureNoise();
        if (!buf) continue;
        src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(v.freq || 4000, t0);
        bp.Q.value = v.q ?? 1;
        src.connect(bp);
        bp.connect(g);
      } else {
        src = ctx.createOscillator();
        src.type = v.type || 'sine';
        src.frequency.setValueAtTime(v.freq, t0);
        if (v.glideTo) src.frequency.linearRampToValueAtTime(v.glideTo, t1);
        src.connect(g);
      }
      // soft attack + exponential decay so nothing clicks/pops
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vLevel, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t1);
      g.connect(master);
      src.start(t0);
      src.stop(t1 + 0.02);
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
    // Markup-only override: data-sfx="cueName" picks the cue, data-sfx=""
    // silences the button (sfx('') is a no-op). No JS wiring needed.
    if (btn.dataset && btn.dataset.sfx !== undefined) { sfx(btn.dataset.sfx); return; }
    if (btn.closest('#tab-bar')) sfx('tab');                     // top-level tabs
    else if (btn.classList.contains('hud-icon-btn')) sfx('open'); // HUD icons open panels
    else if (btn.closest('#nav-menu')) sfx('open');               // legacy Halls dock
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
    '<p class="settings-hint">Gentle procedural chimes for combat, loot and progress. ' +
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
