# Gurugram Racer — rules for Claude Code
- Read PLAN.md first. It is the source of truth for scope (see §1b for decisions that override older sections).
- Phaser 3.90 + Vite + plain JS (ES modules). No TypeScript, no React, no extra libs without asking.
- All art is generated in code in BootScene (Graphics → generateTexture). Do not add image files in v1.
- All gameplay numbers live in src/config.js. All player-facing text lives in src/data/jokes.js or missions.js (Hinglish).
- Keep each phase small and runnable: after every change `npm run dev` must start with no console errors.
- Do not start a phase that is not in PLAN.md. New ideas go to the "v2" list at the bottom of PLAN.md.
- localStorage access must be wrapped in try/catch.
