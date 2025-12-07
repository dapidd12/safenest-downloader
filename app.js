// app.js — Safenest dengan Tampilan Upload yang Lebih Clean
// 🔥 HAPUS IMPORT, GUNAKAN GLOBAL SUPABASE

// ========== CONFIG ==========
const SUPABASE_URL = 'https://rjsifamddfdhnlvrrwbb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqc2lmYW1kZGZkaG5sdnJyd2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2ODM5NiwiZXhwIjoyMDc4MzQ0Mzk2fQ.RwHToh53bF3iqWLomtBQczrkErqjXRxprIhvT4RB-1k'
const BUCKET = 'piw-files'
const BASE_LOGIN_LINK = window.location.origin
// ============================

// 🔥 PERBAIKI: Gunakan window.supabase jika tersedia
let supabase

// 🔥 FUNGSI UNTUK CLEAN UP AUTH TOKENS
function cleanupAuthTokens() {
  try {
    console.log('🧹 Cleaning up auth tokens...');
    const authKeys = [
      'supabase.auth.token',
      'sb-rjsifamddfdhnlvrrwbb-auth-token',
      'supabase.auth.refresh-token',
      'supabase.auth.session'
    ];
    
    authKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`Removed auth token: ${key}`);
      }
    });
    
    // Also clean sessionStorage
    authKeys.forEach(key => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        console.log(`Removed session auth token: ${key}`);
      }
    });
    
    return true;
  } catch (error) {
    console.warn('Auth token cleanup failed:', error);
    return false;
  }
}

// 🔥 INISIALISASI SUPABASE DENGAN ERROR HANDLING
function initializeSupabase() {
  try {
    // Clean up old tokens first
    cleanupAuthTokens();
    
    // Cek apakah Supabase sudah di-load dari CDN
    if (window.supabase && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
          // 🔥 TAMBAHKAN AUTH CONFIG UNTUK MENGATASI TOKEN ISSUES
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storage: {
            getItem: (key) => {
              try {
                return localStorage.getItem(key);
              } catch (e) {
                console.warn('Error getting auth item:', e);
                return null;
              }
            },
            setItem: (key, value) => {
              try {
                localStorage.setItem(key, value);
              } catch (e) {
                console.warn('Error setting auth item:', e);
              }
            },
            removeItem: (key) => {
              try {
                localStorage.removeItem(key);
              } catch (e) {
                console.warn('Error removing auth item:', e);
              }
            }
          }
        }
      });
      
      console.log('✅ Supabase client created successfully');
      
      // 🔥 VERIFIKASI KONEKSI DENGAN QUERY SEDERHANA
      setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('settings')
            .select('key')
            .limit(1);
          
          if (error) {
            console.warn('Supabase connection test failed:', error.message);
          } else {
            console.log('✅ Supabase connection verified');
          }
        } catch (e) {
          console.warn('Supabase test query failed:', e.message);
        }
      }, 1000);
      
      return supabase;
    } else {
      throw new Error('Supabase library not found');
    }
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    
    // Fallback ke fungsi kosong untuk mencegah crash
    supabase = {
      auth: {
        getSession: () => {
          console.log('⚠️ Using fallback auth (Supabase not available)');
          return Promise.resolve({ 
            data: { session: null }, 
            error: null 
          });
        },
        signInWithPassword: () => Promise.reject(new Error('Supabase not available')),
        signOut: () => {
          cleanupAuthTokens();
          return Promise.resolve();
        }
      },
      storage: {
        from: () => ({
          upload: () => Promise.reject(new Error('Supabase not available')),
          createSignedUrl: () => Promise.reject(new Error('Supabase not available')),
          remove: () => Promise.reject(new Error('Supabase not available'))
        })
      },
      from: () => ({
        insert: () => ({ 
          select: () => ({ 
            single: () => Promise.reject(new Error('Supabase not available')) 
          }) 
        }),
        select: () => ({ 
          eq: () => ({ 
            single: () => Promise.reject(new Error('Supabase not available')) 
          }) 
        }),
        delete: () => ({ 
          eq: () => Promise.reject(new Error('Supabase not available')) 
        }),
        upsert: () => ({ 
          select: () => ({ 
            single: () => Promise.reject(new Error('Supabase not available')) 
          }) 
        })
      })
    };
    
    return supabase;
  }
}

// Initialize Supabase
supabase = initializeSupabase();

// ----------------- Global State -----------------
let updateCountdownInterval = null
let maintenanceCountdownInterval = null
let currentUpdateEndsAt = null

