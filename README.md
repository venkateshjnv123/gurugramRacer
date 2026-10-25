# Gurugram Racer 🏍️

A small, funny 3D bike game set in a caricature of Gurugram. Ride behind your rider past
IFFCO Tower, MGF Metropolitan, Cyber Hub and the MG Road metro — and beat the clock while
dodging cows, wrong-side Thars, autos with no indicators, police nakas and Hero Honda
Chowk's annual beach.

**▶ Play: https://venkateshjnv123.github.io/gurugramRacer/**

> 🎬 _Gameplay GIF coming soon._

## Controls

| Key | Action |
|---|---|
| Arrow keys / WASD | Ride |
| Shift | Brake |
| Space | Horn (nobody cares, 90% of the time) |
| Esc | Pause |
| C | Camera: High / Mid / Close |
| F (menu) | Delhi-NCR November mode — fog on every mission |
| R / N / S (result screen) | Retry / Next mission / Share |

## Missions

1. **Interview at 10 baje** — Ambience Mall → Vatika Chowk
2. **Birthday cake delivery** — Medanta → Cyber Hub. Every crash costs 20% of the cake.
3. **₹40 ki chai, ₹40 crore ka flat** — IFFCO Chowk → Sector 54. Don't let the chai go cold.
4. **Barish se pehle ghar** — MG Road → Hero Honda Chowk. It will rain.
5. **2 AM — Cyber Hub se ghar** — Cyber Hub → Sector 54 at night, and a truck with no tail lights.

## Tech

Three.js + Vite, plain JavaScript. All art is built in code — boxes, cylinders and canvas
textures; there are no image or model files. Game logic (`src/core/`) is engine-free and runs
headless in Node; `src/3d/` renders it. Every gameplay number lives in `src/config.js`; all
player-facing text in `src/data/jokes.js` and `src/data/missions.js`. See `PLAN.md`.

```sh
npm install
npm run dev      # http://localhost:5173/gurugramRacer/
npm run build    # static build in dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
