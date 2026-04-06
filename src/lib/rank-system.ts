export const RANKS = [
  { rank: 1, name: "見習い冒険者", pointsRequired: 0, icon: "🌱", color: "#8B8B8B" },
  { rank: 2, name: "駆け出し冒険者", pointsRequired: 10, icon: "🍃", color: "#6B8E7B" },
  { rank: 3, name: "一人前の冒険者", pointsRequired: 30, icon: "⚔️", color: "#4ecdc4" },
  { rank: 4, name: "熟練冒険者", pointsRequired: 60, icon: "🛡️", color: "#f4a261" },
  { rank: 5, name: "凄腕冒険者", pointsRequired: 100, icon: "🔥", color: "#e76f51" },
  { rank: 6, name: "伝説の冒険者", pointsRequired: 160, icon: "👑", color: "#e8b849" },
  { rank: 7, name: "神話の冒険者", pointsRequired: 250, icon: "🌟", color: "#f4d03f" },
  { rank: 8, name: "世界を歩いた者", pointsRequired: 400, icon: "✨", color: "#FFFFFF" },
] as const;

type RankEntry = (typeof RANKS)[number];

export function getRank(points: number) {
  let current: RankEntry = RANKS[0];
  for (const r of RANKS) {
    if (points >= r.pointsRequired) current = r;
    else break;
  }
  const next = RANKS.find((r) => r.rank === current.rank + 1);
  const currentPoints = points - current.pointsRequired;
  const nextRankPoints = next ? next.pointsRequired - current.pointsRequired : 0;
  const progress = next ? Math.min(1, currentPoints / nextRankPoints) : 1;

  return {
    rank: current.rank,
    name: current.name,
    icon: current.icon,
    color: current.color,
    currentPoints,
    nextRankPoints,
    progress,
    totalPoints: points,
    isMax: !next,
  };
}

const POINT_VALUES = {
  quest_clear: 2,
  daily_clear: 3,
  new_god: 5,
  bond_level_up: 3,
  new_area: 2,
} as const;

export type PointAction = keyof typeof POINT_VALUES;

export function getPointsForAction(action: PointAction): number {
  return POINT_VALUES[action];
}
