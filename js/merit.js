// Merit — the premium currency (doc 20 §1). Xianxia-flavored: cultivators
// accrue Merit for deeds that matter to Heaven (felling a Legendary beast,
// standing against a Titan, crossing a threshold few reach), not for grinding
// common beasts. Earned in-game only this pass (drops/bosses/achievements/
// dailies/trade) — no real-money purchase is built (doc 20 §2/§6): a future
// `purchaseMerit(amount)` on-ramp would call the same `awardMerit` mutator
// with zero change to this file.
//
// Pure, no DOM, no game-state reach beyond the one mutator below — so
// CombatWorld (game.js attack()/titans.js), boss.js, and achievements.js can
// each `import { MERIT_REWARDS, awardMerit } from './merit.js'` without
// touching js/meritshop.js or one another. `player.merit` itself is
// initialized in `js/actors.js createPlayer()` (Wave 1, already committed).

// Concrete earn amounts (doc 20 §1.3). Callers own their own addLog() call
// with the reason text, same division of labor as spiritStones increments
// elsewhere in the codebase.
export const MERIT_REWARDS = {
  legendaryKill: 2,
  superEliteKill: 6,
  titanDefeat: 20,
  bossClear: { xuanming: 8, zhulong: 10, jiuxiao: 12 },
  dailyTrialWin: 1,
  achievementTier: { bronze: 3, silver: 6, gold: 12 },
};

// Mutates player.merit. Signature is a frozen contract — CombatWorld's kill/
// drop hooks call this exactly as `awardMerit(player, amount)`.
export function awardMerit(player, amount) {
  if (amount > 0) player.merit = (player.merit ?? 0) + amount;
  return player.merit;
}

// Spend helper (the Hall of Merit and any future Merit sink use this rather
// than reaching into `player.merit` directly). Returns false without
// mutating if the player can't afford it.
export function spendMerit(player, amount) {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if ((player.merit ?? 0) < amount) return false;
  player.merit -= amount;
  return true;
}
