const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'aajko-khabar.db'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS articles (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 title TEXT NOT NULL,
 slug TEXT UNIQUE NOT NULL,
 summary TEXT DEFAULT '',
 body TEXT NOT NULL,
 category TEXT DEFAULT 'राष्ट्रिय',
 image TEXT DEFAULT '',
 author TEXT DEFAULT 'आजको खबर',
 status TEXT NOT NULL DEFAULT 'draft',
 is_breaking INTEGER NOT NULL DEFAULT 0,
 is_featured INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS settings (
 key TEXT PRIMARY KEY,
 value TEXT NOT NULL DEFAULT ''
);
`);
const settingDefaults = {
 siteName: 'आजको खबर',
 tagline: 'एकेन्द्र मिडिया द्वारा सञ्चालित',
 logoUrl: '',
 breakingText: 'आजको खबरमा स्वागत छ',
 liveUrl: '',
 facebookUrl: '',
 youtubeUrl: ''
};
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)');
for (const [k,v] of Object.entries(settingDefaults)) insertSetting.run(k,v);

const adminUser = process.env.ADMIN_USERNAME;
const adminPass = process.env.ADMIN_PASSWORD;
if (adminUser && adminPass && !db.prepare('SELECT id FROM users WHERE username=?').get(adminUser)) {
  const hash = bcrypt.hashSync(adminPass, 12);
  db.prepare('INSERT INTO users(username,password_hash) VALUES (?,?)').run(adminUser, hash);
  console.log('Initial admin account created from environment secrets.');
}
if (!adminUser || !adminPass) {
  console.warn('Set ADMIN_USERNAME and ADMIN_PASSWORD in Replit Secrets to create the first admin account.');
}

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-this-session-secret-in-replit-secrets',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8*60*60*1000 }
}));
app.use(express.static(path.join(ROOT, 'public')));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g,'').slice(0,10);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2,9) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('JPG, PNG, WEBP वा GIF फोटो मात्र अपलोड गर्न मिल्छ।'));
  }
});

function requireAdmin(req,res,next) {
  if (req.session && req.session.userId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'पहिले Admin Login गर्नुहोस्।' });
  return res.redirect('/admin');
}
function slugify(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0,100) || ('news-' + Date.now());
}
function uniqueSlug(title, currentId) {
  const root = slugify(title); let slug = root, n = 2;
  while (true) {
    const row = currentId
      ? db.prepare('SELECT id FROM articles WHERE slug=? AND id<>?').get(slug,currentId)
      : db.prepare('SELECT id FROM articles WHERE slug=?').get(slug);
    if (!row) return slug;
    slug = root + '-' + n++;
  }
}
function getSettings() {
  const rows = db.prepare('SELECT key,value FROM settings').all();
  return Object.fromEntries(rows.map(r => [r.key,r.value]));
}
function cleanArticle(row) {
  if (!row) return row;
  return { ...row, is_breaking: !!row.is_breaking, is_featured: !!row.is_featured };
}

app.get('/api/settings', (_req,res) => res.json(getSettings()));
app.get('/api/articles', (req,res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit || '30',10),1),100);
  const category = req.query.category;
  const search = String(req.query.q || '').trim();
  let sql = "SELECT * FROM articles WHERE status='published'";
  const params = [];
  if (category) { sql += ' AND category=?'; params.push(category); }
  if (search) { sql += ' AND (title LIKE ? OR summary LIKE ? OR body LIKE ?)'; const q='%'+search+'%'; params.push(q,q,q); }
  sql += ' ORDER BY is_featured DESC, created_at DESC LIMIT ?'; params.push(limit);
  res.json(db.prepare(sql).all(...params).map(cleanArticle));
});
app.get('/api/articles/:slug', (req,res) => {
  const row = db.prepare("SELECT * FROM articles WHERE slug=? AND status='published'").get(req.params.slug);
  if (!row) return res.status(404).json({error:'समाचार भेटिएन।'});
  res.json(cleanArticle(row));
});
app.get('/api/categories', (_req,res) => {
  res.json(db.prepare("SELECT category,COUNT(*) AS count FROM articles WHERE status='published' GROUP BY category ORDER BY category").all());
});

app.post('/api/login', (req,res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(String(username || ''));
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash)) {
    return res.status(401).json({error:'Username वा Password मिलेन।'});
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ok:true, username:user.username});
});
app.post('/api/logout', (req,res) => req.session.destroy(() => res.json({ok:true})));
app.get('/api/admin/me', requireAdmin, (req,res) => res.json({username:req.session.username}));

app.get('/api/admin/articles', requireAdmin, (_req,res) => {
  res.json(db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all().map(cleanArticle));
});
app.post('/api/admin/upload', requireAdmin, (req,res,next) => {
  upload.single('image')(req,res,err => {
    if (err) return res.status(400).json({error:err.message});
    if (!req.file) return res.status(400).json({error:'फोटो छान्नुहोस्।'});
    res.json({url:'/uploads/'+req.file.filename});
  });
});
app.post('/api/admin/articles', requireAdmin, (req,res) => {
  const b = req.body || {};
  if (!String(b.title || '').trim() || !String(b.body || '').trim()) return res.status(400).json({error:'शीर्षक र समाचार विवरण अनिवार्य छन्।'});
  const slug = uniqueSlug(b.title);
  const status = b.status === 'published' ? 'published' : 'draft';
  const info = db.prepare(`INSERT INTO articles(title,slug,summary,body,category,image,author,status,is_breaking,is_featured,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).run(
      String(b.title).trim(), slug, b.summary || '', b.body, b.category || 'राष्ट्रिय',
      b.image || '', b.author || 'आजको खबर', status, b.is_breaking ? 1:0, b.is_featured ? 1:0
    );
  res.json({ok:true,id:info.lastInsertRowid,slug});
});
app.put('/api/admin/articles/:id', requireAdmin, (req,res) => {
  const id = Number(req.params.id), b = req.body || {};
  const old = db.prepare('SELECT * FROM articles WHERE id=?').get(id);
  if (!old) return res.status(404).json({error:'समाचार भेटिएन।'});
  if (!String(b.title || '').trim() || !String(b.body || '').trim()) return res.status(400).json({error:'शीर्षक र समाचार विवरण अनिवार्य छन्।'});
  const slug = uniqueSlug(b.title,id);
  db.prepare(`UPDATE articles SET title=?,slug=?,summary=?,body=?,category=?,image=?,author=?,status=?,is_breaking=?,is_featured=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(String(b.title).trim(),slug,b.summary||'',b.body,b.category||'राष्ट्रिय',b.image||'',b.author||'आजको खबर',
      b.status==='published'?'published':'draft',b.is_breaking?1:0,b.is_featured?1:0,id);
  res.json({ok:true,slug});
});
app.delete('/api/admin/articles/:id', requireAdmin, (req,res) => {
  const result = db.prepare('DELETE FROM articles WHERE id=?').run(Number(req.params.id));
  if (!result.changes) return res.status(404).json({error:'समाचार भेटिएन।'});
  res.json({ok:true});
});
app.put('/api/admin/settings', requireAdmin, (req,res) => {
  const allowed = ['siteName','tagline','logoUrl','breakingText','liveUrl','facebookUrl','youtubeUrl'];
  const stmt = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  for (const k of allowed) if (req.body[k] !== undefined) stmt.run(k,String(req.body[k]).slice(0,1000));
  res.json({ok:true,settings:getSettings()});
});

app.get('/admin', (_req,res) => res.sendFile(path.join(ROOT,'public','admin.html')));
app.get('/news/:slug', (_req,res) => res.sendFile(path.join(ROOT,'public','article.html')));
app.get('*', (_req,res) => res.sendFile(path.join(ROOT,'public','index.html')));

app.use((err,_req,res,_next) => {
  console.error(err);
  res.status(500).json({error:'सर्भरमा समस्या आयो। Replit Console हेर्नुहोस्।'});
});
app.listen(PORT,'0.0.0.0',() => console.log(`आजको खबर चलिरहेको छ: port ${PORT}`));
