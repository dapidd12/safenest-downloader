// app.js — Safenest (full) : Upload + Expiry + Admin + Maintenance
// Disclaimer: menggunakan service key di frontend itu berbahaya — kamu sudah tahu.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ========== CONFIG (ganti sesuai project) ==========
const SUPABASE_URL = 'https://rjsifamddfdhnlvrrwbb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqc2lmYW1kZGZkaG5sdnJyd2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2ODM5NiwiZXhwIjoyMDc4MzQ0Mzk2fQ.RwHToh53bF3iqWLomtBQczrkErqjXRxprIhvT4RB-1k'
const BUCKET = 'piw-files'
const BASE_LOGIN_LINK = 'https://example.com'
// admin secret "pintu rahasia"
const ADMIN_CREDENTIALS = { user: 'arya', pass: 'dapid' }
// ====================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ----------------- helpers -----------------
const $ = id => document.getElementById(id)
const rand = (n=6) => [...Array(n)].map(()=> 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random()*36)]).join('')
const sha256 = async s => {
  const buf = new TextEncoder().encode(s)
  const h = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')
}
const niceBytes = b => {
  if (!b && b !== 0) return '-'
  const u=['B','KB','MB','GB']
  let i=0, val=b
  while(val>1024 && i<u.length-1){ val/=1024; i++ }
  return `${val.toFixed(1)} ${u[i]}`
}
const log = (...a) => console.log('[safenest]',...a)

function escapeHtml(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;') }

// ----------------- Supabase helpers -----------------
async function uploadFileToStorage(file, destName){
  const { data, error } = await supabase.storage.from(BUCKET).upload(destName, file)
  if (error) throw error
  return data.path ?? data?.Key ?? data
}

// Insert file record. include expires_at optional (ISO string or null)
async function insertFileRecord({ filename, storage_path, username, password_hash, size, expires_at = null }){
  const payload = { filename, storage_path, username, password_hash }
  if(typeof size !== 'undefined') payload.size = size
  if(expires_at) payload.expires_at = expires_at
  const { data, error } = await supabase.from('files').insert([payload]).select().maybeSingle()
  if (error) throw error
  return data
}

async function getRecordByUsername(username){
  const { data, error } = await supabase.from('files').select('*').eq('username', username).maybeSingle()
  if (error) throw error
  return data
}

async function createSignedUrl(path, expires=120){
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expires)
  if (error) throw error
  return data?.signedUrl ?? data?.signedURL ?? null
}

async function forceDownloadUrl(url, filename){
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch file: '+res.status)
  const blob = await res.blob()
  const u = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = u
  a.download = filename || 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(u)
}

// delete storage object + DB record
async function deleteFile(file){
  if(!file) throw new Error('file missing')
  try {
    await supabase.storage.from(BUCKET).remove([file.storage_path])
  } catch(e) { console.warn('failed remove storage', e) }
  const { error } = await supabase.from('files').delete().eq('id', file.id)
  if(error) throw error
  return true
}

// get files list
async function listFiles(){
  const { data, error } = await supabase.from('files').select('*').order('created_at', { ascending:false }).limit(500)
  if(error) throw error
  return data || []
}

// record download event for stats
async function recordDownload({ file_id = null, filename = null, username = null } = {}){
  try {
    await supabase.from('downloads').insert([{ file_id, filename, username }])
  } catch(e) {
    console.warn('recordDownload failed', e)
  }
}

// settings table helpers (key/value json in 'settings' table)
async function getSetting(key){
  const { data, error } = await supabase.from('settings').select('*').eq('key', key).maybeSingle()
  if(error) { console.warn('getSetting err', error); return null }
  return data
}
async function upsertSetting(key, valueObj){
  const payload = { key, value: valueObj }
  const { data, error } = await supabase.from('settings').upsert([payload]).select().maybeSingle()
  if(error) throw error
  return data
}

// stats loader (important: make sure this is defined)
async function loadStats(){
  try {
    const up = await supabase.from('files').select('*', { count: 'exact', head: true })
    const dl = await supabase.from('downloads').select('*', { count: 'exact', head: true })
    return {
      uploads: up?.count ?? 0,
      downloads: dl?.count ?? 0
    }
  } catch(e) {
    console.warn('loadStats error', e)
    return { uploads: 0, downloads: 0 }
  }
}

