/* Menu inicial independente da engine de treinamento. */
(() => {
  const $ = selector => document.querySelector(selector);
  let atmosphere = "clean";

  function showMenuPage(page) {
    $("#mainMenuHome").hidden = page !== "home";
    document.querySelectorAll(".menu-subpage").forEach(section => {
      section.hidden = section.id !== `${page}Page`;
    });
    const target = page === "home" ? $("#playButton") : $(`#${page}Page .menu-back`);
    target?.focus();
  }

  $("#playButton").addEventListener("click", () => {
    window.location.href = `/lab-training/?atmosphere=${encodeURIComponent(atmosphere)}`;
  });
  for (const page of ["settings", "info", "credits"]) {
    $(`#${page}Button`).addEventListener("click", () => showMenuPage(page));
  }
  document.querySelectorAll("[data-menu-home]").forEach(button => {
    button.addEventListener("click", () => showMenuPage("home"));
  });
  document.querySelectorAll("[data-atmosphere]").forEach(button => {
    button.classList.toggle("selected", button.dataset.atmosphere === atmosphere);
    button.addEventListener("click", () => {
      atmosphere = button.dataset.atmosphere;
      document.querySelectorAll("[data-atmosphere]").forEach(option => {
        option.classList.toggle("selected", option.dataset.atmosphere === atmosphere);
      });
    });
  });
  $("#settingsFullscreenButton").addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error("Não foi possível alternar para tela cheia:", error);
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && $(".menu-subpage:not([hidden])")) {
      event.preventDefault();
      showMenuPage("home");
    }
  });
  showMenuPage("home");
})();
