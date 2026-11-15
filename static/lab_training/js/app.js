/* Inicialização da interface. A engine também pode ser controlada pelo console. */
(() => {
  const config = window.MAP_ENGINE_CONFIG;
  const map = window.MAP_DATA;
  const $ = selector => document.querySelector(selector);
  const profileStorageKey = "opportunity.labTraining.profile";
  const defaultCharacter = "astronaut";
  function loadSavedProfile() {
    let serialized;
    try {
      serialized = window.localStorage.getItem(profileStorageKey);
    } catch (error) {
      console.error("Não foi possível ler o perfil salvo:", error);
      return null;
    }
    if (!serialized) return null;
    let profile;
    try {
      profile = JSON.parse(serialized);
    } catch (error) {
      console.error("O perfil salvo está inválido:", error);
      return null;
    }
    if (!profile || typeof profile.name !== "string" || !profile.name.trim()) {
      console.warn("O perfil salvo não contém um nome válido.");
      return null;
    }
    if (profile.character !== defaultCharacter) {
      console.warn(`Personagem salvo não reconhecido: ${profile.character}. Usando o astronauta padrão.`);
    }
    return { name: profile.name.trim(), character: defaultCharacter };
  }
  const savedProfile = loadSavedProfile();
  const canvas = $("#gameCanvas");
  const inspectCard = $("#inspectCard");
  const interactionHint = $("#interactionHint");
  const animationFeedback = $("#animationFeedback");
  const mainMenuOverlay = $("#mainMenuOverlay");
  const mainMenuHome = $("#mainMenuHome");
  const introOverlay = $("#introOverlay");
  const equipmentAnimationOverlay = $("#equipmentAnimationOverlay");
  const equipmentAnimationFrame = $("#equipmentAnimationFrame");
  const mapOverlay = $("#mapOverlay");
  const inventoryOverlay = $("#inventoryOverlay");
  const quickToolsPanel = $("#quickToolsPanel");
  const miniMap = $("#miniMap");
  const tutorialObjective = $("#tutorialObjective");
  const tutorialFeedback = $("#tutorialFeedback");
  const cadetInput = $("#cadetName");
  const appShell = $("#appShell");
  const fullscreenButton = $("#fullscreenButton");

  const tools = [
    { key: 1, name: "Câmera científica", icon: "camera", detail: "Fotografa terrenos e materiais", target: "telescope", targetName: "Pancam", result: "Imagem panorâmica registrada na mochila." },
    { key: 2, name: "Microscópio portátil", icon: "microscope", detail: "Analisa amostras de perto", target: "micro", targetName: "Microscopic Imager", result: "Análise microscópica da amostra registrada." },
    { key: 3, name: "Sensor de temperatura", icon: "temperature", detail: "Mede a temperatura de sólidos", target: "spec", targetName: "amostra no espectrômetro", result: "Leitura registrada: superfície sólida a -21,6 °C." },
    { key: 4, name: "Furadeira de amostras", icon: "drill", detail: "Extrai material do solo", target: "bench", targetName: "bancada de amostras", result: "Amostra de rególito extraída e guardada." }
  ];
  let tutorialPhase = savedProfile ? "gravity" : "intro";
  let cadetName = savedProfile?.name || "";
  let character = savedProfile?.character || defaultCharacter;
  let selectedTool = null;
  let suitWorn = Boolean(savedProfile);
  let helmetWorn = Boolean(savedProfile);
  let activeEquipmentAnimation = null;
  const completedTests = new Set();
  const inventoryItems = [];
  let feedbackTimer = 0;

  const engine = new MapEngine({
    canvas, config, map,
    onStateChange: updateInterface,
    onInspect: showInspection,
    onInteract: handleInteraction
  });
  appShell.inert = true;
  engine.controls.enabled = false;
  engine.controls.movementEnabled = false;
  engine.onToolSelect = handleToolShortcut;
  engine.onMapToggle = toggleMap;
  engine.onInventoryToggle = toggleInventory;
  engine.onEscape = handleEscape;

  function objectiveForPhase() {
    if (tutorialPhase === "gravity") {
      return {
        title: "Teste de gravidade marciana",
        description: "Vá até a Antena de Alto Ganho e pressione E para iniciar a calibração."
      };
    }
    if (tutorialPhase === "tools") {
      return {
        title: `Treino de ferramentas · ${completedTests.size}/4`,
        description: "Caminhe pelo laboratório; aproxime-se do equipamento indicado, selecione a ferramenta com 1–4 e pressione E."
      };
    }
    if (tutorialPhase === "complete") {
      return {
        title: "Treinamento inicial concluído",
        description: "As quatro ferramentas foram testadas. Continue explorando a instalação e consulte o mapa com M."
      };
    }
    return null;
  }

  function updateInterface(state = engine.getState()) {
    $("#telemetryRoom").textContent = state.room;
    $("#telemetryMood").textContent = state.mood;
    $("#telemetryPosition").textContent = state.position;
    $("#telemetryTarget").textContent = state.target;
    $("#telemetryAnimation").textContent = state.animation;
    $("#telemetryCadet").textContent = cadetName || "Astronauta";
    $("#hudCadetName").textContent = cadetName || "Astronauta";
    $("#hudLocation").textContent = state.room;
    $("#pausedOverlay").hidden = !state.paused;
    const pauseButton = $("#pauseButton");
    pauseButton.textContent = state.paused ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-label", state.paused ? "Continuar" : "Pausar");
    pauseButton.title = state.paused ? "Continuar" : "Pausar";

    const objective = objectiveForPhase();
    tutorialObjective.hidden = !objective;
    if (objective) {
      $("#tutorialTitle").textContent = objective.title;
      $("#tutorialDescription").textContent = objective.description;
    }

    const activeTutorial = ["gravity", "tools", "complete"].includes(tutorialPhase);
    interactionHint.hidden = !activeTutorial || !engine.nearObject || Boolean(engine.inspectedObject) || !mapOverlay.hidden || !inventoryOverlay.hidden;
    if (!interactionHint.hidden) {
      if (tutorialPhase === "gravity") {
        interactionHint.textContent = "E · CALIBRAR";
      } else if (tutorialPhase === "tools" && selectedTool) {
        interactionHint.textContent = "E · USAR FERRAMENTA";
      } else {
        interactionHint.textContent = "E · ANALISAR";
      }
    }

    document.querySelectorAll(".mood-button").forEach(button => button.classList.toggle("active", button.dataset.mood === state.atmosphere));
    document.querySelectorAll(".animation-button").forEach(button => button.classList.toggle("active", button.dataset.animation === state.animation));
    document.querySelectorAll(".tool-button").forEach(button => {
      const key = Number(button.dataset.tool);
      button.classList.toggle("active", selectedTool === key);
      button.setAttribute("aria-pressed", String(selectedTool === key));
      const progress = button.querySelector(".tool-progress");
      progress.textContent = completedTests.has(key) ? "OK" : selectedTool === key ? "ATIVA" : "";
    });
    const researchAction = $("#researchAction");
    const researchActionIcon = $("#researchActionIcon");
    const researchActionName = $("#researchActionName");
    const researchActionShortcut = $("#researchActionShortcut");
    const activeTool = tools.find(tool => tool.key === selectedTool);
    researchAction.setAttribute("aria-pressed", String(Boolean(activeTool)));
    if (activeTool) {
      researchActionIcon.src = `/assets/visuals/hud_assets/svg/tool_${activeTool.icon}.svg`;
      researchActionIcon.alt = "";
      researchActionName.textContent = activeTool.name;
      researchActionShortcut.hidden = true;
      researchAction.title = `${activeTool.name} · clicar para trocar`;
      researchAction.setAttribute("aria-label", `${activeTool.name}. Abrir ferramentas científicas`);
    } else {
      researchActionIcon.src = "/assets/visuals/hud_assets/svg/acao_3_pesquisa.svg";
      researchActionName.textContent = "PESQUISA";
      researchActionShortcut.hidden = false;
      researchAction.title = "Abrir ferramentas científicas";
      researchAction.setAttribute("aria-label", "Pesquisa científica (1–4)");
    }

  }

  function showInspection(prop) {
    inspectCard.hidden = !prop;
    if (!prop) return;
    $("#inspectTitle").textContent = prop.name;
    $("#inspectDescription").textContent = prop.description;
    if (tutorialPhase === "tools" && !selectedTool) {
      showFeedback("Escolha uma ferramenta · 1–4");
    }
  }

  function showFeedback(message) {
    window.clearTimeout(feedbackTimer);
    tutorialFeedback.textContent = message;
    tutorialFeedback.hidden = false;
    feedbackTimer = window.setTimeout(() => { tutorialFeedback.hidden = true; }, 2200);
  }

  function renderToolControls() {
    const container = $("#toolControls");
    tools.forEach(tool => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tool-button";
      button.dataset.tool = String(tool.key);
      button.setAttribute("aria-pressed", "false");
      const icon = document.createElement("img");
      icon.src = `/assets/visuals/hud_assets/svg/tool_${tool.icon}.svg`;
      icon.alt = "";
      const key = document.createElement("kbd");
      key.textContent = String(tool.key);
      const name = document.createElement("span");
      name.textContent = tool.name;
      const progress = document.createElement("span");
      progress.className = "tool-progress";
      button.append(icon, name, key, progress);
      button.title = tool.detail;
      button.addEventListener("click", () => selectTool(tool.key));
      container.append(button);
    });
  }

  function selectTool(key) {
    if (!tools.some(tool => tool.key === key) || tutorialPhase === "intro" || tutorialPhase === "suit" || !mapOverlay.hidden || !inventoryOverlay.hidden) return;
    selectedTool = key;
    quickToolsPanel.hidden = true;
    $("#researchAction").setAttribute("aria-expanded", "false");
    engine.closeInspection();
    showFeedback(`${tools[key - 1].name} ativa`);
    setModalState();
  }

  function handleToolShortcut(key) {
    if (!quickToolsPanel.hidden) {
      selectTool(key);
      return;
    }
    if (key === 3) {
      toggleQuickTools();
      return;
    }
    selectTool(key);
  }

  function handleInteraction(prop) {
    if (!mapOverlay.hidden || !inventoryOverlay.hidden) return true;
    if (tutorialPhase === "gravity") {
      if (prop.type !== "dish") {
        showFeedback("Encontre a antena.");
        return true;
      }
      tutorialPhase = "tools";
      selectedTool = null;
      engine.closeInspection();
      showFeedback("Gravidade marciana calibrada.");
      updateInterface();
      return true;
    }
    if (tutorialPhase !== "tools" || !selectedTool) return false;

    const tool = tools[selectedTool - 1];
    if (prop.type !== tool.target) {
      showFeedback(`Use em ${tool.targetName}.`);
      return true;
    }
    if (completedTests.has(tool.key)) {
      showFeedback("Teste já registrado.");
      return true;
    }

    completedTests.add(tool.key);
    inventoryItems.push({ title: tool.name, result: tool.result });
    engine.closeInspection();
    showFeedback("Resultado salvo na mochila.");
    if (completedTests.size === tools.length) tutorialPhase = "complete";
    renderInventory();
    updateInterface();
    return true;
  }

  function renderInventory() {
    renderInventoryOverview();
    const slots = $("#inventorySlots");
    slots.replaceChildren();
    for (let index = 0; index < 4; index++) {
      const item = inventoryItems[index];
      const slot = document.createElement("div");
      slot.className = `inventory-slot${item ? " filled" : ""}`;
      const number = document.createElement("span");
      number.className = "inventory-slot-index";
      number.textContent = `SLOT 0${index + 1}`;
      const label = document.createElement("span");
      label.textContent = item ? item.title : "Vazio";
      const detail = document.createElement("span");
      detail.textContent = item ? item.result : "Sem registro";
      slot.append(number, label, detail);
      slots.append(slot);
    }
    $("#inventoryCount").textContent = inventoryItems.length
      ? `${inventoryItems.length}/4 resultados do treinamento guardados.`
      : "Quatro slots disponíveis para os resultados do treinamento.";
  }

  function renderInventoryOverview() {
    const cadetName = $("#hudCadetName").textContent.trim() || "Astronauta";
    $("#inventoryCadetName").textContent = cadetName;
    $("#inventoryLocation").textContent = $("#hudLocation").textContent.trim();
    $("#inventoryAstronaut").setAttribute("aria-label", `Astronauta de ${cadetName}`);

    document.querySelectorAll("#inventoryVitals .inventory-vital").forEach(inventoryVital => {
      const sourceLabel = inventoryVital.dataset.sourceLabel;
      const sourceVital = [...document.querySelectorAll(".hud-vitals .vital-item")].find(vital =>
        vital.querySelector(".vital-track")?.getAttribute("aria-label") === sourceLabel
      );
      const sourceMeter = sourceVital?.querySelector(".vital-track");
      const sourceValue = sourceMeter?.getAttribute("aria-valuenow");
      const value = Number(sourceValue);
      if (sourceValue === null || sourceValue === undefined || !Number.isFinite(value)) {
        console.error(`Valor de suporte vital indisponível: ${sourceLabel}.`);
        return;
      }

      const percent = Math.max(0, Math.min(100, value));
      const displayValue = Number.isInteger(percent) ? percent : percent.toFixed(1);
      inventoryVital.querySelector(".inventory-vital-value").textContent = `${displayValue}%`;
      const inventoryMeter = inventoryVital.querySelector(".inventory-vital-track");
      inventoryMeter.setAttribute("aria-valuenow", String(percent));
      inventoryVital.querySelector(".inventory-vital-fill").style.width = `${percent}%`;
    });
  }

  const inventoryHudObserver = new MutationObserver(renderInventoryOverview);
  inventoryHudObserver.observe($("#hudCadetName"), { childList: true, characterData: true, subtree: true });
  inventoryHudObserver.observe($("#hudLocation"), { childList: true, characterData: true, subtree: true });
  inventoryHudObserver.observe($(".hud-vitals"), {
    attributes: true, childList: true, characterData: true, subtree: true,
    attributeFilter: ["aria-valuenow", "style"]
  });

  function drawMinimap() {
    const ctx = miniMap.getContext("2d");
    const cellWidth = miniMap.width / map.width;
    const cellHeight = miniMap.height / map.height;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const type = map.grid[y][x];
        ctx.fillStyle = type === 1 ? "#87939d"
          : type === 0 ? "#0a1015"
          : config.colors.floors[map.floorMap[y][x] || 0];
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      }
    }
    map.props.forEach(prop => {
      const isObjective = tutorialPhase === "gravity"
        ? prop.type === "dish"
        : tutorialPhase === "tools" && tools.some(tool => !completedTests.has(tool.key) && tool.target === prop.type);
      ctx.fillStyle = isObjective ? "#ffb552" : "#b3c2c8";
      ctx.fillRect(prop.x * cellWidth + 2, prop.y * cellHeight + 2, Math.max(2, prop.w * cellWidth - 4), Math.max(2, prop.h * cellHeight - 4));
    });
    ctx.fillStyle = "#35e7f2";
    ctx.fillRect(engine.player.x * cellWidth - 3, engine.player.y * cellHeight - 3, 7, 7);
  }

  function setModalState() {
    engine.controls.movementEnabled = mapOverlay.hidden && inventoryOverlay.hidden && quickToolsPanel.hidden;
    engine.controls.keys.clear();
    updateInterface();
  }

  function toggleQuickTools() {
    const opening = quickToolsPanel.hidden;
    quickToolsPanel.hidden = !opening;
    if (opening) {
      mapOverlay.hidden = true;
      inventoryOverlay.hidden = true;
    }
    $("#researchAction").setAttribute("aria-expanded", String(opening));
    if (opening) $("#toolControls button")?.focus();
    else $("#researchAction").focus();
    setModalState();
  }

  function toggleMap() {
    const opening = mapOverlay.hidden;
    mapOverlay.hidden = !opening;
    inventoryOverlay.hidden = true;
    quickToolsPanel.hidden = true;
    $("#researchAction").setAttribute("aria-expanded", "false");
    if (opening) { drawMinimap(); $("#closeMap").focus(); }
    else canvas.focus();
    setModalState();
  }

  function toggleInventory() {
    const opening = inventoryOverlay.hidden;
    inventoryOverlay.hidden = !opening;
    mapOverlay.hidden = true;
    quickToolsPanel.hidden = true;
    $("#researchAction").setAttribute("aria-expanded", "false");
    if (opening) { renderInventory(); $("#closeInventory").focus(); }
    else canvas.focus();
    setModalState();
  }

  function handleEscape() {
    if (!mapOverlay.hidden) { mapOverlay.hidden = true; canvas.focus(); setModalState(); return true; }
    if (!inventoryOverlay.hidden) { inventoryOverlay.hidden = true; canvas.focus(); setModalState(); return true; }
    if (!quickToolsPanel.hidden) { quickToolsPanel.hidden = true; $("#researchAction").setAttribute("aria-expanded", "false"); $("#researchAction").focus(); setModalState(); return true; }
    engine.closeInspection();
    return true;
  }

  function startTutorial() {
    if (!suitWorn || !helmetWorn) return;
    tutorialPhase = "gravity";
    mainMenuOverlay.hidden = true;
    appShell.inert = false;
    introOverlay.hidden = true;
    engine.controls.enabled = true;
    engine.controls.movementEnabled = true;
    canvas.focus();
    updateInterface();
  }

  function resetTraining() {
    window.clearTimeout(feedbackTimer);
    tutorialFeedback.hidden = true;
    tutorialFeedback.textContent = "";
    tutorialPhase = "gravity";
    selectedTool = null;
    suitWorn = true;
    helmetWorn = true;
    completedTests.clear();
    inventoryItems.length = 0;
    cadetInput.value = cadetName;
    $("#wearSuit").disabled = true;
    $("#wearSuit").setAttribute("aria-pressed", "true");
    $("#wearSuit").querySelector(".suit-step-state").textContent = "CONCLUÍDO";
    $("#wearHelmet").disabled = true;
    $("#wearHelmet").setAttribute("aria-pressed", "true");
    $("#wearHelmet").querySelector(".suit-step-state").textContent = "CONCLUÍDO";
    $("#suitFeedback").textContent = "Equipamento pronto.";
    $("#confirmSuit").disabled = false;
    introOverlay.hidden = true;
    appShell.inert = false;
    mapOverlay.hidden = true;
    inventoryOverlay.hidden = true;
    engine.controls.enabled = true;
    engine.controls.movementEnabled = true;
    engine.controls.keys.clear();
    engine.reset();
    renderInventory();
    updateInterface();
    canvas.focus();
  }

  function showMenuPage(page) {
    mainMenuHome.hidden = page !== "home";
    document.querySelectorAll(".menu-subpage").forEach(section => {
      section.hidden = section.id !== `${page}Page`;
    });
    const focusTarget = page === "home"
      ? $("#playButton")
      : document.querySelector(`#${page}Page .menu-back`);
    focusTarget?.focus();
  }

  function selectAtmosphere(key) {
    engine.setAtmosphere(key);
    document.querySelectorAll("[data-atmosphere]").forEach(button => {
      button.classList.toggle("selected", button.dataset.atmosphere === key);
    });
  }

  function finishEquipmentAnimation() {
    if (equipmentAnimationOverlay.hidden) return;
    equipmentAnimationOverlay.hidden = true;
    equipmentAnimationFrame.src = "about:blank";
    if (activeEquipmentAnimation === "suit") {
      suitWorn = true;
      $("#wearSuit").setAttribute("aria-pressed", "true");
      $("#wearSuit").querySelector(".suit-step-state").textContent = "CONCLUÍDO";
      $("#wearHelmet").disabled = false;
      $("#suitFeedback").textContent = "Agora coloque o capacete.";
      $("#wearHelmet").focus();
    } else if (activeEquipmentAnimation === "helmet") {
      helmetWorn = true;
      $("#wearHelmet").setAttribute("aria-pressed", "true");
      $("#wearHelmet").querySelector(".suit-step-state").textContent = "CONCLUÍDO";
      $("#suitFeedback").textContent = "Equipamento pronto.";
      $("#confirmSuit").disabled = false;
      $("#confirmSuit").focus();
    }
    activeEquipmentAnimation = null;
  }

  function startEquipmentAnimation(equipment) {
    activeEquipmentAnimation = equipment;
    const isSuit = equipment === "suit";
    const button = isSuit ? $("#wearSuit") : $("#wearHelmet");
    button.disabled = true;
    button.querySelector(".suit-step-state").textContent = "EM ANDAMENTO";
    $("#suitFeedback").textContent = isSuit ? "Vestindo o traje..." : "Colocando o capacete...";
    equipmentAnimationOverlay.hidden = false;
    equipmentAnimationFrame.src = isSuit
      ? "/assets/Animations/astronauta_traje_espacial_8bit.html?embed=1"
      : "/assets/Animations/Capacete%20%E2%80%93%20POV%208-bit.html?embed=1";
    $("#skipEquipmentAnimation").focus();
  }

  Object.entries(config.atmosphere.presets).forEach(([key, preset]) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "mood-button"; button.dataset.mood = key; button.textContent = preset.label;
    button.addEventListener("click", () => selectAtmosphere(key));
    $("#moodControls").append(button);
  });
  document.querySelectorAll("[data-atmosphere]").forEach(button => {
    button.addEventListener("click", () => selectAtmosphere(button.dataset.atmosphere));
  });
  selectAtmosphere(config.atmosphere.default);

  map.destinations.forEach(destination => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "room-button"; button.textContent = destination.name;
    button.addEventListener("click", () => engine.goToRoom(destination.name));
    $("#roomControls").append(button);
  });

  renderToolControls();
  renderInventory();
  Object.entries(config.assets.animations).forEach(([name, animation]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-button animation-button";
    button.dataset.animation = name;
    button.textContent = name;
    button.title = `${animation.frames} quadros`;
    button.addEventListener("click", () => {
      animationFeedback.textContent = `Reproduzindo ${name} (${animation.frames} quadros).`;
      engine.player.playAnimation(name, {
        loop: false,
        onComplete: () => { animationFeedback.textContent = "Idle e corrida acompanham o movimento no mapa."; }
      });
      updateInterface();
    });
    $("#animationControls").append(button);
  });

  $("#welcomeForm").addEventListener("submit", event => {
    event.preventDefault();
    cadetName = cadetInput.value.trim();
    if (!cadetName) {
      cadetInput.setCustomValidity("Informe o nome do cadete.");
      cadetInput.reportValidity();
      return;
    }
    if (!suitWorn || !helmetWorn) {
      $("#suitFeedback").textContent = "Conclua traje e capacete.";
      return;
    }
    cadetInput.setCustomValidity("");
    try {
      window.localStorage.setItem(profileStorageKey, JSON.stringify({ name: cadetName, character }));
    } catch (error) {
      console.error("Não foi possível salvar o perfil do cadete:", error);
      $("#suitFeedback").textContent = "Não foi possível salvar o perfil neste navegador.";
      return;
    }
    startTutorial();
  });
  cadetInput.addEventListener("input", () => {
    cadetInput.setCustomValidity("");
  });
  $("#wearSuit").addEventListener("click", () => {
    if (!suitWorn) startEquipmentAnimation("suit");
  });
  $("#wearHelmet").addEventListener("click", () => {
    if (!suitWorn) return;
    startEquipmentAnimation("helmet");
  });
  $("#skipEquipmentAnimation").addEventListener("click", finishEquipmentAnimation);
  window.addEventListener("message", event => {
    if (event.source !== equipmentAnimationFrame.contentWindow || event.origin !== window.location.origin) return;
    if (event.data === `${activeEquipmentAnimation}-animation-complete`) finishEquipmentAnimation();
  });
  document.addEventListener("keydown", event => {
    if (!equipmentAnimationOverlay.hidden && event.key === "Escape") {
      event.preventDefault();
      finishEquipmentAnimation();
    }
  });
  $("#researchAction").addEventListener("click", toggleQuickTools);
  $("#closeQuickTools").addEventListener("click", () => {
    quickToolsPanel.hidden = true;
    $("#researchAction").setAttribute("aria-expanded", "false");
    $("#researchAction").focus();
    setModalState();
  });
  $("#mapAction").addEventListener("click", toggleMap);
  $("#inventoryAction").addEventListener("click", toggleInventory);
  $("#playButton").addEventListener("click", () => {
    if (savedProfile) {
      startTutorial();
      return;
    }
    mainMenuOverlay.hidden = true;
    introOverlay.hidden = false;
    cadetInput.focus();
  });
  $("#backToMenu").addEventListener("click", () => {
    introOverlay.hidden = true;
    mainMenuOverlay.hidden = false;
    showMenuPage("home");
  });
  $("#settingsButton").addEventListener("click", () => showMenuPage("settings"));
  $("#infoButton").addEventListener("click", () => showMenuPage("info"));
  $("#creditsButton").addEventListener("click", () => showMenuPage("credits"));
  document.querySelectorAll("[data-menu-home]").forEach(button => {
    button.addEventListener("click", () => showMenuPage("home"));
  });
  $("#settingsFullscreenButton").addEventListener("click", () => toggleFullscreen());
  document.addEventListener("keydown", event => {
    if (mainMenuOverlay.hidden || event.key !== "Escape") return;
    const activePage = document.querySelector(".menu-subpage:not([hidden])");
    if (activePage) {
      event.preventDefault();
      showMenuPage("home");
    }
  });
  $("#pauseButton").addEventListener("click", () => engine.setPaused());
  $("#resetButton").addEventListener("click", resetTraining);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else throw new Error("Fullscreen API não disponível.");
    } catch (error) {
      console.error("Não foi possível alternar para tela cheia:", error);
      showFeedback("Tela cheia indisponível.");
    }
  }
  fullscreenButton.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => {
    const isFullscreen = Boolean(document.fullscreenElement);
    fullscreenButton.setAttribute("aria-label", isFullscreen ? "Sair da tela cheia" : "Tela cheia");
    fullscreenButton.title = isFullscreen ? "Sair da tela cheia" : "Tela cheia";
  });
  $("#closeInspect").addEventListener("click", () => engine.closeInspection());
  $("#closeMap").addEventListener("click", toggleMap);
  $("#closeInventory").addEventListener("click", toggleInventory);

  canvas.addEventListener("click", event => {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
    const renderedWidth = canvas.width * scale;
    const renderedHeight = canvas.height * scale;
    const offsetX = (rect.width - renderedWidth) / 2;
    const offsetY = (rect.height - renderedHeight) / 2;
    const x = (event.clientX - rect.left - offsetX) / renderedWidth * canvas.width + engine.renderer.cam.x;
    const y = (event.clientY - rect.top - offsetY) / renderedHeight * canvas.height + engine.renderer.cam.y;
    if (x < engine.renderer.cam.x || x > engine.renderer.cam.x + canvas.width ||
        y < engine.renderer.cam.y || y > engine.renderer.cam.y + canvas.height) return;
    engine.inspectObjectAt(x / config.grid.tileSize, y / config.grid.tileSize);
  });

  $("#assetInput").addEventListener("change", event => {
    const files = [...event.target.files];
    let loaded = 0;
    files.forEach(file => {
      const name = file.name.replace(/\.png$/i, "").toLowerCase();
      const image = new Image();
      image.onload = () => {
        engine.loadAsset(name, image);
        loaded += 1;
        $("#assetFeedback").textContent = `${loaded} imagem(ns) carregada(s).`;
      };
      image.onerror = () => { $("#assetFeedback").textContent = `Não foi possível carregar ${file.name}.`; };
      image.src = URL.createObjectURL(file);
    });
    if (!files.length) $("#assetFeedback").textContent = "Nenhum pacote carregado.";
  });

  // API pública: window.opportunityMap.setAtmosphere("emergency"), por exemplo.
  window.opportunityMap = {
    engine,
    setAtmosphere: name => engine.setAtmosphere(name),
    goToRoom: name => engine.goToRoom(name),
    pause: () => engine.setPaused(true),
    resume: () => engine.setPaused(false),
    reset: resetTraining,
    selectTool,
    toggleMap,
    toggleInventory,
    getTrainingState: () => ({
      phase: tutorialPhase, cadetName, character, selectedTool, completedTools: [...completedTests], inventory: [...inventoryItems]
    }),
    inspect: name => {
      const prop = map.props.find(item => item.name.toLowerCase() === name.toLowerCase());
      if (prop) { engine.inspectedObject = prop; showInspection(prop); }
      else console.warn(`Objeto não encontrado: ${name}`);
    },
    addProp: prop => {
      if (!prop || !prop.type || !Number.isFinite(prop.x) || !Number.isFinite(prop.y)) throw new Error("Informe ao menos type, x e y para adicionar um objeto.");
      map.props.push({ w: 1, h: 1, solid: true, name: "Novo objeto", description: "Sem descrição.", ...prop });
      map.props.sort((a, b) => a.y + a.h - (b.y + b.h));
    },
    loadAsset: (name, imageUrl) => {
      const image = new Image();
      image.onload = () => engine.loadAsset(name, image);
      image.src = imageUrl;
    }
  };
  window.labTraining = Object.assign({}, window.opportunityMap, {
    character: engine.player,
    playAnimation: (name, options) => engine.player.playAnimation(name, options),
    setPosition: (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError("A posição deve conter coordenadas numéricas.");
      if (engine.collides(x, y)) throw new Error("A posição escolhida está bloqueada no mapa.");
      engine.player.x = x;
      engine.player.y = y;
    },
    setMoveSpeed: speed => {
      if (!Number.isFinite(speed) || speed <= 0) throw new RangeError("A velocidade deve ser um número positivo.");
      config.player.speed = speed;
    }
  });

  cadetInput.value = cadetName;
  $("#menuCharacter").textContent = character === defaultCharacter ? "Astronauta" : character;
  updateInterface();
  showMenuPage("home");
  engine.start().then(() => {
    $("#stageStatus").innerHTML = "SISTEMA ONLINE <span></span>";
    console.info("Opportunity Lab Engine pronta. APIs disponíveis em window.labTraining e window.opportunityMap.");
  }).catch(error => {
    $("#stageStatus").textContent = "ERRO AO CARREGAR ASSETS";
    console.error("Falha ao iniciar a engine Opportunity Lab:", error);
  });
})();
