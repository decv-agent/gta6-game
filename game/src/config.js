// PALMERA HEAT — tuning, palette and world constants in one place.
// An original sun-soaked crime game set in the fictional Palmera City.
export const WORLD = { size: 3000, roadEvery: 500, roadWidth: 110 };
export const STEP = 1 / 60;
export const SAVE_KEY = 'palmera-heat.save.v1';
export const PALETTE = {
  water: '#1b8a9c', waterDeep: '#12707f', sand: '#f2d492', grass: '#5da860',
  park: '#4c9950', road: '#3d3a42', roadLine: '#ffd98a', sidewalk: '#dcc9a6', curb: '#b8a888',
  buildings: ['#e2703a', '#2a9d8f', '#e9c46a', '#f4a261', '#457b9d', '#e76f51', '#2ec4b6', '#ffb703', '#ef8354', '#3aafa9'],
  roofs: ['#c4532a', '#1f7a6d', '#c9a227', '#d98243', '#33586e', '#c4532f', '#22a193', '#d99a06', '#cf6a3e', '#2b7a78'],
};
export const PLAYER = { radius: 13, walk: 170, sprint: 275, health: 100 };
export const CAR = { accel: 300, brake: 480, maxSpeed: 460, maxReverse: 140, turn: 2.5 };
export const WANTED_DECAY = 24;
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
