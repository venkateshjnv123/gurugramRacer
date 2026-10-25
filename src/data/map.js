// Schematic Gurugram. Coordinates are a caricature (NE = Delhi side, SW = Jaipur side)
// and get multiplied by WORLD.mapScale in RoadNet.

export const JUNCTIONS = [
  { id: 'ambience',    name: 'Ambience Mall',     x: 2900, y: 300,  hot: false },
  { id: 'cyberhub',    name: 'DLF Cyber Hub',     x: 2500, y: 520,  hot: true  },
  { id: 'sikanderpur', name: 'Sikanderpur Metro', x: 2250, y: 250,  hot: false },
  { id: 'mgroad',      name: 'MG Road',           x: 1750, y: 330,  hot: false },
  { id: 'iffco',       name: 'IFFCO Chowk',       x: 2000, y: 820,  hot: true  }, // signal loop
  { id: 'signature',   name: 'Signature Tower',   x: 1500, y: 1100, hot: false },
  { id: 'rajiv',       name: 'Rajiv Chowk',       x: 1000, y: 1400, hot: true  },
  { id: 'herohonda',   name: 'Hero Honda Chowk',  x: 450,  y: 1800, hot: true  }, // waterlogging
  { id: 'gcr',         name: 'Golf Course Road',  x: 2450, y: 1000, hot: false },
  { id: 'sector54',    name: 'Sector 54 Chowk',   x: 2350, y: 1550, hot: false },
  { id: 'subhash',     name: 'Subhash Chowk',     x: 1250, y: 1750, hot: true  },
  { id: 'medanta',     name: 'Medanta',           x: 950,  y: 1700, hot: false },
  { id: 'bakhtawar',   name: 'Bakhtawar Chowk',   x: 1450, y: 2050, hot: true  },
  { id: 'vatika',      name: 'Vatika Chowk',      x: 1550, y: 2300, hot: false },
];

// type: highway (3 lanes/side, fast, jams), main (2 lanes/side), gali (1 lane/side, shortcut, potholes)
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
