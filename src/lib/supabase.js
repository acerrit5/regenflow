// ============================================================
// src/lib/supabase.js
// Supabase client + all data-access hooks used by the app
// ============================================================
import { createClient } from "@supabase/supabase-js";

// ── Client ───────────────────────────────────────────────────
// Add these to your .env file:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJhbGci...
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

/**
 * Sign in with email + password.
 * Returns { user, profile, error }
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, profile: null, error };

  const profile = await getProfile(data.user.id);
  return { user: data.user, profile, error: null };
}

/**
 * Sign up a new patient.
 * Creates auth user + profile in one call.
 * clinic_id and role are passed via user metadata → picked up by the DB trigger.
 */
export async function signUp({ email, password, name, clinicId, role = "patient" }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role, clinic_id: clinicId },
    },
  });
  if (error) return { user: null, error };
  return { user: data.user, error: null };
}

/** Sign out the current user */
export async function signOut() {
  return supabase.auth.signOut();
}

/** Get the active session (call on app load) */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Listen for auth state changes */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

// ─────────────────────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, clinics(*)")
    .eq("id", userId)
    .single();
  if (error) { console.error("getProfile:", error); return null; }
  return data;
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Get all patients for a clinic (staff/admin use) */
export async function getClinicPatients(clinicId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("role", "patient")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Get all staff for a clinic */
export async function getClinicStaff(clinicId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("clinic_id", clinicId)
    .in("role", ["clinic_admin", "clinic_staff"])
    .order("name");
  if (error) throw error;
  return data ?? [];
}

/** Invite a new user (creates auth user, trigger creates profile) */
export async function inviteUser({ email, name, role, clinicId, title }) {
  // Uses Supabase Admin API — requires service role key on backend
  // For client-side demo, use signUp instead
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role, clinic_id: clinicId, title },
  });
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// CLINICS
// ─────────────────────────────────────────────────────────────

export async function getClinic(clinicId) {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", clinicId)
    .single();
  if (error) throw error;
  return data;
}

