"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
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
  wheelZoom?: boolean; // molette toujours active (grande carte) ; sinon active après un clic sur la carte
  className?: string;
};

type Layer = "plan" | "satellite";

const HAITI_CENTER: L.LatLngTuple = [18.95, -72.6];
const PRECISE_ZOOM = 17;
const round = (n: number) => Math.round(n * 1e4) / 1e4;

const pinIcon = L.divIcon({ className: "", html: '<span class="ka-pin"></span>', iconSize: [24, 24], iconAnchor: [12, 24] });
const meIcon = L.divIcon({ className: "", html: '<span class="ka-me"></span>', iconSize: [16, 16], iconAnchor: [8, 8] });

function priceIcon(price: string) {
  const el = document.createElement("span");
  el.className = "ka-price";
  el.textContent = price; // textContent : aucune injection HTML possible
  return L.divIcon({ className: "", html: el, iconSize: [0, 0], iconAnchor: [0, 0] });
}

// Fonds de carte : plan OpenStreetMap, ou satellite Esri avec noms de rues et de lieux
function createLayers() {
  const plan = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
    maxNativeZoom: 19,
  });
  const esri = (path: string, attribution?: string) =>
    L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${path}/MapServer/tile/{z}/{y}/{x}`, {
      attribution,
      maxZoom: 20,
      maxNativeZoom: 18,
    });
  const satellite = L.layerGroup([
    esri("World_Imagery", "Imagerie &copy; Esri"),
    esri("Reference/World_Transportation"),
    esri("Reference/World_Boundaries_and_Places"),
  ]);
  return { plan, satellite };
}

// Leaflet piloté directement : chaque montage crée et détruit son propre conteneur,
// ce qui évite l'erreur « Map container is being reused » en mode strict de React.
export default function LeafletMap(props: LeafletMapProps) {
  const { markers, activeId, bounds, picked, wheelZoom = false, className } = props;
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<ReturnType<typeof createLayers> | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markerRefs = useRef(new Map<string, L.Marker>());
  const pickedRef = useRef<L.Marker | null>(null);
  const meRef = useRef<L.Marker | null>(null);
  const programmatic = useRef(false);

  const [layer, setLayer] = useState<Layer>("plan");
  const [fullscreen, setFullscreen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Dernières props accessibles depuis les écouteurs Leaflet sans recréer la carte
  const latest = useRef({ props, router });
  useEffect(() => {
    latest.current = { props, router };
  });

  // Création / destruction de la carte
  useEffect(() => {
    const host = hostRef.current!;
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;inset:0";
    host.appendChild(el);

    const map = L.map(el, {
      center: HAITI_CENTER,
      zoom: 8,
      maxZoom: 20,
      zoomSnap: 0.5,
      scrollWheelZoom: wheelZoom,
      wheelPxPerZoomLevel: 90,
      zoomControl: false,
    });
    L.control.zoom({ position: "bottomright", zoomInTitle: "Zoomer", zoomOutTitle: "Dézoomer" }).addTo(map);
    L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

    const layers = createLayers();
    layers.plan.addTo(map);
    layersRef.current = layers;
    markerLayerRef.current = L.layerGroup().addTo(map);

    // Petite carte : la molette ne zoome qu'après un clic, pour ne pas bloquer le défilement de la page
    if (!wheelZoom) {
      map.on("click", () => map.scrollWheelZoom.enable());
      map.on("mouseout", () => map.scrollWheelZoom.disable());
    }

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

    // La carte peut changer de taille (bouton Carte sur mobile, plein écran)
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(host);

    mapRef.current = map;
    const markerMap = markerRefs.current;
    return () => {
      resize.disconnect();
      map.remove();
      el.remove();
      mapRef.current = null;
      layersRef.current = null;
      markerLayerRef.current = null;
      pickedRef.current = null;
      meRef.current = null;
      markerMap.clear();
    };
  }, [wheelZoom]);

  // Changement de fond de carte
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    const [show, hide] = layer === "satellite" ? [layers.satellite, layers.plan] : [layers.plan, layers.satellite];
    if (map.hasLayer(hide)) map.removeLayer(hide);
    if (!map.hasLayer(show)) show.addTo(map);
  }, [layer]);

  // Plein écran : Échap pour sortir, pas de défilement de la page en arrière-plan
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    mapRef.current?.scrollWheelZoom.enable();
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      if (!latest.current.props.wheelZoom) mapRef.current?.scrollWheelZoom.disable();
    };
  }, [fullscreen]);

  // Marqueurs (prix ou épingle) + recadrage
  const markersKey = (markers ?? []).map((m) => `${m.id}:${m.lat},${m.lng}:${m.price ?? ""}`).join("|");
  const boundsKey = bounds ? `${bounds.n},${bounds.s},${bounds.e},${bounds.w}` : "";
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = markerLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markerRefs.current.clear();
    const list = latest.current.props.markers ?? [];

    for (const m of list) {
      const marker = L.marker([m.lat, m.lng], { icon: m.price ? priceIcon(m.price) : pinIcon, keyboard: false });
      marker.on("mouseover", () => latest.current.props.onMarkerHover?.(m.id));
      marker.on("mouseout", () => latest.current.props.onMarkerHover?.(null));
      if (m.href) marker.on("click", () => latest.current.router.push(m.href!));
      marker.addTo(layerGroup);
      markerRefs.current.set(m.id, marker);
    }

    // Sans animation : moveend est émis tout de suite, on l'ignore (pas un geste de l'utilisateur)
    const view = latest.current.props.bounds;
    programmatic.current = true;
    if (view) map.fitBounds([[view.s, view.w], [view.n, view.e]], { animate: false });
    else if (list.length === 1) map.setView([list[0].lat, list[0].lng], 16, { animate: false });
    else if (list.length > 1)
      map.fitBounds(list.map((m) => [m.lat, m.lng] as L.LatLngTuple), { padding: [48, 48], maxZoom: 16, animate: false });
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

  // Point choisi dans le formulaire de publication : déplaçable au doigt ou à la souris
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!picked) {
      pickedRef.current?.remove();
      pickedRef.current = null;
      return;
    }
    if (pickedRef.current) {
      pickedRef.current.setLatLng([picked.lat, picked.lng]);
    } else {
      const marker = L.marker([picked.lat, picked.lng], { icon: pinIcon, draggable: true, autoPan: true });
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        latest.current.props.onPick?.(pos.lat, pos.lng);
      });
      pickedRef.current = marker.addTo(map);
    }
    // Zoom de précision si on est encore loin (recherche d'adresse, GPS, premier clic)
    if (map.getZoom() < 15 || !map.getBounds().contains([picked.lat, picked.lng])) {
      map.setView([picked.lat, picked.lng], Math.max(map.getZoom(), PRECISE_ZOOM));
    }
  }, [picked]);

  function locate() {
    if (!navigator.geolocation) return setNotice("La localisation n'est pas disponible sur cet appareil.");
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const map = mapRef.current;
        if (!map) return;
        const at: L.LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
        meRef.current?.remove();
        meRef.current = L.marker(at, { icon: meIcon, interactive: false, keyboard: false }).addTo(map);
        map.setView(at, PRECISE_ZOOM);
        latest.current.props.onPick?.(at[0], at[1]);
      },
      () => {
        setLocating(false);
        setNotice("Position introuvable. Autorisez la localisation ou placez le point à la main.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  const control =
    "grid size-9 place-items-center rounded-lg bg-white text-navy-900 shadow-md ring-1 ring-black/5 transition hover:bg-sand-50";

  return (
    <div className={fullscreen ? "fixed inset-0 z-[2000] bg-white" : `relative ${className ?? ""}`}>
      <div ref={hostRef} className="absolute inset-0" />

      {/* Contrôles de la carte */}
      <div className="absolute right-2 top-2 z-[500] flex flex-col items-end gap-2">
        <div className="flex overflow-hidden rounded-lg bg-white text-xs font-semibold shadow-md ring-1 ring-black/5">
          {(["plan", "satellite"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLayer(l)}
              aria-pressed={layer === l}
              className={`px-2.5 py-2 transition ${layer === l ? "bg-navy-900 text-white" : "text-navy-900 hover:bg-sand-50"}`}
            >
              {l === "plan" ? "Plan" : "Satellite"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          className={control}
          aria-label={fullscreen ? "Quitter le plein écran" : "Plein écran"}
          title={fullscreen ? "Quitter le plein écran" : "Plein écran"}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
            {fullscreen ? (
              <path d="M8 3v5H3M12 3v5h5M8 17v-5H3M12 17v-5h5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
        <button type="button" onClick={locate} disabled={locating} className={control} aria-label="Ma position" title="Ma position">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={`size-4 ${locating ? "animate-pulse" : ""}`} aria-hidden>
            <circle cx="10" cy="10" r="3.5" />
            <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {notice && (
        <p className="absolute inset-x-2 bottom-10 z-[500] rounded-lg bg-white/95 px-3 py-2 text-xs text-ink shadow-md">
          {notice}
        </p>
      )}
    </div>
  );
}
