"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET, REPORT_REASONS } from "@/lib/listings";

// Chaque action revérifie la session : ne jamais faire confiance au client.
async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/connexion");
  return { supabase, userId: data.claims.sub };
}

function invalidate(propertyId?: string) {
  updateTag("properties");
  if (propertyId) updateTag(`property:${propertyId}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// Appelée après une publication ou une modification faite depuis le navigateur
export async function refreshListings(propertyId?: string) {
  await requireUser();
  invalidate(propertyId);
}

export type ReportResult = { ok: true } | { ok: false; error: "auth" | "duplicate" | "invalid" | "server" };

export async function reportProperty(propertyId: string, reason: string, details: string): Promise<ReportResult> {
  if (!(reason in REPORT_REASONS)) return { ok: false, error: "invalid" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { ok: false, error: "auth" };

  const { error } = await supabase
    .from("reports")
    .insert({ property_id: propertyId, reason, details: details.trim().slice(0, 1000) || null });

  if (error?.code === "23505") return { ok: false, error: "duplicate" };
  if (error) return { ok: false, error: "server" };
  return { ok: true };
}

// Remettre en ligne prolonge aussi l'annonce de 60 jours (voir migration 002)
export async function setListingStatus(propertyId: string, status: "publie" | "archive") {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_listing_status", { p_property_id: propertyId, p_status: status });
  if (error) throw new Error("Impossible de modifier l'annonce.");
  invalidate(propertyId);
}

export async function deleteListing(propertyId: string) {
  const { supabase, userId } = await requireUser();

  const { data: media } = await supabase
    .from("property_media")
    .select("storage_path")
    .eq("property_id", propertyId);

  const { error } = await supabase.from("properties").delete().eq("id", propertyId).eq("owner_id", userId);
  if (error) throw new Error("Impossible de supprimer l'annonce.");

  // Les lignes de photos partent en cascade ; on retire aussi les fichiers
  const paths = (media ?? []).map((m) => m.storage_path);
  if (paths.length) await supabase.storage.from(MEDIA_BUCKET).remove(paths);

  invalidate(propertyId);
}

export async function setVerified(propertyId: string, verified: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_property_verified", {
    p_property_id: propertyId,
    p_verified: verified,
  });
  if (error) throw new Error("Action réservée aux administrateurs.");
  invalidate(propertyId);
}

export async function setReportStatus(reportId: string, status: "traite" | "rejete") {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
  if (error) throw new Error("Action réservée aux administrateurs.");
  refresh();
}
