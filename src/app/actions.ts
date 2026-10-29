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

// Modération : archiver ou remettre en ligne l'annonce de n'importe qui (admin uniquement, vérifié en base)
export async function adminSetListingStatus(propertyId: string, status: "publie" | "archive") {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("admin_set_listing_status", { p_property_id: propertyId, p_status: status });
  if (error) throw new Error("Action réservée aux administrateurs.");
  invalidate(propertyId);
}

// ───────────── Agents, visites, biens vendus / loués ─────────────

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

// Les messages levés par nos fonctions SQL (P0001 / P0002) sont rédigés pour l'utilisateur
function dbError(error: { code?: string; message: string }, fallback: string): ActionResult {
  return { ok: false, error: error.code === "P0001" || error.code === "P0002" ? error.message : fallback };
}

// Appelée après la mise à jour du profil agent depuis le navigateur
export async function refreshAgentProfile() {
  const { userId } = await requireUser();
  updateTag("agents");
  updateTag(`agent:${userId}`);
  updateTag("properties");
}

export async function closeListing(propertyId: string, reason: "vendu" | "loue") {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("close_listing", { p_property_id: propertyId, p_reason: reason });
  if (error) throw new Error("Impossible de clôturer l'annonce.");
  invalidate(propertyId);
}

export async function requestVisit(propertyId: string, form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { ok: false, error: "Connectez-vous pour demander une visite." };

  const { error } = await supabase.from("visit_requests").insert({
    property_id: propertyId,
    name: String(form.get("name") ?? "").trim().slice(0, 80),
    phone: String(form.get("phone") ?? "").trim(),
    preferred_date: String(form.get("preferred_date") ?? ""),
    preferred_time: String(form.get("preferred_time") ?? ""),
    message: String(form.get("message") ?? "").trim().slice(0, 500) || null,
  });

  if (error) return dbError(error, "Demande refusée : vérifiez votre nom, votre numéro et la date.");
  return { ok: true };
}

export async function respondVisit(
  id: string,
  status: "confirmee" | "refusee" | "effectuee",
  scheduledAt: string | null,
  note: string,
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("respond_visit", {
    p_id: id,
    p_status: status,
    p_scheduled_at: scheduledAt,
    p_note: note.trim() || null,
  });
  if (error) return dbError(error, "Action impossible.");
  refresh();
  return { ok: true };
}

export async function cancelVisit(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("cancel_visit", { p_id: id });
  if (error) return dbError(error, "Annulation impossible.");
  refresh();
  return { ok: true };
}

export async function adminGrantAgent(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const email = String(form.get("email") ?? "").trim();
  const months = Number(form.get("months"));
  const { error } = await supabase.rpc("admin_grant_agent", { p_email: email, p_months: months });
  if (error) return dbError(error, "Action réservée aux administrateurs.");
  updateTag("agents");
  updateTag("properties");
  refresh();
  return { ok: true, message: `Accès agent activé pour ${email} (+${months} mois).` };
}

export async function adminExtendAgent(agentId: string, months: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("admin_extend_agent", { p_user: agentId, p_months: months });
  if (error) throw new Error("Action réservée aux administrateurs.");
  updateTag("agents");
  refresh();
}

export async function adminRevokeAgent(agentId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("admin_revoke_agent", { p_user: agentId });
  if (error) throw new Error("Action réservée aux administrateurs.");
  updateTag("agents");
  updateTag("properties");
  refresh();
}
