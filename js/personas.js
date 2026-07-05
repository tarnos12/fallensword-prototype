// Persistent fake-player pool (GDD §6.7.1, §6.8). A modest roster of NPC
// personas — name, level band, sect tag — generated ONCE from a fixed seed so
// the same cast recurs everywhere (Treasure Pavilion sellers/buyers now; the
// profile "Rivals" and "Recently Active" feeds later). Consistency is what
// sells the illusion of a living economy: a name you have seen sell gear before
// feels real in a way a fresh random string never does. Because generation is
// deterministic, the roster costs nothing to persist — it is identical on every
// load without living in the save.

import { mulberry32 } from './rng.js';

const SURNAMES = [
  'Li', 'Wang', 'Zhao', 'Chen', 'Lin', 'Yun', 'Bai', 'Xiao', 'Gu', 'Mu',
  'Shen', 'Ye', 'Han', 'Jiang', 'Feng', 'Luo', 'Su', 'Tang', 'Wei', 'Xu',
  'Yan', 'Zhou', 'Duan', 'Nangong', 'Ximen', 'Murong', 'Dongfang', 'Situ',
];

const GIVEN = [
  'Tian', 'Yun', 'Chen', 'Feng', 'Long', 'Xue', 'Ming', 'Hua', 'Yu', 'Lei',
  'Bing', 'Hao', 'Jian', 'Kai', 'Ling', 'Ru', 'Shan', 'Wu', 'Xin', 'Zhen',
  'Ziyan', 'Qing', 'Rong', 'Hui', 'Mei', 'Lan', 'Fei', 'Guang', 'Nian', 'Ci',
];

// Sect tags (guild tags in FS terms) — reused as the persona's affiliation.
const SECTS = [
  'AzureCloud', 'NinePeaks', 'CrimsonLotus', 'FrostVeil', 'IronDao', 'JadePavilion',
  'ThunderGate', 'VoidHall', 'GoldenScale', 'Mistfall', 'Starriver', 'EmberPath',
  'CelestialWheel', 'ObsidianSpire', 'WhiteCrane', 'BloodMoon',
];

const ROSTER_SEED = 0x5ec7_1a0f; // fixed — the roster must be identical every run
const ROSTER_SIZE = 72; // GDD §6.7.1 target band is 60–150; a demo-appropriate 72

function build() {
  const rng = mulberry32(ROSTER_SEED);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const list = [];
  const seen = new Set();
  let i = 0;
  while (list.length < ROSTER_SIZE) {
    i += 1;
    const name = `${pick(SURNAMES)} ${pick(GIVEN)}`;
    if (seen.has(name)) continue; // keep names distinct so the cast feels real
    seen.add(name);
    // Level skewed low (most cultivators are early-realm) but spanning the ladder.
    const level = 1 + Math.floor(Math.pow(rng(), 1.4) * 17); // 1..18
    list.push({ id: `npc-${i}`, name, level, guildTag: pick(SECTS) });
  }
  return list;
}

export const PERSONAS = build();

const BY_ID = Object.fromEntries(PERSONAS.map((p) => [p.id, p]));

export function personaById(id) {
  return BY_ID[id] ?? null;
}

export function randomPersona(rng) {
  return PERSONAS[Math.floor(rng() * PERSONAS.length)];
}

// A persona whose level band suits a given item level, so a listing's seller
// looks plausible for what they are selling. Falls back to any persona.
export function personaForLevel(level, rng) {
  const near = PERSONAS.filter((p) => Math.abs(p.level - level) <= 3);
  const pool = near.length ? near : PERSONAS;
  return pool[Math.floor(rng() * pool.length)];
}

export function personaLabel(persona) {
  if (!persona) return 'Unknown';
  return `${persona.name} [${persona.guildTag}] · Lv ${persona.level}`;
}
