import { $, S, K, B, DEF } from './state.js';
import { startLoop, setCutscene, clearCutscene } from './render.js';

let audioContext;

function beep(frequency = 520, duration = .08) {
  try {
    audioContext = audioContext || new AudioContext();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.frequency.value = frequency;
    gain.gain.value = .04;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // Ignora falhas de áudio em navegadores restritivos.
  }
}

function bindKeyboardInput() {
  addEventListener('keydown', (event) => {
    K[event.code] = 1;

    if (event.code === 'Space' || event.code === 'Enter' || event.code === 'KeyE') {
      event.preventDefault();
      act();
    }
  });

  addEventListener('keyup', (event) => {
    K[event.code] = 0;
  });
}

function bindDirectionalButtons() {
  [['L'], ['R']].forEach(([key]) => {
    const button = $('#' + key);
    button.onpointerdown = () => {
      B[key] = 1;
    };
    button.onpointerup = button.onpointerleave = () => {
      B[key] = 0;
    };
  });
}

let dialogQueue = [];
let dialogCallback = null;

function say(lines, onFinish) {
  dialogQueue = lines.slice();
  dialogCallback = onFinish;
  S.talk = true;
  $('#say').style.display = 'block';
  advanceDialog();
}

function advanceDialog() {
  if (!dialogQueue.length) {
    $('#say').style.display = 'none';
    S.talk = false;

    const callback = dialogCallback;
    dialogCallback = null;
    callback && callback();
    return;
  }

  $('#st').textContent = dialogQueue.shift();
}

function showCard(subtitle, title, duration, onFinish) {
  const cardElement = $('#card');
  cardElement.innerHTML = `<small>${subtitle}</small><h2>${title}</h2>`;
  cardElement.classList.add('on');

  setTimeout(() => {
    cardElement.classList.remove('on');
    setTimeout(() => onFinish && onFinish(), 800);
  }, duration);
}

function showToast(message) {
  const toastElement = $('#toast');
  toastElement.textContent = message;
  toastElement.style.opacity = 1;
  setTimeout(() => toastElement.style.opacity = 0, 4200);
}

function showProgress(durationMs, label, onFinish, stopAt = 100) {
  beep(660);

  const progressPanel = $('#prog');
  $('#pt').textContent = label;
  progressPanel.style.display = 'block';

  const startTime = performance.now();

  (function updateProgress() {
    const progressRatio = Math.min(1, (performance.now() - startTime) / durationMs);
    $('#pf').style.width = progressRatio * stopAt + '%';

    if (progressRatio < 1) {
      requestAnimationFrame(updateProgress);
      return;
    }

    if (stopAt >= 100) {
      progressPanel.style.display = 'none';
    }

    onFinish && onFinish();
  })();
}

function toggleHud(enabled) {
  $('#hud').style.display = enabled ? 'flex' : 'none';
  $('#ctl').style.display = enabled ? 'flex' : 'none';

  ['hM', 'hL', 'hS', 'hE', 'hC'].forEach((elementId) => {
    $('#' + elementId).style.visibility = 'visible';
  });
}

function setScene(sceneData) {
  Object.assign(S, DEF(), sceneData);
  toggleHud(!sceneData.nohud);
}

function act() {
  if (S.talk) {
    advanceDialog();
    return;
  }

  if (S.busy || S.mgOpen || S.mode !== 'drive') {
    return;
  }

  if (S.special) {
    S.special.fn();
    return;
  }

  const currentTarget = S.obj && S.obj[S.oi];

  if (!currentTarget || Math.abs(S.x - currentTarget.x) >= 60) {
    return;
  }

  S.busy = true;
  currentTarget.pre && currentTarget.pre();

  const finishInteraction = () => {
    currentTarget.post && currentTarget.post();
    S.busy = false;
    S.oi += 1;

    if (S.oi >= S.obj.length) {
      S.obj = null;
      S.onObj();
    }
  };

  const runInteraction = () => {
    if (currentTarget.cs) {
      cutscene(currentTarget.cs, currentTarget.lines, finishInteraction);
      return;
    }

    say(currentTarget.lines, finishInteraction);
  };

  if (currentTarget.mg) {
    currentTarget.mg(runInteraction);
    return;
  }

  showProgress(1400, 'Analisando / transmitindo…', runInteraction);
}

