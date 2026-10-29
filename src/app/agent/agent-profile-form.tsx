"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET, initials, mediaUrl, type Agent } from "@/lib/listings";
import { refreshAgentProfile } from "@/app/actions";

const PHOTO_SIDE = 600;

// Photo carrée recadrée au centre, ≈ 60 Ko : rapide même en 3G
async function squarePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(PHOTO_SIDE, side);
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await toBlob("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob("image/jpeg");
  if (!jpeg) throw new Error("compression");
  return jpeg;
}

const textOrNull = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

export function AgentProfileForm({ agent }: { agent: Agent }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  function pickPhoto(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("saving");
    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    let photoPath = agent.photo_path;
    if (photo) {
      try {
        const blob = await squarePhoto(photo.file);
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        const path = `${agent.id}/agent/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(path, blob, { contentType: blob.type });
        if (uploadError) throw uploadError;
        photoPath = path;
      } catch {
        setStatus("idle");
        return setError("L'envoi de la photo a échoué. Vérifiez votre connexion et réessayez.");
      }
    }

    const { error: saveError } = await supabase
      .from("agents")
      .update({
        display_name: String(form.get("display_name") ?? "").trim(),
        agency_name: textOrNull(form.get("agency_name")),
        bio: textOrNull(form.get("bio")),
        phone: textOrNull(form.get("phone")),
        whatsapp: textOrNull(form.get("whatsapp")),
        email: textOrNull(form.get("email")),
        areas: textOrNull(form.get("areas")),
        license_number: textOrNull(form.get("license_number")),
        photo_path: photoPath,
      })
      .eq("id", agent.id);

    if (saveError) {
      // Nouvelle photo envoyée mais profil refusé : on ne laisse pas de fichier orphelin
      if (photo && photoPath && photoPath !== agent.photo_path) await supabase.storage.from(MEDIA_BUCKET).remove([photoPath]);
      setStatus("idle");
      return setError("Profil refusé : vérifiez le nom (2 caractères minimum), les numéros et l'e-mail.");
    }

    // L'ancienne photo n'est plus utilisée : on libère le stockage
    if (photo && agent.photo_path && agent.photo_path !== photoPath) {
      await supabase.storage.from(MEDIA_BUCKET).remove([agent.photo_path]);
    }

    await refreshAgentProfile();
    if (photo) URL.revokeObjectURL(photo.preview);
    setPhoto(null);
    setStatus("saved");
    router.refresh();
  }

  const preview = photo?.preview ?? (agent.photo_path ? mediaUrl(agent.photo_path) : null);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-900 text-2xl font-semibold text-white"
          aria-label="Changer la photo"
        >
          {preview ? <Image src={preview} alt="" fill unoptimized className="object-cover" /> : initials(agent.display_name)}
        </button>
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost !py-2 text-sm">
            {preview ? "Changer la photo" : "Ajouter une photo"}
          </button>
          <p className="mt-1.5 text-xs text-muted">Photo de face, bien éclairée. Elle inspire confiance aux clients.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            pickPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom affiché" name="display_name" defaultValue={agent.display_name} required minLength={2} maxLength={80} />
        <Field label="Agence (facultatif)" name="agency_name" defaultValue={agent.agency_name} maxLength={80} />
        <Field label="Téléphone" name="phone" type="tel" defaultValue={agent.phone} pattern="\+?[0-9 ]{8,16}" placeholder="3844 9148" />
        <Field label="WhatsApp" name="whatsapp" type="tel" defaultValue={agent.whatsapp} pattern="\+?[0-9 ]{8,16}" placeholder="3844 9148" />
        <Field label="E-mail professionnel" name="email" type="email" defaultValue={agent.email} maxLength={120} />
        <Field label="N° de licence (facultatif)" name="license_number" defaultValue={agent.license_number} maxLength={60} />
      </div>
      <Field label="Zones couvertes" name="areas" defaultValue={agent.areas} maxLength={200} placeholder="Pétion-Ville, Delmas, Tabarre" />

      <div>
        <label htmlFor="bio" className="label">Présentation</label>
        <textarea
          id="bio"
          name="bio"
          rows={5}
          maxLength={1500}
          defaultValue={agent.bio ?? undefined}
          className="field"
          placeholder="Votre expérience, vos spécialités, votre façon de travailler…"
        />
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="flex items-center gap-3">
        <button disabled={status === "saving"} className="btn-primary">
          {status === "saving" ? "Enregistrement…" : "Enregistrer le profil"}
        </button>
        {status === "saved" && <span className="text-sm font-medium text-navy-700">Profil mis à jour.</span>}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  ...input
}: { label: string; name: string; defaultValue: string | null } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} defaultValue={defaultValue ?? undefined} className="field" {...input} />
    </div>
  );
}
