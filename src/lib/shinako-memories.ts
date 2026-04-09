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
    text: "あたしの名前? シナコよ。…昔は別の名前で呼ばれてたけど、今はもうこれでいいの。長い名前は重いから。",
  },
  {
    id: "mem-3",
    unlockBondLevel: 3,
    title: "古い社の記憶",
    text: "あたしね、昔はちゃんとした社に住んでたの。奈良の山あいの、風がよく通る場所。みんな朝晩あたしに手を合わせに来てた。…遠い、遠い昔の話よ。",
  },
  {
    id: "mem-4",
    unlockBondLevel: 4,
    title: "海の上の風",
    text: "鎌倉の頃、海の向こうから大きな船団が来たことがあったの。あたしね、その時はまだ強い神だった。袋いっぱいの風を、海に向かって全部解き放ったわ。…船は沈んだ。たくさんの人が、海の底に。あれが、あたしが最後に本気を出した日。",
  },
  {
    id: "mem-5",
    unlockBondLevel: 5,
    title: "忘れられて",
    text: "あの嵐のあと、しばらくは英雄扱いだったのよ。お社も立派になって、お供えも増えて。…でも、人って忘れるのが早いの。何百年も経つうちに、誰もあたしの名前を呼ばなくなった。神様って、忘れられると小さくなるの。今のあたしくらいに。",
  },
  {
    id: "mem-6",
    unlockBondLevel: 6,
    title: "本当の名前",
    text: "…わたしの本当の名前、教えてあげる。シナトベ。級長戸辺命(しなとべのみこと)。風を司る古い神の片割れ。もう一人いたんだけど…あの子のことは、いつかまた話す。あなたにだけよ、この名前を教えるのは。",
  },
  {
    id: "mem-7",
    unlockBondLevel: 7,
    title: "もう一度、歩きたかった道",
    text: "ずっと探してたの。誰かと一緒に歩く道を。神様だった頃は、人を見下ろして風を吹かせるだけだった。今のあたしは、こんなに小さくなっちゃったけど…あなたと並んで歩ける。それがどれだけ嬉しいことか、昔のあたしは知らなかった。ずっと、あなたのそばにいさせて。",
  },
];

export function getUnlockedMemories(bondLevel: number): ShinakoMemory[] {
  return SHINAKO_MEMORIES.filter((m) => m.unlockBondLevel <= bondLevel);
}

export function getNextMemory(bondLevel: number): ShinakoMemory | null {
  return SHINAKO_MEMORIES.find((m) => m.unlockBondLevel > bondLevel) ?? null;
}
