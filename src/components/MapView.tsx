"use client";

import { maplibregl, MAP_STYLE } from "@/lib/maplibre";
import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { aggOf, useData } from "./DataProvider";
import { ListingCard } from "./ListingCard";
import type { Listing } from "@/lib/types";


export default function MapView({ listings, search, fitKey }: { listings: Listing[]; search: string; fitKey: string }) {
  const { aggs, me, byId } = useData();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  const geojson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: "FeatureCollection",
      features: listings
        .filter((l) => l.lat !== null && l.lng !== null)
        .map((l) => {
          const a = aggOf(aggs, l.id);
          return {
            type: "Feature",
            geometry: { type: "Point", coordinates: [l.lng!, l.lat!] },
            properties: {
              id: l.id,
              avg: a.avg ?? -1,
              fav: a.favCount > 0 ? 1 : 0,
              mine: a.reviews.some((r) => r.author === me && r.score != null) ? 1 : 0,
            },
          };
        }),
    }),
    [listings, aggs, me],
  );

  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({
      container: box.current,
      style: MAP_STYLE,
      center: [5.4, 45.2],
      zoom: 6.3,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    m.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false } }), "bottom-right");
    m.on("load", () => {
      m.addSource("pts", { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 45, clusterMaxZoom: 13 });
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "pts",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#4f46e5",
          "circle-opacity": 0.85,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 23, 200, 29],
        },
      });
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "pts",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12, "text-font": ["Noto Sans Bold"] },
        paint: { "text-color": "#fff" },
      });
      m.addLayer({
        id: "points",
        type: "circle",
        source: "pts",
        filter: ["!", ["has", "point_count"]],
        paint: {
          // gris-bleu = jamais notée, sinon rouge → vert selon la note moyenne
          "circle-color": ["case", ["<", ["get", "avg"], 0], "#818cf8", ["interpolate", ["linear"], ["get", "avg"], 1, "#dc2626", 5, "#f59e0b", 7, "#84cc16", 10, "#16a34a"]],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 10],
          "circle-stroke-color": ["case", ["==", ["get", "fav"], 1], "#f43f5e", "#ffffff"],
          "circle-stroke-width": ["case", ["==", ["get", "fav"], 1], 3, 2],
        },
      });
      setReady(true);
    });

    m.on("click", "clusters", async (e) => {
      const f = e.features?.[0] as MapGeoJSONFeature | undefined;
      if (!f) return;
      const src = m.getSource("pts") as GeoJSONSource;
      const id = f.properties.cluster_id as number;
      const zoom = await src.getClusterExpansionZoom(id);
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      // au zoom max, un groupe = même commune : on liste ses logements
      if (zoom > 13 || m.getZoom() >= 13) {
        const leaves = await src.getClusterLeaves(id, 200, 0);
        setSelected(leaves.map((x) => x.properties!.id as number));
      } else {
        m.easeTo({ center: coords, zoom });
      }
    });
    m.on("click", "points", (e) => {
      const ids = (e.features ?? []).map((x) => x.properties.id as number);
      if (ids.length) setSelected(ids);
    });
    m.on("click", (e) => {
      if (!m.queryRenderedFeatures(e.point, { layers: ["points", "clusters"] }).length) setSelected([]);
    });
    for (const layer of ["clusters", "points"]) {
      m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
    }
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    (map.current.getSource("pts") as GeoJSONSource).setData(geojson);
  }, [ready, geojson]);

  // recadre sur les résultats quand les filtres changent
  useEffect(() => {
    if (!ready || !map.current || !geojson.features.length) return;
    const b = new maplibregl.LngLatBounds();
    for (const f of geojson.features) b.extend(f.geometry.coordinates as [number, number]);
    // marge haute pour la barre de recherche posée sur la carte
    map.current.fitBounds(b, { padding: { top: 170, bottom: 40, left: 40, right: 40 }, maxZoom: 12, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey]);

  const sel = selected.map((id) => byId.get(id)).filter(Boolean) as Listing[];

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <div ref={box} className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 hidden gap-3 rounded-xl bg-white/90 px-3 py-2 text-xs text-slate-600 shadow sm:flex">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-indigo-400" />Jamais notée</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-600" />Mauvaise note</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-600" />Bonne note</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-[3px] border-rose-500 bg-white" />Coup de cœur</span>
      </div>
      {sel.length > 0 && (
        <div className="absolute inset-x-2 bottom-2 z-10 max-h-[55%] overflow-y-auto rounded-2xl bg-slate-50/95 p-2 shadow-xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[420px]">
          <div className="flex items-center justify-between px-1 pb-2 text-sm">
            <span className="font-medium text-slate-600">
              {sel.length} logement{sel.length > 1 ? "s" : ""} · {sel[0].city}
            </span>
            <button onClick={() => setSelected([])} className="rounded-full px-2 text-slate-500 hover:bg-slate-200" aria-label="Fermer">
              ✕
            </button>
          </div>
          <div className="space-y-2">
            {sel.map((l) => (
              <ListingCard key={l.id} l={l} search={search} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
