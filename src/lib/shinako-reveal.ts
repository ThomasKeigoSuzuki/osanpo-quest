const THRESHOLDS = [
  { stage: 1, questsRequired: 0 },
  { stage: 2, questsRequired: 1 },
  { stage: 3, questsRequired: 3 },
  { stage: 4, questsRequired: 5 },
  { stage: 5, questsRequired: 7 },
];

export function getShinakoRevealStage(totalQuestsCompleted: number): number {
  let stage = 1;
  for (const t of THRESHOLDS) {
    if (totalQuestsCompleted >= t.questsRequired) stage = t.stage;
  }
  return stage;
}

export function getNextRevealThreshold(currentStage: number): number | null {
  const next = THRESHOLDS.find((t) => t.stage === currentStage + 1);
  return next ? next.questsRequired : null;
}

export function getShinakoRevealMessage(stage: number): string {
  const msgs: Record<number, string> = {
    1: "…誰？ あたしに何か用？",
    2: "…ふーん。一応やれるじゃない",
    3: "そんなにあたしの顔が見たいの？ …しょうがないわね",
    4: "ここまで来るとは思わなかったわ。…ちょっとだけ認めてあげる",
    5: "これがあたしよ。あんたにだけ見せてあげるんだから。…光栄に思いなさい",
  };
  return msgs[stage] || msgs[1];
}
