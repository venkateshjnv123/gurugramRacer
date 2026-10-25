// localStorage can throw (private mode, blocked storage) — never let that break the game.
const PREFIX = 'gurugramRacer.';

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// best = fewest game seconds taken
export function getBest(missionId) {
  return load(`best.${missionId}`, null);
}

export function submitBest(missionId, gameSeconds) {
  const prev = getBest(missionId);
  if (prev === null || gameSeconds < prev) {
    save(`best.${missionId}`, gameSeconds);
    return true;
  }
  return false;
}

// Rage-quit stats (local only): fails per junction
export function recordFail(junctionId) {
  const fails = load('fails', {});
  fails[junctionId] = (fails[junctionId] ?? 0) + 1;
  save('fails', fails);
}

export function worstJunction() {
  const fails = load('fails', {});
  let worst = null;
  for (const [id, n] of Object.entries(fails)) if (!worst || n > worst.n) worst = { id, n };
  return worst?.id ?? null;
}
