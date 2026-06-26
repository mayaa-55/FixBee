// ══════════════════════════════════════
//  DATA
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

function getDB()    { return JSON.parse(localStorage.getItem('sh_db') || '{}'); }
function saveDB(db) { localStorage.setItem('sh_db', JSON.stringify(db)); }
function svcLabel(id){ return (SERVICES.find(s=>s.id===id)||{label:id}).label; }
function svcIcon(id) { return (SERVICES.find(s=>s.id===id)||{icon:'🔧'}).icon; }
function userName(userId, db) { return ((db.users||[]).find(u=>u.id===userId)||{name:'مجهول'}).name; }
function userEmail(userId, db){ return ((db.users||[]).find(u=>u.id===userId)||{email:''}).email; }
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}
function initials(name) {
  return String(name || '').trim().split(/\s+/).filter(Boolean).map(n=>n[0]).join('').substring(0,2) || '؟';
}
const BADGE_MAP  = {pending:'pending',  accepted:'accepted',  rejected:'rejected'};
const BLABEL_MAP = {pending:'معلق',     accepted:'مقبول',     rejected:'مرفوض'};
const LABEL_MAP  = {pending:'معلق ⏳',  accepted:'مقبول ✅',  rejected:'مرفوض ❌'};

// ══════════════════════════════════════
//  AUTH GUARD
// ══════════════════════════════════════
let CU = null;
(function() {
  const raw = sessionStorage.getItem('sh_user');
  if (!raw) { window.location.href = 'auth.html'; return; }
  CU = JSON.parse(raw);
  if (CU.role !== 'admin') { window.location.href = 'user.html'; return; }
  initAdmin();
})();

function initAdmin() {
  const initials = CU.name.split(' ').map(n=>n[0]).join('').substring(0,2);
  document.getElementById('uc-avatar').textContent = initials;
  document.getElementById('uc-name').textContent   = CU.name;
  updatePendingBadge();
  renderDashboard();
}

function logout() {
  sessionStorage.removeItem('sh_user');
  window.location.href = 'auth.html';
}

// ══════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════
let adminFilter = 'all';
let userRoleFilter = 'all';

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('view-'+view);
  if (el) el.classList.add('active');
  document.querySelectorAll(`[data-view="${view}"]`).forEach(n => n.classList.add('active'));
  window.scrollTo({top:0, behavior:'smooth'});

  if (view==='dashboard') renderDashboard();
  if (view==='manage')    renderManage();
  if (view==='users')     renderUsers();
  if (view==='profile')   renderProfile();
}

function toggleDrawer() { document.getElementById('nav-drawer').classList.toggle('open'); }
function closeDrawer()  { document.getElementById('nav-drawer').classList.remove('open'); }

