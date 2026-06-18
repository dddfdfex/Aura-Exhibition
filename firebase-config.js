/* =======================================================
   AURA STUDIO — FIREBASE CONFIGURATION
   هذا الملف مشترك بين الواجهتين (index.html + admin.html)
   ======================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBOZdMU3bSNadZG2zvXqMqE1anm9FidySc",
  authDomain: "elrazi12.firebaseapp.com",
  projectId: "elrazi12",
  storageBucket: "elrazi12.firebasestorage.app",
  messagingSenderId: "716864543534",
  appId: "1:716864543534:web:743ba271763054097978bf",
  measurementId: "G-NFHWD3EJ5B"
};

// تهيئة Firebase (compat SDK)
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();
let analytics = null;
try {
  analytics = firebase.analytics();
} catch (e) {
  console.warn("Firebase Analytics غير متاح في هذه البيئة:", e.message);
}

/* =======================================================
   أسماء المجموعات (Collections) في Firestore
   ======================================================= */
const COLLECTIONS = {
  CAMPAIGNS: "campaigns",
  REACTIONS: "reactions",
  EDIT_REQUESTS: "editRequests",
  ANALYTICS_VIEWS: "analyticsViews",
  ACTIVITY_LOGS: "activityLogs",
  SCREENSHOT_ATTEMPTS: "screenshotAttempts",
  SESSIONS: "sessions",
  SETTINGS: "settings"
};

/* =======================================================
   أداة مساعدة: توليد معرف جلسة فريد للزائر (يخزَّن محلياً)
   ======================================================= */
function getOrCreateVisitorId() {
  let vid = localStorage.getItem("aura_visitor_id");
  if (!vid) {
    vid = "visitor_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem("aura_visitor_id", vid);
  }
  return vid;
}

function getOrCreateSessionId() {
  let sid = sessionStorage.getItem("aura_session_id");
  if (!sid) {
    sid = "session_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    sessionStorage.setItem("aura_session_id", sid);
  }
  return sid;
}

/* =======================================================
   تسجيل حدث في سجل النشاط (Activity Logs)
   ======================================================= */
async function logActivity(type, details = {}) {
  try {
    await db.collection(COLLECTIONS.ACTIVITY_LOGS).add({
      type: type,
      details: details,
      visitorId: getOrCreateVisitorId(),
      sessionId: getOrCreateSessionId(),
      userAgent: navigator.userAgent,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      url: window.location.href
    });
  } catch (e) {
    console.warn("logActivity error:", e.message);
  }
}