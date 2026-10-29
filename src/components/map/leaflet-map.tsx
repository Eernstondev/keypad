"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";

export type MapMarker = { id: string; lat: number; lng: number; price?: string; href?: string };
export type MapBounds = { n: number; s: number; e: number; w: number };

export type LeafletMapProps = {
  markers?: MapMarker[];
  activeId?: string | null;
  onMarkerHover?: (id: string | null) => void;
  onBoundsChange?: (bounds: MapBounds) => void; // déplacement fait par l'utilisateur uniquement
  bounds?: MapBounds | null; // zone recherchée : affichée telle quelle au lieu de recadrer sur les marqueurs
  picked?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
};

const HAITI_CENTER: L.LatLngTuple = [18.95, -72.6];
const round = (n: number) => Math.round(n * 1e4) / 1e4;

const pinIcon = L.divIcon({ className: "", html: '<span class="ka-pin"></span>', iconSize: [24, 24], iconAnchor: [12, 24] });

function priceIcon(price: string) {
  const el = document.createElement("span");
  el.className = "ka-price";
  el.textContent = price; // textContent : aucune injection HTML possible
  return L.divIcon({ className: "", html: el, iconSize: [0, 0], iconAnchor: [0, 0] });
}

// Leaflet piloté directement : chaque montage crée et détruit son propre conteneur,
// ce qui évite l'erreur « Map container is being reused » en mode strict de React.
export default function LeafletMap(props: LeafletMapProps) {
  const { markers, activeId, bounds, picked, className } = props;
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markerRefs = useRef(new Map<string, L.Marker>());
  const pickedRef = useRef<L.Marker | null>(null);
  const programmatic = useRef(false);

  // Dernières props accessibles depuis les écouteurs Leaflet sans recréer la carte
  const latest = useRef({ props, router });
  useEffect(() => {
    latest.current = { props, router };
  });

  // Création / destruction de la carte
  useEffect(() => {
    const wrapper = wrapperRef.current!;
    const el = document.createElement("div");
    el.style.cssText = "width:100%;height:100%";
    wrapper.appendChild(el);

    const map = L.map(el, { center: HAITI_CENTER, zoom: 8, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e) => latest.current.props.onPick?.(e.latlng.lat, e.latlng.lng));
    map.on("moveend", () => {
      if (programmatic.current) return;
      const b = map.getBounds();
      latest.current.props.onBoundsChange?.({
        n: round(b.getNorth()),
        s: round(b.getSouth()),
        e: round(b.getEast()),
        w: round(b.getWest()),
      });
    });

    // La carte peut être masquée puis affichée (bouton Carte sur mobile)
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(wrapper);

    mapRef.current = map;
    const markerMap = markerRefs.current;
    return () => {
      resize.disconnect();
      map.remove();
      el.remove();
      mapRef.current = null;
      layerRef.current = null;
      pickedRef.current = null;
      markerMap.clear();
    };
  }, []);

  // Marqueurs (prix ou épingle) + recadrage
  const markersKey = (markers ?? []).map((m) => `${m.id}:${m.lat},${m.lng}:${m.price ?? ""}`).join("|");
  const boundsKey = bounds ? `${bounds.n},${bounds.s},${bounds.e},${bounds.w}` : "";
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markerRefs.current.clear();
    const list = latest.current.props.markers ?? [];

    for (const m of list) {
      const marker = L.marker([m.lat, m.lng], { icon: m.price ? priceIcon(m.price) : pinIcon, keyboard: false });
      marker.on("mouseover", () => latest.current.props.onMarkerHover?.(m.id));
      marker.on("mouseout", () => latest.current.props.onMarkerHover?.(null));
      if (m.href) marker.on("click", () => latest.current.router.push(m.href!));
      marker.addTo(layer);
      markerRefs.current.set(m.id, marker);
    }

    // Sans animation : moveend est émis tout de suite, on l'ignore (pas un geste de l'utilisateur)
    const view = latest.current.props.bounds;
    programmatic.current = true;
    if (view) map.fitBounds([[view.s, view.w], [view.n, view.e]], { animate: false });
    else if (list.length === 1) map.setView([list[0].lat, list[0].lng], 15, { animate: false });
    else if (list.length > 1)
      map.fitBounds(list.map((m) => [m.lat, m.lng] as L.LatLngTuple), { padding: [48, 48], maxZoom: 15, animate: false });
    programmatic.current = false;
  }, [markersKey, boundsKey]);

  // Mise en avant du marqueur survolé dans la liste
  useEffect(() => {
    markerRefs.current.forEach((marker, id) => {
      const active = id === activeId;
      marker.getElement()?.classList.toggle("is-active", active);
      marker.setZIndexOffset(active ? 1000 : 0);
    });
  }, [activeId, markersKey]);

  // Point choisi dans le formulaire de publication
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!picked) {
      pickedRef.current?.remove();
      pickedRef.current = null;
      return;
    }
    if (pickedRef.current) pickedRef.current.setLatLng([picked.lat, picked.lng]);
    else pickedRef.current = L.marker([picked.lat, picked.lng], { icon: pinIcon }).addTo(map);
    if (!map.getBounds().contains([picked.lat, picked.lng])) map.setView([picked.lat, picked.lng], 16);
  }, [picked]);

  return <div ref={wrapperRef} className={className} />;
}
