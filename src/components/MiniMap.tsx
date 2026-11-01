"use client";

import { maplibregl, MAP_STYLE } from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

export default function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: MAP_STYLE,
      center: [lng, lat],
      zoom: 11,
      cooperativeGestures: true,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // cercle d'imprécision plutôt qu'un point exact
    m.on("load", () => {
      m.addSource("c", { type: "geojson", data: { type: "Point", coordinates: [lng, lat] } });
      m.addLayer({
        id: "c",
        type: "circle",
        source: "c",
        paint: {
          "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 8, 8, 14, 260],
          "circle-color": "#4f46e5",
          "circle-opacity": 0.15,
          "circle-stroke-color": "#4f46e5",
          "circle-stroke-width": 2,
        },
      });
    });
    return () => m.remove();
  }, [lat, lng]);
  return <div ref={box} className="h-full w-full" />;
}
