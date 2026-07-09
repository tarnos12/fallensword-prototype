// Sect disciple missions (Stage 3, task Q). Send the disciples you've hired into
// the Sect (guild.js) on timed, wall-clock missions that pay out spirit stones +
// XP when they return. It uses the same elapsed-time pattern as Qi regen and the
// Pavilion — a mission finishing is `Date.now() >= endsAt`, so it resolves
// correctly even if the game was closed the whole time (offline-safe for free).
//
// Reads the roster via the existing `state.guildProvider.getMembers()` — no edit
// to guild.js. Active missions + a "returned" tray persist on the additive
// `player.sectMissions` field (round-trips through the save, lazily back-filled,
// no VERSION bump). Behind a provider interface (createSectMissionProvider) like
// market/guild/bounties; owns its own button + modal DOM + stylesheet, so there
// is no index.html or ui.js touch.

const MS_PER_MIN = 60 * 1000;

// Mission catalog. Longer missions pay proportionally more; a disciple can run
// one at a time. Data only — new missions are new entries.
export const MISSION_TYPES = [
  { id: 'gather', name: 'Gather Spirit Herbs', icon: '🌿', minutes: 20, desc: 'Comb the vale for medicinal herbs.' },
  { id: 'patrol', name: 'Patrol the Frontier', icon: '🛡', minutes: 45, desc: 'Guard the sect borders — spoils to the vigilant.' },
  { id: 'caravan', name: 'Escort a Caravan', icon: '🐎', minutes: 90, desc: 'A long, lucrative merchant escort.' },
];
const TYPE_BY_ID = Object.fromEntries(MISSION_TYPES.map((m) => [m.id, m]));

// Reward scales with the disciple's cultivation level and the mission length, so
// stronger disciples on longer missions earn more.
export function missionReward(level, minutes) {
  const lv = Math.max(1, level || 1);
  return {
    stones: Math.max(1, Math.round(minutes * (1.6 + lv * 0.35))),
    xp: Math.max(1, Math.round(minutes * (0.4 + lv * 0.08))),
  };
}

// --- persistence (lazy back-fill) ---------------------------------------

function store(player) {
  if (!player.sectMissions || typeof player.sectMissions !== 'object') {
    player.sectMissions = { active: [], tray: [] };
  }
  if (!Array.isArray(player.sectMissions.active)) player.sectMissions.active = [];
  if (!Array.isArray(player.sectMissions.tray)) player.sectMissions.tray = [];
  return player.sectMissions;
}

function members(state) {
  return state.guildProvider ? state.guildProvider.getMembers() : [];
}

// --- mutations (called by the game-layer wrappers) ----------------------

function assign(state, personaId, typeId, now) {
  const s = store(state.player);
  const member = members(state).find((m) => m.personaId === personaId);
  if (!member) return { ok: false, reason: 'That disciple is not in your sect.' };
  if (s.active.some((a) => a.personaId === personaId)) return { ok: false, reason: 'That disciple is already on a mission.' };
  const type = TYPE_BY_ID[typeId];
  if (!type) return { ok: false, reason: 'No such mission.' };
  const reward = missionReward(member.persona.level, type.minutes);
  s.active.push({
    personaId,
    discipleName: member.persona.name,
    typeId,
    typeName: type.name,
    icon: type.icon,
    startedAt: now,
    endsAt: now + type.minutes * MS_PER_MIN,
    reward,
  });
  return { ok: true, discipleName: member.persona.name, typeName: type.name, minutes: type.minutes };
}

// Move every finished mission to the returned tray. Returns the completed list.
function resolveDue(player, now) {
  const s = store(player);
  const done = s.active.filter((m) => m.endsAt <= now);
  if (!done.length) return [];
  s.active = s.active.filter((m) => m.endsAt > now);
  for (const m of done) {
    s.tray.push({ personaId: m.personaId, discipleName: m.discipleName, typeName: m.typeName, icon: m.icon, reward: m.reward });
  }
  return done;
}

function collect(player) {
  const s = store(player);
  const total = s.tray.reduce((acc, t) => ({ stones: acc.stones + t.reward.stones, xp: acc.xp + t.reward.xp }), { stones: 0, xp: 0 });
  const count = s.tray.length;
  s.tray = [];
  return { stones: total.stones, xp: total.xp, count };
}

// --- provider ------------------------------------------------------------

export function createSectMissionProvider(state) {
  return {
    missionTypes: () => MISSION_TYPES,
    roster: (now = Date.now()) => {
      const s = store(state.player);
      return members(state).map((m) => {
        const mission = s.active.find((a) => a.personaId === m.personaId);
        return {
          ...m,
          mission: mission ? { ...mission, remainingMs: Math.max(0, mission.endsAt - now), done: mission.endsAt <= now } : null,
        };
      });
    },
    tray: () => store(state.player).tray.slice(),
    collectableCount: () => store(state.player).tray.length,
    assign: (personaId, typeId, now = Date.now()) => assign(state, personaId, typeId, now),
    resolveDue: (now = Date.now()) => resolveDue(state.player, now),
    collect: () => collect(state.player),
  };
}

// =====================================================================
// Rendering — owned here (button + modal + stylesheet injected), no index.html.
// =====================================================================

const $ = (id) => document.getElementById(id);
let provider = null;
let actions = null;
let overlay = null;

