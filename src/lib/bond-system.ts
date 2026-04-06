export const BOND_LEVELS = [
  { level: 1, name: "出会い", expRequired: 0, description: "初めましての関係" },
  { level: 2, name: "顔見知り", expRequired: 3, description: "何度か顔を合わせた" },
  { level: 3, name: "知り合い", expRequired: 8, description: "お互いを知り始めた" },
  { level: 4, name: "友人", expRequired: 16, description: "信頼が芽生えた" },
  { level: 5, name: "親友", expRequired: 28, description: "深い絆で結ばれた" },
  { level: 6, name: "盟友", expRequired: 46, description: "かけがえのない存在" },
  { level: 7, name: "魂の伴侶", expRequired: 71, description: "永遠の絆" },
] as const;

type BondLevelEntry = (typeof BOND_LEVELS)[number];

export function getBondLevel(totalExp: number) {
  let current: BondLevelEntry = BOND_LEVELS[0];
  for (const lv of BOND_LEVELS) {
    if (totalExp >= lv.expRequired) current = lv;
    else break;
  }
  const next = BOND_LEVELS.find((l) => l.level === current.level + 1);
  const currentExp = totalExp - current.expRequired;
  const nextLevelExp = next ? next.expRequired - current.expRequired : 0;
  const progress = next ? Math.min(1, currentExp / nextLevelExp) : 1;

  return {
    level: current.level,
    name: current.name,
    description: current.description,
    currentExp,
    nextLevelExp,
    progress,
    isMax: !next,
  };
}

const TONE_MODIFIERS: Record<number, string> = {
  1: "丁寧語で話す。初対面の距離感を保つ。",
  2: "少し打ち解けた丁寧語。たまに冗談を言う。",
  3: "敬語が混ざるフランクな口調。名前を呼ぶ。",
  4: "友達口調。冒険者の好みを覚えている風に話す。",
  5: "親しみのある口調。過去の冒険に言及する。",
  6: "深い信頼を感じる口調。特別な呼び方をする。",
  7: "魂の繋がりを感じる口調。以心伝心の雰囲気。",
};

export function getBondToneModifier(level: number): string {
  return TONE_MODIFIERS[Math.min(7, Math.max(1, level))] || TONE_MODIFIERS[1];
}
