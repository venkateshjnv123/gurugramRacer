// Small random helpers (engine-free).
export const between = (lo, hi) => Math.floor(lo + Math.random() * (hi - lo + 1));
export const floatBetween = (lo, hi) => lo + Math.random() * (hi - lo);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
