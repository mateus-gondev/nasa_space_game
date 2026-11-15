/* Ponte das animações de preparação para idioma, legendas e efeitos do jogo. */
(() => {
  const params = new URLSearchParams(location.search);
  const embedded = params.get("embed") === "1";
  window.GameI18n.setLanguage(params.get("lang"));
  const captionsEnabled = params.get("subtitles") !== "0";
  document.querySelectorAll("#caption, #cap").forEach(element => { element.hidden = !captionsEnabled; });
  document.querySelectorAll("#hud div").forEach(element => { element.textContent = window.GameI18n.t(element.textContent); });
  window.AnimationPreferences = {
    t: window.GameI18n.t,
    playEffect(frequency, duration = .12) {
      if (!embedded) return false;
      window.parent.postMessage({ type: "equipment-sound", frequency, duration }, location.origin);
      return true;
    }
  };
})();
