import { neighbors } from "./data/neighbors.js";
import { answersFromMode, buildConfig, pickRoute } from "./game/difficulty.js";
import { requestDelivery, updateDelivery, updatePlayer } from "./game/delivery.js";
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
      if (button.dataset.mode) this.startWithMode(button.dataset.mode);
      if (button.dataset.quick) this.startWithMode(button.dataset.quick === "active" ? "bike" : "walk");
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
    this.state.delivery = null;
    this.state.comic = null;
    this.state.houseReaction = null;
    this.hud.hide();
    this.updateComic();
    this.screens.home(loadRecord());
  }

  startWithMode(mode) {
    this.state.answers = answersFromMode(mode);
    this.state.config = buildConfig(this.state.answers);
    this.state.route = pickRoute(neighbors, this.state.config);
    this.state.delivered = [];
    this.state.delivery = null;
    this.state.comic = null;
    this.state.houseReaction = null;
    this.state.player = { x: -4320, y: -3240, facing: 1, headingX: 1, headingY: 0, headingAngle: 0 };
    this.startGame();
  }

  startGame() {
    this.state.screen = "game";
    this.state.isPlaying = true;
    this.state.isPaused = false;
    const mode = this.state.config.moveMode === "bike" ? "骑单车" : "步行";
    this.state.message = `阿铃：今天选择${mode}。我会在后面陪着你，按上前进、下后退、左右轻轻转向，沿着大路看发光的房子就好。`;
    this.screens.clear();
    this.hud.show();
    this.hud.update(this.state);
  }

  deliver() {
    if (!this.state.isPlaying || this.state.isPaused) return;
    requestDelivery(this.state);
    this.hud.update(this.state);
  }

  togglePause() {
    this.state.isPaused = !this.state.isPaused;
    this.state.message = this.state.isPaused ? "阿铃：我们休息一下，不着急。" : "阿铃：休息好了，我们继续慢慢来。";
    this.hud.update(this.state);
  }

  updateComic() {
    const el = document.getElementById("comicBubble");
    if (!el) return;
    if (this.state.comic) {
      el.textContent = this.state.comic.text;
      el.className = `comic-bubble ${this.state.comic.tone || ""}`;
    } else {
      el.className = "comic-bubble hidden";
    }
  }

  showSummary(early) {
    this.state.isPlaying = false;
    this.state.keys.clear();
    this.state.delivery = null;
    this.state.comic = null;
    this.state.houseReaction = null;
    this.hud.hide();
    this.updateComic();
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
    const deliveryResult = updateDelivery(this.state, dt);
    if (deliveryResult.completed) window.setTimeout(() => this.showSummary(false), 650);
    this.renderer.render(this.state);
    this.updateComic();
    requestAnimationFrame((time) => this.loop(time));
  }
}
