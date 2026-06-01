import { canDeliverNow } from "../game/delivery.js";
import { MAP_D, MAP_W, ROAD_SEGMENTS, WORLD_SCALE } from "../data/world.js";
import { currentTarget } from "../state/gameState.js";
import { nt, t } from "../i18n.js";

function sceneX(worldX = 0) { return worldX * WORLD_SCALE; }
function sceneZ(worldY = 0) { return worldY * WORLD_SCALE; }

function areaNameFromScene(x, z) {
  if (z > 184) return t("placeRiver");
  if (z < -180) return t("placeSchool");
  if (x < -210) return t("placeWest");
  if (x > 210) return t("placeEast");
  if (Math.abs(x) < 95 && Math.abs(z) < 120) return t("placeCenter");
  return t("placeKitaeguchi");
}

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
    this.miniMapPanel = document.getElementById("miniMapPanel");
    this.miniMapCanvas = document.getElementById("miniMapCanvas");
    this.miniMapTitle = document.getElementById("miniMapTitle");
    this.miniMapPlace = document.getElementById("miniMapPlace");
    this.miniMapHint = document.getElementById("miniMapHint");
    this.miniMapFrame = 0;
  }

  show() {
    this.root.classList.remove("hidden");
    this.miniMapPanel?.classList.remove("hidden");
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
    if (this.miniMapTitle) this.miniMapTitle.textContent = t("miniMap");
    if (this.miniMapHint) this.miniMapHint.textContent = t("miniMapLegend");
  }

  hide() {
    this.root.classList.add("hidden");
    this.miniMapPanel?.classList.add("hidden");
  }

  updateMiniMap(state, target) {
    if (!this.miniMapCanvas || !this.miniMapPanel || this.miniMapPanel.classList.contains("hidden")) return;
    this.miniMapFrame = (this.miniMapFrame + 1) % 4;
    if (this.miniMapFrame !== 0) return;
    const ctx = this.miniMapCanvas.getContext("2d");
    const w = this.miniMapCanvas.width;
    const h = this.miniMapCanvas.height;
    const pad = 10;
    const sx = (x) => pad + ((x + MAP_W / 2) / MAP_W) * (w - pad * 2);
    const sz = (z) => pad + ((z + MAP_D / 2) / MAP_D) * (h - pad * 2);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(244, 250, 231, .92)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(98, 173, 134, .34)";
    ctx.fillRect(pad, sz(238 - 23), w - pad * 2, Math.max(5, sz(238 + 23) - sz(238 - 23)));

    ctx.lineCap = "round";
    ROAD_SEGMENTS.forEach((seg) => {
      const main = seg.main || seg.highway === "tertiary" || seg.highway === "primary";
      ctx.strokeStyle = main ? "#53585f" : "#777b7e";
      ctx.lineWidth = main ? 4.2 : 2.7;
      ctx.beginPath();
      ctx.moveTo(sx(seg.x1), sz(seg.z1));
      ctx.lineTo(sx(seg.x2), sz(seg.z2));
      ctx.stroke();
    });

    (state.route || []).forEach((n, i) => {
      if (state.delivered?.includes(n.id)) return;
      const x = sx(sceneX(n.deliveryX ?? n.x));
      const z = sz(sceneZ(n.deliveryY ?? n.y));
      ctx.fillStyle = i === state.delivered.length ? "#f0b44d" : "rgba(47, 125, 92, .58)";
      ctx.beginPath();
      ctx.arc(x, z, i === state.delivered.length ? 4.8 : 3.1, 0, Math.PI * 2);
      ctx.fill();
    });

    if (target) {
      const tx = sx(sceneX(target.deliveryX ?? target.x));
      const tz = sz(sceneZ(target.deliveryY ?? target.y));
      ctx.save();
      ctx.translate(tx, tz);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#f0b44d";
      ctx.strokeStyle = "#fff7d7";
      ctx.lineWidth = 2;
      ctx.fillRect(-5, -5, 10, 10);
      ctx.strokeRect(-5, -5, 10, 10);
      ctx.restore();
    }

    const px = sx(sceneX(state.player?.x ?? 0));
    const pz = sz(sceneZ(state.player?.y ?? 0));
    const heading = state.player?.headingAngle ?? 0;
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(heading);
    ctx.fillStyle = "#2f7d5c";
    ctx.strokeStyle = "#fffdf2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (this.miniMapPlace) this.miniMapPlace.textContent = areaNameFromScene(sceneX(state.player?.x ?? 0), sceneZ(state.player?.y ?? 0));
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
    const deliverReady = canDeliverNow(state, target);
    const moving = Boolean(
      state.delivery?.active
      || state.autoNavMoving
      || state.touchThrottle
      || state.keys.has("arrowup")
      || state.keys.has("w")
      || state.keys.has("arrowdown")
      || state.keys.has("s")
    );
    const idleNeedsForward = Boolean(state.isPlaying && !state.isPaused && target && !deliverReady && !moving);
    this.deliverBtn?.classList.toggle("deliver-ready", deliverReady);
    this.touchDeliverBtn?.classList.toggle("deliver-ready", deliverReady);
    this.touchForwardBtn?.classList.toggle("forward-nudge", idleNeedsForward);
    this.autoForwardBtn?.classList.toggle("forward-nudge", idleNeedsForward && !state.autoForward);
    this.targetHint?.classList.toggle("forward-nudge-text", idleNeedsForward);
    this.easyModeBtn?.classList.toggle("selected", Boolean(state.easyMode));
    this.autoForwardBtn?.classList.toggle("selected", Boolean(state.autoForward));
    this.contrastBtn?.classList.toggle("selected", Boolean(state.highContrast));
    this.updateMiniMap(state, target);
  }
}
