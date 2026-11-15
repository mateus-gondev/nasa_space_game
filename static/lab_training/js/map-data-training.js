/* Ajustes do treinamento sobre a planta base do Opportunity Map Engine v2. */
window.MAP_DATA.floorDecals = window.MAP_DATA.floorDecals.filter(decal => decal.k !== "nasa");
window.MAP_DATA.decals = [];

// Estações exclusivas do tutorial, em uma sala separada da antena.
(() => {
  const map = window.MAP_DATA;
  // Sala de lançamento no lugar do antigo foguete desenhado no piso.
  const room = { name: "Sala de lançamento", tag: "MARS 01 · LANÇAMENTO", x1: 19, y1: 38, x2: 26, y2: 45, floor: 3 };
  map.props = map.props.filter(prop => !(prop.x < room.x2 + 1 && prop.x + prop.w > room.x1 && prop.y < room.y2 + 1 && prop.y + prop.h > room.y1));
  for (let y = room.y1; y <= room.y2; y++) for (let x = room.x1; x <= room.x2; x++) {
    map.grid[y][x] = x === room.x1 || x === room.x2 || y === room.y1 || y === room.y2 ? 1 : 2;
    map.floorMap[y][x] = room.floor;
  }
  for (const x of [21, 22]) {
    map.grid[room.y1][x] = 3;
    map.doors.push({ x, y: room.y1, openness: 0, vertical: false });
  }
  map.rooms.unshift(room);
  map.roomLabels.push({ text: room.tag, x: 19.5, y: 38 });
  map.launchRoom = { x: 20, y: 39, w: 6, h: 6, exit: { x: 22, y: 37.5 } };
  map.destinations.push({ name: room.name, x: 22, y: 37.5 });
  const stations = [
    { trainingId: "camera", type: "telescope", x: 36, y: 5, w: 1, h: 2, name: "Alvo fotográfico", description: "Use a câmera científica (1) para fotografar este terreno simulado." },
    { trainingId: "microscope", type: "micro", x: 43, y: 5, w: 1, h: 1, name: "Amostra para microscópio", description: "Use o microscópio portátil (2) para analisar a amostra." },
    { trainingId: "temperature", type: "spec", x: 36, y: 16, w: 1, h: 1, name: "Rocha para leitura térmica", description: "Use o sensor de temperatura (3) para medir este sólido.", label: "TEMP" },
    { trainingId: "drill", type: "bench", x: 42, y: 16, w: 2, h: 1, name: "Solo para extração", description: "Use a furadeira de amostras (4) para extrair rególito." },
    { trainingId: "ship", type: "launchEntrance", x: 21, y: 39, w: 2, h: 1, solid: false, name: "Sala de lançamento MARS 01", description: "Atravesse a porta para entrar na sala e iniciar o lançamento 3D." }
  ];
  map.props.push(...stations.map(station => ({ solid: true, ...station })));
  map.props.sort((a, b) => a.y + a.h - b.y - b.h);
  map.props.find(prop => prop.type === "dish").trainingId = "gravity";
  const terminal = map.props.find(prop => prop.type === "console");
  terminal.trainingId = "communication";
  terminal.name = "Centro de comunicação";
  terminal.description = "Pressione E para reunir os quatro registros científicos, enviar o relatório e receber o briefing da expedição MER-B.";
  map.roomLabels.find(label => label.text === "ATRIUM").text = "LABORATÓRIO DE TREINAMENTO";
})();
