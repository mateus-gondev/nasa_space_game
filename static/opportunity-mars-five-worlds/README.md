# OPPORTUNITY — MARS ATLAS (5 MAPAS)

Expansão jogável da **Opportunity Map Engine V2** enviada pelo usuário, mantendo a base HTML + CSS + JavaScript + Canvas 2D (sem npm e sem dependência de Three.js). A geometria foi gerada de forma procedural e é determinística. Cada mapa tem 128 × 92 tiles (11.776 tiles por mapa), totalizando **58.880 tiles** e **53 interações com gameplay**.

> **Observação científica:** os locais são inspirados em marcos reais da trajetória do Opportunity, mas as distâncias, posições, instalações, relés e recursos coletáveis são representações fictícias para gameplay. Não se trata de mapa topográfico verdadeiro de Marte. A imagem `assets/mars-mundi-referencia.png` foi fornecida como inspiração visual do mapa-múndi.

## Iniciar

1. Extraia o ZIP.
2. Abra `index.html` em um navegador moderno. A engine não requer backend nem conexão com Internet.
3. Alternativa para desenvolvimento: `python -m http.server 8000` e acesse `http://localhost:8000`.

No projeto principal, a rota `/mars-test/` serve a exploração. O voo do foguete no laboratório leva automaticamente a `/mars-test/?world=mapa_01_pouso`, iniciando junto à nave do pacote `static/assets/marte_tilemap`. Suas passagens laterais conectam pouso, mineração e pesquisa, com retorno. O parâmetro `world` escolhe a região inicial e tem prioridade sobre o setor salvo; sem ele, a exploração retoma o setor salvo ou inicia no pouso. O progresso das descobertas é preservado.

`js/tilemap-data.js` carrega o manifesto do pacote e adapta colisões, objetos e transições. Os três PNGs compostos fornecidos são usados como cenário, com o jogador e os indicadores de interação desenhados pela engine. As cinco regiões procedurais descritas abaixo continuam disponíveis no seletor de viagem. A integração do pacote requer servir os arquivos por HTTP.

O mapa jogável ocupa toda a janela, sem cabeçalho, cartões, painéis informativos ou minimapa. A câmera se adapta à proporção da tela sem esticar o cenário. As fichas de interação aparecem ao inspecionar objetos; a pausa e a seleção de regiões abrem somente quando solicitadas. Em dispositivos de toque, os controles ficam sobre o mapa.

## Os cinco mapas

| # | Região | Atmosfera | Características | Interações |
|---|---|---|---|---|
| 01 | Meridiani Planum | Sol claro | Pouso, cratera Eagle, rochas e antenas | 10 |
| 02 | Dunas de Purgatory | Poeira | Dunas, trilhas de rodas, sensores | 11 |
| 03 | Cratera Victoria | Crepúsculo | Cratera ampla, estratos, monitor de poeira | 11 |
| 04 | Borda de Endeavour | Sol claro | Escarpas, basalto, argilas e relés | 11 |
| 05 | Perseverance Valley | Tempestade | Vale, rochas erodidas, comunicação emergencial | 10 |

## Interações

- **Análise científica:** ajuste o controle de sintonia espectral no painel até ficar perto do pico de referência e clique em **Analisar amostra**. Consome 2 pontos percentuais de energia, salva a descoberta.
- **Balizas / antenas:** aproximar e sincronizar; registra uma comunicação e avança no objetivo da região.
- **Painéis solares:** recarregue até 35 pontos percentuais de energia. Ação repetível.
- **Recursos de campo:** colete suprimentos que entram no contador de amostras.
- **Diários:** registre informações históricas inspiradas na missão real.
- **Portais de travessia:** viaje para a próxima região ao acionar o ponto de saída ou pressione `M` para escolher uma região.
- **Clima:** no mapa Perseverance, vento e poeira animados acompanham a tempestade; a movimentação consome mais energia.
- **Missão por região:** conclua 3 análises e ative ao menos 1 baliza.
- **Persistência:** descobertas, setor atual, energia, odômetro, coleta e diário são salvos em `localStorage`.

## Controles

- `WASD` ou setas — movimentar o rover.
- `E` ou espaço — inspecionar o objeto próximo.
- Clique no objeto — abrir ficha. Para executar ações, aproxime-se do objeto.
- `Esc` — fechar a interação ou o mapa de regiões; durante a exploração, abrir/fechar a pausa.
- `P` — abrir/fechar a pausa.
- `M` — abrir/fechar o mapa de regiões.
- Em celulares: controles direcionais, interação e pausa sobre o mapa.

## Estrutura

```
index.html                 Mapa em tela inteira e menus de interação
css/style.css              Tela inteira, menus e controles de toque
js/config.js               Presets visuais, câmera e velocidade
js/map-data.js             Definições e geração determinística de cinco mapas
js/map-data-lab-original.js  Cópia da planta original, preservada para referência
js/renderer.js             Renderer original estendido com solo e props marcianos
js/controls.js             Teclas e controles mobile
js/engine.js               Navegação, colisão, troca de mundo e energia
js/app.js                  Câmera responsiva, ações, menus e persistência
tests/worlds.test.cjs       Validação de mapas, rotas e pontos acessíveis
tests/renderer.test.cjs     Smoke test do renderer com contexto Canvas simulado
assets/mars-mundi-referencia.png  Imagem de referência fornecida
```

### API pública

```js
opportunityMap.goToWorld('victoria');
opportunityMap.goToRoom('Setor norte');
opportunityMap.setAtmosphere('storm');
opportunityMap.getWorld();
opportunityMap.getProgress();
opportunityMap.openAtlas();
opportunityMap.engine.energy;
opportunityMap.inspect('Ponto Duck Bay');
```

As chamadas existentes de `pause`, `resume`, `reset`, `inspect`, `addProp`, `loadAsset`, `setAtmosphere` e `goToRoom` foram mantidas, com adaptações para os mundos.

### Criar outros mundos

No arquivo `js/map-data.js`, edite a estrutura de `defs`:

- `spawn`: ponto inicial `[x,y]`.
- `palette`: sete cores de terreno.
- `craters`: `[x,y,raio]`.
- `ridges`: `[x,y,raioX,raioY]`.
- `points`: `[type,x,y,w,h,name,description,action]`.
- `weather`: preset de atmosfera.
- `seed`: variação determinística do terreno.

Tipos especiais de `action`: `scan`, `beacon`, `charge`, `collect`, `log`, `travel:ID_DO_MAPA`.

## Testes

Instale Node.js para executar (nenhum pacote adicional necessário):

```bash
node tests/worlds.test.cjs
node tests/renderer.test.cjs
```

**Validação realizada:** os cinco mapas geram estruturas corretas; todas as áreas de início, pontos de interesse e saídas estão acessíveis pela grade; todas as ações `travel:` apontam para mapas existentes; o renderer concluiu smoke tests para os cinco mundos. A validação visual interativa em navegador precisa ser realizada na máquina do usuário.

## Escolhas de desempenho

- Gerador de terreno com seed, sem PNGs obrigatórios.
- `MapRenderer` reutilizado; apenas o mapa atual é renderizado, sem cinco canvases grandes simultâneos.
- O canvas de cache do mapa anterior é liberado na troca de região.
- 128 × 92 tiles por região, com tile visual de 32 pixels.
- Marcadores e props são desenhados apenas quando visíveis; o solo é pré-renderizado.

Se for necessário oferecer mapas ainda maiores para smartphones de entrada, o próximo passo recomendado é trocar o canvas único do terreno por **cache de chunks**, preservando a API do mapa.
