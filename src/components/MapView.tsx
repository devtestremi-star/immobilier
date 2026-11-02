"use client";

import { maplibregl, MAP_STYLE } from "@/lib/maplibre";
import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { aggOf, useData } from "./DataProvider";
import { ListingCard } from "./ListingCard";
import type { Listing } from "@/lib/types";
import { fmtAvg, scoreBg } from "@/lib/format";

const HEART = new Path2D(
  "M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.8 4.3 7.2C19.5 16.4 12 21 12 21z",
);
const pinPrice = (l: Listing) =>
  l.transaction === "Location" ? `${l.price} €` : l.price >= 1e6 ? `${fmtAvg(l.price / 1e6)} M€` : `${Math.round(l.price / 1000)} k€`;

// pin « prix + note + cœur » dessiné à la demande : id = pin|prix|note|fav|new
function drawPin(id: string) {
  const [, price, avgS, fav, isNew] = id.split("|");
  const avg = avgS ? Number(avgS) : null;
  const R = 2; // pixelRatio
  const H = 22, PAD = 7, TIP = 6, M = 2;
  const c = document.createElement("canvas").getContext("2d")!;
  const font = "700 12px system-ui, -apple-system, Segoe UI, sans-serif";
  const small = "700 11px system-ui, -apple-system, Segoe UI, sans-serif";
  c.font = font;
  const pw = c.measureText(price).width;
  c.font = small;
  const sw = avg !== null ? c.measureText(fmtAvg(avg)).width + 9 : 0;
  const w = Math.ceil(PAD + (fav === "1" ? 15 : 0) + pw + (avg !== null ? 5 + sw : 0) + (avg !== null ? 3 : PAD));
  const W = w + M * 2, HH = H + TIP + M * 2;
  c.canvas.width = W * R;
  c.canvas.height = HH * R;
  c.scale(R, R);
  const border = fav === "1" ? "#f43f5e" : avg !== null ? scoreBg(avg) : isNew === "1" ? "#f59e0b" : "#a5b4fc";
  // bulle + pointe
  c.beginPath();
  c.roundRect(M, M, w, H, H / 2);
  c.moveTo(M + w / 2 - 5, M + H - 0.5);
  c.lineTo(M + w / 2, M + H + TIP);
  c.lineTo(M + w / 2 + 5, M + H - 0.5);
  c.closePath();
  c.fillStyle = "#0f172a";
  c.fill();
  c.lineWidth = fav === "1" ? 2 : 1.5;
  c.strokeStyle = border;
  c.stroke();
  let x = M + PAD;
  if (fav === "1") {
    c.save();
    c.translate(x - 1, M + H / 2 - 6.5);
    c.scale(0.55, 0.55);
    c.fillStyle = "#f43f5e";
    c.fill(HEART);
    c.restore();
    x += 15;
  }
  c.font = font;
  c.fillStyle = "#f8fafc";
  c.textBaseline = "middle";
  c.fillText(price, x, M + H / 2 + 0.5);
  x += pw + 5;
  if (avg !== null) {
    c.beginPath();
    c.roundRect(x, M + 3, sw, H - 6, (H - 6) / 2);
    c.fillStyle = scoreBg(avg);
    c.fill();
    c.font = small;
    c.fillStyle = "#fff";
    c.textAlign = "center";
    c.fillText(fmtAvg(avg), x + sw / 2, M + H / 2 + 0.5);
  }
  const img = c.getImageData(0, 0, W * R, HH * R);
  return { width: img.width, height: img.height, data: new Uint8Array(img.data.buffer) };
}


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
              pin: `pin|${pinPrice(l)}|${a.avg !== null ? Math.round(a.avg * 10) / 10 : ""}|${a.favCount > 0 ? 1 : 0}|${l.isNew ? 1 : 0}`,
              // priorité d'affichage quand les pins se chevauchent : coups de cœur, puis meilleures notes
              rank: a.favCount > 0 ? 0 : a.avg !== null ? 11 - a.avg : 20,
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
    m.setMissingStyleImageResolver((id) => {
      if (id.startsWith("pin|") && !m.hasImage(id)) m.addImage(id, drawPin(id), { pixelRatio: 2 });
    });
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
          "circle-stroke-color": "#020617",
          "circle-stroke-width": 2,
          "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 50, 23, 200, 29],
        },
      });
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "pts",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12, "text-font": ["Noto Sans Bold"], "text-allow-overlap": true, "text-ignore-placement": true },
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
          "circle-radius": 5,
          "circle-stroke-color": ["case", ["==", ["get", "fav"], 1], "#f43f5e", "#020617"],
          "circle-stroke-width": ["case", ["==", ["get", "fav"], 1], 2.5, 1.5],
        },
      });
      // pins prix / note / cœur, la pointe sur le point ; masqués s'ils se chevauchent (le point reste)
      m.addLayer({
        id: "pins",
        type: "symbol",
        source: "pts",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "pin"],
          "icon-anchor": "bottom",
          "icon-offset": [0, -2],
          "icon-padding": 1,
          "symbol-sort-key": ["get", "rank"],
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
    m.on("click", "pins", (e) => {
      const ids = (e.features ?? []).map((x) => x.properties.id as number);
      if (ids.length) setSelected(ids.slice(0, 1));
    });
    m.on("click", "points", (e) => {
      const ids = (e.features ?? []).map((x) => x.properties.id as number);
      if (ids.length) setSelected(ids);
    });
    m.on("click", (e) => {
      if (!m.queryRenderedFeatures(e.point, { layers: ["pins", "points", "clusters"] }).length) setSelected([]);
    });
    for (const layer of ["clusters", "points", "pins"]) {
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
      <div className="pointer-events-none absolute bottom-3 left-3 hidden gap-3 rounded-xl bg-slate-900/90 px-3 py-2 text-xs text-slate-300 shadow sm:flex">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-indigo-400" />Jamais notée</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-600" />Mauvaise note</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-600" />Bonne note</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-[3px] border-rose-500 bg-slate-900" />Coup de cœur</span>
        <span className="text-slate-500">· pin = prix, note moyenne, ♥</span>
      </div>
      {sel.length > 0 && (
        <div className="absolute inset-x-2 bottom-2 z-10 max-h-[55%] overflow-y-auto rounded-2xl bg-slate-950/95 p-2 shadow-xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[420px]">
          <div className="flex items-center justify-between px-1 pb-2 text-sm">
            <span className="font-medium text-slate-300">
              {sel.length} logement{sel.length > 1 ? "s" : ""} · {sel[0].city}
            </span>
            <button onClick={() => setSelected([])} className="rounded-full px-2 text-slate-400 hover:bg-slate-700" aria-label="Fermer">
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
