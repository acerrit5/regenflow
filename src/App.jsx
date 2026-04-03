import { useState, useEffect, createContext, useContext, useRef } from "react";
import {
  signIn as sbSignIn, signUp as sbSignUp, signOut as sbSignOut,
  getSession, onAuthStateChange, getProfile,
  getClinic as sbGetClinic, getAllClinics, createClinic, updateClinic, toggleClinicActive,
  getClinicPatients as sbGetClinicPatients, getClinicStaff, updateProfile,
  getPatientTasks, getClinicTasks, updateTaskStatus, createTask,
  getPatientAppointments, getClinicAppointments, createAppointment, updateAppointmentStatus,
  getPatientNotes, addPatientNote,
  getClinicIntakeForms, submitIntakeResponse, getIntakeResponse,
  getClinicConsentForms, getPatientConsentStatus, signConsent,
  getClinicInstructions,
  getClinicReminders, sendReminder,
  getClinicUploadRequests, getPatientUploadRequests, createUploadRequest, markUploadReviewed, uploadPatientFile,
  submitFollowupResponse, getPatientFollowups, getClinicFollowups,
  getClinicInsights, dismissInsight,
  logAction,
} from "./lib/supabase";

// ─────────────────────────────────────────────────────────
// DESIGN SYSTEM
// ─────────────────────────────────────────────────────────
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

// Google Fonts loader
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
    @keyframes shimmer{0%{background-position:-200% 0;}100%{background-position:200% 0;}}
    @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
    .anim-fade-up{animation:fadeUp 0.5s ease forwards;}
    .anim-slide{animation:slideIn 0.3s ease forwards;}
    .patient-row:hover{background:#F7F7F5 !important;}
    .patient-row:active{background:#F0F0EC !important;}
    input,textarea,select{font-family:${DS.fonts.body};}
    button{font-family:${DS.fonts.body};}
    @media(max-width:768px){
      .hide-mobile{display:none !important;}
      .stack-mobile{flex-direction:column !important;}
      .grid-1-mobile{grid-template-columns:1fr !important;}
      .grid-2-mobile{grid-template-columns:1fr 1fr !important;}
      .pad-mobile{padding:16px !important;}
      .pad-h-mobile{padding-left:16px !important; padding-right:16px !important;}
    }
  `}</style>
);

// Responsive hook
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024 && window.innerWidth > 768);
  useEffect(() => {
    const h = () => {
      setMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth <= 1024 && window.innerWidth > 768);
    };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { isMobile: mobile, isTablet, isSmall: mobile || isTablet };
}

// ─────────────────────────────────────────────────────────
// (SEED DATA REMOVED — all data loaded from Supabase)
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// CONTEXT & HELPERS
// ─────────────────────────────────────────────────────────
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);
const statusColor = s => ({ completed: DS.colors.success, in_progress: DS.colors.warning, not_started: "#C4C4C0" }[s] || "#C4C4C0");
const statusLabel = s => ({ completed: "Completed", in_progress: "In Progress", not_started: "Not Started" }[s] || s);

// ─────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────
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

function Card({ children, style = {}, onClick, hover = false }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: DS.colors.white, borderRadius: DS.radius.lg, border: `1px solid ${DS.colors.border}`, boxShadow: hov && (onClick || hover) ? DS.shadow.lg : DS.shadow.sm, padding: 24, transition: "all 0.2s ease", cursor: onClick ? "pointer" : "default", ...style }}>
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
    outline: { background: "transparent", color: DS.colors.primary, border: `1.5px solid ${DS.colors.primary}` },
    danger: { background: hov ? "#FEE2E2" : "#FFF5F5", color: DS.colors.danger, border: `1px solid #FECACA` },
    accent: { background: hov ? "#B8953A" : DS.colors.accent, color: "#fff", border: "none", boxShadow: hov ? DS.shadow.md : "none" },
    ai: { background: hov ? "#0F3626" : DS.colors.primary, color: "#fff", border: "none", boxShadow: `0 0 0 1px ${DS.colors.accent}40` },
  };
  return (
    <button disabled={disabled || loading}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
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

// ─────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────
const I = {
  home: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  check: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  forms: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  upload: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  info: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  msg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  patients: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  ai: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  chart: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  clinic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6M12 9v6"/></svg>,
  note: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  spark: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.4 2.4-7.4L2 9.4h7.6z"/></svg>,
  zap: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
};

// ─────────────────────────────────────────────────────────
// APP PROVIDER
// ─────────────────────────────────────────────────────────
function AppProvider({ children }) {
  const [page, setPage] = useState("home");
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [toast, setToast] = useState(null);
  const [appLoading, setAppLoading] = useState(true);

  // All data loaded from Supabase
  const [clinic, setClinic] = useState(null);
  const [patients, setPatients] = useState([]);
  const [tasks, setTasks] = useState({});
  const [notes, setNotes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [reminderLog, setReminderLog] = useState([]);
  const [uploadRequests, setUploadRequests] = useState([]);
  const [intakeForms, setIntakeForms] = useState([]);
  const [consentForms, setConsentForms] = useState([]);
  const [instructionsList, setInstructionsList] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [allClinics, setAllClinics] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [followups, setFollowups] = useState([]);

  const [aiThinking, setAiThinking] = useState(false);
  const [aiChat, setAiChat] = useState([]);

  const primaryColor = clinic?.primary_color || DS.colors.primary;

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // Helper lookups from loaded data
  const getClinicById = (id) => allClinics.find(c => c.id === id);
  const getClinicPatientsLocal = (clinicId) => patients.filter(p => p.clinic_id === clinicId);
  const getUserById = (id) => allUsers.find(u => u.id === id) || patients.find(p => p.id === id) || staffList.find(s => s.id === id) || currentUser;

  // Load all data for the current user's role
  const loadData = async (prof) => {
    try {
      if (prof.role === "patient") {
        const [myTasks, myAppts, myUploads] = await Promise.all([
          getPatientTasks(prof.id),
          getPatientAppointments(prof.id),
          getPatientUploadRequests(prof.id),
        ]);
        setTasks({ [prof.id]: myTasks.map(t => ({ ...t, due: t.due_date, type: t.task_type })) });
        setAppointments(myAppts);
        setUploadRequests(myUploads);
        if (prof.clinic_id) {
          const [forms, consents, instrs] = await Promise.all([
            getClinicIntakeForms(prof.clinic_id),
            getClinicConsentForms(prof.clinic_id),
            getClinicInstructions(prof.clinic_id),
          ]);
          setIntakeForms(forms);
          setConsentForms(consents);
          setInstructionsList(instrs);
        }
      } else if (prof.role === "super_admin") {
        const [clinics] = await Promise.all([getAllClinics()]);
        setAllClinics(clinics);
      } else {
        // clinic_admin or clinic_staff
        const [pts, cTasks, cAppts, cNotes, cReminders, cUploads, forms, consents, instrs, insights, staff, cFollowups] = await Promise.all([
          sbGetClinicPatients(prof.clinic_id),
          getClinicTasks(prof.clinic_id),
          getClinicAppointments(prof.clinic_id),
          Promise.resolve([]),  // notes loaded per-patient
          getClinicReminders(prof.clinic_id),
          getClinicUploadRequests(prof.clinic_id),
          getClinicIntakeForms(prof.clinic_id),
          getClinicConsentForms(prof.clinic_id),
          getClinicInstructions(prof.clinic_id),
          getClinicInsights(prof.clinic_id),
          getClinicStaff(prof.clinic_id),
          getClinicFollowups(prof.clinic_id),
        ]);
        setPatients(pts);
        // Group tasks by patient_id
        const taskMap = {};
        cTasks.forEach(t => {
          const pid = t.patient_id;
          if (!taskMap[pid]) taskMap[pid] = [];
          taskMap[pid].push({ ...t, due: t.due_date, type: t.task_type });
        });
        setTasks(taskMap);
        setAppointments(cAppts);
        setReminderLog(cReminders);
        setUploadRequests(cUploads);
        setIntakeForms(forms);
        setConsentForms(consents);
        setInstructionsList(instrs);
        setAiInsights(insights);
        setStaffList(staff);
        setFollowups(cFollowups);
        // allUsers = staff + patients for lookup purposes
        setAllUsers([...staff, ...pts]);
      }
    } catch (err) {
      console.error("loadData error:", err);
    }
  };

  // Session restoration on mount
  useEffect(() => {
    const init = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          const prof = await getProfile(session.user.id);
          if (prof) {
            const user = { ...prof, id: session.user.id };
            setCurrentUser(user);
            if (prof.clinics) setClinic(prof.clinics);
            await loadData(user);
            if (user.role === "patient") setPage("patient_dashboard");
            else if (user.role === "super_admin") setPage("sa_dashboard");
            else setPage("admin_dashboard");
          }
        }
      } catch (err) {
        console.error("Session restore error:", err);
      }
      setAppLoading(false);
    };
    init();

    const { data: { subscription } } = onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setClinic(null);
        setPatients([]);
        setTasks({});
        setNotes([]);
        setAppointments([]);
        setPage("home");
        setAiChat([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, pw) => {
    const { user, profile: prof, error } = await sbSignIn(email, pw);
    if (error || !user || !prof) return false;
    const u = { ...prof, id: user.id };
    setCurrentUser(u);
    if (prof.clinics) setClinic(prof.clinics);
    await loadData(u);
    if (u.role === "patient") setPage("patient_dashboard");
    else if (u.role === "super_admin") setPage("sa_dashboard");
    else setPage("admin_dashboard");
    return true;
  };

  const logout = async () => {
    await sbSignOut();
    setCurrentUser(null);
    setClinic(null);
    setPage("home");
    setAiChat([]);
  };

  const updateTask = async (patId, taskId, status) => {
    try {
      await updateTaskStatus(taskId, status);
      setTasks(prev => ({ ...prev, [patId]: (prev[patId] || []).map(t => t.id === taskId ? { ...t, status, completed_at: status === "completed" ? new Date().toISOString() : undefined } : t) }));
      showToast("Task updated");
    } catch (err) {
      showToast("Failed to update task", "error");
    }
  };

  const addNote = async (pid, content) => {
    try {
      const note = await addPatientNote({ patientId: pid, clinicId: currentUser.clinic_id, staffId: currentUser.id, content });
      setNotes(prev => [note, ...prev]);
      showToast("Note saved");
    } catch (err) {
      showToast("Failed to save note", "error");
    }
  };

  const addAppointment = async (pid, data) => {
    try {
      const appt = await createAppointment({ patientId: pid, clinicId: currentUser.clinic_id, requestedDate: data.requested_date, requestedTime: data.requested_time, reason: data.reason });
      setAppointments(prev => [...prev, appt]);
      showToast("Appointment request submitted");
    } catch (err) {
      showToast("Failed to submit appointment", "error");
    }
  };

  const addReminderLog = async (patientId, data) => {
    try {
      const reminder = await sendReminder({ patientId, clinicId: currentUser.clinic_id, sentBy: currentUser.id, reminderType: data.type, channel: data.channel, message: data.message });
      setReminderLog(prev => [reminder, ...prev]);
      const pat = patients.find(p => p.id === patientId);
      showToast(`Reminder sent to ${pat?.name || "patient"}`);
    } catch (err) {
      showToast("Failed to send reminder", "error");
    }
  };

  const addUploadRequest = async (patientId, data) => {
    try {
      const req = await createUploadRequest({ patientId, clinicId: currentUser.clinic_id, requestedBy: currentUser.id, label: data.label, message: data.message, dueDate: data.dueDate });
      setUploadRequests(prev => [req, ...prev]);
      const pat = patients.find(p => p.id === patientId);
      showToast(`Upload request sent to ${pat?.name || "patient"}`);
    } catch (err) {
      showToast("Failed to send upload request", "error");
    }
  };

  const runAI = async (prompt) => {
    setAiThinking(true);
    setAiChat(prev => [...prev, { role: "user", text: prompt }]);
    await new Promise(r => setTimeout(r, 1400));
    const patNames = patients.map(p => p.name).join(", ") || "your patients";
    const defaultResp = `I've analyzed your clinic's current patient pipeline for: ${patNames}.\n\nWould you like me to draft any outreach messages or flag specific patients?`;
    setAiChat(prev => [...prev, { role: "ai", text: defaultResp }]);
    setAiThinking(false);
  };

  if (appLoading) {
    return (
      <>
        <FontLoader />
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DS.fonts.body }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: DS.radius.md, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, margin: "0 auto 18px" }}>RF</div>
            <div style={{ fontSize: 14, color: DS.colors.muted }}>Loading...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <AppCtx.Provider value={{ page, setPage, currentUser, clinic, primaryColor, login, logout, showToast, tasks, updateTask, notes, setNotes, addNote, appointments, addAppointment, selectedPatientId, setSelectedPatientId, aiThinking, aiChat, runAI, reminderLog, uploadRequests, addReminderLog, addUploadRequest, patients, intakeForms, consentForms, instructionsList, aiInsights, allClinics, setAllClinics, allUsers, staffList, setStaffList, followups, setFollowups, getClinicById, getClinicPatientsLocal, getUserById, loadData }}>
      <FontLoader />
      {children}
      {toast && (
        <div style={{ position: "fixed", bottom: 28, right: 28, background: toast.type === "success" ? DS.colors.primary : DS.colors.danger, color: "#fff", padding: "13px 22px", borderRadius: DS.radius.md, fontWeight: 600, fontSize: 13.5, zIndex: 9999, boxShadow: DS.shadow.xl, animation: "fadeUp 0.3s ease", display: "flex", alignItems: "center", gap: 8, fontFamily: DS.fonts.body }}>
          {toast.type === "success" ? I.check : "✕"} {toast.msg}
        </div>
      )}
    </AppCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────────────────
function Sidebar({ items, active, onSelect, user, clinic, onLogout, primaryColor }) {
  const { isMobile, isTablet } = useIsMobile();
  const [open, setOpen] = useState(false);
  const isCollapsed = isMobile || isTablet;

  const handleSelect = (key) => { onSelect(key); if (isCollapsed) setOpen(false); };

  const SidebarInner = () => (
    <div style={{ width: isCollapsed ? 260 : 232, background: DS.colors.white, borderRight: `1px solid ${DS.colors.border}`, display: "flex", flexDirection: "column", height: "100vh", overflowY: "auto" }}>
      <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${DS.colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: DS.radius.md, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "0.05em", flexShrink: 0 }}>RF</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: DS.colors.ink, letterSpacing: "-0.2px" }}>RegenFlow</div>
            {clinic && <div style={{ fontSize: 10.5, color: DS.colors.muted, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clinic.clinic_name}</div>}
          </div>
          {isCollapsed && (
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: DS.colors.muted, padding: 4, display: "flex" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>
      <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
        {items.map(item => (
          <button key={item.key} onClick={() => handleSelect(item.key)}
            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: isCollapsed ? "12px 14px" : "9px 11px", borderRadius: DS.radius.md, border: "none", background: active === item.key ? primaryColor + "14" : "transparent", color: active === item.key ? primaryColor : DS.colors.muted, fontWeight: active === item.key ? 600 : 400, fontSize: isCollapsed ? 14 : 13, cursor: "pointer", marginBottom: isCollapsed ? 3 : 1, textAlign: "left", transition: "all 0.12s", fontFamily: DS.fonts.body }}>
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            {item.label}
            {item.badge && <span style={{ marginLeft: "auto", background: DS.colors.danger, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: DS.radius.full }}>{item.badge}</span>}
          </button>
        ))}
      </nav>
      <div style={{ padding: "14px", borderTop: `1px solid ${DS.colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
          <Avatar name={user?.name} size={32} color={primaryColor} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: DS.colors.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</div>
            <div style={{ fontSize: 10.5, color: DS.colors.muted }}>{user?.title || user?.role?.replace("_", " ")}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "9px", borderRadius: DS.radius.md, border: "none", background: "#FFF5F5", color: DS.colors.danger, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body }}>
          {I.logout} Sign Out
        </button>
      </div>
    </div>
  );

  if (isCollapsed) {
    return (
      <>
        {/* Mobile top bar */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: DS.colors.white, borderBottom: `1px solid ${DS.colors.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, zIndex: 200 }}>
          <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: DS.colors.ink, padding: 6, display: "flex", borderRadius: DS.radius.sm }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: DS.radius.sm, background: primaryColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>RF</div>
            <span style={{ fontWeight: 700, fontSize: 14, color: DS.colors.ink }}>RegenFlow</span>
          </div>
          {clinic && <span style={{ fontSize: 12, color: DS.colors.muted, marginLeft: 4 }}>· {clinic.clinic_name}</span>}
          <div style={{ marginLeft: "auto" }}>
            <Avatar name={user?.name} size={30} color={primaryColor} />
          </div>
        </div>
        {/* Overlay */}
        {open && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => setOpen(false)} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, animation: "slideInLeft 0.25s ease", zIndex: 301 }}>
              <SidebarInner />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100 }}>
      <SidebarInner />
    </div>
  );
}

function PageHead({ title, subtitle, actions, eyebrow }) {
  const { isMobile } = useIsMobile();
  return (
    <div style={{ padding: isMobile ? "16px 16px 14px" : "28px 36px 22px", borderBottom: `1px solid ${DS.colors.border}`, background: DS.colors.white, display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "space-between", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 0 }}>
      <div>
        {eyebrow && <div style={{ fontSize: 11, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{eyebrow}</div>}
        <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: DS.colors.ink, letterSpacing: "-0.4px", fontFamily: DS.fonts.body }}>{title}</h1>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: DS.colors.muted }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{actions}</div>}
    </div>
  );
}

