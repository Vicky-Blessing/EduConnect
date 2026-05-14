import { useState, useEffect } from 'react'
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  doc,
  setDoc,
  orderBy,
  updateDoc,
  deleteDoc
} from './firebase/config'
import ClassManager from './components/ClassManager';
import AssignmentsManager from './components/AssignmentsManager';
import './App.css'

const COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#DBEAFE",
  success: "#16A34A",
  successLight: "#DCFCE7",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  live: "#7C3AED",
  liveLight: "#EDE9FE",
  gray: "#6B7280",
  grayLight: "#F9FAFB",
  border: "#E5E7EB",
  text: "#111827",
  textMuted: "#6B7280",
  white: "#FFFFFF",
  navBg: "#0F172A",
  navText: "#94A3B8",
  navActive: "#FFFFFF",
  navHover: "#1E293B",
};

const upcomingClasses = [
  { id: 1, name: "Mathematics - Algebra II", time: "Today, 10:00 AM", teacher: "Mr. Omondi", grade: "Grade 10", status: "upcoming", color: "#2563EB" },
  { id: 2, name: "English Literature", time: "Today, 12:30 PM", teacher: "Ms. Wanjiru", grade: "Grade 11", status: "live", color: "#7C3AED" },
  { id: 3, name: "Biology - Cell Division", time: "Tomorrow, 9:00 AM", teacher: "Dr. Kamau", grade: "Form 3", status: "upcoming", color: "#059669" },
  { id: 4, name: "Physics - Mechanics", time: "Tomorrow, 2:00 PM", teacher: "Mr. Njoroge", grade: "Form 4", status: "upcoming", color: "#D97706" },
];

const assignments = [
  { id: 1, title: "Algebra Problem Set 5", subject: "Mathematics", dueDate: "May 2, 2026", status: "pending", submitted: false },
  { id: 2, title: "Essay: Themes in Chinua Achebe", subject: "English Literature", dueDate: "Apr 30, 2026", status: "overdue", submitted: false },
  { id: 3, title: "Cell Division Lab Report", subject: "Biology", dueDate: "May 5, 2026", status: "submitted", submitted: true },
  { id: 4, title: "Mechanics Problem Sheet", subject: "Physics", dueDate: "May 7, 2026", status: "pending", submitted: false },
];

const teacherClasses = [
  { id: 1, name: "Mathematics - Grade 10", students: 32, schedule: "Mon, Wed, Fri · 10:00 AM", status: "active" },
  { id: 2, name: "Mathematics - Form 3", students: 28, schedule: "Tue, Thu · 9:00 AM", status: "active" },
  { id: 3, name: "Advanced Calculus - Form 4", students: 24, schedule: "Mon, Wed · 2:00 PM", status: "active" },
];

const recentSubmissions = [
  { id: 1, student: "Amara Osei", assignment: "Algebra Problem Set 5", submittedAt: "30 Apr, 11:42 AM", grade: "A", status: "graded" },
  { id: 2, student: "Kenji Mwangi", assignment: "Algebra Problem Set 5", submittedAt: "30 Apr, 10:15 AM", grade: null, status: "pending" },
  { id: 3, student: "Zara Njoki", assignment: "Problem Sheet 3", submittedAt: "29 Apr, 4:00 PM", grade: "B+", status: "graded" },
  { id: 4, student: "David Kariuki", assignment: "Algebra Problem Set 5", submittedAt: "29 Apr, 9:30 AM", grade: "A-", status: "graded" },
];

