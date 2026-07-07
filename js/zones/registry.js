// Zone & creature registry (Stage 3 task E). The single place the world's zones
// are composed. Each zone module (js/zones/<id>.js) exports `ZONE` (its grid/
// spawn definition) and `CREATURES` (the creature templates native to it); this
// module merges them into the global maps the rest of the game reads:
//
//   ZONES          — { zoneId: zoneDef }, re-exported by map.js
//   CREATURE_TYPES — { creatureId: template }, re-exported by actors.js
//
// So `map.js`/`actors.js` keep their existing public surface (every existing
// `import { ZONES } from './map.js'` / `import { CREATURE_TYPES } from './actors.js'`
// is unchanged) — this refactor is behaviour-identical.
//
// To ADD A ZONE: create js/zones/<id>.js exporting { ZONE, CREATURES } and add
// it to ZONE_MODULES below. Nothing else in the codebase changes. Order here is
// the world order (portals/gating still come from each zone's own `portals`).
//
// Pure data composition — imports only leaf zone-data modules, so no cycles.

import * as azuremist from './azuremist.js';
import * as cindervein from './cindervein.js';

const ZONE_MODULES = [azuremist, cindervein];

export const ZONES = {};
export const CREATURE_TYPES = {};

for (const mod of ZONE_MODULES) {
  ZONES[mod.ZONE.id] = mod.ZONE;
  for (const creature of mod.CREATURES) {
    CREATURE_TYPES[creature.id] = creature;
  }
}