function startChapter(chapterIndex) {
  dialogQueue = [];
  dialogCallback = null;
  S.talk = false;
  $('#say').style.display = 'none';
  $('#prog').style.display = 'none';
  $('#pw').style.display = 'none';
  $('#lost').style.display = 'none';
  $('#title').classList.remove('on');

  const chapter = CH[chapterIndex];
  S.ch = chapterIndex;
  $('#black').classList.toggle('on', chapterIndex === 0 || chapterIndex === 8);

  showCard(
    'CAPÍTULO ' + (chapterIndex < 8 ? chapterIndex + 1 : 'FINAL') + ' · ' + chapter.date,
    chapter.title,
    3000,
    () => chapter.run()
  );
}

function enterStormSequence(isFatal, onComplete) {
  S.locked = true;
  S.special = null;

  cutscene('storm', ['O céu vermelho torna-se mais escuro. A produção de energia diminui a cada dia.'], () => {
    S.goal = 'Economize energia';
    S.special = {
      label: 'Ativar modo de segurança',
      fn: () => {
        S.special = null;
        S.goal = '';
        runSafetyMode(isFatal, onComplete);
      },
    };
  });
}

function runSafetyMode(isFatal, onComplete) {
  $('#pw').style.display = 'block';
  const initialSol = S.sol;
  const totalTicks = 70;
  let currentTick = 0;

  const intervalId = setInterval(() => {
    currentTick += 1;
    const progressRatio = currentTick / totalTicks;
    const safetyCurve = isFatal ? Math.min(1, progressRatio * 1.25) : Math.sin(progressRatio * Math.PI);

    S.dust = isFatal ? Math.min(.9, progressRatio * 1.2) : .85 * safetyCurve;
    S.energy = isFatal ? Math.max(5, 100 - 95 * safetyCurve) : 100 - 92 * safetyCurve;
    S.sol = initialSol + currentTick * 2;

    if (currentTick < totalTicks) {
      return;
    }

    clearInterval(intervalId);
    $('#pw').style.display = 'none';

    if (isFatal) {
      $('#black').classList.add('on');
      setTimeout(() => startChapter(7), 1800);
      return;
    }

    S.energy = 70;
    say([
      '“Os níveis estão melhorando. Vamos retomar as operações.”',
      'O Opportunity sobrevive. Mas o fim pode chegar mesmo quando não se comete nenhum erro.',
    ], () => {
      S.dust = 0;
      S.locked = false;
      onComplete();
    });
  }, 110);
}

function cutscene(sceneName, lines, onFinish) {
  setCutscene(sceneName);
  $('#cs').classList.add('on');

  say(lines, () => {
    clearCutscene();
    $('#cs').classList.remove('on');
    setTimeout(() => onFinish && onFinish(), 600);
  });
}

$('#cs').onclick = () => advanceDialog();

const missionStats = {
  fotos: 0,
  amostras: 0,
  rotas: 0,
  energia: 0,
};

const query = (root, selector) => root.querySelector(selector);

function openModal(contentMarkup, setupCallback) {
  const modal = $('#mg');
  modal.innerHTML = '<div style="max-width:520px;width:100%;background:#000e;border:1px solid #5a3a2a;padding:16px;font:13px ui-monospace,monospace;text-align:left;max-height:90%;overflow:auto">' + contentMarkup + '</div>';
  modal.classList.add('on');
  S.mgOpen = true;
  setupCallback(modal);
}

function closeModal(onFinish) {
  $('#mg').classList.remove('on');
  S.mgOpen = false;
  setTimeout(() => onFinish && onFinish(), 500);
}

$('#arq').onclick = () => {
  if (S.mgOpen || S.talk) {
    return;
  }

  openModal(`<b>ARQUIVO DA MISSÃO</b><p>Panoramas: ${missionStats.fotos}<br>Amostras analisadas: ${missionStats.amostras}<br>Rotas planejadas: ${missionStats.rotas}<br>Sols planejados: ${missionStats.energia}</p><button id="ax">Fechar</button>`, (modal) => {
    query(modal, '#ax').onclick = () => closeModal();
  });
};

