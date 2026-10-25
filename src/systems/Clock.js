import { TIME } from '../config.js';

const pad = (n) => String(n).padStart(2, '0');

// real seconds → game seconds
export const toGame = (realSeconds) => realSeconds * TIME.scale;

// game seconds → "mm:ss"
export function formatDuration(gameSeconds) {
  const s = Math.max(0, Math.ceil(gameSeconds));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

// start [h, m] + game seconds elapsed → "09:47 AM"
export function formatClock([h, m], gameSecondsElapsed) {
  const total = (h * 60 + m + Math.floor(gameSecondsElapsed / 60)) % (24 * 60);
  const hh = Math.floor(total / 60);
  const ampm = hh < 12 ? 'AM' : 'PM';
  return `${pad(hh % 12 || 12)}:${pad(total % 60)} ${ampm}`;
}
