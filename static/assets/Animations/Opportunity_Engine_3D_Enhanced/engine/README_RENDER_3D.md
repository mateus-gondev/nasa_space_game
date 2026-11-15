# Opportunity — melhoria de renderização e biblioteca de ambientes 3D

## O que havia no arquivo original

O `engine.rar` recebido contém **apenas o motor de animações** (`engine/`), não o projeto `nasa_space_game` descrito em `Engine_3D_Threejs.docx`. Por isso, este pacote **preserva todos os arquivos originais** e adiciona módulos reutilizáveis. Ele não substitui diretamente `static/lab_training/js/camera-view.js`, que não veio no RAR.

A documentação do laboratório menciona Three.js **0.180.0**, enquanto o README do motor enviado menciona **0.170.0**. O demo utiliza 0.170.0, compatível com o motor enviado; os módulos utilizam recursos estáveis nas duas versões. Ao integrar ao projeto completo, utilize a mesma versão do Three.js em todos os imports.

## Novos arquivos

| Arquivo | Propósito |
|---|---|
| `environment.js` | Constrói cenário de `MAP_DATA` com piso/parede instanciados, teto, portas, props, luzes e atmosfera |
| `props.js` | Modelos procedurais detalhados para armário, rack, tanque, bancada, painel solar, equipamento científico, planta, mastros, caixas e amostras |
| `materials.js` | PBR com `MeshStandardMaterial`, texturas procedurais de piso, metal, grade e solo marciano, rótulos Canvas |
| `quality.js` | Perfis `low`, `balanced`, `high`, com tone mapping ACES e sombras suaves opcionais |
| `demo/` | Cena de teste independente usando somente HTML, CSS, JavaScript e Three.js |

## Testar a demonstração

1. Extraia o ZIP mantendo a pasta `engine/`.
2. Na pasta **que contém `engine/`**, execute `python -m http.server 8000`.
3. Acesse `http://localhost:8000/engine/demo/`.
4. Arraste mouse/dedo para orientar a lente; scroll para zoom; R para centralizar; seletor para comparar qualidades.
5. O importmap aponta para um CDN de Three.js; a primeira abertura precisa de internet. No projeto real, aponte o importmap para seu vendor `/vendor/three/three.module.js`.

## Integração com a câmera científica existente

No **projeto completo**, mantenha `CameraPOVController`, `LabCameraView`, validação de fotografia e regras do tutorial. **Substitua somente a função que constrói a `THREE.Scene`** dentro de `camera-view.js`:

```js
import { createEnhancedLabScene } from '/assets/Animations/engine/environment.js';

// Dentro do seu construtor de cena, usando o mesmo map/config/mood já existentes:
const scene = createEnhancedLabScene(map, config, mood, {
  quality: 'balanced', // 'low', 'balanced', 'high'
  ceiling: true,
  outdoors: false,
});
```

**Atenção:** não é possível aplicar automaticamente esse patch sem o arquivo original de `camera-view.js` e sem os dados reais de `MAP_DATA`. O código foi construído em torno do contrato documentado, mas as variações exatas de nomes/estruturas não puderam ser verificadas.

### Renderizador

Se o renderer da câmera já existir, configure-o após criá-lo e antes do primeiro frame:

```js
import { configureQualityRenderer, getRenderProfile } from '/assets/Animations/engine/quality.js';
configureQualityRenderer('balanced')(renderer);
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, getRenderProfile('balanced').maxPixelRatio));
```

Se usar o `createAnimation` já existente no RAR:

```js
import {createAnimation} from './engine/index.js';
import {configureQualityRenderer,getRenderProfile} from './engine/quality.js';
const quality='balanced';
const animation=createAnimation({
  createScene, duration:10, pixelated:false, responsive:true,
  renderQuality: quality, // ativa antialias, ACES, sombras e DPR do perfil
  maxPixelRatio:getRenderProfile(quality).maxPixelRatio,
});
```

### Compatibilidade de `MAP_DATA`

- `grid[y][x]` (ou grid plano com width/height) — 0 vazio, 1 parede, 2 piso, 3 porta.
- `floorMap[y][x]` — aceita strings (`lab`, `concrete`, `grate`, `mars`) e números conhecidos.
- `props[]` — posições em tiles `x,y,w,h`, campos `type`, `name`, `trainingId`.
- `userData.prop` é colocado no grupo pai **para o raycast da fotografia continuar localizando o alvo**.
- A câmera e o jogador **não são movimentados por essa camada**: a posição permanece a cargo do controlador existente.
- `scene.userData.disposeEnvironment()` libera geometria, material e textura quando a cena for desmontada. Não chame duas vezes nem descarte o kit separadamente.

## Decisões de desempenho

- InstancedMesh para pisos, paredes e lintéis de portas.
- Reuso de geometria e material nos props e texturas criadas uma vez por cena.
- Texturas Canvas geradas localmente; nenhum download de imagem.
- Modelo procedural com número de segmentos controlado por qualidade.
- Sombras e pontos de luz limitados pelo perfil; perfis ajustam pixel ratio.
- Sem pós-processamento pesado (SSAO/bloom); isso poderia ser acrescentado como opção após medir FPS.
- A maioria dos props é composta por malhas separadas para detalhamento. Para mapas muito grandes, o próximo passo seria `InstancedMesh` por subpeça ou LOD de objetos distantes.

## Limitações

- O RAR não inclui os arquivos descritos na documentação do Lab Training; integração não foi aplicada ao projeto hospedado.
- Modelos são procedurais, estilizados, com materiais PBR; não são assets fotogramétricos.
- A câmera POV anterior não foi alterada. O player de animação preserva o comportamento antigo quando `renderQuality` não é informado.
- A demonstração exige WebGL e acesso ao Three.js via CDN.
- Não houve benchmark em dispositivo móvel real nem teste end-to-end do tutorial completo; execute `npm test` no repositório completo após integrar.
