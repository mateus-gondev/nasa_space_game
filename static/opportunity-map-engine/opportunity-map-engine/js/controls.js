/* Leitura de teclado e botões de toque. Não contém lógica de desenho. */
window.MapControls = class MapControls {
  constructor(engine, root = document) {
    this.engine = engine;
    this.keys = new Set();
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
    root.querySelector('[data-action="inspect"]')?.addEventListener("click", () => this.engine.inspectNearby());
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key) && !["BUTTON", "INPUT"].includes(event.target.tagName)) event.preventDefault();
    if (!event.repeat && (key === "e" || key === " " || key === "escape")) {
      if (key === "escape") this.engine.closeInspection();
      else this.engine.inspectNearby();
    }
    this.keys.add(key);
  }

  onKeyUp(event) { this.keys.delete(event.key.toLowerCase()); }

  getMovement() {
    const left = this.keys.has("a") || this.keys.has("arrowleft");
    const right = this.keys.has("d") || this.keys.has("arrowright");
    const up = this.keys.has("w") || this.keys.has("arrowup");
    const down = this.keys.has("s") || this.keys.has("arrowdown");
    return { x: Number(right) - Number(left), y: Number(down) - Number(up) };
  }
};