function showPancam(onFinish, filterName, [minAngle, maxAngle]) {
  let currentAngle = 45;
  const capturedFrames = [];
  let activeFilter = 'Visível';

  openModal(`<b>PANCAM</b><p>“Precisamos de um panorama. Documente a região tracejada (${minAngle}°–${maxAngle}°) com o filtro <u>${filterName}</u>, sobrepondo ≥30% entre as imagens.”</p><div id="pv" style="position:relative;height:50px;background:#2a1a12;margin:8px 0"></div>Orientação <b id="pa">45°</b> <input id="pr" type="range" min="0" max="90" value="45" style="width:55%"><br>Filtro: <button data-f="Visível">Visível</button><button data-f="Infravermelho próximo">IR próximo</button><p id="pm"></p><button id="pc">Capturar imagem</button><button id="pd">Montar panorama</button>`, (modal) => {
    const viewport = query(modal, '#pv');
    const showMessage = (text) => {
      query(modal, '#pm').textContent = text;
    };

    const redraw = () => {
      viewport.innerHTML = `<div style="position:absolute;left:${minAngle / .9}%;width:${(maxAngle - minAngle) / .9}%;top:0;bottom:0;border:2px dashed #ffd9b8"></div>` + capturedFrames.map((frame) => `<div style="position:absolute;left:${(frame - 15) / .9}%;width:${30 / .9}%;top:10px;bottom:10px;background:#e0763f66"></div>`).join('') + `<div style="position:absolute;left:${currentAngle / .9}%;top:0;bottom:0;width:2px;background:#7fe0a8"></div>`;
    };

    redraw();

    query(modal, '#pr').oninput = (event) => {
      currentAngle = +event.target.value;
      query(modal, '#pa').textContent = currentAngle + '°';
      redraw();
    };

    modal.querySelectorAll('[data-f]').forEach((button) => {
      button.onclick = () => {
        activeFilter = button.dataset.f;
        showMessage('Filtro: ' + activeFilter);
      };
    });

    query(modal, '#pc').onclick = () => {
      if (activeFilter !== filterName) {
        S.energy = Math.max(40, S.energy - 4);
        showMessage('Filtro inadequado: imagem descartada (gasto de energia).');
        return;
      }

      capturedFrames.push(currentAngle);
      beep(700, .05);
      redraw();
    };

    query(modal, '#pd').onclick = () => {
      const sortedAngles = [...capturedFrames].sort((left, right) => left - right);
      const isComplete = sortedAngles.length && sortedAngles[0] - 15 <= minAngle && sortedAngles[sortedAngles.length - 1] + 15 >= maxAngle && sortedAngles.every((angle, index) => !index || angle - sortedAngles[index - 1] <= 21);

      if (isComplete) {
        missionStats.fotos += 1;
        closeModal(onFinish);
        return;
      }

      showMessage('Panorama incompleto ou com pouca sobreposição. Recapture.');
      capturedFrames.length = 0;
      redraw();
    };
  });
}

function showApxs(onFinish) {
  const elements = ['Silício', 'Enxofre', 'Cálcio', 'Ferro'];
  const energyLabels = ['1,7', '2,3', '3,7', '6,4'];
  const values = elements.map(() => 15 + Math.random() * 25 | 0);
  const selectedElements = new Set();

  const targetPeaks = [0, 1, 2, 3].sort(() => Math.random() - .5).slice(0, 2);
  targetPeaks.forEach((index) => values[index] += 45);

  openModal(`<b>APXS — RESULTADO DA AMOSTRA</b><p>“Esta rocha apresenta elementos compatíveis com nossa hipótese?” Identifique os dois picos mais intensos.<br><small>Referência da equipe: Si≈1,7 · S≈2,3 · Ca≈3,7 · Fe≈6,4 keV</small></p><div style="display:flex;gap:10px;align-items:flex-end;height:120px">${values.map((value, index) => `<div style="flex:1;text-align:center"><div style="height:${value * 1.5}px;background:#e0763f"></div>${energyLabels[index]} keV</div>`).join('')}</div><p>${elements.map((element) => `<button data-e="${element}">${element}</button>`).join('')}</p><p id="am"></p><button id="ac">Confirmar</button><br><small>Espectro ilustrativo e não calibrado. Um elemento isolado não prova água: a equipe cruza evidências químicas, mineralógicas e geológicas.</small>`, (modal) => {
    modal.querySelectorAll('[data-e]').forEach((button) => {
      button.onclick = () => {
        const elementName = button.dataset.e;

        if (selectedElements.has(elementName)) {
          selectedElements.delete(elementName);
        } else {
          selectedElements.add(elementName);
        }

        button.style.background = selectedElements.has(elementName) ? '#e0763f' : '';
      };
    });

    query(modal, '#ac').onclick = () => {
      const guessIsCorrect = selectedElements.size === 2 && targetPeaks.every((index) => selectedElements.has(elements[index]));

      if (guessIsCorrect) {
        missionStats.amostras += 1;
        closeModal(onFinish);
        return;
      }

      query(modal, '#am').textContent = 'Não confere. Compare a altura dos picos com as energias de referência.';
    };
  });
}

