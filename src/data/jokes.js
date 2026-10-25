// All player-facing Hinglish lines (except mission titles/briefs, which live in missions.js).

export const UI = {
  tagline: 'Gurugram mein time pe pahunchna = asli boss fight',
  pauseTitle: 'Chai break ☕',
  pauseHint: 'Esc = wapas chalo  ·  R = restart  ·  Q = menu',
  share: 'S = Share',
  copied: 'Link copy ho gaya! Dosto ko bhej 📋',
  copyFailed: 'Copy nahi hua. Link: ',
  shareWin: (time, from, to, url) => `Main ${time} mein ${from} se ${to} pahunch gaya 🏍️ Tu kar ke dikha: ${url}`,
  shareFail: (title, url) => `"${title}" mein Gurugram ne mujhe hara diya 😭 Tu kar ke dikha: ${url}`,
  rageQuit: (name) => `Sabse zyada log yahan haare: ${name} 😤`,
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
  fogToggle: (on) => `F = Delhi-NCR November mode (har mission mein fog): ${on ? 'ON 🌫️' : 'OFF'}`,
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

export const EVENTS = {
  cow: 'Gau Mata ka break time hai. Wait karo.',
  cowLeaves: 'Gau Mata ne raasta de diya. Aashirwad mil gaya 🙏',
  thar: 'Bhai tu jaanta hai main kaun hoon?',
  auto: 'Indicator? Woh kya hota hai?',
  challan: 'Helmet hai? Papers hai? Chai-paani?',
  challanSign: 'NAKA',
  construction: 'Road under construction since 2019',
  constructionSign: 'KAAM CHALU HAI',
  waterlogging: 'Hero Honda Chowk ab Hero Honda Beach hai 🏖️',
  gaaglu: 'Gaaglu Maps: Turn right into... the jam.',
  uturn: 'U-turn sirf 2 km aage. Enjoy.',
  uturnSign: 'U-TURN 2 KM AAGE →',
  rain: 'Bas 1 baadal tha... 🌧️',
  invisibleTruck: 'Tail light? Bhai budget nahi tha.',
};

export const SPECIAL = {
  cake: (p) => `🎂 Cake: ${p}%`,
  cakeHit: 'Cake ka ek kona gaya 😬',
  chai: (t) => `☕ Chai: ${t}°C`,
  chaiTip: (r) => `Tip mili: ₹${r}`,
  chaiWarm: 'Chai thandi ho rahi hai! Jaldi!',
};

export const FAIL_REASON = {
  time: 'Time khatam.',
  cake: 'Cake gir gaya. Dosti khatam. 🎂💀',
  chai: 'Chai thandi ho gayi. Penthouse wale ne 1 star diya.',
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

// Roadside hoardings along the highways
export const BILLBOARDS = [
  'Plot in Sohna — sirf ₹2 crore!',
  'IIT guaranteed coaching · Sector 14',
  'Naya flyover: bas 2 mahine aur (since 2019)',
  'Gaaglu Maps — hum pe bharosa rakho',
  'Luxury 4BHK ₹40 Cr · parking extra',
  'Momos ₹60 · Chai ₹40 · WiFi free',
  'Smog? Humara air purifier lo!',
  'Weekend getaway: Sohna Road traffic',
];