function StatusBadge({ status }) {
  const config = {
    upcoming: { bg: COLORS.primaryLight, text: COLORS.primaryDark, label: "Upcoming" },
    live: { bg: COLORS.liveLight, text: COLORS.live, label: "● Live" },
    completed: { bg: COLORS.grayLight, text: COLORS.gray, label: "Completed" },
    pending: { bg: COLORS.warningLight, text: COLORS.warning, label: "Pending" },
    overdue: { bg: COLORS.dangerLight, text: COLORS.danger, label: "Overdue" },
    submitted: { bg: COLORS.successLight, text: COLORS.success, label: "Submitted" },
    graded: { bg: COLORS.successLight, text: COLORS.success, label: "Graded" },
    active: { bg: COLORS.primaryLight, text: COLORS.primaryDark, label: "Active" },
  };
  const c = config[status] || config.upcoming;
  return (
    <span style={{
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 600, padding: "3px 10px",
      borderRadius: 20, letterSpacing: 0.3, whiteSpace: "nowrap"
    }}>{c.label}</span>
  );
}

function Avatar({ name, size = 36 }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color + "22", color, fontWeight: 700,
      fontSize: size * 0.38, display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0, border: `1.5px solid ${color}44`
    }}>{initials}</div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: COLORS.white, borderRadius: 16,
      border: `1px solid ${COLORS.border}`,
      boxShadow: "0 1px 8px rgba(0,0,0,0.06)", padding: 20,
      ...style
    }}>{children}</div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, margin: "0 0 14px" }}>{children}</h2>;
}

// ─── LOGIN PAGE WITH FIREBASE ───────────────────────────────────────────────
function LoginPage({ onLogin, onGoSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (selectedRole) => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.role !== selectedRole) {
          setError(`This account is registered as a ${userData.role}. Please select the correct role.`);
          await signOut(auth);
          setLoading(false);
          return;
        }
        onLogin(userData.role, user.uid, userData);
      } else {
        setError("User data not found. Please contact support.");
        await signOut(auth);
      }
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later");
      } else {
        setError("Login failed. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1a1033 100%)",
      position: "relative", overflow: "hidden", fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      <div style={{
        position: "absolute", width: 400, height: 400, top: -100, left: -100,
        background: "#2563EB33", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", width: 300, height: 300, bottom: -80, right: -60,
        background: "#7C3AED33", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none"
      }} />

      <div style={{
        background: "rgba(255,255,255,0.07)", backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 24, padding: "44px 40px", width: "100%", maxWidth: 420,
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)", position: "relative", zIndex: 1
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "linear-gradient(135deg, #2563EB, #7C3AED)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 14, boxShadow: "0 8px 24px rgba(37,99,235,0.4)"
          }}>
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
              <path d="M12 3L2 8l10 5 10-5-10-5zM2 13l10 5 10-5M2 18l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>EduConnect</h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, margin: 0 }}>Sign in to your account</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(220,38,38,0.2)",
            border: "1px solid #DC2626",
            borderRadius: 8,
            padding: "10px",
            marginBottom: 16,
            color: "#FEE2E2",
            fontSize: 13,
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email address</label>
          <input
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.ac.ke"
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", outline: "none", boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", outline: "none", boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ textAlign: "right", marginBottom: 22 }}>
          <button onClick={() => {}} style={{
            background: "none", border: "none", color: "#93C5FD",
            fontSize: 13, cursor: "pointer", padding: 0
          }}>Forgot Password?</button>
        </div>

        <button 
          onClick={() => handleLogin("student")} 
          disabled={loading}
          style={{
            width: "100%", padding: "13px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #2563EB, #7C3AED)", color: "#fff",
            fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", 
            marginBottom: 10, opacity: loading ? 0.7 : 1,
            boxShadow: "0 4px 20px rgba(37,99,235,0.45)"
          }}>
          {loading ? "Logging in..." : "Login as Student"}
        </button>

        <button 
          onClick={() => handleLogin("teacher")}
          disabled={loading}
          style={{
            width: "100%", padding: "13px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.07)", color: "#fff",
            fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", 
            marginBottom: 22, opacity: loading ? 0.7 : 1
          }}>
          {loading ? "Logging in..." : "Login as Teacher"}
        </button>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>
          Don't have an account?{" "}
          <button onClick={onGoSignup} style={{ background: "none", border: "none", color: "#93C5FD", cursor: "pointer", fontSize: 13, padding: 0 }}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── SIGNUP PAGE WITH FIREBASE ──────────────────────────────────────────────
