import * as maplibregl from "maplibre-gl";

// Turbopack ne résout pas l'URL du worker de MapLibre v6 : on le sert depuis public/ (copié au postinstall)
maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

export { maplibregl };
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";
