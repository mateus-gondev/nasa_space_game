/* Menu inicial independente da engine de treinamento. */
(() => {
  const $ = selector => document.querySelector(selector);

  const infoButton = $("#infoButton");
  const infoDialog = $("#infoDialog");

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
  infoButton.addEventListener("click", () => infoDialog.showModal());
  $("#closeInfo").addEventListener("click", () => infoDialog.close());
  infoDialog.addEventListener("close", () => infoButton.focus({ preventScroll: true }));
  infoDialog.addEventListener("click", event => {
    if (event.target !== infoDialog) return;
    const { left, right, top, bottom } = infoDialog.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
      infoDialog.close();
    }
  });
  $("#playButton").focus({ preventScroll: true });
})();
