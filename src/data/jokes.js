// All player-facing Hinglish lines (except mission titles/briefs, which live in missions.js).

export const UI = {
  menuHint: '↑ ↓ choose  ·  Enter = chalo',
  controls: 'Arrows / WASD = chalao  ·  Shift = brake  ·  Space = horn  ·  Esc = pause',
  best: (t) => `Best: ${t}`,
  noBest: 'Best: abhi tak koi nahi',
  left: (t) => `${t} left`,
  reachHere: 'Yahan pahuncho',
  win: 'Pahunch gaya! 🎉',
  fail: 'Mission fail 💀',
  timeTaken: (t) => `Time: ${t}`,
  newBest: 'Naya record! 🏆',
  retry: 'R = Retry',
  next: 'N = Next mission',
  menu: 'Esc = Menu',
  start: (from, to) => `${from} → ${to}. Chalo!`,
  timeLow: '2 minute bache hain. Bhaag!',
  penalty: (s) => `−${s} sec`,
};

export const CRASH = [
  'Bhai dekh ke!',
  'Dikhta nahi kya?',
  'Papa ki gaadi hai kya?',
  'Insurance hai na?',
];

export const HORN = {
  miracle: 'Miracle ho gaya 🙏',
  ignored: [
    'Horn bajao, kuch nahi hoga.',
    'Aage wala: *volume badha deta hai*',
    'Bhai ne suna, ignore kiya.',
  ],
};

export const FAIL_REASON = {
  time: 'Time khatam.',
};

export const ROASTS = [
  'Bhai, cycle le leta toh jaldi pahunch jaata.',
  'Google Maps bhi tujhpe hasega.',
  'Gurugram ne aaj phir jeet liya.',
  'Itna late toh Delhi Metro bhi nahi hoti.',
  'Agli baar Uber book kar lena.',
  'Traffic tha ya tu tha? Dono hi slow the.',
];

export const PRAISE = [
  'Gurugram ka asli Valentino Rossi!',
  'Traffic police bhi impressed hai.',
  'Itni speed? Challan aa raha hai ghar pe.',
  'Bhai tu toh rapido ka CEO banega.',
  'Sohna Road pe aisi riding? Respect.',
];
