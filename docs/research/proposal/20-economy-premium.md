# Economy & Premium Currency — Change Proposal

**Owner:** Author-Economy. Scope per `00-brief.md`: premium currency (name/flavor, earn/sink
sources, `save.js` field), the premium upgrade shop (catalog, absorption of scattered sinks), and
auction-house dual-currency. Audited: `js/market.js`, `js/personas.js`, `js/items.js`, `js/game.js`
(Qi + spirit-stone economy), `js/save.js`, `js/loadouts.js`, `js/sets.js`, `js/meridians.js`,
`js/achievements.js`, `js/ascension.js`. DESIGN ONLY this pass — no `js/`/`index.html`/`css/` edits.

---

## Summary

- **New currency: Merit** (`player.merit`, additive integer field). Xianxia-flavored: cultivators
  accrue Merit for deeds that matter to Heaven — slaying calamities, standing against a Titan,
  crossing a milestone — not for grinding common beasts. Earned in-game only this pass (drops/
  bosses/achievements/dailies); real-money purchase is explicitly **not built**, flagged as the
  author's future call (§6).
- **New shop: the Hall of Merit**, opened from the premium-currency icon (✧) in the HUD (per the
  author's directive, confirmed by Architect-Cull's IA pass — neither this shop nor the Auction
  House `◆` icon is a tab). A thirteen-row catalog: twelve stacking convenience/capacity/consumable/
  respec upgrades (the FallenSword-style "buy it all eventually" queue the author asked for — now
  also the confirmed consolidation home for Architect-Cull's CUT/MERGE ledger: three respec rows,
  inventory slots, Qi cap/regen, loadout slots, XP protection, and Alchemy's Qi-restore, see
  §3.2/§7.1) plus **one exclusive, re-pickable-at-a-cost build choice** (the Dao Heart), so the shop
  isn't *purely* a flat-power queue — see the T2/Idle-Slayer guardrail discussion in §3.5.
