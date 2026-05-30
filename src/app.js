import { neighbors } from "./data/neighbors.js";
import { createWorldLayout, createWorldObstacles } from "./data/world.js";
import { answersFromMode, buildConfig, pickRoute, pickStartPoint } from "./game/difficulty.js";
import { requestDelivery, updateDelivery, updatePlayer } from "./game/delivery.js";
import { bindKeyboard, bindTouchControls } from "./input/keyboard.js";
import { ThreeRenderer } from "./render/threeRenderer.js";
import { AudioEngine } from "./audio/audioEngine.js";
import { createInitialState, currentTarget } from "./state/gameState.js";
import { loadRecord, saveRecord, todayKey } from "./state/storage.js";
import { Hud } from "./ui/hud.js";
import { Screens } from "./ui/screens.js";
import { applyDocumentLanguage, changeLanguage, getLocalizedList, languageOptions, locale, nt, setCompanionName, t } from "./i18n.js";

export class App {
  constructor() {
    applyDocumentLanguage();
    this.state = createInitialState();
    this.renderer = new ThreeRenderer(document.getElementById("gameCanvas"));
    // 首屏标题出现前就把随机社区准备好，避免先显示默认地图。
    this.prepareRandomWorld();
    this.audio = new AudioEngine();
    this.playerNameIndex = this.randomIndex(getLocalizedList("defaultPlayerNames").length);
    this.companionNameIndex = this.randomIndex(getLocalizedList("companionNames").length);
    this.playerNameIsRandom = true;
    this.refreshCompanionName();
    this.screens = new Screens(document.getElementById("ui"));
    this.hud = new Hud();
    this.setupLanguageSelector();
    this.setupAudioToggles();
  }

  randomDefaultName() {
    const list = getLocalizedList("defaultPlayerNames");
    const names = Array.isArray(list) ? list : ["春日先生", "青山女士", "松风先生", "花见女士"];
    return names[this.playerNameIndex % names.length];
  }

  randomIndex(length) {
    return Math.floor(Math.random() * Math.max(1, length || 1));
  }

  randomThoughtDelay() {
    return 16 + Math.random() * 12;
  }

  answersForMode(mode) {
    const answers = answersFromMode(mode);
    const status = this.state.todayStatus || "normal";
    answers.todayStatus = status;
    if (status === "tired") {
      answers.energy = "tired";
      answers.count = mode === "bike" ? 5 : 3;
      answers.speedScale = 0.86;
    } else if (status === "good") {
      answers.energy = "good";
      answers.count = mode === "bike" ? 8 : 5;
      answers.speedScale = 1.06;
    } else {
      answers.energy = "normal";
      answers.count = mode === "bike" ? 6 : 4;
      answers.speedScale = 1;
    }
    return answers;
  }

  rerollNames() {
    this.playerNameIndex = this.randomIndex(getLocalizedList("defaultPlayerNames").length);
    this.companionNameIndex = this.randomIndex(getLocalizedList("companionNames").length);
    this.playerNameIsRandom = true;
    this.refreshCompanionName();
    this.state.playerName = this.randomDefaultName();
    this.state.playerStyle = this.playerNameIndex % 2 === 1 ? "female" : "male";
  }

  refreshCompanionName() {
    const list = getLocalizedList("companionNames");
    const names = Array.isArray(list) ? list : ["小铃"];
    setCompanionName(names[this.companionNameIndex % names.length]);
  }

  companionName() {
    const list = getLocalizedList("companionNames");
    const names = Array.isArray(list) ? list : ["小铃"];
    return names[this.companionNameIndex % names.length] || names[0] || "小铃";
  }

  companionAvatarClass() {
    return ["suzu", "haru", "ume", "sora"][this.companionNameIndex % 4] || "suzu";
  }

  neighborAvatarClass(comic) {
    const recipient = comic?.recipient || {};
    const gender = recipient.gender || "male";
    const avatar = recipient.avatar || comic?.neighborId || "neighbor";
    return `avatar-neighbor neighbor-${gender} neighbor-${avatar}`;
  }

