// Bipes 8-bit. O AudioContext só é criado ao ativar o som (precisa de gesto do usuário).
export function createAudio(beeps = []) {
  let ctx = null;
  let enabled = false;
  let i = 0; // próximo bipe da fila

  const play = (freq, dur) => {
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
      if (enabled && !ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (enabled && ctx && ctx.state === 'suspended') ctx.resume();
    },
    /** Dispara os bipes cujo tempo já passou (mesmo com som off, para manter a fila em dia). */
    update(t) {
      while (i < beeps.length && t >= beeps[i][0]) {
        if (enabled && ctx) play(beeps[i][1], beeps[i][2]);
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

