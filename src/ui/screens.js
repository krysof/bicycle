import { t } from "../i18n.js";
export class Screens {
  constructor(root) {
    this.root = root;
  }

  clear() {
    this.root.innerHTML = "";
  }

  title() {
    this.root.innerHTML = `
      <section class="screen narrow title-screen">
        <div class="stamp">${t("stamp")}</div>
        <p class="eyebrow">${t("titleKicker")}</p>
        <h1>${t("homeTitle")}</h1>
        <p class="lead">${t("titleSoundNote")}</p>
        <button class="title-start primary" data-action="title-start">
          <span class="mode-icon">🚲</span>
          <strong>${t("titleStart")}</strong>
        </button>
      </section>`;
  }

  home(record, playerName = "") {
    const last = record.lastSummary;
    const yesterday = last
      ? t("greetingLast", last.count)
      : t("greetingFirst");

    this.root.innerHTML = `
      <section class="screen narrow home-screen simple-home">
        <div class="stamp">${t("stamp")}</div>
        <p class="eyebrow">${t("eyebrow")}</p>
        <h1>${t("homeTitle")}</h1>
        <p class="lead">${playerName ? t("companionHelloNamed", playerName, yesterday) : t("companionHello", yesterday)}</p>
        <label class="name-field">
          <span>${t("playerNameLabel")}</span>
          <input id="playerNameInput" type="text" maxlength="24" value="${playerName}" autocomplete="name" />
          <em>${t("playerNameHelp")}</em>
        </label>
        <div class="mode-grid" aria-label="${t("chooseMode")}">
          <button class="mode-card primary" data-mode="bike">
            <span class="mode-icon">🚲</span>
            <strong>${t("startBike")}</strong>
            <em>${t("startBikeHint")}</em>
          </button>
          <button class="mode-card" data-mode="walk">
            <span class="mode-icon">🚶</span>
            <strong>${t("startWalk")}</strong>
            <em>${t("startWalkHint")}</em>
          </button>
        </div>
        <p class="tiny-note">${t("homeNote")}</p>
      </section>`;
  }

  summary(state, early) {
    const count = state.delivered.length;
    this.root.innerHTML = `
      <section class="screen narrow">
        <p class="eyebrow">${t("todaySummary")}</p>
        <h1>${early ? t("stopToday") : t("doneToday")}</h1>
        <p class="lead">${t("summaryLead", count)}</p>
        <div class="cards">
          <div class="card"><strong>${count}</strong><p>${t("deliveredCount")}</p></div>
          <div class="card"><strong>${state.config?.routeNameKey ? t(state.config.routeNameKey) : (state.config?.routeName || "Route")}</strong><p>${t("route")}</p></div>
          <div class="card"><strong>${state.config?.moveMode === "bike" ? t("modeBike") : t("modeWalk")}</strong><p>${t("mode")}</p></div>
        </div>
        <div class="button-row">
          <button class="primary" data-action="home">${t("home")}</button>
          <button data-mode="walk">${t("walkAgain")}</button>
          <button data-mode="bike">${t("bikeAgain")}</button>
        </div>
      </section>`;
  }
}