  comicSpeakerInfo(comic) {
    if (comic?.speaker === "neighbor") {
      const name = comic.speakerName || comic.recipient?.name || "";
      return {
        name,
        avatarClass: this.neighborAvatarClass(comic),
        kind: "neighbor",
      };
    }
    const name = this.companionName();
    return {
      name,
      avatarClass: `avatar-${this.companionAvatarClass()}`,
      kind: "companion",
    };
  }

  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  escapeRegExp(value) {
    return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  comicLineText(value, speakerName) {
    let text = String(value ?? "").trim();
    const names = [speakerName, "阿铃", "阿鈴", "Arin", "すず"].filter(Boolean).map((name) => this.escapeRegExp(name));
    if (names.length) text = text.replace(new RegExp(`^(${names.join("|")})\\s*[:：]\\s*`), "");
    return text;
  }

  getPlayerName() {
    const input = document.getElementById("playerNameInput");
    const value = (input?.value || this.state.playerName || this.randomDefaultName()).trim();
    if (input && value !== this.state.playerName) this.playerNameIsRandom = false;
    return value;
  }

  savePlayerName(name) {
    const clean = (name || "").trim() || this.randomDefaultName();
    this.state.playerName = clean;
    this.playerNameIsRandom = clean === this.randomDefaultName();
    return clean;
  }

  setupLanguageSelector() {
    const select = document.getElementById("languageSelect");
    if (!select) return;
    select.innerHTML = languageOptions.map((item) => `<option value="${item.code}">${item.label}</option>`).join("");
    select.value = locale;
    select.onchange = () => changeLanguage(select.value);
  }

  setupAudioToggles() {
    const music = document.getElementById("musicToggle");
    const sfx = document.getElementById("sfxToggle");
    const refresh = () => {
      music?.classList.toggle("off", !this.audio.musicEnabled);
      sfx?.classList.toggle("off", !this.audio.sfxEnabled);
      if (music) music.title = this.audio.musicEnabled ? "Music on" : "Music off";
      if (sfx) sfx.title = this.audio.sfxEnabled ? "Sound effects on" : "Sound effects off";
    };
    music?.addEventListener("click", async () => {
      await this.audio.start();
      this.audio.toggleMusic();
      refresh();
    });
    sfx?.addEventListener("click", async () => {
      await this.audio.start();
      this.audio.toggleSfx();
      refresh();
    });
    refresh();
  }

  handleLanguageChanged() {
    this.refreshCompanionName();
    const currentName = this.playerNameIsRandom ? this.randomDefaultName() : (this.state.screen === "home" ? this.getPlayerName() : (this.state.playerName || this.randomDefaultName()));
    this.state.playerName = currentName;
    this.setupLanguageSelector();
    this.renderer.rebuildWorld();
    if (this.state.screen === "title") {
      this.screens.title();
    } else if (this.state.screen === "home") {
      this.screens.home(loadRecord(), currentName, this.state.todayStatus);
    } else if (this.state.screen === "summary") {
      this.screens.summary(this.state, this.state.summaryEarly);
    } else if (this.state.screen === "game") {
      const mode = this.state.config?.moveMode === "bike" ? t("modeBike") : t("modeWalk");
      this.state.message = this.state.playerName ? t("startMessageNamed", this.state.playerName, mode) : t("startMessage", mode);
      this.state.comic = { text: this.state.message, tone: "guide", time: 2.4 };
      this.state.lastNavHintAt = this.state.floatTime;
      this.hud.show();
      this.showTouchControls();
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
    bindTouchControls(this.state, () => this.deliver());

    this.screens.root.addEventListener("click", async (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.action === "title-start") {
        await this.audio.start();
        this.showHome();
        return;
      }
      if (button.dataset.status) {
        this.setTodayStatus(button.dataset.status);
        return;
      }
      if (button.dataset.action === "share-card") {
        this.copyShareCard();
        return;
      }
      if (button.dataset.mode) this.startWithMode(button.dataset.mode);
      if (button.dataset.quick) this.startWithMode(button.dataset.quick === "active" ? "bike" : "walk");
      if (button.dataset.action === "home") this.showHome();
    });

    this.hud.deliverBtn.addEventListener("click", () => this.deliver());
    this.hud.pauseBtn.addEventListener("click", () => this.togglePause());
    this.hud.endBtn.addEventListener("click", () => this.showSummary(true));
    this.hud.easyModeBtn?.addEventListener("click", () => this.toggleEasyMode());
    this.hud.locateBtn?.addEventListener("click", () => this.locateTarget());
    this.hud.autoForwardBtn?.addEventListener("click", () => this.toggleAutoForward());
    this.hud.contrastBtn?.addEventListener("click", () => this.toggleHighContrast());
  }

  prepareRandomWorld() {
    this.state.worldSeed = Date.now() ^ Math.floor(Math.random() * 0x7fffffff);
    this.state.worldLayout = createWorldLayout(this.state.worldSeed);
    this.state.worldObstacles = createWorldObstacles(this.state.worldLayout);
    this.renderer.setWorldLayout(this.state.worldLayout);
  }

  prepareRoutesForModeSelection() {
    if (!this.state.worldLayout || !this.state.worldObstacles) this.prepareRandomWorld();
    this.state.preparedRuns = {};
    ["bike", "walk"].forEach((mode) => {
      const answers = this.answersForMode(mode);
      const config = buildConfig(answers);
      const player = pickStartPoint();
      const route = pickRoute(neighbors, config, player);
      this.state.preparedRuns[mode] = { answers, config, player, route };
    });
  }

  setTodayStatus(status) {
    if (!["tired", "normal", "good"].includes(status)) return;
    this.savePlayerName(this.getPlayerName());
    this.saveFamilyMessage();
    this.state.todayStatus = status;
    this.prepareRoutesForModeSelection();
    const preview = this.state.preparedRuns.bike || this.state.preparedRuns.walk;
    if (preview) {
      this.state.config = { ...preview.config };
      this.state.player = { ...preview.player };
      this.state.route = [...preview.route];
      this.state.delivered = [];
    }
    this.screens.home(loadRecord(), this.state.playerName, this.state.todayStatus);
  }

  getFamilyMessage() {
    return (document.getElementById("familyMessageInput")?.value || this.state.familyMessage || "").trim();
  }

  saveFamilyMessage() {
    const message = this.getFamilyMessage();
    this.state.familyMessage = message;
    const record = loadRecord();
    record.familyMessage = message;
    saveRecord(record);
    return message;
  }

  showTitle() {
    if (!this.state.worldLayout || !this.state.worldObstacles) this.prepareRandomWorld();
    this.state.screen = "title";
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.keys.clear();
    this.state.delivery = null;
    this.state.comic = null;
    this.state.houseReaction = null;
    this.hud.hide();
    this.hideTouchControls();
    this.updateComic();
    this.screens.title();
  }

  showHome() {
    const previousScreen = this.state.screen;
    if (!this.state.worldLayout || previousScreen === "title" || previousScreen === "summary") this.prepareRandomWorld();
    this.rerollNames();
    this.state.todayStatus = "normal";
    this.prepareRoutesForModeSelection();
    const preview = this.state.preparedRuns.bike || this.state.preparedRuns.walk;
    if (preview) {
      this.state.config = { ...preview.config };
      this.state.player = { ...preview.player };
      this.state.route = [...preview.route];
      this.state.delivered = [];
    }
    this.state.screen = "home";
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.keys.clear();
    this.state.delivery = null;
    this.state.comic = null;
    this.state.houseReaction = null;
    this.hud.hide();
    this.hideTouchControls();
    this.updateComic();
    const record = loadRecord();
    this.screens.home(record, this.state.playerName, this.state.todayStatus);
  }

  startWithMode(mode) {
    this.audio.start();
    this.savePlayerName(this.getPlayerName());
    this.saveFamilyMessage();
    if (!this.state.preparedRuns?.[mode]) this.prepareRoutesForModeSelection();
    const prepared = this.state.preparedRuns[mode];
    this.state.answers = { ...prepared.answers };
    this.state.config = { ...prepared.config };
    if (!this.state.worldLayout || !this.state.worldObstacles) this.prepareRandomWorld();
    this.state.player = { ...prepared.player };
    this.state.route = [...prepared.route];
    this.state.delivered = [];
    this.state.gratitudeCards = [];
    this.state.delivery = null;
    this.state.comic = null;
    this.state.houseReaction = null;
    this.state.memoryPrompt = null;
    this.state.autoForward = false;
    this.state.nextThoughtAt = this.state.floatTime + this.randomThoughtDelay();
    this.state.lastThoughtDeliveryIndex = -1;
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
    this.state.nextThoughtAt = this.state.floatTime + 8 + Math.random() * 6;
    this.state.lastThoughtDeliveryIndex = -1;
    this.state.familyMessageDue = this.state.familyMessage ? this.state.floatTime + 4.2 : null;
    this.state.landscapeHintDue = window.matchMedia?.("(max-width: 760px) and (orientation: portrait)")?.matches ? this.state.floatTime + 2.4 : null;
    this.screens.clear();
    this.hud.show();
    this.showTouchControls();
    this.hud.update(this.state);
  }

  deliver() {
    if (!this.state.isPlaying || this.state.isPaused) return;
    this.audio.start();
    requestDelivery(this.state);
    if (navigator.vibrate) navigator.vibrate(18);
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
      const speaker = this.comicSpeakerInfo(this.state.comic);
      const name = speaker.name;
      const avatar = speaker.avatarClass;
      const plainText = this.comicLineText(this.state.comic.text, name);
      const text = this.escapeHtml(plainText);
      el.innerHTML = `
        <div class="comic-avatar ${avatar}" aria-hidden="true">
          <span class="avatar-face"></span>
          <span class="avatar-hair"></span>
          <span class="avatar-eye left"></span>
          <span class="avatar-eye right"></span>
          <span class="avatar-mouth"></span>
          ${speaker.kind === "neighbor" && this.state.comic.recipient?.gender === "couple" ? `
            <span class="avatar-face second"></span>
            <span class="avatar-hair second"></span>
            <span class="avatar-eye second left"></span>
            <span class="avatar-eye second right"></span>
            <span class="avatar-mouth second"></span>
          ` : ""}
        </div>
        <div class="comic-dialog">
          <span class="comic-speaker">${this.escapeHtml(name)}</span>
          <span class="comic-text">${text}</span>
        </div>`;
      el.className = `comic-bubble with-avatar ${this.state.comic.tone || ""}`;
      el.setAttribute("aria-label", `${name}: ${plainText}`);
    } else {
      el.innerHTML = "";
      el.removeAttribute("aria-label");
      el.className = "comic-bubble hidden";
    }
  }

