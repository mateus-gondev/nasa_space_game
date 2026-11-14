/* Inicialização da interface. A engine também pode ser controlada pelo console. */
(() => {
  const config = window.MAP_ENGINE_CONFIG;
  const map = window.MAP_DATA;
  const $ = selector => document.querySelector(selector);
  const canvas = $("#gameCanvas");
  const inspectCard = $("#inspectCard");
  const interactionHint = $("#interactionHint");
  const animationFeedback = $("#animationFeedback");
  const introOverlay = $("#introOverlay");
  const welcomeScreen = $("#welcomeScreen");
  const suitScreen = $("#suitScreen");
  const mapOverlay = $("#mapOverlay");
  const inventoryOverlay = $("#inventoryOverlay");
  const miniMap = $("#miniMap");
  const tutorialObjective = $("#tutorialObjective");
  const tutorialFeedback = $("#tutorialFeedback");
  const cadetInput = $("#cadetName");
  const appShell = $("#appShell");

  const tools = [
    { key: 1, name: "Câmera científica", detail: "Fotografa terrenos e materiais", target: "telescope", targetName: "Pancam", result: "Imagem panorâmica registrada na mochila." },
    { key: 2, name: "Microscópio portátil", detail: "Analisa amostras de perto", target: "micro", targetName: "Microscopic Imager", result: "Análise microscópica da amostra registrada." },
    { key: 3, name: "Sensor de temperatura", detail: "Mede a temperatura de sólidos", target: "spec", targetName: "amostra no espectrômetro", result: "Leitura registrada: superfície sólida a -21,6 °C." },
    { key: 4, name: "Furadeira de amostras", detail: "Extrai material do solo", target: "bench", targetName: "bancada de amostras", result: "Amostra de rególito extraída e guardada." }
  ];
  let tutorialPhase = "intro";
  let cadetName = "";
  let selectedTool = null;
  let suitWorn = false;
  let helmetWorn = false;
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
  engine.onToolSelect = selectTool;
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
    $("#pausedOverlay").hidden = !state.paused;
    $("#pauseButton").textContent = state.paused ? "Continuar" : "Pausar";

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
        interactionHint.textContent = engine.nearObject.type === "dish"
          ? "[E] TESTAR GRAVIDADE · ANTENA DE ALTO GANHO"
          : "SIGA ATÉ A ANTENA DE ALTO GANHO";
      } else if (tutorialPhase === "tools" && selectedTool) {
        interactionHint.textContent = `[E] USAR ${tools[selectedTool - 1].name.toUpperCase()}`;
      } else {
        interactionHint.textContent = "[E] SELECIONAR / INSPECIONAR ITEM";
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
    if (tutorialPhase === "tools" && !selectedTool) {
      showFeedback(`Item selecionado: ${prop.name}. Escolha uma ferramenta de 1 a 4.`);
    }
  }

  function showFeedback(message) {
    window.clearTimeout(feedbackTimer);
    tutorialFeedback.textContent = message;
    tutorialFeedback.hidden = false;
    feedbackTimer = window.setTimeout(() => { tutorialFeedback.hidden = true; }, 5200);
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
    if (!tools.some(tool => tool.key === key) || tutorialPhase === "intro" || tutorialPhase === "suit" || !mapOverlay.hidden || !inventoryOverlay.hidden) return;
    selectedTool = key;
    engine.closeInspection();
    showFeedback(`${tools[key - 1].name} selecionada. ${tools[key - 1].detail}.`);
    updateInterface();
  }

  function handleInteraction(prop) {
    if (!mapOverlay.hidden || !inventoryOverlay.hidden) return true;
    if (tutorialPhase === "gravity") {
      if (prop.type !== "dish") {
        showFeedback("O teste de gravidade fica na Antena de Alto Ganho. Continue até ela.");
        return true;
      }
      tutorialPhase = "tools";
      selectedTool = null;
      engine.closeInspection();
      showFeedback("Calibração concluída: Marte simulado a 3,71 m/s² (38% da gravidade terrestre).");
      updateInterface();
      return true;
    }
    if (tutorialPhase !== "tools" || !selectedTool) return false;

    const tool = tools[selectedTool - 1];
    if (prop.type !== tool.target) {
      showFeedback(`${tool.name} deve ser usada em ${tool.targetName}. Aproxime-se do equipamento correto.`);
      return true;
    }
    if (completedTests.has(tool.key)) {
      showFeedback(`Teste da ${tool.name.toLowerCase()} já registrado. Escolha outra ferramenta.`);
      return true;
    }

    completedTests.add(tool.key);
    inventoryItems.push({ title: tool.name, result: tool.result });
    engine.closeInspection();
    showFeedback(tool.result);
    if (completedTests.size === tools.length) tutorialPhase = "complete";
    renderInventory();
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
    engine.controls.movementEnabled = mapOverlay.hidden && inventoryOverlay.hidden;
    engine.controls.keys.clear();
    updateInterface();
  }

  function toggleMap() {
    const opening = mapOverlay.hidden;
    mapOverlay.hidden = !opening;
    inventoryOverlay.hidden = true;
    if (opening) { drawMinimap(); $("#closeMap").focus(); }
    else canvas.focus();
    setModalState();
  }

  function toggleInventory() {
    const opening = inventoryOverlay.hidden;
    inventoryOverlay.hidden = !opening;
    mapOverlay.hidden = true;
    if (opening) { renderInventory(); $("#closeInventory").focus(); }
    else canvas.focus();
    setModalState();
  }

  function handleEscape() {
    if (!mapOverlay.hidden) { mapOverlay.hidden = true; canvas.focus(); setModalState(); return true; }
    if (!inventoryOverlay.hidden) { inventoryOverlay.hidden = true; canvas.focus(); setModalState(); return true; }
    engine.closeInspection();
    return true;
  }

  function startTutorial() {
    if (!suitWorn || !helmetWorn) return;
    tutorialPhase = "gravity";
    appShell.inert = false;
    introOverlay.hidden = true;
    engine.controls.enabled = true;
    engine.controls.movementEnabled = true;
    canvas.focus();
    showFeedback(`Traje e capacete conferidos, cadete ${cadetName}. Siga para a Antena de Alto Ganho.`);
    updateInterface();
  }

  function resetTraining() {
    window.clearTimeout(feedbackTimer);
    tutorialFeedback.hidden = true;
    tutorialFeedback.textContent = "";
    tutorialPhase = "intro";
    cadetName = "";
    selectedTool = null;
    suitWorn = false;
    helmetWorn = false;
    completedTests.clear();
    inventoryItems.length = 0;
    cadetInput.value = "";
    $("#welcomeCadet").textContent = "_________";
    $("#telemetryCadet").textContent = "Astronauta";
    $("#suitCadet").textContent = "Cadete";
    $("#wearSuit").disabled = false;
    $("#wearSuit").setAttribute("aria-pressed", "false");
    $("#wearSuit").querySelector(".suit-step-state").textContent = "PENDENTE";
    $("#wearHelmet").disabled = true;
    $("#wearHelmet").setAttribute("aria-pressed", "false");
    $("#wearHelmet").querySelector(".suit-step-state").textContent = "PENDENTE";
    $("#suitFeedback").textContent = "Complete as duas etapas para iniciar a simulação.";
    $("#confirmSuit").disabled = true;
    welcomeScreen.hidden = false;
    suitScreen.hidden = true;
    introOverlay.hidden = false;
    appShell.inert = true;
    mapOverlay.hidden = true;
    inventoryOverlay.hidden = true;
    engine.controls.enabled = false;
    engine.controls.movementEnabled = false;
    engine.controls.keys.clear();
    engine.reset();
    renderInventory();
    updateInterface();
    cadetInput.focus();
  }

  Object.entries(config.atmosphere.presets).forEach(([key, preset]) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = "mood-button"; button.dataset.mood = key; button.textContent = preset.label;
    button.addEventListener("click", () => engine.setAtmosphere(key));
    $("#moodControls").append(button);
  });

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
    cadetInput.setCustomValidity("");
    $("#welcomeCadet").textContent = cadetName;
    $("#suitCadet").textContent = `Cadete ${cadetName}`;
    welcomeScreen.hidden = true;
    suitScreen.hidden = false;
    $("#wearSuit").focus();
  });
  cadetInput.addEventListener("input", () => {
    cadetInput.setCustomValidity("");
    $("#welcomeCadet").textContent = cadetInput.value.trim() || "_________";
  });
  $("#wearSuit").addEventListener("click", () => {
    suitWorn = true;
    $("#wearSuit").disabled = true;
    $("#wearSuit").setAttribute("aria-pressed", "true");
    $("#wearSuit").querySelector(".suit-step-state").textContent = "CONCLUÍDO";
    $("#wearHelmet").disabled = false;
    $("#suitFeedback").textContent = "Traje, botas e luvas conferidos. Agora coloque e vede o capacete.";
    $("#wearHelmet").focus();
  });
  $("#wearHelmet").addEventListener("click", () => {
    if (!suitWorn) return;
    helmetWorn = true;
    $("#wearHelmet").disabled = true;
    $("#wearHelmet").setAttribute("aria-pressed", "true");
    $("#wearHelmet").querySelector(".suit-step-state").textContent = "CONCLUÍDO";
    $("#suitFeedback").textContent = "Capacete vedado. Rádio e suporte à vida prontos.";
    $("#confirmSuit").disabled = false;
    $("#confirmSuit").focus();
  });
  $("#confirmSuit").addEventListener("click", startTutorial);
  $("#pauseButton").addEventListener("click", () => engine.setPaused());
  $("#resetButton").addEventListener("click", resetTraining);
  $("#closeInspect").addEventListener("click", () => engine.closeInspection());
  $("#closeMap").addEventListener("click", toggleMap);
  $("#closeInventory").addEventListener("click", toggleInventory);

  canvas.addEventListener("click", event => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * map.width;
    const y = (event.clientY - rect.top) / rect.height * map.height;
    engine.inspectObjectAt(x, y);
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
      phase: tutorialPhase, cadetName, selectedTool, completedTools: [...completedTests], inventory: [...inventoryItems]
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

  updateInterface();
  engine.start().then(() => {
    $("#stageStatus").innerHTML = "SISTEMA ONLINE <span></span>";
    console.info("Opportunity Lab Engine pronta. APIs disponíveis em window.labTraining e window.opportunityMap.");
  }).catch(error => {
    $("#stageStatus").textContent = "ERRO AO CARREGAR ASSETS";
    console.error("Falha ao iniciar a engine Opportunity Lab:", error);
  });
})();
