/* Inicialização da interface. A engine também pode ser controlada pelo console. */
(() => {
  const t = window.GameI18n.t;
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
  const introOverlay = $("#introOverlay");
  const equipmentAnimationOverlay = $("#equipmentAnimationOverlay");
  const equipmentAnimationFrame = $("#equipmentAnimationFrame");
  const launchRoomOverlay = $("#launchRoomOverlay");
  const launchRoomFrame = $("#launchRoomFrame");
  const mapOverlay = $("#mapOverlay");
  const inventoryOverlay = $("#inventoryOverlay");
  const quickToolsPanel = $("#quickToolsPanel");
  const miniMap = $("#miniMap");
  const hudMiniMap = $("#hudMiniMap");
  const tutorialObjective = $("#tutorialObjective");
  const skipTutorialButton = $("#skipTutorial");
  const tutorialFeedback = $("#tutorialFeedback");
  const cadetInput = $("#cadetName");
  const appShell = $("#appShell");
  const fullscreenButton = $("#fullscreenButton");
  const cameraOverlay = $("#cameraOverlay");
  let cameraView = null;
  let cameraOpening = 0;

  const tools = [
    { key: 1, name: "Câmera científica", icon: "camera", detail: "Fotografa terrenos e materiais", target: "telescope", targetName: "Pancam", result: "Imagem panorâmica registrada na mochila." },
    { key: 2, name: "Microscópio portátil", icon: "microscope", detail: "Analisa amostras de perto", target: "micro", targetName: "Microscopic Imager", result: "Análise microscópica da amostra registrada." },
    { key: 3, name: "Sensor de temperatura", icon: "temperature", detail: "Mede a temperatura de sólidos", target: "spec", targetName: "amostra no espectrômetro", result: "Leitura registrada: superfície sólida a -21,6 °C." },
    { key: 4, name: "Furadeira de amostras", icon: "drill", detail: "Extrai material do solo", target: "bench", targetName: "bancada de amostras", result: "Amostra de rególito extraída e guardada." }
  ];
  const gamepadTutorialSteps = {
    movement: ["Use o analógico esquerdo para caminhar. Percorra 4 metros de treino para calibrar o traje.", [{ symbol: "L", label: "Analógico esquerdo" }]],
    gravity: ["Siga a trilha até a antena. Aproxime-se do contorno âmbar e clique com o botão esquerdo para ativar a simulação.", [{ symbol: "MOUSE_LEFT", label: "Botão esquerdo do mouse" }]],
    gravityWalk: ["Simulação de baixa gravidade ativada. Caminhe por 6 metros de treino usando o analógico esquerdo.", [{ symbol: "L", label: "Analógico esquerdo" }]],
    map: ["Pressione Quadrado para abrir o mapa, confira o objetivo e pressione Quadrado novamente para continuar.", [{ symbol: "□", label: "Botão Quadrado" }]],
    lab: ["Use o analógico esquerdo para caminhar até o laboratório de treinamento. M mostra o percurso completo.", [{ symbol: "L", label: "Analógico esquerdo" }]],
    camera: ["Use R1 para abrir os slots, navegue até Câmera com o analógico esquerdo e confirme com Quadrado. Na visão 3D, clique em Fotografar.", [{ symbol: "R1", label: "Botão R1" }, { symbol: "L", label: "Analógico esquerdo" }, { symbol: "□", label: "Botão Quadrado" }, { symbol: "MOUSE_LEFT", label: "Botão esquerdo do mouse" }]],
    microscope: ["Aproxime-se da amostra. Use R1 para abrir os slots, selecione o microscópio com o analógico esquerdo e confirme com Quadrado. Clique com o botão esquerdo para analisar.", [{ symbol: "R1", label: "Botão R1" }, { symbol: "L", label: "Analógico esquerdo" }, { symbol: "□", label: "Botão Quadrado" }, { symbol: "MOUSE_LEFT", label: "Botão esquerdo do mouse" }]],
    temperature: ["Aproxime-se da rocha. Use R1 para abrir os slots, selecione o sensor com o analógico esquerdo e confirme com Quadrado. Clique com o botão esquerdo para registrar a leitura.", [{ symbol: "R1", label: "Botão R1" }, { symbol: "L", label: "Analógico esquerdo" }, { symbol: "□", label: "Botão Quadrado" }, { symbol: "MOUSE_LEFT", label: "Botão esquerdo do mouse" }]],
    drill: ["Aproxime-se da estação de solo. Use R1 para abrir os slots, selecione a furadeira com o analógico esquerdo e confirme com Quadrado. Clique com o botão esquerdo para extrair uma amostra.", [{ symbol: "R1", label: "Botão R1" }, { symbol: "L", label: "Analógico esquerdo" }, { symbol: "□", label: "Botão Quadrado" }, { symbol: "MOUSE_LEFT", label: "Botão esquerdo do mouse" }]],
    inventory: ["Pressione Quadrado para abrir a mochila, confira os resultados e pressione Quadrado novamente para continuar.", [{ symbol: "□", label: "Botão Quadrado" }]],
    communication: ["Siga a trilha até a antena. Pressione X para enviar os quatro registros à Terra.", [{ symbol: "×", label: "Botão X (Cross)" }]],
    ship: ["Use o analógico esquerdo para seguir a trilha e entrar na sala de lançamento.", [{ symbol: "L", label: "Analógico esquerdo" }]]
  };
  const tutorial = new LabTutorial();
  const tutorialCoach = $("#tutorialCoach");
  let announcedPhase = null;
  let lastObjectivePhase = null;
  let lastObjectiveInputMode = null;
  let gamepadToolIndex = 0;
  let cadetName = savedProfile?.name || "";
  let character = savedProfile?.character || defaultCharacter;
  let selectedTool = null;
  let suitWorn = false;
  let helmetWorn = false;
  let activeEquipmentAnimation = null;
  const completedTests = tutorial.completedTools;
  const inventoryItems = [];
  let feedbackTimer = 0;
  function inlineAssistant(host, id, announce = true) {
    const assistant = window.NovaAssistant.create({ compact: true, translate: t, announce });
    if (id) assistant.text.id = id;
    $(host).append(assistant.element);
    return assistant;
  }
  const coachAssistant = inlineAssistant('#coachSpeech', 'coachDescription', false);
  const objectiveAssistant = inlineAssistant('#objectiveSpeech');
  const suitAssistant = inlineAssistant('#suitSpeech', 'suitFeedback');
  const cameraAssistant = inlineAssistant('#cameraSpeech', 'cameraMessage');
  $('#cameraSpeech').className = 'nova-camera';
  const feedbackAssistant = window.NovaAssistant.create({ floating: true, compact: true, dismissible: true, translate: t, onDismiss: () => canvas.focus(), onInteract: () => canvas.focus() });
  tutorialFeedback.parentElement.append(feedbackAssistant.element);
  tutorialFeedback.setAttribute('aria-live', 'off');
  let suitMessage = '';
  function setSuitFeedback(message) { suitMessage = message; suitAssistant.say(t(message)); }
  function setCameraMessage(message) { cameraAssistant.say(t(message), { mood: window.NovaAssistant.moodFor(message) === 'warning' ? 'warning' : 'science' }); }

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
  engine.onInputModeChange = () => {
    if (!tutorialCoach.hidden) showTutorialCoach();
    else updateInterface();
  };
  engine.onGamepadInteract = () => {
    if (!tutorialCoach.hidden) { closeTutorialCoach(); return; }
    if (!cameraOverlay.hidden) return;
    if (!launchRoomOverlay.hidden) {
      launchRoomFrame.contentDocument?.querySelector("#launch")?.click();
      return;
    }
    if (!introOverlay.hidden || !quickToolsPanel.hidden || !mapOverlay.hidden || !inventoryOverlay.hidden) return;
    if (tutorial.phase === "communication" && !engine.paused && $("#lifePanel").hidden) engine.interact("gamepad");
  };
  engine.onToolPanelToggle = () => {
    gamepadToolIndex = selectedTool ? selectedTool - 1 : 0;
    toggleQuickTools();
    if (!quickToolsPanel.hidden) highlightGamepadTool(gamepadToolIndex);
  };
  engine.onToolNavigate = direction => {
    if (quickToolsPanel.hidden) return;
    gamepadToolIndex = (gamepadToolIndex + direction + tools.length) % tools.length;
    highlightGamepadTool(gamepadToolIndex);
  };
  engine.onToolConfirm = () => {
    if (!quickToolsPanel.hidden) { selectTool(gamepadToolIndex + 1); return; }
    if (!mapOverlay.hidden) { toggleMap(); return; }
    if (!inventoryOverlay.hidden) { toggleInventory(); return; }
    if (tutorial.phase === "map") toggleMap();
    else if (tutorial.phase === "inventory") toggleInventory();
  };
  engine.renderer.tutorial = tutorial;
  engine.renderer.engine = engine;
  const findNearbyObject = engine.findNearbyObject.bind(engine);
  engine.findNearbyObject = () => {
    const target = map.props.find(prop => prop.trainingId === tutorial.targetId);
    if (target) {
      const dx = Math.max(target.x - engine.player.x, 0, engine.player.x - target.x - target.w);
      const dy = Math.max(target.y - engine.player.y, 0, engine.player.y - target.y - target.h);
      if (Math.hypot(dx, dy) < config.interaction.distance) return target;
    }
    return findNearbyObject();
  };
  let normalSpeed = config.player.speed;
  const updateEngine = engine.update.bind(engine);
  engine.update = delta => {
    const { x, y } = engine.player;
    updateEngine(delta);
    if (engine.controls.enabled && engine.controls.movementEnabled && tutorialCoach.hidden) {
      tutorial.move(Math.hypot(engine.player.x - x, engine.player.y - y), engine.getRoomName());
      const room = map.launchRoom;
      if ((tutorial.phase === "ship" || tutorial.phase === "skipped") && engine.player.x >= room.x && engine.player.x < room.x + room.w && engine.player.y >= room.y && engine.player.y < room.y + room.h) {
        if (tutorial.phase === "ship") tutorial.interact("ship");
        openLaunchRoom();
      }
      updateInterface();
    }
  };

  function prepareEquipment() {
    suitWorn = false;
    helmetWorn = false;
    appShell.inert = true;
    introOverlay.hidden = false;
    mapOverlay.hidden = true;
    inventoryOverlay.hidden = true;
    quickToolsPanel.hidden = true;
    engine.controls.enabled = false;
    engine.controls.movementEnabled = false;
    $("#welcomeTitle").textContent = t("Preparação do treinamento");
    $("#confirmSuit .prep-action-label").textContent = t("Iniciar treinamento");
    for (const id of ["wearSuit", "wearHelmet"]) {
      const button = $(`#${id}`);
      button.disabled = id === "wearHelmet";
      button.setAttribute("aria-pressed", "false");
      button.querySelector(".suit-step-state").textContent = t("PENDENTE");
    }
    $("#confirmSuit").disabled = true;
    setSuitFeedback("Primeiro vista o traje e as botas. Depois coloque o capacete.");
    cadetInput.value = cadetName;
    (cadetName ? $("#wearSuit") : cadetInput).focus();
  }

  function showTutorialCoach() {
    const step = getTutorialStep();
    if (!step || tutorial.phase === "launch") return;
    $("#coachStep").textContent = t(step.label);
    $("#coachTitle").textContent = t(step.title);
    coachAssistant.say(t(step.description), { key: tutorial.phase, mood: tutorial.phase === 'complete' ? 'success' : ['camera', 'microscope', 'temperature', 'drill'].includes(tutorial.phase) ? 'science' : 'guide' });
    feedbackAssistant.hide();
    renderTutorialShortcut($("#coachKey"), step);
    $("#continueTutorial").textContent = t(tutorial.phase === "complete" ? "Explorar a instalação" : "Entendido, vamos lá");
    $("#tutorialMenuLink").hidden = tutorial.phase !== "complete";
    tutorialCoach.hidden = false;
    appShell.inert = true;
    // Bloqueia também os atalhos da engine enquanto o briefing está aberto.
    engine.controls.enabled = false;
    engine.controls.movementEnabled = false;
    engine.controls.keys.clear();
    $("#continueTutorial").focus();
  }

  function closeTutorialCoach() {
    tutorialCoach.hidden = true;
    coachAssistant.hide();
    appShell.inert = false;
    engine.controls.enabled = true;
    setModalState();
    canvas.focus();
  }

  function skipTutorial() {
    if (!tutorial.skip()) return;
    document.querySelectorAll(".tutorial-highlight").forEach(element => element.classList.remove("tutorial-highlight"));
    lastObjectivePhase = null;
    lastObjectiveInputMode = null;
    closeTutorialCoach();
  }

  function getTutorialStep() {
    const step = tutorial.step;
    if (!step || engine.controls.inputMode !== "gamepad") return step;
    const controllerStep = gamepadTutorialSteps[tutorial.phase];
    return controllerStep ? { ...step, description: controllerStep[0], gamepadControls: controllerStep[1] } : step;
  }

  function renderTutorialShortcut(element, step) {
    if (engine.controls.inputMode !== "gamepad" || !step.gamepadControls) {
      element.textContent = t(step.key);
      element.removeAttribute("aria-label");
      element.classList.remove("gamepad-shortcut");
      return;
    }
    element.replaceChildren();
    element.classList.add("gamepad-shortcut");
    for (const control of step.gamepadControls) {
      const icon = document.createElement("span");
      icon.className = "gamepad-shortcut-icon";
      if (control.symbol === "MOUSE_LEFT") icon.classList.add("gamepad-mouse-icon");
      else icon.textContent = control.symbol;
      icon.setAttribute("aria-label", t(control.label));
      icon.title = t(control.label);
      element.append(icon);
    }
    element.setAttribute("aria-label", step.gamepadControls.map(control => t(control.label)).join(" · "));
  }

  function updateInterface(state = engine.getState()) {
    drawMinimap(hudMiniMap);
    $("#telemetryRoom").textContent = t(state.room);
    $("#telemetryMood").textContent = t(state.mood);
    $("#telemetryPosition").textContent = state.position;
    $("#telemetryTarget").textContent = t(state.target);
    $("#telemetryAnimation").textContent = state.animation;
    $("#telemetryCadet").textContent = cadetName || t("Astronauta");
    $("#hudCadetName").textContent = cadetName || t("Astronauta");
    $("#hudLocation").textContent = t(state.room);
    $("#pausedOverlay").hidden = !state.paused;
    const pauseButton = $("#pauseButton");
    pauseButton.textContent = state.paused ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-label", t(state.paused ? "Continuar" : "Pausar"));
    pauseButton.title = t(state.paused ? "Continuar" : "Pausar");

    const objective = getTutorialStep();
    tutorialObjective.hidden = !objective;
    skipTutorialButton.hidden = !objective || tutorial.phase === "complete" || tutorial.phase === "skipped";
    if (objective) {
      if (lastObjectivePhase !== tutorial.phase || lastObjectiveInputMode !== engine.controls.inputMode) {
        document.querySelectorAll(".tutorial-highlight").forEach(element => element.classList.remove("tutorial-highlight"));
        const highlight = tutorial.phase === "map" ? $("#mapAction") : tutorial.phase === "inventory" ? $("#inventoryAction") : ["camera", "microscope", "temperature", "drill"].includes(tutorial.phase) ? $("#researchAction") : null;
        highlight?.classList.add("tutorial-highlight");
        $("#tutorialTitle").textContent = t(objective.title);
        $("#tutorialDescription").textContent = t(objective.description);
        objectiveAssistant.say(t(objective.title), { key: tutorial.phase, mood: tutorial.phase === 'complete' ? 'success' : 'guide' });
        $("#tutorialStepLabel").textContent = t(objective.label);
        renderTutorialShortcut($("#tutorialKey"), objective);
        lastObjectivePhase = tutorial.phase;
        lastObjectiveInputMode = engine.controls.inputMode;
      }
      const walking = ["movement", "gravityWalk"].includes(tutorial.phase);
      $("#tutorialProgress").hidden = !walking;
      if (walking) $("#tutorialProgress").value = Math.min(100, tutorial.distance / (tutorial.phase === "movement" ? 4 : 6) * 100);
      const { target, route } = engine.renderer.getGuideRoute();
      $("#tutorialDistance").textContent = target ? t("{target} · {distance} m de percurso", { target: t(target.name), distance: Math.max(0, route.length - 1) }) : walking ? `${tutorial.distance.toFixed(1)} / ${tutorial.phase === "movement" ? 4 : 6} m` : "";
      $("#mapObjective").textContent = target ? t("Objetivo: {target}", { target: t(target.name) }) : t(objective.title);
    }
    config.player.speed = tutorial.phase === "gravityWalk" ? normalSpeed * .7 : normalSpeed;
    if (tutorial.phase !== announcedPhase) {
      announcedPhase = tutorial.phase;
      showTutorialCoach();
    }

    const nearbyObjective = tutorial.targetId && engine.nearObject?.trainingId === tutorial.targetId;
    interactionHint.hidden = !nearbyObjective || Boolean(engine.inspectedObject) || !mapOverlay.hidden || !inventoryOverlay.hidden;
    if (!interactionHint.hidden) {
      if (tutorial.phase === "gravity") {
        interactionHint.textContent = t("CLIQUE ESQUERDO · CALIBRAR");
      } else if (tutorial.phase === "ship") {
        interactionHint.textContent = t("ATRAVESSE A PORTA · SALA DE LANÇAMENTO");
      } else if (["camera", "microscope", "temperature", "drill"].includes(tutorial.phase) && selectedTool) {
        interactionHint.textContent = t("CLIQUE ESQUERDO · USAR FERRAMENTA");
      } else {
        interactionHint.textContent = t("SELECIONE {key}", { key: t(tutorial.step.key) });
      }
    }

    document.querySelectorAll(".mood-button").forEach(button => button.classList.toggle("active", button.dataset.mood === state.atmosphere));
    document.querySelectorAll(".animation-button").forEach(button => button.classList.toggle("active", button.dataset.animation === state.animation));
    document.querySelectorAll(".tool-button").forEach(button => {
      const key = Number(button.dataset.tool);
      button.classList.toggle("active", selectedTool === key);
      button.setAttribute("aria-pressed", String(selectedTool === key));
      const progress = button.querySelector(".tool-progress");
      progress.textContent = completedTests.has(key) ? "OK" : selectedTool === key ? t("ATIVA") : "";
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
      researchActionName.textContent = t(activeTool.name);
      researchActionShortcut.hidden = true;
      researchAction.title = t("{tool} · clicar para trocar", { tool: t(activeTool.name) });
      researchAction.setAttribute("aria-label", t("{tool}. Abrir ferramentas científicas", { tool: t(activeTool.name) }));
    } else {
      researchActionIcon.src = "/assets/visuals/hud_assets/svg/acao_3_pesquisa.svg";
      researchActionName.textContent = t("PESQUISA");
      researchActionShortcut.hidden = false;
      researchAction.title = t("Abrir ferramentas científicas");
      researchAction.setAttribute("aria-label", t("Pesquisa científica (1–4)"));
    }

  }

  function showInspection(prop) {
    inspectCard.hidden = !prop;
    if (!prop) return;
    $("#inspectTitle").textContent = t(prop.name);
    $("#inspectDescription").textContent = t(prop.description);
    if (["camera", "microscope", "temperature", "drill"].includes(tutorial.phase) && !selectedTool) {
      showFeedback("Escolha uma ferramenta · 1–4");
    }
  }

  function showFeedback(message, values = {}) {
    window.clearTimeout(feedbackTimer);
    tutorialFeedback.textContent = t(message, values);
    tutorialFeedback.hidden = true;
    if (!tutorialCoach.hidden) return;
    feedbackAssistant.say(t(message, values));
    feedbackTimer = window.setTimeout(() => { feedbackAssistant.hide(); }, 7000);
  }

  function renderToolControls() {
    const container = $("#toolControls");
    container.replaceChildren();
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
      name.textContent = t(tool.name);
      const progress = document.createElement("span");
      progress.className = "tool-progress";
      button.append(icon, name, key, progress);
      button.title = t(tool.detail);
      button.addEventListener("click", () => selectTool(tool.key));
      container.append(button);
    });
  }

  function highlightGamepadTool(index) {
    const buttons = [...document.querySelectorAll("#toolControls .tool-button")];
    buttons.forEach((button, buttonIndex) => button.classList.toggle("gamepad-highlight", buttonIndex === index));
    buttons[index]?.scrollIntoView?.({ block: "nearest" });
  }

  function selectTool(key) {
    if (!tools.some(tool => tool.key === key) || !introOverlay.hidden || !tutorialCoach.hidden || !mapOverlay.hidden || !inventoryOverlay.hidden) return;
    selectedTool = key;
    quickToolsPanel.hidden = true;
    $("#researchAction").setAttribute("aria-expanded", "false");
    engine.closeInspection();
    showFeedback("{tool} ativa", { tool: t(tools[key - 1].name) });
    setModalState();
    if (key === 1) openCamera();
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

  function handleInteraction(prop, photo = null, source = "keyboard") {
    if (engine.paused || !$("#lifePanel").hidden || !introOverlay.hidden || !mapOverlay.hidden || !inventoryOverlay.hidden || !quickToolsPanel.hidden || !tutorialCoach.hidden || !launchRoomOverlay.hidden || (!cameraOverlay.hidden && !photo)) return true;
    if (!photo && source !== "mouse" && tutorial.phase !== "communication") return true;
    const phase = tutorial.phase;
    const toolPhases = ["camera", "microscope", "temperature", "drill"];
    if (selectedTool === 1 && !photo && phase !== "communication") { openCamera(); return true; }
    if (phase === "ship" && prop.trainingId === "ship") {
      showFeedback("Atravesse a porta para entrar na sala de lançamento.");
      return true;
    }
    if (phase === "complete") return false;
    if (phase === "skipped") {
      const tool = tools.find(item => item.key === selectedTool);
      if (!tool || prop.type !== tool.target) return false;
      completedTests.add(selectedTool);
    } else if (!tutorial.interact(prop.trainingId, selectedTool)) {
      showFeedback(tutorial.targetId === prop.trainingId
        ? t("Selecione a ferramenta indicada: {key}.", { key: t(tutorial.step.key) })
        : "Siga o objetivo destacado para concluir esta etapa.");
      return true;
    }
    window.GamePreferences.playEffect(phase === "gravity" ? 740 : 880, .12);
    if (phase === "communication") showFeedback("Relatório enviado. Briefing MER-B recebido. Siga para o lançamento.");
    if (completedTests.has(selectedTool) && (toolPhases.includes(phase) || phase === "skipped")) {
      const tool = tools[selectedTool - 1];
      inventoryItems.push({ title: tool.name, result: tool.result, photo });
      showFeedback(tool.result);
      selectedTool = null;
      renderInventory();
    }
    engine.closeInspection();
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
      label.textContent = item ? t(item.title) : t("Vazio");
      const detail = document.createElement("span");
      detail.textContent = item ? t(item.result) : t("Sem registro");
      slot.append(number, label, detail);
      if (item?.photo) {
        const image = document.createElement("img");
        image.className = "inventory-photo";
        image.src = item.photo;
        image.alt = t("Fotografia do terreno simulado registrada com a câmera científica");
        slot.append(image);
      }
      slots.append(slot);
    }
    $("#inventoryCount").textContent = inventoryItems.length
      ? t("{count}/4 resultados do treinamento guardados.", { count: inventoryItems.length })
      : t("Quatro slots disponíveis para os resultados do treinamento.");
  }

  function renderInventoryOverview() {
    const cadetName = $("#hudCadetName").textContent.trim() || t("Astronauta");
    $("#inventoryCadetName").textContent = cadetName;
    $("#inventoryLocation").textContent = $("#hudLocation").textContent.trim();
    $("#inventoryAstronaut").setAttribute("aria-label", t("Astronauta de {name}", { name: cadetName }));

    document.querySelectorAll("#inventoryVitals .inventory-vital").forEach(inventoryVital => {
      const sourceLabel = inventoryVital.dataset.sourceLabel;
      const sourceVital = [...document.querySelectorAll(".hud-vitals .vital-item")].find(vital =>
        (vital.querySelector(".vital-track")?.getAttribute("data-i18n-aria-label") || vital.querySelector(".vital-track")?.getAttribute("aria-label")) === sourceLabel
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

  function drawMinimap(targetCanvas = miniMap) {
    const ctx = targetCanvas.getContext("2d");
    const cellWidth = targetCanvas.width / map.width;
    const cellHeight = targetCanvas.height / map.height;
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
      const isObjective = prop.trainingId && prop.trainingId === tutorial.targetId;
      ctx.fillStyle = isObjective ? "#ffb552" : "#b3c2c8";
      ctx.fillRect(prop.x * cellWidth + 2, prop.y * cellHeight + 2, Math.max(2, prop.w * cellWidth - 4), Math.max(2, prop.h * cellHeight - 4));
    });
    const { target, route } = engine.renderer.getGuideRoute();
    if (route.length > 1) {
      ctx.strokeStyle = "#ff4040"; ctx.lineWidth = 2; ctx.beginPath();
      route.forEach((point, index) => ctx[index ? "lineTo" : "moveTo"](point.x * cellWidth, point.y * cellHeight));
      ctx.stroke();
    }
    if (target) {
      ctx.strokeStyle = "#ffdc8a"; ctx.lineWidth = 2;
      ctx.strokeRect(target.x * cellWidth - 3, target.y * cellHeight - 3, target.w * cellWidth + 6, target.h * cellHeight + 6);
    }
    ctx.fillStyle = "#35e7f2";
    ctx.fillRect(engine.player.x * cellWidth - 3, engine.player.y * cellHeight - 3, 7, 7);
  }

  function setModalState() {
    engine.controls.movementEnabled = cameraOverlay.hidden && mapOverlay.hidden && inventoryOverlay.hidden && quickToolsPanel.hidden && tutorialCoach.hidden && introOverlay.hidden && launchRoomOverlay.hidden;
    engine.controls.keys.clear();
    updateInterface();
  }

  function toggleQuickTools() {
    if (!introOverlay.hidden || !tutorialCoach.hidden || !cameraOverlay.hidden || !launchRoomOverlay.hidden) return;
    const opening = quickToolsPanel.hidden;
    quickToolsPanel.hidden = !opening;
    if (opening) {
      mapOverlay.hidden = true;
      inventoryOverlay.hidden = true;
      gamepadToolIndex = selectedTool ? selectedTool - 1 : 0;
      highlightGamepadTool(gamepadToolIndex);
    }
    $("#researchAction").setAttribute("aria-expanded", String(opening));
    if (opening) $("#toolControls button")?.focus();
    else $("#researchAction").focus();
    setModalState();
  }

  function toggleMap() {
    if (!introOverlay.hidden || !tutorialCoach.hidden) return;
    const opening = mapOverlay.hidden;
    mapOverlay.hidden = !opening;
    inventoryOverlay.hidden = true;
    quickToolsPanel.hidden = true;
    $("#researchAction").setAttribute("aria-expanded", "false");
    if (opening) { drawMinimap(); $("#closeMap").focus(); }
    else canvas.focus();
    tutorial.map(opening);
    setModalState();
  }

  function toggleInventory() {
    if (!introOverlay.hidden || !tutorialCoach.hidden) return;
    const opening = inventoryOverlay.hidden;
    inventoryOverlay.hidden = !opening;
    mapOverlay.hidden = true;
    quickToolsPanel.hidden = true;
    $("#researchAction").setAttribute("aria-expanded", "false");
    if (opening) { renderInventory(); $("#closeInventory").focus(); }
    else canvas.focus();
    tutorial.inventory(opening);
    setModalState();
  }

  function handleEscape() {
    if (!cameraOverlay.hidden) { closeCamera(); return true; }
    if (!launchRoomOverlay.hidden) { closeLaunchRoom(); return true; }
    if (!mapOverlay.hidden) { toggleMap(); return true; }
    if (!inventoryOverlay.hidden) { toggleInventory(); return true; }
    if (!quickToolsPanel.hidden) { quickToolsPanel.hidden = true; $("#researchAction").setAttribute("aria-expanded", "false"); $("#researchAction").focus(); setModalState(); return true; }
    engine.closeInspection();
    return true;
  }

  async function openCamera() {
    if (!cameraOverlay.hidden || !introOverlay.hidden || !tutorialCoach.hidden || !launchRoomOverlay.hidden || engine.paused) return;
    const opening = ++cameraOpening;
    engine.closeInspection();
    cameraOverlay.hidden = false;
    feedbackAssistant.hide();
    appShell.inert = true;
    engine.controls.enabled = false;
    engine.controls.movementEnabled = false;
    engine.controls.keys.clear();
    setCameraMessage("Carregando ambiente 3D…");
    $("#closeCamera").focus();
    try {
      if (!cameraView) {
        const { LabCameraView } = await import('./camera-view.mjs');
        if (opening !== cameraOpening) return;
        cameraView = new LabCameraView({
          container: $("#cameraViewport"), map, config,
          onChange: ({ yaw, pitch, fov, zoom, targetZoom }) => {
            $("#cameraTelemetry").textContent = `${t(engine.getRoomName())} · YAW ${yaw.toFixed(1)}° · PITCH ${pitch.toFixed(1)}° · FOV ${fov.toFixed(1)}°`;
            $("#cameraZoomValue").textContent = `${zoom.toFixed(1)}×`;
            if (document.activeElement !== $("#cameraZoom")) $("#cameraZoom").value = targetZoom;
          }
        });
      }
      const target = map.props.find(prop => prop.trainingId === "camera");
      cameraView.open(engine.player, engine.mood, isNearCameraTarget(target) ? target : null);
      $("#cameraQuality").value = cameraView.quality;
      cameraControlsDisabled(false);
      setCameraMessage("Arraste para explorar. Enquadre o terreno simulado na mira e clique em Fotografar.");
    } catch (error) {
      cameraView?.dispose();
      cameraView = null;
      cameraControlsDisabled(true);
      setCameraMessage("Não foi possível iniciar a câmera 3D. Verifique o suporte a WebGL 2 e volte ao mapa para tentar novamente.");
      console.error("Falha ao abrir a câmera científica:", error);
    }
  }

  function cameraControlsDisabled(disabled) {
    for (const id of ["cameraMouse", "cameraCenter", "cameraQuality", "cameraZoom", "cameraCapture"]) $("#" + id).disabled = disabled;
  }

  function closeCamera() {
    ++cameraOpening; // Cancela também uma abertura cujo módulo ainda está carregando.
    cameraView?.close();
    cameraOverlay.hidden = true;
    cameraAssistant.hide();
    cameraControlsDisabled(true);
    appShell.inert = false;
    engine.controls.enabled = true;
    setModalState();
    canvas.focus();
  }

  function isNearCameraTarget(prop) {
    if (!prop) return false;
    const dx = Math.max(prop.x - engine.player.x, 0, engine.player.x - prop.x - prop.w);
    const dy = Math.max(prop.y - engine.player.y, 0, engine.player.y - prop.y - prop.h);
    return Math.hypot(dx, dy) < config.interaction.distance;
  }

  function captureCameraPhoto() {
    if (cameraOverlay.hidden || !cameraView?.active) return;
    const photo = cameraView.capture();
    if ((tutorial.phase !== "camera" && tutorial.phase !== "skipped") || selectedTool !== 1) {
      setCameraMessage("Explore o ambiente. O registro estará disponível na etapa Câmera científica do treinamento.");
      return;
    }
    if (photo?.prop?.trainingId !== "camera" || !isNearCameraTarget(photo.prop)) {
      setCameraMessage("Enquadre o terreno simulado na mira. Se estiver longe, volte ao mapa e aproxime-se do alvo destacado.");
      return;
    }
    closeCamera();
    handleInteraction(photo.prop, photo.image);
  }

  $("#closeCamera").addEventListener("click", closeCamera);
  $("#cameraCapture").addEventListener("click", captureCameraPhoto);
  $("#cameraCenter").addEventListener("click", () => cameraView?.controller.reset());
  $("#cameraZoom").addEventListener("input", event => cameraView?.controller.setZoom(event.target.value));
  $("#cameraQuality").addEventListener("change", event => {
    try {
      cameraView?.setQuality(event.target.value);
    } catch (error) {
      event.target.value = cameraView.quality;
      setCameraMessage("Não foi possível alterar a qualidade. Tente o perfil Baixa.");
      console.error("Falha ao alterar a qualidade 3D:", error);
    }
  });
  $("#cameraMouse").addEventListener("click", () => cameraView?.controller.enable());
  cameraOverlay.addEventListener("keydown", event => {
    if (event.key === "Tab") {
      const targets = [...cameraOverlay.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), canvas')];
      const index = targets.indexOf(document.activeElement);
      event.preventDefault();
      targets[(index + (event.shiftKey ? targets.length - 1 : 1)) % targets.length].focus();
    }
  });
  // Captura antes dos handlers do controller para Esc sempre fechar a vista 3D.
  document.addEventListener("keydown", event => {
    if (cameraOverlay.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeCamera();
    }
  }, true);
  window.addEventListener("pagehide", () => cameraView?.dispose(), { once: true });

  function startTutorial() {
    if (!suitWorn || !helmetWorn) return;
    tutorial.equip();
    appShell.inert = false;
    introOverlay.hidden = true;
    suitAssistant.hide();
    engine.controls.enabled = true;
    engine.controls.movementEnabled = true;
    canvas.focus();
    updateInterface();
  }

  function openLaunchRoom() {
    feedbackAssistant.hide();
    engine.closeInspection();
    engine.controls.enabled = false;
    engine.controls.movementEnabled = false;
    engine.controls.keys.clear();
    appShell.inert = true;
    launchRoomOverlay.hidden = false;
    launchRoomFrame.src = `/assets/Animations/opportunity_mars01_rocket.html?${animationParams()}`;
    $("#leaveLaunchRoom").focus();
  }

  function closeLaunchRoom(completed = false) {
    if (launchRoomOverlay.hidden) return;
    launchRoomOverlay.hidden = true;
    launchRoomFrame.src = "about:blank";
    if (completed && (tutorial.finishLaunch() || tutorial.phase === "skipped")) {
      try {
        localStorage.setItem("opportunity.training.handoff.v1", JSON.stringify({
          version: 1, name: cadetName, report: tutorial.report,
          inventory: inventoryItems.map((item, index) => ({ id: `training-${index + 1}`, ...item }))
        }));
      } catch { console.warn("Não foi possível transferir os registros do treinamento para a campanha."); }
      engine.stop();
      window.location.href = "/mars-test/?arrival=1";
      return;
    }
    tutorial.leaveLaunchRoom();
    Object.assign(engine.player, map.launchRoom.exit);
    appShell.inert = false;
    engine.controls.enabled = true;
    engine.controls.movementEnabled = true;
    engine.controls.keys.clear();
    canvas.focus();
    updateInterface();
  }

  function resetTraining() {
    if (!cameraOverlay.hidden) closeCamera();
    window.clearTimeout(feedbackTimer);
    tutorialFeedback.hidden = true;
    feedbackAssistant.hide();
    tutorial.reset();
    selectedTool = null;
    inventoryItems.length = 0;
    announcedPhase = null;
    lastObjectivePhase = null;
    mapOverlay.hidden = true;
    inventoryOverlay.hidden = true;
    quickToolsPanel.hidden = true;
    tutorialCoach.hidden = true;
    $("#researchAction").setAttribute("aria-expanded", "false");
    engine.controls.keys.clear();
    equipmentAnimationOverlay.hidden = true;
    equipmentAnimationFrame.src = "about:blank";
    activeEquipmentAnimation = null;
    launchRoomOverlay.hidden = true;
    launchRoomFrame.src = "about:blank";
    engine.reset();
    renderInventory();
    prepareEquipment();
  }

  function selectAtmosphere(key) {
    engine.setAtmosphere(key);
  }

  function finishEquipmentAnimation() {
    if (equipmentAnimationOverlay.hidden) return;
    equipmentAnimationOverlay.hidden = true;
    equipmentAnimationFrame.src = "about:blank";
    if (activeEquipmentAnimation === "suit") {
      suitWorn = true;
      $("#wearSuit").setAttribute("aria-pressed", "true");
      $("#wearSuit").querySelector(".suit-step-state").textContent = t("CONCLUÍDO");
      $("#wearHelmet").disabled = false;
      setSuitFeedback("Agora coloque o capacete.");
      $("#wearHelmet").focus();
    } else if (activeEquipmentAnimation === "helmet") {
      helmetWorn = true;
      $("#wearHelmet").setAttribute("aria-pressed", "true");
      $("#wearHelmet").querySelector(".suit-step-state").textContent = t("CONCLUÍDO");
      setSuitFeedback("Equipamento pronto.");
      $("#confirmSuit").disabled = false;
      $("#confirmSuit").focus();
    }
    activeEquipmentAnimation = null;
  }

  function animationParams() {
    const preferences = window.GamePreferences.get();
    return new URLSearchParams({ embed: "1", lang: preferences.language, subtitles: preferences.subtitles ? "1" : "0" });
  }

  function startEquipmentAnimation(equipment) {
    activeEquipmentAnimation = equipment;
    const isSuit = equipment === "suit";
    const button = isSuit ? $("#wearSuit") : $("#wearHelmet");
    button.disabled = true;
    button.querySelector(".suit-step-state").textContent = t("EM ANDAMENTO");
    setSuitFeedback(isSuit ? "Vestindo o traje..." : "Colocando o capacete...");
    equipmentAnimationOverlay.hidden = false;
    const animationPath = isSuit
      ? "/assets/Animations/astronauta_traje_espacial_8bit.html"
      : "/assets/Animations/anima%C3%A7%C3%A3o%20capacete%20atualizada/index.html";
    equipmentAnimationFrame.src = `${animationPath}?${animationParams()}`;
    $("#skipEquipmentAnimation").focus();
  }

  Object.entries(config.atmosphere.presets).forEach(([key, preset]) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "mood-button"; button.dataset.mood = key; button.textContent = t(preset.label);
    button.addEventListener("click", () => selectAtmosphere(key));
    $("#moodControls").append(button);
  });
  const requestedAtmosphere = new URLSearchParams(window.location.search).get("atmosphere");
  selectAtmosphere(Object.hasOwn(config.atmosphere.presets, requestedAtmosphere)
    ? requestedAtmosphere : config.atmosphere.default);

  map.destinations.forEach(destination => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "room-button"; button.textContent = t(destination.name);
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
    button.title = t("{frames} quadros", { frames: animation.frames });
    button.addEventListener("click", () => {
      animationFeedback.textContent = t("Reproduzindo {name} ({frames} quadros).", { name, frames: animation.frames });
      engine.player.playAnimation(name, {
        loop: false,
        onComplete: () => { animationFeedback.textContent = t("Idle e corrida acompanham o movimento no mapa."); }
      });
      updateInterface();
    });
    $("#animationControls").append(button);
  });

  $("#welcomeForm").addEventListener("submit", event => {
    event.preventDefault();
    cadetName = cadetInput.value.trim();
    if (!cadetName) {
      cadetInput.setCustomValidity(t("Informe o nome do cadete."));
      cadetInput.reportValidity();
      return;
    }
    if (!suitWorn || !helmetWorn) {
      setSuitFeedback("Conclua traje e capacete.");
      return;
    }
    cadetInput.setCustomValidity("");
    try {
      window.localStorage.setItem(profileStorageKey, JSON.stringify({ name: cadetName, character }));
    } catch (error) {
      console.error("Não foi possível salvar o perfil do cadete:", error);
      setSuitFeedback("Não foi possível salvar o perfil neste navegador.");
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
  $("#leaveLaunchRoom").addEventListener("click", () => closeLaunchRoom());
  window.addEventListener("message", event => {
    if (!launchRoomOverlay.hidden && event.source === launchRoomFrame.contentWindow && event.origin === window.location.origin) {
      if (event.data === "rocket-animation-complete") closeLaunchRoom(true);
      else if (event.data === "rocket-room-exit") closeLaunchRoom();
      return;
    }
    if (event.source !== equipmentAnimationFrame.contentWindow || event.origin !== window.location.origin) return;
    if (event.data === `${activeEquipmentAnimation}-animation-complete`) finishEquipmentAnimation();
    if (activeEquipmentAnimation && event.data?.type === "equipment-sound") {
      window.GamePreferences.playEffect(event.data.frequency, event.data.duration);
    }
  });
  document.addEventListener("keydown", event => {
    if (!launchRoomOverlay.hidden && event.key === "Escape") {
      event.preventDefault();
      closeLaunchRoom();
      return;
    }
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
  $("#backToMenu").addEventListener("click", () => { window.location.href = "/"; });
  $("#showTutorialHelp").addEventListener("click", showTutorialCoach);
  skipTutorialButton.addEventListener("click", skipTutorial);
  $("#continueTutorial").addEventListener("click", closeTutorialCoach);
  tutorialCoach.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); closeTutorialCoach(); }
    if (event.key === "Tab") {
      const targets = [$("#continueTutorial"), ...(!$("#tutorialMenuLink").hidden ? [$("#tutorialMenuLink")] : [])];
      const index = targets.indexOf(document.activeElement);
      event.preventDefault();
      targets[(index + (event.shiftKey ? targets.length - 1 : 1)) % targets.length].focus();
    }
  });
  $("#pauseButton").addEventListener("click", () => engine.setPaused());
  $("#resumeButton").addEventListener("click", () => {
    engine.setPaused(false);
    canvas.focus();
  });
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
    fullscreenButton.setAttribute("aria-label", t(isFullscreen ? "Sair da tela cheia" : "Tela cheia"));
    fullscreenButton.title = t(isFullscreen ? "Sair da tela cheia" : "Tela cheia");
  });
  $("#closeInspect").addEventListener("click", () => engine.closeInspection());
  $("#closeMap").addEventListener("click", toggleMap);
  $("#closeInventory").addEventListener("click", toggleInventory);

  canvas.addEventListener("click", event => {
    if (event.button !== 0) return;
    if (engine.nearObject && (selectedTool || tutorial.phase === "gravity" || tutorial.phase === "communication")) {
      engine.interact("mouse");
      return;
    }
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
        $("#assetFeedback").textContent = t("{count} imagem(ns) carregada(s).", { count: loaded });
      };
      image.onerror = () => { $("#assetFeedback").textContent = t("Não foi possível carregar {file}.", { file: file.name }); };
      image.src = URL.createObjectURL(file);
    });
    if (!files.length) $("#assetFeedback").textContent = t("Nenhum pacote carregado.");
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
      phase: tutorial.phase, cadetName, character, selectedTool, completedTools: [...completedTests], inventory: [...inventoryItems]
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
      normalSpeed = speed;
      config.player.speed = speed;
    }
  });

  const mapLabels = [
    ...map.roomLabels.map(label => ({ label, key: "text", source: label.text })),
    ...map.floorDecals.filter(label => label.k === "text").map(label => ({ label, key: "s", source: label.s }))
  ];
  function translateMapLabels() {
    mapLabels.forEach(({ label, key, source }) => { label[key] = t(source); });
    engine.renderer.drawStaticMap();
  }
  translateMapLabels();
  window.addEventListener("languagechange", () => {
    if (!tutorialCoach.hidden) showTutorialCoach();
    if (!introOverlay.hidden) setSuitFeedback(suitMessage);
    renderToolControls();
    renderInventory();
    translateMapLabels();
    lastObjectivePhase = null;
    updateInterface();
    if (engine.inspectedObject) showInspection(engine.inspectedObject);
  });

  cadetInput.value = cadetName;
  const fatigueItem = document.createElement("div");
  fatigueItem.className = "vital-item life-fatigue";
  fatigueItem.style.setProperty("--vital-color", "#d2a6ff");
  fatigueItem.innerHTML = '<div class="vital-label"><span>FADIGA</span><strong>0%</strong></div><div class="vital-track" role="meter" aria-label="Fadiga" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span style="width:0%"></span></div>';
  $(".hud-vitals .vital-grid").append(fatigueItem);
  window.LifeUI.mount({
    game: engine,
    isSuspended: () => !introOverlay.hidden || !tutorialCoach.hidden || !equipmentAnimationOverlay.hidden || !launchRoomOverlay.hidden || !cameraOverlay.hidden || !mapOverlay.hidden || !inventoryOverlay.hidden || !quickToolsPanel.hidden
  });
  updateInterface();
  prepareEquipment();
  engine.start().then(() => {
    $("#stageStatus").replaceChildren(document.createTextNode(t("SISTEMA ONLINE") + " "), document.createElement("span"));
    console.info("Opportunity Lab Engine pronta. APIs disponíveis em window.labTraining e window.opportunityMap.");
  }).catch(error => {
    $("#stageStatus").textContent = t("ERRO AO CARREGAR ASSETS");
    console.error("Falha ao iniciar a engine Opportunity Lab:", error);
  });
})();
