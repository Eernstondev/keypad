"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

export type MapMarker = { id: string; lat: number; lng: number; label?: string; href?: string };

export type LeafletMapProps = {
  markers?: MapMarker[];
  picked?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
};

const HAITI_CENTER: [number, number] = [18.95, -72.6];

// Icône en HTML/CSS : évite les images par défaut de Leaflet, cassées par le bundler
const pin = L.divIcon({ className: "", html: '<span class="ka-pin"></span>', iconSize: [24, 24], iconAnchor: [12, 24] });

function FitToMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  const key = markers.map((m) => `${m.lat},${m.lng}`).join("|");

  useEffect(() => {
    const points = markers.map((m) => [m.lat, m.lng] as [number, number]);
    if (points.length === 1) map.setView(points[0], 15);
    else if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 15 });
    // `key` résume les positions : on ne recadre que si elles changent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

// Sélecteur : clic pour placer le point ; recentre seulement si le point sort de la vue (ex. GPS)
function Picker({
  picked,
  onPick,
}: {
  picked?: { lat: number; lng: number } | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });

  useEffect(() => {
    if (picked && !map.getBounds().contains([picked.lat, picked.lng])) map.setView([picked.lat, picked.lng], 16);
  }, [map, picked]);

  return null;
}

export default function LeafletMap({ markers = [], picked, onPick, className }: LeafletMapProps) {
  return (
    <MapContainer center={HAITI_CENTER} zoom={8} scrollWheelZoom={false} className={className}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToMarkers markers={markers} />
      {onPick && <Picker picked={picked} onPick={onPick} />}
      {picked && <Marker position={[picked.lat, picked.lng]} icon={pin} />}
      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={pin}>
          {m.label && <Popup>{m.href ? <Link href={m.href}>{m.label}</Link> : m.label}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}
