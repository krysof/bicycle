const dict = {
  zhHans: {
    lang: "zh-CN",
    stamp: "昭和町内会",
    eyebrow: "第三人称 3D 送报",
    titleKicker: "陪伴型 3D 送报",
    titleStart: "点击开始",
    titleSoundNote: "点击后会开启音乐和音效权限",
    homeTitle: "今天骑车送报",
    greetingFirst: "今天我会陪你在更大的町内慢慢送报。",
    greetingLast: (count) => `上次你送到了 ${count} 户，大家都很高兴。今天也慢慢来。`,
    companionHello: (tail) => `阿铃：早上好，见到你真高兴。${tail}`,
    companionHelloNamed: (name, tail) => `阿铃：${name}，早上好，见到你真高兴。${tail}`,
    chooseMode: "选择移动方式",
    playerNameLabel: "你的名字",
    playerNameHelp: "可以直接使用默认名字，也可以输入家人熟悉的称呼。",
    statusQuestion: "今天状态怎么样？",
    status_tired: "有点累",
    status_tired_hint: "少送几户，速度更慢。",
    status_normal: "还不错",
    status_normal_hint: "标准节奏，轻松完成。",
    status_good: "精神很好",
    status_good_hint: "路线稍长，多走几户。",
    defaultPlayerNames: ["春日先生", "青山女士", "松风先生", "花见女士"],
    companionNames: ["小铃", "小春", "小梅", "小空"],
    startBike: "开始骑单车",
    startBikeHint: "默认模式，沿着道路送报",
    startWalk: "改为步行",
    startWalkHint: "速度慢、路线短、最安心",
    homeNote: "默认骑单车。进入后：↑/W 前进，↓/S 后退，←/A 和 →/D 轻轻转向；靠近路边发光房子后按“投递报纸”。",
    todayTask: "今日任务",
    ready: "准备出发",
    controls: "↑/W 前进，↓/S 后退，←→ 转向。",
    targetDone: "今天的报纸都送到了",
    summaryReady: "准备查看总结。",
    deliverTo: (i, total, name) => `${i}/${total} 送给：${name}`,
    targetHint: (paper) => `靠近发光投递点，按空格或大按钮投递「${paper}」。`,
    pause: "休息",
    resume: "继续",
    deliverButton: "投递报纸",
    touchSteer: "左右",
    touchForward: "前进",
    touchBack: "后退",
    endButton: "提前总结",
    modeBike: "骑单车",
    modeWalk: "步行",
    startMessage: (mode) => `阿铃：今天选择${mode}。按上前进、下后退、左右轻轻转向，沿着导航箭头去发光投递点。`,
    startMessageNamed: (name, mode) => `阿铃：${name}，今天选择${mode}。按上前进、下后退、左右轻轻转向，沿着导航箭头去发光投递点。`,
    rest: "阿铃：我们休息一下，不着急。",
    resumeMsg: "阿铃：休息好了，我们继续慢慢来。",
    flying: "阿铃：报纸飞过去了！",
    closer: "阿铃：再靠近一点点。等头上出现报纸标记，就可以放心投递。",
    paperReadyLabel: "可投递",
    delivered: (thanks) => `阿铃：送到了！${thanks}`,
    comicThrow: "投啦!",
    comicHint: "再近一点!",
    comicSuccess: "咚! 谢谢!",
    todaySummary: "今日总结",
    stopToday: "今天先到这里",
    doneToday: "今天也送到了",
    summaryLead: (count) => `阿铃：你完成了 ${count} 户送报，收到了 ${count} 句感谢。今天也辛苦了。`,
    deliveredCount: "今日送达",
    route: "今日路线",
    mode: "移动方式",
    home: "回到首页",
    walkAgain: "步行再来一次",
    bikeAgain: "骑单车再来一次",
    routeBike: "单车远行路线",
    routeWalk: "步行安心路线",
    thanksLabel: "谢谢!",
    navStraight: "阿铃：顺着这条路慢慢走就好。",
    navLeft: "阿铃：前方差不多要向左转。",
    navRight: "阿铃：前方差不多要向右转。",
    navArrive: "阿铃：快到了，看到小光圈就可以投递。",
    thoughtNext: (name) => `嗯……下一个是${name}呢。`,
    safetyPedestrian: "阿铃：前面有人散步，我们慢一点。",
    safetyCyclist: "阿铃：有自行车经过，先稳稳地骑。",
    safetyAnimal: "阿铃：小动物在路边，温柔地绕过去。",
  },
  zhHant: {
    lang: "zh-TW",
    stamp: "昭和町內會",
    eyebrow: "第三人稱 3D 送報",
    titleKicker: "陪伴型 3D 送報",
    titleStart: "點擊開始",
    titleSoundNote: "點擊後會開啟音樂和音效權限",
    homeTitle: "今天騎車送報",
    greetingFirst: "今天我會陪你在更大的町內慢慢送報。",
    greetingLast: (count) => `上次你送到了 ${count} 戶，大家都很高興。今天也慢慢來。`,
    companionHello: (tail) => `阿鈴：早安，見到你真高興。${tail}`,
    companionHelloNamed: (name, tail) => `阿鈴：${name}，早安，見到你真高興。${tail}`,
    chooseMode: "選擇移動方式",
    playerNameLabel: "你的名字",
    playerNameHelp: "可以直接使用預設名字，也可以輸入家人熟悉的稱呼。",
    statusQuestion: "今天狀態怎麼樣？",
    status_tired: "有點累",
    status_tired_hint: "少送幾戶，速度更慢。",
    status_normal: "還不錯",
    status_normal_hint: "標準節奏，輕鬆完成。",
    status_good: "精神很好",
    status_good_hint: "路線稍長，多走幾戶。",
    defaultPlayerNames: ["春日先生", "青山女士", "松風先生", "花見女士"],
    companionNames: ["小鈴", "小春", "小梅", "小空"],
    startBike: "開始騎單車",
    startBikeHint: "預設模式，沿著道路送報",
    startWalk: "改為步行",
    startWalkHint: "速度慢、路線短、最安心",
    homeNote: "預設騎單車。進入後：↑/W 前進，↓/S 後退，←/A 和 →/D 輕輕轉向；靠近路邊發光房子後按「投遞報紙」。",
    todayTask: "今日任務",
    ready: "準備出發",
    controls: "↑/W 前進，↓/S 後退，←→ 轉向。",
    targetDone: "今天的報紙都送到了",
    summaryReady: "準備查看總結。",
    deliverTo: (i, total, name) => `${i}/${total} 送給：${name}`,
    targetHint: (paper) => `靠近發光投遞點，按空白鍵或大按鈕投遞「${paper}」。`,
    pause: "休息",
    resume: "繼續",
    deliverButton: "投遞報紙",
    touchSteer: "左右",
    touchForward: "前進",
    touchBack: "後退",
    endButton: "提前總結",
    modeBike: "騎單車",
    modeWalk: "步行",
    startMessage: (mode) => `阿鈴：今天選擇${mode}。按上前進、下後退、左右輕輕轉向，沿著導航箭頭去發光投遞點。`,
    startMessageNamed: (name, mode) => `阿鈴：${name}，今天選擇${mode}。按上前進、下後退、左右輕輕轉向，沿著導航箭頭去發光投遞點。`,
    rest: "阿鈴：我們休息一下，不著急。",
    resumeMsg: "阿鈴：休息好了，我們繼續慢慢來。",
    flying: "阿鈴：報紙飛過去了！",
    closer: "阿鈴：再靠近一點點。等頭上出現報紙標記，就可以放心投遞。",
    paperReadyLabel: "可投遞",
    delivered: (thanks) => `阿鈴：送到了！${thanks}`,
    comicThrow: "投啦!",
    comicHint: "再近一點!",
    comicSuccess: "咚! 謝謝!",
    todaySummary: "今日總結",
    stopToday: "今天先到這裡",
    doneToday: "今天也送到了",
    summaryLead: (count) => `阿鈴：你完成了 ${count} 戶送報，收到了 ${count} 句感謝。今天也辛苦了。`,
    deliveredCount: "今日送達",
    route: "今日路線",
    mode: "移動方式",
    home: "回到首頁",
    walkAgain: "步行再來一次",
    bikeAgain: "騎單車再來一次",
    routeBike: "單車遠行路線",
    routeWalk: "步行安心路線",
    thanksLabel: "謝謝!",
    navStraight: "阿鈴：順著這條路慢慢走就好。",
    navLeft: "阿鈴：前方差不多要向左轉。",
    navRight: "阿鈴：前方差不多要向右轉。",
    navArrive: "阿鈴：快到了，看到小光圈就可以投遞。",
    thoughtNext: (name) => `嗯……下一個是${name}呢。`,
    safetyPedestrian: "阿鈴：前面有人散步，我們慢一點。",
    safetyCyclist: "阿鈴：有自行車經過，先穩穩地騎。",
    safetyAnimal: "阿鈴：小動物在路邊，溫柔地繞過去。",
  },
  ja: {
    lang: "ja",
    stamp: "昭和町内会",
    eyebrow: "三人称 3D 新聞配達",
    titleKicker: "寄り添う 3D 新聞配達",
    titleStart: "クリックして始める",
    titleSoundNote: "クリックすると音楽と効果音を有効にします",
    homeTitle: "今日も自転車で配達",
    greetingFirst: "今日は大きな町内を、いっしょにゆっくり配達しましょう。",
    greetingLast: (count) => `前回は ${count} 軒に届けました。今日もゆっくり行きましょう。`,
    companionHello: (tail) => `アリン：おはようございます。会えてうれしいです。${tail}`,
    companionHelloNamed: (name, tail) => `アリン：${name}、おはようございます。会えてうれしいです。${tail}`,
    chooseMode: "移動方法を選ぶ",
    playerNameLabel: "お名前",
    playerNameHelp: "そのままでも、ご家族が呼びやすい名前でも大丈夫です。",
    statusQuestion: "今日の調子はいかがですか？",
    status_tired: "少し疲れた",
    status_tired_hint: "少なめに、ゆっくり進みます。",
    status_normal: "まあまあ",
    status_normal_hint: "いつもの安心ペースです。",
    status_good: "元気です",
    status_good_hint: "少し長めに配達します。",
    defaultPlayerNames: ["春日さん", "青山さん", "松風さん", "花見さん"],
    companionNames: ["すず", "はる", "うめ", "そら"],
    startBike: "自転車で始める",
    startBikeHint: "標準モード。道路に沿って配達します",
    startWalk: "歩いて配達",
    startWalkHint: "ゆっくり短い安心ルート",
    homeNote: "標準は自転車です。↑/W 前進、↓/S 後退、←/A・→/D でゆっくり方向転換。光る配達場所で新聞を投げます。",
    todayTask: "今日の配達",
    ready: "出発準備",
    controls: "↑/W 前進、↓/S 後退、←→ 方向転換。",
    targetDone: "今日の新聞はすべて届きました",
    summaryReady: "まとめを見ましょう。",
    deliverTo: (i, total, name) => `${i}/${total} ${name}へ配達`,
    targetHint: (paper) => `光る配達場所に近づき、スペースキーか大きなボタンで「${paper}」を投げます。`,
    pause: "休む",
    resume: "続ける",
    deliverButton: "新聞を投げる",
    touchSteer: "左右",
    touchForward: "すすむ",
    touchBack: "もどる",
    endButton: "まとめへ",
    modeBike: "自転車",
    modeWalk: "歩き",
    startMessage: (mode) => `アリン：今日は${mode}です。矢印に沿って光る配達場所へ行きましょう。`,
    startMessageNamed: (name, mode) => `アリン：${name}、今日は${mode}です。矢印に沿って光る配達場所へ行きましょう。`,
    rest: "アリン：少し休みましょう。急がなくて大丈夫です。",
    resumeMsg: "アリン：では、ゆっくり続けましょう。",
    flying: "アリン：新聞が飛んでいきます！",
    closer: "アリン：もう少し近づきましょう。頭上に新聞マークが出たら投げられます。",
    paperReadyLabel: "配達OK",
    delivered: (thanks) => `アリン：届きました！${thanks}`,
    comicThrow: "えいっ!",
    comicHint: "もう少し近く!",
    comicSuccess: "ドン! ありがとう!",
    todaySummary: "今日のまとめ",
    stopToday: "今日はここまで",
    doneToday: "今日も届きました",
    summaryLead: (count) => `アリン：${count} 軒に届け、${count} 回のありがとうをもらいました。おつかれさまでした。`,
    deliveredCount: "配達数",
    route: "ルート",
    mode: "移動方法",
    home: "ホームへ",
    walkAgain: "歩いてもう一度",
    bikeAgain: "自転車でもう一度",
    routeBike: "自転車ゆったりコース",
    routeWalk: "歩いて安心コース",
    thanksLabel: "ありがとう!",
    navStraight: "アリン：この道をゆっくり進みましょう。",
    navLeft: "アリン：この先で左へ曲がりましょう。",
    navRight: "アリン：この先で右へ曲がりましょう。",
    navArrive: "アリン：もうすぐです。小さな光の輪で投げましょう。",
    thoughtNext: (name) => `ええと……次は${name}ですね。`,
    safetyPedestrian: "アリン：前に散歩の人がいます。少しゆっくり行きましょう。",
    safetyCyclist: "アリン：自転車が通ります。落ち着いて進みましょう。",
    safetyAnimal: "アリン：小さな動物がいます。やさしくよけましょう。",
  },
  en: {
    lang: "en",
    stamp: "Showa Neighborhood",
    eyebrow: "Third-person 3D delivery",
    titleKicker: "Companion 3D delivery",
    titleStart: "Click to start",
    titleSoundNote: "Clicking enables music and sound effects",
    homeTitle: "Today’s bicycle route",
    greetingFirst: "I’ll ride with you through the neighborhood today.",
    greetingLast: (count) => `Last time you delivered to ${count} homes. Let’s take it easy today too.`,
    companionHello: (tail) => `Arin: Good morning. I’m happy to see you. ${tail}`,
    companionHelloNamed: (name, tail) => `Arin: Good morning, ${name}. I’m happy to see you. ${tail}`,
    chooseMode: "Choose travel mode",
    playerNameLabel: "Your name",
    playerNameHelp: "You may keep the default or enter a familiar family nickname.",
    statusQuestion: "How are you feeling today?",
    status_tired: "A bit tired",
    status_tired_hint: "Fewer homes and slower pace.",
    status_normal: "Doing okay",
    status_normal_hint: "A gentle standard route.",
    status_good: "Feeling good",
    status_good_hint: "A slightly longer route.",
    defaultPlayerNames: ["Mr. Haru", "Ms. Aoki", "Mr. Pine", "Ms. Hana"],
    companionNames: ["Suzu", "Haru", "Ume", "Sora"],
    startBike: "Start by bicycle",
    startBikeHint: "Default mode. Deliver along the road",
    startWalk: "Walk instead",
    startWalkHint: "Slower, shorter, easier route",
    homeNote: "Default is bicycle. ↑/W forward, ↓/S back, ←/A and →/D gently turn. Throw the paper at the glowing curbside spot.",
    todayTask: "Today’s task",
    ready: "Ready",
    controls: "↑/W forward, ↓/S back, ←→ turn.",
    targetDone: "All papers delivered today",
    summaryReady: "Ready for summary.",
    deliverTo: (i, total, name) => `${i}/${total} Deliver to ${name}`,
    targetHint: (paper) => `Get near the glowing delivery spot, then press Space or the big button to throw “${paper}”.`,
    pause: "Rest",
    resume: "Resume",
    deliverButton: "Throw paper",
    touchSteer: "Turn",
    touchForward: "Hold to go",
    touchBack: "Back",
    endButton: "Finish",
    modeBike: "bicycle",
    modeWalk: "walking",
    startMessage: (mode) => `Arin: Today we’ll use ${mode}. Follow the arrows to the glowing delivery spot.`,
    startMessageNamed: (name, mode) => `Arin: ${name}, today we’ll use ${mode}. Follow the arrows to the glowing delivery spot.`,
    rest: "Arin: Let’s rest for a moment. No rush.",
    resumeMsg: "Arin: Good. Let’s continue slowly.",
    flying: "Arin: The paper is flying!",
    closer: "Arin: A little closer. When the paper mark appears above you, you can throw.",
    paperReadyLabel: "Ready",
    delivered: (thanks) => `Arin: Delivered! ${thanks}`,
    comicThrow: "TOSS!",
    comicHint: "A bit closer!",
    comicSuccess: "THUMP! Thanks!",
    todaySummary: "Today’s summary",
    stopToday: "That’s enough for today",
    doneToday: "Delivered today",
    summaryLead: (count) => `Arin: You delivered to ${count} homes and received ${count} thanks. Great work today.`,
    deliveredCount: "Delivered",
    route: "Route",
    mode: "Mode",
    home: "Home",
    walkAgain: "Walk again",
    bikeAgain: "Bike again",
    routeBike: "Bicycle neighborhood route",
    routeWalk: "Gentle walking route",
    thanksLabel: "Thanks!",
    navStraight: "Arin: Keep going gently along this road.",
    navLeft: "Arin: We will turn left soon.",
    navRight: "Arin: We will turn right soon.",
    navArrive: "Arin: Almost there. Throw at the small glowing ring.",
    thoughtNext: (name) => `Hmm… next is ${name}.`,
    safetyPedestrian: "Arin: Someone is walking ahead. Let’s slow down gently.",
    safetyCyclist: "Arin: A bicycle is passing. Keep steady for a moment.",
    safetyAnimal: "Arin: A little animal is near the road. Let’s go around softly.",
  },
};

