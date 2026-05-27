import { neighbors } from "./data/neighbors.js";
import { buildConfig, pickRoute } from "./game/difficulty.js";
import { tryDeliver, updatePlayer } from "./game/delivery.js";
import { bindKeyboard } from "./input/keyboard.js";
import { Renderer } from "./render/renderer.js";
import { createInitialState } from "./state/gameState.js";
import { loadRecord, saveRecord, todayKey } from "./state/storage.js";
import { Hud } from "./ui/hud.js";
import { Screens } from "./ui/screens.js";

export class App {
  constructor() {
    this.state = createInitialState();
    this.renderer = new Renderer(document.getElementById("gameCanvas"));
    this.screens = new Screens(document.getElementById("ui"));
    this.hud = new Hud();
  }

  start() {
    this.bindEvents();
    this.showHome();
    requestAnimationFrame((time) => this.loop(time));
  }

  bindEvents() {
    window.addEventListener("resize", () => this.renderer.resize());
    bindKeyboard(this.state, () => this.deliver());

    this.screens.root.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "home") this.showHome();
      if (action === "status") this.showStatusForm();
      if (action === "play") this.startGame();
      if (button.dataset.memory) this.answerMemory(button.dataset.memory);
    });

    this.screens.root.addEventListener("submit", (event) => {
      if (event.target.id !== "statusForm") return;
      event.preventDefault();
      const data = new FormData(event.target);
      this.state.answers = Object.fromEntries(data.entries());
      this.showBriefing();
    });

    this.hud.deliverBtn.addEventListener("click", () => this.deliver());
    this.hud.pauseBtn.addEventListener("click", () => this.togglePause());
    this.hud.endBtn.addEventListener("click", () => this.showSummary(true));
  }

  showHome() {
    this.state.screen = "home";
    this.state.isPlaying = false;
    this.hud.hide();
    this.screens.home(loadRecord());
  }

  showStatusForm() {
    this.state.screen = "status";
    this.state.isPlaying = false;
    this.hud.hide();
    this.screens.statusForm();
  }

  showBriefing() {
    this.state.config = buildConfig(this.state.answers);
    this.state.route = pickRoute(neighbors, this.state.config);
    this.state.delivered = [];
    this.state.player = { x: -350, y: 18, facing: 1 };
    this.state.message = "阿铃：不着急，我们慢慢来。";
    this.screens.briefing(this.state);
  }

  startGame() {
    this.state.screen = "game";
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.state.message = "阿铃：不着急，我们慢慢走。先看发光的目标。";
    this.screens.clear();
    this.hud.show();
    this.hud.update(this.state);
  }

  answerMemory(answer) {
    const feedback = document.getElementById("memoryFeedback");
    if (!feedback) return;
    feedback.textContent =
      answer === "山本夫妇"
        ? "阿铃：对啦！蓝色屋顶是山本夫妇家。"
        : "阿铃：没关系，我们一起记。蓝色屋顶是山本夫妇家。";
  }

  deliver() {
    if (!this.state.isPlaying || this.state.isPaused) return;
    const result = tryDeliver(this.state);
    this.hud.update(this.state);
    if (result.completed) window.setTimeout(() => this.showSummary(false), 550);
  }

  togglePause() {
    this.state.isPaused = !this.state.isPaused;
    this.state.message = this.state.isPaused ? "阿铃：我们休息一下，不着急。" : "阿铃：休息好了，我们继续慢慢来。";
    this.hud.update(this.state);
  }

  showSummary(early) {
    this.state.isPlaying = false;
    this.hud.hide();
    const count = this.state.delivered.length;
    const record = loadRecord();
    record.lastSummary = {
      date: todayKey(),
      count,
      thanks: count,
      mode: this.state.config?.moveMode || "walk",
    };
    saveRecord(record);
    this.screens.summary(this.state, early);
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.state.lastTime) / 1000);
    this.state.lastTime = now;
    this.state.floatTime += dt;
    updatePlayer(this.state, dt);
    this.renderer.render(this.state);
    requestAnimationFrame((time) => this.loop(time));
  }
}
