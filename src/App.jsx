import { useState, useEffect, createContext, useContext, useRef, useCallback } from "react";
import {
  supabase,
  signIn, signOut, signUp, getSession, onAuthStateChange,
  getProfile, updateProfile,
  getClinicPatients, getClinicStaff,
  getAllClinics, getClinic, createClinic, updateClinic, toggleClinicActive,
  getPatientTasks, getClinicTasks, updateTaskStatus, createTask,
  getPatientAppointments, getClinicAppointments, createAppointment, updateAppointmentStatus,
  getPatientNotes, addPatientNote,
  getClinicIntakeForms, createIntakeForm, updateIntakeForm, submitIntakeResponse, getIntakeResponse,
  getClinicConsentForms, getPatientConsentStatus, signConsent,
  getClinicInstructions,
  getClinicReminders, sendReminder,
  getClinicUploadRequests, getPatientUploadRequests, createUploadRequest, markUploadReviewed,
  submitFollowupResponse, getPatientFollowups, getClinicFollowups,
  getClinicInsights, dismissInsight,
  logAction,
} from "./lib/supabase";

// ─────────────────────────────────────────────────────────────
// DESIGN SYSTEM  (unchanged from original)
// ─────────────────────────────────────────────────────────────
const DS = {
  fonts: {
    display: "'Cormorant Garamond', 'Didot', 'Big Caslon', Georgia, serif",
    body: "'DM Sans', 'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  colors: {
    ink: "#0A0A0F",
    surface: "#FAFAF8",
    white: "#FFFFFF",
    border: "#EAEAE6",
    muted: "#9898A0",
    primary: "#1C4532",
    primaryLight: "#E8F0EC",
    primaryMid: "#2D6A4F",
    accent: "#C8A96A",
    accentLight: "#F9F3E8",
    success: "#059669",
    warning: "#D97706",
    danger: "#DC2626",
    purple: "#6D28D9",
    blue: "#1D4ED8",
    aiGradient: "linear-gradient(135deg, #1C4532 0%, #2D6A4F 50%, #C8A96A 100%)",
    subtleGrad: "linear-gradient(180deg, #FAFAF8 0%, #FFFFFF 100%)",
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  shadow: {
    sm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    md: "0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)",
    lg: "0 12px 32px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.04)",
    xl: "0 24px 64px rgba(0,0,0,0.12)",
  },
};

const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:${DS.fonts.body};background:${DS.colors.surface};color:${DS.colors.ink};}
    ::-webkit-scrollbar{width:5px;}
    ::-webkit-scrollbar-track{background:${DS.colors.surface};}
    ::-webkit-scrollbar-thumb{background:#D1D1CC;border-radius:3px;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
    @keyframes slideIn{from{opacity:0;transform:translateX(-12px);}to{opacity:1;transform:translateX(0);}}
    @keyframes slideInLeft{from{opacity:0;transform:translateX(-100%);}to{opacity:1;transform:translateX(0);}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
    @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
    .anim-fade-up{animation:fadeUp 0.5s ease forwards;}
    .anim-slide{animation:slideIn 0.3s ease forwards;}
    .patient-row:hover{background:#F7F7F5 !important;}
    input,textarea,select{font-family:${DS.fonts.body};}
    button{font-family:${DS.fonts.body};}
    @media(max-width:768px){
      .hide-mobile{display:none !important;}
      .stack-mobile{flex-direction:column !important;}
      .grid-1-mobile{grid-template-columns:1fr !important;}
      .pad-mobile{padding:16px !important;}
      .pad-h-mobile{padding-left:16px !important;padding-right:16px !important;}
    }
  `}</style>
);

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024 && window.innerWidth > 768);
  useEffect(() => {
    const h = () => { setMobile(window.innerWidth <= 768); setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 768); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { isMobile: mobile, isTablet, isSmall: mobile || isTablet };
}

// ─────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const statusColor = s => ({ completed: DS.colors.success, in_progress: DS.colors.warning, not_started: "#C4C4C0" }[s] || "#C4C4C0");
const statusLabel = s => ({ completed: "Completed", in_progress: "In Progress", not_started: "Not Started" }[s] || s);

// ─────────────────────────────────────────────────────────────
// PRIMITIVES  (Avatar, Chip, Card, Btn, Input, Textarea — identical to original)
// ─────────────────────────────────────────────────────────────
function Avatar({ name = "", size = 36, color = DS.colors.primary }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: DS.radius.full, background: color + "18", border: `1.5px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.32, color, fontFamily: DS.fonts.body, flexShrink: 0, letterSpacing: "0.05em" }}>
      {initials}
    </div>
  );
}

function Chip({ children, color = DS.colors.primary, dot = false, size = "sm" }) {
  const sz = size === "sm" ? { fontSize: 11, padding: "3px 10px" } : { fontSize: 12, padding: "4px 12px" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, borderRadius: DS.radius.full, fontWeight: 600, background: color + "14", color, letterSpacing: "0.03em", ...sz }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />}
      {children}
    </span>
  );
}

function Card({ children, style = {}, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: DS.colors.white, borderRadius: DS.radius.lg, border: `1px solid ${DS.colors.border}`, boxShadow: hov && onClick ? DS.shadow.lg : DS.shadow.sm, padding: 24, transition: "all 0.2s ease", cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", style = {}, disabled = false, size = "md", loading = false }) {
  const [hov, setHov] = useState(false);
  const sizes = { sm: { fontSize: 12, padding: "7px 14px", borderRadius: DS.radius.sm }, md: { fontSize: 13.5, padding: "10px 20px", borderRadius: DS.radius.md }, lg: { fontSize: 15, padding: "14px 28px", borderRadius: DS.radius.md } };
  const variants = {
    primary: { background: hov ? DS.colors.primaryMid : DS.colors.primary, color: "#fff", border: "none", boxShadow: hov ? DS.shadow.md : "none" },
    secondary: { background: hov ? "#F0F0EC" : DS.colors.surface, color: DS.colors.ink, border: `1px solid ${DS.colors.border}` },
    ghost: { background: "transparent", color: DS.colors.muted, border: "none" },
    danger: { background: hov ? "#FEE2E2" : "#FFF5F5", color: DS.colors.danger, border: `1px solid #FECACA` },
    accent: { background: hov ? "#B8953A" : DS.colors.accent, color: "#fff", border: "none" },
  };
  return (
    <button disabled={disabled || loading} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: DS.fonts.body, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", outline: "none", transition: "all 0.15s ease", opacity: disabled ? 0.55 : 1, letterSpacing: "0.01em", ...sizes[size], ...variants[variant], ...style }}>
      {loading ? <span style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> : children}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, required, helper, style = {}, onEnter }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}{required && <span style={{ color: DS.colors.danger }}> *</span>}</label>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onKeyDown={e => e.key === "Enter" && onEnter && onEnter()}
        style={{ border: `1.5px solid ${focused ? DS.colors.primary : DS.colors.border}`, borderRadius: DS.radius.md, padding: "11px 14px", fontSize: 14, color: DS.colors.ink, outline: "none", background: "#FAFAF8", transition: "border-color 0.15s", fontFamily: DS.fonts.body }} />
      {helper && <span style={{ fontSize: 11, color: DS.colors.muted }}>{helper}</span>}
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, required, rows = 4, style = {} }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}{required && <span style={{ color: DS.colors.danger }}> *</span>}</label>}
      <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ border: `1.5px solid ${focused ? DS.colors.primary : DS.colors.border}`, borderRadius: DS.radius.md, padding: "11px 14px", fontSize: 14, color: DS.colors.ink, outline: "none", background: "#FAFAF8", resize: "vertical", fontFamily: DS.fonts.body, transition: "border-color 0.15s" }} />
    </div>
  );
}

