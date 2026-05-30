import { currentTarget } from "../state/gameState.js";
import { nt, t } from "../i18n.js";

export class Hud {
  constructor() {
    this.root = document.getElementById("hud");
    this.eyebrow = document.getElementById("hudEyebrow");
    this.targetName = document.getElementById("targetName");
    this.targetHint = document.getElementById("targetHint");
    this.companionLine = document.getElementById("companionLine");
    this.deliverBtn = document.getElementById("deliverBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.endBtn = document.getElementById("endBtn");
    this.touchDeliverBtn = document.getElementById("touchDeliverBtn");
    this.touchForwardBtn = document.getElementById("touchForwardBtn");
    this.touchBackBtn = document.getElementById("touchBackBtn");
    this.touchSteerLabel = document.getElementById("touchSteerLabel");
    this.easyModeBtn = document.getElementById("easyModeBtn");
    this.locateBtn = document.getElementById("locateBtn");
    this.autoForwardBtn = document.getElementById("autoForwardBtn");
    this.contrastBtn = document.getElementById("contrastBtn");
  }

  show() {
    this.root.classList.remove("hidden");
    if (this.eyebrow) this.eyebrow.textContent = t("todayTask");
    this.deliverBtn.textContent = t("deliverButton");
    this.endBtn.textContent = t("endButton");
    if (this.touchDeliverBtn) this.touchDeliverBtn.textContent = t("deliverButton");
    if (this.touchForwardBtn) this.touchForwardBtn.textContent = t("touchForward");
    if (this.touchBackBtn) this.touchBackBtn.textContent = t("touchBack");
    if (this.touchSteerLabel) this.touchSteerLabel.textContent = t("touchSteer");
    if (this.easyModeBtn) this.easyModeBtn.textContent = t("easyMode");
    if (this.locateBtn) this.locateBtn.textContent = t("locateTarget");
    if (this.autoForwardBtn) this.autoForwardBtn.textContent = t("autoForward");
    if (this.contrastBtn) this.contrastBtn.textContent = t("highContrast");
  }

  hide() {
    this.root.classList.add("hidden");
  }

  update(state) {
    const target = currentTarget(state);
    const done = state.delivered.length;
    const total = state.route.length;
    if (!target) {
      this.targetName.textContent = t("deliverDone", done, total);
      this.targetHint.textContent = t("summaryReady");
    } else {
      this.targetName.textContent = t("deliverTo", done, total, nt(target, "name"));
      this.targetHint.textContent = t("targetHint", nt(target, "paper"));
    }
    this.companionLine.textContent = state.message;
    this.pauseBtn.textContent = state.isPaused ? t("resume") : t("pause");
    this.easyModeBtn?.classList.toggle("selected", Boolean(state.easyMode));
    this.autoForwardBtn?.classList.toggle("selected", Boolean(state.autoForward));
    this.contrastBtn?.classList.toggle("selected", Boolean(state.highContrast));
  }
}
