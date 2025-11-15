// app.js — Safenest (light + liquid glass + animations)
// WARNING: using SERVICE_ROLE_KEY in frontend is dangerous (you agreed)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ========== CONFIG - GANTI INI =============
const SUPABASE_URL = 'https://rjsifamddfdhnlvrrwbb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqc2lmYW1kZGZkaG5sdnJyd2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2ODM5NiwiZXhwIjoyMDc4MzQ0Mzk2fQ.RwHToh53bF3iqWLomtBQczrkErqjXRxprIhvT4RB-1k'
const BUCKET = 'piw-files'
const BASE_LOGIN_LINK = 'https://example.com'
// ============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// helpers
const $ = id => document.getElementById(id)
const rand = (n=6) => [...Array(n)].map(()=> 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random()*36)]).join('')
const sha256 = async s => { const buf = new TextEncoder().encode(s); const h = await crypto.subtle.digest('SHA-256', buf); return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('') }
const niceBytes = b => { if (!b && b !== 0) return '-'; const u=['B','KB','MB','GB']; let i=0,val=b; while(val>1024 && i<u.length-1){val/=1024;i++} return `${val.toFixed(1)} ${u[i]}` }
const log = (...a) => console.log('[safenest]',...a)

// storage/db helpers
async function uploadFileToStorage(file, destName){
  const { data, error } = await supabase.storage.from(BUCKET).upload(destName, file)
  if (error) throw error
  if (!data) throw new Error('No upload data returned')
  return data.path ?? data?.Key ?? data
}
async function insertFileRecord({ filename, storage_path, username, password_hash, size }){
  const payload = { filename, storage_path, username, password_hash }
  if(typeof size !== 'undefined') payload.size = size
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

// UI wiring + transitions
document.addEventListener('DOMContentLoaded', ()=> {
  const pages = Array.from(document.querySelectorAll('.page'))
  const navButtons = Array.from(document.querySelectorAll('.nav-btn'))

  function showPage(id){
    pages.forEach(p => {
      if(p.id === id){
        p.classList.add('active')
        // nice reveal of children
        p.querySelectorAll('.glass-card, .page-title, .filebox, input, .row, .comments-box').forEach((el,i)=>{
          el.classList.add('fade-in')
          el.style.animationDelay = `${i*50}ms`
          setTimeout(()=> el.style.animationDelay = '', 800)
        })
      } else {
        p.classList.remove('active')
      }
    })
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.target === id))
  }

  // wire nav
  navButtons.forEach(btn => {
    btn.addEventListener('click', ()=> {
      const tgt = btn.dataset.target
      showPage(tgt)
      btn.animate([{ transform:'translateY(0)'},{transform:'translateY(-8px)'},{transform:'translateY(0)'}],{duration:360,easing:'cubic-bezier(.2,.9,.3,1)'})
    })
  })

  // default
  showPage('page-download')

  // element ref
  const fileInput = $('fileInput'), btnUpload = $('btnUpload'), credsBox = $('creds'), outUser = $('outUser'), outPass = $('outPass'), outLink = $('outLink'), copyCreds = $('copyCreds')
  const dlUser = $('dlUser'), dlPass = $('dlPass'), btnVerify = $('btnVerify'), btnClear = $('btnClear'), dlInfo = $('dlInfo')
  const fileNameEl = $('fileName'), fileSizeEl = $('fileSize'), fileTimeEl = $('fileTime'), btnView = $('btnView'), btnDownload = $('btnDownload')
  const commentsBox = $('commentsBox'), btnSend = $('cSend'), cName = $('cName'), cMsg = $('cMsg')

  // Upload
  if(btnUpload) btnUpload.addEventListener('click', async ()=>{
    const f = fileInput?.files?.[0]
    if(!f) return alert('Pilih file dulu.')
    btnUpload.disabled = true; btnUpload.textContent = 'Uploading...'
    try{
      const dest = `${Date.now()}_${f.name.replace(/\s+/g,'_')}`
      log('[upload] ->', dest)
      const storage_path = await uploadFileToStorage(f, dest)
      const username = 'piw-' + rand(6)
      const password = 'piw-' + rand(10)
      const hash = await sha256(password)
      const rec = await insertFileRecord({ filename: f.name, storage_path, username, password_hash: hash, size: f.size })
      log('[db] inserted', rec)
      if(outUser) outUser.textContent = username
      if(outPass) outPass.textContent = password
      if(outLink) outLink.textContent = `${BASE_LOGIN_LINK}/?user=${username}`
      if(credsBox) credsBox.classList.remove('hide')
      // micro animation
      credsBox.animate([{ transform: 'translateY(6px)', opacity:0 }, { transform:'translateY(0)', opacity:1 }], { duration:420, easing:'cubic-bezier(.2,.9,.3,1)' })
      alert('Upload & record berhasil — simpan kredensial sekarang (password tampil sekali).')
    }catch(err){ console.error(err); alert('Upload gagal: '+(err.message||err)) }
    finally{ btnUpload.disabled=false; btnUpload.textContent='Upload & Generate Credentials' }
  })

  if(copyCreds) copyCreds.addEventListener('click', ()=>{
    const u = outUser?.textContent||'', p = outPass?.textContent||'', l = outLink?.textContent||''
    navigator.clipboard.writeText(`username: ${u}\npassword: ${p}\nlink: ${l}`).then(()=> {
      copyCreds.animate([{ transform:'scale(1)' }, { transform:'scale(.96)' }, { transform:'scale(1)' }], { duration:280 })
      alert('Kredensial disalin')})
  })

  // Verify
  if(btnVerify) btnVerify.addEventListener('click', async ()=>{
    const username = dlUser?.value?.trim()||'', pass = dlPass?.value?.trim()||''
    if(!username || !pass) return alert('Isi username & password.')
    btnVerify.disabled = true
    try{
      const rec = await getRecordByUsername(username)
      if(!rec) return alert('Username tidak ditemukan.')
      const hash = await sha256(pass)
      if(hash !== rec.password_hash) return alert('Password salah.')
      let signed = null
      try { signed = await createSignedUrl(rec.storage_path, 300) } catch(e){ console.warn('signed failed', e) }
      if(fileNameEl) fileNameEl.textContent = rec.filename ?? rec.storage_path
      if(fileSizeEl) fileSizeEl.textContent = niceBytes(rec.size)
      if(fileTimeEl) fileTimeEl.textContent = rec.created_at ? new Date(rec.created_at).toLocaleString() : '-'
      if(dlInfo) dlInfo.classList.remove('hide')
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(rec.storage_path)}`
      const finalUrl = signed || publicUrl
      if(btnView) btnView.onclick = ()=> window.open(finalUrl, '_blank')
      if(btnDownload) btnDownload.onclick = async ()=> {
        try{ await forceDownloadUrl(finalUrl, rec.filename ?? 'download') } catch(e){ console.error(e); alert('Gagal unduh: '+(e.message||e)) }
      }
      // small glow on download button
      btnDownload.animate([{ boxShadow: '0 8px 20px rgba(110,144,255,0.12)' }, { boxShadow:'0 18px 40px rgba(110,144,255,0.18)' }], { duration:600, direction:'alternate', iterations:2 })
    }catch(err){ console.error(err); alert('Verifikasi gagal: '+(err.message||err)) } finally { btnVerify.disabled=false }
  })

  if(btnClear) btnClear.addEventListener('click', ()=> { if(dlUser) dlUser.value=''; if(dlPass) dlPass.value=''; if(dlInfo) dlInfo.classList.add('hide') })

  // Comments send (firebase provides window.sendComment)
  if(btnSend) btnSend.addEventListener('click', async ()=>{
    if(!window.sendComment) return alert('Komentar service belum siap')
    try{
      btnSend.disabled = true
      await window.sendComment({ name: cName.value || 'anon', message: cMsg.value || '' })
      cMsg.value = ''
      // tiny success animation
      btnSend.animate([{ transform:'translateY(0)' }, { transform:'translateY(-6px)' }, { transform:'translateY(0)' }], { duration:360 })
    }catch(e){ alert('Gagal kirim: '+(e.message||e)) } finally { btnSend.disabled = false }
  })

  // allow keyboard nav: left/right switch pages
  window.addEventListener('keydown', e=>{
    const order = ['page-download','page-upload','page-about']
    const cur = pages.findIndex(p=>p.classList.contains('active'))
    if(e.key === 'ArrowLeft') showPage(order[Math.max(0,cur-1)])
    if(e.key === 'ArrowRight') showPage(order[Math.min(order.length-1,cur+1)])
  })

  // small initial micro animation on nav
  document.querySelectorAll('.nav-btn').forEach((b,i)=> b.animate([{opacity:0, transform:'translateY(8px)'}, {opacity:1, transform:'translateY(0)'}], { duration: 420, delay: i*80, easing:'cubic-bezier(.2,.9,.3,1)' }))

}) // DOMContentLoaded end