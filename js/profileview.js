// Profile page (UI-shell revamp) — a FallenSword-style character profile as a
// first-class in-app view (#view-profile), NOT a modal. Two columns:
//   • Left  — a geometric Profile emblem, a Statistics panel (cultivation +
//              effective combat stats + currencies), and an Enhancements panel
//              (active passive sources: equipped set bonuses + opened meridians).
//   • Right — Inventory (equipped artifacts), Backpack (pack items), and
//              Active Buffs (timed technique buffs with remaining time).
//
// Owns its own rendering (renderProfilePage) rather than routing through ui.js,
// mirroring profile.js — this keeps it out of the other modules' shared-file
// edits. Read-only over game state; every value is derived, nothing mutated.

import { effectiveStats, stageName, realmFor, xpForBreakthrough, MAX_STAGE } from './progression.js';
import { activeTitle } from './titles.js';
import { meridianBonuses, MERIDIAN_NODES } from './meridians.js';
import { SETS, equippedSetCount, setBonusAtCount } from './sets.js';
import { activeBuffs, get as getTech } from './techniques.js';
import { maxQi } from './game.js';
import { isGem, gemIcon } from './sockets.js';

const $ = (id) => document.getElementById(id);

const SLOT_ICONS = { weapon: '⚔️', robe: '👘' };
const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP', maxHp: 'Max HP' };

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function totalKills(p) {
  return Object.values(p.bestiary ?? {}).reduce((s, e) => s + (e.kills || 0), 0);
}

// --- Left column ----------------------------------------------------------

// A tasteful text/geometric portrait (the GDD mandates no sprite art): a
// ☯ medallion ringed by a cinnabar aura, with the cultivator's name + title.
function renderEmblem(player) {
  const box = $('profile-emblem');
  if (!box) return;
  const title = activeTitle(player);
  box.innerHTML = `
    <div class="pv-emblem-frame" title="${title.flavor ? title.flavor.replace(/"/g, '&quot;') : ''}">
      <div class="pv-emblem-aura"></div>
      <div class="pv-emblem-medallion"><span class="pv-emblem-glyph">☯</span></div>
    </div>
    <div class="pv-emblem-name">${player.name}</div>
    <div class="pv-emblem-title">${title.name}</div>`;
}

function statRow(label, value, hint) {
  return `<div class="pv-stat-row"${hint ? ` title="${hint}"` : ''}><span class="pv-stat-label">${label}</span><span class="pv-stat-value">${value}</span></div>`;
}

function renderStatistics(state) {
  const box = $('profile-statistics');
  if (!box) return;
  const p = state.player;
  const eff = effectiveStats(p);
  const need = xpForBreakthrough(p.level);
  const atPeak = p.level >= MAX_STAGE;
  const { realm } = realmFor(p.level);
  const qi = state.qi;
  const qiMax = maxQi(p);

  box.innerHTML = `<h3 class="pv-panel-title">Statistics</h3>
    <div class="pv-stat-list">
      ${statRow('Realm', realm)}
      ${statRow('Stage', stageName(p.level))}
      ${statRow('Level', p.level)}
      ${statRow('Breakthrough', atPeak ? `${p.xp} · peak` : `${p.xp} / ${need}`)}
    </div>
    <div class="pv-stat-list pv-combat">
      ${statRow('Attack', eff.attack, 'Effective attack after gear, meridians, sets, buffs and ascension.')}
      ${statRow('Defense', eff.defense)}
      ${statRow('Damage', eff.damage)}
      ${statRow('Armor', eff.armor)}
      ${statRow('HP', eff.maxHp)}
    </div>
    <div class="pv-stat-list">
      ${statRow('Qi', `${qi} / ${qiMax}`)}
      ${statRow('Spirit Stones', `◆ ${p.spiritStones}`)}
      ${statRow('Merit', `✧ ${p.merit ?? 0}`)}
      ${statRow('Ascension', p.ascension ? `Tier ${p.ascension}` : '—')}
      ${statRow('Total kills', totalKills(p))}
    </div>`;
}

// Enhancements: the player's active passive sources — equipped set bonuses and
// opened meridian ranks — as labelled rows with a progress bar.
function enhanceBar(label, detail, ratio, active) {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return `<div class="pv-enh-row${active ? ' on' : ''}">
      <div class="pv-enh-head"><span class="pv-enh-name">${label}</span><span class="pv-enh-detail dim">${detail}</span></div>
      <div class="pv-enh-track"><div class="pv-enh-fill" style="width:${pct}%"></div></div>
    </div>`;
}

function bonusText(bonus) {
  return Object.entries(bonus)
    .filter(([, v]) => v)
    .map(([s, v]) => `+${v} ${STAT_LABELS[s] ?? s}`)
    .join(', ');
}

