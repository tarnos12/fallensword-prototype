// Combat feedback / "juice" (Stage 3, task W). Purely presentational: it reads
// the already-resolved combat `result` (the same `turns[]` the text log renders)
// and dresses the playback — floating damage/miss/crit numbers over the struck
// actor, a hit-flash + subtle shake, HP bars that tween down turn by turn, and a
// victory/defeat/draw flourish on resolution. It mutates NO game state and owns
// all of its own DOM (an arena injected into the combat panel) plus its own
// stylesheet (`css/combatfx.css`) — `ui.js` only calls begin/turn/end.
//
// Motion is gated behind prefers-reduced-motion (numbers still show; shakes and
// tweens are suppressed), matching the polish-pass convention.

import { sfx } from './audio.js';

const REDUCE = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false };

let arena = null; // the injected DOM for the current fight, or null in instant mode

// A hit at/above this fraction of the target's starting HP reads as a "crit"
// (the combat model has no real crits — this is pure flavour on a big swing).
const CRIT_FRACTION = 0.28;

// The player is the attacker and starts every fight at full HP, so the starting
// HP is derivable from turn 1 (attackerHpAfter already reflects that turn's
// incoming hit). Monster starting HP is just its maxHp. All read-only off result.
function playerStartHp(result) {
  const t0 = result.turns[0];
  if (!t0) return 1;
  const took = t0.defenderSwing ? t0.defenderSwing.dmg : 0;
  return Math.max(1, t0.attackerHpAfter + took);
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

// Build the two-actor arena and remember the per-actor bits we tween/animate.
export function beginFx(result, instant) {
  teardown();
  if (instant) return; // instant resolution opts out of playback juice entirely

  const panel = document.getElementById('combat-panel');
  const log = document.getElementById('combat-log');
  if (!panel || !log) return;

  const pMax = playerStartHp(result);
  const mMax = Math.max(1, result.monster?.maxHp ?? 1);

  const root = el('div', 'cfx-arena');
  const you = actorCard('You', 'cfx-you');
  const foe = actorCard(result.monster?.name ?? 'Foe', 'cfx-foe');
  root.append(you.card, foe.card);
  panel.insertBefore(root, log);

  arena = {
    root,
    you: { ...you, max: pMax, hp: pMax },
    foe: { ...foe, max: mMax, hp: mMax },
  };
  setBar(arena.you, pMax);
  setBar(arena.foe, mMax);
}

function actorCard(name, sideClass) {
  const card = el('div', `cfx-actor ${sideClass}`);
  const label = el('div', 'cfx-name', name);
  const floats = el('div', 'cfx-floats');
  const bar = el('div', 'cfx-hpbar');
  const fill = el('span', 'cfx-hpfill');
  const num = el('div', 'cfx-hpnum');
  bar.append(fill);
  card.append(label, floats, bar, num);
  return { card, floats, fill, num };
}

function setBar(a, hp) {
  a.hp = Math.max(0, hp);
  const pct = a.max > 0 ? (a.hp / a.max) * 100 : 0;
  a.fill.style.width = `${pct}%`;
  a.fill.classList.toggle('cfx-low', pct <= 30);
  a.num.textContent = `${Math.round(a.hp)} / ${a.max}`;
}

// Spawn a floating number (or MISS) above an actor.
function floatNum(a, text, kind) {
  const f = el('div', `cfx-float cfx-${kind}`, text);
  // Small horizontal jitter so stacked numbers don't perfectly overlap. Derived
  // from the current child count (deterministic, no RNG needed).
  const jitter = ((a.floats.childElementCount % 5) - 2) * 12;
  f.style.setProperty('--cfx-dx', `${jitter}px`);
  a.floats.append(f);
  // Auto-clean after the CSS animation window.
  setTimeout(() => f.remove(), 900);
}

function strike(a, crit) {
  a.card.classList.remove('cfx-hit', 'cfx-shake', 'cfx-crit-hit');
  // Force reflow so re-adding the class restarts the animation on rapid hits.
  void a.card.offsetWidth;
  a.card.classList.add('cfx-hit');
  // A crit gets a distinct, punchier flash/glow (and a bigger shake) on top of
  // the normal hit feedback — additive, cleaned up on the same timer.
  if (crit) a.card.classList.add('cfx-crit-hit');
  if (!REDUCE.matches) a.card.classList.add('cfx-shake');
  setTimeout(() => a.card.classList.remove('cfx-hit', 'cfx-shake', 'cfx-crit-hit'), 360);
  // A very brief arena-level flash punctuates the big hit.
  if (crit && arena && arena.root && !REDUCE.matches) {
    arena.root.classList.remove('cfx-crit-flash');
    void arena.root.offsetWidth;
    arena.root.classList.add('cfx-crit-flash');
    setTimeout(() => arena && arena.root && arena.root.classList.remove('cfx-crit-flash'), 360);
  }
}

function applySwing(target, swing) {
  if (!swing) return;
  if (!swing.hit) {
    floatNum(target, 'MISS', 'miss');
    sfx('whiff');
    return;
  }
  const crit = swing.dmg >= target.max * CRIT_FRACTION;
  floatNum(target, `-${swing.dmg}`, crit ? 'crit' : 'dmg');
  sfx(crit ? 'crit' : 'hit');
  strike(target, crit);
}

// Play one turn's worth of fx. Player (attacker) swings at the foe; if the foe
// survives, it swings back at you. The counter is staggered slightly so the two
// hits read as a exchange rather than one blur.
export function turnFx(t) {
  if (!arena || !t) return;

  applySwing(arena.foe, t.attackerSwing);
  setBar(arena.foe, t.defenderHpAfter);

  if (t.defenderHpAfter === 0) {
    arena.foe.card.classList.add('cfx-dead');
    return; // no counter-swing when the foe falls
  }

  const counter = () => {
    if (!arena) return;
    applySwing(arena.you, t.defenderSwing);
    setBar(arena.you, t.attackerHpAfter);
    if (t.attackerHpAfter === 0) arena.you.card.classList.add('cfx-dead');
  };
  if (REDUCE.matches) counter();
  else setTimeout(counter, 170);
}

// Resolution flourish. Also snaps the bars to their final values in case the
// player hit Skip mid-playback (so the arena never lingers on a stale bar).
export function endFx(result) {
  if (!arena) return;
  const last = result.turns[result.turns.length - 1];
  if (last) {
    setBar(arena.foe, last.defenderHpAfter);
    setBar(arena.you, last.attackerHpAfter);
    if (last.defenderHpAfter === 0) arena.foe.card.classList.add('cfx-dead');
    if (last.attackerHpAfter === 0) arena.you.card.classList.add('cfx-dead');
  }
  const cls =
    result.outcome === 'win' ? 'cfx-victory' : result.outcome === 'loss' ? 'cfx-defeat' : 'cfx-draw';
  arena.root.classList.add(cls);
  const label =
    result.outcome === 'win' ? '★ VICTORY ★' : result.outcome === 'loss' ? 'DEFEAT' : 'UNRESOLVED';
  const flash = el('div', 'cfx-flourish', label);
  arena.root.append(flash);
  if (result.outcome === 'win') sfx('victory');
  else if (result.outcome === 'loss') sfx('defeat');
}

function teardown() {
  if (arena && arena.root && arena.root.parentNode) arena.root.parentNode.removeChild(arena.root);
  arena = null;
}