  toggleEasyMode() {
    this.state.easyMode = !this.state.easyMode;
    if (this.state.config) {
      const baseSpeed = this.state.config.baseSpeed || this.state.config.speed;
      this.state.config.baseSpeed = baseSpeed;
      this.state.config.defaultAssistRadius ||= this.state.config.assistRadius;
      this.state.config.speed = this.state.easyMode ? baseSpeed * 0.72 : baseSpeed;
      this.state.config.assistRadius = this.state.easyMode ? Math.max(360, this.state.config.assistRadius || 260) : (this.state.config.defaultAssistRadius || this.state.config.assistRadius);
    }
    const key = this.state.easyMode ? "easyModeOn" : "easyModeOff";
    this.state.message = t(key);
    this.state.comic = { text: t(key), tone: "guide", time: 2.6 };
    this.hud.update(this.state);
  }

  locateTarget() {
    const target = currentTarget(this.state);
    if (!target) return;
    const tx = target.deliveryX ?? target.x;
    const ty = target.deliveryY ?? target.y;
    const angle = Math.atan2(ty - this.state.player.y, tx - this.state.player.x);
    this.state.player.headingAngle = angle;
    this.state.player.headingX = Math.cos(angle);
    this.state.player.headingY = Math.sin(angle);
    this.state.lastNavHintAt = this.state.floatTime - 99;
    this.state.message = t("locateHint", nt(target, "name"));
    this.state.comic = { text: this.state.message, tone: "guide", time: 2.4 };
    this.hud.update(this.state);
  }

