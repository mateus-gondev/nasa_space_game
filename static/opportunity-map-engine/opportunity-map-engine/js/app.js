/* Inicialização da interface. A engine também pode ser controlada pelo console. */
(() => {
  const config = window.MAP_ENGINE_CONFIG;
  const map = window.MAP_DATA;
  const $ = selector => document.querySelector(selector);
  const canvas = $("#gameCanvas");
  const stage = $("#stage");
  const inspectCard = $("#inspectCard");
  const interactionHint = $("#interactionHint");

  const engine = new MapEngine({
    canvas, config, map,
    onStateChange: updateInterface,
    onInspect: showInspection
  });

  function updateInterface(state = engine.getState()) {
    $("#telemetryRoom").textContent = state.room;
    $("#telemetryMood").textContent = state.mood;
    $("#telemetryPosition").textContent = state.position;
    $("#telemetryTarget").textContent = state.target;
    $("#pausedOverlay").hidden = !state.paused;
    $("#pauseButton").textContent = state.paused ? "Continuar" : "Pausar";
    interactionHint.hidden = !engine.nearObject || Boolean(engine.inspectedObject);
    if (engine.nearObject && !engine.inspectedObject) interactionHint.textContent = `[E] INSPECIONAR · ${engine.nearObject.name}`;
    document.querySelectorAll(".mood-button").forEach(button => button.classList.toggle("active", button.dataset.mood === state.atmosphere));
  }

  function showInspection(prop) {
    inspectCard.hidden = !prop;
    if (!prop) return;
    $("#inspectTitle").textContent = prop.name;
    $("#inspectDescription").textContent = prop.description;
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

  $("#pauseButton").addEventListener("click", () => engine.setPaused());
  $("#resetButton").addEventListener("click", () => engine.reset());
  $("#closeInspect").addEventListener("click", () => engine.closeInspection());

  canvas.addEventListener("click", event => {
    const rect = canvas.getBoundingClientRect();
    const cam = engine.renderer.cam || { x: 0, y: 0 }, view = config.camera.viewTiles, tile = config.grid.tileSize;
    const x = cam.x / tile + (event.clientX - rect.left) / rect.width * view.w;
    const y = cam.y / tile + (event.clientY - rect.top) / rect.height * view.h;
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
    reset: () => engine.reset(),
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

  updateInterface();
  engine.start();
  console.info("Opportunity Map Engine pronta. API disponível em window.opportunityMap.");
})();
