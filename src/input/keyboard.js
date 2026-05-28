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
  const forward = document.getElementById("touchForwardBtn");
  const back = document.getElementById("touchBackBtn");
  const deliver = document.getElementById("touchDeliverBtn");
  if (!root) return;

  const clearTouchSteer = () => {
    state.touchSteer = 0;
  };

  const setTouchSteer = (dx) => {
    const steerDeadZone = 0.16;
    const steer = Math.abs(dx) > steerDeadZone
      ? Math.sign(dx) * Math.min(1, ((Math.abs(dx) - steerDeadZone) / (1 - steerDeadZone)) ** 1.35)
      : 0;
    state.touchSteer = steer;
    // 手机端摇杆只控制左右方向；前进由右侧独立按钮按住触发。
  };

  if (joystick && stick) {
    let activePointerId = null;
    const max = 56;

    const updateJoystick = (event) => {
      const rect = joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = event.clientX - cx;
      dx = Math.max(-max, Math.min(max, dx));
      stick.style.transform = `translate(${dx}px, 0)`;
      setTouchSteer(dx / max);
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
      clearTouchSteer();
      joystick.classList.remove("active");
      stick.style.transform = "translate(0, 0)";
    };

    joystick.addEventListener("pointerdown", start);
    joystick.addEventListener("pointermove", move);
    joystick.addEventListener("pointerup", end);
    joystick.addEventListener("pointercancel", end);
    joystick.addEventListener("lostpointercapture", () => {
      activePointerId = null;
      clearTouchSteer();
      joystick.classList.remove("active");
      stick.style.transform = "translate(0, 0)";
    });
  }

  if (forward) {
    let forwardPointerId = null;
    const start = (event) => {
      event.preventDefault();
      forwardPointerId = event.pointerId;
      forward.setPointerCapture?.(event.pointerId);
      state.touchThrottle = 1;
      forward.classList.add("active");
    };
    const end = (event) => {
      if (forwardPointerId !== null && event.pointerId !== forwardPointerId) return;
      event.preventDefault();
      forwardPointerId = null;
      state.touchThrottle = 0;
      forward.classList.remove("active");
    };
    forward.addEventListener("pointerdown", start);
    forward.addEventListener("pointerup", end);
    forward.addEventListener("pointercancel", end);
    forward.addEventListener("lostpointercapture", () => {
      forwardPointerId = null;
      state.touchThrottle = 0;
      forward.classList.remove("active");
    });
  }

  if (back) {
    let backPointerId = null;
    const start = (event) => {
      event.preventDefault();
      backPointerId = event.pointerId;
      back.setPointerCapture?.(event.pointerId);
      state.touchThrottle = -1;
      back.classList.add("active");
    };
    const end = (event) => {
      if (backPointerId !== null && event.pointerId !== backPointerId) return;
      event.preventDefault();
      backPointerId = null;
      state.touchThrottle = 0;
      back.classList.remove("active");
    };
    back.addEventListener("pointerdown", start);
    back.addEventListener("pointerup", end);
    back.addEventListener("pointercancel", end);
    back.addEventListener("lostpointercapture", () => {
      backPointerId = null;
      state.touchThrottle = 0;
      back.classList.remove("active");
    });
  }

  deliver?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    onDeliver();
  });
}
