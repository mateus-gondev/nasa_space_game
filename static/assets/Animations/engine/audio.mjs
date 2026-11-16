// Bipes 8-bit. O AudioContext só é criado ao ativar o som (precisa de gesto do usuário).
export function createAudio(beeps = []) {
  const bridge = window.AnimationPreferences?.embedded ? window.AnimationPreferences : null;
  let ctx = null;
  let enabled = false;
  let i = 0; // próximo bipe da fila

  const play = (freq, dur) => {
    if (bridge) { bridge.playEffect(freq, dur); return; }
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(ctx.destination);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
    o.start();
    o.stop(ctx.currentTime + dur);
  };

  return {
    setEnabled(on) {
      enabled = !!on;
      if (enabled && !ctx && !bridge) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (enabled && ctx && ctx.state === 'suspended') ctx.resume();
    },
    /** Dispara os bipes cujo tempo já passou (mesmo com som off, para manter a fila em dia). */
    update(t) {
      while (i < beeps.length && t >= beeps[i][0]) {
        if (enabled && (ctx || bridge)) play(beeps[i][1], beeps[i][2]);
        i++;
      }
    },
    reset() {
      i = 0;
    },
    dispose() {
      if (ctx) ctx.close();
      ctx = null;
    },
  };
}
