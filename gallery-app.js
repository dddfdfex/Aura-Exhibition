/* =======================================================
   AURA STUDIO — GALLERY APP LOGIC
   ======================================================= */

let currentCampaigns = [];
let activeCampaignId = null;
let viewStartTime = Date.now();

/* =======================================================
   1. PRELOADER
   ======================================================= */
window.addEventListener("load", function () {
  setTimeout(function () {
    document.getElementById("preloader").classList.add("hide");
    runHeroIntroAnimation();
  }, 600);
});

/* =======================================================
   2. HERO INTRO ANIMATION (vanilla, no external animation lib)
   ======================================================= */
function runHeroIntroAnimation() {
  const elements = [
    { sel: ".hero-logo, .hero-logo-fallback", delay: 0 },
    { sel: ".hero-eyebrow", delay: 150 },
    { sel: ".hero h1 .line span", delay: 300, stagger: true },
    { sel: ".hero-sub", delay: 650 },
    { sel: ".hero-cta", delay: 800 },
    { sel: ".scroll-indicator", delay: 1000 }
  ];

  elements.forEach(function (group) {
    const nodes = document.querySelectorAll(group.sel);
    nodes.forEach(function (node, i) {
      const d = group.delay + (group.stagger ? i * 120 : 0);
      setTimeout(function () {
        node.style.transition = "opacity 1s cubic-bezier(.16,1,.3,1), transform 1s cubic-bezier(.16,1,.3,1)";
        node.style.opacity = "1";
        node.style.transform = "translateY(0) scale(1)";
      }, d);
    });
  });
}

/* =======================================================
   3. FLOATING PARTICLES
   ======================================================= */