// ----------------- Admin session helpers -----------------
function isAdminSession(){ return localStorage.getItem('sn_admin') === '1' }
function setAdminSession(on=true){ if(on) localStorage.setItem('sn_admin','1'); else localStorage.removeItem('sn_admin') }

// ----------------- Expiry helpers -----------------
// Map select value -> milliseconds (or null)
function expiryToIso(selectVal){
  // selectVal expected: 'none' | '2h' | '1d' | '5d' | '1m'
  if(!selectVal || selectVal === 'none') return null
  const now = new Date()
  let ms = null
  switch(selectVal){
    case '2h': ms = 1000 * 60 * 60 * 2; break
    case '1d': ms = 1000 * 60 * 60 * 24; break
    case '5d': ms = 1000 * 60 * 60 * 24 * 5; break
    case '1m': ms = 1000 * 60 * 60 * 24 * 30; break
    default: ms = null
  }
  return ms ? new Date(Date.now() + ms).toISOString() : null
}

// ----------------- Cleanup expired files (client-side safety) -----------------
// Find files where expires_at is not null and less than now.
// For each file: check downloads count. If downloads === 0 => delete file.
async function cleanExpiredFiles(){
  try {
    // query expired (simple where using lt). Must match your DB column name 'expires_at' typed as timestamp
    const nowIso = new Date().toISOString()
    const { data: expiredFiles, error } = await supabase
      .from('files')
      .select('*')
      .lt('expires_at', nowIso)
      .not('expires_at', 'is', null)
      .limit(500)
    if(error) { /* not fatal */ console.warn('cleanExpiredFiles: select err', error); return }
    if(!expiredFiles || expiredFiles.length === 0) return

    for(const f of expiredFiles){
      try {
        // count downloads for this file
        const { count } = await supabase.from('downloads').select('id', { count: 'exact', head: true }).eq('file_id', f.id)
        const dlCount = count || 0
        if(dlCount === 0){
          log('[expired] removing', f.storage_path, 'id', f.id)
          await deleteFile(f).catch(e => console.warn('expired delete failed', e))
        } else {
          log('[expired] file has downloads, skipping delete', f.id, 'downloads', dlCount)
        }
      } catch(e) {
        console.warn('cleanExpiredFiles inner err', e)
      }
    }
  } catch(e) {
    console.warn('cleanExpiredFiles err', e)
  }
}