function Modal({ open, onClose, title, subtitle, children, width = 480 }) {
  useEffect(() => { if (open) document.body.style.overflow = "hidden"; else document.body.style.overflow = ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,15,0.45)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: DS.colors.white, borderRadius: DS.radius.xl, boxShadow: DS.shadow.xl, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto", animation: "fadeUp 0.25s ease" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: `1px solid ${DS.colors.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: DS.colors.ink }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: DS.colors.muted, marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: DS.colors.surface, border: `1px solid ${DS.colors.border}`, borderRadius: DS.radius.md, cursor: "pointer", padding: "5px 8px", color: DS.colors.muted }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

function PageHead({ title, subtitle, actions, eyebrow }) {
  const { isMobile } = useIsMobile();
  return (
    <div style={{ padding: isMobile ? "16px 16px 14px" : "28px 36px 22px", borderBottom: `1px solid ${DS.colors.border}`, background: DS.colors.white, display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
      <div>
        {eyebrow && <div style={{ fontSize: 11, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{eyebrow}</div>}
        <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: DS.colors.ink, letterSpacing: "-0.4px" }}>{title}</h1>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: DS.colors.muted }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{actions}</div>}
    </div>
  );
}

// Loading spinner used throughout
function Spinner({ size = 24, color = DS.colors.primary }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ width: size, height: size, border: `2.5px solid ${color}20`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// APP PROVIDER  — replaces all useState(SEED.*) with Supabase
// ─────────────────────────────────────────────────────────────
function AppProvider({ children }) {
  const [page, setPage] = useState("home");
  const [authUser, setAuthUser] = useState(null);       // raw Supabase auth user
  const [profile, setProfile] = useState(null);         // profiles row (includes clinic)
  const [authLoading, setAuthLoading] = useState(true); // true while session is being checked
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [toast, setToast] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiChat, setAiChat] = useState([]);

  const clinic = profile?.clinics ?? null;
  const currentUser = profile;
  const primaryColor = clinic?.primary_color || DS.colors.primary;

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Session bootstrap ────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    getSession().then(async session => {
      if (!mounted) return;
      if (session?.user) {
        setAuthUser(session.user);
        const p = await getProfile(session.user.id);
        if (mounted) {
          setProfile(p);
          if (p) navigateByRole(p.role);
        }
      }
      if (mounted) setAuthLoading(false);
    });

    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session?.user) {
        setAuthUser(session.user);
        const p = await getProfile(session.user.id);
        if (mounted) {
          setProfile(p);
          if (p) navigateByRole(p.role);
        }
      } else if (event === "SIGNED_OUT") {
        setAuthUser(null);
        setProfile(null);
        setPage("home");
        setAiChat([]);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  function navigateByRole(role) {
    if (role === "patient") setPage("patient_dashboard");
    else if (role === "super_admin") setPage("sa_dashboard");
    else setPage("admin_dashboard");
  }

  // ── Auth actions ─────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { profile: p, error } = await signIn(email, password);
    if (error) return { error: error.message };
    if (!p) return { error: "Profile not found. Please contact support." };
    setProfile(p);
    logAction({ actorId: p.id, clinicId: p.clinic_id, action: "login" });
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    if (profile) logAction({ actorId: profile.id, clinicId: profile.clinic_id, action: "logout" });
    await signOut();
  }, [profile]);

  const registerPatient = useCallback(async ({ email, password, name, clinicId }) => {
    const { error } = await signUp({ email, password, name, clinicId, role: "patient" });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  // ── Task helpers ─────────────────────────────────────────
  const doUpdateTask = useCallback(async (taskId, status) => {
    try {
      await updateTaskStatus(taskId, status);
      logAction({ actorId: profile?.id, clinicId: profile?.clinic_id, action: "update_task", resource: "tasks", resourceId: taskId, meta: { status } });
      showToast("Task updated");
    } catch (e) {
      showToast(e.message, "error");
    }
  }, [profile, showToast]);

  const doAddNote = useCallback(async (patientId, content) => {
    try {
      const note = await addPatientNote({ patientId, clinicId: profile.clinic_id, staffId: profile.id, content });
      logAction({ actorId: profile.id, clinicId: profile.clinic_id, action: "add_note", resource: "patient_notes", resourceId: note.id });
      showToast("Note saved");
      return note;
    } catch (e) {
      showToast(e.message, "error");
    }
  }, [profile, showToast]);

  const doAddAppointment = useCallback(async (patientId, data) => {
    try {
      const appt = await createAppointment({ patientId, clinicId: profile?.clinic_id, ...data });
      showToast("Appointment request submitted");
      return appt;
    } catch (e) {
      showToast(e.message, "error");
    }
  }, [profile, showToast]);

  const doSendReminder = useCallback(async (patientId, data) => {
    try {
      const reminder = await sendReminder({ patientId, clinicId: profile.clinic_id, sentBy: profile.id, ...data });
      showToast(`Reminder sent`);
      return reminder;
    } catch (e) {
      showToast(e.message, "error");
    }
  }, [profile, showToast]);

  const doCreateUploadRequest = useCallback(async (patientId, data) => {
    try {
      const req = await createUploadRequest({ patientId, clinicId: profile.clinic_id, requestedBy: profile.id, ...data });
      // Also create a task for the patient
      await createTask({ patientId, clinicId: profile.clinic_id, title: data.label || "Upload Requested Document", taskType: "upload", dueDate: data.dueDate });
      showToast("Upload request sent");
      return req;
    } catch (e) {
      showToast(e.message, "error");
    }
  }, [profile, showToast]);

  // ── AI assistant ─────────────────────────────────────────
  const runAI = useCallback(async (prompt) => {
    setAiThinking(true);
    setAiChat(prev => [...prev, { role: "user", text: prompt }]);

    // In production: replace this with a real Anthropic API call
    // using the fetch pattern from the artifact API docs
    await new Promise(r => setTimeout(r, 1200));
    const key = prompt.toLowerCase().includes("risk") ? "risk"
      : prompt.toLowerCase().includes("draft") || prompt.toLowerCase().includes("message") ? "draft"
      : prompt.toLowerCase().includes("welcome") ? "welcome"
      : "default";
    const responses = {
      risk: "I've analyzed your active patients. The highest risk is a patient with an overdue upload task blocking treatment clearance. I recommend sending a personalized SMS today.",
      draft: "Here's a draft reminder message:\n\n'Hi [Name] — your consent form is still pending signature. It only takes 2 minutes and is required before we can confirm your appointment. [Portal Link]'",
      welcome: "Welcome sequence triggered. I've queued: (1) branded welcome email, (2) SMS with portal link, (3) 48-hour follow-up if no tasks started.",
      default: "Here's your clinic summary:\n\n• Review active patients with overdue tasks\n• Check pending consent forms\n• Send follow-up reminders to any patients who haven't started intake\n\nWould you like me to draft any messages or flag specific patients?",
    };
    setAiChat(prev => [...prev, { role: "ai", text: responses[key] }]);
    setAiThinking(false);
  }, []);

  return (
    <AppCtx.Provider value={{
      page, setPage,
      currentUser: profile,
      authUser,
      authLoading,
      clinic,
      primaryColor,
      login, logout, registerPatient,
      showToast,
      doUpdateTask,
      doAddNote,
      doAddAppointment,
      doSendReminder,
      doCreateUploadRequest,
      selectedPatientId, setSelectedPatientId,
      aiThinking, aiChat, runAI,
    }}>
      <FontLoader />
      {children}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, background: toast.type === "success" ? DS.colors.primary : DS.colors.danger, color: "#fff", padding: "13px 22px", borderRadius: DS.radius.md, fontWeight: 600, fontSize: 13.5, zIndex: 9999, boxShadow: DS.shadow.xl, animation: "fadeUp 0.3s ease", display: "flex", alignItems: "center", gap: 8 }}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}
    </AppCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// AUTH PAGES
// ─────────────────────────────────────────────────────────────
function LoginPage() {
  const { login, setPage, showToast } = useApp();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const doLogin = async () => {
    if (!email || !pw) { setErr("Please enter your email and password."); return; }
    setLoading(true);
    setErr("");
    const { error } = await login(email, pw);
    if (error) { setErr(error); setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DS.colors.surface, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: DS.radius.md, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18, margin: "0 auto 16px" }}>RF</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: DS.colors.ink, margin: "0 0 6px" }}>Sign in to RegenFlow</h1>
          <p style={{ fontSize: 14, color: DS.colors.muted }}>Enter your credentials to continue</p>
        </div>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@clinic.com" onEnter={doLogin} />
            <Input label="Password" value={pw} onChange={setPw} type="password" placeholder="••••••••" onEnter={doLogin} />
            {err && <div style={{ background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: DS.radius.md, padding: "10px 14px", fontSize: 13, color: DS.colors.danger }}>{err}</div>}
            <Btn onClick={doLogin} loading={loading} style={{ width: "100%", justifyContent: "center" }}>Sign In</Btn>
            <div style={{ textAlign: "center", fontSize: 13, color: DS.colors.muted }}>
              <button onClick={() => setPage("forgot")} style={{ background: "none", border: "none", color: DS.colors.primary, cursor: "pointer", fontFamily: DS.fonts.body, fontSize: 13 }}>Forgot password?</button>
            </div>
          </div>
        </Card>
        <p style={{ textAlign: "center", fontSize: 13, color: DS.colors.muted, marginTop: 20 }}>
          Patient?{" "}
          <button onClick={() => setPage("signup")} style={{ background: "none", border: "none", color: DS.colors.primary, cursor: "pointer", fontFamily: DS.fonts.body, fontSize: 13, fontWeight: 600 }}>Create an account</button>
        </p>
      </div>
    </div>
  );
}

