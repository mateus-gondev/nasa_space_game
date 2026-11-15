/*
 * DADOS DO MAPA
 * Coordenadas em tiles (40 px por padrão). Cada cômodo é uma sala independente,
 * com paredes próprias, ligada às outras por corredores com portas duplas.
 * Para adicionar um objeto: addProp(tipo, x, y, w, h, nome, descrição, opções).
 */
window.MAP_DATA = (() => {
  const { columns: W, rows: H } = window.MAP_ENGINE_CONFIG.grid;
  const grid = Array.from({ length: H }, () => Array(W).fill(0));     // 0 vazio, 1 parede, 2 piso, 3 porta
  const floorMap = Array.from({ length: H }, () => Array(W).fill(0));

  function room(x1, y1, x2, y2, floorType = 0) {
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
      const border = x === x1 || x === x2 || y === y1 || y === y2;
      grid[y][x] = border ? 1 : 2;
      if (!border) floorMap[y][x] = floorType;
    }
  }

  // ---- Planta: seis cômodos separados + corredores ----
  const rooms = [
    { name: "Mission Control", tag: "MISSION CONTROL", x1: 2, y1: 2, x2: 27, y2: 19, floor: 3 },
    { name: "Atrium", tag: "ATRIUM", x1: 34, y1: 2, x2: 45, y2: 19, floor: 6 },
    { name: "Instrument Lab", tag: "INSTRUMENT LAB", x1: 52, y1: 2, x2: 77, y2: 19, floor: 1 },
    { name: "Rover Bay", tag: "ROVER BAY", x1: 2, y1: 32, x2: 29, y2: 49, floor: 2 },
    { name: "Storage", tag: "STORAGE", x1: 36, y1: 32, x2: 51, y2: 49, floor: 4 },
    { name: "Power", tag: "POWER", x1: 58, y1: 32, x2: 77, y2: 49, floor: 5 }
  ];
  const links = [[27, 9, 34, 12], [45, 9, 52, 12], [13, 19, 16, 32], [38, 19, 41, 32], [65, 19, 68, 32], [29, 39, 36, 42], [51, 39, 58, 42]];
  rooms.forEach(r => room(r.x1, r.y1, r.x2, r.y2, r.floor));
  links.forEach(l => room(...l, 0));

  const doorTiles = [];
  links.forEach(([x1, y1, x2, y2]) => {
    if (x2 - x1 > y2 - y1) [[x1, y1 + 1], [x1, y1 + 2], [x2, y1 + 1], [x2, y1 + 2]].forEach(d => doorTiles.push(d));
    else [[x1 + 1, y1], [x1 + 2, y1], [x1 + 1, y2], [x1 + 2, y2]].forEach(d => doorTiles.push(d));
  });
  const isWall = v => v === 1 || v === 3;
  doorTiles.forEach(([x, y]) => { grid[y][x] = 3; floorMap[y][x] = 0; });
  const doors = doorTiles.map(([x, y]) => ({ x, y, openness: 0, vertical: isWall(grid[y - 1][x]) && isWall(grid[y + 1][x]) }));

  // ---- Objetos ----
  const props = [];
  function addProp(type, x, y, w, h, name, description, options = {}) {
    props.push({ type, x, y, w, h, name, description, solid: true, ...options });
  }
  const P = addProp;
  const deco = (type, x, y, w = 1, h = 1) => addProp(type, x, y, w, h, null, "", { solid: false });
  const crate = (x, y, w = 1, h = 1) => P("crate", x, y, w, h, "Caixa de Suprimentos", "Caixa lacrada para amostras, ferramentas e alvos de calibração, marcada com o emblema da NASA.");
  const plant = (x, y) => P("plant", x, y, 1, 1, "Planta", "Um toque de verde em uma instalação feita de metal e vidro.");

  // MISSION CONTROL
  P("screen", 6, 3, 14, 2, "Painel de Voo Principal", "Tela central: trajetória, status do rover e orçamento de energia. As equipes acompanhavam cada sol marciano em telas assim.");
  P("screen", 3, 3, 3, 1, "Relógio de Sóis", "Mostra a hora local em Marte. Um sol dura cerca de 24 h 39 min, e os turnos da equipe seguiam esse ritmo.");
  P("screen", 21, 3, 5, 1, "Status da Rede de Espaço Profundo", "Acompanha os contatos com as antenas da Deep Space Network, que recebiam os sinais do rover.");
  [["Console de Comando", "Aqui se enviava o plano diário de comandos para o rover."], ["Console de Telemetria", "Mostra temperatura, tensão das baterias e estado dos instrumentos."], ["Console de Navegação", "Usado para planejar rotas e avaliar riscos do terreno."]].forEach(([name, text], i) => {
    [5, 9, 13, 17, 21].forEach(x => { P("console", x, 6 + i * 3, 2, 1, name, text); deco("chair", x + .5, 7 + i * 3); });
  });
  P("cabinet", 3, 6, 1, 2, "Arquivo de Planos", "Pastas com planos de atividades diárias e relatórios de operação.");
  P("cabinet", 3, 9, 1, 2, "Arquivo de Relatórios", "Relatórios de sóis anteriores, organizados por data marciana.");
  P("holotable", 20, 15, 4, 3, "Mesa Holográfica de Marte", "Projeção do terreno de Meridiani Planum, usada para discutir rotas e alvos científicos.");
  P("desk", 3, 16, 3, 2, "Mesa do Diretor de Voo", "Laptop, anotações e uma caneca de café frio: o posto de quem coordenava as decisões da equipe.");
  deco("chair", 4, 15);
  P("coffee", 26, 5, 1, 1, "Máquina de Café", "Combustível das equipes que trabalhavam em turnos ao ritmo do sol marciano.");
  plant(3, 13); plant(26, 18); plant(26, 13);

  // ATRIUM
  P("whiteboard", 36, 3, 8, 1, "Linha do Tempo da Missão", "Pouso em janeiro de 2004. Planejada para 90 sóis, a missão operou por mais de 14 anos (5.111 sóis) e percorreu cerca de 45 km.");
  P("holotable", 38, 6, 4, 3, "Mapa Holográfico de Meridiani", "Mapa em relevo da planície onde o Opportunity pousou, com a rota percorrida marcada em azul.");
  P("rockcase", 36, 14, 3, 1, "Vitrine de Poeira Marciana", "Amostra simulada da poeira fina que cobria os painéis solares e reduzia a geração de energia.");
  P("rockcase", 42, 14, 3, 1, "Vitrine de Rochas Sedimentares", "Camadas de rocha estudadas na cratera Endurance, que mostraram evidências de água no passado de Marte.");
  plant(35, 3); plant(44, 3); plant(35, 18); plant(44, 18);

  // INSTRUMENT LAB
  P("telescope", 55, 3, 2, 2, "Pancam — Câmera Panorâmica", "Câmeras gêmeas em um mastro a cerca de 1,5 m do solo, usadas para panoramas coloridos e para mapear o terreno.");
  P("spec", 59, 3, 2, 2, "Espectrômetro APXS", "Alpha Particle X-ray Spectrometer: no braço robótico, mede quais elementos químicos existem em rochas e solo.", { label: "APXS" });
  P("spec", 63, 3, 2, 2, "Espectrômetro Mössbauer", "Identifica minerais com ferro e seu estado de oxidação, uma chave para entender o passado úmido de Marte.", { label: "MB" });
  P("spec", 67, 3, 2, 2, "Ferramenta de Abrasão (RAT)", "Rock Abrasion Tool: desgasta a superfície de rochas para expor material fresco para análise.", { label: "RAT" });
  P("micro", 70, 3, 1, 1, "Microscopic Imager", "Imagens de perto de rochas e solo, com cerca de 31 mícrons por pixel.");
  P("dish", 73, 3, 3, 3, "Antena de Alto Ganho", "Antena direcionável para falar direto com a Terra. Grande parte dos dados era retransmitida por orbitadores via UHF.");
  P("whiteboard", 55, 5, 6, 1, "Quadro de Resultados", "Anotações sobre hematita, jarosita e outros minerais que apontam para água líquida em Meridiani Planum.");
  P("bench", 55, 8, 8, 1, "Bancada de Preparação", "Área de preparação de amostras e calibração de instrumentos.");
  P("bench", 55, 13, 8, 1, "Bancada de Calibração", "Alvos de calibração de cores e padrões de referência para as câmeras.");
  P("rockcase", 65, 8, 4, 1, "Vitrine de Esférulas de Hematita", "As \"blueberries\": pequenas esférulas ricas em hematita encontradas em Meridiani Planum.");
  P("rockcase", 71, 8, 4, 1, "Vitrine do Meteorito", "O Heat Shield Rock foi o primeiro meteorito identificado em outro planeta, encontrado pelo Opportunity.");
  P("bench", 65, 13, 6, 1, "Bancada de Análise", "Estação para comparar dados dos espectrômetros com amostras de referência.");
  P("globe", 74, 11, 1, 1, "Globo de Marte", "Meridiani Planum, perto do equador, é onde o Opportunity pousou em janeiro de 2004.");
  P("desk", 71, 15, 3, 2, "Estação de Análise", "Monitor com espectros em tempo real e gráficos de composição.");
  deco("chair", 72, 14);
  P("rack", 54, 16, 4, 1, "Rack de Dados Científicos", "Armazena e processa os dados recebidos dos instrumentos.");
  P("locker", 59, 18, 6, 1, "Armários de Equipamento", "Luvas, ferramentas de precisão e peças reserva dos instrumentos.");
  crate(75, 17, 2, 1); crate(53, 5);
  P("coffee", 53, 18, 1, 1, "Máquina de Café", "Parada obrigatória durante as longas análises.");
  plant(53, 3); plant(76, 18);

  // ROVER BAY
  P("rover", 12, 38, 5, 4, "Modelo de Testes do Rover", "Modelo de engenharia: seis rodas, mastro de câmeras e braço robótico com instrumentos. O Opportunity tinha cerca de 1,6 m de comprimento.");
  P("roboarm", 21, 34, 3, 3, "Braço Robótico (IDD)", "Modelo do braço que posicionava APXS, Mössbauer, Microscopic Imager e RAT sobre rochas e solo.");
  P("locker", 3, 36, 1, 4, "Armários de EPI", "Roupas de sala limpa, luvas e máscaras para montagem do rover.");
  crate(3, 33, 2, 1); crate(5, 33); crate(3, 34); crate(27, 47, 2, 1);
  P("bench", 4, 45, 7, 1, "Bancada de Montagem", "Onde parafusos, chicotes e módulos eletrônicos eram integrados.");
  P("bench", 13, 46, 6, 1, "Bancada de Eletrônica", "Osciloscópios e fontes de bancada para testes de placas.");
  P("cart", 11, 44, 2, 1, "Carrinho de Ferramentas", "Chaves de torque, alicates e cabos usados na montagem.");
  P("wheelrack", 24, 46, 3, 1, "Rodas Sobressalentes", "Cada roda do rover tem cerca de 25 cm de diâmetro e é feita de alumínio.");
  P("tank", 26, 34, 2, 2, "Cilindro de Nitrogênio", "Gás pressurizado para purga e limpeza de equipamentos.");
  P("pallet", 24, 42, 2, 2, "Palete de Peças", "Painéis e componentes aguardando integração.");

  // STORAGE
  P("shelf", 42, 34, 8, 1, "Prateleiras de Armazenamento", "Peças sobressalentes, filtros e kits de instrumentos protegidos.");
  P("shelf", 42, 37, 8, 1, "Prateleiras de Componentes", "Cabos, conectores e placas de reposição, etiquetados por subsistema.");
  P("shelf", 37, 37, 2, 1, "Prateleira de Documentos", "Manuais de montagem e registros de inventário.");
  P("locker", 37, 33, 2, 1, "Armários de Segurança", "Equipamentos de proteção e extintores.");
  [38, 41, 44, 47].forEach(x => P("pallet", x, 44, 2, 2, "Palete de Suprimentos", "Caixas de peças e consumíveis empilhadas e envoltas em filme."));
  crate(38, 47, 2, 1); crate(41, 47, 2, 1); crate(46, 47, 2, 1);
  P("tank", 49, 47, 1, 1, "Barril de Reagentes", "Fluido de limpeza para componentes ópticos.");

  // POWER
  P("solar", 60, 34, 5, 3, "Painel Solar de Testes", "O Opportunity era solar. A poeira reduzia a geração, e o vento às vezes limpava os painéis.");
  P("solar", 70, 34, 5, 3, "Painel Solar de Testes", "Usado para medir a queda de eficiência com poeira simulada.");
  P("rtg", 60, 44, 2, 2, "Unidade de Demonstração RTG", "Gerador termoelétrico de radioisótopos (genérico). Curiosity e Perseverance usam RTGs; o Opportunity usava painéis solares.");
  P("rtg", 63, 44, 2, 2, "Unidade de Demonstração RTG", "Os RTGs convertem calor de decaimento radioativo em eletricidade.");
  P("battery", 70, 40, 6, 2, "Banco de Baterias", "O Opportunity usava baterias recarregáveis de íon-lítio para operar à noite e com pouca luz.");
  P("transformer", 70, 44, 3, 2, "Transformador", "Condiciona a energia dos painéis para os testes de bancada.");
  P("rack", 60, 47, 4, 1, "Rack de Controle de Energia", "Monitora tensão e corrente em todas as linhas de teste.");
  P("tank", 74, 46, 2, 2, "Cilindro de Nitrogênio", "Gás para resfriamento e purga de sistemas.");
  props.sort((a, b) => a.y + a.h - (b.y + b.h));

  // ---- Decoração de piso, placas, luzes e atalhos ----
  const floorDecals = [
    { k: "nasa", x: 9, y: 16.5, r: 1.8 }, { k: "nasa", x: 60, y: 11, r: 1.4 }, { k: "nasa", x: 40, y: 12.6, r: 1.8 },
    { k: "nasa", x: 7, y: 41, r: 1.3 }, { k: "nasa", x: 67, y: 39, r: 1.3 },
    { k: "rect", x: 3, y: 8, w: 24, h: 1, c: "rgba(77,208,255,.07)" }, { k: "rect", x: 3, y: 11, w: 24, h: 1, c: "rgba(77,208,255,.07)" },
    { k: "hazard", x: 10.4, y: 36.4, w: 8.2, h: 7.2 }, { k: "hazard", x: 69.4, y: 39.4, w: 7.2, h: 3.2 },
    { k: "lane", pts: [[14.5, 33], [14.5, 36.4]], c: "#f5c518", w: 3, dash: [8, 8] }, { k: "lane", pts: [[18.6, 41], [28, 41]], c: "#f5c518", w: 3, dash: [8, 8] },
    { k: "lane", pts: [[37, 41], [50, 41]], c: "#f5c518", w: 3, dash: [8, 8] }, { k: "lane", pts: [[59, 41], [69, 41]], c: "#f5c518", w: 3, dash: [8, 8] },
    { k: "lane", pts: [[15.5, 14], [15.5, 18]], c: "#f5c518", w: 3, dash: [8, 8] },
    { k: "cable", pts: [[61, 44], [61, 42.5], [69.2, 42.5]], c: "#c9a227" }, { k: "cable", pts: [[64, 44], [64, 43.2], [69.2, 43.2]], c: "#4dd0ff" },
    { k: "text", x: 44, y: 39.4, s: "ZONA A", c: "rgba(245,197,24,.7)" }, { k: "text", x: 14.5, y: 35.8, s: "PLATAFORMA DE TESTES", c: "rgba(245,197,24,.7)" }
  ];
  links.forEach(([x1, y1, x2, y2]) => {
    const horizontal = x2 - x1 > y2 - y1;
    floorDecals.push({ k: "lane", pts: horizontal ? [[x1 + 1.2, y1 + 2], [x2 - .2, y1 + 2]] : [[x1 + 2, y1 + 1.2], [x1 + 2, y2 - .2]], c: "rgba(77,208,255,.4)", w: 2, dash: [6, 8] });
  });
  const roomLabels = rooms.map(r => ({ text: r.tag, x: r.x1 + 1.5, y: r.y1 }));
  const decals = rooms.map(r => [r.x2 - 1.5, r.y1 + .6]);
  const doorXAtTop = new Set(doorTiles.map(([x, y]) => `${x},${y}`));
  const lights = [];
  rooms.forEach(r => { for (let x = r.x1 + 4; x <= r.x2 - 3; x += 5) if (!doorXAtTop.has(`${x},${r.y1}`) && !doorXAtTop.has(`${x + 1},${r.y1}`)) lights.push([x, r.y1]); });
  links.forEach(([x1, y1, x2, y2]) => { if (x2 - x1 > y2 - y1) lights.push([Math.round((x1 + x2) / 2) - 1, y1]); });
  const destinations = [
    { name: "Mission Control", x: 15.5, y: 16 }, { name: "Atrium", x: 40, y: 12 }, { name: "Instrument Lab", x: 60, y: 11 },
    { name: "Rover Bay", x: 7, y: 36 }, { name: "Storage", x: 44, y: 40.5 }, { name: "Power", x: 67, y: 37.5 }
  ];

  return { width: W, height: H, grid, floorMap, doors, props, rooms, roomLabels, lights, decals, floorDecals, destinations };
})();
