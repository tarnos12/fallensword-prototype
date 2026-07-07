// Hunt bounties — a bounty board of "slay N of creature X" objectives for bonus
// spirit-stone + XP rewards (a FallenSword-style hunt loop). The board of
// *offered* bounties rotates on a wall-clock timer (the same deterministic
// time-bucket pattern the Treasure Pavilion and the Recently-Active feed use, so
// it costs nothing to persist and drifts like a live board). Accepting a bounty
// snapshots your current kill count for that creature; progress is then just
// `bestiary[typeId].kills − snapshot`, read live off the data the codex already
// tracks — so bounties need NO hook in the combat/kill path, only a read.
//
// Like market.js / guild.js this lives behind a provider interface
// (createBountyProvider) so a 2.0 network layer could serve real, shared
// bounties. It owns its own rendering (initBounties/renderBounties) rather than
// routing through ui.js, to stay clear of other parallel sessions' shared edits.
//
// Accepted bounties persist on the additive `player.bounties` field (it
// round-trips through the existing save — the whole player object is
// serialized — and is lazily back-filled here for saves that predate it, so no
// save VERSION bump). Accepted bounties do NOT expire when the board rotates:
// you keep working a hunt you took until you claim it.

import { CREATURE_TYPES } from './actors.js';
import { mulberry32 } from './rng.js';

const BOARD_MS = 15 * 60 * 1000; // offered-board rotation cadence
const OFFER_COUNT = 4;           // bounties shown on the board per rotation
const ACTIVE_CAP = 3;            // how many bounties you can have accepted at once
const TARGET_CHOICES = [4, 5, 6, 8]; // how many kills a bounty asks for
const STONE_FACTOR = 0.8;        // reward stones ≈ target × per-kill stones × this
const XP_FACTOR = 0.6;           // reward xp     ≈ target × per-kill xp     × this

// The farmable creatures a bounty can target (every codex creature except the
// boss, which is a scheduled solo encounter, not a huntable population).
const HUNTABLE = Object.values(CREATURE_TYPES);

function creatureLevel(t) {
  return t.levels?.[0] ?? 1;
}

function bountyReward(t, target) {
  return {
    stones: Math.max(1, Math.round(target * t.stones * STONE_FACTOR)),
    xp: Math.max(1, Math.round(target * t.xp * XP_FACTOR)),
  };
}

// --- persistence ---------------------------------------------------------

function bountyList(player) {
  if (!Array.isArray(player.bounties)) player.bounties = [];
  return player.bounties;
}

function killsOf(player, typeId) {
  return player.bestiary?.[typeId]?.kills ?? 0;
}

// --- offered board (deterministic per time bucket) -----------------------

function currentBucket(now) {
  return Math.floor(now / BOARD_MS);
}

