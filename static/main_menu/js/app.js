/* Menu inicial independente da engine de treinamento. */
(() => {
  const $ = selector => document.querySelector(selector);

  function showMenuPage(page) {
    $("#mainMenuHome").hidden = page !== "home";
    document.querySelectorAll(".menu-subpage").forEach(section => {
      section.hidden = section.id !== `${page}Page`;
    });
    const target = page === "home" ? $("#playButton") : $(`#${page}Page .menu-back`);
    target?.focus();
  }

  $("#playButton").addEventListener("click", () => {
    window.location.href = "/lab-training/";
  });
  for (const page of ["info", "credits"]) {
    $(`#${page}Button`).addEventListener("click", () => showMenuPage(page));
  }
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
