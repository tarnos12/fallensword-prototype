// Deterministic combat resolver (GDD §4.1, §8) — a pure function of
// (attacker, defender, seed). It never mutates its inputs and never touches
// game state, UI, or rewards; those belong to the game layer. This is the
// function a future PvP mode calls against a real player's stat sheet.

import { mulberry32 } from './rng.js';

export const MAX_TURNS = 20;

// Hit chance: your Attack against twice their Defense, so equal stats = 50%.
// Clamped so no fight is ever a guaranteed hit or guaranteed whiff (GDD §8.2's
// "outcomes aren't 100% predictable even at a stat advantage").
const HIT_FLOOR = 0.05;
const HIT_CEIL = 0.95;

function hitChance(attack, defense) {
  return Math.min(HIT_CEIL, Math.max(HIT_FLOOR, attack / (defense * 2)));
}

// Damage on a hit: Damage vs Armor, each with ±5% noise; armor soaking the
// full roll still chips 1 HP (GDD §8.2's three-way hit outcome).
function rollDamage(damage, armor, rng) {
  const dmgRoll = damage * (0.95 + rng() * 0.1);
  const armRoll = armor * (0.95 + rng() * 0.1);
  return Math.max(1, Math.round(dmgRoll - armRoll));
}

function swing(actor, target, rng) {
  const hit = rng() < hitChance(actor.stats.attack, target.stats.defense);
  const dmg = hit ? rollDamage(actor.stats.damage, target.stats.armor, rng) : 0;
  return { hit, dmg };
}

/**
 * @returns {{
 *   outcome: 'win'|'loss'|'draw',   // from the attacker's perspective
 *   turns: Array<{round, attackerSwing, defenderSwing, attackerHpAfter, defenderHpAfter}>,
 *   staminaSpent: number,           // 1 per turn actually resolved (GDD §8.1)
 * }}
 */
export function resolveCombat(attacker, defender, seed) {
  const rng = mulberry32(seed);
  let aHp = attacker.hp;
  let dHp = defender.hp;
  const turns = [];
  let outcome = 'draw';

  for (let round = 1; round <= MAX_TURNS; round++) {
    const turn = { round, attackerSwing: null, defenderSwing: null };

    // Attacker swings first; if the defender dies there is no counter-swing.
    turn.attackerSwing = swing(attacker, defender, rng);
    dHp = Math.max(0, dHp - turn.attackerSwing.dmg);
    if (dHp === 0) {
      turn.attackerHpAfter = aHp;
      turn.defenderHpAfter = 0;
      turns.push(turn);
      outcome = 'win';
      break;
    }

    turn.defenderSwing = swing(defender, attacker, rng);
    aHp = Math.max(0, aHp - turn.defenderSwing.dmg);
    turn.attackerHpAfter = aHp;
    turn.defenderHpAfter = dHp;
    turns.push(turn);
    if (aHp === 0) {
      outcome = 'loss';
      break;
    }
  }

  return { outcome, turns, staminaSpent: turns.length };
}
