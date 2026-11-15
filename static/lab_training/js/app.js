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
  const introOverlay = $("#introOverlay");
  const equipmentAnimationOverlay = $("#equipmentAnimationOverlay");
  const equipmentAnimationFrame = $("#equipmentAnimationFrame");
  const launchRoomOverlay = $("#launchRoomOverlay");
  const launchRoomFrame = $("#launchRoomFrame");
  const mapOverlay = $("#mapOverlay");
  const inventoryOverlay = $("#inventoryOverlay");
  const quickToolsPanel = $("#quickToolsPanel");
  const miniMap = $("#miniMap");
  const tutorialObjective = $("#tutorialObjective");
  const tutorialFeedback = $("#tutorialFeedback");
  const cadetInput = $("#cadetName");
  const appShell = $("#appShell");
  const fullscreenButton = $("#fullscreenButton");
  const cameraOverlay = $("#cameraOverlay");
  let cameraView = null;
  let cameraOpening = 0;

  const tools = [
    { key: 1, name: "Câmera científica", detail: "Fotografa terrenos e materiais", target: "telescope", targetName: "Pancam", result: "Imagem panorâmica registrada na mochila." },
    { key: 2, name: "Microscópio portátil", detail: "Analisa amostras de perto", target: "micro", targetName: "Microscopic Imager", result: "Análise microscópica da amostra registrada." },
    { key: 3, name: "Sensor de temperatura", detail: "Mede a temperatura de sólidos", target: "spec", targetName: "amostra no espectrômetro", result: "Leitura registrada: superfície sólida a -21,6 °C." },
    { key: 4, name: "Furadeira de amostras", detail: "Extrai material do solo", target: "bench", targetName: "bancada de amostras", result: "Amostra de rególito extraída e guardada." }
  ];
  const tutorial = new LabTutorial();
  const tutorialCoach = $("#tutorialCoach");
  let announcedPhase = null;
  let lastObjectivePhase = null;
  let cadetName = savedProfile?.name || "";
  let character = savedProfile?.character || defaultCharacter;
  let selectedTool = null;
  let suitWorn = false;
  let helmetWorn = false;
  let activeEquipmentAnimation = null;
  const completedTests = tutorial.completedTools;
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
  engine.onToolSelect = selectTool;
  engine.onMapToggle = toggleMap;
  engine.onInventoryToggle = toggleInventory;
  engine.onEscape = handleEscape;
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
      if (tutorial.phase === "ship" && engine.player.x >= room.x && engine.player.x < room.x + room.w && engine.player.y >= room.y && engine.player.y < room.y + room.h) {
        tutorial.interact("ship");
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
    $("#welcomeTitle").textContent = "Preparação do treinamento";
    $("#confirmSuit").textContent = "Iniciar treinamento";
    for (const id of ["wearSuit", "wearHelmet"]) {
      const button = $(`#${id}`);
      button.disabled = id === "wearHelmet";
      button.setAttribute("aria-pressed", "false");
      button.querySelector(".suit-step-state").textContent = "PENDENTE";
    }
    $("#confirmSuit").disabled = true;
    $("#suitFeedback").textContent = "Primeiro vista o traje e as botas. Depois coloque o capacete.";
    cadetInput.value = cadetName;
    (cadetName ? $("#wearSuit") : cadetInput).focus();
  }

  function showTutorialCoach() {
    const step = tutorial.step;
    if (!step || tutorial.phase === "launch") return;
    $("#coachStep").textContent = step.label;
    $("#coachTitle").textContent = step.title;
    $("#coachDescription").textContent = step.description;
    $("#coachKey").textContent = step.key;
    $("#continueTutorial").textContent = tutorial.phase === "complete" ? "Explorar a instalação" : "Entendido, vamos lá";
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
    appShell.inert = false;
    engine.controls.enabled = true;
    setModalState();
    canvas.focus();
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

    const objective = tutorial.step;
    tutorialObjective.hidden = !objective;
    if (objective) {
      if (lastObjectivePhase !== tutorial.phase) {
        document.querySelectorAll(".tutorial-highlight").forEach(element => element.classList.remove("tutorial-highlight"));
        const highlight = tutorial.phase === "map" ? $("#mapAction") : tutorial.phase === "inventory" ? $("#inventoryAction") : ["camera", "microscope", "temperature", "drill"].includes(tutorial.phase) ? $("#researchAction") : null;
        highlight?.classList.add("tutorial-highlight");
        $("#tutorialTitle").textContent = objective.title;
        $("#tutorialDescription").textContent = objective.description;
        $("#tutorialStepLabel").textContent = objective.label;
        $("#tutorialKey").textContent = objective.key;
        lastObjectivePhase = tutorial.phase;
      }
      const walking = ["movement", "gravityWalk"].includes(tutorial.phase);
      $("#tutorialProgress").hidden = !walking;
      if (walking) $("#tutorialProgress").value = Math.min(100, tutorial.distance / (tutorial.phase === "movement" ? 4 : 6) * 100);
      const { target, route } = engine.renderer.getGuideRoute();
      $("#tutorialDistance").textContent = target ? `${target.name} · ${Math.max(0, route.length - 1)} m de percurso` : walking ? `${tutorial.distance.toFixed(1)} / ${tutorial.phase === "movement" ? 4 : 6} m` : "";
      $("#mapObjective").textContent = target ? `Objetivo: ${target.name}` : objective.title;
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
        interactionHint.textContent = "E · CALIBRAR";
      } else if (tutorial.phase === "ship") {
        interactionHint.textContent = "ATRAVESSE A PORTA · SALA DE LANÇAMENTO";
      } else if (["camera", "microscope", "temperature", "drill"].includes(tutorial.phase) && selectedTool) {
        interactionHint.textContent = "E · USAR FERRAMENTA";
      } else {
        interactionHint.textContent = `SELECIONE ${tutorial.step.key}`;
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

  }

  function showInspection(prop) {
    inspectCard.hidden = !prop;
    if (!prop) return;
    $("#inspectTitle").textContent = prop.name;
    $("#inspectDescription").textContent = prop.description;
    if (["camera", "microscope", "temperature", "drill"].includes(tutorial.phase) && !selectedTool) {
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
      const key = document.createElement("kbd");
      key.textContent = String(tool.key);
      const name = document.createElement("span");
      name.textContent = tool.name;
      const progress = document.createElement("span");
      progress.className = "tool-progress";
      button.append(key, name, progress);
      button.title = tool.detail;
      button.addEventListener("click", () => selectTool(tool.key));
      container.append(button);
    });
  }

  function selectTool(key) {
    if (!tools.some(tool => tool.key === key) || !introOverlay.hidden || !tutorialCoach.hidden || !mapOverlay.hidden || !inventoryOverlay.hidden) return;
    selectedTool = key;
    quickToolsPanel.hidden = true;
    $("#researchAction").setAttribute("aria-expanded", "false");
    engine.closeInspection();
    showFeedback(`${tools[key - 1].name} ativa`);
    setModalState();
    if (key === 1) openCamera();
  }

  function handleInteraction(prop, photo = null) {
    if (!mapOverlay.hidden || !inventoryOverlay.hidden || !tutorialCoach.hidden) return true;
    if (selectedTool === 1 && !photo) { openCamera(); return true; }
    const phase = tutorial.phase;
    if (phase === "ship" && prop.trainingId === "ship") {
      showFeedback("Atravesse a porta para entrar na sala de lançamento.");
      return true;
    }
    if (phase === "complete") return false;
    if (!tutorial.interact(prop.trainingId, selectedTool)) {
      showFeedback(tutorial.targetId === prop.trainingId
        ? `Selecione a ferramenta indicada: ${tutorial.step.key}.`
        : "Siga o objetivo destacado para concluir esta etapa.");
      return true;
    }
    if (completedTests.has(selectedTool) && ["camera", "microscope", "temperature", "drill"].includes(phase)) {
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
      if (item?.photo) {
        const image = document.createElement("img");
        image.className = "inventory-photo";
        image.src = item.photo;
        image.alt = "Fotografia do terreno simulado registrada com a câmera científica";
        slot.append(image);
      }
      slots.append(slot);
    }
    $("#inventoryCount").textContent = inventoryItems.length
      ? `${inventoryItems.length}/4 resultados do treinamento guardados.`
      : "Quatro slots disponíveis para os resultados do treinamento.";
  }

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
      const isObjective = prop.trainingId && prop.trainingId === tutorial.targetId;
      ctx.fillStyle = isObjective ? "#ffb552" : "#b3c2c8";
      ctx.fillRect(prop.x * cellWidth + 2, prop.y * cellHeight + 2, Math.max(2, prop.w * cellWidth - 4), Math.max(2, prop.h * cellHeight - 4));
    });
    const { target, route } = engine.renderer.getGuideRoute();
    if (route.length > 1) {
      ctx.strokeStyle = "#ffb552"; ctx.lineWidth = 2; ctx.beginPath();
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
    if (!introOverlay.hidden || !tutorialCoach.hidden) return;
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
    appShell.inert = true;
    engine.controls.enabled = false;
    engine.controls.movementEnabled = false;
    engine.controls.keys.clear();
    $("#cameraMessage").textContent = "Carregando ambiente 3D…";
    $("#closeCamera").focus();
    try {
      if (!cameraView) {
        const { LabCameraView } = await import('./camera-view.js');
        if (opening !== cameraOpening) return;
        cameraView = new LabCameraView({
          container: $("#cameraViewport"), map, config,
          onChange: ({ yaw, pitch, fov, zoom, targetZoom }) => {
            $("#cameraTelemetry").textContent = `${engine.getRoomName()} · YAW ${yaw.toFixed(1)}° · PITCH ${pitch.toFixed(1)}° · FOV ${fov.toFixed(1)}°`;
            $("#cameraZoomValue").textContent = `${zoom.toFixed(1)}×`;
            if (document.activeElement !== $("#cameraZoom")) $("#cameraZoom").value = targetZoom;
          }
        });
      }
      const target = map.props.find(prop => prop.trainingId === "camera");
      cameraView.open(engine.player, engine.mood, isNearCameraTarget(target) ? target : null);
      $("#cameraQuality").value = cameraView.quality;
      cameraControlsDisabled(false);
      $("#cameraMessage").textContent = "Arraste para explorar. Enquadre o terreno simulado na mira e fotografe com E.";
    } catch (error) {
      cameraView?.dispose();
      cameraView = null;
      cameraControlsDisabled(true);
      $("#cameraMessage").textContent = "Não foi possível iniciar a câmera 3D. Verifique o suporte a WebGL 2 e volte ao mapa para tentar novamente.";
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
    if (tutorial.phase !== "camera" || selectedTool !== 1) {
      $("#cameraMessage").textContent = "Explore o ambiente. O registro estará disponível na etapa Câmera científica do treinamento.";
      return;
    }
    if (photo?.prop?.trainingId !== "camera" || !isNearCameraTarget(photo.prop)) {
      $("#cameraMessage").textContent = "Enquadre o terreno simulado na mira. Se estiver longe, volte ao mapa e aproxime-se do alvo destacado.";
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
      $("#cameraMessage").textContent = "Não foi possível alterar a qualidade. Tente o perfil Baixa.";
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
    if (event.key === "Escape" || (!event.repeat && event.code === "KeyE")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Escape") closeCamera();
      else captureCameraPhoto();
    }
  }, true);
  window.addEventListener("pagehide", () => cameraView?.dispose(), { once: true });

  function startTutorial() {
    if (!suitWorn || !helmetWorn) return;
    tutorial.equip();
    appShell.inert = false;
    introOverlay.hidden = true;
    engine.controls.enabled = true;
    engine.controls.movementEnabled = true;
    canvas.focus();
    updateInterface();
  }

  function openLaunchRoom() {
    engine.closeInspection();
    engine.controls.enabled = false;
    engine.controls.movementEnabled = false;
    engine.controls.keys.clear();
    appShell.inert = true;
    launchRoomOverlay.hidden = false;
    launchRoomFrame.src = "/assets/Animations/opportunity_mars01_rocket.html?embed=1";
    $("#leaveLaunchRoom").focus();
  }

  function closeLaunchRoom(completed = false) {
    if (launchRoomOverlay.hidden) return;
    launchRoomOverlay.hidden = true;
    launchRoomFrame.src = "about:blank";
    if (completed) tutorial.finishLaunch();
    else tutorial.leaveLaunchRoom();
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
      ? "/assets/Animations/astronauta_vestindo_traje_8bit.html?embed=1"
      : "/assets/Animations/anima%C3%A7%C3%A3o%20capacete%20atualizada/index.html?embed=1";
    $("#skipEquipmentAnimation").focus();
  }

  Object.entries(config.atmosphere.presets).forEach(([key, preset]) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "mood-button"; button.dataset.mood = key; button.textContent = preset.label;
    button.addEventListener("click", () => selectAtmosphere(key));
    $("#moodControls").append(button);
  });
  const requestedAtmosphere = new URLSearchParams(window.location.search).get("atmosphere");
  selectAtmosphere(Object.hasOwn(config.atmosphere.presets, requestedAtmosphere)
    ? requestedAtmosphere : config.atmosphere.default);

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
  $("#leaveLaunchRoom").addEventListener("click", () => closeLaunchRoom());
  window.addEventListener("message", event => {
    if (!launchRoomOverlay.hidden && event.source === launchRoomFrame.contentWindow && event.origin === window.location.origin) {
      if (event.data === "rocket-animation-complete") closeLaunchRoom(true);
      else if (event.data === "rocket-room-exit") closeLaunchRoom();
      return;
    }
    if (event.source !== equipmentAnimationFrame.contentWindow || event.origin !== window.location.origin) return;
    if (event.data === `${activeEquipmentAnimation}-animation-complete`) finishEquipmentAnimation();
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
  $("#showTutorialHelp").addEventListener("click", showTutorialCoach);
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

  cadetInput.value = cadetName;
  updateInterface();
  prepareEquipment();
  engine.start().then(() => {
    $("#stageStatus").innerHTML = "SISTEMA ONLINE <span></span>";
    console.info("Opportunity Lab Engine pronta. APIs disponíveis em window.labTraining e window.opportunityMap.");
  }).catch(error => {
    $("#stageStatus").textContent = "ERRO AO CARREGAR ASSETS";
    console.error("Falha ao iniciar a engine Opportunity Lab:", error);
  });
})();
