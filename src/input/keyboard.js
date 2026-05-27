export function bindKeyboard(state, onDeliver) {
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      event.preventDefault();
      state.keys.add(key);
    }
    if (key === " " || key === "enter") {
      event.preventDefault();
      onDeliver();
    }
  });

  window.addEventListener("keyup", (event) => {
    state.keys.delete(event.key.toLowerCase());
  });
}

export function bindTouchControls(state, onDeliver) {
  const root = document.getElementById("touchControls");
  const deliver = document.getElementById("touchDeliverBtn");
  if (!root) return;

  const endKey = (key) => {
    state.keys.delete(key);
  };

  root.querySelectorAll("[data-touch-key]").forEach((button) => {
    const key = button.dataset.touchKey;
    const start = (event) => {
      event.preventDefault();
      state.keys.add(key);
      button.classList.add("active");
    };
    const end = (event) => {
      event.preventDefault();
      endKey(key);
      button.classList.remove("active");
    };
    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", end);
    button.addEventListener("pointercancel", end);
    button.addEventListener("pointerleave", end);
  });

  deliver?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    onDeliver();
  });
}