function planRoute(onFinish) {
  const grid = ['S..~..', '.#~~#.', '...~..', '~#...F', '...#..'].map((row) => [...row]);
  const path = [[0, 0]];
  const cellCost = (cell) => (cell === '~' ? 3 : 1);
  const distances = grid.map((row) => row.map(() => 99));
  distances[0][0] = 0;

  for (let iteration = 0; iteration < 40; iteration += 1) {
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === '#' || (!y && !x)) {
          return;
        }

        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const neighborDistance = distances[y + dy]?.[x + dx];

          if (neighborDistance !== undefined && neighborDistance + cellCost(cell) < distances[y][x]) {
            distances[y][x] = neighborDistance + cellCost(cell);
          }
        });
      });
    });
  }

  const bestRouteCost = distances[3][5];

  openModal(`<b>PLANEJAMENTO DE ROTA</b><p>Construa a rota de S até F tocando casas vizinhas (toque numa casa da rota para voltar). ≈ areia fofa (custo 3) · ▲ rocha (bloqueada).</p><div id="rg" style="display:grid;grid-template-columns:repeat(6,1fr);gap:3px"></div><p id="rm"></p><button id="rx">Executar</button><button id="rr">Reiniciar</button>`, (modal) => {
    const boardElement = query(modal, '#rg');
    const findPathIndex = (x, y) => path.findIndex(([px, py]) => px === x && py === y);
    const calculateRouteCost = () => path.slice(1).reduce((sum, [x, y]) => sum + cellCost(grid[y][x]), 0);

    const redrawBoard = () => {
      boardElement.innerHTML = grid.map((row, y) => row.map((cell, x) => `<div class="rc" data-x="${x}" data-y="${y}" style="${findPathIndex(x, y) >= 0 ? 'background:#2d6a4f' : cell === '~' ? 'background:#a8794f' : cell === '#' ? 'background:#2a1a12' : ''}">${cell === '~' ? '≈' : cell === '#' ? '▲' : cell === '.' ? '·' : cell}</div>`).join('')).join('');
      query(modal, '#rm').textContent = 'Custo estimado: ' + calculateRouteCost();
    };

    redrawBoard();

    boardElement.onclick = (event) => {
      const tile = event.target.closest('.rc');
      if (!tile) {
        return;
      }

      const x = +tile.dataset.x;
      const y = +tile.dataset.y;
      const index = findPathIndex(x, y);
      const lastCell = path[path.length - 1];

      if (index >= 0) {
        path.length = index + 1;
      } else if (grid[y][x] !== '#' && Math.abs(x - lastCell[0]) + Math.abs(y - lastCell[1]) === 1) {
        path.push([x, y]);
      }

      redrawBoard();
    };

    query(modal, '#rr').onclick = () => {
      path.length = 1;
      redrawBoard();
    };

    query(modal, '#rx').onclick = () => {
      const lastCell = path[path.length - 1];

      if (grid[lastCell[1]][lastCell[0]] !== 'F') {
        query(modal, '#rm').textContent = 'A rota precisa chegar à bandeira F.';
        return;
      }

      missionStats.rotas += 1;
      const currentRouteCost = calculateRouteCost();

      closeModal(() => {
        showToast(currentRouteCost <= bestRouteCost + 1 ? 'Rota eficiente: pouco desgaste das rodas.' : 'Rota longa ou custosa: mais desgaste e energia gastos.');
        onFinish();
      });
    };
  });
}

function recoverFromDune(onFinish) {
  let progressValue = 0;
  let attemptCount = 0;
  let cooldown = 0;

  openModal(`<b>PURGATORY DUNE — RECUPERAÇÃO</b><p>Rodar as rodas não significa avançar. Tentativas agressivas pioram o atolamento; movimentos curtos e suaves acumulam progresso.</p>Progresso real<div class="bar"><i id="d1"></i></div>Giro das rodas<div class="bar"><i id="d2"></i></div>Intensidade <b id="dv">3</b> <input id="di" type="range" min="1" max="10" value="3" style="width:50%"><p id="dm"></p><button id="dg">Executar tentativa</button>`, (modal) => {
    query(modal, '#di').oninput = (event) => {
      query(modal, '#dv').textContent = event.target.value;
    };

    query(modal, '#dg').onclick = () => {
      if (cooldown) {
        return;
      }

      cooldown = 1;
      setTimeout(() => cooldown = 0, 700);

      const intensity = +query(modal, '#di').value;
      const slipFactor = intensity <= 4 ? .15 : intensity <= 7 ? .55 : .9;
      const progressGain = intensity <= 4 ? 22 : intensity <= 7 ? 12 : 4;

      attemptCount += 1;
      S.sol += 4;
      beep(200, .25);
      progressValue = Math.max(0, progressValue + progressGain * (1 - slipFactor) - (intensity >= 8 ? 3 : 0));

      query(modal, '#d1').style.width = Math.min(100, progressValue) + '%';
      query(modal, '#d2').style.width = intensity * 10 + '%';
      query(modal, '#dm').textContent = `Tentativa ${attemptCount}: derrapagem ${slipFactor * 100 | 0}%` + (intensity >= 8 ? ' — o rover afundou um pouco.' : '');

      if (progressValue >= 100) {
        setTimeout(() => closeModal(onFinish), 600);
      }
    };
  });
}

