// Item comparison tooltips (Stage 3 UX, board task Y). When a player hovers an
// artifact that ISN'T currently worn, show its stats as **deltas versus the
// piece equipped in that slot** — ▲ green for an upgrade, ▼ red for a downgrade,
// – grey for no change — so "is this better?" reads at a glance.
//
// Kept self-contained to stay parallel-work-safe: this module owns the delta
// math + its own stylesheet (css/itemcompare.css). The only touch to ui.js is a
// single line in the shared item-tooltip renderer (compareRows) plus one context
// setter; everything else (rarity glow, equipped marker, tidier context menu) is
// pure CSS in the owned sheet, targeting classes ui.js already emits.
//
// Pure READ of the player's equipment — never mutates state.

const STAT_LABELS = { attack: 'Attack', defense: 'Defense', damage: 'Damage', armor: 'Armor', hp: 'Max HP' };
const STAT_ORDER = ['attack', 'defense', 'damage', 'armor', 'hp'];

// ui.js sets this once (from renderGear, which has the live player); equipment
// mutates in place on the same player object, so a single reference stays valid.
let ctxPlayer = null;
export function setCompareContext(player) {
  ctxPlayer = player;
}

// HTML rows comparing `item` to whatever is worn in its slot. Returns '' when
// there's nothing meaningful to show (no context, or `item` IS the worn piece).
export function compareRows(item) {
  if (!ctxPlayer || !item || !item.slot) return '';
  const equipped = ctxPlayer.equipment?.[item.slot] ?? null;
  if (equipped && equipped.id === item.id) return ''; // this tooltip is the worn piece itself

  const oldB = equipped?.bonuses ?? {};
  const newB = item.bonuses ?? {};
  const stats = STAT_ORDER.filter((s) => (newB[s] ?? 0) !== 0 || (oldB[s] ?? 0) !== 0);
  if (!stats.length) return '';

  const rows = stats
    .map((s) => {
      const d = (newB[s] ?? 0) - (oldB[s] ?? 0);
      const cls = d > 0 ? 'cmp-up' : d < 0 ? 'cmp-down' : 'cmp-same';
      const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '–';
      const sign = d > 0 ? '+' : '';
      return `<div class="cmp-row ${cls}"><span class="cmp-stat">${STAT_LABELS[s]}</span><span class="cmp-delta">${arrow} ${sign}${d}</span></div>`;
    })
    .join('');

  const head = equipped
    ? `<div class="cmp-head">vs equipped <span class="rarity-${equipped.rarity}">${equipped.name}</span></div>`
    : `<div class="cmp-head">vs empty ${item.slot} slot — all new</div>`;

  return `<div class="cmp-block">${head}${rows}</div>`;
}