function detectLanguage() {
  const params = new URLSearchParams(window.location.search);
  const override = params.get("lang") || localStorage.getItem("bicycle-lang");
  if (["ja", "en", "zhHant", "zhHans"].includes(override)) return override;

  const lang = (navigator.language || "").toLowerCase();
  if (lang.startsWith("ja")) return "ja";
  if (lang.includes("tw") || lang.includes("hk") || lang.includes("mo") || lang.includes("hant")) return "zhHant";
  if (lang.startsWith("zh")) return "zhHans";
  return "en";
}

export const languageOptions = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "zhHant", label: "繁體中文" },
  { code: "zhHans", label: "简体中文" },
];

export let locale = detectLanguage();
export let i18n = dict[locale];
let companionName = "";

function localizedCompanionName() {
  const list = i18n.companionNames || dict.zhHans.companionNames;
  return companionName || list[0] || "小铃";
}

function withCompanionName(value) {
  if (typeof value !== "string") return value;
  const name = localizedCompanionName();
  return value
    .replaceAll("阿铃", name)
    .replaceAll("阿鈴", name)
    .replaceAll("アリン", name)
    .replace(/\bArin\b/g, name);
}

export function t(key, ...args) {
  const value = i18n[key] ?? dict.zhHans[key] ?? key;
  return withCompanionName(typeof value === "function" ? value(...args) : value);
}

export function setCompanionName(name) {
  companionName = name || "";
}

export function getLocalizedList(key) {
  return i18n[key] ?? dict.zhHans[key] ?? [];
}

export function nt(neighbor, field) {
  return neighbor?.l10n?.[locale]?.[field]
    ?? neighbor?.l10n?.zhHans?.[field]
    ?? neighbor?.[field]
    ?? "";
}

export function applyDocumentLanguage() {
  document.documentElement.lang = i18n.lang;
  document.documentElement.dataset.locale = locale;
}

export function changeLanguage(nextLocale) {
  if (!languageOptions.some((item) => item.code === nextLocale) || nextLocale === locale) return false;
  locale = nextLocale;
  i18n = dict[locale];
  localStorage.setItem("bicycle-lang", nextLocale);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", nextLocale);
  window.history.replaceState({}, "", url.toString());
  applyDocumentLanguage();
  window.dispatchEvent(new CustomEvent("bicycle-language-change", { detail: { locale } }));
  return true;
}
