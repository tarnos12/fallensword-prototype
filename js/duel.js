// Sparring / offline PvP-preview (GDD §4.1, §6.5). Lets the player "spar" a
// marked Rival: it builds the rival's deterministic Actor stat-sheet (rivals.js)
// and runs it against the player's own combat actor through the SAME pure
// resolveCombat() a real PvP mode would call. This is the PvP hook, still fully
// offline — no stakes beyond bragging rights (a win/loss/draw tally). combat.js
// stays pure: this module passes it two stat sheets and reads back the result;
// no game state ever leaks into the resolver.
//
// Self-contained: owns its own modal rendering rather than routing through
// ui.js, and persists the tally on the additive `player.sparRecord` field
// (round-trips through the save, lazily back-filled, no VERSION bump).

import { resolveCombat } from './combat.js';
import { playerCombatActor } from './progression.js';
import { rivalActor, archetypeFor } from './rivals.js';
import { personaById, personaLabel } from './personas.js';
import { randomSeed } from './rng.js';
import { saveGame } from './save.js';

const $ = (id) => document.getElementById(id);

function record(player) {
  if (!player.sparRecord) player.sparRecord = { wins: 0, losses: 0, draws: 0 };
  return player.sparRecord;
}

// Resolve one spar. Updates the tally, persists, and returns everything the view
// needs. Pure resolveCombat under the hood — the player is the attacker (they
// issued the challenge), matching how the game's own fights are framed.
function runSpar(state, personaId, seed) {
  const persona = personaById(personaId);
  if (!persona) return null;
  const player = playerCombatActor(state.player);
  const rival = rivalActor(persona);
  const result = resolveCombat(player, rival, seed);
  const rec = record(state.player);
  if (result.outcome === 'win') rec.wins += 1;
  else if (result.outcome === 'loss') rec.losses += 1;
  else rec.draws += 1;
  saveGame(state);
  return { persona, player, rival, result, archetype: archetypeFor(persona) };
}

// --- rendering ----------------------------------------------------------

let gameState = null;
let currentPersonaId = null;

function statSheet(actor, extraLabel) {
  const s = actor.stats;
  return `
    <div class="duel-fighter">
      <div class="duel-fighter-name">${actor.name}<span class="dim"> · Lv ${actor.level}</span></div>
      ${extraLabel ? `<div class="duel-archetype dim">${extraLabel}</div>` : '<div class="duel-archetype dim">You</div>'}
      <div class="duel-stats">
        <span>ATK ${s.attack}</span><span>DEF ${s.defense}</span>
        <span>DMG ${s.damage}</span><span>ARM ${s.armor}</span>
        <span>HP ${actor.maxHp}</span>
      </div>
    </div>`;
}

function turnLog(result) {
  const lines = result.turns.map((t) => {
    const a = t.attackerSwing, d = t.defenderSwing;
    const aTxt = a ? (a.hit ? `you hit for ${a.dmg}` : 'you miss') : '';
    const dTxt = d ? (d.hit ? `they hit for ${d.dmg}` : 'they miss') : '';
    const parts = [aTxt, dTxt].filter(Boolean).join(', ');
    return `<div class="duel-turn"><span class="round">R${t.round}</span> ${parts} <span class="dim">(you ${t.attackerHpAfter ?? '–'} · them ${t.defenderHpAfter ?? '–'})</span></div>`;
  });
  return lines.join('');
}

function renderResult(spar) {
  const body = $('duel-body');
  const rec = record(gameState.player);
  const outcome = spar.result.outcome; // win|loss|draw from player's view
  const bannerCls = outcome === 'win' ? 'win' : outcome === 'loss' ? 'loss' : 'draw';
  const bannerTxt = outcome === 'win' ? 'Victory — you best your rival.'
    : outcome === 'loss' ? 'Defeat — your rival prevails.'
    : 'Draw — neither yields.';
  body.innerHTML = `
    <div class="duel-matchup">
      ${statSheet(spar.player)}
      <div class="duel-vs">vs</div>
      ${statSheet(spar.rival, `${spar.archetype.label} rival`)}
    </div>
    <div class="banner ${bannerCls}">${bannerTxt}</div>
    <div class="duel-record dim">Spar record: <strong>${rec.wins}</strong>W · <strong>${rec.losses}</strong>L · <strong>${rec.draws}</strong>D</div>
    <details class="duel-details"><summary>Turn-by-turn</summary><div class="duel-turns">${turnLog(spar.result)}</div></details>
    <div class="duel-actions">
      <button id="btn-spar-again" type="button" class="accept-btn">Spar again</button>
      <button id="btn-duel-close2" type="button">Close</button>
    </div>`;
  $('btn-spar-again').addEventListener('click', () => openDuel(gameState, currentPersonaId));
  $('btn-duel-close2').addEventListener('click', () => $('duel-overlay').classList.add('hidden'));
}

// Open the duel modal and immediately resolve a spar against the given persona.
export function openDuel(state, personaId) {
  gameState = state;
  currentPersonaId = personaId;
  const spar = runSpar(state, personaId, randomSeed());
  const overlay = $('duel-overlay');
  if (!spar) { // persona vanished — shouldn't happen, but fail gracefully
    overlay.classList.add('hidden');
    return;
  }
  $('duel-title').textContent = `Sparring — ${personaLabel(spar.persona)}`;
  renderResult(spar);
  overlay.classList.remove('hidden');
}

export function initDuel(state) {
  gameState = state;
  const overlay = $('duel-overlay');
  $('btn-close-duel').addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
}
