// Shared DB (stored in localStorage for cross-page)
  function getDB() {
    const raw = localStorage.getItem('sh_db');
    if (raw) return JSON.parse(raw);
    const db = {
      users: [
        {id:'u1', name:'أحمد محمد', email:'user@demo.com',  password:'123456',   role:'user'},
        {id:'u2', name:'المدير',    email:'admin@demo.com', password:'admin123', role:'admin'},
      ],
      requests: [
        {id:'r1',userId:'u1',service:'plumbing',   desc:'تسرب مياه في الحمام',  location:'المنزل',date:'2025-04-20',status:'accepted',rating:null},
        {id:'r2',userId:'u1',service:'electrical', desc:'عطل في لوحة الكهرباء', location:'العمل',  date:'2025-04-18',status:'pending', rating:null},
        {id:'r3',userId:'u1',service:'ac',         desc:'التكييف لا يبرد',      location:'الفيلا', date:'2025-04-15',status:'rejected',rating:null},
        {id:'r4',userId:'u1',service:'cleaning',   desc:'تنظيف شامل للشقة',   location:'المنزل',date:'2025-04-10',status:'accepted',rating:4},
      ],
      notifications: [
        {id:'n1',userId:'u1',msg:'تم قبول طلب السباكة الخاص بك ✅',time:'منذ ساعة',read:false},
        {id:'n2',userId:'u1',msg:'تم رفض طلب التكييف ❌',time:'منذ يومين',read:true},
      ]
    };
    localStorage.setItem('sh_db', JSON.stringify(db));
    return db;
  }
  function saveDB(db) { localStorage.setItem('sh_db', JSON.stringify(db)); }

  function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach((t,i) => t.classList.toggle('active', (tab==='login'&&i===0)||(tab==='register'&&i===1)));
    document.getElementById('form-login').classList.toggle('active', tab==='login');
    document.getElementById('form-register').classList.toggle('active', tab==='register');
    document.getElementById('auth-error').style.display = 'none';
  }

  function showError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg; el.style.display = 'block';
  }

  function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    if (!email || !pass) return showError('يرجى ملء جميع الحقول');
    const db   = getDB();
    const user = db.users.find(u => u.email===email && u.password===pass);
    if (!user) return showError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    sessionStorage.setItem('sh_user', JSON.stringify(user));
    window.location.href = user.role === 'admin' ? 'admin.html' : 'user.html';
  }

  function handleRegister() {
    const name  = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass  = document.getElementById('reg-password').value;
    if (!name||!email||!pass) return showError('يرجى ملء جميع الحقول');
    const db = getDB();
    if (db.users.find(u=>u.email===email)) return showError('البريد الإلكتروني مسجل مسبقاً');
    const newUser = {id:'u'+Date.now(), name, email, password:pass, role:'user'};
    db.users.push(newUser);
    saveDB(db);
    sessionStorage.setItem('sh_user', JSON.stringify(newUser));
    window.location.href = 'user.html';
  }

  function fillUser()  { switchTab('login'); document.getElementById('login-email').value='user@demo.com';  document.getElementById('login-password').value='123456'; }
  function fillAdmin() { switchTab('login'); document.getElementById('login-email').value='admin@demo.com'; document.getElementById('login-password').value='admin123'; }

  // Redirect if already logged in
  const existing = sessionStorage.getItem('sh_user');
  if (existing) {
    const u = JSON.parse(existing);
    window.location.href = u.role==='admin' ? 'admin.html' : 'user.html';
  }