  toggleAutoForward() {
    this.state.autoForward = !this.state.autoForward;
    const key = this.state.autoForward ? "autoForwardOn" : "autoForwardOff";
    this.state.message = t(key);
    this.state.comic = { text: t(key), tone: "guide", time: 2.3 };
    this.hud.update(this.state);
  }

  toggleHighContrast() {
    this.state.highContrast = !this.state.highContrast;
    document.body.classList.toggle("high-contrast", this.state.highContrast);
    const key = this.state.highContrast ? "contrastOn" : "contrastOff";
    this.state.message = t(key);
    this.state.comic = { text: t(key), tone: "guide", time: 2.3 };
    this.hud.update(this.state);
  }

  addGratitudeCard() {
    const id = this.state.delivered.at(-1);
    const neighbor = neighbors.find((item) => item.id === id);
    if (!neighbor) return;
    const text = nt(neighbor, "thanks").replace(new RegExp(`^${this.escapeRegExp(nt(neighbor, "name"))}\\s*[:：]\\s*`), "");
    this.state.gratitudeCards.push({ id, name: nt(neighbor, "name"), text });
    this.state.memoryPrompt = {
      due: this.state.floatTime + 3.5,
      name: nt(neighbor, "name"),
      paper: nt(neighbor, "paper"),
    };
  }

  async copyShareCard() {
    const text = t("shareText", this.state.delivered.length);
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Clipboard may be unavailable on some browsers; still provide visible feedback.
    }
    this.state.message = t("shareCopied");
    this.state.comic = { text: t("shareCopied"), tone: "guide", time: 2.5 };
    this.updateComic();
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

