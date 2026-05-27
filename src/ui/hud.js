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
    if (!target) {
      this.targetName.textContent = "今天的报纸都送到了";
      this.targetHint.textContent = "准备查看总结。";
    } else {
      this.targetName.textContent = `下一户：${target.name}`;
      this.targetHint.textContent = `请送「${target.paper}」。线索：${target.clue}`;
    }
    this.companionLine.textContent = state.message;
    this.pauseBtn.textContent = state.isPaused ? "继续" : "暂停";
  }
}
