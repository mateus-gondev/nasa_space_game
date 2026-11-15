/* Adapta o manifesto autoral à navegação da engine, sem modificar os assets. */
window.MARS_TILEMAP_READY = fetch('/assets/marte_tilemap/scene_manifest.json')
  .then(response => {
    if (!response.ok) throw new Error('Falha ao carregar o manifesto de Marte.');
    return response.json();
  }).then(manifest => {
    const T = manifest.tileSize;
    const labels = {
      nave_perfuradora: 'Nave de exploração', habitat_circular: 'Abrigo', painel_solar: 'Painel solar',
      antena: 'Antena de comunicação', bateria: 'Bateria', caixa_carga: 'Suprimentos',
      tanque_oxigenio: 'Reserva de oxigênio', tanques_duplos: 'Reserva de oxigênio',
      minerio_ferroso: 'Minério de ferro', cristais: 'Cristais', deposito_rachado: 'Gelo subsuperficial',
      amostras: 'Amostras científicas', extrator: 'Extrator', rover: 'Rover'
    };
    const maps = manifest.maps.map((source, index) => {
      const width = source.width / T, height = source.height / T;
      const props = source.objects.map(o => ({
        id: source.name + '-' + o.id, type: 'tilemapObject', x: o.x / T, y: o.y / T,
        w: o.width / T, h: o.height / T, solid: o.solid, name: labels[o.sprite] || null,
        description: o.resource ? 'Recurso de campo: ' + o.resource.replaceAll('_', ' ') + '. Aproxime-se para registrar ou recolher.' : 'Equipamento da expedição em Marte.',
        action: o.kind === 'energia' ? 'charge' : o.kind === 'comunicacao' ? 'beacon' : o.resource ? (o.kind === 'recurso' || o.kind === 'amostras' ? 'scan' : 'collect') : labels[o.sprite] ? 'log' : null,
        completed: false, important: !!labels[o.sprite]
      }));
      const transitions = source.transitions.map(t => ({
        id: source.name + '-exit-' + t.id, type: 'tilemapObject', x: t.x / T, y: t.y / T,
        w: t.width / T, h: t.height / T, solid: false,
        name: t.side === 'east' ? 'Explorar Marte →' : '← Retornar à área anterior',
        description: 'Atravesse a passagem entre as balizas para seguir ao próximo mapa.',
        action: 'travel:' + t.target, destinationSpawn: [t.spawnX / T, t.spawnY / T], important: true, target: t.target
      }));
      return {
        id: source.name, worldId: source.name, name: source.title, short: ['NAVE / POUSO', 'MINERAÇÃO', 'PESQUISA'][index],
        subtitle: source.title, chapter: 'EXPEDIÇÃO EM MARTE', weather: 'clear', seed: 101 + index, color: '#F6AA1C', palette: manifest.palette,
        spawn: source.spawn.map(v => v / T), width, height,
        grid: Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => source.collision[y * width + x] ? 1 : 2)),
        floorMap: Array.from({length: height}, (_, y) => source.tiles.slice(y * width, (y + 1) * width)),
        props: [...props, ...transitions].sort((a, b) => (a.y + a.h) - (b.y + b.h)), transitions,
        tilemapImage: '/assets/marte_tilemap/mapas/' + source.name + '.png',
        doors: [], rooms: [{name: source.title, x1: 0, y1: 0, x2: width - 1, y2: height - 1}],
        roomLabels: [], lights: [], decals: [], floorDecals: [], destinations: [{name: 'Entrada', x: source.spawn[0] / T, y: source.spawn[1] / T}]
      };
    });
    window.MARS_WORLDS.list.unshift(...maps);
    Object.assign(window.MARS_WORLDS.byId, Object.fromEntries(maps.map(map => [map.id, map])));
    window.MAP_DATA = maps[0];
  });