// ----------------- Optimized Helpers -----------------
const $ = id => document.getElementById(id)
const $$ = selector => document.querySelectorAll(selector)
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
const formatTime = ms => {
  if (ms <= 0) return '00:00:00'
  
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  
  if (days > 0) {
    return `${days}h ${hours.toString().padStart(2, '0')}j ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}d`
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
const log = (...a) => console.log('[safenest]',...a)

function escapeHtml(s=''){ 
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;') 
}

// ----------------- Cache System -----------------
const cache = {
  get: (key) => {
    try {
      const item = localStorage.getItem(`sn_${key}`)
      if (!item) return null
      const { value, expiry } = JSON.parse(item)
      if (expiry && Date.now() > expiry) {
        localStorage.removeItem(`sn_${key}`)
        return null
      }
      return value
    } catch {
      return null
    }
  },
  
  set: (key, value, ttl = 5 * 60 * 1000) => {
    try {
      const item = {
        value,
        expiry: ttl ? Date.now() + ttl : null
      }
      localStorage.setItem(`sn_${key}`, JSON.stringify(item))
    } catch (e) {
      console.warn('Cache set failed:', e)
    }
  },
  
  clear: (key) => {
    localStorage.removeItem(`sn_${key}`)
  }
}

// ----------------- Update Countdown System -----------------
async function getUpdateStatus() {
  const cacheKey = 'update_status'
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const setting = await getSetting('update_countdown')
  const status = {
    enabled: false,
    ends_at: null,
    message: 'Pembaruan sistem untuk pengalaman yang lebih baik!',
    show_banner: true
  }

  if (setting?.value) {
    status.enabled = setting.value.enabled || false
    status.ends_at = setting.value.ends_at || null
    status.message = setting.value.message || status.message
    status.show_banner = setting.value.show_banner !== false
  }

  cache.set(cacheKey, status, 30 * 1000)
  return status
}

async function upsertUpdateSettings(settings) {
  const payload = { 
    key: 'update_countdown',
    value: {
      ...settings,
      updated_at: new Date().toISOString()
    }
  }
  
  const { data, error } = await supabase
    .from('settings')
    .upsert([payload])
    .select()
    .single()

  if (error) throw error
  
  cache.clear('update_status')
  return data
}

function startUpdateCountdown(endsAt) {
  if (updateCountdownInterval) {
    clearInterval(updateCountdownInterval)
  }
  
  currentUpdateEndsAt = endsAt
  
  updateCountdownInterval = setInterval(() => {
    const now = new Date()
    const ends = new Date(endsAt)
    const diff = ends - now
    
    if (diff <= 0) {
      clearInterval(updateCountdownInterval)
      updateCountdownInterval = null
      hideUpdateBanner()
      cache.clear('update_status')
      return
    }
    
    // Update all countdown displays
    const countdownText = formatTime(diff)
    
    // Global banner
    const globalCountdown = $('globalUpdateCountdown')
    if (globalCountdown) globalCountdown.textContent = countdownText
    
    // Header badge
    const headerCountdown = $('headerUpdateCountdown')
    if (headerCountdown) headerCountdown.textContent = `Update: ${countdownText}`
    
    // Page badges
    const pageCountdowns = ['download', 'upload', 'about']
    pageCountdowns.forEach(page => {
      const element = $(`${page}UpdateCountdown`)
      if (element) element.textContent = countdownText
    })
    
    // Admin preview
    const adminPreview = $('preview-update-countdown')
    if (adminPreview) adminPreview.textContent = countdownText
    
  }, 1000)
}

function hideUpdateBanner() {
  const banner = $('updateCountdownBanner')
  if (banner) {
    banner.classList.add('hide')
  }
}

function showUpdateBanner() {
  const banner = $('updateCountdownBanner')
  if (banner) {
    banner.classList.remove('hide')
  }
}

async function initializeUpdateCountdown() {
  try {
    const updateStatus = await getUpdateStatus()
    
    if (updateStatus.enabled && updateStatus.ends_at) {
      const endsAt = new Date(updateStatus.ends_at)
      const now = new Date()
      
      if (endsAt > now) {
        // Show banner if enabled
        if (updateStatus.show_banner) {
          showUpdateBanner()
        }
        
        // Show header badge
        const headerBadge = $('headerUpdateBadge')
        if (headerBadge) headerBadge.classList.remove('hide')
        
        // Show page badges
        const pages = ['download', 'upload', 'about']
        pages.forEach(page => {
          const badge = $(`${page}UpdateBadge`)
          if (badge) badge.classList.remove('hide')
        })
        
        // Start countdown
        startUpdateCountdown(updateStatus.ends_at)
        
      } else {
        // Update has passed, disable it
        await upsertUpdateSettings({ enabled: false })
        cache.clear('update_status')
      }
    } else {
      hideUpdateBanner()
    }
  } catch (error) {
    console.warn('Failed to initialize update countdown:', error)
  }
}

// ----------------- Enhanced Maintenance System -----------------
async function getMaintenanceStatus() {
  const cacheKey = 'maintenance_status'
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const setting = await getSetting('maintenance')
  const status = {
    enabled: false,
    ends_at: null,
    message: 'Sistem dalam perbaikan. Terima kasih atas pengertiannya.'
  }

  if (setting?.value) {
    status.enabled = setting.value.enabled || false
    status.ends_at = setting.value.ends_at || null
    status.message = setting.value.message || status.message
  }

  cache.set(cacheKey, status, 30 * 1000)
  return status
}

function startMaintenanceCountdown(endsAt) {
  if (maintenanceCountdownInterval) {
    clearInterval(maintenanceCountdownInterval)
  }
  
  maintenanceCountdownInterval = setInterval(() => {
    const now = new Date()
    const ends = new Date(endsAt)
    const diff = ends - now
    
    if (diff <= 0) {
      clearInterval(maintenanceCountdownInterval)
      maintenanceCountdownInterval = null
      hideMaintenanceOverlay()
      cache.clear('maintenance_status')
      return
    }
    
    // Update maintenance countdown displays
    const countdownText = formatTime(diff)
    
    const modalCountdown = $('maintenance-modal-countdown')
    if (modalCountdown) modalCountdown.textContent = countdownText
    
    const adminPreview = $('preview-maintenance-countdown')
    if (adminPreview) adminPreview.textContent = countdownText
    
  }, 1000)
}

function showMaintenanceOverlay(message, endsAt = null) {
  const overlay = $('globalMaintenanceOverlay')
  const messageEl = $('maintenance-modal-message')
  const countdownEl = $('maintenance-modal-countdown')
  
  if (overlay && messageEl) {
    messageEl.textContent = message
    
    if (endsAt) {
      const diff = new Date(endsAt) - new Date()
      countdownEl.textContent = formatTime(diff)
      startMaintenanceCountdown(endsAt)
    } else {
      countdownEl.textContent = '--:--:--'
    }
    
    overlay.classList.remove('hide')
    setTimeout(() => overlay.classList.add('active'), 10)
  }
}

function hideMaintenanceOverlay() {
  const overlay = $('globalMaintenanceOverlay')
  if (overlay) {
    overlay.classList.remove('active')
    setTimeout(() => {
      overlay.classList.add('hide')
    }, 300)
  }
}

// ----------------- Supabase Helpers -----------------
async function uploadFileToStorage(file, destName){
  try {
    const { data, error } = await supabase.storage.from(BUCKET).upload(destName, file, {
      cacheControl: '3600',
      upsert: false
    })
    if (error) throw error
    return data.path
  } catch (error) {
    console.error('Upload file error:', error)
    throw error
  }
}

async function insertFileRecord({ filename, storage_path, username, password_hash, size, expires_at = null }){
  const payload = { 
    filename, 
    storage_path, 
    username, 
    password_hash, 
    size,
    expires_at: expires_at || null
  }
  
  const { data, error } = await supabase
    .from('files')
    .insert([payload])
    .select()
    .single()
  
  if (error) throw error
  return data
}

async function getRecordByUsername(username){
  const cacheKey = `file_${username}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  try {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // No data found
      }
      throw error
    }
    
    if (data) {
      // Check if file is expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        // File is expired, try to delete it
        try {
          await deleteFile(data)
          cache.clear(cacheKey)
          return null
        } catch (deleteError) {
          console.warn('Failed to delete expired file:', deleteError)
          return null
        }
      }
      cache.set(cacheKey, data, 2 * 60 * 1000)
    }
    return data
  } catch (error) {
    console.error('Get record error:', error)
    throw error
  }
}

async function createSignedUrl(path, expires=300){
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expires)
    if (error) throw error
    return data?.signedUrl
  } catch (error) {
    console.error('Create signed URL error:', error)
    throw error
  }
}

async function forceDownloadUrl(url, filename){
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const blob = await res.blob()
  
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename || 'download'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(a.href)
}

async function deleteFile(file){
  if(!file?.id || !file?.storage_path) throw new Error('Invalid file data')
  
  try {
    // Delete from storage first
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([file.storage_path])
    if (storageError) {
      console.warn('Storage deletion warning:', storageError)
      // Continue with DB deletion even if storage deletion fails
    }
    
    // Delete from database
    const { error: dbError } = await supabase.from('files').delete().eq('id', file.id)
    if (dbError) throw dbError
    
    // Clear relevant caches
    cache.clear(`file_${file.username}`)
    cache.clear('files_list')
    cache.clear('stats')
    
    return true
  } catch (error) {
    console.error('Delete file error:', error)
    throw error
  }
}

async function listFiles(){
  const cacheKey = 'files_list'
  const cached = cache.get(cacheKey)
  if (cached) return cached

  try {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) throw error
    
    // Filter out expired files
    const now = new Date()
    const validFiles = (data || []).filter(file => 
      !file.expires_at || new Date(file.expires_at) > now
    )
    
    cache.set(cacheKey, validFiles, 30 * 1000)
    return validFiles
  } catch (error) {
    console.error('List files error:', error)
    throw error
  }
}

async function recordDownload({ file_id = null, filename = null, username = null } = {}){
  try {
    await supabase.from('downloads').insert([{ 
      file_id, 
      filename, 
      username,
      downloaded_at: new Date().toISOString()
    }])
    cache.clear('stats')
  } catch(e) {
    console.warn('Download recording failed:', e)
  }
}

async function getSetting(key){
  const cacheKey = `setting_${key}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.warn('getSetting error:', error)
      return null
    }
    
    if (data) cache.set(cacheKey, data, 60 * 1000)
    return data
  } catch (error) {
    console.error('Get setting error:', error)
    return null
  }
}

