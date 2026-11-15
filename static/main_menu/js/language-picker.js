/* Seletor com as bandeiras fornecidas, mantendo o select como fonte da preferência. */
(() => {
  const select = document.querySelector("#gameLanguage");
  const picker = document.querySelector("#languagePicker");
  if (!select || !picker) return;

  const button = document.querySelector("#gameLanguageButton");
  const list = document.querySelector("#gameLanguageOptions");
  const options = [...list.querySelectorAll('[role="option"]')];
  const dialog = document.querySelector("#settingsDialog");
  const flag = document.querySelector("#gameLanguageFlag");
  const text = document.querySelector("#gameLanguageText");
  let active = 0;

  function highlight(index) {
    active = index;
    options.forEach((option, position) => option.classList.toggle("is-active", position === active));
    if (!list.hidden) button.setAttribute("aria-activedescendant", options[active].id);
  }

  function sync() {
    const index = options.findIndex(option => option.dataset.language === select.value);
    const selected = options[Math.max(0, index)];
    const selectedFlag = selected.querySelector("img");
    flag.src = selectedFlag.getAttribute("src");
    text.textContent = selected.querySelector("span").textContent;
    text.lang = selected.dataset.language;
    options.forEach(option => option.setAttribute("aria-selected", String(option === selected)));
    highlight(Math.max(0, index));
  }

  function close() {
    list.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.removeAttribute("aria-activedescendant");
  }

  function open() {
    list.hidden = false;
    button.setAttribute("aria-expanded", "true");
    sync();
    placeList();
  }

  function placeList() {
    picker.classList.remove("opens-up");
    const listBounds = list.getBoundingClientRect();
    const dialogBounds = dialog.getBoundingClientRect();
    picker.classList.toggle("opens-up", listBounds.bottom > dialogBounds.bottom - 12);
  }

  function choose(index) {
    select.value = options[index].dataset.language;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    close();
    button.focus();
  }

  button.addEventListener("click", () => list.hidden ? open() : close());
  button.addEventListener("keydown", event => {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const wasClosed = list.hidden;
      if (wasClosed) open();
      if (event.key === "Home") highlight(0);
      else if (event.key === "End") highlight(options.length - 1);
      else if (!wasClosed) highlight((active + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
    } else if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (list.hidden) open();
      else choose(active);
    } else if (event.key === "Escape" && !list.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") close();
  });
  options.forEach((option, index) => {
    option.addEventListener("pointerdown", event => event.preventDefault());
    option.addEventListener("click", () => choose(index));
  });
  document.addEventListener("pointerdown", event => { if (!picker.contains(event.target)) close(); });
  document.addEventListener("focusin", event => { if (!picker.contains(event.target)) close(); });
  dialog.addEventListener("close", close);
  select.addEventListener("change", sync);
  window.addEventListener("languagechange", sync);
  window.addEventListener("resize", () => { if (!list.hidden) placeList(); });

  sync();
  select.hidden = true;
  picker.hidden = false;
  document.querySelector("#gameLanguageLabel").htmlFor = button.id;
})();
