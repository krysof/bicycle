import { neighbors } from "../data/neighbors.js";
import { questions } from "../data/questions.js";

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
      ? `我还记得上次你送到了 ${last.count} 户，收到了 ${last.thanks} 句感谢。`
      : "今天是我们第一次出发，我会一直陪着你。";

    this.root.innerHTML = `
      <section class="screen narrow home-screen">
        <div class="stamp">昭和町内会</div>
        <p class="eyebrow">陪伴型 3D 送报原型</p>
        <h1>今天也要送到</h1>
        <p class="lead">阿铃：早上好，见到你真高兴。${yesterday}</p>
        <div class="cards">
          <div class="card"><strong>有人陪伴</strong><p>开局问候、途中鼓励、完成感谢。</p></div>
          <div class="card"><strong>轻松用脑</strong><p>记住邻居、选择报纸、寻找线索。</p></div>
          <div class="card"><strong>联机预留</strong><p>后续支持家人留言、结伴送报、友好对战。</p></div>
        </div>
        <div class="button-row">
          <button class="primary" data-action="status">开始今天的问候</button>
          <button class="secondary" data-action="coop" disabled>结伴送报：后续开放</button>
        </div>
      </section>`;
  }

  statusForm() {
    const form = questions
      .map(
        (q) => `
        <fieldset class="question">
          <legend><h2>${q.title}</h2></legend>
          <div class="choices">
            ${q.options
              .map(
                ([value, label], index) => `
                <label class="choice">
                  <input type="radio" name="${q.id}" value="${value}" ${index === 1 ? "checked" : ""} />
                  <span>${label}</span>
                </label>`
              )
              .join("")}
          </div>
        </fieldset>`
      )
      .join("");

    this.root.innerHTML = `
      <section class="screen">
        <p class="eyebrow">阿铃的每日关心</p>
        <h1>今天感觉怎么样？</h1>
        <p class="lead">这些回答只用来帮你安排今天的路线。没有好坏，也没有考试。</p>
        <form id="statusForm">
          ${form}
          <div class="button-row">
            <button class="primary" type="submit">安排今天的路线</button>
            <button type="button" data-action="home">返回</button>
          </div>
        </form>
      </section>`;
  }

  briefing(state) {
    const memoryTarget = neighbors.find((n) => n.roof === "#4f91d5");
    const cards = state.route
      .map(
        (n, i) => `
        <div class="card">
          <strong>${i + 1}. ${n.name}</strong>
          <p>报纸：${n.paper}</p>
          <p>线索：${n.clue}</p>
        </div>`
      )
      .join("");

    this.root.innerHTML = `
      <section class="screen">
        <p class="eyebrow">${state.config.routeName}</p>
        <h1>今天我们送 ${state.route.length} 户</h1>
        <p class="lead">阿铃：今天使用「${state.config.moveMode === "bike" ? "骑单车" : "步行"}」模式。靠近住户后按 <kbd>空格</kbd> 或点击大按钮投递。</p>
        <div class="cards">${cards}</div>
        <div class="question memory-box">
          <h2>出发前想一想</h2>
          <p>蓝色屋顶的是哪一家？答错也没关系，阿铃会提醒你。</p>
          <div class="button-row">
            <button data-memory="${memoryTarget.name}">${memoryTarget.name}</button>
            <button data-memory="铃木奶奶">铃木奶奶</button>
            <button data-memory="田中先生">田中先生</button>
          </div>
          <p id="memoryFeedback"></p>
        </div>
        <div class="button-row">
          <button class="primary" data-action="play">领取报纸，出发</button>
          <button data-action="status">重新选择状态</button>
        </div>
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
        <p>后续版本这里会加入：给家人留一句话、收到家人鼓励、结伴送报成绩卡。</p>
        <div class="button-row">
          <button class="primary" data-action="home">回到首页</button>
          <button data-action="status">再送一次</button>
        </div>
      </section>`;
  }
}