async function upsertSetting(key, valueObj){
  const payload = { 
    key, 
    value: valueObj,
    updated_at: new Date().toISOString()
  }
  
  try {
    const { data, error } = await supabase
      .from('settings')
      .upsert([payload])
      .select()
      .single()

    if (error) throw error
    
    cache.clear(`setting_${key}`)
    if (key === 'maintenance') cache.clear('maintenance_status')
    if (key === 'update_countdown') cache.clear('update_status')
    
    return data
  } catch (error) {
    console.error('Upsert setting error:', error)
    throw error
  }
}

async function loadStats(){
  const cacheKey = 'stats'
  const cached = cache.get(cacheKey)
  if (cached) return cached

  try {
    const [upResult, dlResult, filesResult] = await Promise.all([
      supabase.from('files').select('*', { count: 'exact', head: true }),
      supabase.from('downloads').select('*', { count: 'exact', head: true }),
      supabase.from('files').select('id', { count: 'exact', head: true })
        .is('expires_at', null) // Only count non-expired files
        .or('expires_at.gt.' + new Date().toISOString())
    ])
    
    const stats = {
      uploads: upResult?.count ?? 0,
      downloads: dlResult?.count ?? 0,
      files: filesResult?.count ?? 0
    }
    
    cache.set(cacheKey, stats, 2 * 60 * 1000)
    return stats
  } catch(e) {
    console.warn('loadStats error:', e)
    return { uploads: 0, downloads: 0, files: 0 }
  }
}

// ----------------- Admin Session dengan Supabase Auth - DIPERBAIKI -----------------
async function isAdminSession(){ 
  try {
    // Cek apakah supabase tersedia
    if (!supabase || !supabase.auth) {
      console.warn('Supabase auth not available')
      return false
    }
    
    // 🔥 TAMBAHKAN ERROR HANDLING KHUSUS UNTUK TOKEN ISSUES
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.warn('Session check error:', error.message)
      
      // 🔥 JIKA ERROR KARENA TOKEN, CLEAN UP DAN RETURN FALSE
      if (error.message.includes('token') || error.message.includes('refresh')) {
        console.log('🔄 Cleaning up invalid tokens...');
        cleanupAuthTokens();
        return false;
      }
      
      return false
    }
    
    if (!session) {
      return false
    }
    
    // Cek metadata user langsung dari session (lebih sederhana)
    const user = session.user
    const userEmail = user.email
    
    // Daftar email admin yang diizinkan (bisa disesuaikan)
    const adminEmails = [
      'admin@safenest.dev',
      'aryapiw@safenest.dev',
      'dapid@safenest.dev'
      // Tambahkan email admin lain di sini
    ]
    
    return adminEmails.includes(userEmail)
    
  } catch (error) {
    console.warn('Admin session check failed:', error)
    
    // 🔥 CLEAN UP TOKENS JIKA ADA ERROR
    if (error.message && (
      error.message.includes('token') || 
      error.message.includes('refresh') ||
      error.message.includes('Auth')
    )) {
      cleanupAuthTokens();
    }
    
    return false
  }
}

async function setAdminSession(email, password) {
  try {
    // 🔥 CLEAN UP TOKENS SEBELUM LOGIN BARU
    cleanupAuthTokens();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (error) {
      throw error
    }
    
    // Verifikasi email termasuk dalam daftar admin
    const userEmail = data.user.email
    const adminEmails = [
      'admin@safenest.dev',
      'aryapiw@safenest.dev',
      'dapid@safenest.dev'
    ]
    
    if (!adminEmails.includes(userEmail)) {
      await supabase.auth.signOut()
      cleanupAuthTokens();
      throw new Error('Email tidak terdaftar sebagai admin')
    }
    
    cache.clear('stats')
    cache.clear('files_list')
    return true
  } catch (error) {
    console.error('Admin login failed:', error)
    
    // 🔥 CLEAN UP JIKA LOGIN GAGAL
    cleanupAuthTokens();
    throw error
  }
}

function clearAdminSession() {
  if (supabase && supabase.auth) {
    supabase.auth.signOut()
  }
  cleanupAuthTokens();
  cache.clear('stats')
  cache.clear('files_list')
}

// ----------------- Fixed Expiry System -----------------
function expiryToIso(selectVal){
  if(!selectVal || selectVal === 'never') return null
  
  const now = new Date()
  let expiryDate = new Date(now)
  
  switch(selectVal){
    case '2h':
      expiryDate.setHours(expiryDate.getHours() + 2)
      break
    case '1d':
      expiryDate.setDate(expiryDate.getDate() + 1)
      break
    case '5d':
      expiryDate.setDate(expiryDate.getDate() + 5)
      break
    case '1m':
      expiryDate.setMonth(expiryDate.getMonth() + 1)
      break
    default:
      return null
  }
  
  return expiryDate.toISOString()
}

