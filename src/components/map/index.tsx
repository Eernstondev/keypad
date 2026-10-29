"use client";

import dynamic from "next/dynamic";

// Leaflet a besoin de `window` : chargement uniquement côté navigateur
export const PropertyMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-sand-100" />,
});

export type { MapBounds, MapMarker } from "./leaflet-map";