function renderEnhancements(player) {
  const box = $('profile-enhancements');
  if (!box) return;
  const rows = [];

  // Equipped set bonuses.
  const seenSets = new Set();
  for (const item of Object.values(player.equipment ?? {})) {
    if (item && item.setId) seenSets.add(item.setId);
  }
  for (const setId of seenSets) {
    const set = SETS[setId];
    if (!set) continue;
    const count = equippedSetCount(player, setId);
    const full = setBonusAtCount(set, set.pieces);
    const complete = count >= set.pieces;
    const detail = complete ? bonusText(full) : `${count}/${set.pieces} pieces`;
    rows.push(enhanceBar(`Set · ${set.name}`, detail, count / set.pieces, complete));
  }

  // Opened meridians (rank > 0).
  const nodes = player.meridians?.nodes ?? {};
  for (const [id, rank] of Object.entries(nodes)) {
    const node = MERIDIAN_NODES[id];
    if (!node || rank <= 0) continue;
    const gain = node.perRank * Math.min(rank, node.maxRank);
    rows.push(enhanceBar(`${node.icon} ${node.name}`, `+${gain} ${STAT_LABELS[node.stat] ?? node.stat} · rank ${rank}/${node.maxRank}`, rank / node.maxRank, rank >= node.maxRank));
  }

  box.innerHTML = `<h3 class="pv-panel-title">Enhancements</h3>` +
    (rows.length ? `<div class="pv-enh-list">${rows.join('')}</div>`
      : `<p class="empty-note">No active passives yet. Open meridians on the Skills tab or complete a gear set.</p>`);
}

// --- Right column ---------------------------------------------------------

function itemSlot(item) {
  if (!item) return `<div class="item-slot empty"></div>`;
  const gem = isGem(item);
  const icon = gem ? gemIcon(item) : (SLOT_ICONS[item.slot] ?? '◈');
  const bonuses = gem
    ? ''
    : Object.entries(item.bonuses ?? {}).map(([s, v]) => `+${v} ${STAT_LABELS[s] ?? s}`).join(', ');
  const tip = `${item.name} — Lv ${item.level}${item.slot ? ' ' + item.slot : ''}${bonuses ? ' · ' + bonuses : ''}`;
  return `<div class="item-slot icon-${item.rarity}${gem ? ' is-gem' : ''}" title="${tip.replace(/"/g, '&quot;')}"><span class="item-icon">${icon}</span></div>`;
}

function renderInventory(player) {
  const box = $('profile-inventory');
  if (!box) return;
  const slots = ['weapon', 'robe'].map((slot) => {
    const item = player.equipment[slot];
    return item ? itemSlot(item) : `<div class="item-slot empty" title="Empty ${slot} slot"><span class="item-icon dim">${SLOT_ICONS[slot]}</span></div>`;
  }).join('');
  box.innerHTML = `<h3 class="pv-panel-title">Inventory <span class="dim">equipped</span></h3>
    <div class="pv-item-grid">${slots}</div>`;
}

function renderBackpack(player) {
  const box = $('profile-backpack');
  if (!box) return;
  const inv = player.inventory ?? [];
  box.innerHTML = `<h3 class="pv-panel-title">Backpack <span class="dim">${inv.length} item${inv.length === 1 ? '' : 's'}</span></h3>` +
    (inv.length
      ? `<div class="pv-item-grid">${inv.map(itemSlot).join('')}</div>`
      : `<p class="empty-note">Your pack is empty.</p>`);
}

function renderActiveBuffs(player) {
  const box = $('profile-active-buffs');
  if (!box) return;
  const now = Date.now();
  const buffs = activeBuffs(player, now);
  const rows = buffs.map((b) => {
    const t = getTech(b.techniqueId);
    const eff = Object.entries(b.effect)
      .map(([s, v]) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}% ${STAT_LABELS[s] ?? s}`)
      .join(', ');
    const left = Math.max(0, Math.ceil((b.expiresAt - now) / 1000));
    return `<div class="pv-buff-row">
        <span class="pv-buff-name">${t?.name ?? b.techniqueId}</span>
        <span class="pv-buff-eff dim">${eff}</span>
        <span class="pv-buff-time">${left}s</span>
      </div>`;
  });
  box.innerHTML = `<h3 class="pv-panel-title">Active Buffs</h3>` +
    (rows.length ? `<div class="pv-buff-list">${rows.join('')}</div>`
      : `<p class="empty-note">[no buffs]</p>`);
}

// Public entry — render the whole Profile page from live state.
export function renderProfilePage(state) {
  const p = state.player;
  const heading = $('profile-heading');
  if (heading) heading.textContent = `${activeTitle(p).name}'s Profile`;
  renderEmblem(p);
  renderStatistics(state);
  renderEnhancements(p);
  renderInventory(p);
  renderBackpack(p);
  renderActiveBuffs(p);
}
