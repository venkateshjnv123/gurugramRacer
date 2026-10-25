// Caricature landmarks, one or two per junction, built in code (src/3d/Landmarks.js).
// slot = which gap between the junction's roads it sits in (0 = biggest). size = footprint radius.
export const LANDMARKS = [
  { junction: 'ambience', kind: 'mall', name: 'Ambience Mall', size: 150, slot: 0 },
  { junction: 'cyberhub', kind: 'cyberhub', name: 'Cyber Hub', size: 130, slot: 0 },
  { junction: 'cyberhub', kind: 'towers', name: 'Cyber City', size: 130, slot: 1 },
  { junction: 'sikanderpur', kind: 'station', name: 'Sikanderpur Metro', size: 90, slot: 0 },
  { junction: 'mgroad', kind: 'mgf', name: 'MGF Metropolitan', size: 140, slot: 0 },
  { junction: 'mgroad', kind: 'mallSmall', name: 'City Centre Mall', size: 100, slot: 1 },
  { junction: 'iffco', kind: 'iffco', name: 'IFFCO Tower', size: 100, slot: 0 },
  { junction: 'iffco', kind: 'station', name: 'IFFCO Chowk Metro', size: 80, slot: 1 },
  { junction: 'signature', kind: 'twin', name: 'Signature Towers', size: 110, slot: 0 },
  { junction: 'rajiv', kind: 'busStand', name: 'Bus Adda', size: 120, slot: 0 },
  { junction: 'herohonda', kind: 'factory', name: 'Bike Factory', size: 170, slot: 0 },
  { junction: 'gcr', kind: 'golf', name: 'Golf Course', size: 230, slot: 0 },
  { junction: 'gcr', kind: 'luxury', name: 'Penthouse Towers', size: 110, slot: 1 },
  { junction: 'sector54', kind: 'station', name: 'Sector 54 Rapid Metro', size: 90, slot: 0 },
  { junction: 'subhash', kind: 'market', name: 'Subhash Chowk Market', size: 130, slot: 0 },
  { junction: 'medanta', kind: 'hospital', name: 'Medanta Hospital', size: 150, slot: 0 },
  { junction: 'bakhtawar', kind: 'society', name: 'Sohna Road Society', size: 140, slot: 0 },
  { junction: 'vatika', kind: 'business', name: 'Vatika Business Park', size: 140, slot: 0 },
];

// Yellow Line: elevated metro along MG Road (junction ids in order)
export const METRO_LINE = ['sikanderpur', 'mgroad', 'iffco'];
export const METRO_PILLAR_SPACING = 150;