// The board favours creatures near the player's level so a hunt is farmable,
// but always fills OFFER_COUNT slots (falling back to the full roster).
function offeredBounties(player, now) {
  const bucket = currentBucket(now);
  const rng = mulberry32((bucket ^ 0x1f83d9ab) >>> 0);
  const lvl = player.level ?? 1;
  const ranked = HUNTABLE
    .map((t) => ({ t, w: rng() + 2 / (1 + Math.abs(creatureLevel(t) - lvl)) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, OFFER_COUNT)
    .map((x) => x.t);
  return ranked.map((t) => {
    // A stable-within-bucket target per creature.
    const r = mulberry32(((bucket * 2654435761) ^ hashId(t.id)) >>> 0);
    const target = TARGET_CHOICES[Math.floor(r() * TARGET_CHOICES.length)];
    return {
      id: `b-${bucket}-${t.id}`,
      bucket,
      typeId: t.id,
      name: t.name,
      level: creatureLevel(t),
      target,
      reward: bountyReward(t, target),
    };
  });
}

function hashId(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// --- accepted-bounty views ----------------------------------------------

function acceptedView(player, entry) {
  const t = CREATURE_TYPES[entry.typeId];
  const progress = Math.max(0, killsOf(player, entry.typeId) - entry.killSnapshot);
  const done = progress >= entry.target;
  return {
    id: entry.id,
    typeId: entry.typeId,
    name: t?.name ?? entry.typeId,
    target: entry.target,
    progress: Math.min(progress, entry.target),
    complete: done,
    claimed: !!entry.claimed,
    reward: entry.reward,
  };
}

function hasActiveFor(player, typeId) {
  return bountyList(player).some((b) => b.typeId === typeId && !b.claimed);
}

function activeCount(player) {
  return bountyList(player).filter((b) => !b.claimed).length;
}

// --- accept / claim (mutate player.bounties; caller logs + saves) ---------

function accept(state, bountyId, now) {
  const player = state.player;
  const offer = offeredBounties(player, now).find((b) => b.id === bountyId);
  if (!offer) return { ok: false, reason: 'That bounty is no longer on the board.' };
  if (bountyList(player).some((b) => b.id === offer.id)) return { ok: false, reason: 'You already took that bounty.' };
  if (hasActiveFor(player, offer.typeId)) return { ok: false, reason: 'You already have an active bounty for that beast.' };
  if (activeCount(player) >= ACTIVE_CAP) return { ok: false, reason: `You can track at most ${ACTIVE_CAP} bounties at once.` };
  bountyList(player).push({
    id: offer.id,
    typeId: offer.typeId,
    target: offer.target,
    reward: offer.reward,
    killSnapshot: killsOf(player, offer.typeId),
    acceptedAt: now,
    claimed: false,
  });
  return { ok: true, bounty: offer };
}

function claim(state, bountyId) {
  const player = state.player;
  const entry = bountyList(player).find((b) => b.id === bountyId);
  if (!entry) return { ok: false, reason: 'No such bounty.' };
  if (entry.claimed) return { ok: false, reason: 'Already claimed.' };
  const progress = killsOf(player, entry.typeId) - entry.killSnapshot;
  if (progress < entry.target) return { ok: false, reason: 'Bounty not complete yet.' };
  entry.claimed = true;
  // Drop the claimed record so the board stays tidy; the reward is applied by
  // the game-layer wrapper (which owns XP/stone granting + breakthroughs).
  player.bounties = bountyList(player).filter((b) => b.id !== bountyId);
  const t = CREATURE_TYPES[entry.typeId];
  return { ok: true, reward: entry.reward, name: t?.name ?? entry.typeId, target: entry.target };
}

// The BountyProvider interface. NPC/local-backed today; a 2.0 impl fills the
// same shape from a shared server board.
export function createBountyProvider(state) {
  return {
    offered: (now = Date.now()) => {
      const player = state.player;
      // Hide offers you've already accepted (they move to the active list).
      const takenIds = new Set(bountyList(player).map((b) => b.id));
      return offeredBounties(player, now)
        .filter((o) => !takenIds.has(o.id))
        .map((o) => ({ ...o, canAccept: !hasActiveFor(player, o.typeId) && activeCount(player) < ACTIVE_CAP }));
    },
    active: () => bountyList(state.player).filter((b) => !b.claimed).map((b) => acceptedView(state.player, b)),
    activeCap: ACTIVE_CAP,
    accept: (id, now = Date.now()) => accept(state, id, now),
    claim: (id) => claim(state, id),
    claimableCount: () => bountyList(state.player).filter((b) => !b.claimed && (killsOf(state.player, b.typeId) - b.killSnapshot) >= b.target).length,
  };
}

// =====================================================================
// Rendering — owned here (not ui.js) to stay out of parallel shared-file edits.
// =====================================================================

let provider = null;
let actions = null;

const $ = (id) => document.getElementById(id);

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function bountyRow({ title, sub, chip, btnLabel, btnCls, onClick, disabled, disabledTitle }) {
  const row = el('div', 'bounty-row');
  const info = el('div', 'bounty-info');
  info.appendChild(el('span', 'bounty-name', title));
  if (sub) info.appendChild(el('span', 'bounty-sub dim', sub));
  row.appendChild(info);
  if (chip) row.appendChild(el('span', 'bounty-reward-chip', chip));
  if (btnLabel) {
    const btn = el('button', btnCls, btnLabel);
    if (disabled) { btn.disabled = true; if (disabledTitle) btn.title = disabledTitle; }
    else btn.addEventListener('click', onClick);
    row.appendChild(btn);
  }
  return row;
}

export function renderBounties(state, now = Date.now()) {
  if (!provider) provider = createBountyProvider(state);
  const body = $('bounty-body');
  if (!body) return;
  body.innerHTML = '';

  const active = provider.active();
  const offered = provider.offered(now);

  const activeHead = el('h3', null, `Active Hunts <span class="dim">— ${active.length}/${provider.activeCap}</span>`);
  body.appendChild(activeHead);
  if (active.length === 0) {
    body.appendChild(el('p', 'empty-note', 'No hunts accepted. Take one from the board below.'));
  } else {
    for (const b of active) {
      body.appendChild(bountyRow({
        title: b.name,
        sub: `Slain ${b.progress}/${b.target}`,
        chip: `+${b.reward.stones} ◆ · +${b.reward.xp} XP`,
        btnLabel: b.complete ? 'Claim' : `${b.progress}/${b.target}`,
        btnCls: b.complete ? 'claim-btn' : 'bounty-progress-btn',
        disabled: !b.complete,
        disabledTitle: b.complete ? '' : 'Keep hunting to complete this bounty.',
        onClick: () => { actions.claim(b.id); },
      }));
    }
  }

  const offerHead = el('h3', null, 'Bounty Board');
  body.appendChild(offerHead);
  const full = active.length >= provider.activeCap;
  if (offered.length === 0) {
    body.appendChild(el('p', 'empty-note', 'The board is empty — check back after it refreshes.'));
  }
  for (const o of offered) {
    const blocked = !o.canAccept;
    body.appendChild(bountyRow({
      title: `${o.name} <span class="dim">Lv ${o.level}</span>`,
      sub: `Slay ${o.target}`,
      chip: `+${o.reward.stones} ◆ · +${o.reward.xp} XP`,
      btnLabel: 'Accept',
      btnCls: 'accept-btn',
      disabled: blocked,
      disabledTitle: full ? 'You are tracking the maximum number of bounties.' : 'You already have an active bounty for this beast.',
      onClick: () => { actions.accept(o.id); },
    }));
  }
}

// A small badge on the button showing how many active bounties are claimable.
export function updateBountyBadge(state) {
  if (!provider) provider = createBountyProvider(state);
  const badge = $('bounty-claim-count');
  if (!badge) return;
  const n = provider.claimableCount();
  if (n > 0) { badge.textContent = String(n); badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

export function initBounties(state, acts) {
  provider = createBountyProvider(state);
  actions = acts;
  const overlay = $('bounty-overlay');
  $('btn-bounties').addEventListener('click', () => {
    renderBounties(state);
    overlay.classList.remove('hidden');
  });
  $('btn-close-bounties').addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
  updateBountyBadge(state);
}
