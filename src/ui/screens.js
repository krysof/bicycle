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
      : "今天我会陪你在更大的町内慢慢送报。";

    this.root.innerHTML = `
      <section class="screen narrow home-screen simple-home">
        <div class="stamp">昭和町内会</div>
        <p class="eyebrow">第三人称 3D 送报</p>
        <h1>今天怎么出发？</h1>
        <p class="lead">阿铃：早上好，见到你真高兴。${yesterday}</p>
        <div class="mode-grid" aria-label="选择移动方式">
          <button class="mode-card primary" data-mode="walk">
            <span class="mode-icon">🚶</span>
            <strong>步行送报</strong>
            <em>速度慢、路线短、最安心</em>
          </button>
          <button class="mode-card" data-mode="bike">
            <span class="mode-icon">🚲</span>
            <strong>骑单车送报</strong>
            <em>地图更远、能看到更多街景</em>
          </button>
        </div>
        <p class="tiny-note">只需要选一种方式。进入后用方向键或 WASD 移动，靠近发光房子后按“投递报纸”。</p>
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
          <div class="card"><strong>${state.config?.routeName || "安心路线"}</strong><p>今日路线</p></div>
          <div class="card"><strong>${state.config?.moveMode === "bike" ? "骑单车" : "步行"}</strong><p>移动方式</p></div>
        </div>
        <div class="button-row">
          <button class="primary" data-action="home">回到首页</button>
          <button data-mode="walk">步行再来一次</button>
          <button data-mode="bike">骑单车再来一次</button>
        </div>
      </section>`;
  }
}
