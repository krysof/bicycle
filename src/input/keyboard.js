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
  const joystick = document.getElementById("touchJoystick");
  const stick = document.getElementById("touchStick");
  const deliver = document.getElementById("touchDeliverBtn");
  if (!root) return;

  const touchKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright"];

  const endKey = (key) => {
    state.keys.delete(key);
  };

  const clearTouchKeys = () => {
    touchKeys.forEach((key) => state.keys.delete(key));
    state.touchThrottle = 0;
    state.touchSteer = 0;
  };

  const setTouchKeys = (dx, dy) => {
    clearTouchKeys();
    const steerDeadZone = 0.16;
    const throttleDeadZone = 0.18;
    const steer = Math.abs(dx) > steerDeadZone
      ? Math.sign(dx) * Math.min(1, ((Math.abs(dx) - steerDeadZone) / (1 - steerDeadZone)) ** 1.35)
      : 0;
    const throttle = Math.abs(dy) > throttleDeadZone
      ? Math.sign(-dy) * Math.min(1, (Math.abs(dy) - throttleDeadZone) / (1 - throttleDeadZone))
      : 0;
    state.touchSteer = steer;
    state.touchThrottle = throttle;
    // 摇杆使用连续数值控制，避免像键盘一样“一按到底”导致手机端转向过猛。
    // 不再向 keys 写入方向键，防止键盘式满转向和摇杆数值双重叠加。
  };

  if (joystick && stick) {
    let activePointerId = null;
    const max = 56;

    const updateJoystick = (event) => {
      const rect = joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = event.clientX - cx;
      let dy = event.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > max) {
        dx = (dx / len) * max;
        dy = (dy / len) * max;
      }
      stick.style.transform = `translate(${dx}px, ${dy}px)`;
      setTouchKeys(dx / max, dy / max);
    };

    const start = (event) => {
      event.preventDefault();
      activePointerId = event.pointerId;
      joystick.setPointerCapture?.(event.pointerId);
      joystick.classList.add("active");
      updateJoystick(event);
    };

    const move = (event) => {
      if (activePointerId !== event.pointerId) return;
      event.preventDefault();
      updateJoystick(event);
    };

    const end = (event) => {
      if (activePointerId !== event.pointerId) return;
      event.preventDefault();
      activePointerId = null;
      clearTouchKeys();
      joystick.classList.remove("active");
      stick.style.transform = "translate(0, 0)";
    };

    joystick.addEventListener("pointerdown", start);
    joystick.addEventListener("pointermove", move);
    joystick.addEventListener("pointerup", end);
    joystick.addEventListener("pointercancel", end);
    joystick.addEventListener("lostpointercapture", () => {
      activePointerId = null;
      clearTouchKeys();
      joystick.classList.remove("active");
      stick.style.transform = "translate(0, 0)";
    });
  }

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
