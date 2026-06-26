// ══════════════════════════════════════
//  DATA HELPERS
// ══════════════════════════════════════
const SERVICES = [
  {id:'plumbing',   icon:'🔧', label:'سباكة'},
  {id:'electrical', icon:'⚡', label:'كهرباء'},
  {id:'ac',         icon:'❄️', label:'تكييف'},
  {id:'carpentry',  icon:'🪵', label:'نجارة'},
  {id:'painting',   icon:'🎨', label:'دهان'},
  {id:'cleaning',   icon:'🧹', label:'تنظيف'},
  {id:'gas',        icon:'🔥', label:'غاز'},
  {id:'security',   icon:'🔒', label:'أمن'},
];
const DEFAULT_LOCS = [
  {id:'home', icon:'🏠', name:'المنزل', addr:'شارع النيل، القاهرة'},
  {id:'work', icon:'🏢', name:'العمل',  addr:'المدينة الإدارية'},
  {id:'villa',icon:'🏡', name:'الفيلا', addr:'6 أكتوبر'},
];

function getDB()    { return JSON.parse(localStorage.getItem('sh_db') || '{}'); }
function saveDB(db) { localStorage.setItem('sh_db', JSON.stringify(db)); }
function svcLabel(id){ return (SERVICES.find(s=>s.id===id)||{label:id}).label; }
function svcIcon(id) { return (SERVICES.find(s=>s.id===id)||{icon:'🔧'}).icon; }
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}
function userInitials(name) {
  return String(name || '').trim().split(/\s+/).filter(Boolean).map(n=>n[0]).join('').substring(0,2) || '؟';
}
const BADGE_MAP  = {pending:'pending',  accepted:'accepted',  rejected:'rejected'};
const LABEL_MAP  = {pending:'معلق ⏳',  accepted:'مقبول ✅',  rejected:'مرفوض ❌'};
const BLABEL_MAP = {pending:'معلق',     accepted:'مقبول',     rejected:'مرفوض'};

// ══════════════════════════════════════
//  AUTH GUARD
// ══════════════════════════════════════
let CU = null; // current user
(function() {
  const raw = sessionStorage.getItem('sh_user');
  if (!raw) { window.location.href = 'auth.html'; return; }
  CU = JSON.parse(raw);
  if (CU.role !== 'user') { window.location.href = 'admin.html'; return; }
  initUser();
})();

function initUser() {
  ensureUserLocations();
  document.getElementById('uc-avatar').textContent = userInitials(CU.name);
  document.getElementById('uc-name').textContent   = CU.name;
  document.getElementById('hero-name').textContent  = CU.name.split(' ')[0];
  updateBadge();
  renderHome();
}

function logout() {
  sessionStorage.removeItem('sh_user');
  window.location.href = 'auth.html';
}

// ══════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════
let currentFilter = 'all';

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('view-'+view);
  if (el) el.classList.add('active');
  document.querySelectorAll(`[data-view="${view}"]`).forEach(n => n.classList.add('active'));
  window.scrollTo({top:0, behavior:'smooth'});

  if (view==='home')          renderHome();
  if (view==='request')       renderRequestForm();
  if (view==='my-requests')   renderMyRequests();
  if (view==='notifications') renderNotifications();
  if (view==='locations')     renderLocations();
  if (view==='profile')       renderProfile();
}

function toggleDrawer()  { document.getElementById('nav-drawer').classList.toggle('open'); }
function closeDrawer()   { document.getElementById('nav-drawer').classList.remove('open'); }

