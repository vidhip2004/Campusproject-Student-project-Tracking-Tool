/**
 * Robust Student Session & Auto-Recovery Utility
 * Ensures student data is resilient against browser history/cache clearing (e.g. Ctrl + Shift + Delete)
 * and normalizes flat/nested profile structures.
 */

const API_BASE_URL = "http://localhost:8081";

// Helper to normalize student fields from backend / DTOs
export const normalizeStudent = (data) => {
  if (!data) return null;
  const profile = data.studentProfile || {};

  const address = data.address || profile.address || "";
  const dateOfBirth = data.dateOfBirth || profile.dateOfBirth || "";
  const skills = data.skills || profile.skills || "";
  const linkedInUrl = data.linkedInUrl || profile.linkedInUrl || "";
  const id = data.id || data.Id || data.studentId || data.userId || (profile && (profile.id || profile.studentId));

  return {
    id: id ? Number(id) : undefined,
    fullName: data.fullName || data.name || "",
    email: data.email || "",
    mobileNo: data.mobileNo || data.phoneNumber || "",
    enrollmentNo: data.enrollmentNo || data.enrollment || "",
    department: data.department || "",
    sem: data.sem || data.semester || "",
    academicYear: data.academicYear || "",
    address: address,
    dateOfBirth: dateOfBirth,
    skills: skills,
    linkedInUrl: linkedInUrl,
    studentProfile: {
      address: address,
      dateOfBirth: dateOfBirth,
      skills: skills,
      linkedInUrl: linkedInUrl,
    },
  };
};

// Set durable cookie
const setCookie = (name, value, days = 365) => {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {
    console.warn("Cookie write failed:", e);
  }
};

// Get cookie
const getCookie = (name) => {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
  } catch (e) {
    console.warn("Cookie read failed:", e);
  }
  return null;
};

// Save student into multiple storage tiers
export const saveStudentSession = (student) => {
  if (!student) return;
  const normalized = normalizeStudent(student);
  const jsonStr = JSON.stringify(normalized);

  try {
    localStorage.setItem("student", jsonStr);
    localStorage.setItem("student_viva_backup", jsonStr);
    if (normalized.id) localStorage.setItem("studentId", String(normalized.id));
  } catch (e) {}

  try {
    sessionStorage.setItem("student", jsonStr);
    sessionStorage.setItem("student_viva_backup", jsonStr);
    if (normalized.id) sessionStorage.setItem("studentId", String(normalized.id));
  } catch (e) {}

  if (normalized.id) {
    setCookie("student_id", String(normalized.id));
    setCookie("student_backup", jsonStr);
  }
};

// Clear session
export const clearStudentSession = () => {
  try {
    localStorage.removeItem("student");
    localStorage.removeItem("student_viva_backup");
    localStorage.removeItem("studentId");
  } catch (e) {}
  try {
    sessionStorage.removeItem("student");
    sessionStorage.removeItem("student_viva_backup");
    sessionStorage.removeItem("studentId");
  } catch (e) {}
  setCookie("student_id", "", -1);
  setCookie("student_backup", "", -1);
};

// Retrieve student from any active storage tier
export const getStoredStudent = () => {
  // Tier 1: localStorage
  let raw = null;
  try {
    raw = localStorage.getItem("student") || localStorage.getItem("student_viva_backup") || localStorage.getItem("user");
  } catch (e) {}

  // Tier 2: sessionStorage
  if (!raw) {
    try {
      raw = sessionStorage.getItem("student") || sessionStorage.getItem("student_viva_backup") || sessionStorage.getItem("user");
    } catch (e) {}
  }

  // Tier 3: Cookies
  if (!raw) {
    raw = getCookie("student_backup");
  }

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed) return normalizeStudent(parsed);
    } catch (e) {}
  }

  const standaloneId = localStorage.getItem("studentId") || sessionStorage.getItem("studentId") || getCookie("student_id");
  if (standaloneId) {
    return { id: Number(standaloneId) };
  }

  return null;
};

// Fetch fresh student from backend by ID
export const fetchStudentById = async (studentId) => {
  if (!studentId) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/student/${studentId}`);
    if (response.ok) {
      const data = await response.json();
      const normalized = normalizeStudent(data);
      saveStudentSession(normalized);
      return normalized;
    }
  } catch (e) {
    console.warn("fetchStudentById error:", e);
  }
  return null;
};

// Auto-recover or fetch latest student (Viva Safeguard)
export const getOrRecoverStudent = async () => {
  // 1. Try stored session
  const stored = getStoredStudent();
  const storedId = stored?.id || getCookie("student_id");

  if (storedId) {
    const fresh = await fetchStudentById(storedId);
    if (fresh) return fresh;
    if (stored) return stored;
  }

  // 2. If storage was wiped (Ctrl + Shift + Delete), fetch latest active student from backend database!
  try {
    const response = await fetch(`${API_BASE_URL}/student/latest`);
    if (response.ok) {
      const latestData = await response.json();
      if (latestData && (latestData.id || latestData.fullName)) {
        const normalized = normalizeStudent(latestData);
        saveStudentSession(normalized);
        console.log("Restored student session from database:", normalized.fullName);
        return normalized;
      }
    }
  } catch (e) {
    console.warn("Auto-recovery error:", e);
  }

  return null;
};
