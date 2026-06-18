/* =======================================================
   AURA STUDIO — SECURITY / PROTECTION LAYER
   ----------------------------------------------------------
   ملاحظة هامة وصادقة:
   لا توجد طريقة في متصفحات الويب تمنع لقطة الشاشة بشكل مطلق
   (Print Screen / أدوات تسجيل الشاشة الخارجية / لقطة شاشة الموبايل).
   هذا الملف يطبّق أقصى تثبيط ممكن تقنياً + يسجّل كل محاولة
   مرصودة في Firebase مع بيانات الجلسة، بحيث يصعب الاستخدام
   العادي ويُترك أثر تتبّع عند أي محاولة تسريب.
   ======================================================= */

(function () {
  "use strict";

  /* ---------- 1. تعطيل كليك يمين ---------- */
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    showToast("النقر بزر الماوس الأيمن معطّل في هذا المعرض", "warn");
    logActivity("right_click_attempt");
  });

  /* ---------- 2. تعطيل تحديد النص (عبر CSS بالفعل + احتياط JS) ---------- */
  document.addEventListener("selectstart", function (e) {
    const tag = e.target.tagName;
    if (tag !== "TEXTAREA" && tag !== "INPUT") {
      e.preventDefault();
    }
  });

  /* ---------- 3. تعطيل السحب والإفلات للصور ---------- */
  document.addEventListener("dragstart", function (e) {
    if (e.target.tagName === "IMG") {
      e.preventDefault();
    }
  });

  /* ---------- 4. تعطيل اختصارات لوحة المفاتيح الحساسة ---------- */
  document.addEventListener("keydown", function (e) {
    const key = e.key ? e.key.toLowerCase() : "";

    // Ctrl+S (حفظ) / Ctrl+P (طباعة) / Ctrl+U (عرض المصدر) / Ctrl+Shift+S
    if (e.ctrlKey && (key === "s" || key === "p" || key === "u")) {
      e.preventDefault();
      showToast("هذا الإجراء غير مسموح به", "warn");
      logActivity("blocked_shortcut", { combo: "Ctrl+" + key.toUpperCase() });
      return;
    }

    // F12 - Developer Tools
    if (key === "f12") {
      e.preventDefault();
      showToast("أدوات المطورين معطّلة", "warn");
      logActivity("devtools_shortcut_attempt", { combo: "F12" });
      return;
    }

    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools shortcuts)
    if (e.ctrlKey && e.shiftKey && (key === "i" || key === "j" || key === "c")) {
      e.preventDefault();
      showToast("أدوات المطورين معطّلة", "warn");
      logActivity("devtools_shortcut_attempt", { combo: "Ctrl+Shift+" + key.toUpperCase() });
      return;
    }

    // Cmd (Mac) equivalents
    if (e.metaKey && (key === "s" || key === "p")) {
      e.preventDefault();
      logActivity("blocked_shortcut", { combo: "Cmd+" + key.toUpperCase() });
      return;
    }

    // PrintScreen key detection (Windows فقط - الكشف ممكن جزئياً عبر keyup)
    if (key === "printscreen") {
      handleScreenshotDetected("printscreen_key");
    }
  });

  // بعض المتصفحات/الأنظمة لا تطلق keydown لـ PrintScreen، فقط keyup
  document.addEventListener("keyup", function (e) {
    if (e.key && e.key.toLowerCase() === "printscreen") {
      handleScreenshotDetected("printscreen_key");
    }
  });

  /* ---------- 5. تمويه المحتوى عند فقدان التركيز (Tab/Window blur) ---------- */
  // هذا يفيد فعلياً عند فتح أدوات خارجية أو التبديل لتطبيق تسجيل شاشة
  let blurTimer = null;
  window.addEventListener("blur", function () {
    document.body.classList.add("blurred-protect");
    blurTimer = setTimeout(function () {
      logActivity("window_blur_extended");
    }, 1500);
  });
  window.addEventListener("focus", function () {
    document.body.classList.remove("blurred-protect");
    if (blurTimer) clearTimeout(blurTimer);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      document.body.classList.add("blurred-protect");
    } else {
      document.body.classList.remove("blurred-protect");
    }
  });

  /* ---------- 6. اكتشاف فتح أدوات المطورين (تقريبي - عبر فروق الأبعاد) ---------- */
  let devtoolsOpen = false;
  const threshold = 160;
  function checkDevTools() {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > threshold || heightDiff > threshold) {
      if (!devtoolsOpen) {
        devtoolsOpen = true;
        logActivity("devtools_opened_detected");
      }
    } else {
      devtoolsOpen = false;
    }
  }
  setInterval(checkDevTools, 1200);

  /* ---------- 7. نافذة تحذير عند اكتشاف PrintScreen ---------- */
  function handleScreenshotDetected(method) {
    const warningEl = document.getElementById("screenshotWarning");
    if (warningEl) {
      warningEl.classList.add("show");
    }
    logActivity("screenshot_attempt", { method: method, timestamp: Date.now() });
    try {
      db.collection(COLLECTIONS.SCREENSHOT_ATTEMPTS).add({
        method: method,
        visitorId: getOrCreateVisitorId(),
        sessionId: getOrCreateSessionId(),
        userAgent: navigator.userAgent,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        page: window.location.pathname
      });
    } catch (e) { /* silent */ }
  }
  window.closeScreenshotWarning = function () {
    const warningEl = document.getElementById("screenshotWarning");
    if (warningEl) warningEl.classList.remove("show");
  };

  /* ---------- 8. Toast Helper ---------- */
  window.showToast = function (msg, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = "toast show " + type;
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2800);
  };

  /* ---------- 9. تعطيل سحب الصور عبر CSS (احتياطي JS) ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("img").forEach(function (img) {
      img.setAttribute("draggable", "false");
      img.style.webkitUserDrag = "none";
    });
  });

  /* ---------- 10. تسجيل بداية الجلسة ---------- */
  logActivity("session_start");

})();