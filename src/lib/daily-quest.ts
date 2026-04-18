export type DailyQuestConfig = {
  name: string;
  /**
   * ミッションタイプの傾向（必ずしも固定しない）。
   * distRange は削除し、距離はユーザーの distance_preference に従う方針。
   */
  type: "discovery" | "direction" | "experience" | "random";
  categoryBonus: string | null;
  rarityBonus: number;
  minRarity?: number;
};

// 曜日ごとの「テーマ」のみ設定し、距離はユーザーのこのみに従う
const DAILY_CONFIGS: DailyQuestConfig[] = [
  // 日曜=0
  { name: "のんびり日曜日", type: "experience", categoryBonus: "divine", rarityBonus: 0 },
  // 月曜=1
  { name: "発見の月曜日", type: "discovery", categoryBonus: "craft", rarityBonus: 0 },
  // 火曜=2
  { name: "冒険の火曜日", type: "direction", categoryBonus: "mystery", rarityBonus: 0 },
  // 水曜=3
  { name: "感覚の水曜日", type: "experience", categoryBonus: "nature", rarityBonus: 0 },
  // 木曜=4
  { name: "探索の木曜日", type: "discovery", categoryBonus: "memory", rarityBonus: 0 },
  // 金曜=5
  { name: "ごほうびの金曜日", type: "random", categoryBonus: "food", rarityBonus: 1 },
  // 土曜=6
  { name: "大冒険の土曜日", type: "random", categoryBonus: null, rarityBonus: 1, minRarity: 2 },
];

export function getDailyQuestConfig(date: Date = new Date()): DailyQuestConfig {
  const jst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  return DAILY_CONFIGS[jst.getDay()];
}

export function getStreakBonus(streak: number): { rarityBonus: number; label: string } {
  if (streak >= 7) return { rarityBonus: 2, label: "★4確定！" };
  if (streak >= 5) return { rarityBonus: 1, label: "★3以上確定！" };
  if (streak >= 3) return { rarityBonus: 1, label: "レアリティ+1" };
  return { rarityBonus: 0, label: "" };
}

export function getCategoryBonusLabel(cat: string | null): string {
  const labels: Record<string, string> = {
    nature: "🌿自然の恵み",
    food: "🍡味覚の記憶",
    craft: "🏺職人の技",
    mystery: "🔮不思議なもの",
    memory: "🎐風景の欠片",
    divine: "✨神様の贈り物",
  };
  return cat ? labels[cat] || cat : "";
}

export function getTodayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}
