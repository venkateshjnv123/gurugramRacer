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
  turnRate: 200,       // degrees/s at full speed
  galiMultiplier: 0.7, // potholes: slower + camera shake
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

export const ROAD_WIDTH = {
  highway: 120,
  main: 80,
  gali: 40,
};

export const COLORS = {
  ground: 0xd8c8a0,
  road: 0x3a3a3a,
  gali: 0x6b5a45,
  lane: 0xffffff,
  hot: 0xff6a2a,
  sign: 0x1f7a3a,
};
