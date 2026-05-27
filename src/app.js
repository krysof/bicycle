import { neighbors } from "./data/neighbors.js";
import { answersFromProfile, buildConfig, pickRoute } from "./game/difficulty.js";
import { tryDeliver, updatePlayer } from "./game/delivery.js";
import { bindKeyboard } from "./input/keyboard.js";
import { ThreeRenderer } from "./render/threeRenderer.js";
import { createInitialState } from "./state/gameState.js";
import { loadRecord, saveRecord, todayKey } from "./state/storage.js";
import { Hud } from "./ui/hud.js";
import { Screens } from "./ui/screens.js";

export class App {
  constructor() {
    this.state = createInitialState();
    this.renderer = new ThreeRenderer(document.getElementById("gameCanvas"));
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
      if (button.dataset.quick) this.quickStart(button.dataset.quick);
      if (button.dataset.action === "home") this.showHome();
    });

    this.hud.deliverBtn.addEventListener("click", () => this.deliver());
    this.hud.pauseBtn.addEventListener("click", () => this.togglePause());
    this.hud.endBtn.addEventListener("click", () => this.showSummary(true));
  }

  showHome() {
    this.state.screen = "home";
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.keys.clear();
    this.hud.hide();
    this.screens.home(loadRecord());
  }

  quickStart(profile) {
    this.state.answers = answersFromProfile(profile);
    this.state.config = buildConfig(this.state.answers);
    this.state.route = pickRoute(neighbors, this.state.config);
    this.state.delivered = [];
    this.state.player = { x: -350, y: 18, facing: 1 };
    this.startGame();
  }

  startGame() {
    this.state.screen = "game";
    this.state.isPlaying = true;
    this.state.isPaused = false;
    const mode = this.state.config.moveMode === "bike" ? "骑车" : "步行";
    this.state.message = `阿铃：今天是${this.state.config.routeName}，我们${mode}慢慢送。看发光的房子就好。`;
    this.screens.clear();
    this.hud.show();
    this.hud.update(this.state);
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
    this.state.keys.clear();
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
