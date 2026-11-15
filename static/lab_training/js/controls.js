/* Leitura de teclado e botões de toque. Não contém lógica de desenho. */
window.MapControls = class MapControls {
  constructor(engine, root = document) {
    this.engine = engine;
    this.keys = new Set();
    this.enabled = true;
    this.movementEnabled = true;
    this.boundKeyDown = event => this.onKeyDown(event);
    this.boundKeyUp = event => this.onKeyUp(event);
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("blur", () => this.keys.clear());
    root.querySelectorAll(".mobile-controls [data-key]").forEach(button => {
      const key = button.dataset.key.toLowerCase();
      button.addEventListener("pointerdown", event => { event.preventDefault(); this.keys.add(key); });
      ["pointerup", "pointerleave", "pointercancel"].forEach(type => button.addEventListener(type, () => this.keys.delete(key)));
    });
    root.querySelector('[data-action="inspect"]')?.addEventListener("click", () => this.engine.interact());
  }

  onKeyDown(event) {
    if (!this.enabled) return;
    const key = event.key.toLowerCase();
    if (["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
    if (key === "e") return;
    if (!this.movementEnabled && !["m", "tab", "escape"].includes(key)) return;
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
    if (!event.repeat && key === " ") { this.engine.inspectNearby(); return; }
    this.keys.add(key);
  }

  onKeyUp(event) { this.keys.delete(event.key.toLowerCase()); }

  getMovement() {
    if (!this.movementEnabled) return { x: 0, y: 0 };
    const left = this.keys.has("a") || this.keys.has("arrowleft");
    const right = this.keys.has("d") || this.keys.has("arrowright");
    const up = this.keys.has("w") || this.keys.has("arrowup");
    const down = this.keys.has("s") || this.keys.has("arrowdown");
    return { x: Number(right) - Number(left), y: Number(down) - Number(up) };
  }
};