function SignupPage() {
  const { registerPatient, setPage, showToast } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [clinicSlug, setClinicSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const doSignup = async () => {
    if (!name || !email || !pw) { setErr("Please fill in all fields."); return; }
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setLoading(true);
    setErr("");

    // Look up clinic by slug to get clinic_id
    const { data: clinics } = await supabase
      .from("clinics")
      .select("id")
      .eq("clinic_slug", clinicSlug.toLowerCase().trim())
      .single();

    if (!clinics) { setErr("Clinic not found. Please check your clinic code."); setLoading(false); return; }

    const { error } = await registerPatient({ email, password: pw, name, clinicId: clinics.id });
    if (error) { setErr(error); setLoading(false); return; }

    showToast("Account created! Check your email to verify.");
    setPage("login");
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DS.colors.surface, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: DS.radius.md, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18, margin: "0 auto 16px" }}>RF</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: DS.colors.ink, margin: "0 0 6px" }}>Create your patient account</h1>
          <p style={{ fontSize: 14, color: DS.colors.muted }}>Your clinic should have given you a clinic code</p>
        </div>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Full Name" value={name} onChange={setName} placeholder="Jordan Rivera" required />
            <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@email.com" required />
            <Input label="Password" value={pw} onChange={setPw} type="password" placeholder="Min 8 characters" required />
            <Input label="Clinic Code" value={clinicSlug} onChange={setClinicSlug} placeholder="e.g. precisionpointe" helper="Given to you by your clinic" required />
            {err && <div style={{ background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: DS.radius.md, padding: "10px 14px", fontSize: 13, color: DS.colors.danger }}>{err}</div>}
            <Btn onClick={doSignup} loading={loading} style={{ width: "100%", justifyContent: "center" }}>Create Account</Btn>
          </div>
        </Card>
        <p style={{ textAlign: "center", fontSize: 13, color: DS.colors.muted, marginTop: 20 }}>
          Already have an account?{" "}
          <button onClick={() => setPage("login")} style={{ background: "none", border: "none", color: DS.colors.primary, cursor: "pointer", fontFamily: DS.fonts.body, fontSize: 13, fontWeight: 600 }}>Sign in</button>
        </p>
      </div>
    </div>
  );
}

function ForgotPage() {
  const { setPage } = useApp();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const doReset = async () => {
    if (!email) return;
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
    setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DS.colors.surface, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <Card>
          {sent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: DS.colors.ink, marginBottom: 8 }}>Check your email</div>
              <div style={{ fontSize: 14, color: DS.colors.muted, marginBottom: 20 }}>We sent a password reset link to {email}</div>
              <Btn variant="secondary" onClick={() => setPage("login")}>Back to Sign In</Btn>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: DS.colors.ink, marginBottom: 4 }}>Reset your password</div>
                <div style={{ fontSize: 13, color: DS.colors.muted }}>Enter your email and we'll send you a reset link.</div>
              </div>
              <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@clinic.com" onEnter={doReset} />
              <Btn onClick={doReset} loading={loading} style={{ width: "100%", justifyContent: "center" }}>Send Reset Link</Btn>
              <button onClick={() => setPage("login")} style={{ background: "none", border: "none", color: DS.colors.muted, cursor: "pointer", fontSize: 13, fontFamily: DS.fonts.body }}>← Back to Sign In</button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────
function Sidebar({ items, active, onSelect, user, clinic, onLogout, primaryColor }) {
  const { isMobile, isTablet } = useIsMobile();
  const [open, setOpen] = useState(false);
  const isCollapsed = isMobile || isTablet;

  const handleSelect = (key) => { onSelect(key); if (isCollapsed) setOpen(false); };

  const SidebarInner = () => (
    <div style={{ width: isCollapsed ? 260 : 232, background: DS.colors.white, borderRight: `1px solid ${DS.colors.border}`, display: "flex", flexDirection: "column", height: "100vh", overflowY: "auto" }}>
      <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${DS.colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: DS.radius.md, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>RF</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: DS.colors.ink }}>RegenFlow</div>
            {clinic && <div style={{ fontSize: 10.5, color: DS.colors.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clinic.clinic_name}</div>}
          </div>
          {isCollapsed && <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: DS.colors.muted, padding: 4 }}>✕</button>}
        </div>
      </div>
      <nav style={{ flex: 1, padding: "10px" }}>
        {items.map(item => (
          <button key={item.key} onClick={() => handleSelect(item.key)}
            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 11px", borderRadius: DS.radius.md, border: "none", background: active === item.key ? primaryColor + "14" : "transparent", color: active === item.key ? primaryColor : DS.colors.muted, fontWeight: active === item.key ? 600 : 400, fontSize: 13, cursor: "pointer", marginBottom: 1, textAlign: "left", transition: "all 0.12s", fontFamily: DS.fonts.body }}>
            {item.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: 14, borderTop: `1px solid ${DS.colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
          <Avatar name={user?.name} size={32} color={primaryColor} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: DS.colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</div>
            <div style={{ fontSize: 10.5, color: DS.colors.muted }}>{user?.title || user?.role?.replace("_", " ")}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: 9, borderRadius: DS.radius.md, border: "none", background: "#FFF5F5", color: DS.colors.danger, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body }}>Sign Out</button>
      </div>
    </div>
  );

  if (isCollapsed) {
    return (
      <>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: DS.colors.white, borderBottom: `1px solid ${DS.colors.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 200 }}>
          <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: DS.colors.ink, padding: 6 }}>☰</button>
          <div style={{ width: 28, height: 28, borderRadius: DS.radius.sm, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>RF</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>RegenFlow</span>
        </div>
        {open && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setOpen(false)} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, animation: "slideInLeft 0.25s ease", zIndex: 301 }}><SidebarInner /></div>
          </div>
        )}
      </>
    );
  }

  return <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100 }}><SidebarInner /></div>;
}

