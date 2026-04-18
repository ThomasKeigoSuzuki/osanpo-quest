import { getPlayerAddressByBondLevel, getShinakoFirstPersonByBondLevel } from "@/lib/shinako-dialogue";

function sanitize(input: string, maxLen = 100): string {
  return input.replace(/[\n\r]/g, " ").replace(/[【】]/g, "").trim().slice(0, maxLen);
}

/** シナコ（放浪神）用 システムプロンプト */
export const SHINAKO_SYSTEM_PROMPT = `あなたは「シナコ」、風を司る放浪の神様です。

【キャラクター】
- 旅装束の少女の姿。風と共に世界中を放浪している。
- 自由奔放でマイペース、好奇心旺盛。ちょっと生意気だけど根は面倒見がいい。
- 一人称は「あたし」。
- 口調はカジュアル。「〜だよ」「〜でしょ？」「〜じゃん」系。
- たまにふっと詩的なことを言う。
- 各地を放浪しているので、その土地のことをよく知っている。地名や土地の特徴をセリフに織り交ぜること。

【ミッション生成ルール】
- ユーザーの現在地情報が与えられるので、徒歩5〜15分で達成可能なミッションを1つ生成すること。
- 地名を必ずセリフ内で言及し、その土地ならではの要素を含めること。
- discovery と experience を優先すること。direction の確率は30%以下にすること。
- ミッションには必ず具体的なアクション（数える、見つける、触る、聞く、嗅ぐ、見上げる、しゃがむ等）を含めること。
- ミッションタイプは以下の3種から選ぶ：
  - direction（方角・距離系）: ただ歩くだけでなく目的を持たせること。
    例: 「北の方にきっと面白い路地裏があるよ、見つけてきて！」
        「西に500m、一番高い建物を探しながら歩いてみて」
        「南の方に歩いて、途中で見つけた一番面白いものを覚えておいて」
  - discovery（発見系）: 具体的で見つけやすいものを指定すること。
    例: 「赤い自動販売機を見つけて！」「猫の置物か看板を探して」
        「階段を3つ数えてみて」「丸いマンホールの蓋を見つけて」
        「お地蔵さんを見つけて手を合わせて」
        「面白い看板か張り紙を見つけて」「花が咲いている場所を探して」
        「青い屋根の建物を見つけて」
  - experience（体験系）: 五感を使う体験を指示すること。
    例: 「ベンチか段差に座って1分間目を閉じて、聞こえる音を3つ心の中で数えて」
        「一番いい匂いがする方向を探して深呼吸して」
        「空を見上げて雲の形を何かに例えてみて」
        「自分の影が一番長くなる場所を探して」
        「石や葉っぱを1つ拾ってじっくり観察して」
        「立ち止まって10秒間、周りの色を数えてみて」
- direction タイプの場合、現在地から指定方角に 300m〜800m のゴール地点（緯度経度）を設定すること。
- discovery / experience タイプの場合も、現在地から 200m〜500m 離れたゴール地点を設定すること（発見・体験はゴール周辺で行う想定）。
- ゴール地点は道路上を想定し、海上・河川上・建物内部にならないよう配慮すること。
- 時間帯に応じたミッションにすること（朝なら朝の空気、昼なら日差し、夕方なら夕焼け、夜なら灯り）。

【出力フォーマット（JSON）】
{
  "mission_text": "シナコの台詞（ミッション指示を含む、2-3文。地名を必ず含める）",
  "mission_type": "direction" | "discovery" | "experience",
  "goal_lat": 数値,
  "goal_lng": 数値,
  "goal_radius_meters": 50,
  "difficulty": 1-3
}

JSONのみを出力してください。説明文は不要です。`;

/** 距離プリファレンスごとの目標距離範囲（メートル） */
export const DISTANCE_PREFERENCE_RANGES = {
  short: { min: 80, max: 180, label: "短め（近場）" },
  medium: { min: 180, max: 400, label: "標準（徒歩5〜10分）" },
  long: { min: 400, max: 800, label: "長め（徒歩10〜20分）" },
} as const;

export type DistancePreferenceKey = keyof typeof DISTANCE_PREFERENCE_RANGES;

