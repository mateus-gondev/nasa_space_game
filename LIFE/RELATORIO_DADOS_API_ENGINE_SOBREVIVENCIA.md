# Relatório: dados de API para a engine de sobrevivência

**Data:** 14/11/2026  
**Escopo:** dados e pipeline em `LIFE/data-pipeline/repo`, integração com `LIFE/engine.js` e o cenário inicial `LIFE/scenario-mars.json`.

## Resumo executivo

O projeto já reúne uma boa base para dar contexto científico e variedade à engine: consumo e suporte à vida, cultivos, tecnologias de energia, meteorologia marciana, poeira, radiação, topografia, evidências de gelo e eventos solares. A base mistura feeds e arquivos de dados da NASA, arquivos científicos, páginas de referência e tabelas transcritas — não é correto chamar tudo isso de “API”.

O pipeline existente coleta os conjuntos selecionados e os transforma em SQLite e JSON estático versionado. Esse armazenamento abrangente é o comportamento atual do pipeline, não a arquitetura recomendada para a API por jogo. A engine, por sua vez, é determinística e orientada por parâmetros do cenário. O servidor Express atual não expõe rotas de dados: serve a página e os arquivos estáticos. Portanto, **os dados ainda não alimentam as mecânicas da engine**.

Recomendação central: criar uma API com escopo de jogo (por exemplo, `/api/games/survival/v1/...`) que sirva **parâmetros de cenário revisados e derivados**, sem importar indiscriminadamente todas as fontes para SQLite. Usar SQLite apenas para dados estruturados consultados frequentemente; para os demais, a própria API seleciona, trata e devolve a resposta necessária. A engine deve continuar executando offline e não depender de uma chamada externa a cada turno.

## O que existe hoje

### Fontes e produtos do pipeline

O pipeline lista dez grupos de coleta, que resultam nos seguintes conjuntos:

| Grupo/conjunto | Dados disponíveis | Uso potencial na sobrevivência |
|---|---|---|
| `crew_consumption` | 10 referências de consumo humano: oxigênio, CO₂, comida, água, produção metabólica de água e calor, entre outras. Valores por pessoa e por dia terrestre, com população/contexto da fonte. | Base para calibrar consumo por tripulante e relacionar água, comida, oxigênio e CO₂. |
| `life_support` | 9 referências de suporte à vida: intervalos de oxigênio e CO₂, temperatura/umidade de cabine, vazamento e cenários de demanda de água/recuperação. | Configuração inicial de limites e cenários de falha/eficiência, após normalização e revisão. |
| `agriculture` | 23 culturas, com tempo de crescimento, produtividade, condições de cultivo, água/transpiração, luz, CO₂ e outros campos. | Diversificar cultivos e definir compromissos entre tempo, água, energia e alimento. |
| `power_technologies` | 29 referências de geração, armazenamento, cargas e iluminação, com campos como potência, eficiência, massa e maturidade reportada. | Oferecer escolhas de sistema energético, baterias e cargas concorrentes. |
| `isru` | 6 referências de ISRU, incluindo conceitos de produção e resultados do experimento MOXIE. | Desbloqueios, objetivos e comparações de tecnologia; os valores experimentais não devem ser tratados como capacidade de uma base. |
| `radiation_shielding` | 3 referências de radiação e redução observada junto a uma formação específica. | Contexto de risco e objetivos de exploração; não é um modelo de dose humana ou de blindagem. |
| `weather_curiosity`, `weather_perseverance` | Séries públicas resumidas de temperatura, pressão, solo, UV qualitativo e horários/estação disponíveis. | Escolha de local/estação e variação ambiental narrativa, com lacunas explícitas. |
| `insight_wind` | Produtos diários derivados do TWINS, normalizados com amostras e cobertura. | Eventos de vento/poeira ou restrições de atividade, sem tratar a média como previsão local. |
| `dust_opacity` | Opacidade de poeira observada em 440 e 880 nm e incerteza. | Contextualizar tempestades e efeitos ambientais; não converter diretamente em queda de energia de painel. |
| `radiation` | Observações do RAD em superfície, em microGy por dia terrestre, com detectores e cobertura. | Exposição ambiental como dado observado; requer conversão/modelo antes de representar risco à tripulação. |
| `solar_events` | Catálogo DONKI de FLR, CME e SEP, com tempos, metadados e análises disponíveis. | Eventos de comunicação, alertas ou narrativa. A ocorrência não comprova chegada/impacto em Marte. |
| `mars_constants` | Constantes planetárias e derivações documentadas. | Conversões de relógio, unidades e parâmetros de ambiente. |
| `terrain` | Grade MOLA global de elevação e contagem de observações, exportada como raster. | Escolha regional de local e exploração, não avaliação de terreno em escala de construção. |
| `water_ice` | Três grades SWIM2 de consistência de evidência de gelo, em diferentes sensibilidades/profundidades. | Busca e exploração de possíveis recursos, não cálculo de reserva ou extração garantida. |

