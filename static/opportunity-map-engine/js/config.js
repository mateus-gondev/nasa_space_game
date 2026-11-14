/*
 * CONFIGURAÇÃO CENTRAL DA ENGINE
 * Altere este arquivo para personalizar o comportamento e a aparência do mapa.
 */
window.MAP_ENGINE_CONFIG = {
  grid: { tileSize: 40, columns: 28, rows: 18 },
  player: { startX: 6, startY: 9.5, speed: 4.4, collisionRadius: 0.30 },
  interaction: { distance: 0.9, key: "e" },
  rendering: { pixelated: true, showRoomLabels: true, showFloorDetails: true },
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
    floors: ["#4b5660", "#d3dce4", "#2d343b", "#34475d"],
    floorLines: ["#3d4750", "#b9c5d0", "#222930", "#2a3a4d"]
  }
};
