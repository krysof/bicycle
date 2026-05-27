import { neighbors } from "./data/neighbors.js";
import { answersFromMode, buildConfig, pickRoute } from "./game/difficulty.js";
import { requestDelivery, updateDelivery, updatePlayer } from "./game/delivery.js";
import { bindKeyboard } from "./input/keyboard.js";
import { ThreeRenderer } from "./render/threeRenderer.js";
import { AudioEngine } from "./audio/audioEngine.js";
import { createInitialState, currentTarget } from "./state/gameState.js";
import { loadRecord, saveRecord, todayKey } from "./state/storage.js";
import { Hud } from "./ui/hud.js";
import { Screens } from "./ui/screens.js";
import { applyDocumentLanguage, changeLanguage, languageOptions, locale, t } from "./i18n.js";

export class App {
  constructor() {
    applyDocumentLanguage();
    this.state = createInitialState();
    this.renderer = new ThreeRenderer(document.getElementById("gameCanvas"));
    this.audio = new AudioEngine();
    this.screens = new Screens(document.getElementById("ui"));
    this.hud = new Hud();
    this.setupLanguageSelector();
  }

  randomDefaultName() {
    const list = t("defaultPlayerNames");
    const names = Array.isArray(list) ? list : ["春日先生", "青山女士", "松风先生", "花见女士"];
    const index = Math.floor((Date.now() / 997 + Math.random() * names.length) % names.length);
    return names[index];
  }

  getPlayerName() {
    const input = document.getElementById("playerNameInput");
    return (input?.value || this.state.playerName || loadRecord().playerName || this.randomDefaultName()).trim();
  }

  savePlayerName(name) {
    const clean = (name || "").trim() || this.randomDefaultName();
    this.state.playerName = clean;
    const record = loadRecord();
    record.playerName = clean;
    saveRecord(record);
    return clean;
  }

  setupLanguageSelector() {
    const select = document.getElementById("languageSelect");
    if (!select) return;
    select.innerHTML = languageOptions.map((item) => `<option value="${item.code}">${item.label}</option>`).join("");
    select.value = locale;
    select.onchange = () => changeLanguage(select.value);
  }

  handleLanguageChanged() {
    const currentName = this.state.screen === "home" ? this.getPlayerName() : (this.state.playerName || loadRecord().playerName || this.randomDefaultName());
    this.state.playerName = currentName;
    this.setupLanguageSelector();
    this.renderer.rebuildWorld();
    if (this.state.screen === "title") {
      this.screens.title();
    } else if (this.state.screen === "home") {
      this.screens.home(loadRecord(), currentName);
    } else if (this.state.screen === "summary") {
      this.screens.summary(this.state, this.state.summaryEarly);
    } else if (this.state.screen === "game") {
      const mode = this.state.config?.moveMode === "bike" ? t("modeBike") : t("modeWalk");
      this.state.message = this.state.playerName ? t("startMessageNamed", this.state.playerName, mode) : t("startMessage", mode);
      this.state.comic = { text: this.state.message, tone: "guide", time: 2.4 };
      this.state.lastNavHintAt = this.state.floatTime;
      this.hud.show();
      this.hud.update(this.state);
    }
    this.updateComic();
  }

  start() {
    this.bindEvents();
    this.showTitle();
    requestAnimationFrame((time) => this.loop(time));
  }