- **Auction House dual-currency:** `market.js` listings (NPC and player) gain a `currency` field;
  a small share of NPC listings price in Merit instead of stones (FS's "gold or FSP" pattern),
  and players may choose to list their own drops in Merit. This is the tradeable half of "earnable
  + tradeable in-game" — a player who doesn't want to farm Legendaries can instead sell a good drop
  for Merit.
- **Ledger:** ADD Merit + Hall of Merit + dual-currency AH + the new `xpProtection` row. MERGE
  (confirmed with Architect-Cull, §7.1): loadout-slot cap, inventory-slot cap, Qi cap/regen, three
  costed-respec rows (final shape converged with Progression/Critic4 over three rounds — calling the
  real `respecStats()`/`resetMeridians()`/`resetTechniques()`, §7.2), and Alchemy's instant-Qi-restore
  effect (Alchemy.js itself is CUT by Architect-Cull, not by Economy) all fold into the Hall of Merit
  as premium-gated upgrades. Salvage's payout currency question (Architect-Cull asked) is answered
  **gold, not Merit** — keeps Merit scarce (§7.1). CUT: none directly by Economy — full line in §8.
  All cross-doc coordination items (Architect-Cull, Progression, CombatWorld, two rounds with
  Critic4) are now resolved — no open conflicts remain; see §7 for the full trail and §9 for the
  handful of non-blocking build-time confirmations still outstanding.

---

## 1. Premium currency: Merit

### 1.1 Name & flavor

**Merit** (功德-flavored, no Chinese characters needed in-UI — the English word carries the concept
cleanly). Framing text for the currency tooltip/icon:

> *"Heaven does not coin money, but it keeps a ledger. Merit is earned by deeds that echo — felling
> a Legendary beast, standing against a Titan's fury, crossing a threshold few reach. Spend it where
> spirit stones cannot buy."*

This deliberately does NOT reuse "spirit stone" language (the existing gold currency, `player.
spiritStones`) — Merit reads as a *renown* currency, distinct in kind, not just a bigger denomination
of the same money. Icon: a stylized jade token/scale glyph — final iconography is Architect-Cull's
"less like AI" visual-identity pass; I'm only specifying that it must be visually and namewise
distinct from the gold spirit-stone icon.

### 1.2 Save field (additive, no VERSION bump)

Following the established back-fill pattern (`player.cards`/`player.consumables`/`player.materials`
etc., each individually defaulted in `createGame()`, `js/game.js:104-116`):

```js
// js/actors.js createPlayer() — next to spiritStones: 20,
merit: 0,

// js/game.js createGame() — alongside the existing back-fill block (~line 104-116)
if (state.player.merit == null) state.player.merit = 0;
if (!state.player.meritShop) {
  state.player.meritShop = {
    purchases: {}, // { [upgradeId]: count } — sparse, absent key = 0
    daoHeart: null, // 'hunter' | 'merchant' | 'ascetic' | null — see §3.4
    daoHeartSwitches: 0,
  };
}
if (!state.player.meritBuffs) state.player.meritBuffs = []; // timed consumable effects, see §3.3
```

Three new top-level `player` fields (`merit`, `meritShop`, `meritBuffs`), all additive, all
back-filled — no `save.js` shape break, no `VERSION` bump. `save.js`'s `saveGame`/`loadGame` need
**no changes at all**: they already round-trip the whole `player` object opaquely (`blob.player =
state.player`), so new player fields ride for free, exactly like `player.pillBuffs`/`player.
loadouts` did.

### 1.3 Earn sources (concrete, not abstract — addresses Critic4's #3)

Merit must stay *scarce enough to feel premium* (the shop's costs only mean something if Merit
doesn't flood in from routine kills) while remaining a *recurring*, not one-shot-and-exhausted,
source (23 achievements alone would run dry well past 1.0). Concrete table, new file `js/merit.js`
(pure constants + one mutator, see §1.4):

| Source | Amount | Where awarded (exact hook) |
|---|---:|---|
| Legendary monster kill | **+2 Merit** | `js/game.js` `attack()`, win branch (~line 490-530) — gated on a monster tier tag CombatWorld defines (see §7.3) |
| Super Elite kill | **+6 Merit** | same hook, `monster.tier === 'superElite'` |
| Titan defeat (after the ~10-hit chase sequence completes) | **+20 Merit** | wherever CombatWorld's world-state Titan-movement code resolves the final hit — a one-time award per Titan kill, not per-hit |
| Calamity boss clear (Xuanming/Zhulong/Jiuxiao) | **+8 / +10 / +12 Merit** (scales with gate tier) | `js/boss.js` `onBossDefeated()` — already wall-clock cooldown-gated (30/45/60 min), so this is inherently rate-limited, safe from farming |
| Daily Trial win | **+1 Merit** | `js/game.js` `attemptDailyTrial()` win branch (~line 222-236), alongside the existing stones/xp grant — one attempt/day, so this is a small reliable trickle |
| Achievement unlock | **+3 / +6 / +12 Merit** by tier (bronze/silver/gold) | `js/achievements.js`'s unlock-check path (`recordAchievements`, ~line 134-157) — one-time per achievement (23 total ≈ 130 Merit lifetime; a bounded bootstrap, not the main-line source — see below) |
| Selling an item into the Auction House priced in Merit | player-set price | `js/market.js` — see §4; this is the *recurring, player-driven* Merit faucet once someone has looted a good Legendary/Epic+ piece they'd rather monetize than wear |

Achievements are correctly a **bounded bootstrap** (get new players their first Hall-of-Merit
purchases early), not the long-run source — the long-run loop is Legendary/SE/Titan kills (recurring
world content, CombatWorld's territory) plus the AH's Merit-priced listings (recurring, player-driven,
see §4). This mirrors FSP's own shape: FSP has *some* achievement/event grants but the sustained
supply is drops + trade, not a finite unlock list.

`js/merit.js` (new, pure — no DOM, no game-state reach beyond the one mutator) is the single-owner
home for these constants so every caller (game.js, boss.js, achievements.js — three different modules
this sprint) references the same numbers instead of hand-rolled literals scattered per call site:

```js
// js/merit.js
export const MERIT_REWARDS = {
  legendaryKill: 2,
  superEliteKill: 6,
  titanDefeat: 20,
  bossClear: { xuanming: 8, zhulong: 10, jiuxiao: 12 },
  dailyTrialWin: 1,
  achievementTier: { bronze: 3, silver: 6, gold: 12 },
};

// Mutates player.merit; callers own their own addLog() call with the reason
// text, same division of labor as spiritStones increments elsewhere.
export function awardMerit(player, amount) {
  if (amount > 0) player.merit = (player.merit ?? 0) + amount;
}
```

Kept deliberately tiny and import-safe (no cycle risk) so CombatWorld/boss.js/achievements.js can
each `import { MERIT_REWARDS, awardMerit } from './merit.js'` without touching my other file
(`meritshop.js`, §3) or each other.

### 1.4 Sinks

Two sinks, both this pass:
1. **The Hall of Merit** (§3) — the primary sink, by design (the author's ask: consolidate scattered
   progression purchases here).
2. **Auction House Merit-priced listings** (§4) — a secondary sink/recirculation loop: Merit spent
   buying a Merit-priced NPC listing flows back out as a fresh listing's price, keeping the pool
   from just accumulating unused once a player has bought out the shop's stacking caps.

No other sink is proposed this pass (no cosmetics system exists to spend into; Architect-Cull's
visual-identity pass may create one later — flagged, not built).

---

## 2. Real-money on-ramp — explicitly NOT built (flag, don't bake in)

Per the brief: the "offline-complete, no-monetization" pillar is only *partly* overridden — Merit
must be earnable + tradeable in-game (§1.3, §4) so the game stays fully playable offline with zero
purchases. `js/merit.js`'s `awardMerit(player, amount)` is a plain mutator on a plain integer field;
if the author later wants a cash on-ramp, it drops in as a `purchaseMerit(amount)` call behind a
future payment-provider stub that calls the *same* mutator — zero change to earn/spend logic, no
new data shape. Research's `10-direct-neighbors.md` flags Eldevin's stance (same parent studio as
FallenSword) as the precedent to follow **if** this is ever revisited: *"paid buys convenience/
cosmetic, never power."* Every Hall of Merit upgrade in §3 is capacity/convenience/consumable-buff —
none is a raw combat-stat purchase — so the catalog is already shaped to honor that stance without
needing to be redesigned later. This is a note for the author's future decision, not a build task.

---

## 3. The Hall of Merit (premium upgrade shop)

### 3.1 Where it lives

New self-contained module `js/meritshop.js`, following the exact pattern `crafting.js`/`salvage.js`/
`ascension.js` already establish: owns its own catalog data, its own pure cost/effect helpers, its
own modal DOM, and its own stylesheet (`css/meritshop.css`, linked in `index.html` head like
`salvage.css`/`sectmissions.css` are). **No `ui.js` edit, no `index.html` markup edit** beyond the
one `<link>` tag every self-contained module already adds. The one deliberate departure from the
usual "own nav button" pattern: per the author's explicit direction, this shop is opened by **clicking
the Merit currency display itself** (the HUD chip showing the player's Merit balance), not a separate
nav-menu button — `initMeritShop(state, actions)` attaches its click handler to that HUD element
(whichever element ends up hosting the Merit balance chip — coordinate placement with Architect-Cull's
IA pass, since the HUD/nav layout is their territory this sprint).

### 3.2 Catalog data shape

Rows are tagged with a `kind` so `buyMeritUpgrade` (below) knows how to resolve the purchase:
`'stacking'` (raises a capacity counter, read by `meritShopBonuses()`), `'timed'` (pushes/extends a
`meritBuffs` entry), `'instant'` (applies once, immediately, nothing persists), or `'respec'`
(signals the caller to invoke one of Progression's three reset functions — `respecFn` names exactly
which one, `costFn` names the matching cost-basis getter, both per Progression's final
`30-progression-skills.md` shape, after two rounds of cross-doc correction with Critic4: my first
draft invented hooks that didn't exist; Progression's own first revision over-corrected to a single
conditional pool; the final shape is three independent, unconditional respec rows — see §7.2). Rows
6-10 below (`xpProtection`, `statRespec`, `meridianRespec`, `techniqueRespec`, `qiRestore`) are the
confirmed absorption of Architect-Cull's cull ledger — respec (comparison-doc ADOPT item), inventory/
Qi/loadout capacity, XP protection (an FS staple that didn't exist in any form here before), and
Alchemy's Qi-restore consumable (Alchemy itself is being CUT by Architect-Cull; its instant-Qi-
restore effect needed a new home, confirmed here rather than vanishing — see §7.1):

```js
// js/meritshop.js
export const MERIT_UPGRADES = {
  packSlots: {
    name: 'Pack Expansion', kind: 'stacking',
    perPurchase: 2, maxPurchases: 6, // +2 to +12 slots total (12 -> 24)
    baseCost: 15, costGrowth: 1.6,
  },
  qiCap: {
    name: 'Qi Reservoir', kind: 'stacking',
    perPurchase: 10, maxPurchases: 8, // +10 to +80 max Qi (120 -> 200)
    baseCost: 10, costGrowth: 1.5,
  },
  qiRegenPct: {
    name: 'Qi Current Talisman', kind: 'stacking',
    perPurchase: 0.05, maxPurchases: 6, // -5% to -30% QI_REGEN_MS, capped so the Qi gate never disappears
    baseCost: 20, costGrowth: 1.7,
  },
  loadoutSlots: {
    name: 'Combat Set Expansion', kind: 'stacking',
    perPurchase: 1, maxPurchases: 2, // MAX_LOADOUTS 4 -> 6
    baseCost: 25, costGrowth: 2.0,
  },
  marketSlots: {
    name: 'Auction Stall Expansion', kind: 'stacking',
    perPurchase: 1, maxPurchases: 3, // new MAX_PLAYER_LISTINGS base 3 -> 6, see §4.4
    baseCost: 20, costGrowth: 1.8,
  },
  xpProtection: {
    name: 'Ward Against Regression', kind: 'stacking',
    perPurchase: 0.25, maxPurchases: 4, // -25% to -100% of DEATH_XP_LOSS (game.js, currently a flat 3% on death)
    baseCost: 25, costGrowth: 1.8,
    // an FS staple (per Architect-Cull); stacking rather than one-shot so it's
    // priced/felt the same way as the rest of the capacity queue.
  },
  statRespec: {
    name: 'Cultivation Respec Talisman', kind: 'respec', respecFn: 'respecStats', costFn: 'statPointsSpent',
    maxPurchases: Infinity, baseCost: 20, costScalesWithPointsSpent: 2, gateStage: 10, // FE1+, matches FS's "not a starter tool"
  },
  meridianRespec: {
    name: 'Meridian Respec Talisman', kind: 'respec', respecFn: 'resetMeridians', costFn: 'meridianPointsSpent',
    maxPurchases: Infinity, baseCost: 20, costScalesWithPointsSpent: 2,
  },
  techniqueRespec: {
    name: 'Technique Respec Talisman', kind: 'respec', respecFn: 'resetTechniques', costFn: 'techniquePointsSpent',
    maxPurchases: Infinity, baseCost: 20, costScalesWithPointsSpent: 2,
  },
  qiRestore: {
    name: 'Spirit Replenishment Draught', kind: 'instant',
    maxPurchases: Infinity, baseCost: 8, costGrowth: 1.0,
    effect: { qiRestore: 40 }, // instant +40 Qi (capped at maxQi(player)) — Alchemy's old Qi-restore role
  },
  xpBoost: {
    name: 'Insight Charm', kind: 'timed',
    maxPurchases: Infinity, baseCost: 15, costGrowth: 1.0,
    effect: { xpPct: 0.25, durationMs: 60 * 60 * 1000 },
  },
  dropBoost: {
    name: 'Fortune Draught', kind: 'timed',
    maxPurchases: Infinity, baseCost: 15, costGrowth: 1.0,
    effect: { dropPct: 0.25, durationMs: 60 * 60 * 1000 },
  },
};

// Cost of the NEXT purchase. 'respec' rows scale with invested points instead
// of a geometric owned-count curve (a deep respec should cost more than a
// shallow one) — three independent respec resources, three independent cost
// getters, all confirmed real exports from Progression's files (final shape
// per their 30-progression-skills.md §1.2/§2.5/§3.4, after two rounds of
// cross-doc correction with Critic4 — see §7.2):
//   statPointsSpent(player)      — js/progression.js (new)
//   meridianPointsSpent(player)  — js/meridians.js (already existed, unchanged)
//   techniquePointsSpent(player) — js/techniques.js (new)
// meritshop.js imports all three by name via each row's `costFn`. 'instant'/
// 'timed' rows repeat at a flat cost (costGrowth: 1.0) since they're
// consumables, not a capacity ladder.
import { statPointsSpent } from './progression.js';
import { meridianPointsSpent } from './meridians.js';
import { techniquePointsSpent } from './techniques.js';

const RESPEC_COST_FNS = { statPointsSpent, meridianPointsSpent, techniquePointsSpent };

export function meritUpgradeCost(upgradeId, player) {
  const u = MERIT_UPGRADES[upgradeId];
  if (u.kind === 'respec') {
    const spent = RESPEC_COST_FNS[u.costFn](player);
    return u.baseCost + u.costScalesWithPointsSpent * spent;
  }
  const owned = player.meritShop.purchases[upgradeId] ?? 0;
  return Math.round(u.baseCost * Math.pow(u.costGrowth, owned));
}

export function canBuyMeritUpgrade(player, upgradeId) {
  const u = MERIT_UPGRADES[upgradeId];
  const owned = player.meritShop.purchases[upgradeId] ?? 0;
  if (u.kind === 'stacking' && owned >= u.maxPurchases) return { ok: false, reason: 'Fully upgraded.' };
  if (u.gateStage && player.level < u.gateStage) return { ok: false, reason: `Unlocks at Foundation Establishment (stage ${u.gateStage}).` };
  const cost = meritUpgradeCost(upgradeId, player);
  if (player.merit < cost) return { ok: false, reason: 'Not enough Merit.' };
  return { ok: true, cost };
}

export function buyMeritUpgrade(player, upgradeId, now = Date.now()) {
  const check = canBuyMeritUpgrade(player, upgradeId);
  if (!check.ok) return check;
  const u = MERIT_UPGRADES[upgradeId];
  player.merit -= check.cost;
  switch (u.kind) {
    case 'timed': {
      // Applied immediately (buy = use), not stockpiled — a premium impulse-
      // buy, distinct from Alchemy's old brew-then-quaff pouch (Alchemy itself
      // is CUT per Architect-Cull, see §7.1). Duration STACKS on repurchase
      // (extends expiresAt) rather than re-rolling, so buying early never
      // wastes an active buff.
      const existing = player.meritBuffs.find((b) => b.id === upgradeId);
      if (existing) existing.expiresAt += u.effect.durationMs;
      else player.meritBuffs.push({ id: upgradeId, expiresAt: now + u.effect.durationMs });
      break;
    }
    case 'instant':
      // qiRestore: the sole instant-effect row today. Caller (game.js) applies
      // `state.qi = Math.min(maxQi(state.player), state.qi + u.effect.qiRestore)`
      // right after this returns ok — kept here as a data note, not a game.js
      // reach-in, since meritshop.js doesn't own `state.qi`.
      break;
    case 'respec':
      // caller (game.js wrapper) invokes the named reset function — `respecFn`
      // is 'respecStats' (progression.js), 'resetMeridians' (meridians.js), or
      // 'resetTechniques' (techniques.js). The refund itself is NOT applied
      // here — meritshop.js only charges Merit and names which function the
      // game.js wrapper must call next, same division of labor as `ascend()`
      // wrapping `performAscension()`.
      return { ok: true, cost: check.cost, needsRespec: u.respecFn };
    case 'stacking':
    default:
      player.meritShop.purchases[upgradeId] = (player.meritShop.purchases[upgradeId] ?? 0) + 1;
  }
  return { ok: true, cost: check.cost };
}

// The ONE add-line this module contributes to other systems' aggregates —
// mirrors sets.js/sockets.js's `*Bonuses(player)` convention. Consumed by
// game.js's maxQi()/tickQi()/the death-penalty XP-loss calc, items.js's
// effectiveInventorySize(), and loadouts.js's effectiveMaxLoadouts() (§3.6).
export function meritShopBonuses(player) {
  const p = player.meritShop?.purchases ?? {};
  return {
    qiCap: (p.qiCap ?? 0) * MERIT_UPGRADES.qiCap.perPurchase,
    qiRegenPct: Math.min(0.3, (p.qiRegenPct ?? 0) * MERIT_UPGRADES.qiRegenPct.perPurchase),
    packSlots: (p.packSlots ?? 0) * MERIT_UPGRADES.packSlots.perPurchase,
    loadoutSlots: (p.loadoutSlots ?? 0) * MERIT_UPGRADES.loadoutSlots.perPurchase,
    marketSlots: (p.marketSlots ?? 0) * MERIT_UPGRADES.marketSlots.perPurchase,
    // Multiplies DEATH_XP_LOSS (game.js:71) at the death-penalty call site —
    // clamped so 4 purchases fully negates it (1 - 4*0.25 = 0), never negative.
    xpLossMult: Math.max(0, 1 - (p.xpProtection ?? 0) * MERIT_UPGRADES.xpProtection.perPurchase),
  };
}

// Timed consumable multipliers — read the same way guildBuffs()'s xpPct/
// stonePct are read today (game.js attack()/attemptDailyTrial()), NOT routed
// through effectiveStats (these are reward-math modifiers, not combat stats).
export function meritBuffMultipliers(player, now = Date.now()) {
  player.meritBuffs = (player.meritBuffs ?? []).filter((b) => b.expiresAt > now); // lazy expiry
  let xpPct = 0, dropPct = 0;
  for (const b of player.meritBuffs) {
    if (b.id === 'xpBoost') xpPct += MERIT_UPGRADES.xpBoost.effect.xpPct;
    if (b.id === 'dropBoost') dropPct += MERIT_UPGRADES.dropBoost.effect.dropPct;
  }
  return { xpPct, dropPct };
}
```

### 3.3 Consumables vs. capacity — why buy = use

`xpBoost`/`dropBoost` apply immediately rather than stockpiling in a pouch (unlike `alchemy.js`'s
brewed pills) specifically to keep the Hall of Merit a *storefront* (pay now, get the effect now),
not a second crafting queue competing with Alchemy's existing pouch UX — this keeps the two systems
non-overlapping without needing a shared data structure or cross-file coordination.

### 3.4 The Dao Heart — the ONE exclusive choice (the T2/Idle-Slayer guardrail)

`docs/research/comparison/40-comparison.md`'s T2 finding is explicit: a currency-buys-unlocks menu
that a patient player eventually buys out *in full* isn't a real choice, it's "Idle Slayer's
Ultra-Ascension bigger-bonus-in-a-costume" pattern — a queue, not a decision. The twelve rows above
(packs, Qi cap/regen, loadout/market slots, XP protection, the three respec talismans, the Qi-restore
draught, the two timed elixirs) are **deliberately NOT trying to pass that test** — they're
capacity/convenience/consumables in the Eldevin "paid-buys-convenience" mold (§2), where "eventually
buy it all" is fine because none of it is exclusive combat power. But the brief also asks me to apply
the guardrail "where possible," so the catalog's thirteenth row is a genuine build-vs-build pick:

```js
export const DAO_HEART_PATHS = {
  hunter:   { name: 'Path of the Hunter',   meritGainPct: 0.15 }, // +15% Merit from all sources in §1.3
  merchant: { name: 'Path of the Merchant', sellPct: 0.15 },      // +15% Auction House sell/list value, both currencies
  // -10% Qi cost on active-ability casts. Confirmed mechanism (Progression's
  // final doc, §7.2): techniques.js's canCast/cast gain an optional
  // costMultiplier param (default 1); game.js:castTechnique computes
  // `1 + daoHeartBonuses(state.player).qiCostPct` and passes it through when
  // it calls cast() — meritshop.js and techniques.js never import each other,
  // game.js's existing wrapper is the meeting point (same pattern it already
  // uses for applyPillBuffs).
  ascetic:  { name: 'Path of the Ascetic',  qiCostPct: -0.10 },
};
const DAO_HEART_PICK_COST = 40;
const DAO_HEART_SWITCH_COST = 60; // steep on purpose — a re-pick is a real commitment, not a toggle

export function pickDaoHeart(player, pathId) {
  const cost = player.meritShop.daoHeart ? DAO_HEART_SWITCH_COST : DAO_HEART_PICK_COST;
  if (!DAO_HEART_PATHS[pathId]) return { ok: false, reason: 'Unknown path.' };
  if (player.meritShop.daoHeart === pathId) return { ok: false, reason: 'Already walking this path.' };
  if (player.merit < cost) return { ok: false, reason: 'Not enough Merit.' };
  player.merit -= cost;
  player.meritShop.daoHeart = pathId;
  if (player.meritShop.daoHeart) player.meritShop.daoHeartSwitches += 1;
  return { ok: true };
}

export function daoHeartBonuses(player) {
  return DAO_HEART_PATHS[player.meritShop?.daoHeart] ?? { meritGainPct: 0, sellPct: 0, qiCostPct: 0 };
}
```

Only one path is active at a time — picking Merchant means giving up Hunter's faster Merit income
*and* Ascetic's cheaper long-duration buffs, a real opportunity cost every session, not a checklist
item. The steep switch cost (60 vs. the 40 first-pick) means respeccing paths is a deliberate,
felt decision, not a costless toggle — this is the shape the T2 finding calls for ("exclusive
picks... forcing which one build-defining thing" rather than "three flavors of more permanent
stuff"). If the lead judges even this is too thin a "real choice" to earn the ADOPT label, the
fallback is honest: drop the Dao Heart and let the Hall of Merit be openly what most of it already
is — a FS-style convenience queue, consistent with Eldevin's non-power monetization stance, and
say so rather than dress up a queue as a choice.

### 3.5 Balance/tuning hook

`tools/balance.mjs` needs a new **"Merit economy" row-group** once this builds: simulate typical
Merit income (X Legendary kills + Y SE kills + Z boss clears per session) against the catalog's
cumulative cost-to-max (`Σ meritUpgradeCost` per row) to confirm the shop takes meaningful session
count to clear, not one lucky Titan kill — flagging this as a build-time gate, not resolving the
exact numbers in this design pass (the specific constants above are starting points, tunable like
every other `RARITIES`/`sellMult` constant already is). **Tune `qiCap`/`qiRegenPct` prices against
Progression's confirmed retuned baseline of `QI_REGEN_MS` → 75 Qi/hr, not today's prototype-fast
~1200/hr** (Progression's §7.2 note) — pricing these rows against the current fast-regen constant
would make them read as far cheaper than they'll actually feel once the retune lands.

### 3.6 Exact touch points for the capacity bonuses (blast-radius, addresses Critic4's concern)

Three existing hard-coded caps become "base + Hall-of-Merit bonus," plus two new touch points for
the confirmed Architect-Cull absorptions (XP protection, Alchemy's Qi-restore). Each base constant
stays **unchanged and still exported** (no import breaks) — a new pure helper sits next to it:

- **`js/items.js`** — `INVENTORY_SIZE = 12` stays as the base constant. New helper added right next
  to it (reads `player.meritShop` directly, no new import, no cycle):
  ```js
  export function effectiveInventorySize(player) {
    return INVENTORY_SIZE + (player.meritShop?.purchases?.packSlots ?? 0) * 2;
  }
  ```
  **10 existing call sites across 5 files** currently compare against the bare `INVENTORY_SIZE`
  constant and must switch to `effectiveInventorySize(p)`: `js/items.js:316` (`unequipItem`),
  `js/game.js:231,525,764` (loot/mailbox pack-full checks), `js/market.js:163,208,230` (buyNow/
  cancelListing/collectMailbox pack-full checks), `js/ui.js:495,498` (the `"N/12"` HUD readout and
  the pack-slot render loop), `js/main.js:443` (`unslotGem`'s pack-full check). This is real surface
  area — whichever teammate builds this should grep `INVENTORY_SIZE` fresh before landing, since a
  missed call site means a player who bought pack slots still gets turned away at the old cap.
- **`js/loadouts.js`** — `MAX_LOADOUTS = 4` stays. New helper:
  ```js
  export function effectiveMaxLoadouts(player) {
    return MAX_LOADOUTS + (player.meritShop?.purchases?.loadoutSlots ?? 0);
  }
  ```
  Two call sites swap: `saveLoadout()`'s `player.loadouts.length >= MAX_LOADOUTS` check (~line 40)
  and `renderLoadouts()`'s save-button `disabled` check (~line 112).
- **`js/game.js`** — `maxQi(player)` (line 64-66) gains a third source:
  ```js
  export function maxQi(player) {
    return MAX_QI + cardBonuses(player).meta.qiCap + guildBuffs(player).qiCap + meritShopBonuses(player).qiCap;
  }
  ```
  `tickQi(state, now)` (line 366-377) currently divides elapsed time by the flat `QI_REGEN_MS`
  constant; it needs the regen-speed bonus applied:
  ```js
  function effectiveQiRegenMs(player) {
    return QI_REGEN_MS * (1 - meritShopBonuses(player).qiRegenPct);
  }
  // inside tickQi: const gained = Math.floor((now - state.lastQiTick) / effectiveQiRegenMs(state.player));
  ```
  Capped at -30% (§3.2's `maxPurchases: 6` × 5%) so Qi regen can never approach "gate removed" —
  preserves the "sessions, not marathons" pillar per the research's explicit warning against
  dropping stamina-gating (`10-direct-neighbors.md` Eldevin note, tagged LOW/SKIP for exactly this
  reason).
- **`js/game.js`** — the death penalty (`DEATH_XP_LOSS = 0.03`, line 71, applied wherever a death
  resolves — mirrors `DEATH_STONE_LOSS`'s existing call site) picks up the `xpProtection` row's
  multiplier:
  ```js
  const xpLoss = Math.floor(baseXpLoss * meritShopBonuses(state.player).xpLossMult);
  ```
  Four full purchases (`xpLossMult` bottoms out at 0) makes death XP-loss-free — this is the
  confirmed FS-staple "XP protection" upgrade from Architect-Cull's cull ledger, absorbed here
  rather than built as its own standalone toggle.
- **`js/game.js`** — Alchemy's old instant-Qi-restore effect (Alchemy is CUT per Architect-Cull, see
  §7.1) is now the `qiRestore` catalog row's `'instant'` purchase path. The caller (wherever the
  Hall of Merit's buy button is wired, in `game.js`'s thin wrapper layer alongside `marketBuy`/
  `marketList`) applies the effect right after `buyMeritUpgrade()` returns ok for an `'instant'`
  row:
  ```js
  const res = buyMeritUpgrade(state.player, 'qiRestore');
  if (res.ok) state.qi = Math.min(maxQi(state.player), state.qi + MERIT_UPGRADES.qiRestore.effect.qiRestore);
  ```
  `meritshop.js` itself never touches `state.qi` (it only knows `player`, not the wider `state`) —
  same division of labor as every other self-contained module's game.js wrapper (e.g. `ascend()`
  wrapping `performAscension()`).

---

## 4. Auction House dual-currency

### 4.1 Listing shape gains a `currency` field

```js
// both NPC listings (market.js:77-84) and player listings (market.js:188-198) gain:
currency: 'stones' | 'merit', // default 'stones' when absent (old saves, back-compat)
```

### 4.2 `marketValue` gains an optional currency param

**Note:** `MARKET_PREMIUM` also needs two new keys (`superElite`, `titan`) once CombatWorld's new
rarities land, or those listings silently fall back to a generic 2× premium — full fix and rationale
in §7.3, called out there since it surfaced while reconciling with CombatWorld's doc, not here.

```js
const MERIT_EXCHANGE_RATE = 40; // 1 Merit ~ 40 stones-equivalent of value, tunable

export function marketValue(item, currency = 'stones') {
  const stoneValue = Math.max(1, Math.round(sellValue(item) * (MARKET_PREMIUM[item.rarity] ?? 2)));
  return currency === 'merit' ? Math.max(1, Math.round(stoneValue / MERIT_EXCHANGE_RATE)) : stoneValue;
}
```

### 4.3 NPC listing generation rolls a currency

`makeNpcListing()` (market.js:67-84) gains a small chance to roll a Merit-priced listing instead of
stones — and when it does, draws from a slightly better rarity band (up to Epic, still never past
what NPC listings already reach at Rare+small-Epic-taste, capped below hand-authored Legendary/Mythic
per the existing Epic+-is-hand-authored rule) so a Merit listing feels like a genuine premium-lane
option, mirroring FS's real "gold or FSP" auctions:

```js
const NPC_MERIT_LISTING_CHANCE = 0.08; // ~1 in 12 NPC listings prices in Merit instead of stones
const NPC_MERIT_RARITY_WEIGHTS = [['uncommon', 40], ['rare', 40], ['epic', 20]]; // richer than the stones lane

function makeNpcListing(market, rng, now) {
  const isMerit = rng() < NPC_MERIT_LISTING_CHANCE;
  const rarity = isMerit ? rollWeighted(NPC_MERIT_RARITY_WEIGHTS, rng) : rollNpcRarity(rng);
  // ...unchanged item generation...
  const currency = isMerit ? 'merit' : 'stones';
  const noise = 0.6 + rng() * 0.9;
  const price = Math.max(1, Math.round(marketValue(item, currency) * noise));
  return { /* ...existing fields..., */ currency };
}
```

### 4.4 Player listings: choose a currency; a new stall cap gives it teeth

```js
// listItem gains an optional currency param — additive, defaults preserve old callers
export function listItem(state, itemId, price, currency = 'stones', now = Date.now()) { /* ... */ }
```

**New constraint, flagged explicitly:** `market.js` currently caps nothing on `playerListings.length`
— unlimited concurrent listings today. For "Auction Stall Expansion" (§3.2) to be a real upgrade
rather than a purchase with no effect, a base cap must exist to raise:

```js
export const MAX_PLAYER_LISTINGS = 3; // base; Hall of Merit's marketSlots raises it (effectiveMaxPlayerListings)
export function effectiveMaxPlayerListings(player) {
  return MAX_PLAYER_LISTINGS + (player.meritShop?.purchases?.marketSlots ?? 0);
}
// listItem() gains a check: if (state.market.playerListings.length >= effectiveMaxPlayerListings(state.player))
//   return { ok: false, reason: 'You have too many active listings — collect or wait for one to resolve.' };
```

A generous default (3 concurrent) means normal single-item selling is unaffected; the cap only bites
a player actively flooding the Pavilion, which is exactly the behavior worth gating (this is a new,
mild restriction being *added* for the upgrade's sake — flagging for the lead/Critic rather than
burying it, per Critic4's ask for honesty about new constraints).

### 4.5 `buyNow` and mailbox payout check/credit the right balance

```js
function buyNow(state, listingId, now) {
  // ...
  const wallet = listing.currency === 'merit' ? 'merit' : 'spiritStones';
  if (p[wallet] < listing.price) return { ok: false, reason: `Not enough ${wallet === 'merit' ? 'Merit' : 'spirit stones'}.` };
  p[wallet] -= listing.price;
  // ...unchanged item-delivery logic...
}
```

Mailbox `'sale'` entries (market.js:118-126, `resolvePlayerListings`) gain the same `currency` field
so `collectMailbox()` credits `p.merit` instead of `p.spiritStones` when a Merit-priced player
listing sells — this is the recurring Merit faucet named in §1.4: a player who loots a good Epic/
Legendary drop can choose to monetize it into Merit instead of stones.

### 4.6 `MarketProvider` interface — provider-safe extension

```js
export function createMarketProvider(state) {
  state.market = normalize(state.market);
  return {
    getListings: (filters) => browse(state.market, filters), // filters.currency is a new optional key, additive
    buyNow: (listingId, now = Date.now()) => buyNow(state, listingId, now), // unchanged signature
    listItem: (itemId, price, currency = 'stones', now = Date.now()) => listItem(state, itemId, price, currency, now),
    cancelListing: (listingId) => cancelListing(state, listingId),
    getPlayerListings: () => state.market.playerListings,
    getMailbox: () => state.market.mailbox,
    collectMailbox: () => collectMailbox(state),
    tick: (now = Date.now()) => tick(state, now),
  };
}
```

Only `listItem`'s signature grows (one new optional param, inserted before the existing trailing
`now` param — every existing caller that doesn't pass `currency` still works, since JS optional
params default correctly whether or not a caller supplies `now`... **flag:** actually inserting a
new required-position param before an existing optional trailing one breaks positional callers that
DO pass `now` explicitly. The exact-safe fix: keep `now` last, so the call becomes
`listItem(itemId, price, currency, now)` and any caller passing `(itemId, price, now)` today would
now bind its `now` argument to `currency` — **`js/game.js`'s `marketList(state, itemId, price)`
wrapper (line 826-828) is the only other caller and does not pass `now` today, so this is safe in
practice, but whoever implements this must grep every `listItem(`/`marketList(` call site before
landing, not just trust this doc.** `game.js`'s thin wrapper also grows one param:
```js
export function marketList(state, itemId, price, currency = 'stones') {
  const res = state.marketProvider.listItem(itemId, price, currency);
  // ...unchanged...
}
```
No method is removed or renamed — a future `NetworkMarketProvider` implements the identical extended
shape, so 2.0 provider-safety holds.

### 4.7 Save shape

`state.market.listings[]` and `state.market.playerListings[]` each gain one field (`currency`).
Both arrays already round-trip opaquely through `saveGame`/`loadGame` (`market.js`'s own `normalize()`
back-fills structural gaps on load) — no `save.js` edit, no VERSION bump. Old saved listings simply
lack `currency`; every read site should treat `listing.currency ?? 'stones'` as the default (matches
the project's existing back-fill convention, e.g. `lastStoneTick`'s "may be undefined on pre-card
saves" handling in `save.js`).

---

## 5. Data-model summary (all additive, no VERSION bump)

| Field | Location | Shape | Default |
|---|---|---|---|
| `merit` | `player` | integer | `0` |
| `meritShop` | `player` | `{ purchases: {[id]: count}, daoHeart: id\|null, daoHeartSwitches: int }` | `{ purchases: {}, daoHeart: null, daoHeartSwitches: 0 }` |
| `meritBuffs` | `player` | `[{ id, expiresAt }]` | `[]` |
| `currency` | each `market.listings[]` / `market.playerListings[]` entry | `'stones' \| 'merit'` | `'stones'` (via `?? 'stones'` read) |

---

## 6. Real-money flag (repeated for visibility — see §2 for detail)

**Not built this pass.** Merit is earnable + tradeable entirely in-game (§1.3, §4) so the offline-
complete pillar holds. Any future cash on-ramp is the author's decision, drops in behind a
`purchaseMerit(amount)` stub with zero change to the earn/spend/save shape above, and should follow
Eldevin's "paid buys convenience, never power" precedent if it happens (research-flagged HIGH
relevance) — every catalog row in §3 is already shaped to honor that stance today.

---

## 7. Cross-talk (coordination — messaged to each owner on completion)

### 7.1 Architect-Cull — which culled systems fold into the Hall of Merit (CONFIRMED, per their message)
Architect-Cull's cull ledger (`10-cull-ia-feel.md`) routes the following into this shop; responses
below, row-by-row:
- **Respec** — built as three unconditional rows, `statRespec`/`meridianRespec`/`techniqueRespec`,
  §3.2, cost scaling with invested points (`baseCost + costScalesWithPointsSpent * pointsSpent`),
  matching the comparison-doc's ADOPT framing ("costed respec"). Payment gatekeeping is mine; the
  actual point-refund fns (`respecStats()`/`resetMeridians()`/`resetTechniques()`) are Progression's
  — final shape converged over three rounds with Critic4/Progression, full history in §7.2.
- **Inventory-slot expansion** — `packSlots` row, §3.2/§3.6. `INVENTORY_SIZE` stays the base
  constant; `effectiveInventorySize(player)` is the new lever.
- **Stamina/max-Qi upgrades, AND Alchemy's Qi-restore** (Alchemy.js is being CUT entirely per
  Architect-Cull) — three separate rows cover this: `qiCap` (permanent max-Qi capacity), `qiRegenPct`
  (permanent regen-speed, capped at -30% so the Qi gate survives), and `qiRestore` (the *instant*
  one-shot refill, explicitly named as Alchemy's old role moving here, §3.2/§3.6). Alchemy's TIMED
  combat pill-buffs (distinct from the instant Qi-restore) were the other open thread — Progression
  confirmed those cut outright (a verified strict subset of their 4 active abilities), resolving that
  question without a shop row needed.
- **Ruling on Alchemy's `xp_pill` ("Enlightenment Pill," instant flat `xpPerLevel: 80` grant) — no
  successor row, by deliberate choice, not oversight.** Architect-Cull flagged this as the one
  remaining unclaimed thread: my `xpBoost`/"Insight Charm" row is a *timed %* buff, not a match for
  an *instant flat* XP grant, so it isn't an automatic successor. Agreeing with Architect-Cull's own
  lean: **don't add an instant-XP row.** A direct "spend Merit, get levels" purchase reads as buying
  power/progress directly, not convenience — sharper pay-to-win optics than a %-buff that still
  requires playing to cash in, and it cuts against this doc's own §2 commitment to Eldevin's "paid
  buys convenience/cosmetic, never power" stance (the same stance every other row in this catalog is
  already shaped to honor). `xpBoost` already covers "spend Merit to level faster" within that
  stance; the flat-grant shape simply doesn't get a replacement. This closes the last open thread
  across all four proposal docs, per Architect-Cull's own read.
- **Loadout slots** — confirmed: `loadoutSlots` row (§3.2/§3.6) raises `effectiveMaxLoadouts()`
  regardless of whether the Combat Sets panel lives under its own button or is folded into the
  Equipment tab per Architect-Cull's IA move — the data functions in `loadouts.js` are unchanged
  either way, only their DOM host moves (Architect-Cull's territory, not mine).
- **XP protection** — confirmed, new `xpProtection` row (§3.2/§3.6), multiplies `DEATH_XP_LOSS`
  down to zero at 4 purchases. This is a brand-new upgrade (nothing existed to absorb — FS had it,
  we didn't), so it's ledgered as ADD, not MERGE (§8).
- **Salvage payout currency (Architect-Cull's question to me):** recommending **gold** (spirit
  stones), not Merit. Salvage is a high-frequency, low-value-per-action sink/convenience loop
  (breaking down unwanted drops during routine play) — paying it in Merit would flood the premium
  currency and undercut the scarcity §1.3 depends on to make the Hall of Merit's costs feel real.
  Gold keeps salvage's role exactly what it is today (an interim repair-cost sink) while Merit stays
  reserved for marquee-kill/achievement/AH sources. If `player.materials` (the bespoke essence
  currency) is cut, salvage's payout becomes a flat `spiritStones` grant sized off the same
  `RARITIES`/`repairCost` numbers salvage already reads — a `salvage.js`/`items.js` change, not mine
  to spec further here.
- **`ascension.js`** keeps its own button/modal (a prestige *reset* is mechanically unlike anything
  in this storefront) — not proposed for folding into the Hall of Merit, and Architect-Cull's message
  didn't ask for it either; noting explicitly since Critic4 raised it as an open question.

### 7.2 Author-Progression — Qi economy, respec, and the Ascetic path (RESOLVED, three rounds)

This took three passes to converge, worth recording so the build wave doesn't reopen it:
1. My first draft invented `meridianRespec`/`techniqueRespec` rows costed via
   `meridianPointsSpent(player)`/`techniquePointsSpent(player)` — the second function didn't exist
   anywhere. Critic4 caught it.
2. My fix over-corrected to Progression's *conditional* §4 pool-merge shape (`statRespec` +
   conditional `skillTreeRespec` calling `respecSkillTree()`), which Progression then demoted to
   deferred/non-blocking on their own initiative — they'd seen my shop was built assuming separate
   pools and converged back to that instead of asking me to re-plumb around their merge.
3. **Final, confirmed shape (`30-progression-skills.md` §1.2/§2.5/§3.4) — three independent,
   unconditional respec rows, matching §3.2's catalog exactly:**

   | Row | Calls | Costed via | Source file |
   |---|---|---|---|
   | `statRespec` | `respecStats(player)` | `statPointsSpent(player)` (new) | `js/progression.js` |
   | `meridianRespec` | `resetMeridians(player)` (new) | `meridianPointsSpent(player)` (already existed) | `js/meridians.js` |
   | `techniqueRespec` | `resetTechniques(player)` (new) | `techniquePointsSpent(player)` (new) | `js/techniques.js` |

   All three refund fully and return `{ ok: true, refunded }`; `meritshop.js` imports all three cost
   getters directly (§3.2's `RESPEC_COST_FNS` map) and, on purchase, returns `needsRespec: u.respecFn`
   for the `game.js` wrapper to invoke the matching reset function after payment clears — payment/
   gating stays entirely in my file, the point-refund mechanic stays entirely in Progression's three
   files, per the brief's own hand-off note ("respec likely lives in the premium shop").
- **The Dao Heart's "Path of the Ascetic" (`qiCostPct: -0.10`, §3.4) — confirmed mechanism:**
  `techniques.js`'s `canCast`/`cast` gain an optional `costMultiplier` param (default 1, no behavior
  change for existing callers); `game.js:castTechnique` (the existing wrapper) computes
  `1 + daoHeartBonuses(state.player).qiCostPct` and passes it through when it calls `cast()`. Neither
  `meritshop.js` nor `techniques.js` imports the other — `game.js` is the meeting point, same pattern
  it already uses for `applyPillBuffs`.
- **`maxQi()`/`tickQi()` — confirmed no collision.** Progression added no new Qi-cap or regen-rate
  source (they explicitly deferred a Qi-regen meridian node in their §2.2 specifically to avoid
  this); only my `meritShopBonuses().qiCap`/`qiRegenPct` and their `QI_REGEN_MS` constant retune
  (prototype-fast ~1200/hr → tuned 75/hr) touch those two functions. Still serializing the `game.js`
  edits per CLAUDE.md's single-owner-file rule — independent changes to the same file still need to
  land one PR at a time, not concurrently.

### 7.3 Author-CombatWorld — drop economy + Merit award hook (RESOLVED)

- **`monster.tier` — confirmed, no rewrite needed.** Critic4's second pass flagged that CombatWorld's
  final doc supposedly used only three boolean flags (`isLegendary`/`isSuperElite`/`isTitan`) with no
  `monster.tier` string — I checked `40-combat-world.md` directly before changing anything: it in
  fact defines **both**, explicitly "resolving the Author-Economy/Critic4 cross-doc flag" in its own
  opening callout — every rare-spawn Actor gets the boolean flags (what CombatWorld's own `attack()`
  branches on) AND `actor.tier = 'legendary' | 'superElite' | 'titan'` set alongside them in the same
  `spawnCreature`/`spawnTitanActor` code, specifically so an external consumer like this Merit hook
  can do one `monster.tier === 'superElite'` check instead of three boolean lookups. My original
  §1.3 hook design was already correct; CombatWorld independently confirmed the same via direct
  message. (Told Critic4 directly rather than silently "fixing" something that wasn't broken.)
- Titan Merit award (+20, one-time per Titan kill) fires once, in `game.js attack()`'s shared win
  branch (the `if (monster.isBoss) {...} else if (monster.isTitan) {...} else {...}` block, per
  CombatWorld's confirmation) — that branch only executes on the encounter where the Titan's world-HP
  pool actually depletes (`titans.js` itself never grants rewards), so "+20 Merit, one-time, after
  the sequence resolves" falls out automatically from hooking there rather than inside `titans.js`.
- **Item values — confirmed generic, EXCEPT one real gap I found on inspection.** `sellValue()`
  (`items.js`) is a fully generic `RARITIES[item.rarity].sellMult` lookup — CombatWorld's new
  `superElite`/`titan` `RARITIES` entries (their placeholder `sellMult: 130`/`140`) flow through with
  zero changes needed. **But `market.js`'s `MARKET_PREMIUM` (§4.2 of this doc) is a hardcoded
  object keyed by rarity name** (`common` through `mythic`) **with a `?? 2` fallback for anything
  not listed** — `superElite`/`titan` listings would silently price at a generic 2× premium instead
  of a rarity-appropriate one unless I add explicit entries. Fixing this myself (my file, my gap to
  close, not CombatWorld's):
  ```js
  // js/market.js — MARKET_PREMIUM, add the two new rarities (placeholder multiples,
  // bracketed between legendary/mythic like CombatWorld's own placeholder sellMults)
  const MARKET_PREMIUM = {
    common: 1.6, uncommon: 1.9, rare: 2.4, epic: 3.0,
    legendary: 3.6, superElite: 3.8, titan: 3.5, mythic: 4.2,
  };
  ```
  Titan sits slightly below Super Elite/Legendary since it's explicitly non-Set (per CombatWorld's
  rules) even though it always carries a Qi-regen stat — a judgment call, tunable like every other
  premium multiple here.

---

## 8. CUT vs KEEP vs MERGE vs ADD

- **ADD:** Merit currency (`player.merit`, `js/merit.js`); the Hall of Merit shop (`js/meritshop.js`,
  `css/meritshop.css`) with its thirteen rows (twelve catalog rows + the Dao Heart); dual-currency
  Auction House listings (`market.js` extension, `MAX_PLAYER_LISTINGS`, the two new `MARKET_PREMIUM`
  keys for `superElite`/`titan`); the `xpProtection` row (a genuinely new upgrade — FS had it, we
  never did); the `qiRestore` instant row (new *as a shop purchase*, though see MERGE below for what
  it replaces); the `effectiveInventorySize`/`effectiveMaxLoadouts`/`effectiveQiRegenMs` helper
  functions.
- **KEEP (unchanged this pass):** spirit stones as the primary gold currency and every stones-priced
  system that isn't explicitly called out below (Forge reforge/temper/repair, Sect hiring); Salvage
  stays (paying gold, not Merit — recommendation in §7.1); `ascension.js`'s own UI (§7.1); the
  `MarketProvider` interface's existing five methods (only `listItem` grows one param).
- **MERGE (confirmed absorption into the Hall of Merit, per Architect-Cull's cull ledger — modules
  themselves are not removed by Economy, only the specific mechanic named moves into a shop row):**
  the inventory-slot cap (`items.js` `INVENTORY_SIZE` → `packSlots` row), the loadout-slot cap
  (`loadouts.js` `MAX_LOADOUTS` → `loadoutSlots` row), Qi capacity/regen (`qiCap`/`qiRegenPct` rows),
  costed respec (three unconditional rows — `statRespec`/`meridianRespec`/`techniqueRespec` — calling
  Progression's confirmed `respecStats()`/`resetMeridians()`/`resetTechniques()`, final shape after
  three rounds of cross-doc correction, §7.2 — didn't exist as a feature before; MERGE in the sense of
  absorbing the comparison-doc's ADOPT recommendation into this shop rather than a standalone respec
  UI), and **Alchemy's instant Qi-restore effect** (→ `qiRestore` row; Alchemy.js itself is CUT by
  Architect-Cull, not by this doc).
- **CUT:** none directly by Economy — `js/alchemy.js` is CUT by Architect-Cull's ledger, not mine;
  my only stake is absorbing its Qi-restore effect (above) and flagging its separate timed
  combat-pill-buffs mechanic as an open gap between docs (§7.1) rather than silently dropping it.

---

## 9. Open items for the lead

1. Confirm the Dao Heart (§3.4) clears the T2/Idle-Slayer bar, or explicitly downgrade the framing
   to "this is a convenience queue, not a choice system" if the lead judges one exclusive 3-way pick
   too thin to earn "real choice" status.
2. `js/merit.js`'s `MERIT_REWARDS` amounts and `js/meritshop.js`'s `MERIT_UPGRADES` costs are starting
   points, not final-tuned — needs a `tools/balance.mjs` "Merit economy" row-group at build time
   (§3.5), tuned against Progression's confirmed 75 Qi/hr baseline, not today's prototype-fast rate.
3. **All cross-author coordination is resolved as of this revision** (§7.1 Architect-Cull, §7.2
   Progression — three rounds to converge on the final three-row respec shape, §7.3 CombatWorld —
   confirmed `monster.tier` + a real `MARKET_PREMIUM` gap I found and fixed myself). No blocking
   sign-offs remain; the function names/signatures in §3.2/§3.4/§7.2/§7.3 are the frozen contract
   this doc builds against.
4. `js/game.js`'s `maxQi()`/`tickQi()` are touched by this doc AND by Progression's `QI_REGEN_MS`
   retune — confirmed no naming/semantic collision (cap vs. rate are independent levers), but per
   CLAUDE.md's single-owner-file rule these edits must still serialize (one PR at a time).
