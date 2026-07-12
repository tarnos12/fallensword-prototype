// Treasure Pavilion — fake-multiplayer auction house (GDD §6.7). A persistent
// pool of NPC personas post rotating Buy-Now listings pulled from the same loot
// tables as monster drops, with deliberate price variance so some are bargains
// and some are rip-offs. The player can list their own gear into the economy;
// a fake buyer resolves the sale asynchronously, and proceeds land in a mailbox
// (the check-back-in pacing device). Everything lives behind a MarketProvider
// interface — getListings / buyNow / listItem / collectMailbox (+ tick) — so a
// future 2.0 NetworkMarketProvider can implement the same shape against a real
// backend with real player listings, and neither the UI nor the player's mental
// model changes (GDD §4.3, §6.7.7).

import { generateItem, sellValue, INVENTORY_SIZE } from './items.js';
import { personaById, personaForLevel, randomPersona } from './personas.js';
import { awardMerit, spendMerit } from './merit.js';

// --- Tuning. Prototype-fast so a demo session actually sees listings rotate and
// player sales resolve; 1.0 lengthens these the way MAX_QI/QI_REGEN_MS will.
export const LISTING_TTL_MS = 20 * 60 * 1000; // an NPC listing lives 20 min then expires
const REFRESH_INTERVAL_MS = 3 * 60 * 1000; // top the shelf back up every ~3 min
const TARGET_LISTINGS = 12; // how many NPC listings to keep available
const MIN_LISTINGS = 6; // refill early if stock drops below this
export const PLAYER_LISTING_TTL_MS = 30 * 60 * 1000; // unsold player listing returns after 30 min
const PLAYER_SALE_MIN_MS = 25 * 1000; // fastest a competitive listing sells
const PLAYER_SALE_MAX_MS = 6 * 60 * 1000; // slowest a (sellable) listing sells

// NPC listings never exceed Rare — Epic+ stays hand-authored (GDD §6.1); the
// Pavilion is a variance/convenience source, not a power spike past farming.
// A small slice instead rolls Merit-priced and reaches a richer band (up to
// Epic) — doc 20 §4.3, FS's "gold or FSP" auction pattern.
const NPC_RARITY_WEIGHTS = [['common', 55], ['uncommon', 33], ['rare', 12]];
const NPC_MERIT_LISTING_CHANCE = 0.08; // ~1 in 12 NPC listings prices in Merit instead of stones
const NPC_MERIT_RARITY_WEIGHTS = [['uncommon', 40], ['rare', 40], ['epic', 20]];

// Base concurrent player-listing cap — a generous default so normal selling is
// unaffected; Hall of Merit's "Auction Stall Expansion" raises it (doc 20 §4.4).
export const MAX_PLAYER_LISTINGS = 3;
export function effectiveMaxPlayerListings(player) {
  return MAX_PLAYER_LISTINGS + (player.meritShop?.purchases?.marketSlots ?? 0);
}

// AH value is a premium over the vendor sell floor — players pay more than a
// vendor gives, and rarer gear commands a steeper multiple. superElite/titan
// entries are CombatWorld's new rarity tiers (doc 20 §7.3) — without these,
// those listings would silently fall back to a generic 2x premium.
const MARKET_PREMIUM = {
  common: 1.6, uncommon: 1.9, rare: 2.4, epic: 3.0,
  legendary: 3.6, superElite: 3.8, titan: 3.5, mythic: 4.2,
};

// 1 Merit is worth roughly this many stones of value — tunable like every
// other economy constant (doc 20 §4.2).
const MERIT_EXCHANGE_RATE = 40;

// The "fair value" a listing prices around before noise is applied. Pass
// currency: 'merit' to get the Merit-denominated price instead of stones.
export function marketValue(item, currency = 'stones') {
  const stoneValue = Math.max(1, Math.round(sellValue(item) * (MARKET_PREMIUM[item.rarity] ?? 2)));
  return currency === 'merit' ? Math.max(1, Math.round(stoneValue / MERIT_EXCHANGE_RATE)) : stoneValue;
}

function rollWeighted(weights, rng) {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [key, w] of weights) {
    roll -= w;
    if (roll <= 0) return key;
  }
  return weights[weights.length - 1][0];
}

function nextSeq(market) {
  market.seq = (market.seq ?? 0) + 1;
  return market.seq;
}

export function emptyMarket() {
  return { listings: [], playerListings: [], mailbox: [], lastRefresh: 0, seq: 0 };
}

// Back-fill any missing fields on a loaded/legacy market blob.
function normalize(market) {
  const m = market ?? emptyMarket();
  m.listings ??= [];
  m.playerListings ??= [];
  m.mailbox ??= [];
  m.lastRefresh ??= 0;
  m.seq ??= 0;
  // Old listings predate the dual-currency field (doc 20 §4.7) — default them
  // to stones rather than leaving `currency` undefined at every read site.
  for (const l of m.listings) l.currency ??= 'stones';
  for (const l of m.playerListings) l.currency ??= 'stones';
  return m;
}