  bindEvents() {
    window.addEventListener("resize", () => this.renderer.resize());
    window.addEventListener("bicycle-language-change", () => this.handleLanguageChanged());
    bindKeyboard(this.state, () => this.deliver());

    this.screens.root.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.action === "title-start") {
        await this.audio.start();
        this.showHome();
        return;
      }
      if (button.dataset.mode) this.startWithMode(button.dataset.mode);
      if (button.dataset.quick) this.startWithMode(button.dataset.quick === "active" ? "bike" : "walk");
      if (button.dataset.action === "home") this.showHome();
    });

    this.hud.deliverBtn.addEventListener("click", () => this.deliver());
    this.hud.pauseBtn.addEventListener("click", () => this.togglePause());
    this.hud.endBtn.addEventListener("click", () => this.showSummary(true));
  }

  showTitle() {
    this.state.screen = "title";
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.keys.clear();
    this.state.delivery = null;
    this.state.comic = null;
    this.state.houseReaction = null;
    this.hud.hide();
    this.updateComic();
    this.screens.title();
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
    const record = loadRecord();
    this.state.playerName = record.playerName || this.state.playerName || this.randomDefaultName();
    this.screens.home(record, this.state.playerName);
  }

  startWithMode(mode) {
    this.audio.start();
    this.savePlayerName(this.getPlayerName());
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
    const mode = this.state.config.moveMode === "bike" ? t("modeBike") : t("modeWalk");
    this.state.message = this.state.playerName ? t("startMessageNamed", this.state.playerName, mode) : t("startMessage", mode);
    this.state.comic = { text: this.state.message, tone: "guide", time: 3.0 };
    this.state.lastNavHintAt = this.state.floatTime;
    this.screens.clear();
    this.hud.show();
    this.hud.update(this.state);
  }

  deliver() {
    if (!this.state.isPlaying || this.state.isPaused) return;
    this.audio.start();
    requestDelivery(this.state);
    this.hud.update(this.state);
  }

  togglePause() {
    this.state.isPaused = !this.state.isPaused;
    this.state.message = this.state.isPaused ? t("rest") : t("resumeMsg");
    this.state.comic = { text: this.state.message, tone: "guide", time: 2.2 };
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

  updateSafetyHint(renderInfo) {
    const near = renderInfo?.nearPasserby;
    if (!near || !this.state.isPlaying || this.state.isPaused || this.state.comic) return;
    if ((this.state.floatTime - (this.state.lastSafetyHintAt ?? -99)) < 7.5) return;
    const key = near === "cyclist" ? "safetyCyclist" : near === "animal" ? "safetyAnimal" : "safetyPedestrian";
    this.state.message = t(key);
    this.state.comic = { text: t(key), tone: "guide", time: 2.8 };
    this.state.lastSafetyHintAt = this.state.floatTime;
    this.hud.update(this.state);
  }

  updateNavigationHint() {
    if (!this.state.isPlaying || this.state.isPaused || this.state.delivery?.active || this.state.comic) return;
    if ((this.state.floatTime - (this.state.lastNavHintAt ?? -99)) < 5.2) return;
    const target = currentTarget(this.state);
    if (!target) return;

    const tx = target.deliveryX ?? target.x;
    const ty = target.deliveryY ?? target.y;
    const vx = tx - this.state.player.x;
    const vy = ty - this.state.player.y;
    const distance = Math.hypot(vx, vy);
    if (distance < 1) return;

    const toX = vx / distance;
    const toY = vy / distance;
    const hx = this.state.player.headingX || 1;
    const hy = this.state.player.headingY || 0;
    const cross = hx * toY - hy * toX;
    const dot = hx * toX + hy * toY;
    const angle = Math.atan2(cross, dot);
    const key = distance <= (this.state.config.assistRadius || 260) * 1.7
      ? "navArrive"
      : Math.abs(angle) < 0.38
        ? "navStraight"
        : angle > 0
          ? "navLeft"
          : "navRight";

    this.state.comic = { text: t(key), tone: "guide", time: 2.6 };
    this.state.message = t(key);
    this.state.lastNavHintAt = this.state.floatTime;
    this.hud.update(this.state);
  }

  showSummary(early) {
    this.state.screen = "summary";
    this.state.summaryEarly = early;
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
    this.updateNavigationHint();
    const renderInfo = this.renderer.render(this.state);
    this.audio.update(this.state, dt);
    this.updateSafetyHint(renderInfo);
    this.updateComic();
    requestAnimationFrame((time) => this.loop(time));
  }
}