// ----------------- Fixed Cleanup System - DIPERBAIKI -----------------
async function cleanExpiredFiles(){
  try {
    const now = new Date().toISOString()
    
    // Find expired files - QUERY YANG LEBIH AMAN
    const { data: expiredFiles, error } = await supabase
      .from('files')
      .select('*')
      .lt('expires_at', now)
      .not('expires_at', 'is', null)

    if (error) {
      console.warn('Cleanup query error:', error.message || error)
      return { cleaned: 0, total: 0, error: error.message }
    }

    if (!expiredFiles?.length) {
      return { cleaned: 0, total: 0 }
    }

    let cleanedCount = 0
    let totalExpired = expiredFiles.length

    for (const file of expiredFiles) {
      try {
        // Check if file has any downloads - QUERY TERPISAH YANG LEBIH AMAN
        const { data: downloads, error: downloadError } = await supabase
          .from('downloads')
          .select('id')
          .eq('file_id', file.id)
          .limit(1)

        if (downloadError) {
          console.warn(`Download check error for file ${file.id}:`, downloadError)
          continue
        }
        
        const downloadCount = downloads?.length || 0
        
        if (downloadCount === 0) {
          // File has never been downloaded, safe to delete
          await deleteFile(file)
          cleanedCount++
          log(`Deleted expired file: ${file.filename} (ID: ${file.id})`)
        } else {
          log(`Skipping expired file with downloads: ${file.filename} (Downloads: ${downloadCount})`)
        }
      } catch (e) {
        console.warn(`Error processing file ${file.id}:`, e.message || e)
      }
    }
    
    // Clear cache after cleanup
    if (cleanedCount > 0) {
      cache.clear('files_list')
      cache.clear('stats')
      log(`Cleanup completed: ${cleanedCount}/${totalExpired} files deleted`)
    }
    
    return { cleaned: cleanedCount, total: totalExpired }
    
  } catch (e) {
    console.warn('Cleanup system error:', e.message || e)
    return { cleaned: 0, total: 0, error: e.message }
  }
}

// ----------------- Enhanced File Verification -----------------
async function verifyFileAccess(fileRecord) {
  if (!fileRecord) return { valid: false, reason: 'File tidak ditemukan' }
  
  // Check if file is expired
  if (fileRecord.expires_at) {
    const expiryDate = new Date(fileRecord.expires_at)
    const now = new Date()
    
    if (expiryDate <= now) {
      // File is expired, try to delete it
      try {
        await deleteFile(fileRecord)
      } catch (deleteError) {
        console.warn('Failed to delete expired file:', deleteError)
      }
      return { valid: false, reason: 'File sudah kadaluarsa' }
    }
  }
  
  return { valid: true }
}

// ----------------- Enhanced Maintenance Check -----------------
async function checkMaintenanceForUpload() {
  try {
    const maintenance = await getMaintenanceStatus()
    
    if (maintenance.enabled) {
      showMaintenanceOverlay(maintenance.message, maintenance.ends_at)
      return true
    }
    return false
  } catch (error) {
    console.warn('Maintenance check failed:', error)
    return false
  }
}

// ----------------- UI Manager -----------------
class UIManager {
  constructor() {
    this.pages = Array.from($$('.page'))
    this.navButtons = Array.from($$('.nav-btn'))
    this.currentPage = 'page-download'
    this.init()
  }

  init() {
    this.setupNavigation()
    this.setupEventListeners()
    this.showPage('page-download')
    this.initializeAdminSettings()
    this.checkExistingSession()
  }

  async checkExistingSession() {
    try {
      const isAdmin = await isAdminSession()
      if (isAdmin && this.currentPage === 'page-admin') {
        this.loadAdminDashboard()
      }
    } catch (error) {
      console.warn('Session check error:', error)
    }
  }

