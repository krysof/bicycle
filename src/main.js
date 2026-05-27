const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const ui = document.getElementById("ui");
const hud = document.getElementById("hud");
const targetName = document.getElementById("targetName");
const targetHint = document.getElementById("targetHint");
const companionLine = document.getElementById("companionLine");
const deliverBtn = document.getElementById("deliverBtn");
const pauseBtn = document.getElementById("pauseBtn");
const endBtn = document.getElementById("endBtn");

const STORAGE_KEY = "newspaper_companion_daily_record_v1";

const neighbors = [
  {
    id: "tanaka",
    name: "田中先生",
    x: -210,
    y: -120,
    roof: "#d66b53",
    wall: "#ffe2bd",
    paper: "体育报",
    clue: "红色屋顶，门口有篮球",
    thanks: "田中先生：今天的体育新闻来得正好，谢谢你！",
  },
  {
    id: "suzuki",
    name: "铃木奶奶",
    x: 40,
    y: -160,
    roof: "#ba5f91",
    wall: "#ffe8ef",
    paper: "园艺报",
    clue: "粉色屋顶，院子有红花",
    thanks: "铃木奶奶：我正想看看花草专栏呢，辛苦你啦。",
  },
  {
    id: "yamamoto",
    name: "山本夫妇",
    x: 260,
    y: -60,
    roof: "#4e8fd6",
    wall: "#dfeeff",
    paper: "早报",
    clue: "蓝色屋顶，白色小栅栏",
    thanks: "山本夫妇：你总是很准时，今天也谢谢。",
  },
  {
    id: "kobayashi",
    name: "小林医生",
    x: -90,
    y: 130,
    roof: "#58a778",
    wall: "#dcf5df",
    paper: "健康报",
    clue: "绿色屋顶，靠近诊所牌子",
    thanks: "小林医生：健康报到了，我也要提醒大家多喝水。",
  },
  {
    id: "sato",
    name: "佐藤爷爷",
    x: 190,
    y: 160,
    roof: "#d59b35",
    wall: "#fff0c9",
    paper: "社区通知",
    clue: "黄色屋顶，门口有长椅",
    thanks: "佐藤爷爷：社区通知很重要，谢谢你记得我。",
  },
];

const questions = [
  {
    id: "energy",
    title: "今天精神怎么样？",
    options: [
      ["good", "很好"],
      ["normal", "普通"],
      ["tired", "有点累"],
    ],
  },
  {
    id: "hands",
    title: "今天手指操作方便吗？",
    options: [
      ["easy", "很灵活"],
      ["ok", "还可以"],
      ["hard", "不太方便"],
    ],
  },
  {
    id: "duration",
    title: "今天想玩多久？",
    options: [
      ["3", "3 分钟"],
      ["5", "5 分钟"],
      ["10", "10 分钟"],
    ],
  },
  {
    id: "moveMode",
    title: "今天想怎么送报？",
    options: [
      ["walk", "步行"],
      ["bike", "骑单车"],
      ["auto", "让阿铃帮我选"],
    ],
  },
];

const state = {
  screen: "home",
  answers: {},
  config: null,
  route: [],
  delivered: [],
  player: { x: -330, y: 10 },
  keys: new Set(),
  isPlaying: false,
  isPaused: false,
  message: "阿铃：今天见到你真高兴。",
  lastTime: performance.now(),
};

