import { currentTarget } from "../state/gameState.js";

export class Hud {
  constructor() {
    this.root = document.getElementById("hud");
    this.targetName = document.getElementById("targetName");
    this.targetHint = document.getElementById("targetHint");
    this.companionLine = document.getElementById("companionLine");
    this.deliverBtn = document.getElementById("deliverBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.endBtn = document.getElementById("endBtn");
  }

  show() {
    this.root.classList.remove("hidden");
  }

  hide() {
    this.root.classList.add("hidden");
  }

  update(state) {
    const target = currentTarget(state);
    const done = state.delivered.length;
    const total = state.route.length;
    if (!target) {
      this.targetName.textContent = "今天的报纸都送到了";
      this.targetHint.textContent = "准备查看总结。";
    } else {
      this.targetName.textContent = `${done + 1}/${total} 送给：${target.name}`;
      this.targetHint.textContent = `靠近发光房子，按大按钮投递「${target.paper}」。`;
    }
    this.companionLine.textContent = state.message;
    this.pauseBtn.textContent = state.isPaused ? "继续" : "休息";
  }
}
