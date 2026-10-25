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
  turnRate: 150,       // degrees/s
  galiMultiplier: 0.7, // potholes: slower + camera shake
  radius: 10,          // collision radius vs walls
  wallScrape: 0.92,    // speed kept per frame while grinding a wall
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

export const STARS = {
  three: 0.3, // >30% time left
  two: 0.15,  // >15% time left
};

export const TRAFFIC = {
  maxNpcs: 40,
  jamRadius: 250,
  signalRed: 20,  // real seconds
  signalGreen: 6,
};

// Lanes per side of the road; road width = 2 * lanes * width
export const LANES = {
  highway: 3,
  main: 2,
  gali: 1,
  width: 30,
};

export const COLORS = {
  ground: 0xd8c8a0,
  road: 0x3a3a3a,
  gali: 0x6b5a45,
  kerb: 0xa89f8c,
  lane: 0xffffff,
  divider: 0xe8c547,
  hot: 0xff6a2a,
  sign: 0x1f7a3a,
  glass: [0x5b8fc9, 0x4a7fb8, 0x6fa4d6, 0x3d6fa3],
  shops: [0xc96f4a, 0xd9b44a, 0x8fa35b, 0xb85b7f, 0x7f6fb8, 0xd98a4a],
  houses: [0x9c9488, 0xb3a894, 0x8a8478, 0xc2b8a3],
};
