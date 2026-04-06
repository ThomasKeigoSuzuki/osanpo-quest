const THRESHOLDS = [
  { stage: 1, offeringsRequired: 0 },
  { stage: 2, offeringsRequired: 3 },
  { stage: 3, offeringsRequired: 6 },
  { stage: 4, offeringsRequired: 10 },
  { stage: 5, offeringsRequired: 15 },
];

export function getGodRevealStage(offeringsCount: number): number {
  let stage = 1;
  for (const t of THRESHOLDS) {
    if (offeringsCount >= t.offeringsRequired) stage = t.stage;
  }
  return stage;
}

export function getNextGodRevealThreshold(currentStage: number): number | null {
  const next = THRESHOLDS.find((t) => t.stage === currentStage + 1);
  return next ? next.offeringsRequired : null;
}
