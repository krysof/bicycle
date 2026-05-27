export class Screens {
  constructor(root) {
    this.root = root;
  }

  clear() {
    this.root.innerHTML = "";
  }

  home(record) {
    const last = record.lastSummary;
    const yesterday = last
      ? `上次你送到了 ${last.count} 户，大家都很高兴。今天也慢慢来。`
      : "今天我会陪你在町内慢慢送报。";

    this.root.innerHTML = `
      <section class="screen narrow home-screen simple-home">
        <div class="stamp">昭和町内会</div>
        <p class="eyebrow">陪伴型 3D 送报</p>
        <h1>今天也要送到</h1>
        <p class="lead">阿铃：早上好，见到你真高兴。${yesterday}</p>
        <div class="start-grid" aria-label="选择今天的节奏">
          <button class="start-card primary" data-quick="gentle">
            <strong>轻松开始</strong>
            <span>3 户，步行，提示最多</span>
          </button>
          <button class="start-card" data-quick="normal">
            <strong>普通开始</strong>
            <span>4 户，慢慢送</span>
          </button>
          <button class="start-card" data-quick="active">
            <strong>精神不错</strong>
            <span>5 户，可骑单车</span>
          </button>
        </div>
        <p class="tiny-note">不再做复杂问卷。选一个今天的感觉，就直接出发。</p>
      </section>`;
  }

  summary(state, early) {
    const count = state.delivered.length;
    this.root.innerHTML = `
      <section class="screen narrow">
        <p class="eyebrow">今日总结</p>
        <h1>${early ? "今天先到这里" : "今天也送到了"}</h1>
        <p class="lead">阿铃：你完成了 ${count} 户送报，收到了 ${count} 句感谢。今天也辛苦了。</p>
        <div class="cards">
          <div class="card"><strong>${count} 户</strong><p>今日送达</p></div>
          <div class="card"><strong>${state.config?.routeName || "轻松路线"}</strong><p>今日路线</p></div>
          <div class="card"><strong>${state.config?.moveMode === "bike" ? "骑单车" : "步行"}</strong><p>移动方式</p></div>
        </div>
        <p>下一版会继续加入家人留言和结伴送报，但主流程会保持简单。</p>
        <div class="button-row">
          <button class="primary" data-action="home">回到首页</button>
          <button data-quick="gentle">再轻松送一次</button>
        </div>
      </section>`;
  }
}
