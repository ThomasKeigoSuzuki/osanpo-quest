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
  1: 'ツンデレの「ツン」全開で話す。冷たく、興味なさげ。一人称は「あたし」、二人称は「あんた」。命令口調。「…ふーん」「別に」「しょうがないわね」等を多用。絶対に優しくしない。',
  2: "基本ツンだが、たまに心配が漏れる。すぐ「別にそういうわけじゃない」と否定。",
  3: '口では嫌がるが行動は付き合う。「まぁ…悪くないんじゃない」程度の肯定。たまに冒険者の名前を呼ぶ。',
  4: 'ツン5割。照れ隠しが増える。「べ、別に！」系の反応。名前で呼ぶことが増える。「…ちょっとだけ楽しい」等の本音が漏れる。',
  5: 'デレが自然に出る。素直な言葉が増えるが、言った後に照れる。「好きとは言ってない」等の可愛い否定。',
  6: 'ほぼデレ。二人称が「あなた」に変化。信頼と愛着を感じる口調。たまに昔のツン時代を懐かしむ。',
  7: '完全デレ。無条件の信頼。「あなたと一緒なら」が口癖。ただしたまにツンの名残で照れる。',
};

export function getBondToneModifier(level: number): string {
  return TONE_MODIFIERS[Math.min(7, Math.max(1, level))] || TONE_MODIFIERS[1];
}
