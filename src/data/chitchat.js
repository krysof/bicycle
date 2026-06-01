const BANKS = {
  zhHans: {
    openers: [
      "今天的风很轻，", "这条街看起来很安静，", "慢慢骑着看风景，", "路边的树影很好看，", "小鸟飞过屋顶，",
      "前面的街角很熟悉，", "阳光落在路面上，", "报纸在包里放得很整齐，", "听到远处的生活声，", "这附近有家的味道，",
      "我们不用着急，", "沿着道路稳稳前进，", "如果累了就休息一下，", "便利店的招牌亮亮的，", "河边的风应该很舒服，",
      "今天也有人等着早报，", "转过这个街区，", "看到花盆就想停下看一眼，", "骑车铃声轻轻响，", "小路口要慢一点，",
      "天空看起来很柔和，", "每一户门前都有小故事，"
    ],
    middles: [
      "我们把今天的事一件件做好，", "记得看清门牌再投递，", "先确认前方有没有人，", "把速度放平稳就好，",
      "送报也是和街坊打招呼，", "看见熟悉的屋顶会安心，", "遇到小动物就温柔绕开，", "听一听脚步和车轮的节奏，",
      "报纸要送到等它的人手里，", "不用和任何人比赛，", "走过的路会慢慢记住，", "想不起名字也没关系，",
      "我们可以看颜色和招牌，", "慢一点反而更安全，", "一边走一边想下一户，", "遇到路口就先看看左右，",
      "今天的社区也很热闹，", "风吹过树叶的声音很好听，", "看到河堤就知道方向了，", "灯柱和邮箱都是好线索，",
      "把心情放轻松，", "今天已经做得很好，"
    ],
    closers: [
      "一会儿就到了。", "这样很稳。", "我会陪着你。", "我们慢慢来。", "不用担心。", "真是舒服的一天。",
      "下一步也很清楚。", "路上注意安全。", "有人收到会很开心。", "先深呼吸一下。", "继续保持这个节奏。",
      "如果想停也可以停。", "这里的街景很温暖。", "小心但不用紧张。", "这份心意会送到的。", "走到前面再看一眼。",
      "今天的你很可靠。", "我们一起完成它。", "看见目标就稳稳投。", "路边的绿意很漂亮。", "慢慢记住这条路。",
      "这样就很好。"
    ],
  },
  zhHant: {
    openers: [
      "今天的風很輕，", "這條街看起來很安靜，", "慢慢騎著看風景，", "路邊的樹影很好看，", "小鳥飛過屋頂，",
      "前面的街角很熟悉，", "陽光落在路面上，", "報紙在包裡放得很整齊，", "聽到遠處的生活聲，", "這附近有家的味道，",
      "我們不用著急，", "沿著道路穩穩前進，", "如果累了就休息一下，", "便利店的招牌亮亮的，", "河邊的風應該很舒服，",
      "今天也有人等著早報，", "轉過這個街區，", "看到花盆就想停下看一眼，", "車鈴聲輕輕響，", "小路口要慢一點，",
      "天空看起來很柔和，", "每一戶門前都有小故事，"
    ],
    middles: [
      "我們把今天的事一件件做好，", "記得看清門牌再投遞，", "先確認前方有沒有人，", "把速度放平穩就好，",
      "送報也是和街坊打招呼，", "看見熟悉的屋頂會安心，", "遇到小動物就溫柔繞開，", "聽一聽腳步和車輪的節奏，",
      "報紙要送到等它的人手裡，", "不用和任何人比賽，", "走過的路會慢慢記住，", "想不起名字也沒關係，",
      "我們可以看顏色和招牌，", "慢一點反而更安全，", "一邊走一邊想下一戶，", "遇到路口就先看看左右，",
      "今天的社區也很熱鬧，", "風吹過樹葉的聲音很好聽，", "看到河堤就知道方向了，", "燈柱和信箱都是好線索，",
      "把心情放輕鬆，", "今天已經做得很好，"
    ],
    closers: [
      "一會兒就到了。", "這樣很穩。", "我會陪著你。", "我們慢慢來。", "不用擔心。", "真是舒服的一天。",
      "下一步也很清楚。", "路上注意安全。", "有人收到會很開心。", "先深呼吸一下。", "繼續保持這個節奏。",
      "如果想停也可以停。", "這裡的街景很溫暖。", "小心但不用緊張。", "這份心意會送到的。", "走到前面再看一眼。",
      "今天的你很可靠。", "我們一起完成它。", "看見目標就穩穩投。", "路邊的綠意很漂亮。", "慢慢記住這條路。",
      "這樣就很好。"
    ],
  },
  ja: {
    openers: [
      "今日は風がやさしくて、", "この通りは落ち着いていて、", "ゆっくり進むと景色が見えて、", "道ばたの木かげがきれいで、", "鳥が屋根の上を飛んで、",
      "前の角は少しなじみがあって、", "日差しが路面に落ちて、", "新聞はかばんの中で整っていて、", "遠くから暮らしの音がして、", "このあたりは家の匂いがして、",
      "急がなくてもよくて、", "道に沿って落ち着いて進んで、", "疲れたら休めばよくて、", "コンビニの看板が見えて、", "川辺の風が気持ちよさそうで、",
      "今日も朝刊を待つ人がいて、", "この街区を曲がると、", "植木鉢を見ると少し立ち止まりたくて、", "自転車のベルがやさしく鳴って、", "小さな交差点はゆっくりで、",
      "空がやわらかく見えて、", "一軒一軒の前に小さな物語があって、"
    ],
    middles: [
      "今日のことを一つずつ進めましょう、", "表札を見てから届けましょう、", "前に人がいないか見ましょう、", "速さは落ち着いたままで大丈夫、",
      "新聞配達はご近所へのあいさつでもあって、", "見慣れた屋根を見ると安心して、", "小さな動物にはやさしく気をつけて、", "足音と車輪のリズムを聞いて、",
      "待っている人へ新聞を届けましょう、", "誰かと競争しなくてよくて、", "通った道は少しずつ覚えて、", "名前を思い出せなくても大丈夫、",
      "色や看板を手がかりにして、", "ゆっくりのほうが安全で、", "次のお宅を思いながら進んで、", "角では左右を見て、",
      "今日の町もにぎやかで、", "葉っぱの音が心地よくて、", "堤防が見えたら方向がわかって、", "電柱や郵便受けも目印になって、",
      "気持ちは軽くして、", "今日もよくできています、"
    ],
    closers: [
      "もう少しで着きます。", "とても安定しています。", "そばにいますよ。", "ゆっくり行きましょう。", "心配いりません。", "気持ちのよい日ですね。",
      "次もわかりやすいです。", "安全に進みましょう。", "受け取る人も喜びます。", "少し深呼吸しましょう。", "この調子で大丈夫です。",
      "止まりたい時は止まりましょう。", "この街並みはあたたかいですね。", "気をつければ大丈夫です。", "この気持ちは届きます。", "前でまた確認しましょう。",
      "今日のあなたは頼もしいです。", "一緒に終わらせましょう。", "目標が見えたら落ち着いて投げましょう。", "道ばたの緑がきれいです。", "少しずつ道を覚えましょう。",
      "それで十分です。"
    ],
  },
  en: {
    openers: [
      "The breeze feels gentle today, ", "This street feels calm, ", "Riding slowly lets us see the scenery, ", "The tree shade looks lovely, ", "A bird crosses the rooftops, ",
      "That corner feels familiar, ", "Sunlight is resting on the road, ", "The papers are tidy in the bag, ", "There are soft sounds of daily life, ", "This neighborhood feels like home, ",
      "There is no need to rush, ", "We can follow the road steadily, ", "If you feel tired, we can rest, ", "The shop sign is bright, ", "The river breeze should feel nice, ",
      "Someone is waiting for the morning paper, ", "After this block, ", "Those flowerpots make the street feel warm, ", "The bicycle bell sounds softly, ", "Small corners are best taken slowly, ",
      "The sky looks soft today, ", "Every doorway has a small story, "
    ],
    middles: [
      "let’s do today’s route one step at a time, ", "we can check the nameplate before delivering, ", "let’s see if anyone is ahead, ", "a steady pace is just right, ",
      "delivering papers is also a friendly greeting, ", "familiar rooftops feel reassuring, ", "we can be gentle around small animals, ", "the footsteps and wheels have a nice rhythm, ",
      "the paper should reach the person waiting for it, ", "we are not racing anyone, ", "the route will become familiar little by little, ", "it is fine if a name slips your mind, ",
      "colors and signs can guide us, ", "slower is often safer, ", "we can think about the next home as we go, ", "we can look both ways at corners, ",
      "the community feels lively today, ", "the sound of leaves is pleasant, ", "the riverbank helps us know the direction, ", "mailboxes and poles are good clues, ",
      "let’s keep the heart light, ", "you are doing well already, "
    ],
    closers: [
      "we will be there soon.", "that is very steady.", "I am right here with you.", "let’s take it slowly.", "no need to worry.", "what a pleasant day.",
      "the next step is clear.", "let’s keep safe on the road.", "someone will be happy to receive it.", "let’s take a quiet breath.", "this pace is good.",
      "we can stop whenever you like.", "this town feels warm.", "careful, but not nervous.", "this kindness will arrive.", "we can check again ahead.",
      "you are dependable today.", "we will finish it together.", "when the target appears, deliver steadily.", "the roadside green is beautiful.", "we will remember this route little by little.",
      "this is just right."
    ],
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

export function chitchatCount(locale) {
  const bank = bankFor(locale);
  return bank.openers.length * bank.middles.length * bank.closers.length;
}

export function pickChitChat(locale, seed = Date.now()) {
  const bank = bankFor(locale);
  const count = chitchatCount(locale);
  const index = hashSeed(seed) % count;
  const middleIndex = index % bank.middles.length;
  const openerIndex = Math.floor(index / bank.middles.length) % bank.openers.length;
  const closerIndex = Math.floor(index / (bank.middles.length * bank.openers.length)) % bank.closers.length;
  return `${bank.openers[openerIndex]}${bank.middles[middleIndex]}${bank.closers[closerIndex]}`;
}