function StatCard({ label, value, icon, color = DS.colors.primary, delta, sub }) {
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: DS.radius.md, background: color + "14", display: "flex", alignItems: "center", justifyContent: "center", color }}>{icon}</div>
        {delta && <span style={{ fontSize: 11, fontWeight: 600, color: delta > 0 ? DS.colors.success : DS.colors.danger }}>{delta > 0 ? "↑" : "↓"} {Math.abs(delta)}%</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: DS.colors.ink, letterSpacing: "-1px", lineHeight: 1, fontFamily: DS.fonts.body }}>{value}</div>
      <div style={{ fontSize: 12, color: DS.colors.muted, marginTop: 4, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: DS.colors.muted, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

function TaskRow({ task, onUpdate, canUpdate }) {
  const color = statusColor(task.status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: DS.colors.ink }}>{task.title}</div>
        <div style={{ fontSize: 11, color: DS.colors.muted, marginTop: 1 }}>Due {task.due} · {task.type}</div>
      </div>
      <Chip color={color} dot>{statusLabel(task.status)}</Chip>
      {canUpdate && task.status !== "completed" && (
        <Btn size="sm" variant="secondary" onClick={() => onUpdate(task.id, task.status === "not_started" ? "in_progress" : "completed")}>
          {task.status === "not_started" ? "Start" : "Complete"}
        </Btn>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────
function Modal({ open, onClose, title, subtitle, children, width = 480 }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,15,0.45)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: DS.colors.white, borderRadius: DS.radius.xl, boxShadow: DS.shadow.xl, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto", animation: "fadeUp 0.25s ease" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: `1px solid ${DS.colors.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: DS.colors.ink, letterSpacing: "-0.3px" }}>{title}</div>
            {subtitle && <div style={{ fontSize: 13, color: DS.colors.muted, marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: DS.colors.surface, border: `1px solid ${DS.colors.border}`, borderRadius: DS.radius.md, cursor: "pointer", padding: "5px 8px", color: DS.colors.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

// AI Assistant Panel
function AIAssistant({ standalone = false }) {
  const { aiThinking, aiChat, runAI } = useApp();
  const [input, setInput] = useState("");
  const chatRef = useRef(null);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [aiChat]);

  const send = () => { if (!input.trim()) return; runAI(input); setInput(""); };

  const quickPrompts = ["Analyze patient risk", "Draft a reminder message", "Trigger welcome sequence", "Summarize clinic activity"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: standalone ? "100%" : 420 }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", background: DS.colors.primary, borderRadius: standalone ? 0 : `${DS.radius.lg}px ${DS.radius.lg}px 0 0`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: DS.radius.md, background: DS.colors.accent + "30", display: "flex", alignItems: "center", justifyContent: "center", color: DS.colors.accent }}>{I.spark}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>RegenFlow AI</div>
          <div style={{ fontSize: 10.5, color: "#ffffff80" }}>Clinic automation assistant</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 10, color: "#ffffff80", fontWeight: 600 }}>LIVE</span>
        </div>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 16, background: "#F9F9F7", display: "flex", flexDirection: "column", gap: 10 }}>
        {aiChat.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 16px" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: DS.colors.ink, marginBottom: 6 }}>AI-Powered Clinic Automation</div>
            <div style={{ fontSize: 12.5, color: DS.colors.muted, lineHeight: 1.6 }}>Ask me to analyze patient risks, draft outreach messages, trigger automation sequences, or summarize activity.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 14 }}>
              {quickPrompts.map(p => (
                <button key={p} onClick={() => runAI(p)} style={{ padding: "6px 12px", borderRadius: DS.radius.full, border: `1px solid ${DS.colors.border}`, background: DS.colors.white, fontSize: 11.5, color: DS.colors.primary, cursor: "pointer", fontWeight: 500, fontFamily: DS.fonts.body }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
        {aiChat.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "ai" && (
              <div style={{ width: 24, height: 24, borderRadius: DS.radius.sm, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: DS.colors.accent, fontSize: 12, marginRight: 8, flexShrink: 0, marginTop: 2 }}>{I.spark}</div>
            )}
            <div style={{ maxWidth: "78%", padding: "10px 14px", borderRadius: m.role === "user" ? `${DS.radius.md}px ${DS.radius.md}px 4px ${DS.radius.md}px` : `${DS.radius.md}px ${DS.radius.md}px ${DS.radius.md}px 4px`, background: m.role === "user" ? DS.colors.primary : DS.colors.white, color: m.role === "user" ? "#fff" : DS.colors.ink, fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-line", border: m.role === "ai" ? `1px solid ${DS.colors.border}` : "none", boxShadow: m.role === "ai" ? DS.shadow.sm : "none" }}>
              {m.text}
            </div>
          </div>
        ))}
        {aiThinking && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: DS.radius.sm, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: DS.colors.accent, fontSize: 12 }}>{I.spark}</div>
            <div style={{ padding: "10px 14px", borderRadius: DS.radius.md, background: DS.colors.white, border: `1px solid ${DS.colors.border}` }}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: DS.colors.muted, animation: `pulse 1.4s ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 14px", borderTop: `1px solid ${DS.colors.border}`, background: DS.colors.white, display: "flex", gap: 8, borderRadius: `0 0 ${DS.radius.lg}px ${DS.radius.lg}px` }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask the AI anything…"
          style={{ flex: 1, border: `1.5px solid ${DS.colors.border}`, borderRadius: DS.radius.md, padding: "9px 13px", fontSize: 13, outline: "none", fontFamily: DS.fonts.body, color: DS.colors.ink, background: DS.colors.surface }} />
        <Btn size="sm" variant="ai" onClick={send} disabled={!input.trim()}>{I.arrow}</Btn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PUBLIC PAGES
// ─────────────────────────────────────────────────────────
function HomePage() {
  const { setPage } = useApp();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const features = [
    { icon: I.forms, title: "Intelligent Intake", desc: "Configurable digital forms patients complete before arrival. No clipboards, no delays." },
    { icon: I.shield, title: "Consent Capture", desc: "Electronic signatures with timestamps. HIPAA-aligned, audit-ready, always accessible." },
    { icon: I.upload, title: "Document & Photo Uploads", desc: "Patients upload labs, imaging, and photos directly to their secure portal." },
    { icon: I.spark, title: "AI Automation Engine", desc: "Automatically flag at-risk patients, draft outreach, and trigger care sequences." },
    { icon: I.bell, title: "Smart Reminders", desc: "Multi-channel reminders reduce no-shows and incomplete forms by up to 65%." },
    { icon: I.refresh, title: "Follow-Up Workflows", desc: "Post-treatment questionnaires and check-ins delivered on autopilot." },
  ];

  const stats = [
    { val: "$38B", label: "Regen medicine market size by 2026", delta: "+21%" },
    { val: "9,200+", label: "Specialty regen clinics in North America", delta: "+18%" },
    { val: "67%", label: "Clinics still using paper-based intake", note: "Massive digitization opportunity" },
    { val: "$150B", label: "Annual revenue lost to no-shows", note: "Across U.S. healthcare providers" },
  ];

  const reasons = [
    { title: "Built for regenerative medicine", desc: "Not a generic EHR. Designed specifically for PRP, stem cell, shockwave, and longevity clinics with the workflows they actually use." },
    { title: "AI that works for you", desc: "Automatically surfaces at-risk patients, drafts personalized outreach, and triggers care sequences — so your staff focuses on patients, not admin." },
    { title: "White-label ready", desc: "Full clinic branding. Your logo, your colors, your portal title. Patients see your clinic — not a third-party tool." },
    { title: "Multi-tenant architecture", desc: "One platform, unlimited clinics. Each tenant is fully isolated with their own data, branding, staff, and workflows." },
  ];

  return (
    <div style={{ fontFamily: DS.fonts.body, background: DS.colors.white, minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ padding: "0 60px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: scrolled ? "rgba(255,255,255,0.96)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? `1px solid ${DS.colors.border}` : "none", zIndex: 50, transition: "all 0.3s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: DS.radius.md, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "0.05em" }}>RF</div>
          <span style={{ fontWeight: 700, fontSize: 17, color: DS.colors.ink, letterSpacing: "-0.3px" }}>RegenFlow</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Btn variant="ghost" size="sm" onClick={() => setPage("market")}>Market Analysis</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setPage("login")}>Sign In</Btn>
          <Btn size="sm" onClick={() => setPage("signup")}>Get Started</Btn>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "90px 60px 80px", background: "linear-gradient(180deg, #F0F5F2 0%, #FFFFFF 100%)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 30% 50%, #1C453218 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, #C8A96A0C 0%, transparent 55%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 740, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: DS.colors.primaryLight, color: DS.colors.primary, padding: "5px 14px", borderRadius: DS.radius.full, fontSize: 12, fontWeight: 600, marginBottom: 28, letterSpacing: "0.05em" }}>
            {I.spark} <span style={{ color: DS.colors.accent }}>NEW</span> &nbsp;AI-powered patient automation
          </div>
          <h1 style={{ fontSize: 60, fontWeight: 300, color: DS.colors.ink, lineHeight: 1.08, letterSpacing: "-2.5px", margin: "0 0 10px", fontFamily: DS.fonts.display }}>
            The patient platform
          </h1>
          <h1 style={{ fontSize: 60, fontWeight: 600, color: DS.colors.primary, lineHeight: 1.08, letterSpacing: "-2.5px", margin: "0 0 28px", fontFamily: DS.fonts.display, fontStyle: "italic" }}>
            regenerative clinics deserve.
          </h1>
          <p style={{ fontSize: 18, color: DS.colors.muted, lineHeight: 1.75, margin: "0 0 44px", fontWeight: 400, maxWidth: 580, marginLeft: "auto", marginRight: "auto" }}>
            Digitize intake, capture consents, automate follow-up, and give every patient a beautifully branded experience — powered by AI, built for specialty care.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn onClick={() => setPage("signup")} size="lg">Start Free Trial {I.arrow}</Btn>
            <Btn variant="secondary" size="lg" onClick={() => setPage("login")}>View Live Demo</Btn>
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {["No credit card required", "14-day free trial", "White-label ready"].map(t => (
              <span key={t} style={{ fontSize: 12, color: DS.colors.muted, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: DS.colors.success }}>{I.check}</span> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Market stats bar */}
      <section style={{ background: DS.colors.primary, padding: "32px 60px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "0 20px", borderRight: i < 3 ? "1px solid #ffffff20" : "none" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: DS.colors.accent, letterSpacing: "-1.5px", fontFamily: DS.fonts.display }}>{s.val}</div>
              <div style={{ fontSize: 12.5, color: "#ffffffa0", marginTop: 4, lineHeight: 1.4 }}>{s.label}</div>
              {s.delta && <div style={{ fontSize: 11, color: "#4ADE80", fontWeight: 600, marginTop: 3 }}>↑ YoY growth</div>}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "88px 60px", maxWidth: 1160, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Platform Capabilities</div>
          <h2 style={{ fontSize: 44, fontWeight: 300, color: DS.colors.ink, letterSpacing: "-1.5px", margin: "0 0 6px", fontFamily: DS.fonts.display }}>
            Everything your clinic needs,
          </h2>
          <h2 style={{ fontSize: 44, fontWeight: 600, color: DS.colors.primary, letterSpacing: "-1.5px", fontFamily: DS.fonts.display, fontStyle: "italic" }}>nothing you don't.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {features.map((f, i) => (
            <Card key={i} style={{ padding: "28px" }} hover>
              <div style={{ width: 44, height: 44, borderRadius: DS.radius.md, background: DS.colors.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", color: DS.colors.primary, marginBottom: 18 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: DS.colors.ink, marginBottom: 8, letterSpacing: "-0.2px" }}>{f.title}</div>
              <div style={{ fontSize: 13.5, color: DS.colors.muted, lineHeight: 1.65 }}>{f.desc}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* AI Section */}
      <section style={{ padding: "80px 60px", background: DS.colors.primary, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 80% 50%, #C8A96A18 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", position: "relative" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ffffff15", color: DS.colors.accent, padding: "5px 14px", borderRadius: DS.radius.full, fontSize: 12, fontWeight: 600, marginBottom: 24, letterSpacing: "0.05em" }}>
              {I.spark} AI Automation Engine
            </div>
            <h2 style={{ fontSize: 44, fontWeight: 300, color: "#fff", letterSpacing: "-1.5px", margin: "0 0 6px", fontFamily: DS.fonts.display }}>Your AI clinic</h2>
            <h2 style={{ fontSize: 44, fontWeight: 600, color: DS.colors.accent, letterSpacing: "-1.5px", margin: "0 0 22px", fontFamily: DS.fonts.display, fontStyle: "italic" }}>co-pilot.</h2>
            <p style={{ fontSize: 16, color: "#ffffffa0", lineHeight: 1.75, margin: "0 0 32px" }}>
              RegenFlow AI continuously monitors your patient pipeline, surfaces risks before they become problems, and takes action — so your staff stays focused on care, not admin.
            </p>
            {[
              "Flags patients with incomplete tasks or overdue items",
              "Drafts personalized reminder & follow-up messages",
              "Triggers automated care sequences based on treatment stage",
              "Summarizes clinic activity and completion metrics daily",
              "Identifies at-risk patients before appointments fall through",
            ].map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 11 }}>
                <span style={{ color: DS.colors.accent, flexShrink: 0, marginTop: 1 }}>{I.check}</span>
                <span style={{ fontSize: 14, color: "#ffffffd0", lineHeight: 1.5 }}>{p}</span>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: DS.radius.xl, overflow: "hidden", boxShadow: DS.shadow.xl, border: "1px solid #ffffff18" }}>
            <AIAssistant />
          </div>
        </div>
      </section>

      {/* Why RegenFlow */}
      <section style={{ padding: "80px 60px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontSize: 40, fontWeight: 300, color: DS.colors.ink, letterSpacing: "-1.5px", fontFamily: DS.fonts.display }}>Purpose-built for</h2>
          <h2 style={{ fontSize: 40, fontWeight: 600, color: DS.colors.primary, letterSpacing: "-1.5px", fontFamily: DS.fonts.display, fontStyle: "italic" }}>specialty regenerative care.</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {reasons.map((r, i) => (
            <Card key={i} style={{ padding: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: DS.colors.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>0{i + 1}</div>
              <div style={{ fontWeight: 700, fontSize: 17, color: DS.colors.ink, marginBottom: 10, letterSpacing: "-0.3px" }}>{r.title}</div>
              <div style={{ fontSize: 14, color: DS.colors.muted, lineHeight: 1.7 }}>{r.desc}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ padding: "80px 60px", background: DS.colors.surface }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 600, color: DS.colors.ink, letterSpacing: "-1px", fontFamily: DS.fonts.display }}>Trusted by specialty clinics</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { q: "Our intake completion rate jumped from 38% to 91% in the first month. The patient experience is genuinely impressive.", a: "Dr. Amanda Reyes", c: "Scottsdale Regenerative Medicine" },
              { q: "RegenFlow handles our entire pre-visit workflow. Staff love the dashboard. Patients love how seamless it feels.", a: "James Park, COO", c: "Pacific Longevity Clinic" },
              { q: "The AI reminders alone saved us 4–5 hours of manual follow-up every week. Honestly transformative for a small team.", a: "Dr. Michelle Torres", c: "Lumina Aesthetics & Wellness" },
            ].map((t, i) => (
              <Card key={i} style={{ padding: 28 }}>
                <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                  {[1, 2, 3, 4, 5].map(s => <span key={s} style={{ color: DS.colors.accent, fontSize: 14 }}>★</span>)}
                </div>
                <p style={{ fontSize: 14.5, color: DS.colors.ink, lineHeight: 1.7, margin: "0 0 20px", fontStyle: "italic", fontFamily: DS.fonts.display, fontWeight: 500 }}>"{t.q}"</p>
                <div style={{ fontWeight: 700, fontSize: 13, color: DS.colors.ink }}>{t.a}</div>
                <div style={{ fontSize: 12, color: DS.colors.muted }}>{t.c}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "80px 60px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2 style={{ fontSize: 40, fontWeight: 600, color: DS.colors.ink, letterSpacing: "-1.5px", fontFamily: DS.fonts.display }}>Simple pricing</h2>
          <p style={{ fontSize: 16, color: DS.colors.muted, marginTop: 10 }}>All plans include unlimited patients, AI automation, and full white-label branding.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { name: "Starter", price: "$149", per: "/mo", features: ["Up to 50 active patients", "Digital intake & consent", "File uploads", "Email reminders", "Basic branding"] },
            { name: "Growth", price: "$299", per: "/mo", popular: true, features: ["Up to 300 active patients", "All modules", "AI Automation Engine", "Email + SMS reminders", "Full white-label", "Priority support"] },
            { name: "Enterprise", price: "Custom", per: "", features: ["Unlimited patients", "Multi-location", "API access", "Custom integrations", "Dedicated onboarding", "SLA + support"] },
          ].map((p, i) => (
            <div key={i} style={{ position: "relative" }}>
              {p.popular && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: DS.colors.accent, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 14px", borderRadius: DS.radius.full, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>MOST POPULAR</div>}
              <Card style={{ padding: 28, border: p.popular ? `2px solid ${DS.colors.primary}` : undefined }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: DS.colors.ink, marginBottom: 10 }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 24 }}>
                  <span style={{ fontSize: 38, fontWeight: 800, color: DS.colors.ink, letterSpacing: "-2px", fontFamily: DS.fonts.body }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: DS.colors.muted }}>{p.per}</span>
                </div>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10, fontSize: 13.5, color: DS.colors.ink }}>
                    <span style={{ color: DS.colors.primary }}>{I.check}</span>{f}
                  </div>
                ))}
                <Btn style={{ width: "100%", justifyContent: "center", marginTop: 20 }} variant={p.popular ? "primary" : "outline"} onClick={() => setPage("signup")}>
                  Get Started
                </Btn>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ margin: "0 60px 60px", borderRadius: DS.radius.xl, background: DS.colors.primary, padding: "64px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 50% 100%, #C8A96A18 0%, transparent 60%)", pointerEvents: "none" }} />
        <h2 style={{ fontSize: 48, fontWeight: 300, color: "#fff", letterSpacing: "-2px", margin: "0 0 6px", fontFamily: DS.fonts.display }}>Ready to modernize</h2>
        <h2 style={{ fontSize: 48, fontWeight: 600, color: DS.colors.accent, letterSpacing: "-2px", margin: "0 0 20px", fontFamily: DS.fonts.display, fontStyle: "italic" }}>your clinic?</h2>
        <p style={{ fontSize: 17, color: "#ffffff80", marginBottom: 36, maxWidth: 500, margin: "0 auto 36px" }}>Join specialty clinics already using RegenFlow to deliver a better patient experience.</p>
        <Btn onClick={() => setPage("signup")} style={{ background: "#fff", color: DS.colors.primary, padding: "14px 36px", fontSize: 15, fontWeight: 700 }}>Start Your Free Trial {I.arrow}</Btn>
      </section>

      {/* Footer */}
      <footer style={{ padding: "28px 60px", borderTop: `1px solid ${DS.colors.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: DS.radius.md, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>RF</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: DS.colors.ink }}>RegenFlow</span>
        </div>
        <div style={{ fontSize: 12, color: DS.colors.muted }}>© 2026 RegenFlow · Patient engagement platform for specialty clinics · Not an EHR or diagnostic tool</div>
        <div style={{ display: "flex", gap: 16 }}>
          {["Privacy", "Terms", "Security"].map(l => <span key={l} style={{ fontSize: 12, color: DS.colors.muted, cursor: "pointer" }}>{l}</span>)}
        </div>
      </footer>
    </div>
  );
}

// Market Analysis Page
function MarketPage() {
  const { setPage } = useApp();
  const segments = [
    { label: "PRP Therapy Clinics", pct: 31, color: DS.colors.primary },
    { label: "Stem Cell Providers", pct: 26, color: DS.colors.primaryMid },
    { label: "Longevity / Biohacking", pct: 18, color: DS.colors.accent },
    { label: "Med Spas (treatment-based)", pct: 14, color: "#7C3AED" },
    { label: "Orthopedic Injection", pct: 11, color: "#2563EB" },
  ];
  const painPoints = [
    { title: "Paper-Based Intake", stat: "67%", desc: "of specialty clinics still using paper forms or email-based intake — creating delays, errors, and frustrated patients.", opportunity: "Digital intake alone reduces admin time by 50%+" },
    { title: "No-Show Problem", stat: "$150B", desc: "lost annually across U.S. healthcare from missed appointments. Specialty clinics average 18–22% no-show rates without reminders.", opportunity: "Automated reminders reduce no-shows by up to 40%" },
    { title: "Manual Follow-Up", stat: "4–6 hrs", desc: "per week spent by staff on manual patient follow-up calls, emails, and consent chasing — time stolen from patient care.", opportunity: "AI automation can reclaim 80% of that time" },
    { title: "Fragmented Tools", stat: "3.8 apps", desc: "Average number of disconnected tools a specialty clinic uses (email, Google Forms, DocuSign, scheduling software). No unified view.", opportunity: "Single platform = cleaner data, faster decisions" },
    { title: "Poor Patient Experience", stat: "58%", desc: "of patients say the administrative experience at specialty clinics feels outdated compared to other services they use.", opportunity: "Branded portal raises perceived clinic quality" },
    { title: "Intake Completion Rates", stat: "38–42%", desc: "Industry average pre-appointment intake completion. Most patients arrive with missing info, creating day-of delays.", opportunity: "RegenFlow customers average 87% completion" },
  ];

  return (
    <div style={{ fontFamily: DS.fonts.body, background: DS.colors.white, minHeight: "100vh" }}>
      <nav style={{ padding: "0 60px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${DS.colors.border}`, background: DS.colors.white }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: DS.radius.md, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 12 }}>RF</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: DS.colors.ink }}>RegenFlow</span>
        </div>
        <Btn size="sm" variant="secondary" onClick={() => setPage("home")}>← Back to Home</Btn>
      </nav>

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "60px 40px" }}>
        {/* Header */}
        <div style={{ marginBottom: 60 }}>
          <Chip color={DS.colors.accent} size="sm">Market Intelligence Report · 2026</Chip>
          <h1 style={{ fontSize: 52, fontWeight: 300, color: DS.colors.ink, letterSpacing: "-2px", margin: "16px 0 6px", fontFamily: DS.fonts.display }}>The Specialty Clinic</h1>
          <h1 style={{ fontSize: 52, fontWeight: 600, color: DS.colors.primary, letterSpacing: "-2px", fontFamily: DS.fonts.display, fontStyle: "italic" }}>Market Opportunity</h1>
          <p style={{ fontSize: 17, color: DS.colors.muted, lineHeight: 1.75, maxWidth: 620, marginTop: 18 }}>A data-driven analysis of the regenerative medicine and specialty clinic market — and why the patient engagement software gap represents a $2B+ untapped opportunity.</p>
        </div>

        {/* Market size */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 48 }}>
          {[
            { val: "$38B", label: "Regen medicine market by 2026", sub: "↑ 21.4% CAGR" },
            { val: "9,200+", label: "Specialty clinics in North America", sub: "↑ 18% YoY" },
            { val: "$555B", label: "Projected market size by 2034", sub: "Fortune Business Insights" },
            { val: "45%", label: "North America market share", sub: "Dominant region" },
          ].map((s, i) => (
            <Card key={i} style={{ textAlign: "center", padding: "24px 16px" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: DS.colors.primary, letterSpacing: "-1.5px", fontFamily: DS.fonts.body }}>{s.val}</div>
              <div style={{ fontSize: 12, color: DS.colors.muted, marginTop: 6, lineHeight: 1.4 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: DS.colors.success, fontWeight: 600, marginTop: 4 }}>{s.sub}</div>
            </Card>
          ))}
        </div>

        {/* Target segments */}
        <Card style={{ marginBottom: 36, padding: 36 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: DS.colors.ink, letterSpacing: "-0.5px", marginBottom: 6 }}>Target Clinic Segments</h2>
          <p style={{ fontSize: 14, color: DS.colors.muted, marginBottom: 28, lineHeight: 1.6 }}>RegenFlow targets specialty clinics that operate outside traditional insurance workflows, serve cash-pay patients, and are actively investing in patient experience differentiation.</p>
          {segments.map((s, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: DS.colors.ink }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.pct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: DS.radius.full, background: DS.colors.border, overflow: "hidden" }}>
                <div style={{ width: s.pct + "%", height: "100%", background: s.color, borderRadius: DS.radius.full, transition: "width 1s ease" }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Pain Points */}
        <h2 style={{ fontSize: 30, fontWeight: 700, color: DS.colors.ink, letterSpacing: "-0.8px", marginBottom: 8, fontFamily: DS.fonts.display }}>The Pain Points We Solve</h2>
        <p style={{ fontSize: 15, color: DS.colors.muted, marginBottom: 32, lineHeight: 1.65 }}>
          Specialty regenerative clinics are among the fastest-growing healthcare segments in North America — yet most still run on disconnected, manual workflows. This is RegenFlow's opening.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 48 }}>
          {painPoints.map((p, i) => (
            <Card key={i} style={{ padding: 28 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: DS.colors.primary, letterSpacing: "-1.5px", fontFamily: DS.fonts.body, marginBottom: 8 }}>{p.stat}</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: DS.colors.ink, marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 13.5, color: DS.colors.muted, lineHeight: 1.65, marginBottom: 14 }}>{p.desc}</div>
              <div style={{ background: DS.colors.primaryLight, borderRadius: DS.radius.md, padding: "10px 14px", fontSize: 12.5, color: DS.colors.primary, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                {I.zap} {p.opportunity}
              </div>
            </Card>
          ))}
        </div>

        {/* Target customer profile */}
        <Card style={{ padding: 36, marginBottom: 36, background: DS.colors.primary, border: "none" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Target Customer Profile</h2>
          <p style={{ fontSize: 14, color: "#ffffff80", marginBottom: 28, lineHeight: 1.65 }}>Based on analysis of clinics like Precision Pointe Regenerative Health</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {[
              { label: "Clinic Type", items: ["PRP injection clinics", "Stem cell providers", "Shockwave therapy centers", "IV cellular therapy", "Longevity / biohacking", "Med spas (treatment-based)"] },
              { label: "Business Profile", items: ["1–3 locations", "Cash-pay / HSA/FSA", "$500K–$5M ARR", "2–8 staff members", "50–500 active patients", "Tech-curious ownership"] },
              { label: "Buying Triggers", items: ["Growing patient volume", "Staff overwhelmed by admin", "Poor intake completion", "No-show rate increasing", "Want premium brand feel", "Referral from colleague"] },
            ].map((col, i) => (
              <div key={i}>
                <div style={{ fontSize: 11, fontWeight: 700, color: DS.colors.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{col.label}</div>
                {col.items.map((item, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, fontSize: 13, color: "#ffffffd0" }}>
                    <span style={{ color: DS.colors.accent, flexShrink: 0 }}>{I.check}</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Btn size="lg" onClick={() => setPage("signup")}>Start Free Trial — See RegenFlow in Action {I.arrow}</Btn>
        </div>
      </div>
    </div>
  );
}

function LoginPage() {
  const { login, setPage, showToast } = useApp();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!email || !pw) { setErr("Please enter email and password."); return; }
    setLoading(true);
    setErr("");
    const ok = await login(email, pw);
    if (!ok) { setErr("Invalid email or password."); showToast("Login failed", "error"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: DS.fonts.body }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, background: DS.colors.white }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ width: 44, height: 44, borderRadius: DS.radius.md, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, marginBottom: 20 }}>RF</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: DS.colors.ink, letterSpacing: "-0.8px", margin: "0 0 6px" }}>Welcome back</h1>
            <p style={{ color: DS.colors.muted, fontSize: 14 }}>Sign in to your RegenFlow account</p>
          </div>
          <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@clinic.com" style={{ marginBottom: 14 }} onEnter={handle} />
          <Input label="Password" value={pw} onChange={setPw} type="password" placeholder="••••••••" style={{ marginBottom: 8 }} onEnter={handle} />
          <div style={{ textAlign: "right", marginBottom: 20 }}>
            <button onClick={() => setPage("forgot")} style={{ background: "none", border: "none", color: DS.colors.primary, fontSize: 12, cursor: "pointer", fontFamily: DS.fonts.body, fontWeight: 600 }}>Forgot password?</button>
          </div>
          {err && <div style={{ color: DS.colors.danger, fontSize: 13, marginBottom: 14, background: "#FFF5F5", padding: "10px 14px", borderRadius: DS.radius.md, border: "1px solid #FECACA" }}>{err}</div>}
          <Btn onClick={handle} style={{ width: "100%", justifyContent: "center", padding: "13px" }} loading={loading}>Sign In</Btn>
          <p style={{ textAlign: "center", fontSize: 13, color: DS.colors.muted, marginTop: 24 }}>
            No account? <button onClick={() => setPage("signup")} style={{ background: "none", border: "none", color: DS.colors.primary, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body }}>Sign up free</button>
          </p>
        </div>
      </div>
      <div style={{ flex: 1, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", padding: 60, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 80% 20%, #C8A96A18 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ color: "#fff", maxWidth: 400, position: "relative" }}>
          <div style={{ fontFamily: DS.fonts.display, fontSize: 46, fontWeight: 300, letterSpacing: "-2px", lineHeight: 1.1, marginBottom: 8 }}>Streamlined care</div>
          <div style={{ fontFamily: DS.fonts.display, fontSize: 46, fontWeight: 600, letterSpacing: "-2px", lineHeight: 1.1, color: DS.colors.accent, marginBottom: 24, fontStyle: "italic" }}>starts here.</div>
          <div style={{ fontSize: 15, color: "#ffffffa0", lineHeight: 1.75 }}>RegenFlow gives your clinic a professional, branded patient experience from first contact to post-visit follow-up.</div>
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 14 }}>
            {["Patient intake completion avg. 87%", "4+ hrs admin time saved per week", "AI-powered follow-up automation"].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "#ffffffc0" }}>
                <span style={{ color: DS.colors.accent }}>{I.check}</span>{t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SignupPage() {
  const { setPage } = useApp();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", pw: "", clinic: "", role: "clinic_admin" });
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DS.colors.surface, fontFamily: DS.fonts.body }}>
      <div style={{ width: "100%", maxWidth: 440, padding: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: DS.radius.md, background: DS.colors.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16, margin: "0 auto 18px" }}>RF</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: DS.colors.ink, letterSpacing: "-0.6px" }}>Create your account</h1>
          <p style={{ color: DS.colors.muted, fontSize: 14, marginTop: 4 }}>Set up your clinic on RegenFlow in minutes</p>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[1, 2].map(s => <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? DS.colors.primary : DS.colors.border, transition: "background 0.3s" }} />)}
        </div>
        <Card style={{ padding: 32 }}>
          {step === 1 ? (
            <>
              <Input label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Dr. Jane Smith" style={{ marginBottom: 14 }} />
              <Input label="Work Email" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" placeholder="you@clinic.com" style={{ marginBottom: 14 }} />
              <Input label="Password" value={form.pw} onChange={v => setForm({ ...form, pw: v })} type="password" placeholder="Min 8 characters" style={{ marginBottom: 24 }} />
              <Btn onClick={() => setStep(2)} style={{ width: "100%", justifyContent: "center", padding: "13px" }}>Continue {I.arrow}</Btn>
            </>
          ) : (
            <>
              <Input label="Clinic Name" value={form.clinic} onChange={v => setForm({ ...form, clinic: v })} placeholder="Scottsdale Regenerative Medicine" style={{ marginBottom: 14 }} />
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>Your Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ border: `1.5px solid ${DS.colors.border}`, borderRadius: DS.radius.md, padding: "11px 14px", fontSize: 14, color: DS.colors.ink, fontFamily: DS.fonts.body, background: DS.colors.surface, width: "100%" }}>
                  <option value="clinic_admin">Clinic Admin / Owner</option>
                  <option value="clinic_staff">Staff Member</option>
                </select>
              </div>
              <Btn onClick={async () => {
                if (!form.name || !form.email || !form.pw || !form.clinic) { return; }
                try {
                  const newClinic = await createClinic({ clinicName: form.clinic, contactEmail: form.email, planType: "starter" });
                  await sbSignUp({ email: form.email, password: form.pw, name: form.name, clinicId: newClinic.id, role: form.role });
                  setPage("login");
                } catch (err) { console.error("Signup error:", err); }
              }} style={{ width: "100%", justifyContent: "center", padding: "13px" }}>Create Account</Btn>
            </>
          )}
          <p style={{ textAlign: "center", fontSize: 12.5, color: DS.colors.muted, marginTop: 16 }}>
            Already have an account? <button onClick={() => setPage("login")} style={{ background: "none", border: "none", color: DS.colors.primary, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body }}>Sign in</button>
          </p>
        </Card>
      </div>
    </div>
  );
}