As contagens e campos acima vêm do catálogo e do código de normalização. A seleção de arquivos é congelada em planos/cache do pipeline; a data de corte padrão documentada é 14/11/2026. A documentação informa que o pacote publicável é `data/static/v2/`, com `manifest.json`, metadados por conjunto, chunks JSON e rasters binários, acompanhado de `provenance.json`.

### Política de armazenamento recomendada

SQLite não deve ser o destino automático de toda coleta. A decisão é por frequência e padrão de acesso:

| Tratamento | O que colocar aqui | Exemplos nesta engine |
|---|---|---|
| **SQLite: dados frequentemente consultados** | Registros estruturados, relativamente pequenos e reutilizados por várias requisições/sessões; indexar por jogo, conjunto, versão e ID. | Perfis ativos de consumo/suporte à vida, catálogo de culturas e tecnologias energéticas, constantes e parâmetros de cenários publicados. |
| **Resposta tratada pela API: consulta pontual ou pouco frequente** | A API busca/carrega apenas a fonte ou recorte necessário, normaliza, aplica conversões explícitas e devolve os dados com unidades e proveniência; não grava o conjunto inteiro em SQLite. | Histórico de um intervalo meteorológico, observações de radiação para um período, metadados de evento DONKI e resumo ambiental de um local. |
| **Resposta de arquivo/mapa** | Para grades e arquivos grandes, a API retorna metadados e uma URL/stream do artefato ou um recorte/resumo pedido; não converte toda a grade em linhas SQLite nem em JSON gigante. | MOLA e mapas SWIM2, preservando projeção, resolução, nodata e limites espaciais. |

O critério é o acesso real, não apenas o tipo de fonte: promover um recorte a SQLite se ele passar a ser consultado repetidamente; remover da base operacional o que não tiver esse padrão. A API deve sempre informar versão/data da fonte, filtros aplicados, unidades, campos ausentes e limitações. Se uma fonte externa falhar, retornar erro explícito ou uma versão local validada identificada como tal — nunca inventar valores ou apresentar uma resposta antiga como atual.

### Quais fontes são APIs de fato

- **Feeds de meteorologia do Mars Weather**: endpoints usados para os feeds públicos resumidos de Curiosity e Perseverance.
- **DONKI**: endpoints de catálogo de eventos solares FLR/CME/SEP. O pipeline usa `ccmc.gsfc.nasa.gov/DONKI-API`; uma rota alternativa do gateway da NASA existe no coletor legado.
- **NTRS**: API para metadados/pesquisa/download de relatórios. O catálogo atual usa a rota de download do PDF BVAD, não uma API de valores de engenharia estruturados.
- **Demais entradas**: páginas HTML, catálogos/arquivos científicos, CSV/CDF/TIFF/IMG/XML e tabelas revisadas. São fontes ingeridas pelo pipeline, não endpoints JSON para consultar em tempo real.

Assim, os 80 registros do catálogo técnico são valores transcritos com proveniência. As quatro páginas NASA e o PDF do BVAD não se tornam APIs de dados só por terem URLs no catálogo.

## Aderência à engine atual

O cenário atual já define recursos e mecânicas de água limpa/usada, oxigênio, comida, sementes, energia, filtros, temperatura, geração elétrica, cultivo, reciclagem e eventos temporizados. Os valores numéricos do cenário são explicitamente descritos como **parâmetros pedagógicos de balanceamento**, não previsões físicas.