function makeNpcListing(market, rng, now) {
  const slot = rng() < 0.5 ? 'weapon' : 'robe';
  // A small slice of listings price in Merit instead of stones, drawing from a
  // richer rarity band — a genuine premium lane, not just a bigger stones tag
  // (doc 20 §4.3).
  const isMerit = rng() < NPC_MERIT_LISTING_CHANCE;
  const rarity = isMerit ? rollWeighted(NPC_MERIT_RARITY_WEIGHTS, rng) : rollWeighted(NPC_RARITY_WEIGHTS, rng);
  // Level drawn around a plausible seller; pick the seller to match afterward.
  const level = 1 + Math.floor(rng() * 14);
  const item = generateItem(slot, level, rarity, rng);
  const seller = personaForLevel(level, rng);
  const currency = isMerit ? 'merit' : 'stones';
  // Deliberate spread (GDD §6.7.3): 0.6× (steal) to 1.5× (overpriced) of value.
  const noise = 0.6 + rng() * 0.9;
  const price = Math.max(1, Math.round(marketValue(item, currency) * noise));
  return {
    id: `lst-${nextSeq(market)}`,
    item,
    sellerPersonaId: seller.id,
    price,
    currency,
    postedAt: now,
    expiresAt: now + LISTING_TTL_MS,
  };
}

// Expire stale NPC listings and refill toward TARGET on the refresh cadence
// (GDD §6.7.2: listings rotate on a timer, not per-visit). Returns true if the
// shelf changed.
function refreshListings(market, rng, now) {
  const before = market.listings.length;
  market.listings = market.listings.filter((l) => l.expiresAt > now);
  const expired = before !== market.listings.length;

  const due = now - market.lastRefresh >= REFRESH_INTERVAL_MS;
  const low = market.listings.length < MIN_LISTINGS;
  if (due || low || market.lastRefresh === 0) {
    while (market.listings.length < TARGET_LISTINGS) {
      market.listings.push(makeNpcListing(market, rng, now));
    }
    market.lastRefresh = now;
    return true;
  }
  return expired;
}

// Resolve the player's own listings against the fake economy (GDD §6.7.5): a
// listing's fate (sells / doesn't) is decided at list time and stored, so the
// tick is deterministic and just applies outcomes whose time has come. Sold
// proceeds and unsold returns both flow into the mailbox. Returns event lists.
function resolvePlayerListings(market, rng, now) {
  const sales = [];
  const returns = [];
  const remaining = [];
  for (const pl of market.playerListings) {
    if (pl.willSell && now >= pl.sellAt) {
      const buyer = personaById(pl.buyerPersonaId);
      market.mailbox.push({
        id: `mail-${nextSeq(market)}`,
        kind: 'sale',
        stones: pl.price, // kept as the numeric amount field for back-compat readers
        currency: pl.currency ?? 'stones', // doc 20 §4.5 — which wallet collectMailbox() credits
        itemName: pl.item.name,
        rarity: pl.item.rarity,
        buyerName: buyer?.name ?? 'a cultivator',
        at: now,
      });
      sales.push(pl);
      continue;
    }
    if (now >= pl.expiresAt) {
      market.mailbox.push({ id: `mail-${nextSeq(market)}`, kind: 'return', item: pl.item, at: now });
      returns.push(pl);
      continue;
    }
    remaining.push(pl);
  }
  market.playerListings = remaining;
  return { sales, returns };
}

// --- Operations (mutate state.market / state.player; the caller persists) ---

function browse(market, filters = {}) {
  let out = market.listings.slice();
  if (filters.slot && filters.slot !== 'all') out = out.filter((l) => l.item.slot === filters.slot);
  if (filters.rarity && filters.rarity !== 'all') out = out.filter((l) => l.item.rarity === filters.rarity);
  const dir = filters.sort === 'price-desc' ? -1 : 1;
  out.sort((a, b) => (a.price - b.price) * dir);
  return out;
}

function buyNow(state, listingId, now) {
  const m = state.market;
  const idx = m.listings.findIndex((l) => l.id === listingId);
  if (idx === -1) return { ok: false, reason: 'That listing is no longer available.' };
  const listing = m.listings[idx];
  const p = state.player;
  const isMerit = listing.currency === 'merit';
  const balance = isMerit ? (p.merit ?? 0) : p.spiritStones;
  if (balance < listing.price) {
    return { ok: false, reason: isMerit ? 'Not enough Merit.' : 'Not enough spirit stones.' };
  }
  if (isMerit) spendMerit(p, listing.price);
  else p.spiritStones -= listing.price;
  m.listings.splice(idx, 1);
  // Instant delivery to the pack; if it is full, the item waits in the mailbox
  // (GDD §6.7.6 — completed purchases can land in the mailbox).
  if (p.inventory.length < INVENTORY_SIZE) {
    p.inventory.push(listing.item);
    return { ok: true, item: listing.item, toMailbox: false, price: listing.price, currency: listing.currency };
  }
  m.mailbox.push({ id: `mail-${nextSeq(m)}`, kind: 'item', item: listing.item, at: now });
  return { ok: true, item: listing.item, toMailbox: true, price: listing.price, currency: listing.currency };
}