// ─── SIGNUP PAGE WITH DEPARTMENT FIELD ──────────────────────────────────────────────
function SignupPage({ onGoLogin, onSignupSuccess }) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    department: ""  // ← ADD THIS FIELD
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    // Validate department for teachers
    if (formData.role === "teacher" && !formData.department) {
      setError("Please enter your department");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Prepare user data
      const userDocData = {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        school: "Nairobi Academy",
        createdAt: new Date().toISOString()
      };
      
      // Add department for teachers
      if (formData.role === "teacher") {
        userDocData.department = formData.department;
      }
      
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, userDocData);
      
      onSignupSuccess(formData.role, user.uid, userDocData);
    } catch (err) {
      console.error("Signup error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Email already registered. Please login instead.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address");
      } else {
        setError("Signup failed. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
      position: "relative", overflow: "hidden", fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      <div style={{ position: "absolute", width: 350, height: 350, top: -80, right: -60, background: "#059669aa", borderRadius: "50%", filter: "blur(80px)" }} />
      <div style={{ position: "absolute", width: 250, height: 250, bottom: -60, left: -40, background: "#2563EBaa", borderRadius: "50%", filter: "blur(70px)" }} />

      <div style={{
        background: "rgba(255,255,255,0.07)", backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 24, padding: "44px 40px", width: "100%", maxWidth: 420,
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)", position: "relative", zIndex: 1
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ color: "#fff", fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Create Account</h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, margin: 0 }}>Join EduConnect today</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(220,38,38,0.2)",
            border: "1px solid #DC2626",
            borderRadius: 8,
            padding: "10px",
            marginBottom: 16,
            color: "#FEE2E2",
            fontSize: 13,
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Full Name</label>
            <input
              type="text" 
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              placeholder="Amara Osei"
              required
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="you@school.ac.ke"
              required
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Min. 6 characters"
              required
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="Confirm your password"
              required
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>I am a:</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value, department: e.target.value === "teacher" ? formData.department : ""})}
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff", outline: "none", boxSizing: "border-box"
              }}
            >
              <option value="student" style={{ background: "#1e293b" }}>Student</option>
              <option value="teacher" style={{ background: "#1e293b" }}>Teacher</option>
            </select>
          </div>

          {/* Department field - only shows for teachers */}
          {formData.role === "teacher" && (
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
                required
                style={{
                  width: "100%", padding: "11px 14px", borderRadius: 10, fontSize: 14,
                  background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", outline: "none", boxSizing: "border-box"
                }}
              >
                <option value="" style={{ background: "#1e293b" }}>Select Department</option>
                <option value="Mathematics" style={{ background: "#1e293b" }}>Mathematics</option>
                <option value="English" style={{ background: "#1e293b" }}>English</option>
                <option value="Sciences" style={{ background: "#1e293b" }}>Sciences</option>
                <option value="Humanities" style={{ background: "#1e293b" }}>Humanities</option>
                <option value="Languages" style={{ background: "#1e293b" }}>Languages</option>
                <option value="Computer Science" style={{ background: "#1e293b" }}>Computer Science</option>
                <option value="Physical Education" style={{ background: "#1e293b" }}>Physical Education</option>
                <option value="Arts" style={{ background: "#1e293b" }}>Arts</option>
              </select>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "13px", borderRadius: 10, border: "none", marginTop: 8,
              background: "linear-gradient(135deg, #059669, #0891B2)", color: "#fff",
              fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", 
              marginBottom: 22, opacity: loading ? 0.7 : 1,
              boxShadow: "0 4px 20px rgba(5,150,105,0.4)"
            }}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>
          Already have an account?{" "}
          <button onClick={onGoLogin} style={{ background: "none", border: "none", color: "#6EE7B7", cursor: "pointer", fontSize: 13, padding: 0 }}>
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ activeNav, setActiveNav, role, onLogout, mobileOpen, setMobileOpen, userData }) {
  const [gradesOpen, setGradesOpen] = useState(true);
  const studentNav = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    {
      id: "classes", icon: "📚", label: "My Classes", sub: [
        { id: "grade7-9", label: "Grade 7–9" },
        { id: "grade10-12", label: "Grade 10–12" },
        { id: "form3", label: "Form 3" },
        { id: "form4", label: "Form 4" },
      ]
    },
    { id: "assignments", icon: "✏️", label: "Assignments" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];
  const teacherNav = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "classes", icon: "📚", label: "My Classes" },
    { id: "assignments", icon: "✏️", label: "Assignments" },
    { id: "profile", icon: "👤", label: "Profile" },
  ];
  const navItems = role === "teacher" ? teacherNav : studentNav;

  const sidebarStyle = {
    width: 240, background: COLORS.navBg, display: "flex", flexDirection: "column",
    height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 100,
    transition: "transform 0.3s ease",
    transform: mobileOpen ? "translateX(0)" : undefined,
    fontFamily: "'Segoe UI', system-ui, sans-serif"
  };

  return (
    <>
      {mobileOpen && <div onClick={() => setMobileOpen(false)} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99
      }} />}
      <nav style={sidebarStyle}>
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid #1E293B" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #2563EB, #7C3AED)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                <path d="M12 3L2 8l10 5 10-5-10-5zM2 13l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>EduConnect</div>
              <div style={{ color: "#64748B", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{role === "teacher" ? "Teacher" : "Student"}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
          {navItems.map(item => (
            <div key={item.id}>
              <button
                onClick={() => {
                  if (item.sub) setGradesOpen(o => !o);
                  setActiveNav(item.id);
                  setMobileOpen(false);
                }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: activeNav === item.id ? "#1E293B" : "transparent",
                  color: activeNav === item.id ? COLORS.navActive : COLORS.navText,
                  fontSize: 14, fontWeight: activeNav === item.id ? 600 : 400,
                  marginBottom: 2, textAlign: "left",
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.sub && <span style={{ fontSize: 11, opacity: 0.5 }}>{gradesOpen ? "▴" : "▾"}</span>}
              </button>
              {item.sub && gradesOpen && (
                <div style={{ paddingLeft: 22, marginBottom: 4 }}>
                  {item.sub.map(s => (
                    <button key={s.id} onClick={() => { setActiveNav(s.id); setMobileOpen(false); }}
                      style={{
                        width: "100%", padding: "7px 12px", borderRadius: 8, border: "none",
                        cursor: "pointer", textAlign: "left", fontSize: 13,
                        background: activeNav === s.id ? "#1E293B" : "transparent",
                        color: activeNav === s.id ? "#E2E8F0" : "#64748B",
                        marginBottom: 1, display: "flex", alignItems: "center", gap: 8
                      }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: activeNav === s.id ? "#2563EB" : "#334155", display: "inline-block" }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: "14px 10px", borderTop: "1px solid #1E293B" }}>
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 6 }}>
    <Avatar name={userData?.fullName || (role === "teacher" ? "John Omondi" : "Amara Osei")} size={32} />
    <div>
      <div style={{ color: "#E2E8F0", fontSize: 13, fontWeight: 600 }}>{userData?.fullName || (role === "teacher" ? "John Omondi" : "Amara Osei")}</div>
      <div style={{ color: "#64748B", fontSize: 11 }}>
        {role === "teacher" 
          ? userData?.department || "Teacher" 
          : "Student"}
      </div>
    </div>
  </div>
  <button onClick={onLogout} style={{
    width: "100%", padding: "9px 12px", borderRadius: 10, border: "none",
    background: "transparent", color: "#64748B", fontSize: 13, cursor: "pointer",
    textAlign: "left", display: "flex", alignItems: "center", gap: 8
  }}>
    <span>⬡</span> Logout
  </button>
</div>
      </nav>
    </>
  );
}

// ─── STUDENT DASHBOARD ────────────────────────────────────────────────────────
// ─── STUDENT DASHBOARD WITH REAL DATA ────────────────────────────────────────
function StudentDashboard({ userData }) {
  const [dashboardData, setDashboardData] = useState({
    enrolledClasses: [],
    assignments: [],
    upcomingClasses: [],
    stats: {
      totalClasses: 0,
      assignmentsDue: 0,
      submittedCount: 0,
      overdueCount: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentDashboard();
  }, []);

  const fetchStudentDashboard = async () => {
    try {
      setLoading(true);
      
      // Get student's enrolled classes
      const enrollmentsQuery = query(
        collection(db, "enrollments"), 
        where("studentId", "==", auth.currentUser?.uid),
        where("status", "==", "active")
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      const classIds = enrollmentsSnapshot.docs.map(doc => doc.data().classId);
      
      // Get class details
      let enrolledClasses = [];
      for (const classId of classIds) {
        const classDoc = await getDoc(doc(db, "classes", classId));
        if (classDoc.exists()) {
          enrolledClasses.push({ id: classDoc.id, ...classDoc.data() });
        }
      }
      
      // Get assignments from enrolled classes
      let allAssignments = [];
      for (const classId of classIds) {
        const assignmentsQuery = query(
          collection(db, "assignments"), 
          where("classId", "==", classId),
          orderBy("dueDate", "asc")
        );
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const classAssignments = assignmentsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        allAssignments = [...allAssignments, ...classAssignments];
      }
      
      // Get submissions to check what's submitted
      let submittedAssignmentIds = [];
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("studentId", "==", auth.currentUser?.uid)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      submittedAssignmentIds = submissionsSnapshot.docs.map(doc => doc.data().assignmentId);
      
      // Calculate stats
      const now = new Date();
      const assignmentsDue = allAssignments.filter(a => new Date(a.dueDate) > now).length;
      const submittedCount = submittedAssignmentIds.length;
      const overdueCount = allAssignments.filter(a => 
        new Date(a.dueDate) < now && !submittedAssignmentIds.includes(a.id)
      ).length;
      
      // Get upcoming classes (next 7 days)
      const upcomingClasses = enrolledClasses.filter(c => c.status === "active").slice(0, 4);
      
      setDashboardData({
        enrolledClasses,
        assignments: allAssignments,
        upcomingClasses,
        stats: {
          totalClasses: enrolledClasses.length,
          assignmentsDue,
          submittedCount,
          overdueCount
        }
      });
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>Loading dashboard...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 4px" }}>
          Good morning, {userData?.fullName?.split(" ")[0] || "Student"} 👋
        </h1>
        <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {' · '}{dashboardData.stats.totalClasses} classes enrolled
        </p>
      </div>

      {/* Stats row - NOW WITH REAL DATA */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={{
          background: COLORS.white, borderRadius: 14, border: `1px solid ${COLORS.border}`,
          padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)"
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#2563EB" }}>{dashboardData.stats.totalClasses}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Classes Enrolled</div>
        </div>
        <div style={{
          background: COLORS.white, borderRadius: 14, border: `1px solid ${COLORS.border}`,
          padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)"
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#D97706" }}>{dashboardData.stats.assignmentsDue}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Assignments Due</div>
        </div>
        <div style={{
          background: COLORS.white, borderRadius: 14, border: `1px solid ${COLORS.border}`,
          padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)"
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#16A34A" }}>{dashboardData.stats.submittedCount}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Submitted</div>
        </div>
        <div style={{
          background: COLORS.white, borderRadius: 14, border: `1px solid ${COLORS.border}`,
          padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)"
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#DC2626" }}>{dashboardData.stats.overdueCount}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Overdue</div>
        </div>
      </div>

      {/* Upcoming Classes - NOW WITH REAL DATA */}
      <SectionTitle>Your Classes</SectionTitle>
      {dashboardData.enrolledClasses.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <p style={{ color: COLORS.textMuted, margin: 0 }}>You're not enrolled in any classes yet. Go to "My Classes" to enroll!</p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 28 }}>
          {dashboardData.enrolledClasses.slice(0, 4).map(cls => (
            <Card key={cls.id} style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ height: 4, background: cls.color || "#2563EB" }} />
              <div style={{ padding: "16px 18px" }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, marginBottom: 4 }}>{cls.name}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>{cls.grade} · {cls.teacherName}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={COLORS.textMuted} strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  <span style={{ fontSize: 13, color: COLORS.textMuted }}>{cls.schedule}</span>
                </div>
                <button style={{
                  width: "100%", padding: "9px", borderRadius: 9,
                  background: cls.color || "#2563EB",
                  border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer"
                }}>
                  View Class
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Assignments */}
      <SectionTitle>Recent Assignments</SectionTitle>
      {dashboardData.assignments.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
          <p style={{ color: COLORS.textMuted, margin: 0 }}>No assignments yet. Check back later!</p>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {dashboardData.assignments.slice(0, 5).map((a, i) => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "15px 20px",
              borderBottom: i < Math.min(dashboardData.assignments.length, 5) - 1 ? `1px solid ${COLORS.border}` : "none"
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: new Date(a.dueDate) < new Date() ? COLORS.dangerLight : COLORS.warningLight,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18
              }}>
                {new Date(a.dueDate) < new Date() ? "!" : "✏"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, marginBottom: 2 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>{a.className} · Due {new Date(a.dueDate).toLocaleDateString()}</div>
              </div>
              <StatusBadge status={new Date(a.dueDate) < new Date() ? "overdue" : "pending"} />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── TEACHER DASHBOARD ────────────────────────────────────────────────────────
// ─── TEACHER DASHBOARD WITH REAL DATA ────────────────────────────────────────
function TeacherDashboard({ userData }) {
  const [dashboardData, setDashboardData] = useState({
    myClasses: [],
    assignments: [],
    recentSubmissions: [],
    stats: {
      totalClasses: 0,
      totalStudents: 0,
      submissionsToday: 0,
      pendingReviews: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherDashboard();
  }, []);

  const fetchTeacherDashboard = async () => {
    try {
      setLoading(true);
      
      // Get teacher's classes
      const classesQuery = query(collection(db, "classes"), where("teacherId", "==", auth.currentUser?.uid));
      const classesSnapshot = await getDocs(classesQuery);
      const myClasses = classesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calculate total students
      let totalStudents = 0;
      for (const cls of myClasses) {
        totalStudents += cls.enrolledStudents?.length || 0;
      }
      
      // Get teacher's assignments
      const assignmentsQuery = query(collection(db, "assignments"), where("teacherId", "==", auth.currentUser?.uid), orderBy("createdAt", "desc"));
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Get recent submissions (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const submissionsQuery = query(
        collection(db, "submissions"),
        where("submittedAt", ">=", sevenDaysAgo.toISOString()),
        orderBy("submittedAt", "desc")
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const allSubmissions = submissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter submissions for teacher's classes
      const classIds = myClasses.map(c => c.id);
      const recentSubmissions = allSubmissions.filter(s => classIds.includes(s.classId));
      
      // Calculate stats
      const today = new Date().toDateString();
      const submissionsToday = recentSubmissions.filter(s => new Date(s.submittedAt).toDateString() === today).length;
      const pendingReviews = recentSubmissions.filter(s => s.status === "submitted" && !s.grade).length;
      
      setDashboardData({
        myClasses,
        assignments,
        recentSubmissions: recentSubmissions.slice(0, 5),
        stats: {
          totalClasses: myClasses.length,
          totalStudents,
          submissionsToday,
          pendingReviews
        }
      });
      
    } catch (error) {
      console.error("Error fetching teacher dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "40px" }}>Loading dashboard...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 4px" }}>
          Welcome back, {userData?.fullName?.split(" ")[0] || "Teacher"} 👨‍🏫
        </h1>
        <p style={{ color: COLORS.textMuted, fontSize: 14, margin: 0 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {' · '}{dashboardData.stats.totalClasses} active classes
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
        <div style={{
          background: COLORS.white, borderRadius: 14, border: `1px solid ${COLORS.border}`,
          padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)"
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#2563EB" }}>{dashboardData.stats.totalClasses}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Active Classes</div>
        </div>
        <div style={{
          background: COLORS.white, borderRadius: 14, border: `1px solid ${COLORS.border}`,
          padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)"
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#7C3AED" }}>{dashboardData.stats.totalStudents}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Total Students</div>
        </div>
        <div style={{
          background: COLORS.white, borderRadius: 14, border: `1px solid ${COLORS.border}`,
          padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)"
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#16A34A" }}>{dashboardData.stats.submissionsToday}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Submissions Today</div>
        </div>
        <div style={{
          background: COLORS.white, borderRadius: 14, border: `1px solid ${COLORS.border}`,
          padding: "16px 18px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)"
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#D97706" }}>{dashboardData.stats.pendingReviews}</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Pending Review</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        {/* My Classes */}
        <div>
          <SectionTitle>My Classes</SectionTitle>
          {dashboardData.myClasses.length === 0 ? (
            <Card style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
              <p style={{ color: COLORS.textMuted, margin: 0 }}>You haven't created any classes yet. Go to "My Classes" to create one!</p>
            </Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dashboardData.myClasses.slice(0, 3).map(cls => (
                <Card key={cls.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>{cls.name}</div>
                    <StatusBadge status={cls.status || "active"} />
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>
                    {cls.enrolledStudents?.length || 0} students · {cls.schedule}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{
                      flex: 1, padding: "8px", borderRadius: 8,
                      background: COLORS.primaryLight, border: "none",
                      color: COLORS.primaryDark, fontSize: 12, fontWeight: 600, cursor: "pointer"
                    }}>View Class</button>
                    <button style={{
                      padding: "8px 12px", borderRadius: 8,
                      background: COLORS.grayLight, border: `1px solid ${COLORS.border}`,
                      color: COLORS.gray, fontSize: 12, cursor: "pointer"
                    }}>Schedule</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Submissions */}
        <div>
          <SectionTitle>Recent Submissions</SectionTitle>
          <Card style={{ padding: 0 }}>
            {dashboardData.recentSubmissions.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
                <p style={{ color: COLORS.textMuted, margin: 0 }}>No submissions yet</p>
              </div>
            ) : (
              dashboardData.recentSubmissions.map((sub, i) => (
                <div key={sub.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
                  borderBottom: i < dashboardData.recentSubmissions.length - 1 ? `1px solid ${COLORS.border}` : "none"
                }}>
                  <Avatar name={sub.studentName} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.text, marginBottom: 1 }}>{sub.studentName}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>{sub.assignmentId}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted }}>{new Date(sub.submittedAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {sub.grade ? (
                      <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.success }}>{sub.grade}</div>
                    ) : (
                      <StatusBadge status="pending" />
                    )}
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}


// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({ role, userData }) {
  const name = userData?.fullName || (role === "teacher" ? "John Omondi" : "Amara Osei");
  const email = userData?.email || (role === "teacher" ? "j.omondi@school.ac.ke" : "a.osei@school.ac.ke");
  const department = userData?.department || "Not specified";
  
  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: "0 0 20px" }}>Profile</h1>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
          <Avatar name={name} size={60} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.text }}>{name}</div>
            <div style={{ color: COLORS.textMuted, fontSize: 14 }}>
              {role === "teacher" ? `${department} Teacher` : "Student"}
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: 13 }}>{email}</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
          {[
            { label: "School", value: userData?.school || "Nairobi Academy" },
            ...(role === "teacher" ? [{ label: "Department", value: department }] : []),
            { label: role === "teacher" ? "Teacher ID" : "Student ID", value: auth.currentUser?.uid.slice(0, 8) + "..." },
            { label: "Joined", value: userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "January 2024" },
          ].map(f => (
            <div key={f.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ color: COLORS.textMuted, fontSize: 14 }}>{f.label}</span>
              <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 500 }}>{f.value}</span>
            </div>
          ))}
        </div>
        <button style={{
          marginTop: 16, padding: "10px 20px", borderRadius: 10,
          background: COLORS.primary, border: "none", color: "#fff",
          fontSize: 14, fontWeight: 600, cursor: "pointer"
        }}>Edit Profile</button>
      </Card>
    </div>
  );
}

// ─── CLASSES PAGE ────────────────────────────────────────────────────────────────
function ClassesPage({ userData, role }) {
  return <ClassManager userData={userData} role={role} />;
}

// ─── PLACEHOLDER PAGES ────────────────────────────────────────────────────────

// AssignmentsPage function
function AssignmentsPage({ userData, role }) {
  return <AssignmentsManager userData={userData} role={role} />;
}

// ─── MAIN LAYOUT ──────────────────────────────────────────────────────────────
function AppLayout({ role, onLogout, userData }) {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  // what to be displayed on the screen depending on the menu item clicked
  const renderContent = () => {
    if (activeNav === "dashboard") return role === "teacher" ? <TeacherDashboard userData={userData} /> : <StudentDashboard userData={userData} />;
    // CHANGE THIS LINE - add userData and role props to ClassesPage
    if (activeNav === "classes" || ["grade7-9","grade10-12","form3","form4"].includes(activeNav)) return <ClassesPage userData={userData} role={role} />;
    if (activeNav === "assignments") return <AssignmentsPage userData={userData} role={role} />;
    if (activeNav === "profile") return <ProfilePage role={role} userData={userData} />;
    return <StudentDashboard userData={userData} />;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar
        activeNav={activeNav} 
        setActiveNav={setActiveNav}
        role={role} 
        onLogout={onLogout}
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen}
        userData={userData}
      />

      <div style={{ flex: 1, marginLeft: 240, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{
          height: 60, background: COLORS.white, borderBottom: `1px solid ${COLORS.border}`,
          display: "flex", alignItems: "center", padding: "0 24px", gap: 14,
          position: "sticky", top: 0, zIndex: 10
        }}>
          <button onClick={() => setMobileOpen(true)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 18, color: COLORS.gray, display: "none"
          }}>☰</button>
          <div style={{ flex: 1 }}>
            <input placeholder="Search classes, assignments..." style={{
              padding: "8px 14px", borderRadius: 10, border: `1px solid ${COLORS.border}`,
              fontSize: 13, color: COLORS.text, outline: "none", width: 240,
              background: COLORS.grayLight
            }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{
              position: "relative", background: COLORS.grayLight, border: `1px solid ${COLORS.border}`,
              borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 16
            }}>🔔</button>
            <Avatar name={userData?.fullName || (role === "teacher" ? "John Omondi" : "Amara Osei")} size={34} />
          </div>
        </div>

        <main style={{ flex: 1, padding: "28px 28px 40px" }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// ─── ROOT APP WITH FIREBASE AUTH STATE ────────────────────────────────────────
function App() {
  const [page, setPage] = useState("login");
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setRole(data.role);
            setUserId(user.uid);
            setUserData(data);
            setPage("app");
          } else {
            console.error("No user document found");
            await signOut(auth);
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (userRole, uid, data) => {
    setRole(userRole);
    setUserId(uid);
    setUserData(data);
    setPage("app");
  };

  const handleSignup = async (userRole, uid, data) => {
    setRole(userRole);
    setUserId(uid);
    setUserData(data);
    setPage("app");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRole(null);
      setUserId(null);
      setUserData(null);
      setPage("login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (initializing) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0F172A",
        color: "#fff"
      }}>
        Loading...
      </div>
    );
  }

  if (page === "login") return <LoginPage onLogin={handleLogin} onGoSignup={() => setPage("signup")} />;
  if (page === "signup") return <SignupPage onGoLogin={() => setPage("login")} onSignupSuccess={handleSignup} />;
  return <AppLayout role={role} onLogout={handleLogout} userData={userData} />;
}

export default App;