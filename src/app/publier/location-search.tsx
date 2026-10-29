"use client";

import { useState } from "react";

type Result = { place_id: number; display_name: string; lat: string; lon: string };

// Recherche d'un lieu en Haïti (OpenStreetMap), pour placer le bien sans chercher à la main sur la carte
export function LocationSearch({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const q = query.trim();
    if (q.length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ht&limit=5&accept-language=fr&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      setResults((await res.json()) as Result[]);
    } catch {
      setError("Recherche indisponible. Placez le point directement sur la carte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Entrée lance la recherche au lieu d'envoyer tout le formulaire
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
          placeholder="Rechercher un lieu : Delmas 75, Route de Frères…"
          className="field"
          aria-label="Rechercher un lieu"
        />
        <button type="button" onClick={search} disabled={loading || query.trim().length < 3} className="btn-ghost shrink-0">
          {loading ? "…" : "Chercher"}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {results && results.length === 0 && (
        <p className="mt-2 text-sm text-muted">Aucun lieu trouvé. Essayez un nom de quartier ou de rue, ou touchez la carte.</p>
      )}
      {results && results.length > 0 && (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(Number(r.lat), Number(r.lon));
                  setResults(null);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-sand-50"
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
