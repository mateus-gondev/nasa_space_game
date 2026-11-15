/* Preferências persistentes, modal e canais independentes de música e efeitos. */
(() => {
  const storageKey = "opportunity.labTraining.settings";
  const defaults = { musicVolume: 65, gameVolume: 80, subtitles: true, language: "pt-BR" };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; }
  catch (error) { console.warn("Não foi possível ler as configurações:", error); }
  const volume = (value, fallback) => typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value)) : fallback;
  const settings = {
    musicVolume: volume(saved.musicVolume, defaults.musicVolume),
    gameVolume: volume(saved.gameVolume, defaults.gameVolume),
    subtitles: typeof saved.subtitles === "boolean" ? saved.subtitles : defaults.subtitles,
    language: saved.language === "en" ? "en" : defaults.language
  };
  const dialog = document.querySelector("#settingsDialog");
  const trigger = document.querySelector("#openSettings");
  const music = document.querySelector("#menuMusic");
  const menu = document.querySelector("#mainMenuOverlay");
  const tabs = [...(dialog?.querySelectorAll('[role="tab"]') || [])];
  let audioContext;
  let effectsGain;
  let musicPending = false;

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); }
    catch (error) { console.warn("Não foi possível salvar as configurações:", error); }
  }

  function syncMusic() {
    if (!music || !menu) return;
    music.volume = settings.musicVolume / 100;
    if (menu.hidden || document.hidden || settings.musicVolume === 0) {
      music.pause();
      return;
    }
    if (!music.paused || musicPending) return;
    musicPending = true;
    music.play().then(() => {
      if (menu.hidden || document.hidden || settings.musicVolume === 0) music.pause();
    }).catch(error => {
      // Autoplay pode aguardar uma interação; as próximas tentativas vêm dos controles.
      if (error.name !== "NotAllowedError" && error.name !== "AbortError") console.warn("Falha ao reproduzir a trilha:", error);
    }).finally(() => { musicPending = false; });
  }

  function unlockAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioContext && AudioContextClass) {
      audioContext = new AudioContextClass();
      effectsGain = audioContext.createGain();
      effectsGain.gain.value = settings.gameVolume / 100;
      effectsGain.connect(audioContext.destination);
    }
    if (audioContext?.state === "suspended") audioContext.resume().catch(() => {});
    syncMusic();
  }

  function playEffect(frequency = 520, duration = .06) {
    if (!audioContext || audioContext.state !== "running" || settings.gameVolume === 0) return;
    if (!Number.isFinite(frequency) || !Number.isFinite(duration)) return;
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.value = Math.max(80, Math.min(2000, frequency));
    envelope.gain.setValueAtTime(.045, now);
    const end = now + Math.max(.02, Math.min(.5, duration));
    envelope.gain.exponentialRampToValueAtTime(.001, end);
    oscillator.connect(envelope);
    envelope.connect(effectsGain);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(now);
    oscillator.stop(end);
  }

  function applySettings() {
    document.documentElement.dataset.subtitles = settings.subtitles ? "on" : "off";
    for (const channel of ["music", "game"]) {
      const input = document.querySelector(`#${channel}Volume`);
      if (!input) continue;
      input.value = settings[`${channel}Volume`];
      input.style.setProperty("--volume", `${input.value}%`);
      document.querySelector(`#${channel}VolumeValue`).value = `${input.value}%`;
    }
    const subtitlesInput = document.querySelector("#subtitlesEnabled");
    const languageInput = document.querySelector("#gameLanguage");
    if (subtitlesInput) subtitlesInput.checked = settings.subtitles;
    if (languageInput) languageInput.value = settings.language;
    if (effectsGain) effectsGain.gain.value = settings.gameVolume / 100;
    window.GameI18n.setLanguage(settings.language);
    syncMusic();
  }

  function selectTab(tab, focus = false) {
    tabs.forEach(button => {
      const selected = button === tab;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      document.getElementById(button.getAttribute("aria-controls")).hidden = !selected;
    });
    if (focus) tab.focus();
  }

  trigger?.addEventListener("click", () => {
    selectTab(tabs[0]);
    dialog.showModal();
    tabs[0].focus();
  });
  document.querySelector("#closeSettings")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("close", () => trigger?.focus());
  dialog?.addEventListener("click", event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", event => {
      let next;
      if (["ArrowDown", "ArrowRight"].includes(event.key)) next = (index + 1) % tabs.length;
      if (["ArrowUp", "ArrowLeft"].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[next], true);
    });
  });
  ["music", "game"].forEach(channel => {
    document.querySelector(`#${channel}Volume`)?.addEventListener("input", event => {
      settings[`${channel}Volume`] = Number(event.target.value);
      save();
      applySettings();
    });
  });
  document.querySelector("#gameVolume")?.addEventListener("change", () => playEffect());
  document.querySelector("#subtitlesEnabled")?.addEventListener("change", event => {
    settings.subtitles = event.target.checked;
    save();
    applySettings();
  });
  document.querySelector("#gameLanguage")?.addEventListener("change", event => {
    settings.language = event.target.value;
    save();
    applySettings();
  });
  document.addEventListener("pointerdown", unlockAudio, { capture: true });
  document.addEventListener("keydown", unlockAudio, { capture: true });
  document.addEventListener("click", event => {
    if (event.target.closest("button") && !event.target.closest("#appShell")) playEffect(460, .035);
  });
  document.addEventListener("visibilitychange", syncMusic);
  window.addEventListener("pagehide", () => music?.pause());
  if (menu) new MutationObserver(syncMusic).observe(menu, { attributes: true, attributeFilter: ["hidden"] });

  window.GamePreferences = { get: () => ({ ...settings }), playEffect, syncMusic };
  applySettings();
})();
