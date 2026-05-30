
const ROOF = ["#5b4638", "#6f5338", "#4f5f6f", "#7a5542", "#8a6f48", "#5c6f59", "#7b5a3d", "#4d6684"];
const WALL = ["#e9dcc8", "#f2e5cf", "#d8c3a5", "#eee7d8", "#e4d5bd", "#f1eadc", "#ddcfba", "#e8dfcf"];
const TRIM = ["#5f422c", "#6b4d33", "#4d4036", "#76583f"];
const VARIANTS = ["old-wood", "house-brown", "house-red", "modern-home", "house-blue", "flower", "bookstore", "bakery"];
const LANDMARKS = ["basketball", "flowers", "fence", "clinic", "bench", "bus", "fish", "bag", "garden", "sign"];

const SCENE_POSITIONS = [
  [-304, -224, -1],
  [-224, -224, 1],
  [-144, -224, -1],
  [-64, -224, 1],
  [64, -224, -1],
  [144, -224, 1],
  [224, -224, -1],
  [304, -224, 1],
  [-304, -160, 1],
  [-224, -160, -1],
  [-144, -160, 1],
  [-64, -160, -1],
  [64, -160, 1],
  [144, -160, -1],
  [224, -160, 1],
  [304, -160, -1],
  [-304, -96, -1],
  [-224, -96, 1],
  [-144, -96, -1],
  [-64, -96, 1],
  [64, -96, -1],
  [144, -96, 1],
  [224, -96, -1],
  [304, -96, 1],
  [-304, -32, 1],
  [-224, -32, -1],
  [-144, -32, 1],
  [-64, -32, -1],
  [64, -32, 1],
  [144, -32, -1],
  [224, -32, 1],
  [304, -32, -1]
];

