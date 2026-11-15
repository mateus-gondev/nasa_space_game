/* Leitura de teclado, toque e gamepad. Não contém lógica de desenho. */
window.MapControls = class MapControls {
  constructor(engine, root = document) {
    this.engine = engine;
    this.keys = new Set();
    this.enabled = true;
    this.movementEnabled = true;
    this.deadzone = 0.18;
    this.gamepadIndex = null;
    this.gamepadConnected = false;
    this.inputMode = "keyboard";
    this.gamepadButtons = [];
    this.gamepadStateReady = false;
    this.navigationReady = false;
    this.navigationDirection = 0;
    this.nextNavigationAt = 0;
    this.gamepadFrame = null;
    this.boundKeyDown = event => this.onKeyDown(event);
    this.boundKeyUp = event => this.onKeyUp(event);
    this.boundGamepadPoll = timestamp => this.pollGamepad(timestamp);
    this.boundGamepadConnected = event => this.connectGamepad(event.gamepad);
    this.boundGamepadDisconnected = event => this.disconnectGamepad(event.gamepad);
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("blur", () => this.keys.clear());
    window.addEventListener("pointerdown", () => this.setInputMode("mouse"));
    window.addEventListener("gamepadconnected", this.boundGamepadConnected);
    window.addEventListener("gamepaddisconnected", this.boundGamepadDisconnected);
    root.querySelectorAll(".mobile-controls [data-key]").forEach(button => {
      const key = button.dataset.key.toLowerCase();
      button.addEventListener("pointerdown", event => { event.preventDefault(); this.keys.add(key); });
      ["pointerup", "pointerleave", "pointercancel"].forEach(type => button.addEventListener(type, () => this.keys.delete(key)));
    });
    root.querySelector('[data-action="inspect"]')?.addEventListener("click", () => this.engine.interact("button"));
    this.connectGamepad(this.findConnectedGamepad());
  }

  setInputMode(mode) {
    if (this.inputMode === mode) return;
    this.inputMode = mode;
    this.engine.onInputModeChange?.(mode);
  }

  getGamepads() {
    const getGamepads = window.navigator?.getGamepads;
    return typeof getGamepads === "function" ? getGamepads.call(window.navigator) : [];
  }

  findConnectedGamepad() {
    const pads = this.getGamepads();
    return Array.from(pads || []).find(gamepad => gamepad?.connected) || null;
  }

  getActiveGamepad() {
    const pads = this.getGamepads();
    const current = this.gamepadIndex === null ? null : pads?.[this.gamepadIndex];
    return current?.connected ? current : this.findConnectedGamepad();
  }

  connectGamepad(gamepad, schedulePoll = true) {
    if (!gamepad?.connected) return;
    const changed = !this.gamepadConnected || this.gamepadIndex !== gamepad.index;
    this.gamepadIndex = gamepad.index;
    this.gamepadConnected = true;
    if (changed) {
      this.gamepadStateReady = false;
      this.navigationReady = false;
      this.navigationDirection = 0;
      this.gamepadButtons = [];
      this.engine.onGamepadChange?.(true);
      this.setInputMode("gamepad");
    }
    if (schedulePoll && this.gamepadFrame === null && typeof window.requestAnimationFrame === "function") {
      this.gamepadFrame = window.requestAnimationFrame(this.boundGamepadPoll);
    }
  }

  disconnectGamepad(gamepad) {
    if (gamepad && gamepad.index !== this.gamepadIndex) return;
    const next = this.findConnectedGamepad();
    if (next) {
      this.connectGamepad(next);
      return;
    }
    if (!this.gamepadConnected) return;
    this.gamepadIndex = null;
    this.gamepadConnected = false;
    this.gamepadButtons = [];
    this.gamepadStateReady = false;
    this.navigationReady = false;
    this.navigationDirection = 0;
    if (this.gamepadFrame !== null && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(this.gamepadFrame);
    }
    this.gamepadFrame = null;
    this.engine.onGamepadChange?.(false);
    this.setInputMode("keyboard");
  }

  readStick(gamepad) {
    const rawX = Number.isFinite(gamepad?.axes?.[0]) ? gamepad.axes[0] : 0;
    const rawY = Number.isFinite(gamepad?.axes?.[1]) ? gamepad.axes[1] : 0;
    const magnitude = Math.hypot(rawX, rawY);
    if (magnitude <= this.deadzone) return { x: 0, y: 0 };
    const intensity = Math.min(1, (magnitude - this.deadzone) / (1 - this.deadzone));
    return { x: rawX / magnitude * intensity, y: rawY / magnitude * intensity };
  }

  pollGamepad(timestamp) {
    this.gamepadFrame = null;
    const gamepad = this.getActiveGamepad();
    if (!gamepad) {
      this.disconnectGamepad();
      return;
    }
    if (!this.gamepadConnected || this.gamepadIndex !== gamepad.index) this.connectGamepad(gamepad, false);

    const stick = this.readStick(gamepad);
    if (stick.x || stick.y) this.setInputMode("gamepad");
    this.pollButtons(gamepad);
    this.pollToolNavigation(stick, timestamp);
    if (typeof window.requestAnimationFrame === "function") {
      this.gamepadFrame = window.requestAnimationFrame(this.boundGamepadPoll);
    }
  }

  pollButtons(gamepad) {
    const buttons = Array.from(gamepad.buttons || [], button => Boolean(button?.pressed || button?.value >= 0.5));
    if (!this.gamepadStateReady) {
      this.gamepadButtons = buttons;
      this.gamepadStateReady = true;
      return;
    }
    const justPressed = [0, 5, 2].map(index => Boolean(buttons[index] && !this.gamepadButtons[index]));
    const pressedThisFrame = buttons.some((pressed, index) => pressed && !this.gamepadButtons[index]);
    this.gamepadButtons = buttons;
    if (pressedThisFrame) this.setInputMode("gamepad");
    if (justPressed[0]) this.engine.onGamepadInteract?.();
    if (justPressed[1]) this.engine.onToolPanelToggle?.();
    if (justPressed[2]) this.engine.onToolConfirm?.();
  }

  pollToolNavigation(stick, timestamp = 0) {
    if (this.engine.onToolNavigate === undefined) return;
    let direction = 0;
    if (Math.max(Math.abs(stick.x), Math.abs(stick.y)) >= 0.55) {
      const axis = Math.abs(stick.x) > Math.abs(stick.y) ? stick.x : stick.y;
      direction = axis < 0 ? -1 : 1;
    }
    if (!direction) {
      this.navigationReady = true;
      this.navigationDirection = 0;
      return;
    }
    if (!this.navigationReady) return;
    if (direction !== this.navigationDirection || timestamp >= this.nextNavigationAt) {
      this.engine.onToolNavigate(direction);
      this.navigationDirection = direction;
      this.nextNavigationAt = timestamp + 280;
    }
  }

  onKeyDown(event) {
    if (!this.enabled) return;
    const key = event.key.toLowerCase();
    if (["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
    this.setInputMode("keyboard");
    if (!this.movementEnabled && !["m", "tab", "escape", "1", "2", "3", "4"].includes(key)) return;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "tab"].includes(key)) event.preventDefault();
    if (!event.repeat && ["1", "2", "3", "4"].includes(key)) {
      this.engine.onToolSelect?.(Number(key));
      return;
    }
    if (!event.repeat && key === "m") { this.engine.onMapToggle?.(); return; }
    if (!event.repeat && key === "tab") { this.engine.onInventoryToggle?.(); return; }
    if (!event.repeat && key === "escape") {
      if (!this.engine.onEscape?.()) this.engine.closeInspection();
      return;
    }
    if (!event.repeat && key === "e") { this.engine.interact("keyboard"); return; }
    if (!event.repeat && key === " ") { this.engine.inspectNearby(); return; }
    this.keys.add(key);
  }

  onKeyUp(event) { this.keys.delete(event.key.toLowerCase()); }

  getMovement() {
    if (!this.movementEnabled) return { x: 0, y: 0 };
    const keyboardX = Number(this.keys.has("d") || this.keys.has("arrowright")) - Number(this.keys.has("a") || this.keys.has("arrowleft"));
    const keyboardY = Number(this.keys.has("s") || this.keys.has("arrowdown")) - Number(this.keys.has("w") || this.keys.has("arrowup"));
    const stick = this.readStick(this.getActiveGamepad());
    let x = keyboardX + stick.x;
    let y = keyboardY + stick.y;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) { x /= magnitude; y /= magnitude; }
    return { x, y };
  }
};