function resize() {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadRecord() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveRecord(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function showHome() {
  state.screen = "home";
  state.isPlaying = false;
  hud.classList.add("hidden");
  const record = loadRecord();
  const last = record.lastSummary;
  const yesterday = last
    ? `我还记得上次你送到了 ${last.count} 户，收到了 ${last.thanks} 句感谢。`
    : "今天是我们第一次出发，我会一直陪着你。";

  ui.innerHTML = `
    <section class="screen narrow">
      <p class="eyebrow">陪伴型 3D 送报原型</p>
      <h1>今天也要送到</h1>
      <p class="lead">阿铃：早上好，见到你真高兴。${yesterday}</p>
      <div class="cards">
        <div class="card"><strong>有人陪伴</strong><p>开局问候、途中鼓励、完成感谢。</p></div>
        <div class="card"><strong>轻松用脑</strong><p>记住邻居、选择报纸、寻找线索。</p></div>
        <div class="card"><strong>联机预留</strong><p>后续支持家人留言、结伴送报、友好对战。</p></div>
      </div>
      <div class="button-row">
        <button class="primary" data-action="status">开始今天的问候</button>
        <button class="secondary" data-action="coop" disabled>结伴送报：后续开放</button>
      </div>
    </section>
  `;
}

function showStatusForm() {
  state.screen = "status";
  hud.classList.add("hidden");
  const form = questions
    .map(
      (q) => `
      <fieldset class="question">
        <legend><h2>${q.title}</h2></legend>
        <div class="choices">
          ${q.options
            .map(
              ([value, label], index) => `
              <label class="choice">
                <input type="radio" name="${q.id}" value="${value}" ${index === 1 ? "checked" : ""} />
                <span>${label}</span>
              </label>`
            )
            .join("")}
        </div>
      </fieldset>`
    )
    .join("");

  ui.innerHTML = `
    <section class="screen">
      <p class="eyebrow">阿铃的每日关心</p>
      <h1>今天感觉怎么样？</h1>
      <p class="lead">这些回答只用来帮你安排今天的路线。没有好坏，也没有考试。</p>
      <form id="statusForm">
        ${form}
        <div class="button-row">
          <button class="primary" type="submit">安排今天的路线</button>
          <button type="button" data-action="home">返回</button>
        </div>
      </form>
    </section>
  `;
}

function buildConfig() {
  const a = state.answers;
  let count = 4;
  if (a.energy === "tired" || a.duration === "3") count = 3;
  if (a.energy === "good" && a.duration === "10") count = 5;

  const moveMode = a.moveMode === "auto" ? (a.energy === "good" ? "bike" : "walk") : a.moveMode;
  const routeName = count <= 3 ? "轻松路线" : count === 4 ? "标准路线" : "活力路线";
  const assistRadius = a.hands === "hard" ? 135 : a.hands === "ok" ? 110 : 90;
  const speedBase = moveMode === "bike" ? 135 : 82;
  const speed = a.energy === "tired" ? speedBase * 0.78 : speedBase;
  const memoryCount = count <= 3 || a.hands === "hard" ? 1 : 2;

  return { count, moveMode, routeName, assistRadius, speed, memoryCount };
}

function pickRoute() {
  const selected = [...neighbors];
  selected.sort((a, b) => Math.hypot(a.x + 330, a.y - 10) - Math.hypot(b.x + 330, b.y - 10));
  return selected.slice(0, state.config.count);
}

function showBriefing() {
  state.config = buildConfig();
  state.route = pickRoute();
  state.delivered = [];
  state.player = { x: -330, y: 10 };

  const memoryTarget = neighbors.find((n) => n.roof === "#4e8fd6");
  const cards = state.route
    .map(
      (n, i) => `
      <div class="card">
        <strong>${i + 1}. ${n.name}</strong>
        <p>报纸：${n.paper}</p>
        <p>线索：${n.clue}</p>
      </div>`
    )
    .join("");

  ui.innerHTML = `
    <section class="screen">
      <p class="eyebrow">${state.config.routeName}</p>
      <h1>今天我们送 ${state.route.length} 户</h1>
      <p class="lead">阿铃：今天使用「${state.config.moveMode === "bike" ? "骑单车" : "步行"}」模式。靠近住户后按 <kbd>空格</kbd> 或点击大按钮投递。</p>
      <div class="cards">${cards}</div>
      <div class="question">
        <h2>出发前想一想</h2>
        <p>蓝色屋顶的是哪一家？答错也没关系，阿铃会提醒你。</p>
        <div class="button-row">
          <button data-memory="${memoryTarget.name}">${memoryTarget.name}</button>
          <button data-memory="铃木奶奶">铃木奶奶</button>
          <button data-memory="田中先生">田中先生</button>
        </div>
        <p id="memoryFeedback"></p>
      </div>
      <div class="button-row">
        <button class="primary" data-action="play">领取报纸，出发</button>
        <button data-action="status">重新选择状态</button>
      </div>
    </section>
  `;
}

function startGame() {
  state.screen = "game";
  state.isPlaying = true;
  state.isPaused = false;
  state.message = "阿铃：不着急，我们慢慢走。先看发光的目标。";
  ui.innerHTML = "";
  hud.classList.remove("hidden");
  updateHud();
}

function currentTarget() {
  return state.route[state.delivered.length];
}

function updateHud() {
  const target = currentTarget();
  if (!target) {
    targetName.textContent = "今天的报纸都送到了";
    targetHint.textContent = "准备查看总结。";
  } else {
    targetName.textContent = `下一户：${target.name}`;
    targetHint.textContent = `请送「${target.paper}」。线索：${target.clue}`;
  }
  companionLine.textContent = state.message;
}

function deliverPaper() {
  if (!state.isPlaying || state.isPaused) return;
  const target = currentTarget();
  if (!target) return showSummary(false);

  const distance = Math.hypot(state.player.x - target.x, state.player.y - target.y);
  if (distance <= state.config.assistRadius) {
    state.delivered.push(target.id);
    state.message = `阿铃：送到了！${target.thanks}`;
    if (!currentTarget()) {
      window.setTimeout(() => showSummary(false), 550);
    }
  } else {
    state.message = "阿铃：再靠近一点点就可以了。我会在目标旁边画一个发光圈。";
  }
  updateHud();
}

function showSummary(early) {
  state.isPlaying = false;
  hud.classList.add("hidden");

  const count = state.delivered.length;
  const record = loadRecord();
  record.lastSummary = {
    date: todayKey(),
    count,
    thanks: count,
    mode: state.config?.moveMode || "walk",
  };
  saveRecord(record);

  ui.innerHTML = `
    <section class="screen narrow">
      <p class="eyebrow">今日总结</p>
      <h1>${early ? "今天先到这里" : "今天也送到了"}</h1>
      <p class="lead">阿铃：你完成了 ${count} 户送报，收到了 ${count} 句感谢。今天也辛苦了。</p>
      <div class="cards">
        <div class="card"><strong>${count} 户</strong><p>今日送达</p></div>
        <div class="card"><strong>${state.config?.routeName || "轻松路线"}</strong><p>今日路线</p></div>
        <div class="card"><strong>${state.config?.moveMode === "bike" ? "骑单车" : "步行"}</strong><p>移动方式</p></div>
      </div>
      <p>后续版本这里会加入：给家人留一句话、收到家人鼓励、结伴送报成绩卡。</p>
      <div class="button-row">
        <button class="primary" data-action="home">回到首页</button>
        <button data-action="status">再送一次</button>
      </div>
    </section>
  `;
}

function iso(x, y, z = 0) {
  return {
    x: window.innerWidth / 2 + (x - y) * 0.78,
    y: window.innerHeight * 0.33 + (x + y) * 0.38 - z,
  };
}

function drawIsoPoly(points, fill, stroke = "rgba(38,48,56,.15)") {
  ctx.beginPath();
  points.forEach((p, index) => {
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawBox(x, y, w, d, h, wall, roof) {
  const p1 = iso(x - w / 2, y - d / 2, 0);
  const p2 = iso(x + w / 2, y - d / 2, 0);
  const p3 = iso(x + w / 2, y + d / 2, 0);
  const p4 = iso(x - w / 2, y + d / 2, 0);
  const q1 = iso(x - w / 2, y - d / 2, h);
  const q2 = iso(x + w / 2, y - d / 2, h);
  const q3 = iso(x + w / 2, y + d / 2, h);
  const q4 = iso(x - w / 2, y + d / 2, h);

  drawIsoPoly([p2, p3, q3, q2], shade(wall, -8));
  drawIsoPoly([p3, p4, q4, q3], shade(wall, -18));
  drawIsoPoly([q1, q2, q3, q4], roof);

  const door = iso(x + 10, y + d / 2 + 2, 18);
  ctx.fillStyle = "rgba(88,62,42,.75)";
  ctx.fillRect(door.x - 7, door.y - 16, 14, 25);
}

function shade(hex, amount) {
  const num = Number.parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

function drawCircleIso(x, y, radius, color, width = 4) {
  const p = iso(x, y, 2);
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, radius * 0.85, radius * 0.45, 0, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawScene() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const sky = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  sky.addColorStop(0, "#dff0ff");
  sky.addColorStop(0.55, "#f6efd7");
  sky.addColorStop(1, "#d7ead2");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  const ground = [iso(-520, -320), iso(520, -320), iso(520, 340), iso(-520, 340)];
  drawIsoPoly(ground, "#bfe2aa", "rgba(90,130,75,.18)");

  drawRoad(-420, 0, 860, 70);
  drawRoad(0, -260, 70, 580);

  neighbors.forEach((n) => {
    const isDone = state.delivered.includes(n.id);
    const isCurrent = currentTarget()?.id === n.id;
    if (isCurrent) drawCircleIso(n.x, n.y, state.config?.assistRadius || 100, "rgba(240,180,77,.95)", 5);
    drawBox(n.x, n.y, 92, 78, 58, n.wall, isDone ? "#9aa7b2" : n.roof);
    drawMailbox(n.x + 55, n.y + 32, isDone);
    drawLabel(n.name, n.x, n.y, isCurrent ? "#2f7d5c" : "#3d4a5a");
  });

  drawPark();
  drawPlayer();
}

function drawRoad(x, y, w, d) {
  drawIsoPoly(
    [iso(x - w / 2, y - d / 2), iso(x + w / 2, y - d / 2), iso(x + w / 2, y + d / 2), iso(x - w / 2, y + d / 2)],
    "#d6c4a3",
    "rgba(96,72,44,.18)"
  );
}

function drawMailbox(x, y, done) {
  const p = iso(x, y, 20);
  ctx.fillStyle = done ? "#8aa08c" : "#de6b55";
  ctx.fillRect(p.x - 8, p.y - 18, 16, 13);
  ctx.fillStyle = "#5b4539";
  ctx.fillRect(p.x - 2, p.y - 5, 4, 24);
}

function drawLabel(text, x, y, color) {
  const p = iso(x, y, 78);
  ctx.font = "700 18px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,255,255,.92)";
  ctx.strokeText(text, p.x, p.y - 10);
  ctx.fillStyle = color;
  ctx.fillText(text, p.x, p.y - 10);
}

function drawPark() {
  const p = iso(-315, 190, 0);
  ctx.fillStyle = "#6aa96e";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 50, 24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7b593e";
  ctx.fillRect(p.x - 34, p.y - 18, 68, 10);
  ctx.fillRect(p.x - 28, p.y - 6, 8, 20);
  ctx.fillRect(p.x + 20, p.y - 6, 8, 20);
}

function drawPlayer() {
  const p = iso(state.player.x, state.player.y, 0);
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 5, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = state.config?.moveMode === "bike" ? "#334b6d" : "#2f7d5c";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 28, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f1c08f";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 47, 10, 0, Math.PI * 2);
  ctx.fill();

  if (state.config?.moveMode === "bike") {
    ctx.strokeStyle = "#263044";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x - 20, p.y - 6, 10, 0, Math.PI * 2);
    ctx.arc(p.x + 20, p.y - 6, 10, 0, Math.PI * 2);
    ctx.moveTo(p.x - 20, p.y - 6);
    ctx.lineTo(p.x, p.y - 22);
    ctx.lineTo(p.x + 20, p.y - 6);
    ctx.stroke();
  }
}

function update(dt) {
  if (!state.isPlaying || state.isPaused) return;

  let dx = 0;
  let dy = 0;
  if (state.keys.has("arrowup") || state.keys.has("w")) dy -= 1;
  if (state.keys.has("arrowdown") || state.keys.has("s")) dy += 1;
  if (state.keys.has("arrowleft") || state.keys.has("a")) dx -= 1;
  if (state.keys.has("arrowright") || state.keys.has("d")) dx += 1;

  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    state.player.x += (dx / len) * state.config.speed * dt;
    state.player.y += (dy / len) * state.config.speed * dt;
    state.player.x = Math.max(-430, Math.min(430, state.player.x));
    state.player.y = Math.max(-280, Math.min(300, state.player.y));
  }
}

function loop(now) {
  const dt = Math.min(0.05, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(dt);
  drawScene();
  requestAnimationFrame(loop);
}

ui.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const action = button.dataset.action;
  if (action === "home") showHome();
  if (action === "status") showStatusForm();
  if (action === "play") startGame();

  if (button.dataset.memory) {
    const feedback = document.getElementById("memoryFeedback");
    if (button.dataset.memory === "山本夫妇") {
      feedback.textContent = "阿铃：对啦！蓝色屋顶是山本夫妇家。";
    } else {
      feedback.textContent = "阿铃：没关系，我们一起记。蓝色屋顶是山本夫妇家。";
    }
  }
});

ui.addEventListener("submit", (event) => {
  if (event.target.id !== "statusForm") return;
  event.preventDefault();
  const data = new FormData(event.target);
  state.answers = Object.fromEntries(data.entries());
  showBriefing();
});

deliverBtn.addEventListener("click", deliverPaper);
pauseBtn.addEventListener("click", () => {
  state.isPaused = !state.isPaused;
  pauseBtn.textContent = state.isPaused ? "继续" : "暂停";
  state.message = state.isPaused ? "阿铃：我们休息一下，不着急。" : "阿铃：休息好了，我们继续慢慢来。";
  updateHud();
});
endBtn.addEventListener("click", () => showSummary(true));

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
    state.keys.add(key);
  }
  if (key === " " || key === "enter") {
    event.preventDefault();
    deliverPaper();
  }
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key.toLowerCase());
});

window.addEventListener("resize", resize);

resize();
showHome();
requestAnimationFrame(loop);