const PEOPLE = [
  ["tanaka", "male", "田中先生", "田中先生", "田中さん", "Mr. Tanaka", "体育报", "體育報", "スポーツ新聞", "sports paper"],
  ["suzuki", "female", "铃木女士", "鈴木女士", "鈴木さん", "Ms. Suzuki", "园艺报", "園藝報", "園芸新聞", "gardening paper"],
  ["yamamoto", "couple", "山本夫妇", "山本夫婦", "山本ご夫妻", "The Yamamotos", "早报", "早報", "朝刊", "morning paper"],
  ["kobayashi", "male", "小林医生", "小林醫生", "小林先生", "Dr. Kobayashi", "健康报", "健康報", "健康新聞", "health paper"],
  ["sato", "male", "佐藤先生", "佐藤先生", "佐藤さん", "Mr. Sato", "社区通知", "社區通知", "町内のお知らせ", "community notice"],
  ["mori", "female", "森女士", "森女士", "森さん", "Ms. Mori", "文化报", "文化報", "文化新聞", "culture paper"],
  ["ito", "male", "伊藤先生", "伊藤先生", "伊藤さん", "Mr. Ito", "钓鱼报", "釣魚報", "釣り新聞", "fishing paper"],
  ["watanabe", "couple", "渡边夫妇", "渡邊夫婦", "渡辺ご夫妻", "The Watanabes", "旅行报", "旅行報", "旅行新聞", "travel paper"],
  ["nakamura", "female", "中村女士", "中村女士", "中村さん", "Ms. Nakamura", "料理报", "料理報", "料理新聞", "cooking paper"],
  ["kato", "male", "加藤先生", "加藤先生", "加藤さん", "Mr. Kato", "町内通知", "町內通知", "町内会のお知らせ", "neighborhood notice"],
  ["yoshida", "female", "吉田女士", "吉田女士", "吉田さん", "Ms. Yoshida", "音乐报", "音樂報", "音楽新聞", "music paper"],
  ["yamada", "male", "山田先生", "山田先生", "山田さん", "Mr. Yamada", "将棋报", "將棋報", "将棋新聞", "shogi paper"],
  ["sasaki", "female", "佐佐木女士", "佐佐木女士", "佐々木さん", "Ms. Sasaki", "手工报", "手工報", "手芸新聞", "craft paper"],
  ["yamaguchi", "male", "山口先生", "山口先生", "山口さん", "Mr. Yamaguchi", "经济报", "經濟報", "経済新聞", "business paper"],
  ["matsumoto", "couple", "松本夫妇", "松本夫婦", "松本ご夫妻", "The Matsumotos", "天气报", "天氣報", "天気新聞", "weather paper"],
  ["inoue", "female", "井上女士", "井上女士", "井上さん", "Ms. Inoue", "俳句报", "俳句報", "俳句新聞", "haiku paper"],
  ["kimura", "male", "木村先生", "木村先生", "木村さん", "Mr. Kimura", "棒球报", "棒球報", "野球新聞", "baseball paper"],
  ["hayashi", "female", "林女士", "林女士", "林さん", "Ms. Hayashi", "健康专刊", "健康專刊", "健康特集", "health special"],
  ["shimizu", "male", "清水先生", "清水先生", "清水さん", "Mr. Shimizu", "铁路报", "鐵路報", "鉄道新聞", "railway paper"],
  ["saito", "female", "斋藤女士", "齋藤女士", "斎藤さん", "Ms. Saito", "猫咪报", "貓咪報", "猫の新聞", "cat paper"],
  ["abe", "male", "阿部先生", "阿部先生", "阿部さん", "Mr. Abe", "历史报", "歷史報", "歴史新聞", "history paper"],
  ["hashimoto", "female", "桥本女士", "橋本女士", "橋本さん", "Ms. Hashimoto", "电影报", "電影報", "映画新聞", "movie paper"],
  ["ishikawa", "male", "石川先生", "石川先生", "石川さん", "Mr. Ishikawa", "围棋报", "圍棋報", "囲碁新聞", "go paper"],
  ["maeda", "female", "前田女士", "前田女士", "前田さん", "Ms. Maeda", "花道报", "花道報", "華道新聞", "flower-arranging paper"],
  ["ogawa", "male", "小川先生", "小川先生", "小川さん", "Mr. Ogawa", "河川报", "河川報", "川の新聞", "river paper"],
  ["okada", "female", "冈田女士", "岡田女士", "岡田さん", "Ms. Okada", "茶道报", "茶道報", "茶道新聞", "tea paper"],
  ["hasegawa", "male", "长谷川先生", "長谷川先生", "長谷川さん", "Mr. Hasegawa", "相扑报", "相撲報", "相撲新聞", "sumo paper"],
  ["fujita", "female", "藤田女士", "藤田女士", "藤田さん", "Ms. Fujita", "散步报", "散步報", "散歩新聞", "walking paper"],
  ["goto", "male", "后藤先生", "後藤先生", "後藤さん", "Mr. Goto", "商店街报", "商店街報", "商店街新聞", "shopping-street paper"],
  ["murakami", "female", "村上女士", "村上女士", "村上さん", "Ms. Murakami", "读书报", "讀書報", "読書新聞", "reading paper"],
  ["kondo", "couple", "近藤夫妇", "近藤夫婦", "近藤ご夫妻", "The Kondos", "防灾通知", "防災通知", "防災のお知らせ", "safety notice"],
  ["endo", "female", "远藤女士", "遠藤女士", "遠藤さん", "Ms. Endo", "社区活动报", "社區活動報", "地域行事新聞", "community events paper"],
];

function sceneToWorld(x, z) {
  return { x: Math.round(x * 45), y: Math.round(z * 45) };
}