  setupNavigation() {
    this.navButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const target = btn.dataset.target
        
        // Check maintenance before navigating to upload page
        if (target === 'page-upload') {
          const isMaintenance = await checkMaintenanceForUpload()
          if (isMaintenance) return
        }
        
        this.showPage(target)
        
        btn.animate([
          { transform: 'translateY(0)' },
          { transform: 'translateY(-8px)' },
          { transform: 'translateY(0)' }
        ], {
          duration: 360,
          easing: 'cubic-bezier(.2,.9,.3,1)'
        })
      })
    })

    window.addEventListener('keydown', async e => {
      if (e.altKey || e.ctrlKey) return
      
      const order = ['page-download', 'page-upload', 'page-about', 'page-admin']
      const currentIndex = order.indexOf(this.currentPage)
      
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        const target = order[currentIndex - 1]
        if (target === 'page-upload') {
          const isMaintenance = await checkMaintenanceForUpload()
          if (isMaintenance) return
        }
        this.showPage(target)
      } else if (e.key === 'ArrowRight' && currentIndex < order.length - 1) {
        const target = order[currentIndex + 1]
        if (target === 'page-upload') {
          const isMaintenance = await checkMaintenanceForUpload()
          if (isMaintenance) return
        }
        this.showPage(target)
      }
    })
  }

  async showPage(id) {
    if (id === 'page-admin') {
      const isAdmin = await isAdminSession()
      if (!isAdmin) {
        id = 'page-download'
        this.showMessage('cleanup-result', 'Anda harus login sebagai admin untuk mengakses dashboard.', 'error')
      }
    }

    this.currentPage = id
    
    this.pages.forEach(page => {
      page.classList.toggle('active', page.id === id)
    })

    this.navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === id)
    })

    this.animatePageEntrance(id)

    if (id === 'page-admin') {
      this.loadAdminDashboard()
    }
  }

  animatePageEntrance(pageId) {
    const page = $(pageId)
    if (!page) return

    const elements = page.querySelectorAll('.glass-card, .page-title, .filebox, input, textarea, .row, .comments-box')
    elements.forEach((el, i) => {
      el.classList.add('fade-in')
      el.style.animationDelay = `${i * 40}ms`
      setTimeout(() => el.style.animationDelay = '', 800)
    })
  }

  async loadAdminDashboard() {
    if (!(await isAdminSession())) return

    try {
      const stats = await loadStats()
      if ($('stat-uploads')) $('stat-uploads').textContent = stats.uploads
      if ($('stat-downloads')) $('stat-downloads').textContent = stats.downloads
      if ($('stat-files')) $('stat-files').textContent = stats.files

      await this.loadFilesList()
      await this.loadMaintenanceSettings()
      await this.loadUpdateSettings()

    } catch (e) {
      console.error('Admin dashboard error:', e)
    }
  }

  async loadFilesList() {
    try {
      const files = await listFiles()
      const filesListEl = $('files-list')
      const filesCountEl = $('files-count')
      
      if (!filesListEl) return

      filesListEl.innerHTML = ''
      
      if (filesCountEl) filesCountEl.textContent = files.length

      if (files.length === 0) {
        filesListEl.innerHTML = '<div class="muted text-center" style="padding: 40px;">Tidak ada file</div>'
        return
      }

      files.forEach(file => {
        const row = document.createElement('div')
        row.className = 'file-row'

        const meta = document.createElement('div')
        meta.className = 'file-meta'
        
        const expiresText = file.expires_at ? 
          ` • Expires: ${new Date(file.expires_at).toLocaleString()}` : 
          ''
        
        const isExpired = file.expires_at && new Date(file.expires_at) < new Date()
        if (isExpired) {
          row.classList.add('expired')
        }
        
        meta.innerHTML = `
          <div class="name ${isExpired ? 'expired-text' : ''}">${escapeHtml(file.filename || file.storage_path)}</div>
          <div class="sub">
            <span>${niceBytes(file.size || 0)}</span>
            <span>•</span>
            <span>${file.created_at ? new Date(file.created_at).toLocaleString() : '-'}</span>
            ${expiresText}
            ${isExpired ? '<span class="expired-badge">EXPIRED</span>' : ''}
          </div>
        `

        const actions = document.createElement('div')
        actions.className = 'file-actions'

        const btnView = document.createElement('button')
        btnView.className = `btn ghost small ${isExpired ? 'disabled' : ''}`
        btnView.innerHTML = '<i class="fa fa-eye"></i> View'
        btnView.disabled = isExpired
        btnView.onclick = async () => {
          if (isExpired) return
          
          try {
            const signed = await createSignedUrl(file.storage_path, 300)
            const url = signed || `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(file.storage_path)}`
            window.open(url, '_blank')
          } catch (e) {
            alert('Gagal membuka file: ' + e.message)
          }
        }

        const btnDel = document.createElement('button')
        btnDel.className = 'btn ghost small'
        btnDel.innerHTML = '<i class="fa fa-trash"></i> Hapus'
        btnDel.onclick = async () => {
          if (!confirm('Hapus file ini secara permanen?')) return
          try {
            await deleteFile(file)
            row.style.opacity = '0'
            setTimeout(() => row.remove(), 300)
          } catch (e) {
            alert('Gagal menghapus: ' + e.message)
          }
        }

        actions.appendChild(btnView)
        actions.appendChild(btnDel)
        row.appendChild(meta)
        row.appendChild(actions)
        filesListEl.appendChild(row)
      })

    } catch (e) {
      console.error('Files list error:', e)
      if ($('files-list')) {
        $('files-list').innerHTML = '<div class="muted text-center" style="padding: 20px;">Gagal memuat file</div>'
      }
    }
  }

  async loadMaintenanceSettings() {
    try {
      const maintenance = await getMaintenanceStatus()
      const toggle = $('maintenance-toggle')
      const daysInput = $('maintenance-days')
      const hoursInput = $('maintenance-hours')
      const endsInput = $('maintenance-ends')
      const messageInput = $('maintenance-message')

      if (toggle) toggle.checked = maintenance.enabled
      if (daysInput) daysInput.value = ''
      if (hoursInput) hoursInput.value = ''
      if (endsInput && maintenance.ends_at) {
        endsInput.value = new Date(maintenance.ends_at).toISOString().slice(0, 16)
      }
      if (messageInput) {
        messageInput.value = maintenance.message || ''
      }

      this.updateMaintenanceDisplay(maintenance)

    } catch (e) {
      console.error('Maintenance settings error:', e)
    }
  }

  async loadUpdateSettings() {
    try {
      const updateStatus = await getUpdateStatus()
      const daysInput = $('update-days')
      const hoursInput = $('update-hours')
      const minutesInput = $('update-minutes')
      const endsInput = $('update-ends')
      const messageInput = $('update-message')
      const bannerToggle = $('update-banner-toggle')

      if (daysInput) daysInput.value = ''
      if (hoursInput) hoursInput.value = ''
      if (minutesInput) minutesInput.value = ''
      if (endsInput && updateStatus.ends_at) {
        endsInput.value = new Date(updateStatus.ends_at).toISOString().slice(0, 16)
      }
      if (messageInput) {
        messageInput.value = updateStatus.message || ''
      }
      if (bannerToggle) {
        bannerToggle.checked = updateStatus.show_banner !== false
      }

      this.updateUpdateDisplay(updateStatus)

    } catch (e) {
      console.error('Update settings error:', e)
    }
  }

  updateMaintenanceDisplay(maintenance) {
    const msgEl = $('maintenance-msg')
    if (!msgEl) return

    if (maintenance.enabled && maintenance.ends_at) {
      const endsAt = new Date(maintenance.ends_at)
      const now = new Date()
      
      if (endsAt > now) {
        const diff = endsAt - now
        msgEl.innerHTML = `
          <div class="settings-message success">
            <i class="fa fa-check-circle"></i> Maintenance aktif - Selesai dalam: 
            <strong>${formatTime(diff)}</strong>
          </div>
        `
        startMaintenanceCountdown(maintenance.ends_at)
      } else {
        msgEl.innerHTML = '<div class="settings-message error">Maintenance sudah berakhir</div>'
      }
    } else if (maintenance.enabled) {
      msgEl.innerHTML = '<div class="settings-message success">Maintenance aktif (tanpa batas waktu)</div>'
    } else {
      msgEl.innerHTML = '<div class="settings-message">Maintenance tidak aktif</div>'
    }
  }

  updateUpdateDisplay(updateStatus) {
    const msgEl = $('update-settings-msg')
    if (!msgEl) return

    if (updateStatus.enabled && updateStatus.ends_at) {
      const endsAt = new Date(updateStatus.ends_at)
      const now = new Date()
      
      if (endsAt > now) {
        const diff = endsAt - now
        msgEl.innerHTML = `
          <div class="settings-message success">
            <i class="fa fa-check-circle"></i> Update countdown aktif - 
            Selesai dalam: <strong>${formatTime(diff)}</strong>
          </div>
        `
      } else {
        msgEl.innerHTML = '<div class="settings-message error">Update countdown sudah berakhir</div>'
      }
    } else {
      msgEl.innerHTML = '<div class="settings-message">Update countdown tidak aktif</div>'
    }
  }

  setupEventListeners() {
    // Upload handler
    if ($('btnUpload')) {
      $('btnUpload').addEventListener('click', this.handleUpload.bind(this))
    }

    // Verify handler
    if ($('btnVerify')) {
      $('btnVerify').addEventListener('click', this.handleVerify.bind(this))
    }

    // File input change handler untuk clean display
    if ($('fileInput')) {
      $('fileInput').addEventListener('change', this.handleFileSelect.bind(this));
    }

    // Copy credentials
    if ($('copyCreds')) {
      $('copyCreds').addEventListener('click', this.handleCopyCreds.bind(this))
    }

    // Clear form
    if ($('btnClear')) {
      $('btnClear').addEventListener('click', () => {
        if ($('dlUser')) $('dlUser').value = ''
        if ($('dlPass')) $('dlPass').value = ''
        if ($('dlInfo')) $('dlInfo').classList.add('hide')
      })
    }

    // Password toggle handler
    if ($('togglePassword')) {
      $('togglePassword').addEventListener('click', this.togglePasswordVisibility.bind(this));
    }

    // Refresh files
    if ($('refresh-files')) {
      $('refresh-files').addEventListener('click', () => {
        this.loadFilesList()
      })
    }

    // Cleanup files - DIPERBAIKI DENGAN ERROR HANDLING
    if ($('cleanup-files')) {
      $('cleanup-files').addEventListener('click', async () => {
        const btn = $('cleanup-files')
        const originalText = btn.innerHTML
        btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Cleaning...'
        btn.disabled = true
        
        try {
          const result = await cleanExpiredFiles()
          if (result.error) {
            this.showMessage('cleanup-result', `Gagal membersihkan: ${result.error}`, 'error')
          } else {
            const message = result.cleaned > 0 
              ? `Pembersihan selesai! ${result.cleaned}/${result.total} file expired dihapus.`
              : `Tidak ada file expired yang perlu dihapus. ${result.total} file expired ditemukan, tetapi sudah pernah didownload.`
            this.showMessage('cleanup-result', message, 'success')
          }
          this.loadFilesList()
          this.loadAdminDashboard()
        } catch (e) {
          this.showMessage('cleanup-result', 'Gagal membersihkan file: ' + (e.message || e), 'error')
        } finally {
          btn.innerHTML = originalText
          btn.disabled = false
        }
      })
    }

    // Clear cache
    if ($('clear-cache')) {
      $('clear-cache').addEventListener('click', () => {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('sn_'))
        keys.forEach(key => localStorage.removeItem(key))
        this.showMessage('cleanup-result', 'Cache berhasil dibersihkan!', 'success')
      })
    }

    // Maintenance settings
    if ($('save-maintenance-settings')) {
      $('save-maintenance-settings').addEventListener('click', this.handleSaveMaintenanceSettings.bind(this))
    }

    // Update settings
    if ($('save-update-settings')) {
      $('save-update-settings').addEventListener('click', this.handleSaveUpdateSettings.bind(this))
    }

    // Clear update
    if ($('clear-update')) {
      $('clear-update').addEventListener('click', this.handleClearUpdate.bind(this))
    }

    // Admin logout
    if ($('admin-logout')) {
      $('admin-logout').addEventListener('click', async () => {
        clearAdminSession()
        this.showMessage('cleanup-result', 'Logout admin berhasil', 'success')
        setTimeout(() => this.showPage('page-download'), 1000)
      })
    }

    // Comment system
    if ($('cSend')) {
      $('cSend').addEventListener('click', this.handleCommentSubmit.bind(this))
    }

    // Maintenance OK button
    const maintenanceOk = $('globalMaintenanceOverlay')?.querySelector('.maintenance-ok')
    if (maintenanceOk) {
      maintenanceOk.addEventListener('click', hideMaintenanceOverlay)
    }
  }

  // NEW METHOD: Toggle Password Visibility
  togglePasswordVisibility() {
    const passwordInput = $('dlPass');
    const toggleButton = $('togglePassword');
    const icon = toggleButton.querySelector('i');
    const text = toggleButton.querySelector('.toggle-text');
    
    if (!passwordInput || !toggleButton) return;

    // Add multiple animation classes
    toggleButton.classList.add('animating', 'pulse');
    
    // Toggle dengan delay untuk efek yang lebih smooth
    setTimeout(() => {
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'fa fa-eye';
        text.textContent = 'Hide';
        
        // Success state styling
        toggleButton.style.color = 'var(--success)';
        toggleButton.style.borderColor = 'var(--success)';
        toggleButton.style.background = 'rgba(16, 185, 129, 0.1)';
        
      } else {
        passwordInput.type = 'password';
        icon.className = 'fa fa-eye-slash';
        text.textContent = 'Show';
        
        // Reset to default
        toggleButton.style.color = '';
        toggleButton.style.borderColor = '';
        toggleButton.style.background = '';
      }
    }, 150);
    
    // Clean up animation classes
    setTimeout(() => {
      toggleButton.classList.remove('animating', 'pulse');
    }, 600);
    
    // Maintain focus for better UX
    setTimeout(() => {
      passwordInput.focus();
    }, 200);
  }

  // NEW METHOD: Handle file selection for clean display
  handleFileSelect(event) {
    const file = event.target.files[0];
    const filebox = $('fileInput').closest('.filebox');
    
    // Hapus display nama file sebelumnya jika ada
    const existingDisplay = filebox.querySelector('.file-name-display');
    if (existingDisplay) {
      existingDisplay.remove();
    }
    
    if (file) {
      // Tampilkan nama file yang dipilih
      const fileNameDisplay = document.createElement('div');
      fileNameDisplay.className = 'file-name-display';
      fileNameDisplay.innerHTML = `
        <i class="fa fa-check-circle"></i> 
        ${escapeHtml(file.name)} 
        <small>(${niceBytes(file.size)})</small>
      `;
      filebox.appendChild(fileNameDisplay);
      
      // Update style filebox untuk menunjukkan file dipilih
      filebox.style.borderColor = 'var(--accent1)';
      filebox.style.background = 'rgba(107, 142, 252, 0.05)';
    } else {
      // Reset style filebox jika tidak ada file
      filebox.style.borderColor = '';
      filebox.style.background = '';
    }
  }

  initializeAdminSettings() {
    // Maintenance settings toggle
    const maintenanceToggle = $('maintenance-toggle')
    const maintenanceSettings = $('maintenance-settings')
    
    if (maintenanceToggle && maintenanceSettings) {
      maintenanceToggle.addEventListener('change', () => {
        maintenanceSettings.style.display = maintenanceToggle.checked ? 'block' : 'none'
      })
      maintenanceSettings.style.display = maintenanceToggle.checked ? 'block' : 'none'
    }

    // Real-time preview for maintenance message
    const maintenanceMessage = $('maintenance-message')
    const maintenancePreview = $('preview-maintenance-message')
    
    if (maintenanceMessage && maintenancePreview) {
      maintenanceMessage.addEventListener('input', () => {
        maintenancePreview.textContent = maintenanceMessage.value || 'Sistem dalam perbaikan. Terima kasih atas pengertiannya.'
      })
    }

    // Real-time preview for update message
    const updateMessage = $('update-message')
    const updatePreview = $('preview-update-message')
    
    if (updateMessage && updatePreview) {
      updateMessage.addEventListener('input', () => {
        updatePreview.textContent = updateMessage.value || 'Pembaruan sistem untuk pengalaman yang lebih baik!'
      })
    }
  }

  async handleUpload() {
    // Check maintenance before upload
    const isMaintenance = await checkMaintenanceForUpload()
    if (isMaintenance) return

    const btnUpload = $('btnUpload')
    const fileInput = $('fileInput')
    const file = fileInput?.files?.[0]

    if (!file) {
      this.showMessage('cleanup-result', 'Pilih file terlebih dahulu.', 'error')
      return
    }

    btnUpload.disabled = true
    btnUpload.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Uploading...'

    try {
      const dest = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      const storage_path = await uploadFileToStorage(file, dest)

      const expirySelect = $('expireSelect')
      const expiresIso = expirySelect ? expiryToIso(expirySelect.value) : null

      const username = 'sn-' + rand(6)
      const password = 'sn-' + rand(10)
      const hash = await sha256(password)

      const record = await insertFileRecord({
        filename: file.name,
        storage_path,
        username,
        password_hash: hash,
        size: file.size,
        expires_at: expiresIso
      })

      // Show credentials - PERBAIKAN: Pastikan elemen creds ditampilkan
      if ($('outUser')) $('outUser').textContent = username
      if ($('outPass')) $('outPass').textContent = password
      if ($('outLink')) $('outLink').textContent = `${BASE_LOGIN_LINK}/?user=${username}`
      if ($('outExpire')) {
        $('outExpire').textContent = expiresIso ? new Date(expiresIso).toLocaleString() : 'Tidak expired'
      }
      
      // PERBAIKAN PENTING: Tampilkan section kredensial
      const credsSection = $('creds')
      if (credsSection) {
        credsSection.classList.remove('hide')
        // Scroll ke section kredensial untuk memastikan user melihatnya
        credsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }

      this.showMessage('cleanup-result', 'Upload berhasil! Simpan kredensial Anda - password hanya ditampilkan sekali.', 'success')

      // Reset form dan file display
      fileInput.value = ''
      const filebox = $('fileInput').closest('.filebox');
      const fileNameDisplay = filebox.querySelector('.file-name-display');
      if (fileNameDisplay) {
        fileNameDisplay.remove();
      }
      filebox.style.borderColor = '';
      filebox.style.background = '';

      // Cleanup expired files in background
      cleanExpiredFiles().catch(() => {})

    } catch (err) {
      console.error('Upload error:', err)
      this.showMessage('cleanup-result', 'Upload gagal: ' + (err.message || err), 'error')
    } finally {
      btnUpload.disabled = false
      btnUpload.innerHTML = '<i class="fa fa-upload"></i> Upload & Generate Credentials'
    }
  }

  async handleVerify() {
    const username = ($('dlUser')?.value || '').trim()
    const password = ($('dlPass')?.value || '').trim()

    if (!username || !password) {
      this.showMessage('cleanup-result', 'Harap isi username dan password.', 'error')
      return
    }

    // Admin login dengan Supabase Auth
    if (username.includes('@')) {
      // Assume this is an email login attempt for admin
      try {
        await setAdminSession(username, password)
        this.showMessage('cleanup-result', 'Admin login berhasil - membuka dashboard', 'success')
        setTimeout(() => this.showPage('page-admin'), 1000)
        return
      } catch (err) {
        this.showMessage('cleanup-result', 'Login admin gagal: ' + err.message, 'error')
        return
      }
    }

    try {
      const record = await getRecordByUsername(username)
      
      const verification = await verifyFileAccess(record)
      if (!verification.valid) {
        this.showMessage('cleanup-result', verification.reason, 'error')
        return
      }

      const hash = await sha256(password)
      if (hash !== record.password_hash) {
        this.showMessage('cleanup-result', 'Password salah.', 'error')
        return
      }

      // Get signed URL
      let signedUrl = null
      try {
        signedUrl = await createSignedUrl(record.storage_path, 300)
      } catch (e) {
        console.warn('Signed URL failed:', e)
      }

      // Update UI
      if ($('fileName')) $('fileName').textContent = record.filename || record.storage_path
      if ($('fileSize')) $('fileSize').textContent = niceBytes(record.size)
      if ($('fileTime')) $('fileTime').textContent = record.created_at ? 
        new Date(record.created_at).toLocaleString() : '-'
      if ($('dlInfo')) $('dlInfo').classList.remove('hide')

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(record.storage_path)}`
      const finalUrl = signedUrl || publicUrl

      // Setup download handler
      if ($('btnDownload')) {
        $('btnDownload').onclick = async () => {
          try {
            await forceDownloadUrl(finalUrl, record.filename || 'download')
            await recordDownload({
              file_id: record.id,
              filename: record.filename,
              username: record.username
            })
            this.showMessage('cleanup-result', 'Download berhasil!', 'success')
          } catch (e) {
            console.error('Download error:', e)
            this.showMessage('cleanup-result', 'Gagal mengunduh: ' + e.message, 'error')
          }
        }
      }

      // Setup view handler
      if ($('btnView')) {
        $('btnView').onclick = () => window.open(finalUrl, '_blank')
      }

    } catch (err) {
      console.error('Verification error:', err)
      if (err.message.includes('PGRST116')) {
        this.showMessage('cleanup-result', 'Username tidak ditemukan.', 'error')
      } else {
        this.showMessage('cleanup-result', 'Verifikasi gagal: ' + (err.message || err), 'error')
      }
    }
  }

  handleCopyCreds() {
    const username = $('outUser')?.textContent || ''
    const password = $('outPass')?.textContent || ''
    const link = $('outLink')?.textContent || ''
    const expiry = $('outExpire')?.textContent || 'Tidak expired'

    const text = `SAFENEST CREDENTIALS\n====================\nUsername: ${username}\nPassword: ${password}\nLink: ${link}\nExpired: ${expiry}\n====================\nSimpan informasi ini dengan aman!`

    navigator.clipboard.writeText(text).then(() => {
      $('copyCreds').animate([
        { transform: 'scale(1)' },
        { transform: 'scale(0.95)' },
        { transform: 'scale(1)' }
      ], { duration: 200 })
      
      this.showMessage('cleanup-result', 'Kredensial berhasil disalin ke clipboard!', 'success')
    }).catch(() => {
      this.showMessage('cleanup-result', 'Gagal menyalin kredensial.', 'error')
    })
  }

  async handleSaveMaintenanceSettings() {
    const toggle = $('maintenance-toggle')
    const daysInput = $('maintenance-days')
    const hoursInput = $('maintenance-hours')
    const endsInput = $('maintenance-ends')
    const messageInput = $('maintenance-message')

    const enabled = toggle?.checked || false
    let endsAt = null

    if (enabled) {
      if (endsInput?.value) {
        endsAt = new Date(endsInput.value).toISOString()
      } else {
        const days = parseInt(daysInput?.value || '0')
        const hours = parseInt(hoursInput?.value || '0')
        const totalMs = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000)
        
        if (totalMs > 0) {
          endsAt = new Date(Date.now() + totalMs).toISOString()
        }
      }
    }

    const message = messageInput?.value || 'Sistem dalam perbaikan. Terima kasih atas pengertiannya.'

    try {
      await upsertSetting('maintenance', {
        enabled,
        ends_at: endsAt,
        message,
        updated_by: 'admin'
      })

      this.showMessage('maintenance-msg', 'Pengaturan maintenance berhasil disimpan!', 'success')
      
      const maintenance = await getMaintenanceStatus()
      this.updateMaintenanceDisplay(maintenance)

    } catch (e) {
      this.showMessage('maintenance-msg', 'Gagal menyimpan pengaturan: ' + e.message, 'error')
    }
  }

  async handleSaveUpdateSettings() {
    const daysInput = $('update-days')
    const hoursInput = $('update-hours')
    const minutesInput = $('update-minutes')
    const endsInput = $('update-ends')
    const messageInput = $('update-message')
    const bannerToggle = $('update-banner-toggle')

    let endsAt = null

    if (endsInput?.value) {
      endsAt = new Date(endsInput.value).toISOString()
    } else {
      const days = parseInt(daysInput?.value || '0')
      const hours = parseInt(hoursInput?.value || '0')
      const minutes = parseInt(minutesInput?.value || '0')
      const totalMs = (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000)
      
      if (totalMs > 0) {
        endsAt = new Date(Date.now() + totalMs).toISOString()
      }
    }

    if (!endsAt) {
      this.showMessage('update-settings-msg', 'Harap tentukan waktu update!', 'error')
      return
    }

    const message = messageInput?.value || 'Pembaruan sistem untuk pengalaman yang lebih baik!'
    const showBanner = bannerToggle?.checked !== false

    try {
      await upsertUpdateSettings({
        enabled: true,
        ends_at: endsAt,
        message,
        show_banner: showBanner
      })

      this.showMessage('update-settings-msg', 'Update countdown berhasil diatur!', 'success')
      
      await initializeUpdateCountdown()
      
      const updateStatus = await getUpdateStatus()
      this.updateUpdateDisplay(updateStatus)

    } catch (e) {
      this.showMessage('update-settings-msg', 'Gagal menyimpan pengaturan: ' + e.message, 'error')
    }
  }

  async handleClearUpdate() {
    try {
      await upsertUpdateSettings({
        enabled: false,
        ends_at: null,
        message: 'Pembaruan sistem untuk pengalaman yang lebih baik!',
        show_banner: true
      })

      this.showMessage('update-settings-msg', 'Update countdown berhasil dihapus!', 'success')
      
      if (updateCountdownInterval) {
        clearInterval(updateCountdownInterval)
        updateCountdownInterval = null
      }
      
      hideUpdateBanner()
      
      const headerBadge = $('headerUpdateBadge')
      if (headerBadge) headerBadge.classList.add('hide')
      
      const pages = ['download', 'upload', 'about']
      pages.forEach(page => {
        const badge = $(`${page}UpdateBadge`)
        if (badge) badge.classList.add('hide')
      })
      
      const updateStatus = await getUpdateStatus()
      this.updateUpdateDisplay(updateStatus)

    } catch (e) {
      this.showMessage('update-settings-msg', 'Gagal menghapus countdown: ' + e.message, 'error')
    }
  }

  async handleCommentSubmit() {
    const name = ($('cName')?.value || '').trim()
    const message = ($('cMsg')?.value || '').trim()

    if (!message) {
      this.showMessage('cleanup-result', 'Tulis komentar terlebih dahulu.', 'error')
      return
    }

    try {
      await window.sendComment({
        name: name || 'anon',
        message: message
      })

      if ($('cMsg')) $('cMsg').value = ''
      if ($('cName')) $('cName').value = ''

      const btn = $('cSend')
      const originalText = btn.innerHTML
      btn.innerHTML = '<i class="fa fa-check"></i> Terkirim!'
      btn.disabled = true
      
      setTimeout(() => {
        btn.innerHTML = originalText
        btn.disabled = false
      }, 2000)

    } catch (e) {
      this.showMessage('cleanup-result', 'Gagal mengirim komentar: ' + e.message, 'error')
    }
  }

  showMessage(elementId, message, type = 'info') {
    const element = $(elementId)
    if (!element) return

    element.innerHTML = message
    element.className = `settings-message ${type}`
    
    if (type === 'success') {
      setTimeout(() => {
        element.innerHTML = ''
        element.className = 'settings-message'
      }, 5000)
    }
  }
}

// ----------------- Initialization -----------------
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Safenest initializing...')
  
  // Cek Supabase availability
  if (supabase) {
    console.log('✅ Supabase ready')
  } else {
    console.warn('⚠️ Supabase not available, some features may not work')
    // Don't show alert on initial load
  }
  
  const uiManager = new UIManager()

  initializeUpdateCountdown()

  // Background cleanup dengan error handling
  setInterval(async () => {
    try {
      await cleanExpiredFiles()
    } catch (e) {
      console.warn('Background cleanup failed:', e.message || e)
    }
  }, 2 * 60 * 1000)

  // Initial cleanup dengan error handling
  setTimeout(() => {
    cleanExpiredFiles().catch(e => {
      console.warn('Initial cleanup failed:', e.message || e)
    })
  }, 3000);
  
  $$('.nav-btn').forEach((btn, i) => {
    btn.animate([
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration: 420,
      delay: i * 80,
      easing: 'cubic-bezier(.2,.9,.3,1)'
    })
  })

  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = $('globalLoader')
      if (loader) {
        loader.style.opacity = '0'
        setTimeout(() => loader.remove(), 300)
      }
    }, 1000)
  })
})

window.hideUpdateBanner = hideUpdateBanner
window.checkMaintenanceForUpload = checkMaintenanceForUpload
window.supabase = supabase // Ekspos supabase untuk debugging
window.cleanupAuthTokens = cleanupAuthTokens // 🔥 Ekspos fungsi cleanup untuk debugging