function ForgotPage() {
  const { setPage, showToast } = useApp();
  const [email, setEmail] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: DS.colors.surface, fontFamily: DS.fonts.body }}>
      <div style={{ width: "100%", maxWidth: 380, padding: 20 }}>
        <Card style={{ padding: 36 }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: DS.colors.ink, letterSpacing: "-0.5px", margin: "0 0 6px" }}>Reset your password</h2>
            <p style={{ fontSize: 13.5, color: DS.colors.muted }}>Enter your email and we'll send reset instructions.</p>
          </div>
          <Input label="Email Address" value={email} onChange={setEmail} type="email" placeholder="you@clinic.com" style={{ marginBottom: 20 }} />
          <Btn onClick={() => { showToast("Reset link sent — check your email."); setPage("login"); }} style={{ width: "100%", justifyContent: "center", padding: "13px" }}>Send Reset Link</Btn>
          <p style={{ textAlign: "center", fontSize: 12.5, color: DS.colors.muted, marginTop: 16 }}>
            <button onClick={() => setPage("login")} style={{ background: "none", border: "none", color: DS.colors.primary, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body }}>← Back to sign in</button>
          </p>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PATIENT PORTAL
// ─────────────────────────────────────────────────────────
function PatientPortal() {
  const { currentUser, clinic, primaryColor, logout } = useApp();
  const { isMobile, isTablet } = useIsMobile();
  const [active, setActive] = useState("pd");
  const isCollapsed = isMobile || isTablet;

  const nav = [
    { key: "pd", label: "Dashboard", icon: I.home },
    { key: "pp", label: "My Profile", icon: I.user },
    { key: "pt", label: "My Tasks", icon: I.check },
    { key: "pi", label: "Intake Form", icon: I.forms },
    { key: "pc", label: "Consent Forms", icon: I.shield },
    { key: "pu", label: "Upload Files", icon: I.upload },
    { key: "pa", label: "Appointments", icon: I.calendar },
    { key: "pin", label: "Instructions", icon: I.info },
    { key: "pf", label: "Follow-Up", icon: I.refresh },
    { key: "pm", label: "Support", icon: I.msg },
  ];
  const pages = {
    pd: <PatientDash />, pp: <PatientProfile />, pt: <PatientTasks />,
    pi: <PatientIntake />, pc: <PatientConsent />, pu: <PatientUploads />,
    pa: <PatientAppointments />, pin: <PatientInstructions />,
    pf: <PatientFollowUp />, pm: <PatientMessages />,
  };
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: DS.colors.surface, fontFamily: DS.fonts.body }}>
      <Sidebar items={nav} active={active} onSelect={setActive} user={currentUser} clinic={clinic} onLogout={logout} primaryColor={primaryColor} />
      <div style={{ marginLeft: isCollapsed ? 0 : 232, flex: 1, minHeight: "100vh", paddingTop: isCollapsed ? 56 : 0 }}>
        {pages[active] || <PatientDash />}
      </div>
    </div>
  );
}

