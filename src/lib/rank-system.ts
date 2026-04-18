// 序盤（特にランク 2, 3）を早めに到達できるように再調整。
// quest_clear=2pts を基本とすると、Rank 2 は 2クエスト、Rank 3 は 6クエストで到達。
export const RANKS = [
  { rank: 1, name: "見習い冒険者", pointsRequired: 0, icon: "🌱", color: "#8F8578" },
  { rank: 2, name: "駆け出し冒険者", pointsRequired: 4, icon: "🍃", color: "#8FA86B" },
  { rank: 3, name: "一人前の冒険者", pointsRequired: 12, icon: "⚔️", color: "#6BA7B5" },
  { rank: 4, name: "熟練冒険者", pointsRequired: 30, icon: "🛡️", color: "#4F8894" },
  { rank: 5, name: "凄腕冒険者", pointsRequired: 60, icon: "🔥", color: "#C65E4A" },
  { rank: 6, name: "伝説の冒険者", pointsRequired: 110, icon: "👑", color: "#D9A441" },
  { rank: 7, name: "神話の冒険者", pointsRequired: 200, icon: "🌟", color: "#B88730" },
  { rank: 8, name: "世界を歩いた者", pointsRequired: 350, icon: "✨", color: "#2A2520" },
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