// ══════════════════════════════════════
//  HOME
// ══════════════════════════════════════
function renderHome() {
  const db = getDB();
  const mine = (db.requests||[]).filter(r=>r.userId===CU.id);
  const locs = getUserLocations();
  const p = mine.filter(r=>r.status==='pending').length;
  const a = mine.filter(r=>r.status==='accepted').length;
  const r = mine.filter(r=>r.status==='rejected').length;

  document.getElementById('home-stats').innerHTML = `
    <div class="stat-card"><div class="stat-icon blue">📋</div><div><div class="stat-value">${mine.length}</div><div class="stat-label">إجمالي الطلبات</div></div></div>
    <div class="stat-card"><div class="stat-icon amber">⏳</div><div><div class="stat-value">${p}</div><div class="stat-label">معلقة</div></div></div>
    <div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-value">${a}</div><div class="stat-label">مقبولة</div></div></div>
    <div class="stat-card"><div class="stat-icon red">❌</div><div><div class="stat-value">${r}</div><div class="stat-label">مرفوضة</div></div></div>
  `;

  const recent = mine.slice(-3).reverse();
  const rc = document.getElementById('home-recent');
  rc.innerHTML = recent.length ? '<div class="req-list">'+recent.map(req=>reqCardHTML(req)).join('')+'</div>'
    : '<div class="empty-state"><span class="es-icon">📭</span><h3>لا توجد طلبات بعد</h3><p>ابدأ بطلب خدمتك الأولى</p></div>';

  document.getElementById('home-locs').innerHTML = locs.length
    ? locs.slice(0, 4).map(l=>locationMiniHTML(l)).join('')
    : `<div class="empty-state compact"><span class="es-icon">📍</span><h3>لا توجد مواقع</h3><p>أضف موقعاً لاستخدامه في طلباتك.</p><button class="btn btn-primary btn-sm" onclick="navigate('locations')">إضافة موقع</button></div>`;
}

// ══════════════════════════════════════
//  REQUEST FORM
// ══════════════════════════════════════
let selectedSvc = null;