// ══════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════
function renderDashboard() {
  const db   = getDB();
  const reqs = db.requests || [];
  const p    = reqs.filter(r=>r.status==='pending').length;
  const a    = reqs.filter(r=>r.status==='accepted').length;
  const r    = reqs.filter(r=>r.status==='rejected').length;
  const users= (db.users||[]).filter(u=>u.role==='user').length;
  const rated = reqs.filter(r=>Number(r.rating));
  const avgRating = rated.length ? (rated.reduce((sum, req)=>sum + Number(req.rating), 0) / rated.length).toFixed(1) : '—';
  const newest = reqs.slice().sort((x,y)=>String(y.date || '').localeCompare(String(x.date || '')))[0];

  document.getElementById('admin-stats').innerHTML = `
    <div class="stat-card"><div class="stat-icon blue">📋</div><div><div class="stat-value">${reqs.length}</div><div class="stat-label">إجمالي الطلبات</div></div></div>
    <div class="stat-card"><div class="stat-icon amber">⏳</div><div><div class="stat-value">${p}</div><div class="stat-label">معلقة – تحتاج إجراء</div></div></div>
    <div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-value">${a}</div><div class="stat-label">مقبولة</div></div></div>
    <div class="stat-card"><div class="stat-icon red">❌</div><div><div class="stat-value">${r}</div><div class="stat-label">مرفوضة</div></div></div>
    <div class="stat-card"><div class="stat-icon purple">👥</div><div><div class="stat-value">${users}</div><div class="stat-label">المستخدمون</div></div></div>
  `;

  document.getElementById('admin-overview').innerHTML = `
    <div class="insight-panel">
      <div class="insight-head">
        <span>نظرة تشغيلية</span>
        <strong>${p ? `${p} طلب يحتاج قرار` : 'كل الطلبات محدثة'}</strong>
      </div>
      <div class="insight-grid">
        <div><span>متوسط التقييم</span><strong>${avgRating}</strong></div>
        <div><span>آخر طلب</span><strong>${newest ? esc(svcLabel(newest.service)) : 'لا يوجد'}</strong></div>
        <div><span>نسبة القبول</span><strong>${reqs.length ? Math.round((a / reqs.length) * 100) + '%' : '—'}</strong></div>
      </div>
    </div>
    <div class="action-panel">
      <button class="btn btn-primary" onclick="navigate('manage')">مراجعة الطلبات</button>
      <button class="btn btn-secondary" onclick="navigate('users')">إدارة المستخدمين</button>
    </div>
  `;

  const tbody = document.getElementById('dash-tbody');
  tbody.innerHTML = reqs.length
    ? reqs.slice().reverse().slice(0, 10).map(req=>tableRowHTML(req, db)).join('')
    : `<tr><td colspan="6"><div class="empty-state compact"><span class="es-icon">📭</span><h3>لا توجد طلبات حتى الآن</h3><p>ستظهر الطلبات الجديدة هنا فور إرسالها.</p></div></td></tr>`;
  updatePendingBadge();
}

function tableRowHTML(req, db) {
  return `<tr>
    <td>
      <div style="font-weight:800">${esc(userName(req.userId, db))}</div>
      <div style="font-size:11px;color:var(--text-muted)">${esc(userEmail(req.userId, db))}</div>
    </td>
    <td>${svcIcon(req.service)} ${esc(svcLabel(req.service))}</td>
    <td>📍 ${esc(req.location)}</td>
    <td>📅 ${esc(req.date || '—')}</td>
    <td><span class="badge ${BADGE_MAP[req.status]}">${BLABEL_MAP[req.status]}</span></td>
    <td>
      ${req.status==='pending' ? `
        <div style="display:flex;gap:6px">
          <button class="btn btn-success btn-sm" onclick="adminAction('${req.id}','accepted')">✅ قبول</button>
          <button class="btn btn-danger btn-sm"  onclick="adminAction('${req.id}','rejected')">❌ رفض</button>
        </div>
      ` : `<button class="btn btn-secondary btn-sm" onclick="showDetail('${req.id}')">عرض</button>`}
    </td>
  </tr>`;
}

