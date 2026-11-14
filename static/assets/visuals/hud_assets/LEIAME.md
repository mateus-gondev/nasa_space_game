# Assets da HUD pixelada

- svg/  -> vetores (escalam sem borrar; use shape-rendering: crispEdges)
- png/  -> _1x = tamanho nativo da grade (7x7 ou 12x10 px); _8x = ampliado sem suavizacao
  Na engine, use filtro "nearest" / sem antialiasing e escale por multiplos inteiros.

## Fonte
Pixelify Sans (Google Fonts, licenca OFL) - https://fonts.google.com/specimen/Pixelify+Sans

## Paleta
Fundo painel        #141c2b   (realce #22304a, sombra #0a0f18)
Borda painel        #7fdcff
Barra de acoes      #2b1319   (borda #c4505e, realce #4a1f29, sombra #170a0e)
Slot                #1b2740   (borda #ff8f9b, hover #2a3b60)
Tecla (badge)       #ffd23f
Texto               #e8f6ff
Oxigenio #4fd1ff | Agua #4a86ff | Alimentacao #ff9a3c | Energia #ffe45e
Barra segmentada: 10 blocos, 2px de intervalo, fundo #0a0f18, contorno #3a4a68

## Moldura pixelada (CSS)
box-shadow: 0 -4px 0 0 COR, 0 4px 0 0 COR, -4px 0 0 0 COR, 4px 0 0 0 COR;
(gera cantos "cortados" em degrau)
