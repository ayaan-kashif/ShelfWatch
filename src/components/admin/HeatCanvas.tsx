"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, HeatLayer } from "leaflet";
import type { HeatPoint } from "./RiskMap";
import "leaflet/dist/leaflet.css";
export default function HeatCanvas({ points }: { points: HeatPoint[] }) {
  const element = useRef<HTMLDivElement>(null); const map = useRef<LeafletMap | null>(null); const heat = useRef<HeatLayer | null>(null); const latest = useRef(points); const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function start() {
      const L = (await import("leaflet")).default;
      // The heat plugin attaches to the same Leaflet instance after the client-only import.
      (window as unknown as { L: typeof L }).L = L;
      await import("leaflet.heat");
      if (!active || !element.current) return;
      const instance = L.map(element.current, { center: [30.2, 69.3], zoom: 5, scrollWheelZoom: false }); map.current = instance;
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>', maxZoom: 19 }).addTo(instance);
      heat.current = L.heatLayer(latest.current.map(p => [p.lat, p.lng, Math.max(.15, p.weight)] as [number, number, number]), { radius: 28, blur: 22, maxZoom: 16, gradient: { .2: "#b3f5cd", .55: "#efbc73", 1: "#ff9c96" } }).addTo(instance);
      if (latest.current.length) instance.fitBounds(L.latLngBounds(latest.current.map(p => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 12 });
      instance.invalidateSize();
    }
    start().catch(() => { if (active) setError("We could not load the map. Check your connection and refresh the page."); });
    return () => { active = false; map.current?.remove(); map.current = null; heat.current = null; };
  }, []);
  useEffect(() => { latest.current = points; heat.current?.setLatLngs(points.map(p => [p.lat, p.lng, Math.max(.15, p.weight)] as [number, number, number])); }, [points]);
  return <>{error ? <div className="ad-empty" role="alert">{error}</div> : <div ref={element} style={{ height: "100%", width: "100%" }} role="region" aria-label="Product scan risk heatmap" />}</>;
}
