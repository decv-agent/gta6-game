// Palmera Heat — tuning constants and the sun-soaked palette.
// Numbers designers might tweak live here so behaviour code stays clean.
export const WORLD = {
  size: 3000,
  beachX: 2620,
  seaX: 2820,
  block: 300,
  road: 92,
};

export const PALETTE = {
  road: '#3d3a44',
  roadEdge: '#2c2a33',
  lane: '#f4e3b2',
  sidewalk: '#c9b8a3',
  sand: '#f2d492',
  sea: '#1f8a9e',
  seaDeep: '#146b80',
  foam: '#eafaf1',
  grass: '#5da85f',
  grassDark: '#47884e',
  palmTrunk: '#8a5a3b',
  palmLeaf: '#2f9e5f',
  shadow: 'rgba(70,30,60,0.28)',
  hero: '#ff5d3b',
  cop: '#2b4bd8',
  copLight: '#7ec8ff',
};

export const BUILDING_COLORS = [
  '#e8875b', '#e2a03f', '#d96c4f', '#5fb4ad', '#3e8e9e', '#f2c078',
  '#c96f4a', '#7fc8bc', '#e5989b', '#ffb26b', '#4ea8a0', '#d1495b',
];

export const CAR_COLORS = [
  '#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#6a4c93',
  '#1982c4', '#8ac926', '#ffca3a', '#f15bb5', '#d8d8d8',
];

export const PLAYER = { radius: 11, walkSpeed: 165, sprintSpeed: 265, maxHealth: 100 };

export const CAR = {
  length: 44, width: 22, accel: 300, brake: 460, reverse: 140,
  drag: 0.6, maxSpeed: 440, maxReverse: 140,
};

export const WANTED = { decayDelay: 7, decayEvery: 6, bustTime: 2.4 };

export const STORAGE_KEY = 'palmera-heat-save-v1';