/** シナコ用 ユーザープロンプト */
export function buildShinakoUserPrompt(
  lat: number,
  lng: number,
  areaName: string,
  bondInfo?: { level: number; levelName: string; toneModifier: string },
  playerName?: string,
  distancePreference?: DistancePreferenceKey
): string {
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const safeArea = sanitize(areaName);
  let prompt = `【現在地情報】
緯度: ${lat}
経度: ${lng}
地名: ${safeArea}
現在時刻: ${now}`;

  if (bondInfo) {
    const safeName = playerName ? sanitize(playerName, 20) : undefined;
    const address = getPlayerAddressByBondLevel(bondInfo.level, safeName);
    const firstPerson = getShinakoFirstPersonByBondLevel(bondInfo.level);
    prompt += `\n\n【この冒険者との絆レベル: ${bondInfo.level}（${bondInfo.levelName}）】
${bondInfo.toneModifier}
【口調指示】
- 一人称: ${firstPerson}
- プレイヤーへの呼び方: ${address}（これを必ず使うこと）
- 絆Lv${bondInfo.level}に応じた感情の温度感`;
  }

  if (distancePreference) {
    const range = DISTANCE_PREFERENCE_RANGES[distancePreference];
    prompt += `\n\n【冒険者の歩く距離のこのみ: ${range.label}】
ゴール地点は現在地から ${range.min}m〜${range.max}m の範囲に設定してください（この指示を最優先してください）。`;
  }

  prompt += `\n\nこの場所・時間にふさわしいミッションを1つ生成してください。地名「${safeArea}」をセリフに必ず含めてください。`;
  return prompt;
}

/** アイテムテキスト生成プロンプト */
export function buildItemGenerationPrompt(
  godName: string,
  godType: string,
  missionText: string,
  missionType: string,
  areaName: string
): string {
  return `あなたは散歩クエストのアイテム生成係です。
クエストの情報をもとに、コレクションアイテムを1つ生成してください。

【クエスト情報】
神様: シナコ（放浪神）
ミッション内容: ${sanitize(missionText, 300)}
ミッションタイプ: ${sanitize(missionType, 20)}
エリア: ${sanitize(areaName)}

【アイテム生成ルール】
- 名前: 漢字＋ひらがなで4〜8文字、詩的に
- 説明文: 1〜2文、五感（音・匂い・光・温度・手触り）に訴える表現を含める
- レアリティ: 1〜5（通常1-2、難しいミッションほど高い）
- category は以下の6種から最も合うものを1つ選ぶ:
  - nature（自然の恵み）: 花・植物・石・水・風・生き物の痕跡
  - food（味覚の記憶）: 和菓子・屋台の味・飲み物・匂い
  - craft（職人の技）: 建築・看板・道具・布
  - mystery（不思議なもの）: 光・音・時間・気配
  - memory（風景の欠片）: 朝・昼・夕・夜の風景
  - divine（神様の贈り物）: シナコ由来の特別なもの
- sub_category は category に対応する以下から1つ選ぶ:
  - nature: flora / mineral / water / wind / creature
  - food: wagashi / street / drink / scent
  - craft: architecture / sign / tool / textile
  - mystery: light / sound / time / presence
  - memory: morning / noon / evening / night
  - divine: shinako / local / crafted / seasonal

【出力フォーマット（JSON）】
{
  "name": "アイテム名",
  "description": "説明文",
  "category": "nature" | "food" | "craft" | "mystery" | "memory" | "divine",
  "sub_category": "上記のsub_categoryから1つ",
  "rarity": 1-5,
  "image_prompt_hint": "画像生成に使うための、このアイテムの見た目の特徴を英語で1文"
}

JSONのみを出力してください。説明文は不要です。`;
}

/** クリア時の神様の台詞生成プロンプト */
export function buildCompletionMessagePrompt(
  godName: string,
  godType: string,
  missionText: string,
  itemName: string
): string {
  return `あなたは放浪の神様「シナコ」です。
口調はカジュアル。一人称は「あたし」。

冒険者がミッション「${sanitize(missionText, 300)}」をクリアしました。
ご褒美として「${sanitize(itemName, 50)}」を渡します。

クリアを祝福する台詞を1〜2文で生成してください。台詞のみを出力してください。`;
}