function renderRequestForm() {
  selectedSvc = null;
  document.getElementById('service-grid').innerHTML = SERVICES.map(s=>`
    <div class="svc-card" id="svc-${s.id}" onclick="selectSvc('${s.id}')">
      <div class="svc-icon">${s.icon}</div>
      <div class="svc-label">${s.label}</div>
    </div>
  `).join('');

  renderLocationOptions();
  document.getElementById('req-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('req-desc').value = '';
}

function renderLocationOptions() {
  const locSel = document.getElementById('req-location');
  if (!locSel) return;
  const previous = locSel.value;
  const locs = getUserLocations();
  locSel.innerHTML = locs.length
    ? '<option value="">-- اختر الموقع --</option>' + locs.map(l=>`<option value="${esc(l.name)}">${l.icon} ${esc(l.name)}</option>`).join('')
    : '<option value="">لا توجد مواقع محفوظة</option>';
  locSel.disabled = !locs.length;
  if (previous && locs.some(l=>l.name === previous)) locSel.value = previous;
}

function selectSvc(id) {
  selectedSvc = id;
  document.querySelectorAll('.svc-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('svc-'+id).classList.add('selected');
}

function submitRequest() {
  const desc = document.getElementById('req-desc').value.trim();
  const loc  = document.getElementById('req-location').value;
  const date = document.getElementById('req-date').value;
  if (!selectedSvc) return toast('⚠️ يرجى اختيار نوع الخدمة');
  if (!desc)        return toast('⚠️ يرجى وصف المشكلة');
  if (!getUserLocations().length) { navigate('locations'); return toast('⚠️ أضف موقعاً أولاً لإرسال الطلب'); }
  if (!loc)         return toast('⚠️ يرجى اختيار الموقع');
  if (!date)        return toast('⚠️ يرجى تحديد التاريخ');
  if (new Date(date + 'T00:00:00') < startOfToday()) return toast('⚠️ لا يمكن اختيار تاريخ سابق');

  const db = getDB();
  const req = {id:'r'+Date.now(), userId:CU.id, service:selectedSvc, desc, location:loc, date, status:'pending', rating:null};
  db.requests = db.requests || [];
  db.requests.push(req);
  saveDB(db);
  toast('✅ تم إرسال طلبك بنجاح! سيتم مراجعته قريباً.');
  navigate('my-requests');
}

// ══════════════════════════════════════
//  MY REQUESTS
// ══════════════════════════════════════
function renderMyRequests() {
  const db    = getDB();
  const mine  = (db.requests||[]).filter(r=>r.userId===CU.id);
  const search= (document.getElementById('req-search')?.value||'').toLowerCase();
  const filtered = mine.filter(r => {
    const mF = currentFilter==='all' || r.status===currentFilter;
    const mS = !search || svcLabel(r.service).includes(search) || r.desc.includes(search) || r.location.includes(search);
    return mF && mS;
  }).reverse();

  const c = document.getElementById('req-list');
  if (!filtered.length) {
    c.innerHTML = '<div class="empty-state"><span class="es-icon">🔍</span><h3>لا توجد نتائج</h3><p>جرب تغيير الفلتر أو البحث</p></div>';
    return;
  }
  c.innerHTML = filtered.map(r=>reqCardHTML(r, true)).join('');
}

function reqCardHTML(r, showRate=false) {
  const canRate = r.status==='accepted' && r.rating===null;
  return `
    <div class="req-card" onclick="showDetail('${r.id}')">
      <div class="rc-icon">${svcIcon(r.service)}</div>
      <div class="rc-body">
        <div class="rc-title">${esc(svcLabel(r.service))}</div>
        <div class="rc-meta">
          <span>📍 ${esc(r.location)}</span>
          <span>📅 ${esc(r.date)}</span>
          <span class="muted-truncate">${esc(r.desc.substring(0,45))}${r.desc.length>45?'...':''}</span>
        </div>
      </div>
      <div class="rc-actions">
        ${r.rating ? `<span style="color:var(--gold);font-size:13px;font-weight:700">⭐ ${r.rating}/5</span>` : ''}
        ${canRate && showRate ? `<button class="btn btn-sm" style="background:var(--warn-soft);color:#d97706;border:1.5px solid #fde68a" onclick="event.stopPropagation();openRating('${r.id}')">⭐ قيّم</button>` : ''}
        <span class="badge ${BADGE_MAP[r.status]}">${BLABEL_MAP[r.status]}</span>
      </div>
    </div>
  `;
}

function setFilter(el, f) {
  currentFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  renderMyRequests();
}

// ══════════════════════════════════════
//  REQUEST DETAIL
// ══════════════════════════════════════
function showDetail(id) {
  const db = getDB();
  const r  = (db.requests||[]).find(r=>r.id===id);
  if (!r) return;

  const steps = [
    {label:'تم الإرسال',   state:'done'},
    {label:'قيد المراجعة', state: r.status==='pending' ? 'active' : 'done'},
    {label: r.status==='rejected' ? 'مرفوض' : 'تم القبول',
     state: r.status==='accepted' ? 'done' : r.status==='rejected' ? 'rejected' : ''},
  ];

  const canRate = r.status==='accepted' && r.rating===null;

  document.getElementById('detail-content').innerHTML = `
    <div class="tracker">
      ${steps.map((s,i)=>`
        <div class="tracker-step ${s.state}">
          <div class="t-dot">${s.state==='done'?'✓':s.state==='rejected'?'✕':(i+1)}</div>
          <div class="t-label">${s.label}</div>
        </div>
      `).join('')}
    </div>
    <div class="detail-table">
      <div class="detail-row"><span class="detail-label">الخدمة</span><span class="detail-value">${svcIcon(r.service)} ${esc(svcLabel(r.service))}</span></div>
      <div class="detail-row"><span class="detail-label">الوصف</span><span class="detail-value">${esc(r.desc)}</span></div>
      <div class="detail-row"><span class="detail-label">الموقع</span><span class="detail-value">📍 ${esc(r.location)}</span></div>
      <div class="detail-row"><span class="detail-label">التاريخ</span><span class="detail-value">📅 ${esc(r.date || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">الحالة</span><span class="detail-value">${LABEL_MAP[r.status]}</span></div>
      ${r.rating ? `<div class="detail-row"><span class="detail-label">تقييمك</span><span class="detail-value">${'⭐'.repeat(r.rating)} (${r.rating}/5)</span></div>` : ''}
    </div>
    ${canRate ? `<div style="margin-top:20px"><button class="btn btn-primary" onclick="closeModal('modal-detail');openRating('${r.id}')">⭐ قيّم الخدمة الآن</button></div>` : ''}
  `;
  document.getElementById('modal-detail').style.display='block';
}

// ══════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════
function renderNotifications() {
  const db = getDB();
  const notifs = (db.notifications||[]).filter(n=>n.userId===CU.id).reverse();
  const c = document.getElementById('notif-list');
  if (!notifs.length) {
    c.innerHTML = '<div class="empty-state"><span class="es-icon">🔔</span><h3>لا توجد إشعارات</h3></div>';
    return;
  }
  c.innerHTML = notifs.map(n=>`
    <div class="notif-item ${n.read?'':'unread'}" onclick="markRead('${n.id}')">
      <div class="notif-icon">${n.read?'📭':'📬'}</div>
      <div>
        <div class="notif-msg">${n.msg}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </div>
  `).join('');
  notifs.forEach(n=>n.read=true);
  saveDB(db);
  updateBadge();
}

function markRead(id) {
  const db = getDB();
  const n = (db.notifications||[]).find(n=>n.id===id);
  if (n) { n.read=true; saveDB(db); }
  renderNotifications();
}

function markAllRead() {
  const db = getDB();
  (db.notifications||[]).filter(n=>n.userId===CU.id).forEach(n=>n.read=true);
  saveDB(db); updateBadge(); renderNotifications();
}

function updateBadge() {
  const db = getDB();
  const cnt = (db.notifications||[]).filter(n=>n.userId===CU.id&&!n.read).length;
  const dot   = document.getElementById('notif-dot');
  const badge = document.getElementById('nav-badge');
  if (dot)   dot.style.display   = cnt ? 'block' : 'none';
  if (badge) { badge.style.display = cnt ? 'inline' : 'none'; badge.textContent = cnt; }
}

// ══════════════════════════════════════
//  LOCATIONS
// ══════════════════════════════════════
function renderLocations() {
  const locs = getUserLocations();
  document.getElementById('loc-grid').innerHTML =
    locs.map(l=>locationCardHTML(l)).join('') +
    `<div class="loc-card add-card" onclick="openLocationModal()">
       <div style="font-size:28px;color:var(--text-light);margin-bottom:8px">+</div>
       <div style="font-size:13px;color:var(--text-muted);font-weight:700">إضافة موقع</div>
     </div>`;
}

function ensureUserLocations() {
  const db = getDB();
  db.locations = db.locations || {};
  if (!Array.isArray(db.locations[CU.id])) {
    db.locations[CU.id] = DEFAULT_LOCS.map(l => ({...l}));
    saveDB(db);
  }
}

function getUserLocations() {
  ensureUserLocations();
  const db = getDB();
  return db.locations?.[CU.id] || [];
}

function saveUserLocations(locs) {
  const db = getDB();
  db.locations = db.locations || {};
  db.locations[CU.id] = locs;
  saveDB(db);
}

function locationMiniHTML(l) {
  return `
    <button class="location-mini" onclick="navigate('locations')">
      <span>${l.icon}</span>
      <strong>${esc(l.name)}</strong>
      <small>${esc(l.addr)}</small>
    </button>
  `;
}

function locationCardHTML(l) {
  return `
    <div class="loc-card">
      <div class="loc-card-top">
        <div class="loc-icon">${l.icon}</div>
        <div class="loc-actions">
          <button class="icon-btn" title="تعديل" onclick="openLocationModal('${l.id}')">✏️</button>
          <button class="icon-btn danger" title="حذف" onclick="deleteLocation('${l.id}')">🗑️</button>
        </div>
      </div>
      <div class="loc-name">${esc(l.name)}</div>
      <div class="loc-addr">${esc(l.addr)}</div>
    </div>
  `;
}

let editingLocationId = null;

function openLocationModal(id=null) {
  editingLocationId = id;
  const loc = id ? getUserLocations().find(l=>l.id===id) : null;
  document.getElementById('location-modal-title').textContent = loc ? '📍 تعديل موقع' : '📍 إضافة موقع';
  document.getElementById('loc-name').value = loc?.name || '';
  document.getElementById('loc-addr').value = loc?.addr || '';
  document.getElementById('loc-icon').value = loc?.icon || '📌';
  document.getElementById('modal-location').style.display = 'block';
}

function saveLocationFromModal() {
  const name = document.getElementById('loc-name').value.trim();
  const addr = document.getElementById('loc-addr').value.trim();
  const icon = document.getElementById('loc-icon').value || '📌';
  if (!name) return toast('⚠️ اسم الموقع مطلوب');
  if (!addr) return toast('⚠️ عنوان الموقع مطلوب');

  const locs = getUserLocations();
  const duplicate = locs.some(l => l.id !== editingLocationId && l.name.trim().toLowerCase() === name.toLowerCase());
  if (duplicate) return toast('⚠️ يوجد موقع محفوظ بنفس الاسم');

  if (editingLocationId) {
    const loc = locs.find(l=>l.id===editingLocationId);
    if (!loc) return toast('⚠️ لم يتم العثور على الموقع');
    loc.name = name;
    loc.addr = addr;
    loc.icon = icon;
  } else {
    locs.push({id:'l'+Date.now(), icon, name, addr});
  }
  saveUserLocations(locs);
  closeModal('modal-location');
  renderLocations();
  renderHome();
  renderLocationOptions();
  toast(editingLocationId ? '✅ تم تعديل الموقع' : '✅ تم إضافة الموقع');
}

function deleteLocation(id) {
  const locs = getUserLocations();
  const loc = locs.find(l=>l.id===id);
  if (!loc) return;
  if (!confirm(`حذف موقع "${loc.name}"؟`)) return;
  saveUserLocations(locs.filter(l=>l.id!==id));
  renderLocations();
  renderHome();
  renderLocationOptions();
  toast('🗑️ تم حذف الموقع');
}

// ══════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════
function renderProfile() {
  document.getElementById('p-avatar').textContent = userInitials(CU.name);
  document.getElementById('p-name').textContent   = CU.name;
  document.getElementById('p-email').textContent  = CU.email;
  document.getElementById('edit-name').value  = CU.name;
  document.getElementById('edit-email').value = CU.email;
}

function saveProfile() {
  const name = document.getElementById('edit-name').value.trim();
  if (!name) return toast('⚠️ الاسم مطلوب');
  const db = getDB();
  const u  = (db.users||[]).find(u=>u.id===CU.id);
  if (u) { u.name = name; saveDB(db); }
  CU.name = name;
  sessionStorage.setItem('sh_user', JSON.stringify(CU));
  document.getElementById('uc-name').textContent = name;
  document.getElementById('hero-name').textContent = name.split(' ')[0];
  renderProfile();
  toast('✅ تم حفظ البيانات بنجاح');
}

function changePassword() {
  const oldP = document.getElementById('old-pass').value;
  const newP = document.getElementById('new-pass').value;
  const conP = document.getElementById('conf-pass').value;
  if (!oldP||!newP||!conP) return toast('⚠️ يرجى ملء جميع الحقول');
  if (oldP !== CU.password) return toast('❌ كلمة المرور الحالية غير صحيحة');
  if (newP !== conP)        return toast('❌ كلمة المرور الجديدة غير متطابقة');
  const db = getDB();
  const u  = (db.users||[]).find(u=>u.id===CU.id);
  if (u) { u.password = newP; saveDB(db); }
  CU.password = newP;
  sessionStorage.setItem('sh_user', JSON.stringify(CU));
  ['old-pass','new-pass','conf-pass'].forEach(id=>document.getElementById(id).value='');
  toast('✅ تم تغيير كلمة المرور بنجاح');
}

function deleteAccount() {
  if (!confirm('هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
  const db = getDB();
  db.users = (db.users||[]).filter(u=>u.id!==CU.id);
  db.requests = (db.requests||[]).filter(r=>r.userId!==CU.id);
  db.notifications = (db.notifications||[]).filter(n=>n.userId!==CU.id);
  if (db.locations) delete db.locations[CU.id];
  saveDB(db);
  logout();
}

// ══════════════════════════════════════
//  RATING
// ══════════════════════════════════════
let ratingTarget = null, selectedRating = 0;

function openRating(rid) {
  ratingTarget = rid; selectedRating = 0;
  renderStars();
  document.getElementById('rating-comment').value = '';
  document.getElementById('modal-rating').style.display='block';
}

function renderStars() {
  document.getElementById('stars-wrap').innerHTML =
    [5,4,3,2,1].map(i=>`<span class="star-btn ${i<=selectedRating?'lit':''}" onclick="setStar(${i})">★</span>`).join('');
}

function setStar(n) { selectedRating=n; renderStars(); }

function submitRating() {
  if (!selectedRating) return toast('⚠️ يرجى اختيار تقييم');
  const db = getDB();
  const r  = (db.requests||[]).find(r=>r.id===ratingTarget);
  if (r) { r.rating = selectedRating; saveDB(db); }
  closeModal('modal-rating');
  toast('⭐ شكراً! تم إرسال تقييمك بنجاح');
  renderMyRequests();
}

// ══════════════════════════════════════
//  UTILS
// ══════════════════════════════════════
function closeModal(id) { document.getElementById(id).style.display='none'; }

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3000);
}

document.addEventListener('keydown', e => {
  if (e.key==='Escape') { closeModal('modal-detail'); closeModal('modal-rating'); closeModal('modal-location'); closeDrawer(); }
});
