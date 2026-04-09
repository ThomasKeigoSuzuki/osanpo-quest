export type ShinakoMemory = {
  id: string;
  unlockBondLevel: number;
  title: string;
  text: string;
};

export const SHINAKO_MEMORIES: ShinakoMemory[] = [
  {
    id: "mem-1",
    unlockBondLevel: 1,
    title: "出会いの日",
    text: "…別に、誰でもよかったのよ。たまたまあんたが見つけたから、相手してあげてるだけ。それだけ。",
  },
  {
    id: "mem-2",
    unlockBondLevel: 2,
    title: "風の名前",
    text: "あたしの名前? シナコよ。…昔、誰かがそう呼んでくれたの。誰だったかは…もう覚えてない。",
  },
  {
    id: "mem-3",
    unlockBondLevel: 3,
    title: "古い記憶",
    text: "あたしね、昔はもっとたくさんの人に会ってたの。みんな、いつの間にかいなくなっちゃったけど。…別に、寂しくなんかないんだから。",
  },
  {
    id: "mem-4",
    unlockBondLevel: 4,
    title: "あなたのこと",
    text: "あなた、毎日来てくれるのね。…別に、待ってるとかじゃないけど。来ないと、ちょっとだけ、つまらないかも。",
  },
  {
    id: "mem-5",
    unlockBondLevel: 5,
    title: "風のしたで",
    text: "わたし、本当はずっと一人だったの。風と一緒にいるのが好きだった。…でもね、あなたと歩く道のほうが、もっと好き。",
  },
  {
    id: "mem-6",
    unlockBondLevel: 6,
    title: "本当の名前",
    text: "…わたしの本当の名前、教えてあげる。シナトベ。風を司る古い神の、その娘の、そのまた娘の名前。あなただけよ、知ってるのは。",
  },
  {
    id: "mem-7",
    unlockBondLevel: 7,
    title: "ずっと、あなたと",
    text: "ずっと探してたの。一緒に歩いてくれる人を。…見つけてくれてありがとう。これからもずっと、あなたのそばにいる。",
  },
];

export function getUnlockedMemories(bondLevel: number): ShinakoMemory[] {
  return SHINAKO_MEMORIES.filter((m) => m.unlockBondLevel <= bondLevel);
}

export function getNextMemory(bondLevel: number): ShinakoMemory | null {
  return SHINAKO_MEMORIES.find((m) => m.unlockBondLevel > bondLevel) ?? null;
}