function planEnergyBudget(onFinish) {
  const operations = [
    ['Fotografia panorâmica', 10],
    ['Deslocamento curto', 25],
    ['Operação do braço', 15],
    ['Análise científica', 20],
    ['Comunicações', 10],
  ];
  const budget = 60;
  const selectedOperations = new Set();

  openModal(`<b>PLANEJAR UM SOL</b><p>A poeira reduz a geração de energia. Orçamento deste sol: <b>${budget}</b> unidades. Escolha as operações.</p><p>${operations.map((operation, index) => `<button data-o="${index}">${operation[0]} (${operation[1]})</button>`).join('')}</p><p id="em">Total: 0 / ${budget}</p><button id="ec">Confirmar plano</button>`, (modal) => {
    const getTotalCost = () => [...selectedOperations].reduce((sum, index) => sum + operations[index][1], 0);

    modal.querySelectorAll('[data-o]').forEach((button) => {
      button.onclick = () => {
        const index = +button.dataset.o;

        if (selectedOperations.has(index)) {
          selectedOperations.delete(index);
        } else {
          selectedOperations.add(index);
        }

        button.style.background = selectedOperations.has(index) ? '#e0763f' : '';
        query(modal, '#em').textContent = `Total: ${getTotalCost()} / ${budget}`;
      };
    });

    query(modal, '#ec').onclick = () => {
      if (getTotalCost() > budget) {
        query(modal, '#em').textContent = 'Acima do orçamento de energia.';
        return;
      }

      if (!selectedOperations.has(4)) {
        query(modal, '#em').textContent = 'Inclua Comunicações: sem telemetria a equipe não planeja o próximo sol.';
        return;
      }

      missionStats.energia += 1;
      closeModal(onFinish);
    };
  });
}