function ensureStylesheet() {
  if (document.querySelector('link[data-sectmissions]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/sectmissions.css';
  link.setAttribute('data-sectmissions', '');
  document.head.appendChild(link);
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function fmtRemaining(ms) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function renderSectMissions(state, now = Date.now()) {
  if (!provider) provider = createSectMissionProvider(state);
  const body = $('sectmissions-body');
  if (!body) return;
  body.innerHTML = '';

  // Returned tray (collectable rewards).
  const tray = provider.tray();
  const trayHead = el('h3', null, `Returned <span class="dim">— ${tray.length}</span>`);
  body.appendChild(trayHead);
  if (tray.length === 0) {
    body.appendChild(el('p', 'empty-note', 'No disciples have returned yet.'));
  } else {
    for (const t of tray) {
      const row = el('div', 'sm-row');
      row.appendChild(el('div', 'sm-info', `<span class="sm-name">${t.icon} ${t.discipleName}</span><span class="sm-sub dim">returned from ${t.typeName}</span>`));
      const rewardEl = el('span', 'sm-reward', `+${t.reward.stones} ◆ · +${t.reward.xp} XP`);
      rewardEl.title = `Waiting to be collected: ${t.reward.stones} spirit stones ◆ and ${t.reward.xp} XP.`;
      row.appendChild(rewardEl);
      body.appendChild(row);
    }
    const collectBtn = el('button', 'claim-btn sm-collect', `Collect all (${tray.length})`);
    collectBtn.title = `Collect ${tray.length} returned disciple${tray.length === 1 ? '' : 's'}' rewards — spirit stones ◆ and XP.`;
    collectBtn.addEventListener('click', () => actions.collect());
    body.appendChild(collectBtn);
  }

  // Roster — assign idle disciples, show countdowns for busy ones.
  const rosterHead = el('h3', null, 'Your Disciples');
  body.appendChild(rosterHead);
  const roster = provider.roster(now);
  if (roster.length === 0) {
    body.appendChild(el('p', 'empty-note', 'No disciples yet — recruit fellow cultivators in the ⛩ Sect first.'));
    return;
  }
  for (const m of roster) {
    const row = el('div', 'sm-row');
    row.appendChild(el('div', 'sm-info', `<span class="sm-name">${m.label}</span><span class="sm-sub dim">${m.specialty.name}</span>`));
    if (m.mission) {
      const status = m.mission.done
        ? '<span class="sm-ready">Returning…</span>'
        : `<span class="sm-timer">${m.mission.icon} ${m.mission.typeName} · ${fmtRemaining(m.mission.remainingMs)}</span>`;
      const statusEl = el('div', 'sm-status', status);
      statusEl.title = m.mission.done
        ? `${m.label} has finished — collect the reward above.`
        : `${m.label} is on ${m.mission.typeName}, back in ${fmtRemaining(m.mission.remainingMs)} (pays out even while you're away).`;
      row.appendChild(statusEl);
    } else {
      const picker = el('div', 'sm-missions');
      for (const type of provider.missionTypes()) {
        const rw = missionReward(m.persona.level, type.minutes);
        const btn = el('button', 'sm-assign', `${type.icon} ${type.minutes}m`);
        btn.title = `${type.name} — ${type.desc}  (+${rw.stones} ◆, +${rw.xp} XP)`;
        btn.addEventListener('click', () => actions.start(m.personaId, type.id));
        picker.appendChild(btn);
      }
      row.appendChild(picker);
    }
    body.appendChild(row);
  }
}

export function updateSectMissionBadge(state) {
  if (!provider) provider = createSectMissionProvider(state);
  const badge = $('sectmissions-badge');
  if (!badge) return;
  const n = provider.collectableCount();
  if (n > 0) { badge.textContent = String(n); badge.classList.remove('hidden'); }
  else badge.classList.add('hidden');
}

export function initSectMissions(state, acts) {
  provider = createSectMissionProvider(state);
  actions = acts;
  ensureStylesheet();

  const btn = document.createElement('button');
  btn.id = 'btn-sectmissions';
  btn.type = 'button';
  btn.className = 'sectmissions-nav-btn';
  btn.title = 'Sect Dispatch — send disciples on timed missions for spirit stones & XP';
  btn.innerHTML = '🗺 Sect Dispatch <span id="sectmissions-badge" class="mail-badge hidden"></span>';
  ($('nav-menu') ?? document.getElementById('char-panel'))?.appendChild(btn);

  overlay = document.createElement('div');
  overlay.id = 'sectmissions-overlay';
  overlay.className = 'hidden';
  overlay.innerHTML = `
    <div id="sectmissions-panel">
      <div id="sectmissions-header">
        <h2>Sect Dispatch</h2>
        <button id="btn-close-sectmissions" type="button" title="Close">✕</button>
      </div>
      <p class="sm-note">Send hired disciples on timed missions. They return spirit stones and XP even while you are away — collect them here.</p>
      <div id="sectmissions-body"></div>
    </div>`;
  document.body.appendChild(overlay);

  const open = () => { renderSectMissions(state); overlay.classList.remove('hidden'); };
  const close = () => overlay.classList.add('hidden');
  btn.addEventListener('click', open);
  $('btn-close-sectmissions').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  updateSectMissionBadge(state);
}
