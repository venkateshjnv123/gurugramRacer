# Gurugram Racer — Build Plan

> A small, funny, top-down bike game set in a caricature of Gurugram.
> Goal: **finish and ship a public link**, not build the perfect game.

---

## 1. Locked decisions

| Area | Decision |
|---|---|
| Engine | Phaser 3 (arcade physics) |
| Build tool | Vite + plain JavaScript (no TypeScript, no React) |
| View | Top-down, GTA-1 style, camera follows bike |
| Art | **All drawn in code** (Phaser Graphics → generated textures). No downloaded assets in v1 |
| Map | Hand-written JSON data (junctions + roads), schematic, *not* GPS |
| Language | Hinglish for all UI / jokes |
| Controls | Keyboard only: Arrow keys / WASD to ride, Space = horn, Shift = brake, M = mute, Esc = pause |
| Hosting | GitHub repo `gurugram-racer` → GitHub Pages via GitHub Actions |
| Target | Desktop browser (mobile = v2) |

### 1b. Decisions updated 2026-10-25 (override older sections below)

| Area | Decision |
|---|---|
| Engine version | Phaser **3.90.0** (not Phaser 4) |
| Repo / URL | `venkateshjnv123/gurugramRacer` → `https://venkateshjnv123.github.io/gurugramRacer/`; Vite `base: '/gurugramRacer/'` |
| World size | **9600 × 7200** — junction coords in map.js are multiplied by `WORLD.mapScale` (3) |
| Bike speed | maxSpeed **160 px/s** (was 220) |
| Movement | **Roads only.** Road edges and buildings are walls; no off-road/kachcha riding. Galis are the only shortcuts |
| Traffic | **Left-hand traffic.** Wrong-side Thar comes at you in your (left) lane |
| Mission time limits | Set per mission from measured route length (~1.5× best possible time), replacing the minutes in §5 |
| Penalties | In **real** seconds, tuned in config.js (start: crash 3s, challan 10s) |
| Chai | Chai going cold = **mission failed** |
| Stars | ★★★ >30% time left, ★★ >15%, ★ finished |
| Missions | All 5 unlocked from the start |
| Road widths | From lanes: 30px lanes, highway 3/side (180px), main 2/side (120px), gali 1/side (60px) |
| Bike physics | Hand-rolled (speed + heading, walls via RoadNet road shapes), not Arcade bodies — diagonal roads don't fit AABBs |
| Mission routes | Rain = **MG Road → Hero Honda**, Night = **Cyber Hub → Sector 54** (original routes were < 15s of riding) |
| Lane width | **36px** (cars 22px wide) so a bike can squeeze between stopped rows; bike crash hitbox radius 6 |
| Signals | **12s red / 8s green** (was 20/6 — jams ate a third of each mission) |
| NPC rules | NPCs only brake for a bike ahead going the same way (wrong-side = you get hit); NPCs despawn at dead ends; buses/trucks never enter galis |
| Construction | Blocks the route road whose closure costs the *smallest* detour; shown as red ✕ on minimap |
| U-turn | GCR's left carriageway barricaded + central divider (`EVENTS.uturnLength`): ride wrong-side till the divider ends, or detour |
| Challan | Shown as blue dot on minimap so you can plan a gali detour |
| Cows | A row of cows walls off the whole road; they leave 8s after you arrive |
| Time limits | Interview 13, Cake 9, Chai 6, Rain 7, Night 8 game-min — tuned in Phase 6 so a decent bot rider finishes with ~10–20% left (Chai estimated by hand: bot can't solve the U-turn) |
| Pause | Esc is owned by HUDScene (both scenes hear the key); R = restart, Q = menu |
| Horn before Phase 7 | Visual only (toast/ripple); M key is a stub until sound exists |

---

## 2. Folder structure

```
gurugram-racer/
├─ index.html
├─ package.json
├─ vite.config.js            # base: '/gurugram-racer/'
├─ .github/workflows/deploy.yml
├─ PLAN.md                   # this file
├─ CLAUDE.md                 # short rules for Claude Code (see §11)
└─ src/
   ├─ main.js                # Phaser game config, scene list
   ├─ config.js              # tunables: speeds, time scale, colors
   ├─ data/
   │  ├─ map.js              # junctions + roads
   │  ├─ missions.js         # mission definitions
   │  └─ jokes.js            # all Hinglish lines (fail roasts, toasts, signboards)
   ├─ scenes/
   │  ├─ BootScene.js        # generate all textures in code
   │  ├─ MenuScene.js        # title + mission select
   │  ├─ GameScene.js        # the ride
   │  ├─ HUDScene.js         # timer, speed, minimap, toasts (runs on top)
   │  └─ ResultScene.js      # win / fail + roast line
   ├─ objects/
   │  ├─ Bike.js
   │  ├─ TrafficCar.js
   │  └─ events/             # Cow.js, Thar.js, Waterlogging.js, Challan.js, GaagluMaps.js
   └─ systems/
      ├─ MapRenderer.js      # draws roads/junctions/buildings from map.js
      ├─ TrafficSystem.js    # spawns NPCs along road segments
      ├─ EventSystem.js      # triggers humor events
      └─ NightFog.js         # darkness + headlight + fog overlay
```

---

## 3. Map data (schematic Gurugram)

World size: **3200 × 2400 px**. Roads are straight segments between junctions. Coordinates are a caricature — direction roughly right (NE = Delhi side, SW = Jaipur side).

```js
// src/data/map.js
export const JUNCTIONS = [
  { id: 'ambience',    name: 'Ambience Mall',          x: 2900, y: 300,  hot: false },
  { id: 'cyberhub',    name: 'DLF Cyber Hub',          x: 2500, y: 520,  hot: true  },
  { id: 'sikanderpur', name: 'Sikanderpur Metro',      x: 2250, y: 250,  hot: false },
  { id: 'mgroad',      name: 'MG Road',                x: 1750, y: 330,  hot: false },
  { id: 'iffco',       name: 'IFFCO Chowk',            x: 2000, y: 820,  hot: true  }, // signal loop
  { id: 'signature',   name: 'Signature Tower',        x: 1500, y: 1100, hot: false },
  { id: 'rajiv',       name: 'Rajiv Chowk',            x: 1000, y: 1400, hot: true  },
  { id: 'herohonda',   name: 'Hero Honda Chowk',       x: 450,  y: 1800, hot: true  }, // waterlogging
  { id: 'gcr',         name: 'Golf Course Road',       x: 2450, y: 1000, hot: false },
  { id: 'sector54',    name: 'Sector 54 Chowk',        x: 2350, y: 1550, hot: false },
  { id: 'subhash',     name: 'Subhash Chowk',          x: 1250, y: 1750, hot: true  },
  { id: 'medanta',     name: 'Medanta',                x: 950,  y: 1700, hot: false },
  { id: 'bakhtawar',   name: 'Bakhtawar Chowk',        x: 1450, y: 2050, hot: true  },
  { id: 'vatika',      name: 'Vatika Chowk',           x: 1550, y: 2300, hot: false },
];

// type: highway (3 lanes, fast, jams), main (2 lanes), gali (1 lane, shortcut, potholes)
export const ROADS = [
  { from: 'ambience',    to: 'cyberhub',    type: 'highway', name: 'NH-48' },
  { from: 'cyberhub',    to: 'iffco',       type: 'highway', name: 'NH-48' },
  { from: 'iffco',       to: 'signature',   type: 'highway', name: 'NH-48' },
  { from: 'signature',   to: 'rajiv',       type: 'highway', name: 'NH-48' },
  { from: 'rajiv',       to: 'herohonda',   type: 'highway', name: 'NH-48' },
  { from: 'cyberhub',    to: 'sikanderpur', type: 'main',    name: 'Cyber City Rd' },
  { from: 'sikanderpur', to: 'mgroad',      type: 'main',    name: 'MG Road' },
  { from: 'mgroad',      to: 'iffco',       type: 'main',    name: 'MG Road' },
  { from: 'sikanderpur', to: 'gcr',         type: 'main',    name: 'Golf Course Road' },
  { from: 'gcr',         to: 'sector54',    type: 'main',    name: 'Golf Course Road' },
  { from: 'sector54',    to: 'bakhtawar',   type: 'main',    name: 'GC Extension Rd' },
  { from: 'rajiv',       to: 'subhash',     type: 'main',    name: 'Sohna Road' },
  { from: 'subhash',     to: 'bakhtawar',   type: 'main',    name: 'Sohna Road' },
  { from: 'bakhtawar',   to: 'vatika',      type: 'main',    name: 'Sohna Road' },
  { from: 'subhash',     to: 'medanta',     type: 'main',    name: 'Medanta Rd' },
  { from: 'signature',   to: 'subhash',     type: 'gali',    name: 'Gali No. 420' },  // shortcut
  { from: 'iffco',       to: 'gcr',         type: 'gali',    name: 'Andar wala rasta' },
];
```

**Rendering rules (MapRenderer)**
- Background: dusty beige ground.
- Roads: dark grey thick lines (`highway` 120px, `main` 80px, `gali` 40px brown-ish), dashed white lane markings.
- Junctions: circles slightly bigger than road width; `hot: true` junctions get a red/orange tint + always-on jam.
- Buildings: random grey/blue rectangles off-road. Golf Course Road side = tall glassy blue "lavish" towers; near MG Road = cluttered small shops.
- Signboards: green highway-style labels with junction names.
- ~~Off-road = slow~~ → **Roads only** (see §1b): road edges + buildings block movement.

---

## 4. Bike

- Generated texture: small top-down bike + rider (helmet circle), ~20×40 px.
- Physics: arcade body, simple car-style steering (rotation + forward velocity).
- Tunables in `config.js`:
  - `maxSpeed` road: 220 px/s (displayed as ~60 km/h)
  - accel 180, brake 400, drag 120
  - off-road multiplier 0.3, gali multiplier 0.7 (potholes shake the camera)
- Collisions with cars: bounce + lose speed + "Bhai dekh ke!" toast + −5s game time penalty.
- Horn (Space): plays honk, nearby NPCs ignore it 90% of the time (that's the joke). 10% chance a car moves aside with toast "Miracle ho gaya 🙏".

---

## 5. Time & missions

- **Time scale:** 1 real second = 6 game seconds. So "15 min" mission = 150 real seconds. HUD shows game clock (e.g. `09:47 AM`, countdown `14:32 left`).

```js
// src/data/missions.js
export const MISSIONS = [
  { id: 'interview', title: 'Interview at 10 baje',
    from: 'ambience', to: 'vatika', minutes: 15, night: false,
    brief: 'HR already gussa hai. Late hua toh "we will get back to you".',
    events: ['cow', 'thar', 'challan', 'gaaglu'] },

  { id: 'cake', title: 'Birthday cake delivery',
    from: 'medanta', to: 'cyberhub', minutes: 10, night: false,
    brief: 'Dost ka birthday. Cake tere paas hai. Cake gira toh dosti khatam.',
    special: 'cakeMeter', // each collision -20%, 0% = fail
    events: ['auto', 'thar', 'construction'] },

  { id: 'chai', title: '₹40 ki chai, ₹40 crore ka flat',
    from: 'iffco', to: 'sector54', minutes: 8, night: false,
    brief: 'Golf Course Road ke penthouse mein chai deliver kar. Thandi nahi honi chahiye.',
    special: 'chaiTemp', // temperature drops over time; faster = better tip
    events: ['uturn', 'challan', 'cow'] },

  { id: 'rain', title: 'Barish se pehle ghar',
    from: 'rajiv', to: 'herohonda', minutes: 6, night: false,
    brief: 'Bas 1 baadal hai, kuch nahi hoga. (Hoga.)',
    special: 'rainAlways', // rain starts at 50% time no matter what → waterlogging at herohonda
    events: ['waterlogging', 'auto'] },

  { id: 'night', title: '2 AM — Cyber Hub se ghar',
    from: 'cyberhub', to: 'ambience', minutes: 8, night: true,
    brief: 'Party khatam. Fog itna ki apni bike bhi nahi dikh rahi.',
    events: ['cow', 'thar', 'invisibleTruck'] },
];
```

- Mission flow: Menu → pick mission → GameScene spawns bike at `from`, glowing target marker + arrow at `to` → reach within radius 80px = WIN, timer hits 0 = FAIL.
- Result screen: time taken, stars (★ by time left), a random roast/praise line from `jokes.js`, buttons: *Retry*, *Next mission*, *Share* (copies link + "Main 14:32 mein Ambience se Vatika pahunch gaya, tu kar ke dikha").
- Best times saved in `localStorage` (wrapped in try/catch).

---

## 6. Traffic

- `TrafficSystem` spawns NPC vehicles along road segments, moving along the segment direction, in lanes.
- Types (all generated textures):
  - Car (random colors, 24×44)
  - Auto (yellow-green, smaller, random lane switching, no indicator)
  - Bus/Truck (long, slow, blocks a lane)
  - Thar (black, used by event)
- Density per road type: highway high, main medium, gali low.
- **Jams:** at `hot` junctions, NPCs within 250px slow to near-zero in a cycle (signal: 20s red / 6s green real time). Player has to squeeze between or detour.
- Despawn when far from the camera; cap total NPCs at ~40 for performance.

---

## 7. Humor events (the heart of the game)

Triggered by `EventSystem` by mission list + proximity/time. Each shows a toast + optional sound.

| id | What happens | Toast |
|---|---|---|
| `cow` | Cow sprite sits in the middle of the road near a junction. Impassable; go around or wait 8s for it to move | "Gau Mata ka break time hai. Wait karo." |
| `thar` | Black Thar comes wrong-side at high speed in your lane | "Bhai tu jaanta hai main kaun hoon?" |
| `auto` | Auto cuts sharply in front of you | "Indicator? Woh kya hota hai?" |
| `challan` | Police barricade on a road; entering the zone = −30s game time unless you take a gali | "Helmet hai? Papers hai? Chai-paani?" |
| `construction` | A road segment is blocked with orange barriers | "Road under construction since 2019" |
| `waterlogging` | Blue pool at Hero Honda Chowk, speed ×0.2, splash particles | "Hero Honda Chowk ab Hero Honda Beach hai 🏖️" |
| `gaaglu` | "Gaaglu Maps" arrow confidently points the wrong way for 10s | "Gaaglu Maps: Turn right into... the jam." |
| `uturn` | Divider on Golf Course Road; nearest U-turn marked 2 km ahead | "U-turn sirf 2 km aage. Enjoy." |
| `invisibleTruck` | (night only) A truck with no tail lights appears inside the fog | "Tail light? Bhai budget nahi tha." |

**Rage-quit tracking (for fun stats):** count how many times the player failed at each junction; show "Most players gave up at: IFFCO Chowk 😤" on the result screen (local only in v1).

---

## 8. Night + fog mode (`NightFog.js`)

- Full-screen dark layer (render texture, alpha ~0.85) above the world.
- Erase a **headlight cone** in front of the bike each frame (soft triangle/gradient) + a small circle around the bike.
- Other vehicles: draw small red tail-light dots on top of darkness so you can see them only up close.
- **Fog:** a tiling cloudy texture (generated with noise in BootScene) drifting slowly, alpha 0.4, on top of the darkness → visibility ~150px.
- Random distant honk sounds (in v1.5 when audio is added).
- Enabled when `mission.night === true`. Also a "Delhi-NCR November" toggle in the menu that forces fog on any mission.

---

## 9. HUD (`HUDScene`, runs in parallel with GameScene)

- Top-left: mission title + countdown (`14:32 left`), turns red under 2 min.
- Top-right: speedometer (km/h = px/s ÷ 3.6 roughly, just fake it).
- Bottom-right: **minimap** (second camera zoomed out, or simple drawn lines + dots for bike and target).
- Center-top: toast stack for event messages (fade after 2.5s).
- Mission-specific bar: cake meter / chai temperature.
- Off-screen target arrow pointing to destination.

---

## 10. Deploy (GitHub Pages)

1. `npm create vite@latest gurugram-racer -- --template vanilla` → `npm i phaser`.
2. `vite.config.js`: `export default { base: '/gurugram-racer/' }`.
3. Create public GitHub repo `gurugram-racer`, push `main`.
4. Add `.github/workflows/deploy.yml` using the official Pages actions:
   - on push to `main` → checkout → setup-node 20 → `npm ci` → `npm run build` → `actions/upload-pages-artifact` (path `dist`) → `actions/deploy-pages`.
5. Repo Settings → Pages → Source: **GitHub Actions**.
6. Live at `https://<username>.github.io/gurugram-racer/`.

---

## 11. CLAUDE.md (paste this into the repo root)

```md
# Gurugram Racer — rules for Claude Code
- Read PLAN.md first. It is the source of truth for scope.
- Phaser 3 + Vite + plain JS (ES modules). No TypeScript, no React, no extra libs without asking.
- All art is generated in code in BootScene (Graphics → generateTexture). Do not add image files in v1.
- All gameplay numbers live in src/config.js. All player-facing text lives in src/data/jokes.js or missions.js (Hinglish).
- Keep each phase small and runnable: after every change `npm run dev` must start with no console errors.
- Do not start a phase that is not in PLAN.md. New ideas go to the "v2" list at the bottom of PLAN.md.
- localStorage access must be wrapped in try/catch.
```

---

## 12. Build phases (one Claude Code prompt each)

Run them in order. **Commit after every phase.** Each phase ends with a playable build.

### Phase 0 — Setup (15 min)
> "Read PLAN.md. Scaffold the project per §2 and §10 steps 1–2: Vite vanilla + Phaser 3, empty scenes wired in main.js, config.js with the tunables from §4. Add the GitHub Actions deploy workflow from §10. Make `npm run dev` show a black canvas with 'Gurugram Racer' text."

### Phase 1 — Map + bike (60 min)
> "Implement §3 and §4: map.js data, MapRenderer drawing roads/junctions/buildings/signboards, BootScene generating the bike texture, Bike.js with steering, off-road slowdown and camera follow. World bounds 3200×2400. Spawn at Ambience."

✅ Done when: you can ride from Ambience to Vatika on visible roads.

### Phase 2 — Missions, timer, HUD, screens (45 min)
> "Implement §5 and §9: missions.js, MenuScene with mission list, target marker + off-screen arrow, game-time clock with scale 6, HUDScene (timer, speed, toast stack, simple minimap), ResultScene with stars, roast line from jokes.js, retry/next, best time in localStorage."

✅ Done when: mission 1 is fully winnable and losable. **← First deploy here.** Push and confirm the public link works.

### Phase 3 — Traffic (45 min)
> "Implement §6: TrafficSystem with car/auto/bus textures, lane movement along road segments, density by road type, signal-cycle jams at hot junctions, collisions with the bike causing bounce + time penalty + toast. Cap at 40 NPCs."

### Phase 4 — Humor events (45 min)
> "Implement §7: EventSystem plus cow, thar, auto, challan, construction, waterlogging, gaaglu, uturn. Each mission only triggers the events in its `events` list. Add the cake meter, chai temperature and rainAlways specials. Put all text in jokes.js."

### Phase 5 — Night + fog (30 min)
> "Implement §8 NightFog: darkness render texture with headlight cone, tail-light dots for NPCs, drifting generated fog texture, invisibleTruck event, and the 'Delhi-NCR November' fog toggle in the menu."

### Phase 6 — Polish + ship (30 min)
> "Polish: title screen with a Hinglish tagline, pause menu (Esc), share button copying result text + URL, rage-quit stats from §7, tune difficulty so every mission is winnable with ~10% time left by a good player. Fix all console warnings. Update README with the live link, controls and a GIF placeholder."

✅ Done when: all 5 missions playable at the public link. **Ship it. Post it.**

### Phase 7 (only if time is left) — Sound
> "Add sound using Web Audio generated tones (no files): honk, splash, cow moo-ish beep, win jingle. M toggles mute."

---

## 13. Rules to actually finish

- Running out of time? Cut in this order: Phase 7 → night mission → chai/cake specials → minimap. **Never cut Phase 2 + deploy.**
- Deploy right after Phase 2, even if it's ugly. A live ugly link beats a perfect local game.
- No feature outside this file. If you get an idea, write it under v2 and move on.

---

## 14. v2 parking lot

- Noida ↔ Gurugram extension map (DND, Mahamaya, Sector 18)
- Mobile touch controls
- Swap to Kenney.nl CC0 sprites
- Online leaderboard
- More vehicles (Activa, Splendor with 3 people, Swiggy rider)
- Real-ish map import from OpenStreetMap