const CH = [
  {
    date: '7 DE JULHO DE 2003 · TERRA',
    title: 'Uma viagem sem volta',
    run() {
      setScene({ mode: 'black', nohud: true, pal: 0 });
      $('#black').innerHTML = '<div style="width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,#6a8cc0,#10182a 70%);box-shadow:0 0 40px #345;animation:p 3s infinite alternate"></div><style>@keyframes p{to{transform:scale(1.25)}}</style>';

      cutscene('lab', [
        '[ruídos de rádio… vozes distantes… comandos de engenheiros]',
        'Uma instalação da NASA. No centro da sala, o Opportunity é preparado para o lançamento. Técnicos, testes de instrumentos, componentes sendo instalados.',
        '“Nossa missão é encontrar evidências de que Marte já teve água. Temos 90 dias para descobrir o máximo possível.”',
        'A câmera se aproxima da lente do Opportunity.',
      ], () => cutscene('launch', [
        'Plataforma de lançamento. Contagem regressiva: 3… 2… 1…',
        'O foguete sobe e desaparece nas nuvens.',
      ], () => {
        $('#black').innerHTML = '';
        showCard('OPPORTUNITY', 'Uma jornada de 90 dias.', 3200, () => startChapter(1));
      }));
    },
  },
  {
    date: '25 JAN 2004 · MARTE · SOL 1',
    title: 'Olá, Marte',
    run() {
      setScene({ sol: 1, loc: 'Cratera Eagle', max: 1500 });
      say([
        'Sistemas despertando. Energia estável. Comunicação estabelecida.',
        'Mova o rover com ← →. Fotografe o horizonte e aproxime-se do afloramento rochoso.',
      ], () => {
        S.obj = [{
          x: 140,
          label: 'Fotografar o horizonte',
          mg: (next) => showPancam(next, 'Visível', [40, 80]),
          cs: 'earth',
          lines: [
            'Imagens transmitidas após o atraso de comunicação.',
            '“Opportunity, recebemos suas imagens. Bem-vindo a Marte.” (diálogo dramatizado, não transcrição histórica)',
          ],
        }, {
          x: 1100,
          label: 'Analisar afloramento',
          lines: [
            'Primeira análise científica iniciada.',
            'Não existem inimigos. Não existe pressa. Apenas um deserto silencioso e um pequeno robô.',
          ],
        }];

        S.onObj = () => startChapter(2);
      });
    },
  },
  {
    date: '2004 · SOLS 10–90',
    title: 'A memória da água',
    run() {
      setScene({ sol: 10, loc: 'Planície de Meridiani', max: 2300 });
      say(['Tarefas científicas: investigue rochas, fotografe formações e transmita os resultados.'], () => {
        S.obj = [{
          x: 350,
          label: 'Investigar rocha',
          mg: showApxs,
          lines: ['Camadas finas e regulares. Algo incomum.'],
          post: () => S.sol = 40,
        }, {
          x: 1050,
          label: 'Investigar rocha',
          mg: showApxs,
          cs: 'water',
          lines: [
            '“Essas rochas… elas contam uma história.”',
            '“Há muito tempo, este lugar era diferente.”',
          ],
          pre: () => S.vis = 1,
          post: () => {
            S.vis = 0;
            S.sol = 70;
          },
        }, {
          x: 1900,
          label: 'Análise final',
          mg: showApxs,
          lines: [
            'Esférulas e minerais indicam antigos ambientes com água líquida.',
            '(A visualização anterior foi uma reconstrução artística da hipótese estudada, não uma certeza científica.)',
          ],
          post: () => S.sol = 90,
        }];

        S.onObj = () => {
          showCard('SOL 090', 'MISSÃO PRIMÁRIA CONCLUÍDA', 3200, () => {
            say([
              'Todos os objetivos científicos essenciais foram cumpridos. Aguardando novas instruções da Terra…',
              'O céu começa a clarear. O painel solar volta a gerar energia.',
              '“Opportunity, seus sistemas continuam funcionando. Temos novos lugares para explorar.”',
            ], () => {
              showCard('SOL 091', 'MISSÃO ESTENDIDA', 3000, () => startChapter(3));
            });
          });
        };
      });
    },
  },
  {
    date: '2004–2005 · PURGATORY DUNE',
    title: 'Purgatório',
    run() {
      setScene({ sol: 440, loc: 'Cratera Endurance → Purgatory Dune', max: 2300, trap: 1250, pal: 2 });
      planRoute(() => say(['As rodas já apresentam limitações mecânicas. A rota está traçada; siga com cuidado. A região parece firme.'], () => {}));

      S.stuck = () => {
        S.locked = true;
        S.sink = 5;

        cutscene('dune', ['DESLIZAMENTO EXCESSIVO DETECTADO.', 'As rodas giram, mas o Opportunity quase não se move. O controle direto foi bloqueado.', 'Na Terra, engenheiros testam movimentos. Execute a nova sequência com cuidado: um comando por vez.'], () => {
          S.special = {
            label: 'Abrir controle de recuperação',
            fn: () => {
              if (S.mgOpen) {
                return;
              }

              S.special = null;
              recoverFromDune(() => {
                S.special = null;
                S.sink = 0;
                say([
                  'Sem música triunfal. Apenas o som de uma roda voltando a avançar.',
                  '“Movimento confirmado. Estamos livres.”',
                ], () => {
                  S.locked = false;
                  S.spd = 1.3;
                  S.exitAt = 2200;
                  S.exitFn = () => startChapter(4);
                  S.goal = 'Siga em frente, agora mais lento';
                });
              });
            },
          };
        });
      };
    },
  },
  {
    date: '2006–2007 · CRATERA VICTORIA',
    title: 'Quando o Sol desaparece',
    run() {
      setScene({ sol: 1100, loc: 'Cratera Victoria', max: 1500, pal: 1 });
      say(['Uma das paisagens mais impressionantes da missão. Caminhe pela borda e fotografe o terreno.'], () => {
        S.obj = [{
          x: 1200,
          label: 'Fotografar a cratera',
          lines: ['A cratera Victoria se abre diante do rover. A sensação é de conquista.'],
        }];

        S.onObj = () => {
          S.sol = 1250;
          planEnergyBudget(() => enterStormSequence(false, () => startChapter(5)));
        };
      });
    },
  },
  {
    date: '2008–2015 · A LONGA TRAVESSIA',
    title: 'Os anos passam',
    run() {
      setScene({ sol: 1300, loc: 'Rumo a Endeavour', max: 7000, spd: 4, pal: 1 });
      say(['O capítulo mais contemplativo. Deixe os anos passarem: siga em direção à cratera Endeavour.'], () => {
        S.goal = '→ siga em frente';
      });
    },
  },
  {
    date: '2017–2018 · VALE DA PERSEVERANÇA',
    title: 'Perseverance Valley',
    run() {
      setScene({ sol: 4700, loc: 'Vale da Perseverança', max: 2600, spd: 1.8, pal: 2 });
      say([
        'Agora o Opportunity está velho. Histórico de reparos e adaptações feitos pela equipe na Terra. Ainda funciona, mas os anos deixaram marcas.',
        'Nova missão: explorar o Vale da Perseverança, na borda da cratera Endeavour.',
      ], () => {
        S.obj = [{
          x: 600,
          label: 'Fotografar o horizonte',
          mg: (next) => showPancam(next, 'Infravermelho próximo', [30, 75]),
          lines: ['O ambiente é imenso. Pela primeira vez em muito tempo, a exploração parece tranquila.'],
        }, {
          x: 1700,
          label: 'Investigar rochas',
          mg: showApxs,
          lines: ['Pequenas partículas cruzam o campo de visão. Nada preocupante, a princípio.'],
        }];

        S.onObj = () => cutscene('storm', [
          'A central recebe a previsão de uma enorme tempestade.',
          'Instruções da Terra: interromper atividades e economizar energia.',
        ], () => {
          S.sol = 5090;
          enterStormSequence(true);
        });
      });
    },
  },
  {
    date: '10 DE JUNHO DE 2018 · SOL 5111',
    title: 'Está ficando escuro',
    run() {
      setScene({ sol: 5111, loc: 'Vale da Perseverança', max: 0, dust: .93, energy: 4, pal: 2, locked: true });
      $('#hc').textContent = 'Instável';

      say([
        'Um céu quase completamente escuro. Os painéis recebem pouquíssima luz. Os instrumentos científicos já estão desligados.',
        'Última tarefa: fotografar o Sol e transmitir os dados.',
      ], () => {
        S.special = {
          label: 'Fotografar o Sol',
          fn: () => {
            S.special = null;
            showProgress(2200, 'Apontando câmera…', () => say(['Não há Sol visível. Apenas uma atmosfera coberta de poeira.'], () => {
              S.special = {
                label: 'Transmitir dados',
                fn: () => {
                  S.special = null;
                  showProgress(3500, 'TRANSMISSÃO DE IMAGEM — transferindo dados científicos…', () => {
                    $('#lost').style.display = 'block';
                    beep(120, .6);

                    ['hC', 'hE', 'hS', 'hL', 'hM'].forEach((id, index) => setTimeout(() => $('#'+id).style.visibility = 'hidden', 2000 + index * 1400));

                    setTimeout(() => {
                      $('#prog').style.display = 'none';
                      $('#lost').style.display = 'none';
                      $('#ctl').style.display = 'none';
                      $('#goal').textContent = '';
                      $('#black').classList.add('on');
                    }, 9000);

                    setTimeout(() => startChapter(8), 11500);
                  }, 64);
                },
              };
            }));
          },
        };
      });
    },
  },
  {
    date: 'FEVEREIRO DE 2019 · TERRA',
    title: 'Alguém ainda está ouvindo?',
    run() {
      setScene({ mode: 'term', nohud: true });
      $('#goal').textContent = '';

      const terminal = $('#tt');
      const button = $('#tb');

      terminal.innerHTML = '<p>CENTRO DE OPERAÇÕES — NASA<br>Oito meses desde a última comunicação.<br>A tempestade já terminou. O rover não respondeu.<br>Histórico: tentativas de recuperação sem resposta…</p>';
      $('#term').classList.add('on');
      button.style.display = 'inline-block';
      button.disabled = false;

      button.onclick = () => {
        button.disabled = true;
        beep(440, .3);
        terminal.innerHTML += '<p>DEEP SPACE NETWORK<br>DESTINO: MARS EXPLORATION ROVER B<br>Comando enviado<br>Aguardando resposta…</p>';

        setTimeout(() => {
          terminal.innerHTML += '<p style="color:#f77">NENHUM SINAL RECEBIDO</p>';
        }, 4200);

        setTimeout(() => {
          button.style.display = 'none';
          cutscene('dish', [
            'A equipe permanece em silêncio diante dos monitores.',
            '(narração ficcional) “Nós enviamos uma máquina para procurar respostas sobre o passado de Marte.”',
            '“Esperávamos que ela trabalhasse durante três meses. Ela continuou por quase quinze anos.”',
            '“E, em cada quilômetro percorrido, nos mostrou um pouco mais de um mundo que antes conhecíamos apenas de longe.”',
          ], finishGame);
        }, 7500);
      };
    },
  },
];

