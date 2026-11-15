/* Opportunity — cinco regiões de Marte. Base da engine original mantida. */
window.MAP_ENGINE_CONFIG = {
  grid: { tileSize: 32, columns: 128, rows: 92 },
  camera: { viewTiles: { w: 30, h: 18 }, smooth: 9 },
  player: { startX: 62, startY: 47, speed: 7.6, collisionRadius: .26 },
  interaction: { distance: 2.25, key: 'e' },
  rendering: { pixelated: true, showRoomLabels: true, showFloorDetails: true },
  atmosphere: {
    default: 'clear',
    presets: {
      clear: { label:'Sol claro', tint:'rgba(225,130,65,.035)', accent:'#78e5e9', lightColor:'#f8bb75', lightOpacity:.85, flicker:0, grime:.08, vignette:.1 },
      sunset: { label:'Crepúsculo', tint:'rgba(142,48,65,.24)', accent:'#ffbf74', lightColor:'#ffad55', lightOpacity:.45, flicker:0, grime:.15, vignette:.24 },
      dust: { label:'Poeira', tint:'rgba(198,107,49,.22)', accent:'#ffc26e', lightColor:'#ef9961', lightOpacity:.36, flicker:.02, grime:.45, vignette:.29 },
      night: { label:'Noite', tint:'rgba(6,17,39,.58)', accent:'#80dcff', lightColor:'#82b9ff', lightOpacity:.18, flicker:.04, grime:.15, vignette:.48 },
      storm: { label:'Tempestade', tint:'rgba(119,54,28,.52)', accent:'#ffb680', lightColor:'#c46a4c', lightOpacity:.20, flicker:.04, grime:.92, vignette:.58 }
    }
  },
  colors: {
    wallTop:'#7a3e2a', wallSide:'#522b23', wallLine:'#321b19',
    floors:['#a35332','#c36c3e','#853d31','#d09058','#682f2b','#e5a36a','#754b3c'],
    floorLines:['#965031','#b7613d','#72352b','#c18458','#542927','#ca915e','#664338']
  }
};
