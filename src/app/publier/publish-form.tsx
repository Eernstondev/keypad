"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PropertyMap } from "@/components/map";
import { createClient } from "@/lib/supabase/client";
import { DEPARTMENTS, MEDIA_BUCKET, PROPERTY_TYPES, type TransactionType } from "@/lib/listings";
import { refreshListings } from "@/app/actions";

const MAX_PHOTOS = 8;
const MAX_SIDE = 1600;

type Photo = { file: File; preview: string };

// Mêmes limites que la contrainte SQL sur lat/lng
const inHaiti = (lat: number, lng: number) => lat >= 17.9 && lat <= 20.2 && lng >= -74.6 && lng <= -71.5;

// Réduit chaque photo (≈ 200–400 Ko) avant l'envoi : essentiel sur réseau mobile lent
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.8));
  const webp = await toBlob("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("compression");
  return jpeg;
}

const numberOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim();
  return s === "" ? null : Number(s);
};
const textOrNull = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export function PublishForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [transaction, setTransaction] = useState<TransactionType>("location");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Libère les aperçus restants quand on quitte la page
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_PHOTOS - photos.length)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...added]);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photos[index].preview);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function locateMe() {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setPicked({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("Position indisponible. Placez le point sur la carte."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (photos.length === 0) return setError("Ajoutez au moins une photo.");
    if (picked && !inHaiti(picked.lat, picked.lng)) return setError("La position doit se trouver en Haïti.");

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    setStatus("Création de l'annonce…");
    const { data: property, error: insertError } = await supabase
      .from("properties")
      .insert({
        title: String(form.get("title")).trim(),
        description: textOrNull(form.get("description")),
        property_type: form.get("property_type"),
        transaction_type: transaction,
        price: Number(form.get("price")),
        currency: form.get("currency"),
        price_period: transaction === "location" ? form.get("price_period") : null,
        bedrooms: numberOrNull(form.get("bedrooms")),
        bathrooms: numberOrNull(form.get("bathrooms")),
        area_m2: numberOrNull(form.get("area_m2")),
        department: form.get("department"),
        commune: String(form.get("commune")).trim(),
        neighborhood: textOrNull(form.get("neighborhood")),
        address_hint: textOrNull(form.get("address_hint")),
        lat: picked?.lat ?? null,
        lng: picked?.lng ?? null,
        whatsapp: String(form.get("whatsapp")).trim(),
      })
      .select("id")
      .single();

    if (insertError || !property) {
      setStatus(null);
      return setError("Annonce refusée : vérifiez les champs (titre de 10 caractères minimum, numéro valide…).");
    }

    const uploaded: string[] = [];
    try {
      for (const [i, photo] of photos.entries()) {
        setStatus(`Envoi des photos (${i + 1}/${photos.length})…`);
        const blob = await compress(photo.file);
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/${property.id}/${i}-${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, { contentType: blob.type });
        if (error) throw error;
        uploaded.push(path);
      }

      const { error } = await supabase
        .from("property_media")
        .insert(uploaded.map((storage_path, position) => ({ property_id: property.id, storage_path, position })));
      if (error) throw error;
    } catch {
      // Annule proprement : pas d'annonce sans photos
      if (uploaded.length) await supabase.storage.from(MEDIA_BUCKET).remove(uploaded);
      await supabase.from("properties").delete().eq("id", property.id);
      setStatus(null);
      return setError("L'envoi des photos a échoué. Vérifiez votre connexion et réessayez.");
    }

    setStatus("Publication…");
    await refreshListings();
    router.push(`/annonces/${property.id}`);
  }

  const busy = status !== null;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-8">
      <Section title="Le bien">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-sand-100 p-1">
          {(["location", "vente"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTransaction(t)}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                transaction === t ? "bg-white text-navy-900 shadow-sm" : "text-muted"
              }`}
            >
              {t === "location" ? "À louer" : "À vendre"}
            </button>
          ))}
        </div>

        <Field label="Titre" htmlFor="title">
          <input id="title" name="title" required minLength={10} maxLength={120} className="field"
            placeholder="Maison 3 chambres avec cour à Delmas 75" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type de bien" htmlFor="property_type">
            <select id="property_type" name="property_type" required className="field">
              {Object.entries(PROPERTY_TYPES).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Surface (m²)" htmlFor="area_m2">
            <input id="area_m2" name="area_m2" type="number" min={1} step="any" inputMode="decimal" className="field" />
          </Field>
          <Field label="Chambres" htmlFor="bedrooms">
            <input id="bedrooms" name="bedrooms" type="number" min={0} max={50} inputMode="numeric" className="field" />
          </Field>
          <Field label="Salles de bain" htmlFor="bathrooms">
            <input id="bathrooms" name="bathrooms" type="number" min={0} max={50} inputMode="numeric" className="field" />
          </Field>
        </div>

        <Field label="Description" htmlFor="description">
          <textarea id="description" name="description" rows={5} maxLength={4000} className="field"
            placeholder="Eau, électricité, sécurité, accès à la route, état du bien…" />
        </Field>
      </Section>

      <Section title="Prix">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Montant" htmlFor="price">
            <input id="price" name="price" type="number" required min={1} step="any" inputMode="numeric" className="field" />
          </Field>
          <Field label="Devise" htmlFor="currency">
            <select id="currency" name="currency" className="field">
              <option value="HTG">Gourdes (HTG)</option>
              <option value="USD">Dollars US (USD)</option>
            </select>
          </Field>
          {transaction === "location" && (
            <Field label="Période" htmlFor="price_period">
              <select id="price_period" name="price_period" className="field">
                <option value="annee">Par an</option>
                <option value="mois">Par mois</option>
              </select>
            </Field>
          )}
        </div>
      </Section>

      <Section title="Emplacement">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Département" htmlFor="department">
            <select id="department" name="department" required className="field">
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Commune" htmlFor="commune">
            <input id="commune" name="commune" required maxLength={60} className="field" placeholder="Delmas" />
          </Field>
          <Field label="Quartier" htmlFor="neighborhood">
            <input id="neighborhood" name="neighborhood" maxLength={80} className="field" placeholder="Delmas 75" />
          </Field>
        </div>
        <Field label="Repère (facultatif)" htmlFor="address_hint">
          <input id="address_hint" name="address_hint" maxLength={200} className="field"
            placeholder="Après l'église, portail bleu" />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="label !mb-0">Position sur la carte (recommandé)</span>
            <button type="button" onClick={locateMe} className="text-sm font-semibold text-navy-700">
              Utiliser ma position
            </button>
          </div>
          <div className="h-72 overflow-hidden rounded-2xl border border-line">
            <PropertyMap picked={picked} onPick={(lat, lng) => setPicked({ lat, lng })} className="h-full w-full" />
          </div>
          <p className="mt-2 text-xs text-muted">
            {picked ? "Point placé. Touchez la carte pour le déplacer." : "Touchez la carte pour placer le bien."}
          </p>
        </div>
      </Section>

      <Section title={`Photos (${photos.length}/${MAX_PHOTOS})`}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div key={p.preview} className="relative aspect-square overflow-hidden rounded-xl bg-sand-100">
              <Image src={p.preview} alt="" fill unoptimized className="object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-sm text-white"
                aria-label="Retirer la photo"
              >
                ×
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-[11px] font-semibold">
                  Couverture
                </span>
              )}
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-center text-sm text-muted hover:border-navy-700/40">
              + Ajouter
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      </Section>

      <Section title="Contact">
        <Field label="Numéro WhatsApp" htmlFor="whatsapp">
          <input id="whatsapp" name="whatsapp" required type="tel" inputMode="tel"
            pattern="\+?[0-9 ]{8,16}" className="field" placeholder="3844 9148" />
        </Field>
        <p className="text-xs text-muted">Les acheteurs et locataires vous contacteront directement sur ce numéro.</p>
      </Section>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <button disabled={busy} className="btn-primary w-full !py-3.5">
        {status ?? "Publier l'annonce"}
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-line bg-white p-5">
      <legend className="px-1 text-sm font-bold uppercase tracking-wider text-gold-600">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
    </div>
  );
}
