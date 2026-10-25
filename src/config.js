// All gameplay tunables live here. Tune numbers here, not in game code.

export const WORLD = {
  width: 9600,
  height: 7200,
  mapScale: 3, // junction coords in map.js are multiplied by this
};

export const BIKE = {
  maxSpeed: 160,       // px/s on road
  accel: 150,
  brake: 350,
  drag: 110,
  reverseSpeed: 45,
  turnRate: 140,       // degrees/s at low speed
  turnRateFast: 75,    // degrees/s at max speed (calmer, wider turns)
  steerIn: 6,          // how fast steering ramps to full lock (per s) — 0→1 in ~0.17s
  steerOut: 10,        // how fast it re-centres when released
  galiMultiplier: 0.7, // potholes: slower + camera shake
  radius: 10,          // collision radius vs walls
  wallFriction: 3,     // speed lost per second while pushing into a kerb (scaled by how hard)
  wallSlide: 10,       // how fast the heading turns parallel to a kerb you're scraping (per s)
  wallImpact: 0.5,     // speed kept after a near head-on hit
  subStep: 1 / 120,    // physics runs in fixed steps no bigger than this (frame-rate independent)
  kmhPerPx: 60 / 160,  // fake speedo: maxSpeed shows as 60 km/h
};

export const TIME = {
  scale: 6, // 1 real second = 6 game seconds
};

// Penalties in REAL seconds (tune against mission pacing)
export const PENALTY = {
  crash: 3,
  challan: 10,
};

export const EVENTS = {
  cowWait: 8,             // seconds the cows sit after you reach them
  cowSpacing: 56,         // max px between cow centres across the road (cows are 60 long → they overlap)
  tharSpeed: 240,
  tharWindow: [0.12, 0.4], // fraction of time limit when it may trigger
  autoWindow: [0.06, 0.3],
  autoRepeats: 2,
  gaagluWindow: [0.12, 0.35],
  gaagluDuration: 10,
  waterRadius: 240,
  waterSpeed: 0.2,
  challanZone: 70,        // half-length of the naka zone along the road
  uturnLength: 1100,      // divider length on Golf Course Road
  solidHitRadius: 8,
};

export const SPECIALS = {
  cakeHit: 20,          // % lost per collision
  chaiStart: 90,        // °C
  chaiCold: 45,         // °C = fail
  chaiStuckFactor: 1.8, // cools faster when you're not moving
  chaiBudget: 1.4,      // riding non-stop, chai goes cold at this × time limit
  rainAt: 0.5,          // fraction of time limit
};

export const NIGHT = {
  truckWindow: [0.15, 0.45], // invisible truck appears in this fraction of the time limit
  truckSpeed: 45,
};

export const STARS = {
  three: 0.3, // >30% time left
  two: 0.15,  // >15% time left
};

export const TRAFFIC = {
  maxNpcs: 40,
  jamRadius: 400,      // NPCs this close to a red hot junction queue up
  signalRed: 12,       // real seconds
  signalGreen: 8,
  spawnMin: 900,       // spawn ring around the bike (px)
  spawnMax: 2000,
  despawn: 2400,
  density: { highway: 3, main: 1.5, gali: 0.4 }, // spawn weight per px of road
  speed: { highway: [120, 145], main: [95, 120], gali: [60, 80] },
  kindSpeed: { car: 1, auto: 0.75, bus: 0.6, truck: 0.6, thar: 1.6 },
  mix: {
    highway: { car: 0.6, auto: 0.2, bus: 0.1, truck: 0.1 },
    main: { car: 0.55, auto: 0.35, bus: 0.1 },
    gali: { car: 0.5, auto: 0.5 },
  },
  accel: 120,
  decel: 320,
  bikeHitRadius: 6,    // bike is narrow: can squeeze between stopped cars
  crashCooldown: 1.2,  // seconds between crash penalties
  hornCooldown: 0.6,
  hornMiracleChance: 0.1,
};

// Lanes per side of the road; road width = 2 * lanes * width
export const LANES = {
  highway: 3,
  main: 2,
  gali: 1,
  width: 36,
};

export const COLORS = {
  ground: 0xd8c8a0,
  road: 0x3a3a3a,
  kerb: 0xa89f8c,
  hot: 0xff6a2a,
  glass: [0x5b8fc9, 0x4a7fb8, 0x6fa4d6, 0x3d6fa3],
  shops: [0xc96f4a, 0xd9b44a, 0x8fa35b, 0xb85b7f, 0x7f6fb8, 0xd98a4a],
  houses: [0x9c9488, 0xb3a894, 0x8a8478, 0xc2b8a3],
  cars: [0xecf0f1, 0xc0392b, 0x7f8c8d, 0x2c3e50, 0x2980b9, 0xbdc3c7],
};