// ─────────────────────────────────────────────────────────────
// PATIENT PORTAL
// ─────────────────────────────────────────────────────────────
function PatientPortal() {
  const { currentUser, clinic, primaryColor, logout, doUpdateTask, doAddAppointment, setPage } = useApp();
  const { isMobile } = useIsMobile();
  const [tab, setTab] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [consentStatus, setConsentStatus] = useState([]);
  const [uploadRequests, setUploadRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    const [t, a, instr, cs, ur] = await Promise.all([
      getPatientTasks(currentUser.id),
      getPatientAppointments(currentUser.id),
      getClinicInstructions(currentUser.clinic_id, currentUser.treatment),
      getPatientConsentStatus(currentUser.id),
      getPatientUploadRequests(currentUser.id),
    ]);
    setTasks(t);
    setAppointments(a);
    setInstructions(instr);
    setConsentStatus(cs);
    setUploadRequests(ur);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleUpdateTask = async (taskId, status) => {
    await doUpdateTask(taskId, status);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, completed_at: status === "completed" ? new Date().toISOString() : t.completed_at } : t));
  };

  const handleAddAppointment = async (data) => {
    const appt = await doAddAppointment(currentUser.id, data);
    if (appt) setAppointments(prev => [...prev, appt]);
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "tasks", label: "My Tasks" },
    { key: "appointments", label: "Appointments" },
    { key: "consent", label: "Consent Forms" },
    { key: "instructions", label: "Instructions" },
    { key: "uploads", label: "My Uploads" },
    { key: "profile", label: "My Profile" },
  ];

  const completed = tasks.filter(t => t.status === "completed").length;
  const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: DS.colors.surface }}>
      <Sidebar items={navItems} active={tab} onSelect={setTab} user={currentUser} clinic={clinic} onLogout={logout} primaryColor={primaryColor} />
      <main style={{ flex: 1, marginLeft: isMobile ? 0 : 232, marginTop: isMobile ? 56 : 0, overflowY: "auto" }}>
        {loading ? <Spinner /> : (
          <>
            {tab === "dashboard" && (
              <div>
                <PageHead title={`Welcome back, ${currentUser.name?.split(" ")[0]}`} subtitle={clinic?.tagline || ""} />
                <div style={{ padding: "24px 32px" }}>
                  {/* Progress card */}
                  <Card style={{ marginBottom: 24, background: DS.colors.primary }}>
                    <div style={{ color: "#fff" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.7, marginBottom: 4 }}>CARE JOURNEY PROGRESS</div>
                      <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{pct}% Complete</div>
                      <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 99, height: 6, marginBottom: 12 }}>
                        <div style={{ background: DS.colors.accent, height: 6, borderRadius: 99, width: `${pct}%`, transition: "width 0.5s ease" }} />
                      </div>
                      <div style={{ fontSize: 13, opacity: 0.8 }}>{completed} of {tasks.length} tasks completed</div>
                    </div>
                  </Card>
                  {/* Pending tasks */}
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Pending Tasks</div>
                  {tasks.filter(t => t.status !== "completed").length === 0 ? (
                    <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>All tasks complete! 🎉</div></Card>
                  ) : (
                    tasks.filter(t => t.status !== "completed").map(task => (
                      <Card key={task.id} style={{ marginBottom: 10, padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(task.status), flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                            <div style={{ fontSize: 12, color: DS.colors.muted }}>Due {task.due_date} · {task.task_type}</div>
                          </div>
                          <Chip color={statusColor(task.status)} dot>{statusLabel(task.status)}</Chip>
                          <Btn size="sm" variant="secondary" onClick={() => handleUpdateTask(task.id, task.status === "not_started" ? "in_progress" : "completed")}>
                            {task.status === "not_started" ? "Start" : "Complete"}
                          </Btn>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === "tasks" && (
              <div>
                <PageHead title="My Tasks" subtitle="Complete all tasks to prepare for your treatment" />
                <div style={{ padding: "24px 32px" }}>
                  {tasks.map(task => (
                    <Card key={task.id} style={{ marginBottom: 10, padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(task.status), flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{task.title}</div>
                          <div style={{ fontSize: 12, color: DS.colors.muted }}>Due {task.due_date} · {task.task_type}</div>
                        </div>
                        <Chip color={statusColor(task.status)} dot>{statusLabel(task.status)}</Chip>
                        {task.status !== "completed" && (
                          <Btn size="sm" variant="secondary" onClick={() => handleUpdateTask(task.id, task.status === "not_started" ? "in_progress" : "completed")}>
                            {task.status === "not_started" ? "Start" : "Mark Complete"}
                          </Btn>
                        )}
                      </div>
                    </Card>
                  ))}
                  {tasks.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No tasks assigned yet.</div></Card>}
                </div>
              </div>
            )}

            {tab === "appointments" && (
              <PatientAppointments appointments={appointments} onAdd={handleAddAppointment} clinicId={currentUser.clinic_id} />
            )}

            {tab === "consent" && (
              <PatientConsents patientId={currentUser.id} clinicId={currentUser.clinic_id} consentStatus={consentStatus} onRefresh={fetchAll} />
            )}

            {tab === "instructions" && (
              <div>
                <PageHead title="Treatment Instructions" subtitle="Follow these guidelines before and after your treatment" />
                <div style={{ padding: "24px 32px" }}>
                  {instructions.map(instr => (
                    <Card key={instr.id} style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{instr.title}</div>
                      <Chip color={instr.instruction_type === "pre_visit" ? DS.colors.blue : DS.colors.success} size="sm" style={{ marginBottom: 14 }}>{instr.instruction_type === "pre_visit" ? "Pre-Treatment" : "Post-Treatment"}</Chip>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {instr.content.map((c, i) => (
                          <li key={i} style={{ fontSize: 14, color: DS.colors.ink, marginBottom: 6, lineHeight: 1.6 }}>{c}</li>
                        ))}
                      </ul>
                    </Card>
                  ))}
                  {instructions.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No instructions available yet.</div></Card>}
                </div>
              </div>
            )}

            {tab === "uploads" && (
              <div>
                <PageHead title="My Uploads" subtitle="Upload documents requested by your care team" />
                <div style={{ padding: "24px 32px" }}>
                  {uploadRequests.map(ur => (
                    <Card key={ur.id} style={{ marginBottom: 12, padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{ur.label}</div>
                          {ur.message && <div style={{ fontSize: 12, color: DS.colors.muted, marginTop: 2 }}>{ur.message}</div>}
                          {ur.due_date && <div style={{ fontSize: 11, color: DS.colors.muted, marginTop: 2 }}>Due {ur.due_date}</div>}
                        </div>
                        <Chip color={ur.status === "fulfilled" ? DS.colors.success : ur.status === "reviewed" ? DS.colors.purple : DS.colors.warning} dot>{ur.status}</Chip>
                      </div>
                    </Card>
                  ))}
                  {uploadRequests.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No upload requests yet.</div></Card>}
                </div>
              </div>
            )}

            {tab === "profile" && (
              <PatientProfileTab profile={currentUser} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PatientAppointments({ appointments, onAdd, clinicId }) {
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!date || !time) return;
    setLoading(true);
    await onAdd({ requestedDate: date, requestedTime: time, reason });
    setShowModal(false);
    setDate(""); setTime(""); setReason("");
    setLoading(false);
  };

  return (
    <div>
      <PageHead title="Appointments" subtitle="Request and track your appointments"
        actions={<Btn size="sm" onClick={() => setShowModal(true)}>Request Appointment</Btn>} />
      <div style={{ padding: "24px 32px" }}>
        {appointments.map(a => (
          <Card key={a.id} style={{ marginBottom: 12, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.requested_date} at {a.requested_time}</div>
                <div style={{ fontSize: 12, color: DS.colors.muted }}>{a.reason || "General appointment"}</div>
              </div>
              <Chip color={a.status === "confirmed" ? DS.colors.success : a.status === "cancelled" ? DS.colors.danger : DS.colors.warning} dot>{a.status}</Chip>
            </div>
          </Card>
        ))}
        {appointments.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No appointments yet.</div></Card>}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Request Appointment">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Preferred Date" value={date} onChange={setDate} type="date" required />
          <Input label="Preferred Time" value={time} onChange={setTime} placeholder="e.g. 10:00 AM" required />
          <Textarea label="Reason for Visit" value={reason} onChange={setReason} placeholder="Describe your reason..." rows={3} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowModal(false)}>Cancel</Btn>
            <Btn onClick={submit} loading={loading}>Request</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PatientConsents({ patientId, clinicId, consentStatus, onRefresh }) {
  const { showToast } = useApp();
  const [forms, setForms] = useState([]);
  const [signing, setSigning] = useState(null);
  const [sigName, setSigName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClinicConsentForms(clinicId).then(f => { setForms(f); setLoading(false); });
  }, [clinicId]);

  const doSign = async () => {
    if (!sigName.trim()) return;
    try {
      await signConsent({ consentFormId: signing.id, patientId, clinicId, signatureData: sigName });
      showToast("Consent signed");
      setSigning(null);
      setSigName("");
      onRefresh();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const isSigned = (formId) => consentStatus.some(cs => cs.consent_form_id === formId && cs.signed_at);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHead title="Consent Forms" subtitle="Review and sign your treatment consent documents" />
      <div style={{ padding: "24px 32px" }}>
        {forms.map(form => {
          const signed = isSigned(form.id);
          return (
            <Card key={form.id} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: signed ? 0 : 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{form.title}</div>
                </div>
                {signed ? (
                  <Chip color={DS.colors.success} dot>Signed</Chip>
                ) : (
                  <Btn size="sm" onClick={() => setSigning(form)}>Review & Sign</Btn>
                )}
              </div>
            </Card>
          );
        })}
        {forms.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No consent forms required yet.</div></Card>}
      </div>
      <Modal open={!!signing} onClose={() => setSigning(null)} title={signing?.title} width={540}>
        {signing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: 16, maxHeight: 300, overflowY: "auto" }}>
              <pre style={{ fontFamily: DS.fonts.body, fontSize: 12.5, lineHeight: 1.7, color: DS.colors.ink, whiteSpace: "pre-wrap", margin: 0 }}>{signing.content}</pre>
            </div>
            <Input label="Type your full name to sign" value={sigName} onChange={setSigName} placeholder="Jordan Rivera" />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setSigning(null)}>Cancel</Btn>
              <Btn onClick={doSign} disabled={!sigName.trim()}>Sign & Submit</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function PatientProfileTab({ profile }) {
  const { showToast } = useApp();
  const [name, setName] = useState(profile.name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [loading, setLoading] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const saveProfile = async () => {
    setLoading(true);
    try {
      await updateProfile(profile.id, { name, phone });
      showToast("Profile updated");
    } catch (e) {
      showToast(e.message, "error");
    }
    setLoading(false);
  };

  const changePassword = async () => {
    if (newPw !== confirmPw) { showToast("Passwords do not match", "error"); return; }
    if (newPw.length < 8) { showToast("Password must be at least 8 characters", "error"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) showToast(error.message, "error");
    else { showToast("Password updated"); setPwModal(false); setOldPw(""); setNewPw(""); setConfirmPw(""); }
  };

  return (
    <div>
      <PageHead title="My Profile" subtitle="Manage your personal information" />
      <div style={{ padding: "24px 32px", maxWidth: 500 }}>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Full Name" value={name} onChange={setName} />
            <Input label="Phone" value={phone} onChange={setPhone} type="tel" />
            <div style={{ padding: "12px 14px", background: DS.colors.surface, borderRadius: DS.radius.md }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Email</div>
              <div style={{ fontSize: 14, color: DS.colors.muted }}>{profile.email || "–"}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={saveProfile} loading={loading}>Save Changes</Btn>
              <Btn variant="secondary" onClick={() => setPwModal(true)}>Change Password</Btn>
            </div>
          </div>
        </Card>
      </div>
      <Modal open={pwModal} onClose={() => setPwModal(false)} title="Change Password">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="New Password" value={newPw} onChange={setNewPw} type="password" placeholder="Min 8 characters" />
          <Input label="Confirm New Password" value={confirmPw} onChange={setConfirmPw} type="password" placeholder="Repeat new password" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setPwModal(false)}>Cancel</Btn>
            <Btn onClick={changePassword}>Update Password</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADMIN PORTAL  (clinic_admin + clinic_staff)
// ─────────────────────────────────────────────────────────────
function AdminPortal() {
  const { currentUser, clinic, primaryColor, logout, doUpdateTask, doAddNote, doSendReminder, doCreateUploadRequest, selectedPatientId, setSelectedPatientId, showToast } = useApp();
  const { isMobile } = useIsMobile();
  const [tab, setTab] = useState("dashboard");

  // Clinic-level data
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allNotes, setAllNotes] = useState({});
  const [reminderLog, setReminderLog] = useState([]);
  const [uploadRequests, setUploadRequests] = useState([]);
  const [insights, setInsights] = useState([]);
  const [intakeForms, setIntakeForms] = useState([]);
  const [consentForms, setConsentForms] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

  const clinicId = currentUser?.clinic_id;

  const fetchAll = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    const [p, s, t, a, rem, ur, ins, forms, cforms, fu] = await Promise.all([
      getClinicPatients(clinicId),
      getClinicStaff(clinicId),
      getClinicTasks(clinicId),
      getClinicAppointments(clinicId),
      getClinicReminders(clinicId),
      getClinicUploadRequests(clinicId),
      getClinicInsights(clinicId),
      getClinicIntakeForms(clinicId),
      getClinicConsentForms(clinicId),
      getClinicFollowups(clinicId),
    ]);
    setPatients(p);
    setStaff(s);
    setAllTasks(t);
    setAllAppointments(a);
    setReminderLog(rem);
    setUploadRequests(ur);
    setInsights(ins);
    setIntakeForms(forms);
    setConsentForms(cforms);
    setFollowups(fu);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getPatientTasks = (pid) => allTasks.filter(t => t.patient_id === pid);
  const getPatientAppointments = (pid) => allAppointments.filter(a => a.patient_id === pid);

  const handleUpdateTask = async (taskId, status) => {
    await doUpdateTask(taskId, status);
    setAllTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const handleAddNote = async (patientId, content) => {
    const note = await doAddNote(patientId, content);
    if (note) {
      setAllNotes(prev => ({ ...prev, [patientId]: [note, ...(prev[patientId] || [])] }));
    }
  };

  const handleSendReminder = async (patientId, data) => {
    const rem = await doSendReminder(patientId, data);
    if (rem) setReminderLog(prev => [rem, ...prev]);
  };

  const handleCreateUpload = async (patientId, data) => {
    const req = await doCreateUploadRequest(patientId, data);
    if (req) {
      setUploadRequests(prev => [req, ...prev]);
      setAllTasks(prev => [...prev, { patient_id: patientId, clinic_id: clinicId, title: data.label, task_type: "upload", status: "not_started", due_date: data.dueDate }]);
    }
  };

  const handleMarkReviewed = async (uploadId) => {
    try {
      await markUploadReviewed(uploadId, currentUser.id);
      setUploadRequests(prev => prev.map(u => u.id === uploadId ? { ...u, status: "reviewed" } : u));
      showToast("Marked as reviewed");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleAppointmentStatus = async (apptId, status) => {
    try {
      const updated = await updateAppointmentStatus(apptId, status);
      setAllAppointments(prev => prev.map(a => a.id === apptId ? updated : a));
      showToast(`Appointment ${status}`);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleDismissInsight = async (id) => {
    await dismissInsight(id);
    setInsights(prev => prev.filter(i => i.id !== id));
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard" },
    { key: "patients", label: "Patients" },
    { key: "forms", label: "Intake Forms" },
    { key: "consents", label: "Consent Forms" },
    { key: "appointments", label: "Appointments" },
    { key: "reminders", label: "Reminders" },
    { key: "uploads", label: "Uploads" },
    { key: "followup", label: "Follow-Up" },
    { key: "staff", label: "Staff" },
    { key: "ai", label: "AI Assistant" },
  ].filter(item => currentUser?.role === "clinic_admin" || !["staff"].includes(item.key));

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: DS.colors.surface }}>
      <Sidebar items={navItems} active={tab} onSelect={k => { setTab(k); if (k !== "patients") setSelectedPatientId(null); }} user={currentUser} clinic={clinic} onLogout={logout} primaryColor={primaryColor} />
      <main style={{ flex: 1, marginLeft: isMobile ? 0 : 232, marginTop: isMobile ? 56 : 0, overflowY: "auto" }}>
        {loading ? <Spinner /> : selectedPatient ? (
          <PatientDetail
            patient={selectedPatient}
            tasks={getPatientTasks(selectedPatient.id)}
            appointments={getPatientAppointments(selectedPatient.id)}
            notes={allNotes[selectedPatient.id]}
            onClose={() => setSelectedPatientId(null)}
            onUpdateTask={handleUpdateTask}
            onAddNote={handleAddNote}
            clinicId={clinicId}
          />
        ) : (
          <>
            {tab === "dashboard" && (
              <AdminDashboard
                patients={patients}
                tasks={allTasks}
                appointments={allAppointments}
                insights={insights}
                onDismissInsight={handleDismissInsight}
                onSelectPatient={pid => { setSelectedPatientId(pid); setTab("patients"); }}
                onNavigate={setTab}
              />
            )}
            {tab === "patients" && (
              <AdminPatients patients={patients} tasks={allTasks} onSelect={pid => setSelectedPatientId(pid)} clinicId={clinicId} onRefresh={fetchAll} />
            )}
            {tab === "forms" && <AdminForms forms={intakeForms} clinicId={clinicId} onRefresh={fetchAll} />}
            {tab === "consents" && <AdminConsents forms={consentForms} />}
            {tab === "appointments" && <AdminAppointments appointments={allAppointments} onStatusChange={handleAppointmentStatus} />}
            {tab === "reminders" && <AdminReminders log={reminderLog} patients={patients} onSend={handleSendReminder} />}
            {tab === "uploads" && <AdminUploads requests={uploadRequests} onMarkReviewed={handleMarkReviewed} onCreateRequest={handleCreateUpload} patients={patients} />}
            {tab === "followup" && <AdminFollowUp followups={followups} patients={patients} />}
            {tab === "staff" && <AdminStaff staff={staff} clinic={clinic} onRefresh={fetchAll} />}
            {tab === "ai" && <AdminAI />}
          </>
        )}
      </main>
    </div>
  );
}

function AdminDashboard({ patients, tasks, appointments, insights, onDismissInsight, onSelectPatient, onNavigate }) {
  const pending = tasks.filter(t => t.status !== "completed").length;
  const pendingAppts = appointments.filter(a => a.status === "pending").length;

  return (
    <div>
      <PageHead title="Dashboard" subtitle="Clinic overview" />
      <div style={{ padding: "24px 36px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            ["Patients", patients.length, DS.colors.primary],
            ["Pending Tasks", pending, DS.colors.warning],
            ["Pending Appts", pendingAppts, DS.colors.blue],
            ["AI Insights", insights.length, DS.colors.purple],
          ].map(([l, v, c]) => (
            <Card key={l}>
              <div style={{ fontSize: 28, fontWeight: 800, color: DS.colors.ink }}>{v}</div>
              <div style={{ fontSize: 12, color: DS.colors.muted, marginTop: 4 }}>{l}</div>
            </Card>
          ))}
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>AI Insights</div>
            {insights.map(insight => (
              <Card key={insight.id} style={{ marginBottom: 10, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Chip color={insight.severity === "high" ? DS.colors.danger : insight.severity === "medium" ? DS.colors.warning : DS.colors.success}>{insight.severity}</Chip>
                    <div style={{ fontSize: 13.5, color: DS.colors.ink, marginTop: 6, lineHeight: 1.5 }}>{insight.message}</div>
                  </div>
                  <Btn size="sm" variant="ghost" onClick={() => onDismissInsight(insight.id)}>Dismiss</Btn>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Recent patients */}
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Recent Patients</div>
        {patients.slice(0, 5).map(p => {
          const pt = tasks.filter(t => t.patient_id === p.id);
          const done = pt.filter(t => t.status === "completed").length;
          return (
            <Card key={p.id} style={{ marginBottom: 10, padding: "14px 18px", cursor: "pointer" }} onClick={() => onSelectPatient(p.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={p.name} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: DS.colors.muted }}>{p.treatment || "No treatment set"}</div>
                </div>
                <div style={{ fontSize: 12, color: DS.colors.muted }}>{done}/{pt.length} tasks</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AdminPatients({ patients, tasks, onSelect, clinicId, onRefresh }) {
  const { showToast } = useApp();
  const [search, setSearch] = useState("");
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const doInvite = async () => {
    if (!inviteName || !inviteEmail) return;
    setInviteLoading(true);
    try {
      await signUp({ email: inviteEmail, password: Math.random().toString(36).slice(2) + "Aa1!", name: inviteName, clinicId, role: "patient" });
      showToast(`Invited ${inviteName}`);
      setInviteModal(false);
      setInviteName(""); setInviteEmail("");
      onRefresh();
    } catch (e) {
      showToast(e.message, "error");
    }
    setInviteLoading(false);
  };

  return (
    <div>
      <PageHead title="Patients" subtitle={`${patients.length} patients`}
        actions={<Btn size="sm" onClick={() => setInviteModal(true)}>Invite Patient</Btn>} />
      <div style={{ padding: "24px 36px" }}>
        <Input value={search} onChange={setSearch} placeholder="Search patients..." style={{ marginBottom: 20 }} />
        <Card style={{ padding: 0 }}>
          {filtered.map((p, idx) => {
            const pt = tasks.filter(t => t.patient_id === p.id);
            const done = pt.filter(t => t.status === "completed").length;
            const pct = pt.length ? Math.round((done / pt.length) * 100) : 0;
            return (
              <div key={p.id} className="patient-row" onClick={() => onSelect(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: idx < filtered.length - 1 ? `1px solid ${DS.colors.border}` : "none", cursor: "pointer" }}>
                <Avatar name={p.name} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: DS.colors.muted }}>{p.email}</div>
                </div>
                <div style={{ fontSize: 12, color: DS.colors.muted, textAlign: "right" }}>
                  <div>{p.treatment || "—"}</div>
                  <div>{pct}% complete</div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: DS.colors.muted }}>No patients found</div>}
        </Card>
      </div>
      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite Patient">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Full Name" value={inviteName} onChange={setInviteName} required />
          <Input label="Email" value={inviteEmail} onChange={setInviteEmail} type="email" required />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setInviteModal(false)}>Cancel</Btn>
            <Btn onClick={doInvite} loading={inviteLoading}>Send Invite</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PatientDetail({ patient, tasks, appointments, notes: initialNotes, onClose, onUpdateTask, onAddNote, clinicId }) {
  const [notes, setNotes] = useState(initialNotes);
  const [noteText, setNoteText] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(!initialNotes);

  useEffect(() => {
    if (!initialNotes) {
      getPatientNotes(patient.id).then(n => { setNotes(n); setLoadingNotes(false); });
    }
  }, [patient.id, initialNotes]);

  const submitNote = async () => {
    if (!noteText.trim()) return;
    const note = await onAddNote(patient.id, noteText);
    if (note) setNotes(prev => [note, ...(prev || [])]);
    setNoteText("");
  };

  return (
    <div>
      <div style={{ padding: "20px 36px 14px", borderBottom: `1px solid ${DS.colors.border}`, display: "flex", alignItems: "center", gap: 14 }}>
        <Btn variant="secondary" size="sm" onClick={onClose}>← Back</Btn>
        <Avatar name={patient.name} size={40} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{patient.name}</div>
          <div style={{ fontSize: 13, color: DS.colors.muted }}>{patient.email} · {patient.treatment || "No treatment"}</div>
        </div>
      </div>
      <div style={{ padding: "24px 36px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Tasks */}
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Tasks</div>
          {tasks.map(task => (
            <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor(task.status) }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{task.title}</div>
                <div style={{ fontSize: 11, color: DS.colors.muted }}>Due {task.due_date}</div>
              </div>
              <Chip color={statusColor(task.status)} dot>{statusLabel(task.status)}</Chip>
              {task.status !== "completed" && (
                <Btn size="sm" variant="secondary" onClick={() => onUpdateTask(task.id, task.status === "not_started" ? "in_progress" : "completed")}>
                  {task.status === "not_started" ? "Start" : "Complete"}
                </Btn>
              )}
            </div>
          ))}
          {tasks.length === 0 && <div style={{ color: DS.colors.muted, fontSize: 13 }}>No tasks assigned</div>}
        </Card>

        {/* Notes */}
        <Card>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Staff Notes</div>
          <Textarea value={noteText} onChange={setNoteText} placeholder="Add a note..." rows={3} style={{ marginBottom: 8 }} />
          <Btn size="sm" onClick={submitNote} style={{ marginBottom: 14 }}>Save Note</Btn>
          {loadingNotes ? <Spinner size={16} /> : (notes || []).map(note => (
            <div key={note.id} style={{ padding: "10px 0", borderTop: `1px solid ${DS.colors.border}` }}>
              <div style={{ fontSize: 12, color: DS.colors.muted, marginBottom: 3 }}>
                {note.staff?.name || "Staff"} · {new Date(note.created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{note.content}</div>
            </div>
          ))}
        </Card>

        {/* Appointments */}
        <Card style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Appointments</div>
          {appointments.map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{a.requested_date} at {a.requested_time}</div>
                <div style={{ fontSize: 12, color: DS.colors.muted }}>{a.reason}</div>
              </div>
              <Chip color={a.status === "confirmed" ? DS.colors.success : DS.colors.warning} dot>{a.status}</Chip>
            </div>
          ))}
          {appointments.length === 0 && <div style={{ color: DS.colors.muted, fontSize: 13 }}>No appointments</div>}
        </Card>
      </div>
    </div>
  );
}

function AdminForms({ forms, clinicId, onRefresh }) {
  const { showToast } = useApp();
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const doCreate = async () => {
    if (!title) return;
    setLoading(true);
    try {
      await createIntakeForm({ clinicId, title, description: desc });
      showToast("Form created");
      setModal(false); setTitle(""); setDesc("");
      onRefresh();
    } catch (e) {
      showToast(e.message, "error");
    }
    setLoading(false);
  };

  return (
    <div>
      <PageHead title="Intake Forms" subtitle={`${forms.length} templates`}
        actions={<Btn size="sm" onClick={() => setModal(true)}>New Template</Btn>} />
      <div style={{ padding: "24px 36px" }}>
        {forms.map(f => (
          <Card key={f.id} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: DS.colors.muted, marginTop: 4 }}>{f.description}</div>
            <div style={{ fontSize: 12, color: DS.colors.muted, marginTop: 8 }}>{f.fields?.length || 0} fields</div>
          </Card>
        ))}
        {forms.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No intake forms yet.</div></Card>}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="New Intake Form">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Title" value={title} onChange={setTitle} placeholder="New Patient Medical History" required />
          <Textarea label="Description" value={desc} onChange={setDesc} placeholder="Instructions shown to patients..." rows={3} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={doCreate} loading={loading}>Create</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AdminConsents({ forms }) {
  return (
    <div>
      <PageHead title="Consent Forms" subtitle={`${forms.length} forms`} />
      <div style={{ padding: "24px 36px" }}>
        {forms.map(f => {
          const signed = f.signatures?.filter(s => s.signed_at).length || 0;
          return (
            <Card key={f.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: DS.colors.muted, marginTop: 2 }}>{signed} signature{signed !== 1 ? "s" : ""}</div>
                </div>
              </div>
            </Card>
          );
        })}
        {forms.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No consent forms yet.</div></Card>}
      </div>
    </div>
  );
}

function AdminAppointments({ appointments, onStatusChange }) {
  const pending = appointments.filter(a => a.status === "pending");
  const others = appointments.filter(a => a.status !== "pending");

  return (
    <div>
      <PageHead title="Appointments" subtitle={`${appointments.length} total`} />
      <div style={{ padding: "24px 36px" }}>
        {pending.length > 0 && (
          <>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Pending Confirmation</div>
            {pending.map(a => (
              <Card key={a.id} style={{ marginBottom: 10, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{a.patient?.name || "Patient"}</div>
                    <div style={{ fontSize: 12, color: DS.colors.muted }}>{a.requested_date} at {a.requested_time}</div>
                    <div style={{ fontSize: 12, color: DS.colors.muted }}>{a.reason}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn size="sm" onClick={() => onStatusChange(a.id, "confirmed")}>Confirm</Btn>
                    <Btn size="sm" variant="danger" onClick={() => onStatusChange(a.id, "cancelled")}>Cancel</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}
        {others.map(a => (
          <Card key={a.id} style={{ marginBottom: 10, padding: "14px 18px", opacity: a.status === "cancelled" ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.patient?.name || "Patient"}</div>
                <div style={{ fontSize: 12, color: DS.colors.muted }}>{a.requested_date} at {a.requested_time}</div>
              </div>
              <Chip color={a.status === "confirmed" ? DS.colors.success : a.status === "cancelled" ? DS.colors.danger : DS.colors.muted} dot>{a.status}</Chip>
            </div>
          </Card>
        ))}
        {appointments.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No appointments yet.</div></Card>}
      </div>
    </div>
  );
}

function AdminReminders({ log, patients, onSend }) {
  const [modal, setModal] = useState(false);
  const [patId, setPatId] = useState("");
  const [type, setType] = useState("intake");
  const [channel, setChannel] = useState("Email");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const doSend = async () => {
    if (!patId || !msg) return;
    setLoading(true);
    await onSend(patId, { reminderType: type, channel, message: msg });
    setModal(false); setPatId(""); setMsg("");
    setLoading(false);
  };

  return (
    <div>
      <PageHead title="Reminders" subtitle={`${log.length} sent`}
        actions={<Btn size="sm" onClick={() => setModal(true)}>Send Reminder</Btn>} />
      <div style={{ padding: "24px 36px" }}>
        {log.map(r => (
          <Card key={r.id} style={{ marginBottom: 10, padding: "13px 18px" }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.patient?.name || "Patient"}</div>
                <div style={{ fontSize: 12.5, color: DS.colors.ink, marginTop: 2 }}>{r.message}</div>
                <div style={{ fontSize: 11, color: DS.colors.muted, marginTop: 4 }}>{r.channel} · {new Date(r.sent_at).toLocaleDateString()}</div>
              </div>
              <Chip color={DS.colors.success} dot>{r.status}</Chip>
            </div>
          </Card>
        ))}
        {log.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No reminders sent yet.</div></Card>}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Send Reminder">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Patient</label>
            <select value={patId} onChange={e => setPatId(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: DS.radius.md, border: `1.5px solid ${DS.colors.border}`, fontSize: 14, fontFamily: DS.fonts.body }}>
              <option value="">Select patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Channel</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Email", "SMS", "Email + SMS"].map(ch => (
                <button key={ch} onClick={() => setChannel(ch)} style={{ flex: 1, padding: "8px 4px", borderRadius: DS.radius.md, border: `1.5px solid ${channel === ch ? DS.colors.primary : DS.colors.border}`, background: channel === ch ? DS.colors.primaryLight : DS.colors.white, color: channel === ch ? DS.colors.primary : DS.colors.ink, fontSize: 12, fontWeight: channel === ch ? 700 : 400, cursor: "pointer", fontFamily: DS.fonts.body }}>{ch}</button>
              ))}
            </div>
          </div>
          <Textarea label="Message" value={msg} onChange={setMsg} placeholder="Write your reminder message..." rows={3} required />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={doSend} loading={loading}>Send</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AdminUploads({ requests, onMarkReviewed, onCreateRequest, patients }) {
  const [modal, setModal] = useState(false);
  const [patId, setPatId] = useState("");
  const [label, setLabel] = useState("");
  const [message, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const doCreate = async () => {
    if (!patId || !label) return;
    setLoading(true);
    await onCreateRequest(patId, { label, message });
    setModal(false); setPatId(""); setLabel(""); setMsg("");
    setLoading(false);
  };

  return (
    <div>
      <PageHead title="Upload Requests" subtitle={`${requests.length} requests`}
        actions={<Btn size="sm" onClick={() => setModal(true)}>Request Upload</Btn>} />
      <div style={{ padding: "24px 36px" }}>
        {requests.map(r => (
          <Card key={r.id} style={{ marginBottom: 10, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.patient?.name || "Patient"}</div>
                <div style={{ fontSize: 13, color: DS.colors.ink }}>{r.label}</div>
                <div style={{ fontSize: 11, color: DS.colors.muted, marginTop: 2 }}>{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
              <Chip color={r.status === "reviewed" ? DS.colors.purple : r.status === "fulfilled" ? DS.colors.success : DS.colors.warning} dot>{r.status}</Chip>
              {r.status === "fulfilled" && (
                <Btn size="sm" variant="secondary" onClick={() => onMarkReviewed(r.id)}>Mark Reviewed</Btn>
              )}
            </div>
          </Card>
        ))}
        {requests.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No upload requests yet.</div></Card>}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Request Document Upload">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Patient</label>
            <select value={patId} onChange={e => setPatId(e.target.value)} style={{ width: "100%", padding: "11px 14px", borderRadius: DS.radius.md, border: `1.5px solid ${DS.colors.border}`, fontSize: 14, fontFamily: DS.fonts.body }}>
              <option value="">Select patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Input label="Document Label" value={label} onChange={setLabel} placeholder="Recent Lab Results" required />
          <Textarea label="Message to Patient" value={message} onChange={setMsg} placeholder="Please upload your most recent bloodwork..." rows={2} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={doCreate} loading={loading}>Send Request</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AdminFollowUp({ followups, patients }) {
  return (
    <div>
      <PageHead title="Follow-Up Responses" subtitle={`${followups.length} responses`} />
      <div style={{ padding: "24px 36px" }}>
        {followups.map(f => (
          <Card key={f.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <Avatar name={f.patient?.name} size={32} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.patient?.name}</div>
                <div style={{ fontSize: 12, color: DS.colors.muted }}>{f.questionnaire} · {new Date(f.submitted_at).toLocaleDateString()}</div>
              </div>
            </div>
            <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: 12 }}>
              <pre style={{ fontFamily: DS.fonts.body, fontSize: 12.5, whiteSpace: "pre-wrap", margin: 0, color: DS.colors.ink }}>{JSON.stringify(f.answers, null, 2)}</pre>
            </div>
          </Card>
        ))}
        {followups.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No follow-up responses yet.</div></Card>}
      </div>
    </div>
  );
}

function AdminStaff({ staff, clinic, onRefresh }) {
  return (
    <div>
      <PageHead title="Staff" subtitle={`${staff.length} members`} />
      <div style={{ padding: "24px 36px" }}>
        {staff.map(s => (
          <Card key={s.id} style={{ marginBottom: 10, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={s.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: DS.colors.muted }}>{s.title || s.role?.replace("_", " ")} · {s.email}</div>
              </div>
              <Chip color={s.role === "clinic_admin" ? DS.colors.purple : DS.colors.blue}>{s.role?.replace("_", " ")}</Chip>
            </div>
          </Card>
        ))}
        {staff.length === 0 && <Card><div style={{ textAlign: "center", color: DS.colors.muted, padding: 20 }}>No staff members yet.</div></Card>}
      </div>
    </div>
  );
}

function AdminAI() {
  const { aiThinking, aiChat, runAI } = useApp();
  const [input, setInput] = useState("");
  const chatRef = useRef(null);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [aiChat]);
  const send = () => { if (!input.trim()) return; runAI(input); setInput(""); };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <PageHead title="AI Assistant" subtitle="Ask questions about your clinic" />
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "24px 36px", display: "flex", flexDirection: "column", gap: 12 }}>
        {aiChat.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 60, color: DS.colors.muted }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>✦</div>
            <div style={{ fontWeight: 600, fontSize: 16, color: DS.colors.ink }}>RegenFlow AI</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Ask me about patient risk, drafting messages, or clinic activity.</div>
          </div>
        )}
        {aiChat.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "70%", background: m.role === "user" ? DS.colors.primary : DS.colors.white, color: m.role === "user" ? "#fff" : DS.colors.ink, padding: "12px 16px", borderRadius: DS.radius.lg, fontSize: 13.5, lineHeight: 1.6, border: m.role === "ai" ? `1px solid ${DS.colors.border}` : "none", whiteSpace: "pre-wrap" }}>
              {m.text}
            </div>
          </div>
        ))}
        {aiThinking && <div style={{ fontSize: 13, color: DS.colors.muted, fontStyle: "italic" }}>AI is thinking...</div>}
      </div>
      <div style={{ padding: "16px 36px", borderTop: `1px solid ${DS.colors.border}`, display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask anything about your clinic..."
          style={{ flex: 1, padding: "11px 14px", borderRadius: DS.radius.md, border: `1.5px solid ${DS.colors.border}`, fontSize: 14, fontFamily: DS.fonts.body, outline: "none" }} />
        <Btn onClick={send} disabled={!input.trim() || aiThinking}>Send</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUPER ADMIN PORTAL
// ─────────────────────────────────────────────────────────────
function SuperAdminPortal() {
  const { currentUser, logout, showToast } = useApp();
  const { isMobile } = useIsMobile();
  const [tab, setTab] = useState("clinics");
  const [clinics, setClinics] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllClinics(), supabase.from("profiles").select("*, clinics(clinic_name)").order("created_at", { ascending: false })]).then(([c, { data: p }]) => {
      setClinics(c);
      setAllProfiles(p || []);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (id, isActive) => {
    try {
      await toggleClinicActive(id, !isActive);
      setClinics(prev => prev.map(c => c.id === id ? { ...c, is_active: !isActive } : c));
      showToast(`Clinic ${!isActive ? "activated" : "deactivated"}`);
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const handleCreate = async (name, email, plan) => {
    try {
      const c = await createClinic({ clinicName: name, contactEmail: email, planType: plan });
      setClinics(prev => [c, ...prev]);
      showToast("Clinic created");
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const navItems = [{ key: "clinics", label: "All Clinics" }, { key: "users", label: "All Users" }];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: DS.colors.surface }}>
      <Sidebar items={navItems} active={tab} onSelect={setTab} user={currentUser} onLogout={logout} primaryColor={DS.colors.primary} />
      <main style={{ flex: 1, marginLeft: isMobile ? 0 : 232, marginTop: isMobile ? 56 : 0 }}>
        {loading ? <Spinner /> : (
          <>
            {tab === "clinics" && <SuperClinics clinics={clinics} allProfiles={allProfiles} onToggle={handleToggle} onCreate={handleCreate} />}
            {tab === "users" && <SuperUsers profiles={allProfiles} />}
          </>
        )}
      </main>
    </div>
  );
}

function SuperClinics({ clinics, allProfiles, onToggle, onCreate }) {
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("pro");
  const [creating, setCreating] = useState(false);

  const doCreate = async () => {
    if (!name || !email) return;
    setCreating(true);
    await onCreate(name, email, plan);
    setShowNew(false); setName(""); setEmail("");
    setCreating(false);
  };

  return (
    <div>
      <PageHead title="All Clinics" subtitle={`${clinics.length} tenants`}
        actions={<Btn size="sm" onClick={() => setShowNew(true)}>New Clinic</Btn>} />
      <div style={{ padding: "24px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {clinics.map(c => {
            const patientCount = allProfiles.filter(p => p.clinic_id === c.id && p.role === "patient").length;
            const staffCount = allProfiles.filter(p => p.clinic_id === c.id && p.role !== "patient").length;
            return (
              <Card key={c.id} style={{ opacity: c.is_active ? 1 : 0.6 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: DS.radius.md, background: c.primary_color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: c.primary_color }}>{c.clinic_name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{c.clinic_name}</div>
                    <div style={{ fontSize: 12, color: DS.colors.muted }}>{c.contact_email}</div>
                  </div>
                  <Chip color={c.is_active ? DS.colors.success : DS.colors.muted} dot>{c.is_active ? "Active" : "Inactive"}</Chip>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[["Patients", patientCount], ["Staff", staffCount], ["Plan", c.plan_type]].map(([l, v]) => (
                    <div key={l} style={{ textAlign: "center", padding: "8px", background: DS.colors.surface, borderRadius: DS.radius.md }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{v}</div>
                      <div style={{ fontSize: 10, color: DS.colors.muted }}>{l}</div>
                    </div>
                  ))}
                </div>
                <Btn size="sm" variant={c.is_active ? "danger" : "secondary"} onClick={() => onToggle(c.id, c.is_active)}>
                  {c.is_active ? "Deactivate" : "Reactivate"}
                </Btn>
              </Card>
            );
          })}
        </div>
      </div>
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Provision New Clinic" width={440}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Clinic Name" value={name} onChange={setName} placeholder="Scottsdale Regenerative Medicine" required />
          <Input label="Admin Email" value={email} onChange={setEmail} type="email" placeholder="admin@clinic.com" required />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>Plan</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[["starter", "Starter"], ["pro", "Growth"], ["enterprise", "Enterprise"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setPlan(val)} style={{ flex: 1, padding: "9px 6px", borderRadius: DS.radius.md, border: `1.5px solid ${plan === val ? DS.colors.primary : DS.colors.border}`, background: plan === val ? DS.colors.primaryLight : DS.colors.white, color: plan === val ? DS.colors.primary : DS.colors.ink, fontSize: 12, fontWeight: plan === val ? 700 : 400, cursor: "pointer", fontFamily: DS.fonts.body }}>{lbl}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowNew(false)}>Cancel</Btn>
            <Btn onClick={doCreate} loading={creating}>Provision</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SuperUsers({ profiles }) {
  const roleColors = { super_admin: "#B45309", clinic_admin: DS.colors.purple, clinic_staff: DS.colors.blue, patient: DS.colors.success };
  return (
    <div>
      <PageHead title="All Users" subtitle={`${profiles.length} across all tenants`} />
      <div style={{ padding: "24px 36px" }}>
        <Card style={{ padding: 0 }}>
          {profiles.map((u, idx) => (
            <div key={u.id} style={{ padding: "13px 20px", borderBottom: idx < profiles.length - 1 ? `1px solid ${DS.colors.border}` : "none", display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar name={u.name} size={30} color={roleColors[u.role]} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: DS.colors.muted }}>{u.email || "—"}</div>
              </div>
              <Chip color={roleColors[u.role]}>{u.role?.replace("_", " ")}</Chip>
              <div style={{ fontSize: 12, color: DS.colors.muted }}>{u.clinics?.clinic_name || "Platform"}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MARKETING / HOME  (unchanged — just a simple landing)
// ─────────────────────────────────────────────────────────────
function HomePage() {
  const { setPage } = useApp();
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: DS.colors.surface, padding: 40, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, borderRadius: DS.radius.lg, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 24, marginBottom: 24 }}>RF</div>
      <h1 style={{ fontSize: 40, fontWeight: 700, color: DS.colors.ink, margin: "0 0 14px", letterSpacing: "-1px", fontFamily: DS.fonts.display }}>RegenFlow</h1>
      <p style={{ fontSize: 18, color: DS.colors.muted, maxWidth: 480, margin: "0 0 36px", lineHeight: 1.6 }}>Modern patient engagement for regenerative medicine clinics.</p>
      <div style={{ display: "flex", gap: 14 }}>
        <Btn size="lg" onClick={() => setPage("login")}>Sign In</Btn>
        <Btn size="lg" variant="secondary" onClick={() => setPage("signup")}>Create Account</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────
function Router() {
  const { page, currentUser, authLoading } = useApp();

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DS.colors.surface }}>
        <Spinner size={36} />
      </div>
    );
  }

  if (!currentUser) {
    if (page === "login") return <LoginPage />;
    if (page === "signup") return <SignupPage />;
    if (page === "forgot") return <ForgotPage />;
    return <HomePage />;
  }

  if (currentUser.role === "patient") return <PatientPortal />;
  if (currentUser.role === "super_admin") return <SuperAdminPortal />;
  return <AdminPortal />;
}

export default function App() {
  return <AppProvider><Router /></AppProvider>;
}
