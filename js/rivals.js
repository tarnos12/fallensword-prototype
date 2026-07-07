// Rival stat-sheets (GDD §4.1 PvP hook, §6.5). Synthesizes a deterministic,
// level-scaled Actor stat block for a persona so the player can "spar" them
// through the SAME pure resolveCombat() a real PvP mode would call. The sheet is
// derived purely from the persona (id → archetype + variance, level → scale), so
// a given rival always fights the same way — no persistence, identical every run,
// exactly like the persona roster itself.
//
// The output is the one-Actor shape combat.js expects
// ({ id, name, level, stats:{attack,defense,damage,armor}, hp, maxHp }); this
// module never imports combat.js or game state — it just produces a stat sheet.

// Peer-power baseline: a level-1 rival's stats, and per-level growth. Tuned
// headless (rivals-sim) so a same-level rival is a real, roughly even fight for
// a typically-progressed cultivator — beatable with gear/cards/techniques, not a
// walkover, and steadily harder as the rival out-levels you.
const BASE = { attack: 11, defense: 7, damage: 8, armor: 2, maxHp: 34 };
const GROWTH = { attack: 1.9, defense: 1.0, damage: 1.55, armor: 0.6, maxHp: 6.5 };

// Archetypes redistribute the same power budget so rivals feel distinct: a
// striker trades bulk for offense, a bruiser the reverse, etc. Pure flavour on
// top of the level scale — the multipliers roughly cancel across the roster.
const ARCHETYPES = {
  striker:  { attack: 1.15, defense: 0.9,  damage: 1.2,  armor: 0.85, maxHp: 0.9,  label: 'Striker' },
  bruiser:  { attack: 0.9,  defense: 1.15, damage: 0.85, armor: 1.3,  maxHp: 1.2,  label: 'Bruiser' },
  duelist:  { attack: 1.2,  defense: 1.1,  damage: 0.95, armor: 0.95, maxHp: 0.95, label: 'Duelist' },
  balanced: { attack: 1.0,  defense: 1.0,  damage: 1.0,  armor: 1.0,  maxHp: 1.0,  label: 'Balanced' },
};
const ARCHETYPE_IDS = Object.keys(ARCHETYPES);

function hashId(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function archetypeFor(persona) {
  return ARCHETYPES[ARCHETYPE_IDS[hashId(persona.id) % ARCHETYPE_IDS.length]];
}

// A small deterministic ±variance per persona+stat so two same-archetype rivals
// aren't identical, without changing overall balance.
function variance(personaId, stat) {
  const h = hashId(personaId + ':' + stat);
  return 0.92 + (h % 1000) / 1000 * 0.16; // 0.92 .. 1.08
}

export function rivalStats(persona) {
  const arch = archetypeFor(persona);
  const lvl = Math.max(1, persona.level);
  const out = {};
  for (const k of ['attack', 'defense', 'damage', 'armor', 'maxHp']) {
    const raw = (BASE[k] + GROWTH[k] * (lvl - 1)) * arch[k] * variance(persona.id, k);
    out[k] = Math.max(1, Math.round(raw));
  }
  return out;
}

// The full Actor stat-sheet resolveCombat() consumes.
export function rivalActor(persona) {
  const s = rivalStats(persona);
  return {
    id: `rival-${persona.id}`,
    name: persona.name,
    level: persona.level,
    stats: { attack: s.attack, defense: s.defense, damage: s.damage, armor: s.armor },
    hp: s.maxHp,
    maxHp: s.maxHp,
  };
}
