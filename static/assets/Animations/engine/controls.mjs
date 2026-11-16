/** Horizontal mouse/touch drag, extracted from the MARS 01 prototype. */
export function createDragRotation(element, { initial = 0.1, sensitivity = 0.009 } = {}) {
  let angle = initial, pointer = null, x = 0;
  const down = (event) => {
    if (pointer !== null || (event.button !== undefined && event.button !== 0)) return;
    pointer = event.pointerId;
    x = event.clientX;
    element.classList.add('dragging');
    element.setPointerCapture(pointer);
  };
  const move = (event) => {
    if (event.pointerId !== pointer) return;
    angle += (event.clientX - x) * sensitivity;
    x = event.clientX;
  };
  const end = (event) => {
    if (event && event.pointerId !== pointer) return;
    if (pointer !== null && element.hasPointerCapture(pointer)) element.releasePointerCapture(pointer);
    pointer = null;
    element.classList.remove('dragging');
  };
  const handlers = { pointerdown: down, pointermove: move, pointerup: end, pointercancel: end, lostpointercapture: end };
  for (const [name, handler] of Object.entries(handlers)) element.addEventListener(name, handler);
  return {
    get angle() { return angle; },
    reset() { end(); angle = initial; },
    dispose() {
      for (const [name, handler] of Object.entries(handlers)) element.removeEventListener(name, handler);
      end();
    },
  };
}
