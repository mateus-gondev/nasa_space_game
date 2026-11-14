/*
 * CONFIGURAÇÃO CENTRAL DA ENGINE
 * Altere este arquivo para personalizar o comportamento e a aparência do mapa.
 */
window.MAP_ENGINE_CONFIG = {
  grid: { tileSize: 40, columns: 80, rows: 52 },
  camera: { viewTiles: { w: 26, h: 15 }, smooth: 8 },
  player: {
    startX: 60, startY: 11, speed: 4.4, collisionRadius: 0.30,
    spriteSize: 50, animationFps: { idle: 7, run: 10, jump: 8, death: 7 }
  },
  assets: {
    basePath: "/assets/Space%20Runner%20Assets%20-%2027-11-20/Astronaut/",
    animations: {
      idle: { file: "Astronaut_Idle.png", frameWidth: 24, frameHeight: 24, frames: 6, loop: true },
      run: { file: "Astronaut_Run.png", frameWidth: 24, frameHeight: 24, frames: 6, loop: true },
      jump: { file: "Astronaut_Jump.png", frameWidth: 24, frameHeight: 24, frames: 5, loop: false },
      death: { file: "Astronaut_Death.png", frameWidth: 32, frameHeight: 32, frames: 4, loop: false }
    },
    props: {
      energyPack: "/assets/Space%20Runner%20Assets%20-%2027-11-20/Other%20sprites/EnergyPack.png",
      diamond: "/assets/Space%20Runner%20Assets%20-%2027-11-20/Other%20sprites/Diamond.png",
      glassShards: "/assets/Space%20Runner%20Assets%20-%2027-11-20/Other%20sprites/GlassShards.png",
      rockShards: "/assets/Space%20Runner%20Assets%20-%2027-11-20/Other%20sprites/RockShards.png"
    }
  },
  interaction: { distance: 0.9, key: "e" },
  rendering: { pixelated: true, showRoomLabels: true, showFloorDetails: true, showNasaMarks: false },
  atmosphere: {
    default: "clean",
    presets: {
      clean: {
        label: "Operacional", tint: null, accent: "#4dd0ff", lightColor: "#bfe9ff",
        lightOpacity: 0.85, flicker: 0.02, grime: 0, vignette: 0
      },
      emergency: {
        label: "Emergência", tint: "rgba(255, 30, 30, 0.15)", accent: "#ff5252", lightColor: "#ff3b3b",
        lightOpacity: 0.95, flicker: 0.55, grime: 0, vignette: 0.05
      },
      abandoned: {
        label: "Abandonada", tint: "rgba(120, 90, 40, 0.22)", accent: "#d8b16b", lightColor: "#bfe9ff",
        lightOpacity: 0.18, flicker: 0.85, grime: 0.65, vignette: 0.12
      },
      horror: {
        label: "Suspense", tint: "rgba(0, 40, 20, 0.22)", accent: "#7dff9a", lightColor: "#9bff9b",
        lightOpacity: 0.16, flicker: 0.92, grime: 0.8, vignette: 0.92
      }
    }
  },
  colors: {
    wallTop: "#c4ccd5", wallSide: "#5d6c7b", wallLine: "#46535f",
    floors: ["#4b5660", "#d3dce4", "#2d343b", "#34475d", "#59615c", "#2a2f36", "#27384f"],
    floorLines: ["#3d4750", "#b9c5d0", "#222930", "#2a3a4d", "#474e49", "#20252b", "#1d2b3e"]
  }
};
