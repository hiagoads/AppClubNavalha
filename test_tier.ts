export const DEFAULT_THRESHOLDS = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];

export const getLevelTier = (points: number, thresholds: number[] = DEFAULT_THRESHOLDS) => {
  let level = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (points >= thresholds[i]) {
      level = i + 1;
      break;
    }
  }
  if (level > 8) level = 8;
  // logic here
}