// currency kept as the LAST-but-one param, `now` last (doc 20 §4.6 flag): the
// only other caller today, game.js's `marketList(state, itemId, price)`, never
// passes `now` explicitly, so inserting `currency` before it is safe in
// practice — but re-check every `listItem(`/`marketList(` call site before
// wiring a UI currency selector in, exactly as the doc warns.
function listItem(state, itemId, price, currency = 'stones', now = Date.now()) {
  const p = state.player;
  const cur = currency === 'merit' ? 'merit' : 'stones';
  const idx = p.inventory.findIndex((i) => i.id === itemId);
  if (idx === -1) return { ok: false, reason: 'Item not found in pack.' };
  if (!Number.isFinite(price) || price <= 0) return { ok: false, reason: 'Enter a valid asking price.' };
  if (state.market.playerListings.length >= effectiveMaxPlayerListings(p)) {
    return { ok: false, reason: 'You have too many active listings — collect or wait for one to resolve.' };
  }
  const item = p.inventory[idx];
  p.inventory.splice(idx, 1); // item is held in escrow while listed

  // Competitiveness: how the ask compares to fair value. Undercutting sells
  // faster and more reliably; a greedy ask may never move (GDD §6.7.5).
  const value = marketValue(item, cur);
  const ratio = value / price; // >1 = cheap (below value), <1 = pricey
  const chance = Math.max(0.05, Math.min(0.95, 0.5 * ratio + 0.15));
  const willSell = state.worldRng() < chance;
  const speed = Math.max(0, Math.min(1, ratio)); // more competitive => quicker
  const delay = Math.round(PLAYER_SALE_MIN_MS + (1 - speed) * (PLAYER_SALE_MAX_MS - PLAYER_SALE_MIN_MS));

  const listing = {
    id: `plst-${nextSeq(state.market)}`,
    item,
    price,
    currency: cur,
    value,
    postedAt: now,
    expiresAt: now + PLAYER_LISTING_TTL_MS,
    willSell,
    sellAt: willSell ? now + delay : null,
    buyerPersonaId: willSell ? randomPersona(state.worldRng).id : null,
  };
  state.market.playerListings.push(listing);
  return { ok: true, listing };
}

function cancelListing(state, listingId) {
  const m = state.market;
  const idx = m.playerListings.findIndex((l) => l.id === listingId);
  if (idx === -1) return { ok: false, reason: 'Listing not found.' };
  const p = state.player;
  if (p.inventory.length >= INVENTORY_SIZE) return { ok: false, reason: 'Your pack is full — make room to reclaim it.' };
  const [pl] = m.playerListings.splice(idx, 1);
  p.inventory.push(pl.item);
  return { ok: true, item: pl.item };
}

// Collect mailbox proceeds/items. Stones always collect; items only if the pack
// has room, so a full pack blocks item collection until cleared. Returns a
// summary for logging.
function collectMailbox(state) {
  const m = state.market;
  const p = state.player;
  let stones = 0;
  let merit = 0;
  const items = [];
  const remaining = [];
  for (const entry of m.mailbox) {
    if (entry.kind === 'sale') {
      // doc 20 §4.5 — a Merit-priced player listing credits player.merit
      // instead of spiritStones; the numeric amount still lives on
      // `entry.stones` for back-compat with existing mailbox readers.
      if (entry.currency === 'merit') {
        merit += entry.stones;
        awardMerit(p, entry.stones);
      } else {
        stones += entry.stones;
        p.spiritStones += entry.stones;
      }
      continue;
    }
    // 'item' (purchase overflow) or 'return' (unsold listing)
    if (p.inventory.length < INVENTORY_SIZE) {
      p.inventory.push(entry.item);
      items.push(entry.item);
    } else {
      remaining.push(entry); // no room; leave it in the mailbox
    }
  }
  m.mailbox = remaining;
  return { stones, merit, items, blocked: remaining.length };
}

function tick(state, now) {
  const m = state.market;
  const refreshed = refreshListings(m, state.worldRng, now);
  const { sales, returns } = resolvePlayerListings(m, state.worldRng, now);
  return { refreshed, sales, returns, changed: refreshed || sales.length > 0 || returns.length > 0 };
}

// The MarketProvider interface (GDD §6.7.7). NPC-backed today; a 2.0
// NetworkMarketProvider implements the same methods against a real backend.
export function createMarketProvider(state) {
  state.market = normalize(state.market);
  return {
    getListings: (filters) => browse(state.market, filters),
    buyNow: (listingId, now = Date.now()) => buyNow(state, listingId, now), // unchanged signature
    listItem: (itemId, price, currency = 'stones', now = Date.now()) => listItem(state, itemId, price, currency, now),
    cancelListing: (listingId) => cancelListing(state, listingId),
    getPlayerListings: () => state.market.playerListings,
    getMailbox: () => state.market.mailbox,
    collectMailbox: () => collectMailbox(state),
    tick: (now = Date.now()) => tick(state, now),
  };
}