O encaixe mais direto para a primeira versão é:

1. **Consumo da tripulação:** derivar taxas por tripulante a partir de `crew_consumption`/`life_support`, com unidades explícitas e conversão de dia terrestre para o passo de 10 minutos da engine. Manter intervalos/contexto em vez de assumir que um único valor é universal.
2. **Recursos e suporte à vida:** associar oxigênio, água, comida e CO₂ a referências identificáveis; permitir cenários de reciclagem, vazamento e falhas como escolhas de gameplay. Não transformar a taxa de recuperação da ISS em desempenho garantido para Marte.
3. **Cultivo:** permitir escolher cultura e dimensionar tempo de crescimento, água, luz/energia e rendimento. Distinguir produtividade por área/dia terrestre do yield simplificado atual, e guardar as condições ambientais necessárias.
4. **Energia:** oferecer configurações alternativas (solar, nuclear, baterias, iluminação) e alimentar a alocação de cargas da engine com valores de cenário. Eficiência e potência de referências precisam ser convertidas para a escala de jogo; maturidade tecnológica é a reportada na fonte.
5. **Ambiente e local:** usar clima, poeira, vento, topografia e gelo para criar diferenças de cenário/local. Os feeds de Curiosity e Perseverance são locais diferentes; não combinar com InSight como se tudo fosse medido no mesmo lugar e instante.
6. **Radiação e eventos solares:** usar como alertas, objetivos e eventos ficcionais claramente identificados. Não calcular “dose segura”, probabilidade médica ou impacto de CME/SEP em Marte com os dados atuais.

Não recomendo substituir as taxas fixas do cenário diretamente pelos registros brutos. A API deve fornecer perfis já revisados, com origem, unidades, contexto, incertezas e versão de balanceamento; a engine usa esses perfis para construir ou validar o cenário.

## Proposta de API por jogo

### Recursos recomendados

| Rota proposta | Conteúdo |
|---|---|
| `GET /api/games` | Jogos disponíveis e respectivas versões de contrato. |
| `GET /api/games/survival/v1/catalog` | Lista de conjuntos/cenários disponíveis e versão dos dados. |
| `GET /api/games/survival/v1/scenarios/mars-first-mission` | Cenário jogável completo: recursos iniciais, equipe, taxas, limites, atividades e eventos. |
| `GET /api/games/survival/v1/reference/crew-consumption` | Referências técnicas normalizadas, sem assumir que são valores de gameplay. |
| `GET /api/games/survival/v1/reference/crops` | Catálogo de culturas e condições de cultivo. |
| `GET /api/games/survival/v1/reference/power-systems` | Tecnologias e perfis de energia disponíveis. |
| `GET /api/games/survival/v1/sites` | Locais jogáveis com IDs de fontes, cobertura, clima e disponibilidade de mapas. |
| `GET /api/games/survival/v1/sites/{siteId}/environment` | Resumo ambiental para construção/seleção de cenário; não substitui séries e rasters. |

Os endpoints devem retornar somente o conjunto, período ou recorte pedido. Quando os dados forem frequentemente consultados, podem vir de SQLite; nas demais rotas, a própria API trata a consulta e monta a resposta, sem persistir a coleção inteira no banco. Rasters devem permanecer como arquivos binários com metadados de projeção e resolução, não ser embutidos em respostas JSON. Para operações da partida (ações, avanço do tempo, save/replay), manter a engine como autoridade; separar esses endpoints de leitura dos dados científicos.

### Contrato mínimo para parâmetros jogáveis

Cada valor derivado que afete gameplay deve carregar, no mínimo:

```json
{
  "id": "water_use_per_crew_tick",
  "value": 0,
  "unit": "kg/person/tick",
  "sourceDataset": "crew_consumption",
  "sourceRecordIds": ["potable_water_including_rehydration"],
  "conversion": "per Earth day to 10-minute tick",
  "assumptions": ["crew profile selected by scenario"],
  "uncertainty": null,
  "gameplayTuning": true,
  "dataVersion": "..."
}
```

O exemplo ilustra o formato, não propõe o valor zero como regra. Em particular, convém separar:

- **observação/referência**: valor, unidade, fonte e contexto originais;
- **conversão**: regra reproduzível para unidades e relógio do jogo;
- **parâmetro de gameplay**: valor calibrado, limites e eventual fator de balanceamento.

## Prioridade de implementação

### P0 — primeiro ciclo jogável

- Converter referências de consumo e suporte à vida para perfis de cenário compatíveis com os recursos e taxas da engine.
- Adicionar perfis de cultivo com alguns cultivos representativos, custos/condições e rendimento no relógio do jogo.
- Modelar pelo menos dois perfis de energia (por exemplo, solar com armazenamento e fonte firme), mantendo a alocação de cargas existente.
- Incluir metadados de proveniência e unidade em cada parâmetro derivado.
- Manter os perfis de cenário necessários à partida disponíveis offline e versionados; para consultas externas pontuais, retornar erro explícito quando a fonte estiver indisponível.

### P1 — variação de cenário/local

- Derivar condições sazonais e eventos de poeira a partir de clima/opacidade, sem converter uma observação isolada em previsão.
- Criar locais exploráveis a partir de MOLA/SWIM2 com limitações de resolução e interpretação visíveis.
- Tornar radiação um sistema abstrato de jogo até existir um modelo adequado de dose/abrigo.

### P2 — integração dinâmica e expansão

- Atualização agendada dos catálogos frequentes armazenados em SQLite; manter versionadas as respostas/capturas realmente necessárias, sem replicar todos os arquivos no banco.
- Eventos DONKI como conteúdo ambiental/narrativo revisado, não como previsão automática de impacto.
- Novos jogos usando o mesmo catálogo de fontes e adaptadores próprios, sem compartilhar por acidente parâmetros de sobrevivência.

## Riscos e decisões que não devem ser escondidos

- **Base empírica versus balanceamento:** taxas da engine são pedagógicas; fontes do BVAD são referências com hipóteses herdadas, não especificações atuais de uma missão.
- **Tempo:** consumo/cultivo das referências usa dia terrestre; a engine avança em ticks de 10 minutos. Converter explicitamente e não tratar um sol como 24 horas.
- **Escala:** valores de cultivo são por área e podem pressupor ambientes controlados; a engine atual não modela área, nutrientes ou ciclo de luz.
- **Água:** 98% de recuperação citado é um marco de sistema da ISS, não rendimento garantido em Marte. SWIM2 é consistência de evidências, não teor ou reserva extraível.
- **Energia:** irradiância fora da atmosfera e opacidade em comprimentos de onda específicos não equivalem à potência efetiva de painéis no solo.
- **Radiação:** microGy absorvidos não equivalem diretamente à dose efetiva humana; reduções medidas junto a uma formação local não definem uma curva universal de abrigo.
- **Meteorologia:** os feeds públicos têm lacunas (incluindo ausência de vento/umidade nesses feeds) e coberturas/locais diferentes; dados ausentes devem continuar ausentes, não virar zero ou um valor inventado.
- **Disponibilidade:** as fontes externas podem mudar ou ficar indisponíveis. A partida usa seu perfil de cenário versionado offline; consultas pontuais à fonte devem informar falha ou, se houver, devolver um resultado local validado claramente identificado.
- **Operação:** o `server.js` atual só expõe a rota raiz, `/game` e arquivos estáticos; não existe ainda API de domínio para jogos. A saída `data/static/v2/` documentada pelo pipeline também não está conectada às rotas do servidor nesta implementação.

## Conclusão

Há dados suficientes para enriquecer a primeira engine de sobrevivência com taxas de referência, escolhas de cultivo/energia, variação ambiental e exploração de locais. O principal trabalho pendente não é descobrir mais endpoints: é definir um contrato de domínio que transforme os dados preservando unidades, contexto e incerteza, calibrar parâmetros do cenário e conectar a publicação versionada do pipeline ao servidor.

Uma primeira entrega segura e útil é uma API de leitura para catálogo e cenário: SQLite guarda os perfis e referências que são acessados frequentemente; dados menos acessados são tratados e respondidos pela API sob demanda, sem carga integral em SQLite. A engine consome um perfil de cenário versionado e disponível offline, mantendo a partida reproduzível sem deixar que mudanças inesperadas nas fontes alterem uma missão em andamento.