function clue(index, paperZh, paperHant, paperJa, paperEn) {
  const colors = ["深色瓦屋顶", "木质外墙", "门口有盆栽", "白色铝窗", "旧式邮筒", "小阳台", "门前有石板", "靠近电线杆"];
  const colorsH = ["深色瓦屋頂", "木質外牆", "門口有盆栽", "白色鋁窗", "舊式郵筒", "小陽台", "門前有石板", "靠近電線桿"];
  const colorsJ = ["黒っぽい瓦屋根", "木の外壁", "玄関に鉢植え", "白いアルミサッシ", "昔ながらの郵便受け", "小さなベランダ", "玄関前に飛び石", "電柱の近く"];
  const colorsE = ["dark tile roof", "wooden siding", "potted plants by the door", "white aluminum windows", "old-style mailbox", "small balcony", "stepping stones by the entrance", "near a utility pole"];
  return {
    zhHans: `${colors[index % colors.length]}，需要「${paperZh}」`,
    zhHant: `${colorsH[index % colorsH.length]}，需要「${paperHant}」`,
    ja: `${colorsJ[index % colorsJ.length]}、「${paperJa}」を待っています`,
    en: `${colorsE[index % colorsE.length]}, waiting for the ${paperEn}`,
  };
}

function thanks(nameZh, nameHant, nameJa, nameEn, index) {
  const zh = ["谢谢你今天也送来。", "辛苦你绕到这里来。", "收到报纸就安心了。", "你总是很细心，谢谢。"];
  const hant = ["謝謝你今天也送來。", "辛苦你繞到這裡來。", "收到報紙就安心了。", "你總是很細心，謝謝。"];
  const ja = ["今日も届けてくれてありがとう。", "ここまで来てくれて助かります。", "新聞が届くと安心します。", "いつも丁寧ですね。ありがとう。"];
  const en = ["Thank you for bringing it today.", "Thank you for coming all the way here.", "It feels reassuring when the paper arrives.", "You are always so thoughtful. Thank you."];
  const i = index % zh.length;
  return {
    zhHans: `${nameZh}：${zh[i]}`,
    zhHant: `${nameHant}：${hant[i]}`,
    ja: `${nameJa}：${ja[i]}`,
    en: `${nameEn}: ${en[i]}`,
  };
}

export const neighbors = PEOPLE.map((person, index) => {
  const [id, gender, zh, hant, ja, en, paperZh, paperHant, paperJa, paperEn] = person;
  const [sx, roadZ, side] = SCENE_POSITIONS[index];
  const houseZ = roadZ + side * 14.9;
  const deliveryZ = roadZ + side * 6.4;
  const house = sceneToWorld(sx, houseZ);
  const delivery = sceneToWorld(sx, deliveryZ);
  const clueText = clue(index, paperZh, paperHant, paperJa, paperEn);
  const thanksText = thanks(zh, hant, ja, en, index);
  return {
    id,
    recipient: { gender, avatar: id },
    name: zh,
    x: house.x,
    y: house.y,
    deliveryX: delivery.x,
    deliveryY: delivery.y,
    roof: ROOF[index % ROOF.length],
    wall: WALL[index % WALL.length],
    trim: TRIM[index % TRIM.length],
    paper: paperZh,
    clue: clueText.zhHans,
    landmark: LANDMARKS[index % LANDMARKS.length],
    thanks: thanksText.zhHans,
    variant: VARIANTS[index % VARIANTS.length],
    osakaLot: true,
    l10n: {
      zhHans: { name: zh, paper: paperZh, clue: clueText.zhHans, thanks: thanksText.zhHans },
      zhHant: { name: hant, paper: paperHant, clue: clueText.zhHant, thanks: thanksText.zhHant },
      ja: { name: ja, paper: paperJa, clue: clueText.ja, thanks: thanksText.ja },
      en: { name: en, paper: paperEn, clue: clueText.en, thanks: thanksText.en },
    },
  };
});

export const companion = {
  name: "阿铃",
  opening: "早上好，今天见到你真高兴。",
  gentle: "不着急，我们慢慢来。",
  closeHint: "再靠近一点点就可以了。我会在目标旁边画一个发光圈。",
};