// ----------------- UI wiring and logic -----------------
document.addEventListener('DOMContentLoaded', ()=> {
  const pages = Array.from(document.querySelectorAll('.page'))
  const navButtons = Array.from(document.querySelectorAll('.nav-btn'))

  function showPage(id){
    // protect admin page
    if(id === 'page-admin' && !isAdminSession()) id = 'page-download'

    pages.forEach(p => {
      if(p.id === id){
        p.classList.add('active')
        p.querySelectorAll('.glass-card, .page-title, .filebox, input, .row, .comments-box').forEach((el,i)=>{
          el.classList.add('fade-in')
          el.style.animationDelay = `${i*40}ms`
          setTimeout(()=> el.style.animationDelay = '', 800)
        })
      } else p.classList.remove('active')
    })
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.target === id))

    // enforce maintenance UI each time user navigates
    enforceMaintenanceUI()

    if(id === 'page-admin') loadAdminDashboard()
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', ()=> {
      const tgt = btn.dataset.target
      showPage(tgt)
      btn.animate([{ transform:'translateY(0)'},{transform:'translateY(-8px)'},{transform:'translateY(0)'}],{duration:360,easing:'cubic-bezier(.2,.9,.3,1)'})
    })
  })

  // default
  showPage('page-download')

  // element refs
  const fileInput = $('fileInput'), btnUpload = $('btnUpload'), credsBox = $('creds'),
        outUser = $('outUser'), outPass = $('outPass'), outLink = $('outLink'), copyCreds = $('copyCreds'),
        expirySelect = $('expirySelect') // optional element; if not present fallback to none

  const dlUser = $('dlUser'), dlPass = $('dlPass'), btnVerify = $('btnVerify'), btnClear = $('btnClear'), dlInfo = $('dlInfo')
  const fileNameEl = $('fileName'), fileSizeEl = $('fileSize'), fileTimeEl = $('fileTime'), btnView = $('btnView'), btnDownload = $('btnDownload')

  // admin refs
  const maintenanceToggle = $('maintenance-toggle'), maintenanceEnds = $('maintenance-ends'), saveSettingsBtn = $('save-settings'), maintenanceMsg = $('maintenance-msg')
  const adminLogoutBtn = $('admin-logout'), filesListEl = $('files-list'), statUploadsEl = $('stat-uploads'), statDownloadsEl = $('stat-downloads')

  // Upload handler (blocked during maintenance)
  if(btnUpload){
    btnUpload.addEventListener('click', async ()=>{
      // check maintenance
      const setting = await getSetting('maintenance').catch(()=>null)
      if(setting && setting.value && setting.value.enabled){
        const ends = setting.value.ends_at ? new Date(setting.value.ends_at) : null
        if(!ends || new Date() < ends){
          return showMaintenanceToastAndBlock()
        }
      }

      const f = fileInput?.files?.[0]
      if(!f) return alert('Pilih file dulu.')

      btnUpload.disabled = true; btnUpload.textContent = 'Uploading...'
      try {
        const dest = `${Date.now()}_${f.name.replace(/\s+/g,'_')}`
        log('[upload] ->', dest)
        const storage_path = await uploadFileToStorage(f, dest)

        // expiry processing: read expirySelect (if present) or fallback 'none'
        const sel = expirySelect ? expirySelect.value : 'none'
        const expiresIso = expiryToIso(sel) // may be null

        const username = 'sn-' + rand(6)
        const password = 'sn-' + rand(10)
        const hash = await sha256(password)
        const rec = await insertFileRecord({ filename: f.name, storage_path, username, password_hash: hash, size: f.size, expires_at: expiresIso })
        log('[db] inserted', rec)

        if(outUser) outUser.textContent = username
        if(outPass) outPass.textContent = password
        if(outLink) outLink.textContent = `${BASE_LOGIN_LINK}/?user=${username}`
        if(credsBox) credsBox.classList.remove('hide')

        // show expiry in UI if you have an element - try to set data-expiry attribute
        if(credsBox && expiresIso){
          credsBox.dataset.expires = expiresIso
        } else if(credsBox){
          delete credsBox.dataset.expires
        }

        alert('Upload & record berhasil — simpan kredensial sekarang (password tampil sekali).')

        // try cleaning expired files in background
        cleanExpiredFiles().catch(()=>{})
      } catch(err){
        console.error(err)
        alert('Upload gagal: '+(err.message||err))
      } finally {
        btnUpload.disabled = false; btnUpload.textContent = 'Upload & Generate Credentials'
      }
    })
  }

  // copy credentials (now includes expiry line if available)
  if(copyCreds){
    copyCreds.addEventListener('click', ()=>{
      const u = outUser?.textContent||'', p = outPass?.textContent||'', l = outLink?.textContent||''
      const expiryText = credsBox?.dataset?.expires ? new Date(credsBox.dataset.expires).toLocaleString() : 'Tidak kedaluwarsa'
      const txt = `username: ${u}\npassword: ${p}\nexpired: ${expiryText}\nlink: ${l}`
      navigator.clipboard.writeText(txt).then(()=> {
        copyCreds.animate([{ transform:'scale(1)' }, { transform:'scale(.96)' }, { transform:'scale(1)' }], { duration:280 })
        alert('Kredensial disalin')
      })
    })
  }

  // Verify handler — includes admin secret
  if(btnVerify) btnVerify.addEventListener('click', async ()=>{
    const username = dlUser?.value?.trim()||'', pass = dlPass?.value?.trim()||''
    if(!username || !pass) return alert('Isi username & password.')

    // admin secret door
    if(username === ADMIN_CREDENTIALS.user && pass === ADMIN_CREDENTIALS.pass){
      setAdminSession(true)
      alert('Admin login diterima — membuka dashboard')
      showPage('page-admin')
      return
    }

    try {
      const rec = await getRecordByUsername(username)
      if(!rec) return alert('Username tidak ditemukan.')
      const hash = await sha256(pass)
      if(hash !== rec.password_hash) return alert('Password salah.')

      // check if file expired already (safety)
      if(rec.expires_at){
        const ends = new Date(rec.expires_at)
        if(new Date() > ends){
          return alert('File sudah kadaluarsa.')
        }
      }

      let signed = null
      try { signed = await createSignedUrl(rec.storage_path, 300) } catch(e){ console.warn('signed failed', e) }

      if(fileNameEl) fileNameEl.textContent = rec.filename ?? rec.storage_path
      if(fileSizeEl) fileSizeEl.textContent = niceBytes(rec.size)
      if(fileTimeEl) fileTimeEl.textContent = rec.created_at ? new Date(rec.created_at).toLocaleString() : '-'
      if(dlInfo) dlInfo.classList.remove('hide')

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(rec.storage_path)}`
      const finalUrl = signed || publicUrl

      if(btnView) btnView.onclick = ()=> window.open(finalUrl, '_blank')
      if(btnDownload) btnDownload.onclick = async ()=>{
        try{
          await forceDownloadUrl(finalUrl, rec.filename ?? 'download')
          await recordDownload({ file_id: rec.id || null, filename: rec.filename, username: rec.username })
        } catch(e){ console.error(e); alert('Gagal unduh: '+(e.message||e)) }
      }
    } catch(err){
      console.error(err)
      alert('Verifikasi gagal: '+(err.message||err))
    }
  })

  if(btnClear) btnClear.addEventListener('click', ()=> { if(dlUser) dlUser.value=''; if(dlPass) dlPass.value=''; if(dlInfo) dlInfo.classList.add('hide') })

  // --- ADMIN: load dashboard ---
  async function loadAdminDashboard(){
    if(!isAdminSession()) return showPage('page-download')

    // stats
    try {
      const stats = await loadStats()
      if(statUploadsEl) statUploadsEl.textContent = stats.uploads ?? 0
      if(statDownloadsEl) statDownloadsEl.textContent = stats.downloads ?? 0
    } catch(e) { console.warn('stat load err', e) }

    // files list
    try {
      const files = await listFiles()
      if(!filesListEl) return
      filesListEl.innerHTML = ''
      files.forEach(f => {
        const row = document.createElement('div')
        row.className = 'file-row'

        const meta = document.createElement('div')
        meta.className = 'file-meta'
        const expiresText = f.expires_at ? ` • Expires: ${new Date(f.expires_at).toLocaleString()}` : ''
        meta.innerHTML = `<div class="name">${escapeHtml(f.filename || f.storage_path)}</div>
                          <div class="sub">${niceBytes(f.size || 0)} • ${f.created_at ? new Date(f.created_at).toLocaleString() : '-'}${expiresText}</div>`

        const actions = document.createElement('div')
        actions.className = 'file-actions'

        const btnView = document.createElement('button')
        btnView.className = 'btn ghost'
        btnView.innerHTML = '<i class="fa fa-eye"></i> View'
        btnView.onclick = async ()=>{
          const signed = await createSignedUrl(f.storage_path, 300).catch(()=>null)
          const url = signed || `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(f.storage_path)}`
          window.open(url, '_blank')
        }

        const btnDel = document.createElement('button')
        btnDel.className = 'btn ghost'
        btnDel.innerHTML = '<i class="fa fa-trash"></i> Hapus'
        btnDel.onclick = async ()=>{
          if(!confirm('Hapus file ini permanen?')) return
          try {
            await deleteFile(f)
            row.animate([{ opacity:1 },{ opacity:0}], { duration:420 })
            setTimeout(()=> row.remove(), 420)
          } catch(e){ alert('Gagal hapus: '+(e.message||e)) }
        }

        actions.appendChild(btnView)
        actions.appendChild(btnDel)
        row.appendChild(meta)
        row.appendChild(actions)
        filesListEl.appendChild(row)
      })
    } catch(e){
      console.error('files list err', e)
      if(filesListEl) filesListEl.innerHTML = '<div class="muted">Gagal memuat file</div>'
    }
  }

  // save settings
  if(saveSettingsBtn) saveSettingsBtn.addEventListener('click', async ()=>{
    const enabled = !!maintenanceToggle.checked
    const endsVal = maintenanceEnds.value ? new Date(maintenanceEnds.value).toISOString() : null
    const payload = { enabled, ends_at: endsVal }
    try {
      await upsertSetting('maintenance', payload)
      alert('Setting disimpan')
      updateMaintenanceMsgDisplay(payload)
      enforceMaintenanceUI()
    } catch(e) {
      alert('Gagal simpan: '+(e.message||e))
    }
  })

  function updateMaintenanceMsgDisplay(val){
    if(!val || !val.enabled){ maintenanceMsg.textContent = 'Maintenance tidak aktif' ; return }
    const endsAt = val.ends_at ? new Date(val.ends_at) : null
    if(endsAt) maintenanceMsg.textContent = `Maintenance aktif sampai ${endsAt.toLocaleString()}`
    else maintenanceMsg.textContent = `Maintenance aktif (tanpa batas waktu)`
  }

  if(adminLogoutBtn) adminLogoutBtn.addEventListener('click', ()=> { setAdminSession(false); alert('Logout admin berhasil'); showPage('page-download') })

  // small keyboard nav
  window.addEventListener('keydown', e=>{
    const order = ['page-download','page-upload','page-about','page-admin']
    const cur = pages.findIndex(p=>p.classList.contains('active'))
    if(e.key === 'ArrowLeft') showPage(order[Math.max(0,cur-1)])
    if(e.key === 'ArrowRight') showPage(order[Math.min(order.length-1,cur+1)])
  })

  /* ---------------- MAINTENANCE UI ---------------- */

  function showMaintenanceToastAndBlock(){
    alert('Sedang maintenance — fitur Upload & About dinonaktifkan. Kamu hanya bisa mendownload file yang sudah tersedia.')
  }

  function createMaintOverlayElement(text){
    const wrapper = document.createElement('div')
    wrapper.className = 'maint-overlay'
    wrapper.innerHTML = `
      <div class="maint-card">
        <div class="maint-icon"><i class="fa fa-wrench"></i></div>
        <div class="maint-body">
          <div class="maint-title">maintenance</div>
          <div class="maint-desc">${escapeHtml(text)}</div>
          <div class="maint-actions">
            <button class="maint-ok">Oke — kembali ke Download</button>
          </div>
        </div>
      </div>`
    wrapper.querySelector('.maint-ok').addEventListener('click', ()=> {
      wrapper.animate([{ transform:'translateY(0)', opacity:1 }, { transform:'translateY(10px)', opacity:0 }], { duration:280, easing:'ease' })
      setTimeout(()=> {
        document.querySelectorAll('.maint-overlay').forEach(o=> o.remove())
        document.querySelectorAll('#page-upload .card, #page-about .card').forEach(c=> c.classList.remove('muted-overlay'))
        showPage('page-download')
      }, 300)
    })
    return wrapper
  }

  async function enforceMaintenanceUI(){
    try {
      const s = await getSetting('maintenance')
      const cards = document.querySelectorAll('#page-upload .card, #page-about .card')
      // remove previous overlays
      document.querySelectorAll('#page-upload .card .maint-overlay, #page-about .card .maint-overlay').forEach(n => n.remove())

      if(s && s.value && s.value.enabled){
        const ends = s.value.ends_at ? new Date(s.value.ends_at) : null
        if(!ends || new Date() < ends){
          const message = `Sedang ada perbaikan atau update website, jadi pengunjung tidak dapat meng-upload dan membuka menu About. Pengunjung hanya bisa mendownload file yang sudah diunggah sebelumnya. Terimakasih.`
          cards.forEach(card => {
            card.classList.add('muted-overlay')
            const ov = createMaintOverlayElement(message)
            if(getComputedStyle(card).position === 'static') card.style.position = 'relative'
            card.appendChild(ov)
          })
          return
        }
      }
      // not in maintenance: clean UI
      cards.forEach(card=>{
        card.classList.remove('muted-overlay')
        const exist = card.querySelector('.maint-overlay')
        if(exist) exist.remove()
      })
    } catch(e) { console.warn('enforce maintenance err', e) }
  }

  // run once at start
  enforceMaintenanceUI()
  // periodic checks
  setInterval(enforceMaintenanceUI, 60 * 1000)
  // periodic expired cleanup (every 5 minutes)
  setInterval(cleanExpiredFiles, 5 * 60 * 1000)
  // run a cleanup once on start
  cleanExpiredFiles().catch(()=>{})

  // nav animation micro
  document.querySelectorAll('.nav-btn').forEach((b,i)=> b.animate([{opacity:0, transform:'translateY(8px)'}, {opacity:1, transform:'translateY(0)'}], { duration: 420, delay: i*80, easing:'cubic-bezier(.2,.9,.3,1)' }))

}) // DOMContentLoaded end