function createParticles() {
  const container = document.getElementById("particlesContainer");
  if (!container) return;
  const count = window.innerWidth < 768 ? 18 : 36;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 3 + 1;
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.left = Math.random() * 100 + "%";
    p.style.top = Math.random() * 100 + "%";
    container.appendChild(p);
    animateParticle(p);
  }
}
function animateParticle(p) {
  const duration = Math.random() * 8000 + 6000;
  const targetOpacity = Math.random() * 0.5 + 0.15;
  const moveX = (Math.random() - 0.5) * 120;
  const moveY = (Math.random() - 0.5) * 160;

  p.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration / 2}ms ease-in-out`;
  requestAnimationFrame(function () {
    p.style.opacity = targetOpacity;
    p.style.transform = `translate(${moveX}px, ${moveY}px)`;
  });
  setTimeout(function () {
    p.style.opacity = 0;
    setTimeout(function () {
      p.style.left = Math.random() * 100 + "%";
      p.style.top = Math.random() * 100 + "%";
      p.style.transform = "translate(0,0)";
      animateParticle(p);
    }, duration / 2);
  }, duration);
}
createParticles();

/* =======================================================
   4. SCROLL HEADER STATE + REVEAL ON SCROLL
   ======================================================= */
window.addEventListener("scroll", function () {
  const header = document.getElementById("siteHeader");
  if (window.scrollY > 40) header.classList.add("scrolled");
  else header.classList.remove("scrolled");
});

const revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add("in");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal").forEach(function (el) {
  revealObserver.observe(el);
});

/* =======================================================
   5. LOAD CAMPAIGNS FROM FIRESTORE
   ======================================================= */
async function loadCampaigns() {
  const grid = document.getElementById("galleryGrid");
  const emptyState = document.getElementById("galleryEmpty");

  try {
    const snapshot = await db.collection(COLLECTIONS.CAMPAIGNS)
      .where("hidden", "==", false)
      .orderBy("createdAt", "desc")
      .get();

    currentCampaigns = [];
    snapshot.forEach(function (doc) {
      currentCampaigns.push({ id: doc.id, ...doc.data() });
    });

    if (currentCampaigns.length === 0) {
      grid.innerHTML = "";
      emptyState.style.display = "flex";
    } else {
      emptyState.style.display = "none";
      renderGallery(currentCampaigns);
    }

    updateStatNumber("statCampaigns", currentCampaigns.length);

  } catch (e) {
    console.warn("تعذر تحميل الحملات (تحقق من قواعد Firestore):", e.message);
    emptyState.style.display = "flex";
  }
}

function renderGallery(campaigns) {
  const grid = document.getElementById("galleryGrid");
  grid.innerHTML = "";

  campaigns.forEach(function (campaign, index) {
    const item = document.createElement("div");
    item.className = "gallery-item reveal" + (index % 5 === 2 ? " tall" : "");
    item.dataset.id = campaign.id;

    item.innerHTML = `
      <img src="${campaign.imageUrl}" alt="${escapeHtml(campaign.title || '')}" loading="lazy" draggable="false">
      <div class="gallery-watermark">${buildWatermarkHtml()}</div>
      <div class="item-overlay">
        <h3>${escapeHtml(campaign.title || 'حملة بدون عنوان')}</h3>
        <p>${escapeHtml(campaign.description || '')}</p>
      </div>
    `;

    item.addEventListener("click", function () {
      openLightbox(campaign);
    });

    grid.appendChild(item);
    revealObserver.observe(item);
  });

  lucide.createIcons();
}

function buildWatermarkHtml() {
  const visitorId = getOrCreateVisitorId();
  const shortId = visitorId.slice(-6);
  let spans = "";
  for (let i = 0; i < 8; i++) {
    spans += `<span>Aura Studio | سري للغاية · ${shortId}</span>`;
  }
  return spans;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* =======================================================
   6. LIGHTBOX + REACTIONS
   ======================================================= */
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxWatermark = document.getElementById("lightboxWatermark");

function openLightbox(campaign) {
  activeCampaignId = campaign.id;
  lightboxImg.src = campaign.imageUrl;
  lightboxTitle.textContent = campaign.title || "حملة بدون عنوان";
  lightboxWatermark.innerHTML = buildWatermarkHtml();
  lightbox.classList.add("show");
  document.getElementById("likeCount").textContent = campaign.likes || 0;
  document.getElementById("approveCount").textContent = campaign.approvals || 0;

  trackCampaignView(campaign.id);
  logActivity("campaign_view", { campaignId: campaign.id, title: campaign.title });
}

document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
lightbox.addEventListener("click", function (e) {
  if (e.target === lightbox) closeLightbox();
});
function closeLightbox() {
  lightbox.classList.remove("show");
  activeCampaignId = null;
}

async function trackCampaignView(campaignId) {
  try {
    await db.collection(COLLECTIONS.CAMPAIGNS).doc(campaignId).update({
      views: firebase.firestore.FieldValue.increment(1)
    });
    await db.collection(COLLECTIONS.ANALYTICS_VIEWS).add({
      campaignId: campaignId,
      visitorId: getOrCreateVisitorId(),
      sessionId: getOrCreateSessionId(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (analytics) analytics.logEvent("campaign_view", { campaign_id: campaignId });
  } catch (e) {
    console.warn("trackCampaignView error:", e.message);
  }
}

document.getElementById("btnLike").addEventListener("click", function () {
  reactToCampaign("likes", "btnLike", "likeCount", "تم تسجيل إعجابك");
});
document.getElementById("btnApprove").addEventListener("click", function () {
  reactToCampaign("approvals", "btnApprove", "approveCount", "تم تسجيل موافقتك");
});

async function reactToCampaign(field, btnId, countId, message) {
  if (!activeCampaignId) return;
  const btn = document.getElementById(btnId);
  const countEl = document.getElementById(countId);

  try {
    await db.collection(COLLECTIONS.CAMPAIGNS).doc(activeCampaignId).update({
      [field]: firebase.firestore.FieldValue.increment(1)
    });
    await db.collection(COLLECTIONS.REACTIONS).add({
      campaignId: activeCampaignId,
      type: field,
      visitorId: getOrCreateVisitorId(),
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
    btn.classList.add("active");
    showToast(message, "success");
    logActivity("reaction", { type: field, campaignId: activeCampaignId });
  } catch (e) {
    showToast("حدث خطأ، حاول مرة أخرى", "warn");
    console.warn(e.message);
  }
}

/* ---------- Edit Request Modal ---------- */
const editModal = document.getElementById("editModal");
document.getElementById("btnEdit").addEventListener("click", function () {
  if (!activeCampaignId) return;
  editModal.classList.add("show");
});
document.getElementById("editCancel").addEventListener("click", function () {
  editModal.classList.remove("show");
  document.getElementById("editNote").value = "";
});
document.getElementById("editSend").addEventListener("click", async function () {
  const note = document.getElementById("editNote").value.trim();
  if (!note) {
    showToast("الرجاء كتابة ملاحظة أولاً", "warn");
    return;
  }
  try {
    await db.collection(COLLECTIONS.EDIT_REQUESTS).add({
      campaignId: activeCampaignId,
      note: note,
      visitorId: getOrCreateVisitorId(),
      status: "pending",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection(COLLECTIONS.CAMPAIGNS).doc(activeCampaignId).update({
      editRequests: firebase.firestore.FieldValue.increment(1)
    });
    logActivity("edit_request", { campaignId: activeCampaignId });
    showToast("تم إرسال طلب التعديل بنجاح", "success");
    editModal.classList.remove("show");
    document.getElementById("editNote").value = "";
  } catch (e) {
    showToast("تعذر إرسال الطلب، حاول مرة أخرى", "warn");
    console.warn(e.message);
  }
});

/* =======================================================
   7. STATS COUNTER ANIMATION
   ======================================================= */
function updateStatNumber(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  animateCount(el, parseInt(el.textContent) || 0, value);
}
function animateCount(el, from, to) {
  const duration = 1200;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = to;
  }
  requestAnimationFrame(step);
}

async function loadGlobalStats() {
  try {
    const snapshot = await db.collection(COLLECTIONS.CAMPAIGNS).get();
    let totalViews = 0, totalLikes = 0, totalApprovals = 0;
    snapshot.forEach(function (doc) {
      const d = doc.data();
      totalViews += d.views || 0;
      totalLikes += d.likes || 0;
      totalApprovals += d.approvals || 0;
    });
    updateStatNumber("statViews", totalViews);
    updateStatNumber("statLikes", totalLikes);
    updateStatNumber("statApprovals", totalApprovals);
  } catch (e) {
    console.warn("loadGlobalStats error:", e.message);
  }
}

const statsObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      loadGlobalStats();
      statsObserver.disconnect();
    }
  });
}, { threshold: 0.3 });
statsObserver.observe(document.getElementById("stats"));

/* =======================================================
   8. SESSION / VISITOR TRACKING
   ======================================================= */
async function trackVisitorSession() {
  const visitorId = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const isNewVisitor = !sessionStorage.getItem("aura_session_logged");

  try {
    await db.collection(COLLECTIONS.SESSIONS).doc(sessionId).set({
      visitorId: visitorId,
      sessionId: sessionId,
      startTime: firebase.firestore.FieldValue.serverTimestamp(),
      userAgent: navigator.userAgent,
      isNewVisitor: isNewVisitor,
      referrer: document.referrer || "direct"
    }, { merge: true });

    if (isNewVisitor) {
      sessionStorage.setItem("aura_session_logged", "true");
    }
    if (analytics) analytics.logEvent("page_view");
  } catch (e) {
    console.warn("trackVisitorSession error:", e.message);
  }
}
trackVisitorSession();

// تسجيل مدة الجلسة عند مغادرة الصفحة
window.addEventListener("beforeunload", function () {
  const duration = Math.round((Date.now() - viewStartTime) / 1000);
  const sessionId = getOrCreateSessionId();
  try {
    navigator.sendBeacon && db.collection(COLLECTIONS.SESSIONS).doc(sessionId).update({
      durationSeconds: duration
    });
  } catch (e) { /* silent */ }
});

/* =======================================================
   9. INIT
   ======================================================= */
loadCampaigns();