function PatientDash() {
  const { currentUser, clinic, tasks, primaryColor, appointments } = useApp();
  const { isMobile, isTablet } = useIsMobile();
  const isSmall = isMobile || isTablet;
  const myTasks = tasks[currentUser.id] || [];
  const pending = myTasks.filter(t => t.status !== "completed");
  const done = myTasks.filter(t => t.status === "completed");
  const pct = myTasks.length ? Math.round((done.length / myTasks.length) * 100) : 0;
  const pc = primaryColor;
  const pad = isMobile ? "16px" : isTablet ? "20px 24px" : "28px 36px";
  return (
    <div>
      <div style={{ padding: isMobile ? "16px" : "28px 36px 24px", background: pc, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(ellipse at 80% 50%, #ffffff10 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11, color: "#ffffff70", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>{clinic?.clinic_name}</div>
          <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.5px" }}>Hello, {currentUser.name.split(" ")[0]} 👋</h1>
          <p style={{ color: "#ffffff80", fontSize: 13, margin: "0 0 16px" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160, maxWidth: 280 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: "#ffffff90", fontWeight: 600 }}>Preparation Progress</span>
                <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: DS.radius.full, background: "#ffffff30", overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", background: DS.colors.accent, borderRadius: DS.radius.full, transition: "width 1s ease" }} />
              </div>
            </div>
            <Chip color={DS.colors.accent}>{pending.length} remaining</Chip>
          </div>
        </div>
      </div>
      <div style={{ padding: pad }}>
        <div style={{ display: "grid", gridTemplateColumns: isSmall ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 14 : 24 }}>
          <StatCard label="Pending Tasks" value={pending.length} icon={I.check} color={pc} />
          <StatCard label="Completed" value={done.length} icon={I.check} color={DS.colors.success} />
          {!isMobile && <StatCard label="Next Appt." value={appointments[0]?.requested_date || "—"} icon={I.calendar} color={DS.colors.blue} />}
          {!isMobile && <StatCard label="Status" value="Active" icon={I.check} color={DS.colors.purple} />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isSmall ? "1fr" : "2fr 1fr", gap: isMobile ? 12 : 24 }}>
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: DS.colors.ink }}>Pending Tasks</h3>
              <Chip color={DS.colors.warning} dot>{pending.length} left</Chip>
            </div>
            {pending.length === 0 ? (
              <div style={{ textAlign: "center", padding: "36px 20px", color: DS.colors.muted }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: DS.colors.ink }}>All tasks complete!</div>
              </div>
            ) : pending.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(t.status), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: DS.colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isSmall ? "nowrap" : "normal" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: DS.colors.muted }}>Due {t.due}</div>
                </div>
                {!isMobile && <Chip color={statusColor(t.status)} dot>{statusLabel(t.status)}</Chip>}
              </div>
            ))}
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: DS.colors.ink }}>Next Appointment</h3>
              <div style={{ background: pc + "10", borderRadius: DS.radius.md, padding: "13px 14px", border: `1px solid ${pc}20` }}>
                <div style={{ fontWeight: 700, color: DS.colors.ink, fontSize: 14 }}>{appointments[0]?.requested_date || "No upcoming appointments"}</div>
                <div style={{ color: DS.colors.muted, fontSize: 12.5, marginTop: 2 }}>{appointments[0] ? `${appointments[0].requested_time} · ${appointments[0].reason}` : ""}</div>
                <div style={{ color: pc, fontSize: 12, fontWeight: 600, marginTop: 6 }}>{clinic?.clinic_name}</div>
              </div>
            </Card>
            {!isMobile && (
              <Card>
                <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: DS.colors.ink }}>Your Treatment</h3>
                <div style={{ fontSize: 13.5, color: DS.colors.ink, fontWeight: 600, marginBottom: 4 }}>{currentUser.treatment}</div>
                <div style={{ fontSize: 12.5, color: DS.colors.muted, lineHeight: 1.6 }}>{clinic?.tagline}</div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientProfile() {
  const { currentUser, showToast, clinic } = useApp();
  const [form, setForm] = useState({ name: currentUser.name, email: currentUser.email, phone: currentUser.phone || "", dob: currentUser.dob || "" });
  const [showPwModal, setShowPwModal] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const changePw = () => {
    if (!pw.current || !pw.next) { showToast("Fill in all fields", "error"); return; }
    if (pw.next !== pw.confirm) { showToast("New passwords do not match", "error"); return; }
    if (pw.next.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }
    showToast("Password updated successfully");
    setShowPwModal(false);
    setPw({ current: "", next: "", confirm: "" });
  };
  return (
    <div>
      <Modal open={showPwModal} onClose={() => setShowPwModal(false)} title="Change Password" width={420}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Current Password" value={pw.current} onChange={v => setPw(p => ({...p, current: v}))} type="password" placeholder="••••••••" />
          <Input label="New Password" value={pw.next} onChange={v => setPw(p => ({...p, next: v}))} type="password" placeholder="Min 6 characters" />
          <Input label="Confirm New Password" value={pw.confirm} onChange={v => setPw(p => ({...p, confirm: v}))} type="password" placeholder="Re-enter new password" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <Btn variant="secondary" onClick={() => setShowPwModal(false)}>Cancel</Btn>
            <Btn onClick={changePw}>Update Password</Btn>
          </div>
        </div>
      </Modal>
      <PageHead title="My Profile" subtitle="Manage your personal information" actions={<Btn onClick={() => showToast("Profile saved!")}>Save Changes</Btn>} />
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Card>
            <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 700 }}>Personal Information</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Input label="Full Name" value={form.name} onChange={v => setForm({ ...form, name: v })} />
              <Input label="Email Address" value={form.email} onChange={v => setForm({ ...form, email: v })} type="email" />
              <Input label="Phone Number" value={form.phone} onChange={v => setForm({ ...form, phone: v })} placeholder="(555) 000-0000" />
              <Input label="Date of Birth" value={form.dob} onChange={v => setForm({ ...form, dob: v })} type="date" />
            </div>
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Card>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Account Info</h3>
              {[["Clinic", clinic?.clinic_name], ["Member Since", currentUser.joined || "2024"], ["Treatment", currentUser.treatment], ["Status", "Active"]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${DS.colors.border}`, fontSize: 13 }}>
                  <span style={{ color: DS.colors.muted }}>{l}</span>
                  <span style={{ fontWeight: 600, color: DS.colors.ink }}>{v}</span>
                </div>
              ))}
            </Card>
            <Card>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Security</h3>
              <Btn variant="secondary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setShowPwModal(true)}>Change Password</Btn>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientTasks() {
  const { currentUser, tasks, updateTask } = useApp();
  const myTasks = tasks[currentUser.id] || [];
  const groups = { not_started: myTasks.filter(t => t.status === "not_started"), in_progress: myTasks.filter(t => t.status === "in_progress"), completed: myTasks.filter(t => t.status === "completed") };
  return (
    <div>
      <PageHead title="My Tasks" subtitle="Complete all required items before your appointment" />
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <StatCard label="Not Started" value={groups.not_started.length} icon={I.check} color={DS.colors.muted} />
          <StatCard label="In Progress" value={groups.in_progress.length} icon={I.refresh} color={DS.colors.warning} />
          <StatCard label="Completed" value={groups.completed.length} icon={I.check} color={DS.colors.success} />
        </div>
        <Card>
          <h3 style={{ margin: "0 0 0", fontSize: 15, fontWeight: 700, paddingBottom: 14, borderBottom: `1px solid ${DS.colors.border}` }}>All Tasks</h3>
          {myTasks.length === 0 ? <div style={{ padding: "40px", textAlign: "center", color: DS.colors.muted }}>No tasks assigned yet.</div>
            : myTasks.map(t => <TaskRow key={t.id} task={t} onUpdate={(id, s) => updateTask(currentUser.id, id, s)} canUpdate />)}
        </Card>
      </div>
    </div>
  );
}

function PatientIntake() {
  const { currentUser, showToast, tasks, updateTask, intakeForms } = useApp();
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({});
  const form = intakeForms[0];
  const myTasks = tasks[currentUser.id] || [];
  const intakeTask = myTasks.find(t => t.type === "intake");
  if (intakeTask?.status === "completed" || submitted) return (
    <div><PageHead title="Intake Forms" subtitle="Medical history and intake information" />
      <div style={{ padding: "60px 36px", textAlign: "center" }}>
        <Card style={{ maxWidth: 420, margin: "0 auto", padding: 44 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h3 style={{ fontWeight: 700, color: DS.colors.ink, margin: "0 0 8px" }}>Form Submitted</h3>
          <p style={{ color: DS.colors.muted, fontSize: 14, lineHeight: 1.65 }}>Your intake form has been received. Our team will review it before your appointment.</p>
        </Card>
      </div>
    </div>
  );
  return (
    <div>
      <PageHead title="Intake Forms" subtitle="Please complete all required fields" />
      <div style={{ padding: "28px 36px" }}>
        <Card style={{ maxWidth: 680 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>{form?.title}</h3>
          <p style={{ color: DS.colors.muted, fontSize: 13.5, margin: "0 0 24px", lineHeight: 1.6 }}>{form?.description}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {form?.fields.map(f => (
              <div key={f.id}>
                {f.type === "textarea" ? <Textarea label={f.label} required={f.required} value={answers[f.id] || ""} onChange={v => setAnswers({ ...answers, [f.id]: v })} />
                  : f.type === "radio" ? (
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{f.label}{f.required && <span style={{ color: DS.colors.danger }}> *</span>}</label>
                      <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
                        {f.options.map(o => (
                          <label key={o} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 14, color: DS.colors.ink }}>
                            <input type="radio" name={f.id} value={o} checked={answers[f.id] === o} onChange={() => setAnswers({ ...answers, [f.id]: o })} />
                            {o}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : <Input label={f.label} required={f.required} type={f.type} value={answers[f.id] || ""} onChange={v => setAnswers({ ...answers, [f.id]: v })} />}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${DS.colors.border}` }}>
            <Btn onClick={() => { setSubmitted(true); if (intakeTask) updateTask(currentUser.id, intakeTask.id, "completed"); showToast("Intake form submitted!"); }}>Submit Intake Form</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

function PatientConsent() {
  const { currentUser, showToast, tasks, updateTask, consentForms } = useApp();
  const [signed, setSigned] = useState(false);
  const [sig, setSig] = useState("");
  const myTasks = tasks[currentUser.id] || [];
  const consentTask = myTasks.find(t => t.type === "consent" && t.status !== "completed");
  const consent = consentForms[0];
  return (
    <div>
      <PageHead title="Consent Forms" subtitle="Review and sign required consent documents" />
      <div style={{ padding: "28px 36px" }}>
        {signed ? (
          <Card style={{ maxWidth: 480, textAlign: "center", padding: 44 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontWeight: 700, margin: "0 0 8px" }}>Consent Signed</h3>
            <p style={{ color: DS.colors.muted, fontSize: 13.5 }}>Signed {new Date().toLocaleString()} · Stored securely</p>
          </Card>
        ) : (
          <Card style={{ maxWidth: 680 }}>
            <h3 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 700 }}>{consent?.title}</h3>
            <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: 20, marginBottom: 22, maxHeight: 300, overflowY: "auto", fontSize: 13, lineHeight: 1.8, color: "#374151", whiteSpace: "pre-wrap", border: `1px solid ${DS.colors.border}` }}>{consent?.content}</div>
            <Input label="Type your full legal name to sign" value={sig} onChange={setSig} placeholder="e.g. Jordan Rivera" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: DS.colors.muted, marginBottom: 20, lineHeight: 1.6 }}>By typing your name, you are providing your electronic signature and agreeing to the above consent.</div>
            <Btn onClick={() => { if (!sig.trim()) { showToast("Please enter your full name", "error"); return; } setSigned(true); if (consentTask) updateTask(currentUser.id, consentTask.id, "completed"); showToast("Consent signed and recorded!"); }}>
              {I.shield} Sign & Submit Consent
            </Btn>
          </Card>
        )}
      </div>
    </div>
  );
}

