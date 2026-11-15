# Tilemap de Marte

Pacote de arte para jogo em visão ortogonal de cima, baseado na identidade de Mars.png e nos assets fornecidos. As formas dos equipamentos mantêm a pequena face frontal presente na referência; o chão não usa projeção isométrica.

## Conteúdo

- 32 tiles de chão, 32 × 32 pixels, em tiles/ e no atlas tileset_terreno.png (8 colunas, sem margem ou espaçamento).
- 21 sprites PNG individuais com transparência binária, em sprites/. Construções e nave ocupam mais de um tile; as dimensões constam em documentacao/assets.csv.
- 3 mapas editáveis, cada um com 24 × 16 tiles, equivalentes a 768 × 512 pixels.
- Mapas em Tiled TMX e JSON; tilesets externos terreno.tsx e objetos.tsx.
- marte.world posiciona os três mapas lado a lado: pouso → mineração → pesquisa. O mundo completo mede 2304 × 512 pixels.
- Previews em PNG, incluindo os mapas ampliados 2× por vizinho mais próximo. Os previews são consultas visuais; os arquivos TMX/JSON preservam os elementos separados.
- Paleta em TXT e GPL e relatórios de validação.

## Paleta

Somente estas cinco cores opacas aparecem nos PNGs:

#220901
#621708
#941B0C
#BC3908
#F6AA1C

Fora dos sprites o alfa é 0; dentro deles é 255. Não há antialiasing nem cores intermediárias nos arquivos finais. As cores dos metais, tanques e cristais foram adaptadas à paleta quente solicitada. O depósito de gelo usa veios e rachaduras, em vez de azul ou branco.

## Abrir e editar

Mantenha a estrutura de pastas. Abra marte.world ou um mapa .tmx em um editor compatível com Tiled. Os tilesets usam caminhos relativos e os arquivos JSON apontam para os mesmos TSX externos. Para uma engine que exija tilesets embutidos ou outro formato de JSON, exporte a partir do editor conforme o importador utilizado.

terreno.tsx inclui um Wang set de cantos com dois tipos de solo. IDs 0–15 representam as 16 combinações TL/TR/BL/BR; IDs 16–19 são variações de regolito, 20–23 de areia, 24–27 de chão rachado e 28–31 de cascalho. Os PNGs individuais conservam esses índices nos nomes. A resolução de todos os tiles é 32 × 32.

Os GIDs globais 1–32 são terreno; 33–53 correspondem à coleção de objetos. A origem dos objetos gráficos do Tiled é o canto inferior esquerdo. Em scene_manifest.json, os mesmos objetos usam x/y no canto superior esquerdo, para facilitar integração com outras ferramentas.

Configure o filtro das texturas como nearest/point e desative mipmaps e suavização. Preserve escalas inteiras para manter os pixels nítidos.

## Camadas e exploração

Terreno: chão completo.
Cenarios: nave, crateras, construções e decoração.
Recursos: minérios, cristais, depósitos, energia, oxigênio, amostras e caixas.
Colisao: camada oculta com 0 = livre e 1 = bloqueado; use os valores como máscara, não como arte de chão.
Transicoes: retângulos com destino e ponto de entrada.
Spawn: ponto inicial de cada área.

As propriedades resource e solid documentam a intenção de cada objeto. O arquivo fornece arte e dados; coleta, reabastecimento, colisão e troca de mapas precisam ser ligados à lógica do seu jogo.

Pouso tem a nave/perfuradora adaptada do Space Runner, abrigo, painéis, oxigênio e suprimentos. Mineração tem ferro, cristais, extratores, rover e reposição de energia. Pesquisa tem amostras, gelo subsuperficial e minerais raros.

As transições laterais ocupam y=192 até 320. Saída leste leva à entrada oeste do mapa seguinte, e o retorno usa a conexão inversa. A nave aparece somente no primeiro mapa.

## Origem dos assets

Mars.png: referência visual e amostra para a textura do solo e crateras; arquivo fornecido pelo usuário.

Space Runner Assets – Matt Walkden: o README recebido declara CC0. O design vermelho com três brocas foi adaptado para a nave de exploração, recolorido e exportado como sprite individual.

Space Isometric Pixel Art – KipperFalcon: referência para pedras, minérios e elementos científicos. O README local recebido permite uso e adaptação em projetos comerciais e pessoais e dispensa atribuição, mas também proíbe redistribuir ou reempacotar assets isolados, modificados ou não. Apesar do rótulo “CC BY 0.0” no mesmo arquivo, o pacote recebido contém essa restrição expressa. Portanto, este material não é apresentado como um pacote integralmente CC0; confira essa condição com o autor antes de redistribuir assets como uma coleção independente.

Os objetos foram gerados/adaptados com a ferramenta integrada de geração de imagens, separados por objeto e preparados como PNGs de paleta exata. A nave é uma adaptação visual do veículo fornecido, não uma cópia pixel a pixel. O terreno modular, a extração de crateras, os mapas e a conversão final foram preparados para este projeto. Os prompts usados constam em documentacao/prompts.txt.

## Verificação

validacao_arte.json registra cores e alfa dos PNGs. validacao_mapas.json registra navegação em grade: spawns livres, destinos existentes, passagens alcançáveis e recursos acessíveis. Essa verificação usa a máscara de colisão incluída; não substitui a configuração do controlador do personagem na engine.

