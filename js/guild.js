// Sect stub — the "Warband" guild system (GDD §3, §4.3, §9.1). Hireable NPC
// fellow disciples grant sect-style passive buffs — the same *category* a real
// guild would (XP gain, resource gain), just populated by NPCs for 1.0. It all
// lives behind a GuildProvider interface (getMembers / getRecruits / hire /
// dismiss / buffs), so a 2.0 NetworkGuildProvider can implement the same shape
// against real guilds and the rest of the game never knows the difference.
//
// Recruits are drawn from the shared persona roster (personas.js) — the same
// cast that seeds the Treasure Pavilion — so a name you have bought gear from
// might also be a disciple you can recruit. A persona's specialty is derived
// deterministically from its id, and buff strength scales with its level.

import { PERSONAS, personaById, personaLabel } from './personas.js';

export const SECT_CAPACITY = 3; // disciple slots for the Stage 2 stub

// Disciple specialties. bonusType names the economy channel the buff feeds;
// perLevel is scaled by the disciple's cultivation level. These are the
// "category" of buff a guild grants (GDD §3) — combat-stat sect buffs are a
// later extension that would plug into effectiveStats the way cards do.
export const SPECIALTIES = [
  { id: 'war', name: 'War Disciple', icon: '⚔', bonusType: 'xpPct', perLevel: 0.012, desc: 'Sparring sharpens your edge — more XP from every battle.' },
  { id: 'merchant', name: 'Merchant Disciple', icon: '◆', bonusType: 'stonePct', perLevel: 0.012, desc: 'Shrewd spoils-splitting — more spirit stones from every kill.' },
  { id: 'alchemist', name: 'Alchemy Disciple', icon: '⚗', bonusType: 'stonesPerHour', perLevel: 3, desc: 'Refines pills while you are away — passive spirit-stone income.' },
  { id: 'warden', name: 'Meditation Disciple', icon: '☯', bonusType: 'qiCap', perLevel: 6, desc: 'Guides your breathing — a deeper reservoir of Qi.' },
];

const SPEC_BY_ID = Object.fromEntries(SPECIALTIES.map((s) => [s.id, s]));

function personaIndex(persona) {
  return parseInt(persona.id.split('-')[1], 10) || 0;
}

export function specialtyForPersona(persona) {
  return SPECIALTIES[personaIndex(persona) % SPECIALTIES.length];
}

// A curated recruit board — "disciples currently seeking a sect" — rather than
// dumping all 72 personas on the player. Built to guarantee a spread across all
// specialties (a few of each, cheapest first) so every buff type is recruitable.
export const RECRUITS = (() => {
  const perSpecialty = 3;
  const groups = Object.fromEntries(SPECIALTIES.map((s) => [s.id, []]));
  for (const p of PERSONAS) groups[specialtyForPersona(p).id].push(p);
  const board = [];
  for (const spec of SPECIALTIES) {
    board.push(...groups[spec.id].sort((a, b) => a.level - b.level).slice(0, perSpecialty));
  }
  return board;
})();

export function hireCost(persona) {
  return Math.round(150 + persona.level * 100);
}

export function specialtyBuffText(spec, level) {
  const v = spec.perLevel * level;
  switch (spec.bonusType) {
    case 'xpPct': return `+${Math.round(v * 100)}% battle XP`;
    case 'stonePct': return `+${Math.round(v * 100)}% battle spirit stones`;
    case 'stonesPerHour': return `+${v} spirit stones / hour`;
    case 'qiCap': return `+${v} max Qi`;
    default: return '';
  }
}

function members(player) {
  return player.guild?.members ?? [];
}

export function isHired(player, personaId) {
  return members(player).includes(personaId);
}

// Aggregate every hired disciple's buff into one bundle the game layer applies.
export function guildBuffs(player) {
  const b = { xpPct: 0, stonePct: 0, stonesPerHour: 0, qiCap: 0 };
  for (const id of members(player)) {
    const persona = personaById(id);
    if (!persona) continue;
    const spec = specialtyForPersona(persona);
    b[spec.bonusType] += spec.perLevel * persona.level;
  }
  return b;
}

function memberView(id) {
  const persona = personaById(id);
  const spec = specialtyForPersona(persona);
  return { personaId: id, persona, label: personaLabel(persona), specialty: spec, buffText: specialtyBuffText(spec, persona.level) };
}

function recruitView(persona) {
  const spec = specialtyForPersona(persona);
  return {
    personaId: persona.id,
    persona,
    label: personaLabel(persona),
    specialty: spec,
    buffText: specialtyBuffText(spec, persona.level),
    cost: hireCost(persona),
  };
}

function hire(state, personaId) {
  const p = state.player;
  if (!p.guild) p.guild = { members: [] };
  const persona = personaById(personaId);
  if (!persona) return { ok: false, reason: 'No such disciple.' };
  if (isHired(p, personaId)) return { ok: false, reason: 'Already in your sect.' };
  if (members(p).length >= SECT_CAPACITY) return { ok: false, reason: `Your sect is full (${SECT_CAPACITY} disciples).` };
  const cost = hireCost(persona);
  if (p.spiritStones < cost) return { ok: false, reason: 'Not enough spirit stones.' };
  p.spiritStones -= cost;
  p.guild.members.push(personaId);
  return { ok: true, persona, cost, specialty: specialtyForPersona(persona) };
}

function dismiss(state, personaId) {
  const p = state.player;
  if (!isHired(p, personaId)) return { ok: false, reason: 'Not in your sect.' };
  p.guild.members = members(p).filter((id) => id !== personaId);
  return { ok: true, persona: personaById(personaId) };
}

// The GuildProvider interface (GDD §4.3). NPC-backed today; a 2.0
// NetworkGuildProvider implements the same shape against real guilds.
export function createGuildProvider(state) {
  if (!state.player.guild) state.player.guild = { members: [] };
  return {
    capacity: SECT_CAPACITY,
    getMembers: () => members(state.player).map(memberView),
    getRecruits: () => RECRUITS.filter((p) => !isHired(state.player, p.id)).map(recruitView),
    hire: (personaId) => hire(state, personaId),
    dismiss: (personaId) => dismiss(state, personaId),
    buffs: () => guildBuffs(state.player),
  };
}
