# Gurugram Racer — rules for Claude Code
- Read PLAN.md first. It is the source of truth for scope (§1b/§1c override older sections).
- Three.js 0.186 + Vite + plain JS (ES modules). No TypeScript, no React, no extra libs without asking.
- Game logic lives in src/core/ and must stay engine-free (no three, no DOM) so it runs headless in Node.
  src/3d/ only renders it.
- All art is generated in code (Three.js primitives + canvas textures). Do not add image/model files.
- All gameplay numbers live in src/config.js. All player-facing text lives in src/data/jokes.js or missions.js (Hinglish).
- After every change `npm run build` must pass and the game must load with no console errors.
- New ideas go to the "v2" list at the bottom of PLAN.md.
- localStorage access must be wrapped in try/catch.