export async function getAllClinics() {
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createClinic({ clinicName, contactEmail, planType }) {
  const slug = clinicName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  const { data, error } = await supabase
    .from("clinics")
    .insert({
      clinic_name: clinicName,
      clinic_slug: slug + "_" + Date.now(),
      contact_email: contactEmail,
      plan_type: planType,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClinic(clinicId, updates) {
  const { data, error } = await supabase
    .from("clinics")
    .update(updates)
    .eq("id", clinicId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleClinicActive(clinicId, isActive) {
  return updateClinic(clinicId, { is_active: isActive });
}

// ─────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────

export async function getPatientTasks(patientId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("patient_id", patientId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getClinicTasks(clinicId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, patient:profiles!tasks_patient_id_fkey(name, email, treatment)")
    .eq("clinic_id", clinicId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateTaskStatus(taskId, status) {
  const updates = {
    status,
    ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
  };
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createTask({ patientId, clinicId, title, taskType, dueDate, formId, consentId }) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ patient_id: patientId, clinic_id: clinicId, title, task_type: taskType, due_date: dueDate, form_id: formId, consent_id: consentId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────

export async function getPatientAppointments(patientId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patientId)
    .order("requested_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getClinicAppointments(clinicId) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, patient:profiles!appointments_patient_id_fkey(name, email, phone, treatment)")
    .eq("clinic_id", clinicId)
    .order("requested_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createAppointment({ patientId, clinicId, requestedDate, requestedTime, reason }) {
  const { data, error } = await supabase
    .from("appointments")
    .insert({ patient_id: patientId, clinic_id: clinicId, requested_date: requestedDate, requested_time: requestedTime, reason })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppointmentStatus(apptId, status) {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", apptId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// PATIENT NOTES
// ─────────────────────────────────────────────────────────────

export async function getPatientNotes(patientId) {
  const { data, error } = await supabase
    .from("patient_notes")
    .select("*, staff:profiles!patient_notes_staff_id_fkey(name, title)")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addPatientNote({ patientId, clinicId, staffId, content }) {
  const { data, error } = await supabase
    .from("patient_notes")
    .insert({ patient_id: patientId, clinic_id: clinicId, staff_id: staffId, content })
    .select("*, staff:profiles!patient_notes_staff_id_fkey(name, title)")
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// INTAKE FORMS
// ─────────────────────────────────────────────────────────────

export async function getClinicIntakeForms(clinicId) {
  const { data, error } = await supabase
    .from("intake_forms")
    .select("*, fields:intake_form_fields(*)")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function createIntakeForm({ clinicId, title, description }) {
  const { data, error } = await supabase
    .from("intake_forms")
    .insert({ clinic_id: clinicId, title, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateIntakeForm(formId, updates) {
  const { data, error } = await supabase
    .from("intake_forms")
    .update(updates)
    .eq("id", formId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitIntakeResponse({ formId, patientId, clinicId, responses }) {
  const { data, error } = await supabase
    .from("intake_responses")
    .upsert({ form_id: formId, patient_id: patientId, clinic_id: clinicId, responses, submitted_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getIntakeResponse(formId, patientId) {
  const { data } = await supabase
    .from("intake_responses")
    .select("*")
    .eq("form_id", formId)
    .eq("patient_id", patientId)
    .single();
  return data;
}

// ─────────────────────────────────────────────────────────────
// CONSENT FORMS
// ─────────────────────────────────────────────────────────────

export async function getClinicConsentForms(clinicId) {
  const { data, error } = await supabase
    .from("consent_forms")
    .select("*, signatures:consent_signatures(*)")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function getPatientConsentStatus(patientId) {
  const { data, error } = await supabase
    .from("consent_signatures")
    .select("*, form:consent_forms(title)")
    .eq("patient_id", patientId);
  if (error) throw error;
  return data ?? [];
}

export async function signConsent({ consentFormId, patientId, clinicId, signatureData }) {
  const { data, error } = await supabase
    .from("consent_signatures")
    .upsert({ consent_form_id: consentFormId, patient_id: patientId, clinic_id: clinicId, signed_at: new Date().toISOString(), signature_data: signatureData })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// INSTRUCTIONS
// ─────────────────────────────────────────────────────────────

export async function getClinicInstructions(clinicId, treatmentTag) {
  let query = supabase
    .from("instructions")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .order("instruction_type");

  if (treatmentTag) {
    query = query.or(`treatment_tag.eq.${treatmentTag},treatment_tag.is.null`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// REMINDERS
// ─────────────────────────────────────────────────────────────

export async function getClinicReminders(clinicId) {
  const { data, error } = await supabase
    .from("reminders")
    .select("*, patient:profiles!reminders_patient_id_fkey(name, email), sender:profiles!reminders_sent_by_fkey(name)")
    .eq("clinic_id", clinicId)
    .order("sent_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function sendReminder({ patientId, clinicId, sentBy, reminderType, channel, message }) {
  const { data, error } = await supabase
    .from("reminders")
    .insert({ patient_id: patientId, clinic_id: clinicId, sent_by: sentBy, reminder_type: reminderType, channel, message })
    .select("*, patient:profiles!reminders_patient_id_fkey(name, email)")
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// UPLOAD REQUESTS
// ─────────────────────────────────────────────────────────────

export async function getClinicUploadRequests(clinicId) {
  const { data, error } = await supabase
    .from("upload_requests")
    .select("*, patient:profiles!upload_requests_patient_id_fkey(name, email, treatment)")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPatientUploadRequests(patientId) {
  const { data, error } = await supabase
    .from("upload_requests")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createUploadRequest({ patientId, clinicId, requestedBy, label, message, dueDate }) {
  const { data, error } = await supabase
    .from("upload_requests")
    .insert({ patient_id: patientId, clinic_id: clinicId, requested_by: requestedBy, label, message, due_date: dueDate })
    .select("*, patient:profiles!upload_requests_patient_id_fkey(name, email)")
    .single();
  if (error) throw error;
  return data;
}

export async function markUploadReviewed(uploadId, reviewerId) {
  const { data, error } = await supabase
    .from("upload_requests")
    .update({ status: "reviewed", reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq("id", uploadId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Upload a file to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadPatientFile(clinicId, patientId, file, uploadRequestId) {
  const ext = file.name.split(".").pop();
  const path = `${clinicId}/${patientId}/${uploadRequestId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("patient-uploads")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("patient-uploads")
    .getPublicUrl(path);

  // Update the upload request record with the file URL
  await supabase
    .from("upload_requests")
    .update({ file_url: urlData.publicUrl, file_name: file.name, status: "fulfilled" })
    .eq("id", uploadRequestId);

  return urlData.publicUrl;
}

// ─────────────────────────────────────────────────────────────
// FOLLOW-UP RESPONSES
// ─────────────────────────────────────────────────────────────

export async function submitFollowupResponse({ patientId, clinicId, questionnaire, answers }) {
  const { data, error } = await supabase
    .from("followup_responses")
    .insert({ patient_id: patientId, clinic_id: clinicId, questionnaire, answers })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPatientFollowups(patientId) {
  const { data, error } = await supabase
    .from("followup_responses")
    .select("*")
    .eq("patient_id", patientId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getClinicFollowups(clinicId) {
  const { data, error } = await supabase
    .from("followup_responses")
    .select("*, patient:profiles!followup_responses_patient_id_fkey(name, email, treatment)")
    .eq("clinic_id", clinicId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// AI INSIGHTS
// ─────────────────────────────────────────────────────────────

export async function getClinicInsights(clinicId) {
  const { data, error } = await supabase
    .from("ai_insights")
    .select("*, patient:profiles!ai_insights_patient_id_fkey(name, email, treatment)")
    .eq("clinic_id", clinicId)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function dismissInsight(insightId) {
  const { error } = await supabase
    .from("ai_insights")
    .update({ is_dismissed: true })
    .eq("id", insightId);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────

export async function logAction({ actorId, clinicId, action, resource, resourceId, meta = {} }) {
  // Fire and forget — don't await, don't throw
  supabase.from("audit_log").insert({
    actor_id: actorId,
    clinic_id: clinicId,
    action,
    resource,
    resource_id: resourceId,
    meta,
  }).then(({ error }) => {
    if (error) console.warn("Audit log failed:", error.message);
  });
}

// ─────────────────────────────────────────────────────────────
// REAL-TIME SUBSCRIPTIONS (optional — wire up in components)
// ─────────────────────────────────────────────────────────────

/**
 * Subscribe to task changes for a patient.
 * Returns the subscription channel — call channel.unsubscribe() in cleanup.
 *
 * Usage:
 *   const channel = subscribeToPatientTasks(patientId, (payload) => {
 *     refetchTasks();
 *   });
 *   return () => channel.unsubscribe();
 */
export function subscribeToPatientTasks(patientId, callback) {
  return supabase
    .channel(`tasks:patient:${patientId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `patient_id=eq.${patientId}` }, callback)
    .subscribe();
}

/**
 * Subscribe to all task changes for a clinic (staff dashboard).
 */
export function subscribeToClinicTasks(clinicId, callback) {
  return supabase
    .channel(`tasks:clinic:${clinicId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `clinic_id=eq.${clinicId}` }, callback)
    .subscribe();
}