function finishGame() {
  $('#term').classList.remove('on');
  $('#black').classList.remove('on');

  Object.assign(S, { mode: 'end', x: 0, dust: .05, pal: 1, t0: performance.now(), sink: 0 });

  setTimeout(() => {
    const cardElement = $('#card');
    cardElement.innerHTML = '<small>2004 — 2018</small><h2>OPPORTUNITY</h2><p>90 dias planejados.<br>Mais de 5.000 dias marcianos de exploração.<br>45,16 quilômetros percorridos.</p><p><i>Algumas jornadas continuam importantes mesmo depois de terminarem.</i></p><button onclick="location.reload()">JOGAR NOVAMENTE</button>';
    cardElement.classList.add('on');
  }, 11000);
}

function updateGame(dt) {
  if (S.mode !== 'drive') {
    return;
  }

  const direction = (K.ArrowRight || K.KeyD || B.R ? 1 : 0) - (K.ArrowLeft || K.KeyA || B.L ? 1 : 0);

  if (direction && !S.locked && !S.talk && !S.busy && !S.mgOpen) {
    S.x = Math.max(0, Math.min(S.max, S.x + direction * S.spd * dt / 16));
  }

  if (S.trap && S.x > S.trap) {
    S.trap = 0;
    S.stuck();
  }

  if (S.exitAt && S.x > S.exitAt) {
    S.exitAt = 0;
    S.exitFn();
  }

  if (S.ch === 5) {
    const year = 2008 + S.x / 7000 * 7.4;
    S.sol = Math.round((year - 2004.07) * 355.4);
    S.loc = (year < 2011.6 ? 'Rumo a Endeavour' : 'Borda de Endeavour') + ' · ' + (year | 0);

    if (S.x > 900 && !S.f1) {
      S.f1 = 1;
      showToast('Alguns comandos levam mais tempo. A equipe preserva componentes antigos.');
    }

    if (S.x > 2200 && !S.f2) {
      S.f2 = 1;
      S.locked = true;
      cutscene('spirit', [
        'Sala de controle da NASA. Uma engenheira observa os últimos registros do Spirit, o irmão gêmeo do Opportunity.',
        'Os dois partiram para Marte quase juntos. Agora, só um deles continua trabalhando.',
      ], () => S.locked = false);
    }

    if (S.x >= 6950 && !S.f3) {
      S.f3 = 1;
      S.locked = true;
      S.goal = '';
      showCard('UMA MARATONA PERCORRIDA EM MARTE · 2015', '42,195 km', 4500, () => startChapter(6));
    }
  }

  const currentTarget = S.obj && S.obj[S.oi];
  const isNearObjective = currentTarget && Math.abs(S.x - currentTarget.x) < 60;

  if (currentTarget && !S.talk && !S.busy) {
    S.goal = (isNearObjective ? '● ' : S.x < currentTarget.x ? '→ ' : '← ') + currentTarget.label;
  }

  $('#goal').textContent = S.talk || S.busy ? '' : S.goal;

  let actionLabel = null;
  if (!S.talk && !S.busy) {
    if (S.special) {
      actionLabel = S.special.label;
    } else if (isNearObjective) {
      actionLabel = currentTarget.label;
    }
  }

  const actionButton = $('#act');
  actionButton.disabled = !actionLabel;

  if (actionButton.textContent !== (actionLabel || '—')) {
    actionButton.textContent = actionLabel || '—';
  }

  $('#hl').textContent = S.loc;
  $('#hs').textContent = 'SOL ' + String(S.sol).padStart(4, '0');
  $('#he').textContent = S.energy > 66 ? 'Estável' : S.energy > 25 ? 'Baixa' : 'CRÍTICA';

  const energyBar = $('#ef');
  energyBar.style.width = S.energy + '%';
  energyBar.style.background = S.energy > 25 ? '#7fe0a8' : '#f55';
}

bindKeyboardInput();
bindDirectionalButtons();
$('#act').onclick = () => act();
$('#say').onclick = advanceDialog;
$('#go').onclick = () => startChapter(0);

for (let chapterNumber = 0; chapterNumber < 9; chapterNumber += 1) {
  const chapterButton = document.createElement('button');
  chapterButton.textContent = chapterNumber < 8 ? chapterNumber + 1 : 'Ep';
  chapterButton.onclick = () => startChapter(chapterNumber);
  $('#jump').appendChild(chapterButton);
}

startLoop(updateGame);