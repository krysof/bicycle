import { neighbors } from "../data/neighbors.js";
import { currentTarget } from "../state/gameState.js";
import { iso, roundedRect, shade } from "./isometric.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.view = { w: window.innerWidth, h: window.innerHeight };
    this.resize();
  }

  resize() {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    this.view = { w: window.innerWidth, h: window.innerHeight, ratio };
    this.canvas.width = Math.floor(this.view.w * ratio);
    this.canvas.height = Math.floor(this.view.h * ratio);
    this.canvas.style.width = `${this.view.w}px`;
    this.canvas.style.height = `${this.view.h}px`;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  render(state) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.view.w, this.view.h);
    this.drawSky(state.floatTime);
    this.drawDistantTown();
    this.drawGround();
    this.drawRoads();
    this.drawProps(state.floatTime);
    this.drawHouses(state);
    this.drawPark();
    this.drawPlayer(state);
    this.drawSoftOverlay();
  }

  drawSky(t) {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, this.view.h);
    sky.addColorStop(0, "#bde4ff");
    sky.addColorStop(0.48, "#fff1cf");
    sky.addColorStop(1, "#d5edc8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.view.w, this.view.h);

    const sun = ctx.createRadialGradient(this.view.w * 0.82, this.view.h * 0.13, 8, this.view.w * 0.82, this.view.h * 0.13, 92);
    sun.addColorStop(0, "rgba(255,244,166,.96)");
    sun.addColorStop(1, "rgba(255,210,110,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, this.view.w, this.view.h * 0.45);

    this.drawCloud(this.view.w * 0.18 + Math.sin(t * 0.25) * 12, this.view.h * 0.12, 1.1);
    this.drawCloud(this.view.w * 0.64 + Math.cos(t * 0.2) * 10, this.view.h * 0.2, 0.86);
  }

  drawCloud(x, y, s) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.beginPath();
    ctx.arc(x, y, 24 * s, 0, Math.PI * 2);
    ctx.arc(x + 26 * s, y - 8 * s, 30 * s, 0, Math.PI * 2);
    ctx.arc(x + 58 * s, y, 22 * s, 0, Math.PI * 2);
    ctx.arc(x + 30 * s, y + 14 * s, 28 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  drawDistantTown() {
    const ctx = this.ctx;
    const baseY = this.view.h * 0.35;
    ctx.fillStyle = "rgba(102,134,150,.18)";
    for (let i = 0; i < 14; i += 1) {
      const x = i * 110 - 30;
      const h = 38 + (i % 4) * 14;
      roundedRect(ctx, x, baseY - h, 70, h, 6);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(113,148,112,.2)";
    ctx.beginPath();
    ctx.moveTo(0, baseY + 25);
    for (let x = 0; x <= this.view.w; x += 80) {
      ctx.lineTo(x, baseY + 18 + Math.sin(x * 0.02) * 10);
    }
    ctx.lineTo(this.view.w, baseY + 60);
    ctx.lineTo(0, baseY + 60);
    ctx.closePath();
    ctx.fill();
  }

  drawGround() {
    const ctx = this.ctx;
    const points = [iso(this.view, -540, -340), iso(this.view, 540, -340), iso(this.view, 540, 360), iso(this.view, -540, 360)];
    this.poly(points, "#bfe5a8", "rgba(83,119,70,.16)");
    this.drawIsoEllipse(-320, -245, 42, 20, "rgba(255,255,255,.16)");
    this.drawIsoEllipse(320, 230, 60, 26, "rgba(91,161,91,.15)");
  }

  drawRoads() {
    this.road(-430, 0, 890, 76);
    this.road(0, -280, 76, 620);
    this.road(-120, 140, 340, 44, "#cfbd9e");
  }

  road(x, y, w, d, color = "#d7c5a6") {
    this.poly([iso(this.view, x - w / 2, y - d / 2), iso(this.view, x + w / 2, y - d / 2), iso(this.view, x + w / 2, y + d / 2), iso(this.view, x - w / 2, y + d / 2)], color, "rgba(97,74,49,.16)");
    this.poly([iso(this.view, x - w / 2, y - 3), iso(this.view, x + w / 2, y - 3), iso(this.view, x + w / 2, y + 3), iso(this.view, x - w / 2, y + 3)], "rgba(255,255,255,.28)", "transparent");
  }

  drawProps(t) {
    this.drawVendingMachine(-390, -92);
    this.drawUtilityPole(-360, 118);
    this.drawUtilityPole(340, -155);
    this.drawSakura(335, 105, t);
    this.drawSign(-35, 205, "公园");
  }

  drawHouses(state) {
    const target = currentTarget(state);
    neighbors.forEach((n) => {
      const done = state.delivered.includes(n.id);
      const active = target?.id === n.id;
      if (active) this.drawTargetRing(n.x, n.y, state.config?.assistRadius || 100, state.floatTime);
      this.drawHouse(n, done);
      this.drawLandmark(n);
      this.drawMailbox(n.x + 57, n.y + 34, done);
      this.drawLabel(n.name, n.x, n.y, active ? "#276c50" : "#435065");
    });
  }

  drawHouse(n, done) {
    const wall = done ? "#d3d8d7" : n.wall;
    const roof = done ? "#91a2a8" : n.roof;
    this.drawBox(n.x, n.y, 98, 82, 60, wall, roof, n.trim);
  }

  drawBox(x, y, w, d, h, wall, roof, trim) {
    const p1 = iso(this.view, x - w / 2, y - d / 2, 0);
    const p2 = iso(this.view, x + w / 2, y - d / 2, 0);
    const p3 = iso(this.view, x + w / 2, y + d / 2, 0);
    const p4 = iso(this.view, x - w / 2, y + d / 2, 0);
    const q1 = iso(this.view, x - w / 2, y - d / 2, h);
    const q2 = iso(this.view, x + w / 2, y - d / 2, h);
    const q3 = iso(this.view, x + w / 2, y + d / 2, h);
    const q4 = iso(this.view, x - w / 2, y + d / 2, h);

    this.poly([p2, p3, q3, q2], shade(wall, -6));
    this.poly([p3, p4, q4, q3], shade(wall, -18));
    this.poly([q1, q2, q3, q4], roof);

    const ridgeA = iso(this.view, x - w * 0.52, y, h + 9);
    const ridgeB = iso(this.view, x + w * 0.52, y, h + 9);
    const e1 = iso(this.view, x - w / 2, y - d / 2, h);
    const e2 = iso(this.view, x + w / 2, y - d / 2, h);
    const e3 = iso(this.view, x + w / 2, y + d / 2, h);
    const e4 = iso(this.view, x - w / 2, y + d / 2, h);
    this.poly([e1, e2, ridgeB, ridgeA], shade(roof, 18), "rgba(72,52,45,.18)");
    this.poly([e4, e3, ridgeB, ridgeA], shade(roof, -9), "rgba(72,52,45,.18)");

    const door = iso(this.view, x + 12, y + d / 2 + 2, 20);
    const ctx = this.ctx;
    ctx.fillStyle = trim;
    roundedRect(ctx, door.x - 9, door.y - 18, 18, 28, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(255,235,170,.9)";
    ctx.beginPath();
    ctx.arc(door.x + 4, door.y - 4, 2, 0, Math.PI * 2);
    ctx.fill();

    const win = iso(this.view, x - 18, y + d / 2 + 1, 32);
    ctx.fillStyle = "rgba(255,255,230,.82)";
    roundedRect(ctx, win.x - 9, win.y - 12, 18, 16, 3);
    ctx.fill();
  }

  drawLandmark(n) {
    const ctx = this.ctx;
    const p = iso(this.view, n.x - 48, n.y + 38, 8);
    if (n.landmark === "flowers") {
      for (let i = 0; i < 5; i += 1) {
        ctx.fillStyle = i % 2 ? "#e45b6f" : "#ffb2c0";
        ctx.beginPath();
        ctx.arc(p.x + i * 7, p.y - (i % 2) * 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (n.landmark === "basketball") {
      ctx.fillStyle = "#d97836";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(80,45,30,.45)";
      ctx.stroke();
    } else if (n.landmark === "fence") {
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 4;
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(p.x + i * 9, p.y - 12);
        ctx.lineTo(p.x + i * 9, p.y + 4);
        ctx.stroke();
      }
    } else if (n.landmark === "clinic") {
      this.drawSign(n.x - 55, n.y + 44, "診");
    } else if (n.landmark === "bench") {
      ctx.fillStyle = "#8b5f3d";
      ctx.fillRect(p.x - 16, p.y - 10, 36, 8);
      ctx.fillRect(p.x - 12, p.y - 1, 6, 14);
      ctx.fillRect(p.x + 10, p.y - 1, 6, 14);
    }
  }

  drawMailbox(x, y, done) {
    const ctx = this.ctx;
    const p = iso(this.view, x, y, 22);
    ctx.fillStyle = done ? "#87a08d" : "#e05f4e";
    roundedRect(ctx, p.x - 9, p.y - 20, 18, 14, 4);
    ctx.fill();
    ctx.fillStyle = "#5b4539";
    ctx.fillRect(p.x - 2, p.y - 6, 4, 26);
  }

  drawTargetRing(x, y, radius, t) {
    const p = iso(this.view, x, y, 2);
    const pulse = 1 + Math.sin(t * 3) * 0.06;
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, radius * 0.86 * pulse, radius * 0.46 * pulse, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,186,77,.95)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, radius * 0.62, radius * 0.32, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawPark() {
    this.drawIsoEllipse(-320, 195, 78, 34, "#65aa69");
    this.drawSakura(-365, 190, 1.2);
    this.drawSign(-260, 205, "集合");
  }

  drawSakura(x, y, t = 0) {
    const ctx = this.ctx;
    const trunk = iso(this.view, x, y, 38);
    ctx.strokeStyle = "#7d5a46";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(trunk.x, trunk.y + 40);
    ctx.lineTo(trunk.x, trunk.y + 4);
    ctx.stroke();
    const top = iso(this.view, x, y, 76);
    ctx.fillStyle = "rgba(255,182,203,.88)";
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.arc(top.x + Math.cos(i) * 22, top.y + Math.sin(i * 1.7 + t) * 8, 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,220,230,.95)";
    ctx.beginPath();
    ctx.arc(top.x, top.y, 24, 0, Math.PI * 2);
    ctx.fill();
  }

  drawVendingMachine(x, y) {
    const ctx = this.ctx;
    const p = iso(this.view, x, y, 36);
    ctx.fillStyle = "#d94a4a";
    roundedRect(ctx, p.x - 18, p.y - 50, 36, 58, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.75)";
    ctx.fillRect(p.x - 12, p.y - 44, 24, 20);
    ctx.fillStyle = "rgba(30,45,70,.35)";
    ctx.fillRect(p.x - 10, p.y - 18, 20, 14);
  }

  drawUtilityPole(x, y) {
    const ctx = this.ctx;
    const p = iso(this.view, x, y, 68);
    ctx.strokeStyle = "#74543e";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 64);
    ctx.lineTo(p.x, p.y - 18);
    ctx.stroke();
    ctx.strokeStyle = "rgba(63,65,74,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - 28, p.y - 10);
    ctx.lineTo(p.x + 32, p.y - 10);
    ctx.stroke();
  }

  drawSign(x, y, text) {
    const ctx = this.ctx;
    const p = iso(this.view, x, y, 36);
    ctx.fillStyle = "#5d7b57";
    roundedRect(ctx, p.x - 18, p.y - 34, 36, 22, 5);
    ctx.fill();
    ctx.fillStyle = "#fff9dd";
    ctx.font = "700 15px 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, p.x, p.y - 18);
    ctx.fillStyle = "#6b543e";
    ctx.fillRect(p.x - 2, p.y - 12, 4, 32);
  }

  drawPlayer(state) {
    const ctx = this.ctx;
    const p = iso(this.view, state.player.x, state.player.y, 0);
    ctx.fillStyle = "rgba(36,34,28,.18)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 7, 23, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    const coat = state.config?.moveMode === "bike" ? "#38547a" : "#2f7d5c";
    ctx.fillStyle = coat;
    roundedRect(ctx, p.x - 13, p.y - 43, 26, 30, 8);
    ctx.fill();
    ctx.fillStyle = "#f1c08f";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 55, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6f6a62";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 61, 12, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = "#7a5b3f";
    roundedRect(ctx, p.x + 10 * state.player.facing, p.y - 37, 18, 16, 4);
    ctx.fill();
    ctx.fillStyle = "#fff2c7";
    ctx.fillRect(p.x + 14 * state.player.facing, p.y - 34, 10, 3);

    if (state.config?.moveMode === "bike") this.drawBike(p.x, p.y);
  }

  drawBike(x, y) {
    const ctx = this.ctx;
    ctx.strokeStyle = "#263044";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x - 22, y - 5, 11, 0, Math.PI * 2);
    ctx.arc(x + 22, y - 5, 11, 0, Math.PI * 2);
    ctx.moveTo(x - 22, y - 5);
    ctx.lineTo(x, y - 22);
    ctx.lineTo(x + 22, y - 5);
    ctx.lineTo(x - 5, y - 5);
    ctx.lineTo(x - 22, y - 5);
    ctx.stroke();
  }

  drawLabel(text, x, y, color) {
    const p = iso(this.view, x, y, 92);
    const ctx = this.ctx;
    ctx.font = "800 19px 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.strokeText(text, p.x, p.y - 12);
    ctx.fillStyle = color;
    ctx.fillText(text, p.x, p.y - 12);
  }

  drawIsoEllipse(x, y, rx, ry, fill) {
    const ctx = this.ctx;
    const p = iso(this.view, x, y, 1);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSoftOverlay() {
    const ctx = this.ctx;
    const vignette = ctx.createRadialGradient(this.view.w / 2, this.view.h * 0.42, this.view.h * 0.2, this.view.w / 2, this.view.h * 0.5, this.view.h * 0.85);
    vignette.addColorStop(0, "rgba(255,255,255,0)");
    vignette.addColorStop(1, "rgba(80,55,30,.08)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.view.w, this.view.h);
  }

  poly(points, fill, stroke = "rgba(38,48,56,.15)") {
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach((p, index) => (index === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke !== "transparent") {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }
}