function PatientUploads() {
  const { showToast, tasks, currentUser, updateTask } = useApp();
  const [uploads, setUploads] = useState([{ id: "u1", name: "Lab_Results_2024.pdf", size: "244 KB", date: "2025-01-08", status: "reviewed" }]);
  const simulate = () => {
    const names = ["Insurance_Card.jpg", "MRI_Report.pdf", "Blood_Panel.pdf", "Photo_Treatment_Area.jpg"];
    const n = names[Math.floor(Math.random() * names.length)];
    setUploads(prev => [...prev, { id: "u" + Date.now(), name: n, size: Math.floor(100 + Math.random() * 900) + " KB", date: new Date().toISOString().split("T")[0], status: "pending" }]);
    const ut = (tasks[currentUser.id] || []).find(t => t.type === "upload" && t.status !== "completed");
    if (ut) updateTask(currentUser.id, ut.id, "completed");
    showToast("File uploaded successfully!");
  };
  return (
    <div>
      <PageHead title="File Uploads" subtitle="Upload requested documents and photos" actions={<Btn onClick={simulate}>{I.upload} Upload File</Btn>} />
      <div style={{ padding: "28px 36px" }}>
        <Card>
          <div style={{ border: `2px dashed ${DS.colors.border}`, borderRadius: DS.radius.md, padding: "44px", textAlign: "center", marginBottom: 24, cursor: "pointer", transition: "border-color 0.2s" }}
            onClick={simulate} onMouseEnter={e => e.currentTarget.style.borderColor = DS.colors.primary} onMouseLeave={e => e.currentTarget.style.borderColor = DS.colors.border}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
            <div style={{ fontWeight: 600, color: DS.colors.ink, marginBottom: 4, fontSize: 14 }}>Click to upload or drag & drop</div>
            <div style={{ fontSize: 12.5, color: DS.colors.muted }}>PDF, JPG, PNG · Max 25MB per file</div>
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Uploaded Files</h3>
          {uploads.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
              <div style={{ fontSize: 22 }}>{f.name.endsWith(".pdf") ? "📄" : "🖼️"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.colors.ink }}>{f.name}</div>
                <div style={{ fontSize: 11.5, color: DS.colors.muted }}>{f.size} · {f.date}</div>
              </div>
              <Chip color={f.status === "reviewed" ? DS.colors.success : DS.colors.warning} dot>{f.status === "reviewed" ? "Reviewed" : "Pending Review"}</Chip>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function PatientAppointments() {
  const { currentUser, appointments, addAppointment, showToast } = useApp();
  const [form, setForm] = useState({ requested_date: "", requested_time: "", reason: "" });
  const myAppts = appointments.filter(a => a.patient_id === currentUser.id);
  return (
    <div>
      <PageHead title="Appointments" subtitle="Request and manage your appointments" />
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Card>
            <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700 }}>Request an Appointment</h3>
            <Input label="Preferred Date" value={form.requested_date} onChange={v => setForm({ ...form, requested_date: v })} type="date" style={{ marginBottom: 14 }} required />
            <Input label="Preferred Time" value={form.requested_time} onChange={v => setForm({ ...form, requested_time: v })} placeholder="e.g. 10:00 AM" style={{ marginBottom: 14 }} />
            <Textarea label="Reason for Visit" value={form.reason} onChange={v => setForm({ ...form, reason: v })} placeholder="Describe your reason for visiting…" required style={{ marginBottom: 20 }} />
            <Btn onClick={() => { if (!form.requested_date || !form.reason) { showToast("Fill in required fields", "error"); return; } addAppointment(currentUser.id, form); setForm({ requested_date: "", requested_time: "", reason: "" }); }}>Submit Request</Btn>
          </Card>
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Appointment History</h3>
            {myAppts.length === 0 ? <div style={{ textAlign: "center", padding: "30px", color: DS.colors.muted }}>No appointments yet.</div>
              : myAppts.map(a => (
                <div key={a.id} style={{ padding: "12px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: DS.colors.ink }}>{a.requested_date} · {a.requested_time}</div>
                      <div style={{ fontSize: 12.5, color: DS.colors.muted, marginTop: 2 }}>{a.reason}</div>
                    </div>
                    <Chip color={a.status === "confirmed" ? DS.colors.success : DS.colors.warning} dot>{a.status}</Chip>
                  </div>
                </div>
              ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PatientInstructions() {
  const { currentUser, instructionsList } = useApp();
  const instrs = instructionsList;
  return (
    <div>
      <PageHead title="Instructions" subtitle="Pre-visit and post-visit care information" />
      <div style={{ padding: "28px 36px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {instrs.map(instr => (
          <Card key={instr.id}>
            <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
              <div style={{ width: 40, height: 40, borderRadius: DS.radius.md, background: (instr.instruction_type || instr.type) === "pre_visit" ? "#DBEAFE" : DS.colors.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                {(instr.instruction_type || instr.type) === "pre_visit" ? "📋" : "🌿"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: DS.colors.ink }}>{instr.title}</div>
                <div style={{ fontSize: 12, color: DS.colors.muted }}>{(instr.instruction_type || instr.type) === "pre_visit" ? "Before Your Visit" : "After Your Visit"}</div>
              </div>
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {(Array.isArray(instr.content) ? instr.content : [instr.content]).map((c, j) => <li key={j} style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.65 }}>{c}</li>)}
            </ol>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PatientFollowUp() {
  const { showToast, tasks, updateTask, currentUser } = useApp();
  const myTasks = tasks[currentUser?.id] || [];
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({ pain: "", swelling: "", notes: "" });
  return (
    <div>
      <PageHead title="Follow-Up Check-In" subtitle="Help us track your recovery progress" />
      <div style={{ padding: "28px 36px" }}>
        {submitted ? (
          <Card style={{ maxWidth: 480, textAlign: "center", padding: 44 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ fontWeight: 700, margin: "0 0 8px" }}>Check-In Received</h3>
            <p style={{ color: DS.colors.muted, fontSize: 13.5 }}>Thank you. Your care team will review your response within one business day.</p>
          </Card>
        ) : (
          <Card style={{ maxWidth: 600 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700 }}>48-Hour Post-Treatment Check-In</h3>
            <p style={{ color: DS.colors.muted, fontSize: 13.5, margin: "0 0 24px", lineHeight: 1.6 }}>Please answer honestly so our team can monitor your recovery.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Input label="Current Pain Level (1–10)" value={answers.pain} onChange={v => setAnswers({ ...answers, pain: v })} placeholder="Enter a number from 1 to 10" />
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Have you experienced swelling?</label>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {["Yes — mild", "Yes — moderate", "No swelling"].map(o => (
                    <label key={o} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 14, color: DS.colors.ink }}>
                      <input type="radio" name="swelling" checked={answers.swelling === o} onChange={() => setAnswers({ ...answers, swelling: o })} />
                      {o}
                    </label>
                  ))}
                </div>
              </div>
              <Textarea label="Additional Notes or Concerns" value={answers.notes} onChange={v => setAnswers({ ...answers, notes: v })} placeholder="Share anything else about how you're feeling…" />
            </div>
            <Btn onClick={() => {
              if (!answers.pain && !answers.swelling) { showToast("Please answer at least one question", "error"); return; }
              setSubmitted(true);
              // Mark followup task complete
              const fu = myTasks.find(t => t.type === "followup" && t.status !== "completed");
              if (fu) updateTask(currentUser.id, fu.id, "completed");
              showToast("Follow-up check-in submitted!");
            }} style={{ marginTop: 24 }}>Submit Check-In</Btn>
          </Card>
        )}
      </div>
    </div>
  );
}

function PatientMessages() {
  const { showToast } = useApp();
  const [msg, setMsg] = useState("");
  const [subject, setSubject] = useState("");
  return (
    <div>
      <PageHead title="Support" subtitle="Contact your care team" />
      <div style={{ padding: "28px 36px" }}>
        <Card style={{ maxWidth: 580 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Send a Message</h3>
          <Input label="Subject" value={subject} onChange={setSubject} placeholder="e.g. Question about pre-treatment instructions" style={{ marginBottom: 14 }} />
          <Textarea label="Message" value={msg} onChange={setMsg} placeholder="How can we help?" style={{ marginBottom: 20 }} />
          <Btn onClick={() => { if (!subject.trim() || !msg.trim()) { showToast("Please fill in subject and message", "error"); return; } showToast("Message sent to your care team!"); setMsg(""); setSubject(""); }}>{I.msg} Send Message</Btn>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ADMIN PORTAL
// ─────────────────────────────────────────────────────────
function AdminPortal() {
  const { currentUser, clinic, primaryColor, logout, showToast } = useApp();
  const { isMobile, isTablet } = useIsMobile();
  const isCollapsed = isMobile || isTablet;
  const [active, setActive] = useState("ad");
  const [showInvitePatient, setShowInvitePatient] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteTreatment, setInviteTreatment] = useState("");
  const [inviting, setInviting] = useState(false);

  const { aiInsights } = useApp();
  const highRisk = aiInsights.filter(a => a.severity === "high").length;

  const doInvitePatient = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) { showToast("Name and email are required", "error"); return; }
    setInviting(true);
    await new Promise(r => setTimeout(r, 800));
    setInviting(false);
    setShowInvitePatient(false);
    setInviteName(""); setInviteEmail(""); setInvitePhone(""); setInviteTreatment("");
    showToast(`Invitation sent to ${inviteName} — they will receive a portal setup email`);
  };

  const nav = [
    { key: "ad", label: "Dashboard", icon: I.home },
    { key: "ap", label: "Patients", icon: I.patients },
    { key: "apd", label: "Patient Detail", icon: I.user },
    { key: "aai", label: "AI Assistant", icon: I.spark, badge: highRisk || undefined },
    { key: "aft", label: "Form Templates", icon: I.forms },
    { key: "acr", label: "Consent Records", icon: I.shield },
    { key: "auf", label: "Uploaded Files", icon: I.upload },
    { key: "afq", label: "Follow-Up", icon: I.refresh },
    { key: "arm", label: "Reminders", icon: I.bell },
    { key: "abs", label: "Branding", icon: I.settings },
    { key: "asu", label: "Staff Users", icon: I.user },
  ];

  const pages = {
    ad: <AdminDash onNav={setActive} />,
    ap: <AdminPatients onSelect={() => setActive("apd")} onInvite={() => setShowInvitePatient(true)} />,
    apd: <AdminPatientDetail />,
    aai: <AdminAIPage />,
    aft: <AdminForms />,
    acr: <AdminConsents />,
    auf: <AdminUploads />,
    afq: <AdminFollowUp />,
    arm: <AdminReminders />,
    abs: <AdminBranding />,
    asu: <AdminStaff />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: DS.colors.surface, fontFamily: DS.fonts.body }}>
      <Modal open={showInvitePatient} onClose={() => setShowInvitePatient(false)} title="Invite New Patient" subtitle="Patient will receive a portal setup email" width={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Patient Full Name" value={inviteName} onChange={setInviteName} placeholder="Jordan Rivera" required />
          <Input label="Email Address" value={inviteEmail} onChange={setInviteEmail} type="email" placeholder="patient@email.com" required />
          <Input label="Phone Number" value={invitePhone} onChange={setInvitePhone} placeholder="(555) 000-0000" />
          <Input label="Treatment / Reason for Visit" value={inviteTreatment} onChange={setInviteTreatment} placeholder="e.g. PRP Knee Therapy" />
          <div style={{ background: DS.colors.primaryLight, borderRadius: DS.radius.md, padding: "12px 14px", fontSize: 12.5, color: DS.colors.primary, border: `1px solid ${DS.colors.primary}20` }}>
            {I.info}&nbsp; The patient will receive an email with a link to create their account and access your branded portal.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowInvitePatient(false)}>Cancel</Btn>
            <Btn onClick={doInvitePatient} loading={inviting}>{I.user} Send Invitation</Btn>
          </div>
        </div>
      </Modal>
      <Sidebar items={nav} active={active} onSelect={setActive} user={currentUser} clinic={clinic} onLogout={logout} primaryColor={primaryColor} />
      <div style={{ marginLeft: isCollapsed ? 0 : 232, flex: 1, paddingTop: isCollapsed ? 56 : 0 }}>
        {pages[active] || <AdminDash onNav={setActive} />}
      </div>
    </div>
  );
}

function AdminDash({ onNav }) {
  const { currentUser, tasks, primaryColor, setSelectedPatientId, patients, aiInsights } = useApp();
  const { isMobile, isTablet } = useIsMobile();
  const isSmall = isMobile || isTablet;
  const allTasks = patients.flatMap(p => tasks[p.id] || []);
  const pendingIntake = allTasks.filter(t => t.type === "intake" && t.status !== "completed").length;
  const pendingUploads = allTasks.filter(t => t.type === "upload" && t.status !== "completed").length;
  const pendingConsents = allTasks.filter(t => t.type === "consent" && t.status !== "completed").length;
  const pc = primaryColor;
  const pad = isMobile ? "14px" : isTablet ? "20px 24px" : "28px 36px";

  const handlePatientClick = (patientId) => {
    setSelectedPatientId(patientId);
    onNav("apd");
  };

  return (
    <div>
      <PageHead title="Clinic Dashboard"
        subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        eyebrow="Staff Overview"
        actions={<Btn size="sm" variant="ai" onClick={() => onNav("aai")}>{I.spark} {!isMobile && "AI Assistant"}</Btn>} />
      <div style={{ padding: pad }}>
        <div style={{ display: "grid", gridTemplateColumns: isSmall ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 14 : 24 }}>
          <StatCard label="Active Patients" value={patients.length} icon={I.patients} color={pc} delta={12} />
          <StatCard label="Pending Intake" value={pendingIntake} icon={I.forms} color={DS.colors.warning} />
          {!isMobile && <StatCard label="Pending Uploads" value={pendingUploads} icon={I.upload} color={DS.colors.purple} />}
          {!isMobile && <StatCard label="Pending Consents" value={pendingConsents} icon={I.shield} color={DS.colors.blue} />}
        </div>

        {/* AI Insights Banner */}
        <div style={{ background: DS.colors.primary, borderRadius: DS.radius.lg, padding: isMobile ? "14px 16px" : "20px 24px", marginBottom: isMobile ? 14 : 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ width: 36, height: 36, borderRadius: DS.radius.md, background: DS.colors.accent + "30", display: "flex", alignItems: "center", justifyContent: "center", color: DS.colors.accent, flexShrink: 0 }}>{I.spark}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "#fff", marginBottom: 2 }}>AI flagged {aiInsights.length} items requiring attention</div>
            <div style={{ fontSize: 12, color: "#ffffff80" }}>{aiInsights.filter(a=>a.severity==="high").length} high-priority · {aiInsights.filter(a=>a.severity==="medium").length} medium · {aiInsights.filter(a=>a.severity==="low").length} low</div>
          </div>
          <Btn size="sm" style={{ background: DS.colors.accent, color: "#fff", border: "none", flexShrink: 0 }} onClick={() => onNav("aai")}>View Insights {I.arrow}</Btn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isSmall ? "1fr" : "2fr 1fr", gap: isMobile ? 12 : 24 }}>
          <Card style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${DS.colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Patient Progress</h3>
              <button onClick={() => onNav("ap")} style={{ background: "none", border: "none", color: pc, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body, display: "flex", alignItems: "center", gap: 4 }}>
                View all {I.arrow}
              </button>
            </div>
            {patients.map(p => {
              const ptTasks = tasks[p.id] || [];
              const done = ptTasks.filter(t => t.status === "completed").length;
              const pct = ptTasks.length ? Math.round((done / ptTasks.length) * 100) : 0;
              return (
                <div key={p.id}
                  onClick={() => handlePatientClick(p.id)}
                  className="patient-row"
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", borderBottom: `1px solid ${DS.colors.border}`, cursor: "pointer", background: DS.colors.white, transition: "background 0.12s" }}>
                  <Avatar name={p.name} size={38} color={pc} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5, color: DS.colors.ink }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: DS.colors.muted, marginBottom: 5 }}>{p.treatment}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, maxWidth: 160, height: 5, borderRadius: DS.radius.full, background: DS.colors.border, overflow: "hidden" }}>
                        <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? DS.colors.success : pc, borderRadius: DS.radius.full }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: DS.colors.muted }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Chip color={pct === 100 ? DS.colors.success : pct > 50 ? DS.colors.warning : DS.colors.muted} dot>
                      {pct === 100 ? "Ready" : pct > 50 ? "In Progress" : "Needs Attention"}
                    </Chip>
                    <span style={{ color: DS.colors.muted, opacity: 0.4 }}>{I.arrow}</span>
                  </div>
                </div>
              );
            })}
          </Card>
          <div style={{ display: "flex", flexDirection: "column", gap: isSmall ? 12 : 18 }}>
            <Card>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Recent Activity</h3>
              {patients.slice(0, 4).map((p, i) => ({ t: `${p.name} — ${p.treatment || "active patient"}`, time: p.created_at ? new Date(p.created_at).toLocaleDateString() : "—" })).map((a, i) => (
                <div key={i} style={{ padding: "9px 0", borderBottom: i < 3 ? `1px solid ${DS.colors.border}` : "none" }}>
                  <div style={{ fontSize: 12.5, color: DS.colors.ink }}>{a.t}</div>
                  <div style={{ fontSize: 11, color: DS.colors.muted, marginTop: 1 }}>{a.time}</div>
                </div>
              ))}
            </Card>
            <Card>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Quick Actions</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Btn variant="secondary" size="sm" style={{ justifyContent: "center" }} onClick={() => onNav("ap")}>{I.patients} View All Patients</Btn>
                <Btn variant="secondary" size="sm" style={{ justifyContent: "center" }} onClick={() => onNav("arm")}>{I.bell} Send Reminder</Btn>
                <Btn variant="ai" size="sm" style={{ justifyContent: "center" }} onClick={() => onNav("aai")}>{I.spark} Ask AI Assistant</Btn>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPatients({ onSelect, onInvite }) {
  const { currentUser, tasks, setSelectedPatientId, primaryColor, patients } = useApp();
  const { isMobile, isTablet } = useIsMobile();
  const isSmall = isMobile || isTablet;
  const [search, setSearch] = useState("");
  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()));
  const pad = isMobile ? "14px" : isTablet ? "20px 24px" : "28px 36px";

  const handleClick = (id) => { setSelectedPatientId(id); onSelect(id); };

  // Mobile/tablet: card layout
  if (isSmall) {
    return (
      <div>
        <PageHead title="Patients" subtitle={`${patients.length} patients`} actions={<Btn size="sm" onClick={() => onInvite()}>{I.user} Invite</Btn>} />
        <div style={{ padding: pad }}>
          <div style={{ marginBottom: 14 }}>
            <Input value={search} onChange={setSearch} placeholder="Search by name or email…" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(p => {
              const ptTasks = tasks[p.id] || [];
              const done = ptTasks.filter(t => t.status === "completed").length;
              const pct = ptTasks.length ? Math.round((done / ptTasks.length) * 100) : 0;
              return (
                <div key={p.id}
                  onClick={() => handleClick(p.id)}
                  className="patient-row"
                  style={{ background: DS.colors.white, borderRadius: DS.radius.lg, border: `1px solid ${DS.colors.border}`, padding: "16px", cursor: "pointer", boxShadow: DS.shadow.sm, transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <Avatar name={p.name} size={42} color={primaryColor} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: DS.colors.ink }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: DS.colors.muted }}>{p.treatment}</div>
                      <div style={{ fontSize: 11.5, color: DS.colors.muted, marginTop: 1 }}>{p.email}</div>
                    </div>
                    <span style={{ color: primaryColor, opacity: 0.4 }}>{I.arrow}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: DS.radius.full, background: DS.colors.border, overflow: "hidden" }}>
                      <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? DS.colors.success : primaryColor, borderRadius: DS.radius.full }} />
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: DS.colors.muted, flexShrink: 0 }}>{pct}% done</span>
                    <Chip color={pct === 100 ? DS.colors.success : pct > 0 ? DS.colors.warning : DS.colors.muted} dot size="sm">
                      {pct === 100 ? "Ready" : pct > 0 ? "In Progress" : "Not Started"}
                    </Chip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: table layout — full row clickable
  return (
    <div>
      <PageHead title="Patients" subtitle={`${patients.length} patients in your clinic`} actions={<Btn size="sm" onClick={() => onInvite()}>{I.user} Invite Patient</Btn>} />
      <div style={{ padding: pad }}>
        <div style={{ marginBottom: 18 }}>
          <Input value={search} onChange={setSearch} placeholder="Search by name or email…" />
        </div>
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "13px 20px", borderBottom: `1px solid ${DS.colors.border}`, display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.5fr 80px", gap: 12, fontSize: 11, fontWeight: 700, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>Patient</span><span>Email</span><span>Joined</span><span>Progress</span><span>Status</span>
          </div>
          {filtered.map(p => {
            const ptTasks = tasks[p.id] || [];
            const done = ptTasks.filter(t => t.status === "completed").length;
            const pct = ptTasks.length ? Math.round((done / ptTasks.length) * 100) : 0;
            return (
              <div key={p.id}
                onClick={() => handleClick(p.id)}
                className="patient-row"
                style={{ padding: "15px 20px", borderBottom: `1px solid ${DS.colors.border}`, display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1.5fr 80px", gap: 12, alignItems: "center", cursor: "pointer", background: DS.colors.white, transition: "background 0.12s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={p.name} size={34} color={primaryColor} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.colors.ink, transition: "color 0.12s" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: DS.colors.muted }}>{p.treatment}</div>
                  </div>
                </div>
                <span style={{ fontSize: 12.5, color: DS.colors.muted }}>{p.email}</span>
                <span style={{ fontSize: 12.5, color: DS.colors.muted }}>{p.joined}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 5, borderRadius: DS.radius.full, background: DS.colors.border, overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? DS.colors.success : primaryColor, borderRadius: DS.radius.full }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: DS.colors.muted, flexShrink: 0 }}>{pct}%</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Chip color={pct === 100 ? DS.colors.success : pct > 0 ? DS.colors.warning : DS.colors.muted} dot size="sm">
                    {pct === 100 ? "Ready" : pct > 0 ? "Active" : "New"}
                  </Chip>
                  <span style={{ color: primaryColor, opacity: 0.4 }}>{I.arrow}</span>
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

function AdminPatientDetail() {
  const { selectedPatientId, tasks, notes, setNotes, addNote, updateTask, primaryColor, addReminderLog, addUploadRequest, reminderLog, uploadRequests, patients, getUserById } = useApp();
  const { isMobile, isTablet } = useIsMobile();
  const isSmall = isMobile || isTablet;

  const patient = patients.find(u => u.id === selectedPatientId) || patients[0];
  const ptTasks = tasks[patient?.id] || [];

  // Load notes for this patient
  useEffect(() => {
    if (patient?.id) {
      getPatientNotes(patient.id).then(n => setNotes(n)).catch(() => {});
    }
  }, [patient?.id]);

  const ptNotes = notes.filter(n => n.patient_id === patient?.id);
  const ptReminders = (reminderLog || []).filter(r => r.patient_id === patient?.id);
  const ptUploads = (uploadRequests || []).filter(r => r.patient_id === patient?.id);

  const [newNote, setNewNote] = useState("");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [reminderType, setReminderType] = useState("intake");
  const [reminderChannel, setReminderChannel] = useState("Email");
  const [reminderMsg, setReminderMsg] = useState("");
  const [reminderSending, setReminderSending] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadDue, setUploadDue] = useState("");
  const [uploadSending, setUploadSending] = useState(false);

  if (!patient) return <div style={{ padding: 40, color: DS.colors.muted }}>Select a patient from the Patients page.</div>;

  const firstName = patient.name.split(" ")[0];
  const reminderTemplates = {
    intake: `Hi ${firstName}, this is a friendly reminder to complete your intake form before your appointment. It only takes a few minutes. Please log in to your patient portal to complete it.`,
    consent: `Hi ${firstName}, your consent form is still pending your signature. This must be completed before we can proceed with your treatment. Please log in to review and sign.`,
    upload: `Hi ${firstName}, we are still waiting on some documents for your appointment. Please log in to your patient portal and upload the requested files.`,
    appointment: `Hi ${firstName}, this is a reminder about your upcoming appointment. Please ensure all pre-visit tasks are completed beforehand.`,
    followup: `Hi ${firstName}, we would love to hear how you are feeling after your recent treatment. Please log in and complete your follow-up check-in.`,
  };

  const handleReminderType = (type) => { setReminderType(type); setReminderMsg(reminderTemplates[type]); };
  const openReminderModal = () => { setReminderMsg(reminderTemplates[reminderType]); setShowReminderModal(true); };

  const sendReminder = async () => {
    if (!reminderMsg.trim()) return;
    setReminderSending(true);
    await new Promise(r => setTimeout(r, 900));
    addReminderLog(patient.id, { type: reminderType, channel: reminderChannel, message: reminderMsg });
    setReminderSending(false);
    setShowReminderModal(false);
    setReminderMsg("");
  };

  const sendUploadRequest = async () => {
    if (!uploadLabel.trim()) return;
    setUploadSending(true);
    await new Promise(r => setTimeout(r, 900));
    addUploadRequest(patient.id, { label: uploadLabel, message: uploadMsg, dueDate: uploadDue });
    setUploadSending(false);
    setShowUploadModal(false);
    setUploadLabel(""); setUploadMsg(""); setUploadDue("");
  };

  const done = ptTasks.filter(t => t.status === "completed").length;
  const pct = ptTasks.length ? Math.round((done / ptTasks.length) * 100) : 0;
  const pad = isMobile ? "14px" : isTablet ? "18px 20px" : "24px 36px";
  const staffName = (sid) => getUserById(sid)?.name || "Staff";

  const CompletionRows = () => [["intake","Intake"],["consent","Consent"],["upload","Uploads"],["followup","Follow-Up"]].map(([type, label]) => {
    const tt = ptTasks.filter(t => t.type === type);
    const d = tt.filter(t => t.status === "completed").length;
    return (
      <div key={type} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${DS.colors.border}`, fontSize: 12.5 }}>
        <span style={{ color: DS.colors.muted }}>{label}</span>
        <Chip color={d === tt.length && tt.length > 0 ? DS.colors.success : DS.colors.warning}>{d}/{tt.length}</Chip>
      </div>
    );
  });

  return (
    <div>
      {/* Send Reminder Modal */}
      <Modal open={showReminderModal} onClose={() => setShowReminderModal(false)} title="Send Reminder" subtitle={`Sending to ${patient.name}`} width={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Reminder Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {[["intake","Intake Form"],["consent","Consent"],["upload","File Upload"],["appointment","Appointment"],["followup","Follow-Up"]].map(([val, lbl]) => (
                <button key={val} onClick={() => handleReminderType(val)}
                  style={{ padding: "7px 13px", borderRadius: DS.radius.full, border: `1.5px solid ${reminderType === val ? primaryColor : DS.colors.border}`, background: reminderType === val ? primaryColor + "12" : DS.colors.white, color: reminderType === val ? primaryColor : DS.colors.muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body, transition: "all 0.12s" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Delivery Channel</label>
            <div style={{ display: "flex", gap: 7 }}>
              {["Email", "SMS", "Email + SMS"].map(ch => (
                <button key={ch} onClick={() => setReminderChannel(ch)}
                  style={{ padding: "7px 13px", borderRadius: DS.radius.full, border: `1.5px solid ${reminderChannel === ch ? primaryColor : DS.colors.border}`, background: reminderChannel === ch ? primaryColor + "12" : DS.colors.white, color: reminderChannel === ch ? primaryColor : DS.colors.muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body, transition: "all 0.12s" }}>
                  {ch}
                </button>
              ))}
            </div>
          </div>
          <Textarea label="Message" value={reminderMsg} onChange={setReminderMsg} rows={5} placeholder="Type your reminder message..." />
          <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: "10px 14px", fontSize: 12.5, color: DS.colors.muted, border: `1px solid ${DS.colors.border}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: primaryColor, flexShrink: 0, marginTop: 1 }}>{I.info}</span>
            <span>Delivered via <strong style={{ color: DS.colors.ink }}>{reminderChannel}</strong> to <strong style={{ color: DS.colors.ink }}>{patient.email}</strong>{reminderChannel.includes("SMS") ? ` and ${patient.phone}` : ""}.</span>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowReminderModal(false)}>Cancel</Btn>
            <Btn onClick={sendReminder} loading={reminderSending} disabled={!reminderMsg.trim()}>{I.bell} Send Reminder</Btn>
          </div>
        </div>
      </Modal>

      {/* Request Upload Modal */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)} title="Request File Upload" subtitle={`From ${patient.name}`} width={500}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Common Requests</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {["Recent Lab Results", "MRI or Imaging", "Insurance Card", "Photo of Treatment Area", "Previous Medical Records"].map(opt => (
                <button key={opt} onClick={() => setUploadLabel(opt)}
                  style={{ padding: "6px 12px", borderRadius: DS.radius.full, border: `1.5px solid ${uploadLabel === opt ? primaryColor : DS.colors.border}`, background: uploadLabel === opt ? primaryColor + "12" : DS.colors.white, color: uploadLabel === opt ? primaryColor : DS.colors.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body, transition: "all 0.12s" }}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <Input label="Document Label" value={uploadLabel} onChange={setUploadLabel} placeholder="e.g. Recent Lab Results" required />
          <Textarea label="Instructions for Patient (optional)" value={uploadMsg} onChange={setUploadMsg} rows={3} placeholder="e.g. Please upload bloodwork from the past 90 days." />
          <Input label="Due By (optional)" value={uploadDue} onChange={setUploadDue} type="date" />
          <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: "10px 14px", fontSize: 12.5, color: DS.colors.muted, border: `1px solid ${DS.colors.border}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: primaryColor, flexShrink: 0, marginTop: 1 }}>{I.info}</span>
            <span>Creates a new upload task in <strong style={{ color: DS.colors.ink }}>{firstName}'s</strong> patient portal and sends an email notification.</span>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowUploadModal(false)}>Cancel</Btn>
            <Btn onClick={sendUploadRequest} loading={uploadSending} disabled={!uploadLabel.trim()}>{I.upload} Send Request</Btn>
          </div>
        </div>
      </Modal>

      {/* Patient Header */}
      <div style={{ padding: isMobile ? "14px 16px" : "22px 36px", background: DS.colors.white, borderBottom: `1px solid ${DS.colors.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <Avatar name={patient.name} size={isMobile ? 42 : 50} color={primaryColor} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: "0 0 3px", fontSize: isMobile ? 17 : 21, fontWeight: 700, color: DS.colors.ink, letterSpacing: "-0.4px" }}>{patient.name}</h1>
            <div style={{ fontSize: 13, color: DS.colors.muted }}>{patient.email}{!isMobile && ` · ${patient.phone}`}</div>
            <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Chip color={primaryColor}>{patient.treatment}</Chip>
              <Chip color={DS.colors.success} dot>Active</Chip>
            </div>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 8 }}>
              <Btn size="sm" variant="secondary" onClick={openReminderModal}>{I.bell} Send Reminder</Btn>
              <Btn size="sm" variant="secondary" onClick={() => setShowUploadModal(true)}>{I.upload} Request Upload</Btn>
            </div>
          )}
        </div>
        {isMobile && (
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn size="sm" variant="secondary" style={{ flex: 1, justifyContent: "center" }} onClick={openReminderModal}>{I.bell} Remind</Btn>
            <Btn size="sm" variant="secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowUploadModal(true)}>{I.upload} Request</Btn>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: pad }}>
        <div style={{ display: "grid", gridTemplateColumns: isSmall ? "1fr" : "2fr 1fr", gap: isMobile ? 14 : 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 14 : 20 }}>
            {isSmall && (
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Completion</h3>
                  <span style={{ fontSize: 22, fontWeight: 800, color: primaryColor, letterSpacing: "-1px" }}>{pct}%</span>
                </div>
                <div style={{ height: 6, borderRadius: DS.radius.full, background: DS.colors.border, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? DS.colors.success : primaryColor, borderRadius: DS.radius.full }} />
                </div>
                <CompletionRows />
              </Card>
            )}
            <Card>
              <h3 style={{ margin: "0 0 0", fontSize: 14, fontWeight: 700, paddingBottom: 12, borderBottom: `1px solid ${DS.colors.border}` }}>Task Status</h3>
              {ptTasks.length === 0
                ? <div style={{ padding: "24px 0", textAlign: "center", color: DS.colors.muted, fontSize: 13 }}>No tasks assigned yet.</div>
                : ptTasks.map(t => <TaskRow key={t.id} task={t} onUpdate={(id, s) => updateTask(patient.id, id, s)} canUpdate />)}
            </Card>
            {ptUploads.length > 0 && (
              <Card>
                <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Upload Requests</h3>
                {ptUploads.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: DS.radius.md, background: DS.colors.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", color: primaryColor, flexShrink: 0 }}>{I.upload}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: DS.colors.ink }}>{r.label}</div>
                      {r.message && <div style={{ fontSize: 12, color: DS.colors.muted, marginTop: 1 }}>{r.message}</div>}
                      <div style={{ fontSize: 11, color: DS.colors.muted, marginTop: 2 }}>{staffName(r.requested_by)} · {new Date(r.requested_at).toLocaleDateString()}{r.dueDate ? ` · Due ${r.dueDate}` : ""}</div>
                    </div>
                    <Chip color={r.status === "fulfilled" ? DS.colors.success : DS.colors.warning} dot>{r.status === "fulfilled" ? "Fulfilled" : "Pending"}</Chip>
                  </div>
                ))}
              </Card>
            )}
            {ptReminders.length > 0 && (
              <Card>
                <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Reminder History</h3>
                {ptReminders.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: DS.radius.md, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", color: DS.colors.warning, flexShrink: 0 }}>{I.bell}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: DS.colors.ink, textTransform: "capitalize" }}>{r.type} Reminder</div>
                      <div style={{ fontSize: 12, color: DS.colors.muted, marginTop: 1 }}>via {r.channel} · {staffName(r.sent_by)} · {new Date(r.sent_at).toLocaleDateString()}</div>
                    </div>
                    <Chip color={DS.colors.success} dot>Delivered</Chip>
                  </div>
                ))}
              </Card>
            )}
            <Card>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Internal Notes</h3>
              {ptNotes.length === 0 && <div style={{ fontSize: 13, color: DS.colors.muted, marginBottom: 14 }}>No notes yet.</div>}
              {ptNotes.map(n => {
                const author = n.staff || getUserById(n.staff_id);
                return (
                  <div key={n.id} style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
                    <Avatar name={author?.name} size={28} color={primaryColor} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: DS.colors.muted, marginBottom: 3 }}>{author?.name} · {new Date(n.created_at).toLocaleDateString()}</div>
                      <div style={{ fontSize: 13.5, color: DS.colors.ink, lineHeight: 1.65 }}>{n.content}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 14 }}>
                <Textarea value={newNote} onChange={setNewNote} placeholder="Add an internal note visible only to staff..." rows={3} style={{ marginBottom: 10 }} />
                <Btn size="sm" onClick={() => { if (newNote.trim()) { addNote(patient.id, newNote); setNewNote(""); } }}>{I.note} Add Note</Btn>
              </div>
            </Card>
          </div>
          {!isSmall && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Card>
                <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700 }}>Completion</h3>
                <div style={{ fontSize: 32, fontWeight: 800, color: primaryColor, letterSpacing: "-1.5px" }}>{pct}%</div>
                <div style={{ height: 6, borderRadius: DS.radius.full, background: DS.colors.border, overflow: "hidden", margin: "10px 0 14px" }}>
                  <div style={{ width: pct + "%", height: "100%", background: pct === 100 ? DS.colors.success : primaryColor, borderRadius: DS.radius.full }} />
                </div>
                <CompletionRows />
              </Card>
              <Card>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Patient Info</h3>
                {[["Email", patient.email], ["Phone", patient.phone || "—"], ["DOB", patient.dob || "—"], ["Joined", patient.joined || "—"]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${DS.colors.border}`, fontSize: 12.5 }}>
                    <span style={{ color: DS.colors.muted }}>{l}</span>
                    <span style={{ fontWeight: 600, color: DS.colors.ink, maxWidth: 160, textAlign: "right", wordBreak: "break-all" }}>{v}</span>
                  </div>
                ))}
              </Card>
              <Card>
                <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Quick Actions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Btn variant="secondary" style={{ justifyContent: "center" }} onClick={openReminderModal}>{I.bell} Send Reminder</Btn>
                  <Btn variant="secondary" style={{ justifyContent: "center" }} onClick={() => setShowUploadModal(true)}>{I.upload} Request Upload</Btn>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function AdminAIPage() {
  const { showToast, aiInsights } = useApp();
  return (
    <div>
      <PageHead title="AI Assistant" subtitle="Powered by RegenFlow AI — clinic automation engine" eyebrow="AI Tools"
        actions={<Chip color={DS.colors.success} dot size="sm">AI Active</Chip>} />
      <div style={{ padding: "24px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Card>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>AI Insights</h3>
              {aiInsights.map(insight => (
                <div key={insight.id} style={{ padding: "13px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <Chip color={insight.severity === "high" ? DS.colors.danger : insight.severity === "medium" ? DS.colors.warning : DS.colors.muted} dot size="sm">{insight.severity}</Chip>
                    <span style={{ fontSize: 11, color: DS.colors.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{insight.type}</span>
                  </div>
                  <div style={{ fontSize: 13, color: DS.colors.ink, lineHeight: 1.6, marginBottom: 8 }}>{insight.message}</div>
                  <Btn size="sm" variant="secondary" onClick={() => {
                    const msgs = { "Send reminder": "Reminder sent to patient via Email + SMS", "Draft message": "Draft message opened in patient detail", "Trigger welcome": "Welcome sequence triggered for new patient" };
                    showToast(msgs[insight.action] || "AI action triggered");
                  }}>{I.zap} {insight.action}</Btn>
                </div>
              ))}
            </Card>
            <Card>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>AI Automation Status</h3>
              {[
                { label: "3-Day Consent Reminder", active: true },
                { label: "Post-Visit Check-In Sequence", active: true },
                { label: "Welcome Email Sequence", active: true },
                { label: "No-Show Re-engagement", active: false },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${DS.colors.border}`, fontSize: 13 }}>
                  <span style={{ color: DS.colors.ink }}>{a.label}</span>
                  <Chip color={a.active ? DS.colors.success : DS.colors.muted} dot>{a.active ? "Active" : "Off"}</Chip>
                </div>
              ))}
            </Card>
          </div>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <AIAssistant standalone />
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminForms() {
  const { showToast, intakeForms: loadedForms, currentUser } = useApp();
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [newTemplate, setNewTemplate] = useState(false);
  const [ntTitle, setNtTitle] = useState("");
  const [ntDesc, setNtDesc] = useState("");
  const [forms, setForms] = useState(loadedForms);

  const saveEdit = () => {
    setForms(prev => prev.map(f => f.id === editing.id ? { ...f, title: editTitle, description: editDesc } : f));
    setEditing(null);
    showToast("Form template updated");
  };

  return (
    <div>
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.title || ""} subtitle={`${preview?.fields?.length} fields · Preview mode`} width={600}>
        {preview && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <p style={{ fontSize: 13.5, color: DS.colors.muted, margin: 0 }}>{preview.description}</p>
            {preview.fields.map(f => (
              <div key={f.id}>
                {f.type === "textarea"
                  ? <Textarea label={f.label} value="" onChange={() => {}} required={f.required} />
                  : f.type === "radio"
                  ? <div><label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{f.label}{f.required && " *"}</label><div style={{ display: "flex", gap: 16, marginTop: 8 }}>{f.options.map(o => <label key={o} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}><input type="radio" name={f.id} disabled /> {o}</label>)}</div></div>
                  : <Input label={f.label} value="" onChange={() => {}} type={f.type} required={f.required} />}
              </div>
            ))}
            <div style={{ paddingTop: 8, borderTop: `1px solid ${DS.colors.border}` }}>
              <Btn disabled>Submit Form (Preview)</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Form Template" width={480}>
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input label="Form Title" value={editTitle} onChange={setEditTitle} required />
            <Textarea label="Description" value={editDesc} onChange={setEditDesc} rows={3} />
            <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: "12px 14px", fontSize: 12.5, color: DS.colors.muted, border: `1px solid ${DS.colors.border}` }}>
              Field editing is available in the full form builder. This saves the title and description.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="secondary" onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn onClick={saveEdit}>Save Changes</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={newTemplate} onClose={() => setNewTemplate(false)} title="New Form Template" width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Template Name" value={ntTitle} onChange={setNtTitle} placeholder="e.g. Post-Treatment Questionnaire" required />
          <Textarea label="Description" value={ntDesc} onChange={setNtDesc} placeholder="Describe when this form should be used..." rows={3} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setNewTemplate(false)}>Cancel</Btn>
            <Btn onClick={() => {
              if (!ntTitle.trim()) { showToast("Please enter a template name", "error"); return; }
              setForms(prev => [...prev, { id: "form_" + Date.now(), clinic_id: currentUser.clinic_id, title: ntTitle, description: ntDesc, fields: [] }]);
              setNtTitle(""); setNtDesc("");
              setNewTemplate(false);
              showToast("New form template created");
            }}>Create Template</Btn>
          </div>
        </div>
      </Modal>

      <PageHead title="Form Templates" subtitle="Manage intake and questionnaire templates"
        actions={<Btn size="sm" onClick={() => setNewTemplate(true)}>{I.forms} New Template</Btn>} />
      <div style={{ padding: "28px 36px" }}>
        {forms.map(f => (
          <Card key={f.id} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: DS.colors.ink, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: DS.colors.muted, marginBottom: 8 }}>{f.description}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Chip color={DS.colors.success} dot>Active</Chip>
                  <Chip color={DS.colors.muted}>{f.fields.length} fields</Chip>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn size="sm" variant="secondary" onClick={() => { setEditing(f); setEditTitle(f.title); setEditDesc(f.description); }}>Edit</Btn>
                <Btn size="sm" variant="secondary" onClick={() => setPreview(f)}>Preview</Btn>
              </div>
            </div>
          </Card>
        ))}
        {forms.length === 0 && <div style={{ textAlign: "center", padding: 40, color: DS.colors.muted }}>No form templates yet. Create your first one.</div>}
      </div>
    </div>
  );
}
function AdminConsents() {
  const { currentUser, primaryColor, tasks, patients, consentForms } = useApp();
  const [viewConsent, setViewConsent] = useState(null);

  const consentData = patients.map(p => {
    const ptTasks = tasks[p.id] || [];
    const consentTask = ptTasks.find(t => t.type === "consent");
    const cf = consentForms[0];
    return {
      patient: p,
      consentTitle: cf?.title || "Treatment Consent",
      status: consentTask?.status === "completed" ? "signed" : consentTask?.status === "in_progress" ? "pending" : "not_started",
      date: consentTask?.completed_at ? new Date(consentTask.completed_at).toLocaleDateString() : null,
      content: cf?.content || "",
    };
  });

  const statusColor = s => s === "signed" ? DS.colors.success : s === "pending" ? DS.colors.warning : DS.colors.muted;
  const statusLabel = s => s === "signed" ? "Signed" : s === "pending" ? "Awaiting Signature" : "Not Started";

  return (
    <div>
      <Modal open={!!viewConsent} onClose={() => setViewConsent(null)}
        title={viewConsent?.consentTitle || "Consent"}
        subtitle={viewConsent ? `${viewConsent.patient.name} · ${statusLabel(viewConsent.status)}` : ""}
        width={580}>
        {viewConsent && (
          <div>
            {viewConsent.status === "signed" && (
              <div style={{ background: DS.colors.primaryLight, borderRadius: DS.radius.md, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: DS.colors.success }}>{I.check}</span>
                <span style={{ fontSize: 13.5, color: DS.colors.primary, fontWeight: 600 }}>
                  Signed by {viewConsent.patient.name} on {viewConsent.date}
                </span>
              </div>
            )}
            {viewConsent.status !== "signed" && (
              <div style={{ background: "#FEF3C7", borderRadius: DS.radius.md, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: DS.colors.warning }}>{I.info}</span>
                <span style={{ fontSize: 13.5, color: "#92400E", fontWeight: 500 }}>
                  Consent pending — patient has not signed yet.
                </span>
              </div>
            )}
            <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: 16, fontSize: 13, lineHeight: 1.8, color: "#374151", whiteSpace: "pre-wrap", border: `1px solid ${DS.colors.border}`, maxHeight: 320, overflowY: "auto" }}>
              {viewConsent.content || "Consent document content not available."}
            </div>
          </div>
        )}
      </Modal>

      <PageHead title="Consent Records" subtitle="View all patient consent documents" />
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <StatCard label="Signed" value={consentData.filter(c => c.status === "signed").length} icon={I.shield} color={DS.colors.success} />
          <StatCard label="Pending" value={consentData.filter(c => c.status === "pending").length} icon={I.bell} color={DS.colors.warning} />
          <StatCard label="Not Started" value={consentData.filter(c => c.status === "not_started").length} icon={I.info} color={DS.colors.muted} />
        </div>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${DS.colors.border}`, display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 80px", gap: 12, fontSize: 11, fontWeight: 700, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>Patient</span><span>Consent Document</span><span>Status</span><span>Signed Date</span><span></span>
          </div>
          {consentData.map(({ patient: p, consentTitle, status, date }) => (
            <div key={p.id} style={{ padding: "13px 20px", borderBottom: `1px solid ${DS.colors.border}`, display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 80px", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar name={p.name} size={30} color={primaryColor} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: DS.colors.muted }}>{p.treatment}</div>
                </div>
              </div>
              <span style={{ fontSize: 13, color: DS.colors.muted }}>{consentTitle}</span>
              <Chip color={statusColor(status)} dot>{statusLabel(status)}</Chip>
              <span style={{ fontSize: 12.5, color: DS.colors.muted }}>{date || "—"}</span>
              <Btn size="sm" variant="secondary" onClick={() => {
                setViewConsent({ patient: p, consentTitle, status, date, content: consentForms[0]?.content || "" });
              }}>View</Btn>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
function AdminUploads() {
  const { showToast, primaryColor } = useApp();
  const [uploads, setUploads] = useState([
    { id: "u1", patient: "Jordan Rivera", patient_id: "pat_1", file: "Lab_Results_2024.pdf", size: "244 KB", date: "Jan 8, 2025", status: "reviewed", type: "pdf" },
    { id: "u2", patient: "Jordan Rivera", patient_id: "pat_1", file: "Insurance_Card.jpg", size: "128 KB", date: "Jan 9, 2025", status: "pending", type: "image" },
    { id: "u3", patient: "Taylor Brooks", patient_id: "pat_2", file: "MRI_Scan.pdf", size: "1.2 MB", date: "Dec 22, 2024", status: "pending", type: "pdf" },
  ]);
  const [viewing, setViewing] = useState(null);
  const [filter, setFilter] = useState("all");

  const markReviewed = (id) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, status: "reviewed" } : u));
    showToast("File marked as reviewed");
  };

  const filtered = filter === "all" ? uploads : uploads.filter(u => u.status === filter);

  return (
    <div>
      <Modal open={!!viewing} onClose={() => setViewing(null)}
        title={viewing?.file || "File Preview"}
        subtitle={`From ${viewing?.patient} · ${viewing?.size} · Uploaded ${viewing?.date}`}
        width={520}>
        {viewing && (
          <div>
            <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: "40px 20px", textAlign: "center", border: `1px solid ${DS.colors.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>{viewing.type === "pdf" ? "📄" : "🖼️"}</div>
              <div style={{ fontWeight: 600, fontSize: 15, color: DS.colors.ink }}>{viewing.file}</div>
              <div style={{ fontSize: 13, color: DS.colors.muted, marginTop: 4 }}>{viewing.size}</div>
              <div style={{ marginTop: 16, fontSize: 12, color: DS.colors.muted, background: DS.colors.white, borderRadius: DS.radius.md, padding: "10px 14px", border: `1px solid ${DS.colors.border}` }}>
                File preview is available in the full production environment with secure storage integration.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              {viewing.status === "pending" && (
                <Btn onClick={() => { markReviewed(viewing.id); setViewing(null); }}>{I.check} Mark as Reviewed</Btn>
              )}
              {viewing.status === "reviewed" && <Chip color={DS.colors.success} dot>Already Reviewed</Chip>}
            </div>
          </div>
        )}
      </Modal>

      <PageHead title="Uploaded Files" subtitle="Review patient-submitted documents and photos" />
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {[["all", "All Files"], ["pending", "Pending Review"], ["reviewed", "Reviewed"]].map(([val, lbl]) => (
            <button key={val} onClick={() => setFilter(val)}
              style={{ padding: "7px 16px", borderRadius: DS.radius.full, border: `1.5px solid ${filter === val ? DS.colors.primary : DS.colors.border}`, background: filter === val ? DS.colors.primaryLight : DS.colors.white, color: filter === val ? DS.colors.primary : DS.colors.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body, transition: "all 0.12s" }}>
              {lbl}
              <span style={{ marginLeft: 6, background: filter === val ? DS.colors.primary : DS.colors.border, color: filter === val ? "#fff" : DS.colors.muted, borderRadius: DS.radius.full, padding: "1px 7px", fontSize: 11 }}>
                {val === "all" ? uploads.length : uploads.filter(u => u.status === val).length}
              </span>
            </button>
          ))}
        </div>
        <Card>
          {filtered.length === 0 && <div style={{ padding: "32px", textAlign: "center", color: DS.colors.muted }}>No files match this filter.</div>}
          {filtered.map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
              <div style={{ width: 40, height: 40, borderRadius: DS.radius.md, background: DS.colors.surface, border: `1px solid ${DS.colors.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                {u.type === "pdf" ? "📄" : "🖼️"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.colors.ink }}>{u.file}</div>
                <div style={{ fontSize: 12, color: DS.colors.muted }}>From {u.patient} · {u.size} · {u.date}</div>
              </div>
              <Chip color={u.status === "reviewed" ? DS.colors.success : DS.colors.warning} dot>
                {u.status === "reviewed" ? "Reviewed" : "Pending Review"}
              </Chip>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn size="sm" variant="secondary" onClick={() => setViewing(u)}>View</Btn>
                {u.status === "pending" && (
                  <Btn size="sm" variant="primary" onClick={() => markReviewed(u.id)}>{I.check} Review</Btn>
                )}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
function AdminFollowUp() {
  const { currentUser, showToast, primaryColor, patients, followups } = useApp();
  const [items, setItems] = useState(followups.map(f => ({
    id: f.id, patient: f.patient?.name || "", patient_id: f.patient_id, form: f.questionnaire || "Follow-Up",
    sent: f.submitted_at ? new Date(f.submitted_at).toLocaleDateString() : "", status: "completed", response: f.answers,
  })));
  const [showSend, setShowSend] = useState(false);
  const [sendPatient, setSendPatient] = useState("");
  const [sendForm, setSendForm] = useState("48-Hour Post-Treatment Check-In");
  const [viewResponse, setViewResponse] = useState(null);
  const [sending, setSending] = useState(false);
  const pending = items.filter(i => i.status === "pending").length;
  const completed = items.filter(i => i.status === "completed").length;

  const doSend = async () => {
    if (!sendPatient || !sendForm) { showToast("Select a patient and form", "error"); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    const p = patients.find(p => p.id === sendPatient);
    setItems(prev => [{ id: "fq_" + Date.now(), patient: p?.name || "", patient_id: sendPatient, form: sendForm, sent: new Date().toLocaleDateString(), status: "pending", response: null }, ...prev]);
    setSending(false);
    setShowSend(false);
    setSendPatient(""); setSendForm("48-Hour Post-Treatment Check-In");
    showToast(`Follow-up questionnaire sent to ${p?.name}`);
  };

  return (
    <div>
      <Modal open={showSend} onClose={() => setShowSend(false)} title="Send Follow-Up Questionnaire" width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Patient</label>
            <select value={sendPatient} onChange={e => setSendPatient(e.target.value)}
              style={{ width: "100%", border: `1.5px solid ${DS.colors.border}`, borderRadius: DS.radius.md, padding: "11px 14px", fontSize: 14, color: DS.colors.ink, fontFamily: DS.fonts.body, background: DS.colors.surface }}>
              <option value="">Select a patient...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Questionnaire</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {["48-Hour Post-Treatment Check-In", "1-Week Follow-Up Survey", "30-Day Progress Check", "Custom Questionnaire"].map(f => (
                <button key={f} onClick={() => setSendForm(f)}
                  style={{ padding: "10px 14px", borderRadius: DS.radius.md, border: `1.5px solid ${sendForm === f ? DS.colors.primary : DS.colors.border}`, background: sendForm === f ? DS.colors.primaryLight : DS.colors.white, color: sendForm === f ? DS.colors.primary : DS.colors.ink, fontSize: 13.5, fontWeight: sendForm === f ? 600 : 400, cursor: "pointer", fontFamily: DS.fonts.body, textAlign: "left", transition: "all 0.12s" }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowSend(false)}>Cancel</Btn>
            <Btn onClick={doSend} loading={sending} disabled={!sendPatient}>{I.refresh} Send Questionnaire</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={!!viewResponse} onClose={() => setViewResponse(null)}
        title="Follow-Up Response"
        subtitle={viewResponse ? `${viewResponse.patient} · ${viewResponse.form}` : ""}
        width={480}>
        {viewResponse?.response && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: "14px 16px", border: `1px solid ${DS.colors.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Pain Level</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: DS.colors.primary }}>{viewResponse.response.pain}/10</div>
            </div>
            <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: "14px 16px", border: `1px solid ${DS.colors.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Swelling</div>
              <div style={{ fontSize: 14, color: DS.colors.ink }}>{viewResponse.response.swelling}</div>
            </div>
            {viewResponse.response.notes && (
              <div style={{ background: DS.colors.surface, borderRadius: DS.radius.md, padding: "14px 16px", border: `1px solid ${DS.colors.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Patient Notes</div>
                <div style={{ fontSize: 14, color: DS.colors.ink, lineHeight: 1.65 }}>{viewResponse.response.notes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <PageHead title="Follow-Up Queue" subtitle="Post-treatment questionnaires and check-ins"
        actions={<Btn size="sm" onClick={() => setShowSend(true)}>{I.refresh} Send Follow-Up</Btn>} />
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard label="Awaiting Response" value={pending} icon={I.refresh} color={DS.colors.warning} />
          <StatCard label="Responses Received" value={completed} icon={I.check} color={DS.colors.success} />
          <StatCard label="Overdue" value="0" icon={I.bell} color={DS.colors.danger} />
        </div>
        <Card>
          {items.length === 0 && <div style={{ padding: 32, textAlign: "center", color: DS.colors.muted }}>No follow-up questionnaires sent yet.</div>}
          {items.map((f, i) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: i < items.length - 1 ? `1px solid ${DS.colors.border}` : "none" }}>
              <Avatar name={f.patient} size={34} color={primaryColor} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: DS.colors.ink }}>{f.patient}</div>
                <div style={{ fontSize: 12.5, color: DS.colors.muted }}>{f.form} · Sent {f.sent}</div>
              </div>
              <Chip color={f.status === "completed" ? DS.colors.success : DS.colors.warning} dot>
                {f.status === "completed" ? "Response Received" : "Awaiting Response"}
              </Chip>
              {f.status === "completed" && f.response && (
                <Btn size="sm" variant="secondary" onClick={() => setViewResponse(f)}>View Response</Btn>
              )}
              {f.status === "pending" && (
                <Btn size="sm" variant="ghost" onClick={() => showToast(`Reminder sent to ${f.patient}`)}>Nudge</Btn>
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
function AdminReminders() {
  const { currentUser, showToast, primaryColor, reminderLog, addReminderLog, patients, getUserById } = useApp();
  const [showSend, setShowSend] = useState(false);
  const [sendPatient, setSendPatient] = useState("all");
  const [sendType, setSendType] = useState("intake");
  const [sendChannel, setSendChannel] = useState("Email");
  const [sending, setSending] = useState(false);
  const [automations, setAutomations] = useState([
    { id: "a1", label: "3-Day Consent Reminder", trigger: "When consent unsigned > 24h", channel: "Email", active: true },
    { id: "a2", label: "Intake Form Reminder", trigger: "3 days before appointment", channel: "Email + SMS", active: true },
    { id: "a3", label: "Post-Visit Check-In", trigger: "48h after appointment", channel: "Email + SMS", active: true },
    { id: "a4", label: "No-Show Re-engagement", trigger: "24h after missed appointment", channel: "SMS", active: false },
  ]);

  const clinicLog = reminderLog || [];

  const patientName = (pid) => {
    const r = reminderLog.find(r => r.patient_id === pid);
    return r?.patient?.name || getUserById(pid)?.name || pid;
  };

  const doSend = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 900));
    const targets = sendPatient === "all" ? patients : patients.filter(p => p.id === sendPatient);
    targets.forEach(p => {
      addReminderLog(p.id, { type: sendType, channel: sendChannel, message: `${sendType.charAt(0).toUpperCase() + sendType.slice(1)} reminder sent via ${sendChannel}.` });
    });
    setSending(false);
    setShowSend(false);
    showToast(`Reminder sent to ${targets.length} patient${targets.length !== 1 ? "s" : ""}`);
  };

  const toggleAutomation = (id) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
    const a = automations.find(x => x.id === id);
    showToast(`${a?.label} ${a?.active ? "disabled" : "enabled"}`);
  };

  return (
    <div>
      <Modal open={showSend} onClose={() => setShowSend(false)} title="Send Reminder" subtitle="Send to one or all patients" width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Patient</label>
            <select value={sendPatient} onChange={e => setSendPatient(e.target.value)}
              style={{ width: "100%", border: `1.5px solid ${DS.colors.border}`, borderRadius: DS.radius.md, padding: "11px 14px", fontSize: 14, color: DS.colors.ink, fontFamily: DS.fonts.body, background: DS.colors.surface }}>
              <option value="all">All Patients ({patients.length})</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Reminder Type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {[["intake","Intake Form"],["consent","Consent"],["upload","File Upload"],["appointment","Appointment"],["followup","Follow-Up"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setSendType(val)}
                  style={{ padding: "7px 13px", borderRadius: DS.radius.full, border: `1.5px solid ${sendType === val ? DS.colors.primary : DS.colors.border}`, background: sendType === val ? DS.colors.primaryLight : DS.colors.white, color: sendType === val ? DS.colors.primary : DS.colors.muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body, transition: "all 0.12s" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Channel</label>
            <div style={{ display: "flex", gap: 7 }}>
              {["Email", "SMS", "Email + SMS"].map(ch => (
                <button key={ch} onClick={() => setSendChannel(ch)}
                  style={{ padding: "7px 13px", borderRadius: DS.radius.full, border: `1.5px solid ${sendChannel === ch ? DS.colors.primary : DS.colors.border}`, background: sendChannel === ch ? DS.colors.primaryLight : DS.colors.white, color: sendChannel === ch ? DS.colors.primary : DS.colors.muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: DS.fonts.body, transition: "all 0.12s" }}>
                  {ch}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowSend(false)}>Cancel</Btn>
            <Btn onClick={doSend} loading={sending}>{I.bell} Send Reminder</Btn>
          </div>
        </div>
      </Modal>

      <PageHead title="Reminders" subtitle="Manage automated and manual reminder campaigns"
        actions={<Btn size="sm" onClick={() => setShowSend(true)}>{I.bell} Send Reminder</Btn>} />
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Automation Rules</h3>
              {automations.map(a => (
                <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, color: DS.colors.ink }}>{a.label}</span>
                      {a.active && <Chip color={DS.colors.primary} size="sm">{I.spark} AI</Chip>}
                    </div>
                    <div style={{ fontSize: 12, color: DS.colors.muted }}>{a.trigger} · {a.channel}</div>
                  </div>
                  <button onClick={() => toggleAutomation(a.id)}
                    style={{ width: 42, height: 24, borderRadius: DS.radius.full, background: a.active ? DS.colors.primary : DS.colors.border, border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: a.active ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </button>
                </div>
              ))}
            </Card>
          </div>
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Reminder Log</h3>
            {clinicLog.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: DS.colors.muted, fontSize: 13 }}>No reminders sent yet.</div>
            )}
            {clinicLog.slice(0, 8).map((r, i) => (
              <div key={r.id} style={{ padding: "10px 0", borderBottom: i < Math.min(clinicLog.length, 8) - 1 ? `1px solid ${DS.colors.border}` : "none" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: DS.colors.ink, textTransform: "capitalize" }}>{patientName(r.patient_id)} · {r.type} Reminder</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, color: DS.colors.muted }}>via {r.channel} · {new Date(r.sent_at).toLocaleDateString()}</span>
                  <Chip color={DS.colors.success} dot size="sm">Delivered</Chip>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
function AdminBranding() {
  const { clinic, showToast } = useApp();
  const [color, setColor] = useState(clinic?.primary_color || DS.colors.primary);
  const [name, setName] = useState(clinic?.clinic_name || "");
  const [tagline, setTagline] = useState(clinic?.tagline || "");
  const [email, setEmail] = useState(clinic?.contact_email || "");
  const [phone, setPhone] = useState(clinic?.contact_phone || "");
  return (
    <div>
      <PageHead title="Branding Settings" subtitle="Customize your clinic's patient portal" actions={<Btn size="sm" onClick={() => showToast("Branding saved!")}>Save Changes</Btn>} />
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Card>
              <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700 }}>Clinic Identity</h3>
              <Input label="Clinic Name" value={name} onChange={setName} style={{ marginBottom: 14 }} />
              <Input label="Portal Tagline" value={tagline} onChange={setTagline} style={{ marginBottom: 14 }} />
              <Input label="Support Email" value={email} onChange={setEmail} type="email" style={{ marginBottom: 14 }} />
              <Input label="Support Phone" value={phone} onChange={setPhone} />
            </Card>
            <Card>
              <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700 }}>Brand Colors</h3>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 10 }}>Primary Color</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 50, height: 50, borderRadius: DS.radius.md, border: `1.5px solid ${DS.colors.border}`, cursor: "pointer" }} />
                  <Input value={color} onChange={setColor} placeholder="#1C4532" style={{ flex: 1 }} />
                </div>
              </div>
            </Card>
          </div>
          <Card>
            <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Portal Preview</h3>
            <div style={{ border: `1.5px solid ${DS.colors.border}`, borderRadius: DS.radius.md, overflow: "hidden" }}>
              <div style={{ background: color, padding: "16px 20px" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>{name}</div>
                <div style={{ fontSize: 12, color: "#ffffff80", marginTop: 2 }}>{tagline}</div>
              </div>
              <div style={{ background: color + "10", padding: "16px 20px" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: DS.colors.ink, marginBottom: 10 }}>Welcome back, Jordan</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ background: color, color: "#fff", padding: "7px 14px", borderRadius: DS.radius.md, fontSize: 12, fontWeight: 600 }}>My Tasks</div>
                  <div style={{ background: "#fff", border: `1.5px solid ${DS.colors.border}`, color: DS.colors.muted, padding: "7px 14px", borderRadius: DS.radius.md, fontSize: 12, fontWeight: 600 }}>Upload Files</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AdminStaff() {
  const { currentUser, showToast, primaryColor, staffList: loadedStaff } = useApp();
  const [staffList, setStaffList] = useState(loadedStaff);
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editRole, setEditRole] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteTitle, setInviteTitle] = useState("");
  const [inviteRole, setInviteRole] = useState("clinic_staff");
  const [inviting, setInviting] = useState(false);

  const saveEdit = () => {
    setStaffList(prev => prev.map(u => u.id === editing.id ? { ...u, name: editName, title: editTitle, role: editRole } : u));
    setEditing(null);
    showToast("Staff member updated");
  };

  const doInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) { showToast("Name and email are required", "error"); return; }
    setInviting(true);
    await new Promise(r => setTimeout(r, 700));
    const newUser = { id: "usr_" + Date.now(), name: inviteName, email: inviteEmail, title: inviteTitle, role: inviteRole, clinic_id: currentUser.clinic_id };
    setStaffList(prev => [...prev, newUser]);
    setInviting(false);
    setShowInvite(false);
    setInviteName(""); setInviteEmail(""); setInviteTitle(""); setInviteRole("clinic_staff");
    showToast(`Invite sent to ${inviteName}`);
  };

  return (
    <div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Staff Member" width={440}>
        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Full Name" value={editName} onChange={setEditName} required />
            <Input label="Title / Role Description" value={editTitle} onChange={setEditTitle} placeholder="e.g. Care Coordinator" />
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Permission Level</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[["clinic_staff", "Staff"], ["clinic_admin", "Admin"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => setEditRole(val)}
                    style={{ flex: 1, padding: "10px", borderRadius: DS.radius.md, border: `1.5px solid ${editRole === val ? DS.colors.primary : DS.colors.border}`, background: editRole === val ? DS.colors.primaryLight : DS.colors.white, color: editRole === val ? DS.colors.primary : DS.colors.ink, fontSize: 13.5, fontWeight: editRole === val ? 700 : 400, cursor: "pointer", fontFamily: DS.fonts.body, transition: "all 0.12s" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
              <Btn variant="secondary" onClick={() => setEditing(null)}>Cancel</Btn>
              <Btn onClick={saveEdit}>Save Changes</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Staff Member" subtitle="They will receive an email invite to join your clinic" width={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Full Name" value={inviteName} onChange={setInviteName} placeholder="Dr. Jane Smith" required />
          <Input label="Email Address" value={inviteEmail} onChange={setInviteEmail} type="email" placeholder="jane@clinic.com" required />
          <Input label="Title" value={inviteTitle} onChange={setInviteTitle} placeholder="e.g. Front Desk, Care Coordinator" />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Permission Level</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[["clinic_staff", "Staff — View & manage patients"], ["clinic_admin", "Admin — Full clinic access"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setInviteRole(val)}
                  style={{ flex: 1, padding: "12px", borderRadius: DS.radius.md, border: `1.5px solid ${inviteRole === val ? DS.colors.primary : DS.colors.border}`, background: inviteRole === val ? DS.colors.primaryLight : DS.colors.white, color: inviteRole === val ? DS.colors.primary : DS.colors.ink, fontSize: 12.5, fontWeight: inviteRole === val ? 700 : 400, cursor: "pointer", fontFamily: DS.fonts.body, transition: "all 0.12s", textAlign: "left" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Btn>
            <Btn onClick={doInvite} loading={inviting}>{I.user} Send Invite</Btn>
          </div>
        </div>
      </Modal>

      <PageHead title="Staff Users" subtitle="Manage your clinic team"
        actions={<Btn size="sm" onClick={() => setShowInvite(true)}>{I.user} Invite Staff</Btn>} />
      <div style={{ padding: "28px 36px" }}>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${DS.colors.border}`, display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 80px", gap: 12, fontSize: 11, fontWeight: 700, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>Name</span><span>Email</span><span>Title</span><span>Role</span><span></span>
          </div>
          {staffList.map(u => (
            <div key={u.id} style={{ padding: "14px 20px", borderBottom: `1px solid ${DS.colors.border}`, display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 80px", gap: 12, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={u.name} size={30} color={primaryColor} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}</div>
                </div>
              </div>
              <span style={{ fontSize: 12.5, color: DS.colors.muted }}>{u.email}</span>
              <span style={{ fontSize: 12.5, color: DS.colors.muted }}>{u.title || "—"}</span>
              <Chip color={u.role === "clinic_admin" ? DS.colors.purple : DS.colors.blue}>
                {u.role === "clinic_admin" ? "Admin" : "Staff"}
              </Chip>
              <Btn size="sm" variant="secondary" onClick={() => { setEditing(u); setEditName(u.name); setEditTitle(u.title || ""); setEditRole(u.role); }}>Edit</Btn>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────
// SUPER ADMIN
// ─────────────────────────────────────────────────────────
function SuperAdminPortal() {
  const { currentUser, logout } = useApp();
  const { isMobile, isTablet } = useIsMobile();
  const isCollapsed = isMobile || isTablet;
  const [active, setActive] = useState("sad");
  const pc = "#B45309";
  const nav = [
    { key: "sad", label: "Platform Overview", icon: I.home },
    { key: "sac", label: "All Clinics", icon: I.clinic },
    { key: "sau", label: "All Users", icon: I.patients },
    { key: "sam", label: "Market Analysis", icon: I.chart },
  ];
  const pages = { sad: <SuperDash />, sac: <SuperClinics />, sau: <SuperUsers />, sam: <MarketPage /> };
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: DS.colors.surface, fontFamily: DS.fonts.body }}>
      <Sidebar items={nav} active={active} onSelect={setActive} user={currentUser} clinic={null} onLogout={logout} primaryColor={pc} />
      <div style={{ marginLeft: isCollapsed ? 0 : 232, flex: 1, paddingTop: isCollapsed ? 56 : 0 }}>
        {pages[active] || <SuperDash />}
      </div>
    </div>
  );
}

function SuperDash() {
  const { allClinics } = useApp();
  return (
    <div>
      <PageHead title="Platform Overview" eyebrow="Super Admin" subtitle="RegenFlow multi-tenant platform management" />
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          <StatCard label="Active Clinics" value={allClinics.length} icon={I.clinic} color="#B45309" delta={15} />
          <StatCard label="Total Patients" value="—" icon={I.patients} color={DS.colors.blue} />
          <StatCard label="Staff Users" value="—" icon={I.user} color={DS.colors.purple} />
          <StatCard label="Platform MRR" value="—" icon={I.chart} color={DS.colors.success} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Active Tenants</h3>
            {allClinics.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${DS.colors.border}` }}>
                <div style={{ width: 38, height: 38, borderRadius: DS.radius.md, background: (c.primary_color || DS.colors.primary) + "18", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: c.primary_color || DS.colors.primary, fontSize: 15 }}>{c.clinic_name?.[0] || "C"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.clinic_name}</div>
                  <div style={{ fontSize: 11.5, color: DS.colors.muted }}>{c.plan_type} plan</div>
                </div>
                <Chip color={c.is_active ? DS.colors.success : DS.colors.muted} dot>{c.is_active ? "Active" : "Inactive"}</Chip>
              </div>
            ))}
          </Card>
          <Card>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700 }}>Platform Activity</h3>
            {allClinics.slice(0, 4).map((c, i) => ({ t: `${c.clinic_name} registered`, time: c.created_at ? new Date(c.created_at).toLocaleDateString() : "—" })).map((a, i) => (
              <div key={i} style={{ padding: "9px 0", borderBottom: i < 3 ? `1px solid ${DS.colors.border}` : "none", fontSize: 13 }}>
                <div>{a.t}</div>
                <div style={{ fontSize: 11, color: DS.colors.muted, marginTop: 1 }}>{a.time}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

function SuperClinics() {
  const { showToast, allClinics, setAllClinics } = useApp();
  const [clinics, setClinics] = useState(allClinics.map(c => ({ ...c })));
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPlan, setNewPlan] = useState("starter");
  const [viewClinic, setViewClinic] = useState(null);
  const [creating, setCreating] = useState(false);

  const deactivate = (id) => {
    setClinics(prev => prev.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c));
    const c = clinics.find(x => x.id === id);
    showToast(`${c?.clinic_name} ${c?.is_active ? "deactivated" : "reactivated"}`);
  };

  const doCreate = async () => {
    if (!newName.trim() || !newEmail.trim()) { showToast("Name and email are required", "error"); return; }
    setCreating(true);
    await new Promise(r => setTimeout(r, 800));
    const newClinic = {
      id: "clinic_" + Date.now(),
      clinic_name: newName,
      clinic_slug: newName.toLowerCase().replace(/\s+/g, "-"),
      primary_color: "#1C4532",
      secondary_color: "#E8F0EC",
      contact_email: newEmail,
      plan_type: newPlan,
      is_active: true,
      address: "",
      portal_title: newName + " Patient Portal",
      tagline: "Specialty regenerative care.",
    };
    setClinics(prev => [...prev, newClinic]);
    setCreating(false);
    setShowNew(false);
    setNewName(""); setNewEmail(""); setNewPlan("starter");
    showToast(`${newName} provisioned successfully`);
  };

  return (
    <div>
      <Modal open={!!viewClinic} onClose={() => setViewClinic(null)}
        title={viewClinic?.clinic_name || ""}
        subtitle={viewClinic?.address || ""}
        width={500}>
        {viewClinic && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              ["Email", viewClinic.contact_email],
              ["Phone", viewClinic.contact_phone || "—"],
              ["Plan", viewClinic.plan_type],
              ["Status", viewClinic.is_active ? "Active" : "Inactive"],
              ["Portal Title", viewClinic.portal_title || "—"],
              ["Tagline", viewClinic.tagline || "—"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${DS.colors.border}`, fontSize: 13.5 }}>
                <span style={{ color: DS.colors.muted, fontWeight: 500 }}>{l}</span>
                <span style={{ fontWeight: 600, color: DS.colors.ink, maxWidth: 260, textAlign: "right" }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
              <Btn variant="secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => { showToast("Impersonation mode — in production this would switch clinic context"); setViewClinic(null); }}>Impersonate</Btn>
              <Btn variant={viewClinic.is_active ? "danger" : "secondary"} style={{ flex: 1, justifyContent: "center" }}
                onClick={() => { deactivate(viewClinic.id); setViewClinic(prev => prev ? { ...prev, is_active: !prev.is_active } : null); }}>
                {viewClinic.is_active ? "Deactivate" : "Reactivate"}
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Provision New Clinic" subtitle="Creates a new tenant on RegenFlow" width={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Clinic Name" value={newName} onChange={setNewName} placeholder="Scottsdale Regenerative Medicine" required />
          <Input label="Admin Email" value={newEmail} onChange={setNewEmail} type="email" placeholder="admin@clinic.com" required />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 8 }}>Plan</label>
            <div style={{ display: "flex", gap: 10 }}>
              {[["starter", "Starter · $149/mo"], ["pro", "Growth · $299/mo"], ["enterprise", "Enterprise"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setNewPlan(val)}
                  style={{ flex: 1, padding: "10px 8px", borderRadius: DS.radius.md, border: `1.5px solid ${newPlan === val ? DS.colors.primary : DS.colors.border}`, background: newPlan === val ? DS.colors.primaryLight : DS.colors.white, color: newPlan === val ? DS.colors.primary : DS.colors.ink, fontSize: 12, fontWeight: newPlan === val ? 700 : 400, cursor: "pointer", fontFamily: DS.fonts.body, textAlign: "center", transition: "all 0.12s" }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setShowNew(false)}>Cancel</Btn>
            <Btn onClick={doCreate} loading={creating}>{I.clinic} Provision Clinic</Btn>
          </div>
        </div>
      </Modal>

      <PageHead title="All Clinics" subtitle="Manage tenant accounts"
        actions={<Btn size="sm" onClick={() => setShowNew(true)}>{I.clinic} New Clinic</Btn>} />
      <div style={{ padding: "28px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {clinics.map(c => (
            <Card key={c.id} style={{ opacity: c.is_active ? 1 : 0.6 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
                <div style={{ width: 46, height: 46, borderRadius: DS.radius.md, background: c.primary_color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, color: c.primary_color, flexShrink: 0 }}>
                  {c.clinic_name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: DS.colors.ink }}>{c.clinic_name}</div>
                  <div style={{ fontSize: 12.5, color: DS.colors.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.address || c.contact_email}</div>
                </div>
                <Chip color={c.is_active ? DS.colors.success : DS.colors.muted} dot>{c.is_active ? "Active" : "Inactive"}</Chip>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                {[
                  ["Patients", "—"],
                  ["Staff", "—"],
                  ["Plan", c.plan_type]
                ].map(([l, v]) => (
                  <div key={l} style={{ textAlign: "center", padding: "10px 8px", background: DS.colors.surface, borderRadius: DS.radius.md }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: DS.colors.ink }}>{v}</div>
                    <div style={{ fontSize: 11, color: DS.colors.muted }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn size="sm" variant="secondary" onClick={() => setViewClinic(c)}>View Details</Btn>
                <Btn size="sm" variant="secondary" onClick={() => { showToast("Impersonation mode — in production this would switch clinic context"); }}>Impersonate</Btn>
                <Btn size="sm" variant={c.is_active ? "danger" : "secondary"} onClick={() => deactivate(c.id)}>
                  {c.is_active ? "Deactivate" : "Reactivate"}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
function SuperUsers() {
  const { allClinics, getClinicById } = useApp();
  const [users, setUsers] = useState([]);
  useEffect(() => {
    // For super admin, we don't have a single allUsers list without iterating clinics.
    // Show a placeholder until a more complete endpoint is available.
    setUsers([]);
  }, []);
  return (
    <div>
      <PageHead title="All Users" subtitle="Every user across all tenants" />
      <div style={{ padding: "28px 36px" }}>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${DS.colors.border}`, display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr", gap: 12, fontSize: 11, fontWeight: 700, color: DS.colors.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>Name</span><span>Email</span><span>Role</span><span>Clinic</span><span>Status</span>
          </div>
          {users.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: DS.colors.muted }}>
              User listing is loaded per-clinic. Select a clinic to view its users.
            </div>
          )}
          {users.map(u => {
            const c = u.clinic_id ? getClinicById(u.clinic_id) : null;
            const roleColors = { super_admin: "#B45309", clinic_admin: DS.colors.purple, clinic_staff: DS.colors.blue, patient: DS.colors.success };
            return (
              <div key={u.id} style={{ padding: "13px 20px", borderBottom: `1px solid ${DS.colors.border}`, display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={u.name} size={28} color={roleColors[u.role] || DS.colors.muted} />
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{u.name}</span>
                </div>
                <span style={{ fontSize: 12.5, color: DS.colors.muted }}>{u.email}</span>
                <Chip color={roleColors[u.role] || DS.colors.muted}>{(u.role || "").replace("_", " ")}</Chip>
                <span style={{ fontSize: 12.5, color: DS.colors.muted }}>{c?.clinic_name || "Platform"}</span>
                <Chip color={DS.colors.success} dot>Active</Chip>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────
function Router() {
  const { page, currentUser } = useApp();
  if (!currentUser) {
    if (page === "login") return <LoginPage />;
    if (page === "signup") return <SignupPage />;
    if (page === "forgot") return <ForgotPage />;
    if (page === "market") return <MarketPage />;
    return <HomePage />;
  }
  if (currentUser.role === "patient") return <PatientPortal />;
  if (currentUser.role === "super_admin") return <SuperAdminPortal />;
  return <AdminPortal />;
}

export default function App() {
  return <AppProvider><Router /></AppProvider>;
}