// ══════════════════════════════════════
//  MANAGE REQUESTS
// ══════════════════════════════════════
function renderManage() {
  const db     = getDB();
  const reqs   = db.requests || [];
  const search = (document.getElementById('manage-search')?.value || '').toLowerCase();
  const filtered = reqs.filter(req => {
    const mF = adminFilter==='all' || req.status===adminFilter;
    const uName = userName(req.userId, db).toLowerCase();
    const mS = !search || svcLabel(req.service).includes(search) || req.location.includes(search) || uName.includes(search);
    return mF && mS;
  }).reverse();

  const c = document.getElementById('manage-list');
  if (!filtered.length) {
    c.innerHTML = '<div class="empty-state"><span class="es-icon">🔍</span><h3>لا توجد نتائج</h3><p>جرب تغيير الفلتر</p></div>';
    return;
  }
  c.innerHTML = filtered.map(req => {
    const uName = userName(req.userId, db);
    return `
      <div class="req-card" onclick="showDetail('${req.id}')">
        <div class="rc-icon">${svcIcon(req.service)}</div>
        <div class="rc-body">
          <div class="rc-title">${esc(svcLabel(req.service))} — <span style="color:var(--text-muted);font-weight:600">${esc(uName)}</span></div>
          <div class="rc-meta">
            <span>📍 ${esc(req.location)}</span>
            <span>📅 ${esc(req.date || '—')}</span>
            <span class="muted-truncate">${esc((req.desc || '').substring(0,50))}${(req.desc || '').length>50?'...':''}</span>
          </div>
        </div>
        <div class="rc-actions">
          <span class="badge ${BADGE_MAP[req.status]}">${BLABEL_MAP[req.status]}</span>
          ${req.status==='pending' ? `
            <button class="btn btn-success btn-sm" onclick="event.stopPropagation();adminAction('${req.id}','accepted')">✅ قبول</button>
            <button class="btn btn-danger btn-sm"  onclick="event.stopPropagation();adminAction('${req.id}','rejected')">❌ رفض</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function setAdminFilter(el, f) {
  adminFilter = f;
  document.querySelectorAll('#view-manage .filter-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  renderManage();
}

function adminAction(id, newStatus) {
  const db  = getDB();
  const req = (db.requests||[]).find(r=>r.id===id);
  if (!req) return;
  if (!['accepted', 'rejected'].includes(newStatus)) return;
  if (req.status !== 'pending') return toast('⚠️ هذا الطلب تمت مراجعته بالفعل');
  req.status = newStatus;
  const msg = newStatus==='accepted'
    ? `تم قبول طلب ${svcLabel(req.service)} الخاص بك ✅`
    : `عذراً، تم رفض طلب ${svcLabel(req.service)} ❌`;
  db.notifications = db.notifications || [];
  db.notifications.push({id:'n'+Date.now(), userId:req.userId, msg, time:'الآن', read:false});
  saveDB(db);
  toast(newStatus==='accepted' ? '✅ تم قبول الطلب وإشعار المستخدم' : '❌ تم رفض الطلب وإشعار المستخدم');
  updatePendingBadge();
  renderDashboard();
  renderManage();
}

function updatePendingBadge() {
  const db  = getDB();
  const cnt = (db.requests||[]).filter(r=>r.status==='pending').length;
  const b   = document.getElementById('pending-badge');
  if (b) { b.style.display = cnt ? 'inline' : 'none'; b.textContent = cnt; }
}

// ══════════════════════════════════════
//  USERS
// ══════════════════════════════════════
function renderUsers() {
  const db    = getDB();
  const query = (document.getElementById('users-search')?.value || '').toLowerCase();
  const users = (db.users||[]).filter(u => {
    const roleMatch = userRoleFilter === 'all' || u.role === userRoleFilter;
    const text = `${u.name || ''} ${u.email || ''} ${u.id || ''}`.toLowerCase();
    return roleMatch && (!query || text.includes(query));
  });
  const tbody = document.getElementById('users-tbody');
  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state compact"><span class="es-icon">🔍</span><h3>لا توجد نتائج</h3><p>جرّب تغيير البحث أو الفلتر.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = users.map(u => {
    const uReqs   = (db.requests||[]).filter(r=>r.userId===u.id);
    const lastReq = uReqs.length ? uReqs[uReqs.length-1].date : '—';
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="table-avatar">${initials(u.name)}</div>
          <div>
            <div style="font-weight:800">${esc(u.name)}</div>
            <div style="font-size:11px;color:var(--text-muted)">#${esc(u.id)}</div>
          </div>
        </div>
      </td>
      <td>${esc(u.email)}</td>
      <td><span class="badge ${u.role==='admin'?'admin':'accepted'}">${u.role==='admin'?'مسؤول':'مستخدم'}</span></td>
      <td style="font-weight:800">${uReqs.length}</td>
      <td>${esc(lastReq)}</td>
    </tr>`;
  }).join('');
}

function setUserRoleFilter(el, role) {
  userRoleFilter = role;
  document.querySelectorAll('#view-users .filter-chip').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
  renderUsers();
}

// ══════════════════════════════════════
//  REQUEST DETAIL
// ══════════════════════════════════════
function showDetail(id) {
  const db  = getDB();
  const req = (db.requests||[]).find(r=>r.id===id);
  if (!req) return;

  const steps = [
    {label:'تم الإرسال',   state:'done'},
    {label:'قيد المراجعة', state: req.status==='pending' ? 'active' : 'done'},
    {label: req.status==='rejected' ? 'مرفوض' : 'تم القبول',
     state: req.status==='accepted' ? 'done' : req.status==='rejected' ? 'rejected' : ''},
  ];

  const uName = userName(req.userId, db);

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
      <div class="detail-row"><span class="detail-label">المستخدم</span><span class="detail-value">👤 ${esc(uName)}</span></div>
      <div class="detail-row"><span class="detail-label">الخدمة</span><span class="detail-value">${svcIcon(req.service)} ${esc(svcLabel(req.service))}</span></div>
      <div class="detail-row"><span class="detail-label">الوصف</span><span class="detail-value">${esc(req.desc)}</span></div>
      <div class="detail-row"><span class="detail-label">الموقع</span><span class="detail-value">📍 ${esc(req.location)}</span></div>
      <div class="detail-row"><span class="detail-label">التاريخ</span><span class="detail-value">📅 ${esc(req.date || '—')}</span></div>
      <div class="detail-row"><span class="detail-label">الحالة</span><span class="detail-value">${LABEL_MAP[req.status]}</span></div>
      ${req.rating ? `<div class="detail-row"><span class="detail-label">تقييم المستخدم</span><span class="detail-value">${'⭐'.repeat(req.rating)} (${req.rating}/5)</span></div>` : ''}
    </div>
    ${req.status==='pending' ? `
      <div class="modal-actions" style="margin-top:20px">
        <button class="btn btn-danger"   onclick="adminAction('${req.id}','rejected');closeModal('modal-detail')">❌ رفض الطلب</button>
        <button class="btn btn-success"  style="flex:2" onclick="adminAction('${req.id}','accepted');closeModal('modal-detail')">✅ قبول الطلب</button>
      </div>
    ` : ''}
  `;
  document.getElementById('modal-detail').style.display='block';
}

// ══════════════════════════════════════
//  PROFILE
// ══════════════════════════════════════
function renderProfile() {
  document.getElementById('p-avatar').textContent = initials(CU.name);
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
  renderProfile();
  toast('✅ تم حفظ البيانات بنجاح');
}

function changePassword() {
  const oldP = document.getElementById('old-pass').value;
  const newP = document.getElementById('new-pass').value;
  const conP = document.getElementById('conf-pass').value;
  if (!oldP||!newP||!conP) return toast('⚠️ يرجى ملء جميع الحقول');
  if (oldP !== CU.password) return toast('❌ كلمة المرور الحالية غير صحيحة');
  if (newP !== conP)        return toast('❌ كلمة المرور غير متطابقة');
  const db = getDB();
  const u  = (db.users||[]).find(u=>u.id===CU.id);
  if (u) { u.password = newP; saveDB(db); }
  CU.password = newP;
  sessionStorage.setItem('sh_user', JSON.stringify(CU));
  ['old-pass','new-pass','conf-pass'].forEach(id=>document.getElementById(id).value='');
  toast('✅ تم تغيير كلمة المرور');
}

// ══════════════════════════════════════
//  UTILS
// ══════════════════════════════════════
function closeModal(id) { document.getElementById(id).style.display='none'; }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3000);
}

document.addEventListener('keydown', e => {
  if (e.key==='Escape') { closeModal('modal-detail'); closeDrawer(); }
});