  updateRestPointHint(renderInfo) {
    const area = renderInfo?.area;
    if (!["park", "shop", "shrine"].includes(area) || !this.state.isPlaying || this.state.isPaused || this.state.comic) return;
    if ((this.state.floatTime - (this.state.lastRestHintAt ?? -99)) < 18) return;
    this.state.message = t("restPointHint");
    this.state.comic = { text: t("restPointHint"), tone: "guide", time: 2.8 };
    this.state.lastRestHintAt = this.state.floatTime;
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
          ? "navRight"
          : "navLeft";

    this.state.comic = { text: t(key), tone: "guide", time: 2.6 };
    this.state.message = t(key);
    this.state.lastNavHintAt = this.state.floatTime;
    this.hud.update(this.state);
  }

  updateThoughtHint() {
    if (!this.state.isPlaying || this.state.isPaused || this.state.delivery?.active || this.state.comic) return;
    if (this.state.floatTime < (this.state.nextThoughtAt ?? 12)) return;
    const target = currentTarget(this.state);
    if (!target) return;
    const index = this.state.delivered.length;
    if (this.state.lastThoughtDeliveryIndex === index && Math.random() < 0.62) {
      this.state.nextThoughtAt = this.state.floatTime + this.randomThoughtDelay();
      return;
    }
    const text = t("thoughtNext", nt(target, "name"));
    this.state.comic = { text, tone: "thought", time: 2.9 };
    this.state.lastThoughtDeliveryIndex = index;
    this.state.nextThoughtAt = this.state.floatTime + this.randomThoughtDelay();
  }

  updateMemoryPrompt() {
    const prompt = this.state.memoryPrompt;
    if (!prompt || this.state.comic || this.state.floatTime < prompt.due) return;
    const text = t("memoryPrompt", prompt.name, prompt.paper);
    this.state.comic = { text, tone: "thought", time: 3.0 };
    this.state.message = text;
    this.state.memoryPrompt = null;
    this.hud.update(this.state);
  }

  updateTimedCompanionPrompts() {
    if (!this.state.isPlaying || this.state.isPaused || this.state.comic) return;
    if (this.state.landscapeHintDue && this.state.floatTime >= this.state.landscapeHintDue) {
      this.state.landscapeHintDue = null;
      this.state.message = t("landscapeHint");
      this.state.comic = { text: t("landscapeHint"), tone: "guide", time: 3.0 };
      this.hud.update(this.state);
      return;
    }
    if (this.state.familyMessageDue && this.state.floatTime >= this.state.familyMessageDue) {
      this.state.familyMessageDue = null;
      this.state.message = t("familyMessageRead", this.state.familyMessage);
      this.state.comic = { text: this.state.message, tone: "guide", time: 3.4 };
      this.hud.update(this.state);
    }
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
    this.hideTouchControls();
    this.updateComic();
    const count = this.state.delivered.length;
    const record = loadRecord();
    record.lastSummary = {
      date: todayKey(),
      count,
      thanks: count,
      mode: this.state.config?.moveMode || "walk",
    };
    record.lastThanks = this.state.gratitudeCards || [];
    record.familyMessage = this.state.familyMessage || record.familyMessage || "";
    saveRecord(record);
    this.screens.summary(this.state, early);
  }

  showTouchControls() {
    document.getElementById("touchControls")?.classList.remove("hidden");
    const deliver = document.getElementById("touchDeliverBtn");
    const forward = document.getElementById("touchForwardBtn");
    const steer = document.getElementById("touchSteerLabel");
    const back = document.getElementById("touchBackBtn");
    if (deliver) deliver.textContent = t("deliverButton");
    if (forward) forward.textContent = t("touchForward");
    if (back) back.textContent = t("touchBack");
    if (steer) steer.textContent = t("touchSteer");
  }

  hideTouchControls() {
    document.getElementById("touchControls")?.classList.add("hidden");
    this.state.touchThrottle = 0;
    this.state.touchSteer = 0;
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.state.lastTime) / 1000);
    this.state.lastTime = now;
    this.state.floatTime += dt;
    updatePlayer(this.state, dt);
    const deliveryResult = updateDelivery(this.state, dt);
    if (deliveryResult.delivered) this.addGratitudeCard();
    if (deliveryResult.completed) window.setTimeout(() => this.showSummary(false), 2600);
    this.updateTimedCompanionPrompts();
    this.updateMemoryPrompt();
    this.updateThoughtHint();
    this.updateNavigationHint();
    const renderInfo = this.renderer.render(this.state);
    this.state.nearTraffic = renderInfo?.nearestTraffic || null;
    this.state.trafficObstacles = renderInfo?.trafficObstacles || [];
    this.audio.update(this.state, dt, renderInfo);
    this.updateRestPointHint(renderInfo);
    this.updateSafetyHint(renderInfo);
    this.updateComic();
    requestAnimationFrame((time) => this.loop(time));
  }
}
