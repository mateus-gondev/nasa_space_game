/* Menu inicial independente da engine de treinamento. */
(() => {
  const $ = selector => document.querySelector(selector);

  function showMenuPage(page) {
    $("#mainMenuHome").hidden = page !== "home";
    document.querySelectorAll(".menu-subpage").forEach(section => {
      section.hidden = section.id !== `${page}Page`;
    });
    const target = page === "home" ? $("#playButton") : $(`#${page}Page .menu-back`);
    target?.focus({ preventScroll: true });
  }

  $("#playButton").addEventListener("click", () => {
    window.location.href = "/lab-training/";
  });
  try {
    const saved = JSON.parse(localStorage.getItem('opportunity.campaign.v1') || 'null');
    if (saved?.version === 1 && saved.meta && saved.life) {
      const resume = $('#continueCampaign');
      resume.hidden = false;
      resume.textContent = window.GameI18n?.t('Continuar expedição') || 'Continuar expedição';
      resume.addEventListener('click', () => { window.location.href = '/mars-test/'; });
    }
  } catch { /* Menu continua disponível com armazenamento inválido. */ }
  $("#infoButton").addEventListener("click", () => showMenuPage("info"));
  document.querySelectorAll("[data-menu-home]").forEach(button => {
    button.addEventListener("click", () => showMenuPage("home"));
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && $(".menu-subpage:not([hidden])")) {
      event.preventDefault();
      showMenuPage("home");
    }
  });
  showMenuPage("home");
})();
