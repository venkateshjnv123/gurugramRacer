# Gurugram Racer 🏍️

A small, funny, top-down bike game set in a caricature of Gurugram. Beat the clock across
NH-48, Golf Course Road and Sohna Road — while dodging cows, wrong-side Thars, autos with
no indicators, police nakas and Hero Honda Chowk's annual beach.

**▶ Play: https://venkateshjnv123.github.io/gurugramRacer/**

> 🎬 _Gameplay GIF coming soon._

## Controls

| Key | Action |
|---|---|
| Arrow keys / WASD | Ride |
| Shift | Brake |
| Space | Horn (nobody cares, 90% of the time) |
| Esc | Pause |
| F (menu) | Delhi-NCR November mode — fog on every mission |
| R / N / S (result screen) | Retry / Next mission / Share |

## Missions

1. **Interview at 10 baje** — Ambience Mall → Vatika Chowk
2. **Birthday cake delivery** — Medanta → Cyber Hub. Every crash costs 20% of the cake.
3. **₹40 ki chai, ₹40 crore ka flat** — IFFCO Chowk → Sector 54. Don't let the chai go cold.
4. **Barish se pehle ghar** — MG Road → Hero Honda Chowk. It will rain.
5. **2 AM — Cyber Hub se ghar** — night, fog, and a truck with no tail lights.

## Tech

Phaser 3.90 + Vite, plain JavaScript. All art is drawn in code — there are no image files.
Every gameplay number lives in `src/config.js`; all player-facing text in `src/data/jokes.js`
and `src/data/missions.js`. See `PLAN.md` for scope and design decisions.

```sh
npm install
npm run dev      # http://localhost:5173/gurugramRacer/
npm run build    # static build in dist/
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
