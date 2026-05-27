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
