const BANKS = {
  zhHans: {
    openers: ["爸", "妈", "今天", "早上好", "下午好", "亲爱的", "我们都在想着你", "看到你上线我很开心"],
    wishes: [
      "慢慢骑就好，不用着急", "累了就按休息，身体最重要", "今天也请稳稳地走",
      "看到路边的花也可以停下看看", "先照顾好自己，再完成任务", "每送到一户都很棒",
      "记得喝水，别勉强", "按自己的节奏来就可以", "今天的你也很厉害", "路上注意行人和小动物",
    ],
    closers: ["晚上我给你打电话。", "我们晚点视频。", "完成后记得告诉我。", "我一直在为你加油。", "家里人都很想你。", "祝你今天心情好一点。"],
  },
  zhHant: {
    openers: ["爸", "媽", "今天", "早安", "午安", "親愛的", "我們都在想著你", "看到你上線我很開心"],
    wishes: [
      "慢慢騎就好，不用著急", "累了就按休息，身體最重要", "今天也請穩穩地走",
      "看到路邊的花也可以停下看看", "先照顧好自己，再完成任務", "每送到一戶都很棒",
      "記得喝水，別勉強", "照自己的節奏來就可以", "今天的你也很厲害", "路上注意行人和小動物",
    ],
    closers: ["晚上我給你打電話。", "我們晚點視訊。", "完成後記得告訴我。", "我一直在為你加油。", "家裡人都很想你。", "祝你今天心情好一點。"],
  },
  ja: {
    openers: ["お父さん", "お母さん", "今日は", "おはよう", "こんにちは", "大切なあなたへ", "みんなで応援しています", "ログインしてくれてうれしいです"],
    wishes: [
      "ゆっくり進めば大丈夫です", "疲れたら休んでください", "今日も落ち着いて行きましょう",
      "道ばたの花も楽しんでください", "無理せず、自分のペースで", "一軒届けるだけでも立派です",
      "水分を忘れないでください", "急がなくて大丈夫です", "今日のあなたも素敵です", "歩く人や動物に気をつけてください",
    ],
    closers: ["夜に電話します。", "あとでビデオ通話しましょう。", "終わったら教えてください。", "いつも応援しています。", "家族みんな会いたがっています。", "よい一日になりますように。"],
  },
  en: {
    openers: ["Dad", "Mom", "Today", "Good morning", "Good afternoon", "Dear one", "We are thinking of you", "I’m happy to see you here"],
    wishes: [
      "take it slowly and don’t rush", "press Rest if you feel tired", "ride steadily today",
      "it’s okay to stop and enjoy the flowers", "take care of yourself first", "each delivery is already wonderful",
      "remember to drink water", "go at your own pace", "you are doing great today", "watch gently for people and animals",
    ],
    closers: ["I’ll call you tonight.", "Let’s video chat later.", "Tell me when you finish.", "I’m cheering for you.", "Everyone at home misses you.", "I hope today feels a little brighter."],
  },
};

function bankFor(locale) {
  return BANKS[locale] || BANKS.zhHans;
}

function hashSeed(seed) {
  const text = String(seed ?? Date.now());
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function familyMessageCount(locale) {
  const bank = bankFor(locale);
  return bank.openers.length * bank.wishes.length * bank.closers.length;
}

export function pickFamilyMessage(locale, seed = Date.now()) {
  const bank = bankFor(locale);
  const count = familyMessageCount(locale);
  const index = hashSeed(seed) % count;
  const wishIndex = index % bank.wishes.length;
  const openerIndex = Math.floor(index / bank.wishes.length) % bank.openers.length;
  const closerIndex = Math.floor(index / (bank.wishes.length * bank.openers.length)) % bank.closers.length;
  const opener = bank.openers[openerIndex];
  const wish = bank.wishes[wishIndex];
  const closer = bank.closers[closerIndex];
  if (locale === "en") return `${opener}, ${wish}. ${closer}`;
  if (locale === "ja") return `${opener}、${wish}。${closer}`;
  return `${opener}，${wish}。${closer}`;
}
