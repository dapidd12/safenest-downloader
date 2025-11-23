// app.js — Safenest dengan Tampilan Upload yang Lebih Clean
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// ========== CONFIG ==========
const SUPABASE_URL = 'https://rjsifamddfdhnlvrrwbb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqc2lmYW1kZGZkaG5sdnJyd2JiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc2ODM5NiwiZXhwIjoyMDc4MzQ0Mzk2fQ.RwHToh53bF3iqWLomtBQczrkErqjXRxprIhvT4RB-1k'
const BUCKET = 'piw-files'
const BASE_LOGIN_LINK = window.location.origin
// ============================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ----------------- Global State -----------------
let updateCountdownInterval = null
let maintenanceCountdownInterval = null
let currentUpdateEndsAt = null
let currentUserSession = null
let hasShownAdminWelcome = false

// ----------------- Anti-Inspect Protection -----------------
(function() {
    // Disable right click
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });

    // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    document.addEventListener('keydown', function(e) {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.key === 'u') ||
            (e.ctrlKey && e.key === 'U')
        ) {
            e.preventDefault();
            return false;
        }
    });

    // Prevent text selection on sensitive elements
    const sensitiveSelectors = ['input[type="password"]', '.cred-value', '.filebox-text'];
    sensitiveSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.style.userSelect = 'none';
            el.style.webkitUserSelect = 'none';
        });
    });
})();

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

// ----------------- Changelog System -----------------
async function getChangelog() {
  const cacheKey = 'changelog'
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const setting = await getSetting('changelog')
  const changelog = {
    enabled: false,
    title: 'Pembaruan Terbaru',
    content: 'Tidak ada pembaruan untuk saat ini.',
    version: '1.0.0',
    show_on_startup: true
  }

  if (setting?.value) {
    changelog.enabled = setting.value.enabled || false
    changelog.title = setting.value.title || changelog.title
    changelog.content = setting.value.content || changelog.content
    changelog.version = setting.value.version || changelog.version
    changelog.show_on_startup = setting.value.show_on_startup !== false
  }

  cache.set(cacheKey, changelog, 30 * 1000)
  return changelog
}

async function upsertChangelog(settings) {
  const payload = { 
    key: 'changelog',
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
  
  cache.clear('changelog')
  return data
}

function showChangelog() {
  const overlay = $('changelogOverlay')
  if (overlay) {
    overlay.classList.remove('hide')
    setTimeout(() => overlay.classList.add('active'), 10)
  }
}

function hideChangelog() {
  const overlay = $('changelogOverlay')
  if (overlay) {
    overlay.classList.remove('active')
    setTimeout(() => {
      overlay.classList.add('hide')
    }, 300)
  }
}

async function initializeChangelog() {
  try {
    const changelog = await getChangelog()
    const lastSeenVersion = localStorage.getItem('sn_last_seen_version')
    
    // FIXED: Show changelog only if enabled, show_on_startup is true, and version is different
    if (changelog.enabled && changelog.show_on_startup) {
      if (changelog.version !== lastSeenVersion) {
        // Update UI elements
        if ($('changelogTitle')) $('changelogTitle').textContent = changelog.title
        if ($('changelogContent')) $('changelogContent').innerHTML = changelog.content.replace(/\n/g, '<br>')
        if ($('changelogVersion')) $('changelogVersion').textContent = `v${changelog.version}`
        
        // Show changelog after a short delay
        setTimeout(() => {
          showChangelog()
          localStorage.setItem('sn_last_seen_version', changelog.version)
        }, 1500)
      }
    }
  } catch (error) {
    console.warn('Failed to initialize changelog:', error)
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
      // Auto-disable update countdown when time's up
      upsertUpdateSettings({ 
        enabled: false,
        ends_at: null,
        message: 'Pembaruan sistem untuk pengalaman yang lebih baik!',
        show_banner: true
      }).catch(console.error)
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
        // Update has passed, disable it automatically
        await upsertUpdateSettings({ 
          enabled: false,
          ends_at: null,
          message: updateStatus.message,
          show_banner: updateStatus.show_banner
        })
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
      // Auto-disable maintenance when time's up
      upsertSetting('maintenance', {
        enabled: false,
        ends_at: null,
        message: 'Sistem dalam perbaikan. Terima kasih atas pengertiannya.',
        updated_by: 'system'
      }).catch(console.error)
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

// ----------------- User Dashboard System -----------------
function setUserSession(username, fileRecord) {
  const session = {
    username,
    fileRecord,
    created: Date.now(),
    expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  }
  localStorage.setItem('sn_user_session', JSON.stringify(session))
  currentUserSession = session
}

function getUserSession() {
  if (currentUserSession) return currentUserSession
  
  const session = localStorage.getItem('sn_user_session')
  if (!session) return null
  
  try {
    const parsed = JSON.parse(session)
    if (parsed.expiry && Date.now() > parsed.expiry) {
      localStorage.removeItem('sn_user_session')
      currentUserSession = null
      return null
    }
    currentUserSession = parsed
    return parsed
  } catch {
    localStorage.removeItem('sn_user_session')
    currentUserSession = null
    return null
  }
}

function clearUserSession() {
  localStorage.removeItem('sn_user_session')
  currentUserSession = null
}

// ----------------- Supabase Auth System -----------------
async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

async function getCurrentAdmin() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

function setAdminSession(session) {
  if (session) {
    localStorage.setItem('sn_admin_session', JSON.stringify({
      access_token: session.access_token,
      user: session.user,
      expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }))
    
    // Reset welcome flag when new admin session is created
    hasShownAdminWelcome = false
  } else {
    localStorage.removeItem('sn_admin_session')
    cache.clear('stats')
    cache.clear('files_list')
    hasShownAdminWelcome = false
  }
}

function isAdminSession() {
  const session = localStorage.getItem('sn_admin_session')
  if (!session) return false
  
  try {
    const { expiry } = JSON.parse(session)
    if (expiry && Date.now() > expiry) {
      localStorage.removeItem('sn_admin_session')
      return false
    }
    return true
  } catch {
    localStorage.removeItem('sn_admin_session')
    return false
  }
}

function showAdminWelcome() {
  // Only show if we haven't shown it yet in this session
  if (!hasShownAdminWelcome) {
    const welcomePopup = $('adminWelcomePopup')
    if (welcomePopup) {
      welcomePopup.classList.remove('hide')
      setTimeout(() => welcomePopup.classList.add('active'), 10)
      hasShownAdminWelcome = true
    }
  }
}

function hideAdminWelcome() {
  const welcomePopup = $('adminWelcomePopup')
  if (welcomePopup) {
    welcomePopup.classList.remove('active')
    setTimeout(() => welcomePopup.classList.add('hide'), 300)
  }
}

async function adminLogout() {
  const { error } = await supabase.auth.signOut()
  if (error) console.warn('Logout error:', error)
  
  setAdminSession(null)
}

// ----------------- Supabase Helpers -----------------
async function uploadFileToStorage(file, destName){
  const { data, error } = await supabase.storage.from(BUCKET).upload(destName, file, {
    cacheControl: '3600',
    upsert: false
  })
  if (error) throw error
  return data.path
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
}

async function createSignedUrl(path, expires=300){
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expires)
  if (error) throw error
  return data?.signedUrl
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
}

async function listFiles(){
  const cacheKey = 'files_list'
  const cached = cache.get(cacheKey)
  if (cached) return cached

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
}

async function upsertSetting(key, valueObj){
  const payload = { 
    key, 
    value: valueObj,
    updated_at: new Date().toISOString()
  }
  
  const { data, error } = await supabase
    .from('settings')
    .upsert([payload])
    .select()
    .single()

  if (error) throw error
  
  cache.clear(`setting_${key}`)
  if (key === 'maintenance') cache.clear('maintenance_status')
  if (key === 'update_countdown') cache.clear('update_status')
  if (key === 'changelog') cache.clear('changelog')
  
  return data
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

// ----------------- Fixed Cleanup System -----------------
async function cleanExpiredFiles(){
  try {
    const now = new Date().toISOString()
    
    // Find expired files
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
        // Check if file has any downloads
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

// ----------------- Multi Upload System -----------------
function handleMultiFileSelect(event) {
  const files = Array.from(event.target.files)
  const filebox = $('fileInput').closest('.filebox')
  
  // Hapus display nama file sebelumnya jika ada
  const existingDisplay = filebox.querySelector('.file-name-display')
  if (existingDisplay) {
    existingDisplay.remove()
  }
  
  if (files.length > 0) {
    // Tampilkan informasi file yang dipilih
    const fileNameDisplay = document.createElement('div')
    fileNameDisplay.className = 'file-name-display'
    
    if (files.length === 1) {
      const file = files[0]
      fileNameDisplay.innerHTML = `
        <div class="file-name-content">
          <i class="fa fa-check-circle"></i> 
          ${escapeHtml(file.name)} 
          <span class="file-size">(${niceBytes(file.size)})</span>
        </div>
      `
    } else {
      const totalSize = files.reduce((acc, file) => acc + file.size, 0)
      fileNameDisplay.innerHTML = `
        <div class="file-name-content">
          <i class="fa fa-check-circle"></i> 
          ${files.length} file dipilih
          <span class="file-size">(${niceBytes(totalSize)} total)</span>
        </div>
        <div class="file-list-preview">
          ${files.slice(0, 3).map(file => 
            `<div class="file-preview-item">
              <i class="fa fa-file"></i> ${escapeHtml(file.name)} (${niceBytes(file.size)})
            </div>`
          ).join('')}
          ${files.length > 3 ? `<div class="file-preview-more">+ ${files.length - 3} file lainnya</div>` : ''}
        </div>
      `
    }
    
    filebox.appendChild(fileNameDisplay)
    
    // Update style filebox untuk menunjukkan file dipilih
    filebox.style.borderColor = 'var(--accent1)'
    filebox.style.background = 'rgba(107, 142, 252, 0.05)'
  } else {
    // Reset style filebox jika tidak ada file
    filebox.style.borderColor = ''
    filebox.style.background = ''
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

  async init() {
    await this.checkAdminSession()
    this.setupNavigation()
    this.setupEventListeners()
    this.showPage('page-download')
    this.initializeAdminSettings()
    this.checkUserSession()
  }

  async checkAdminSession() {
    try {
      const session = await getCurrentAdmin()
      if (session) {
        setAdminSession(session)
      }
    } catch (error) {
      console.warn('Admin session check failed:', error)
    }
  }

  checkUserSession() {
    const userSession = getUserSession()
    if (userSession) {
      this.showUserDashboard(userSession.fileRecord, userSession.username)
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

  showPage(id) {
    if (id === 'page-admin' && !isAdminSession()) {
      id = 'page-download'
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
      // FIXED: Show admin welcome only when navigating to admin page
      if (isAdminSession() && !hasShownAdminWelcome) {
        setTimeout(() => {
          showAdminWelcome()
        }, 500)
      }
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
    if (!isAdminSession()) return

    try {
      const stats = await loadStats()
      if ($('stat-uploads')) $('stat-uploads').textContent = stats.uploads
      if ($('stat-downloads')) $('stat-downloads').textContent = stats.downloads
      if ($('stat-files')) $('stat-files').textContent = stats.files

      await this.loadFilesList()
      await this.loadMaintenanceSettings()
      await this.loadUpdateSettings()
      await this.loadChangelogSettings()

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

  async loadChangelogSettings() {
    try {
      const changelog = await getChangelog()
      const toggle = $('changelog-toggle')
      const titleInput = $('changelog-title')
      const contentInput = $('changelog-content')
      const versionInput = $('changelog-version')
      const startupToggle = $('changelog-startup-toggle')

      if (toggle) toggle.checked = changelog.enabled
      if (titleInput) titleInput.value = changelog.title || ''
      if (contentInput) contentInput.value = changelog.content || ''
      if (versionInput) versionInput.value = changelog.version || ''
      if (startupToggle) startupToggle.checked = changelog.show_on_startup !== false

      this.updateChangelogDisplay(changelog)

    } catch (e) {
      console.error('Changelog settings error:', e)
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

  updateChangelogDisplay(changelog) {
    const msgEl = $('changelog-msg')
    if (!msgEl) return

    if (changelog.enabled) {
      msgEl.innerHTML = `
        <div class="settings-message success">
          <i class="fa fa-check-circle"></i> Changelog aktif - 
          Versi: <strong>${changelog.version}</strong>
        </div>
      `
    } else {
      msgEl.innerHTML = '<div class="settings-message">Changelog tidak aktif</div>'
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

    // File input change handler untuk multi upload
    if ($('fileInput')) {
      $('fileInput').addEventListener('change', this.handleMultiFileSelect.bind(this))
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
        if ($('userDashboard')) $('userDashboard').classList.add('hide')
      })
    }

    // Refresh files
    if ($('refresh-files')) {
      $('refresh-files').addEventListener('click', () => {
        this.loadFilesList()
      })
    }

    // Cleanup files
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

    // Changelog settings
    if ($('save-changelog-settings')) {
      $('save-changelog-settings').addEventListener('click', this.handleSaveChangelogSettings.bind(this))
    }

    // Clear update
    if ($('clear-update')) {
      $('clear-update').addEventListener('click', this.handleClearUpdate.bind(this))
    }

    // Admin logout
    if ($('admin-logout')) {
      $('admin-logout').addEventListener('click', async () => {
        await adminLogout()
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

    // Changelog OK button
    const changelogOk = $('changelogOverlay')?.querySelector('.changelog-ok')
    if (changelogOk) {
      changelogOk.addEventListener('click', hideChangelog)
    }

    // Admin welcome OK button
    const adminWelcomeOk = $('adminWelcomePopup')?.querySelector('.admin-welcome-ok')
    if (adminWelcomeOk) {
      adminWelcomeOk.addEventListener('click', hideAdminWelcome)
    }

    // User dashboard actions
    if ($('userLogout')) {
      $('userLogout').addEventListener('click', this.handleUserLogout.bind(this))
    }

    if ($('userDeleteFile')) {
      $('userDeleteFile').addEventListener('click', this.handleUserDeleteFile.bind(this))
    }

    if ($('userRenameFile')) {
      $('userRenameFile').addEventListener('click', this.handleUserRenameFile.bind(this))
    }

    // Drag and drop events
    this.setupDragAndDrop()
  }

  setupDragAndDrop() {
    const filebox = $('fileInput')?.closest('.filebox')
    if (!filebox) return

    filebox.addEventListener('dragover', (e) => {
      e.preventDefault()
      filebox.style.borderColor = 'var(--accent1)'
      filebox.style.background = 'rgba(107, 142, 252, 0.1)'
    })

    filebox.addEventListener('dragleave', (e) => {
      e.preventDefault()
      filebox.style.borderColor = ''
      filebox.style.background = ''
    })

    filebox.addEventListener('drop', (e) => {
      e.preventDefault()
      filebox.style.borderColor = 'var(--accent1)'
      filebox.style.background = 'rgba(107, 142, 252, 0.05)'
      
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        const fileInput = $('fileInput')
        const dataTransfer = new DataTransfer()
        files.forEach(file => dataTransfer.items.add(file))
        fileInput.files = dataTransfer.files
        this.handleMultiFileSelect({ target: fileInput })
      }
    })
  }

  handleMultiFileSelect(event) {
    handleMultiFileSelect(event)
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

    // Changelog settings toggle
    const changelogToggle = $('changelog-toggle')
    const changelogSettings = $('changelog-settings')
    
    if (changelogToggle && changelogSettings) {
      changelogToggle.addEventListener('change', () => {
        changelogSettings.style.display = changelogToggle.checked ? 'block' : 'none'
      })
      changelogSettings.style.display = changelogToggle.checked ? 'block' : 'none'
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

    // Real-time preview for changelog
    const changelogTitle = $('changelog-title')
    const changelogContent = $('changelog-content')
    const changelogVersion = $('changelog-version')
    const changelogPreviewTitle = $('preview-changelog-title')
    const changelogPreviewContent = $('preview-changelog-content')
    const changelogPreviewVersion = $('preview-changelog-version')
    
    if (changelogTitle && changelogPreviewTitle) {
      changelogTitle.addEventListener('input', () => {
        changelogPreviewTitle.textContent = changelogTitle.value || 'Pembaruan Terbaru'
      })
    }
    
    if (changelogContent && changelogPreviewContent) {
      changelogContent.addEventListener('input', () => {
        changelogPreviewContent.innerHTML = (changelogContent.value || 'Tidak ada pembaruan untuk saat ini.').replace(/\n/g, '<br>')
      })
    }
    
    if (changelogVersion && changelogPreviewVersion) {
      changelogVersion.addEventListener('input', () => {
        changelogPreviewVersion.textContent = `v${changelogVersion.value || '1.0.0'}`
      })
    }
  }

  async handleUpload() {
    // Check maintenance before upload
    const isMaintenance = await checkMaintenanceForUpload()
    if (isMaintenance) return

    const btnUpload = $('btnUpload')
    const fileInput = $('fileInput')
    const files = Array.from(fileInput?.files || [])

    if (files.length === 0) {
      this.showMessage('cleanup-result', 'Pilih file terlebih dahulu.', 'error')
      return
    }

    btnUpload.disabled = true
    btnUpload.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Uploading ${files.length} file...`

    try {
      const results = []
      
      for (const file of files) {
        try {
          const dest = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name.replace(/\s+/g, '_')}`
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

          results.push({
            username,
            password,
            filename: file.name,
            expiresIso
          })
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error)
          // Continue with other files
        }
      }

      if (results.length > 0) {
        // Show credentials for all uploaded files
        this.showMultiUploadResults(results)
        this.showMessage('cleanup-result', `Berhasil mengupload ${results.length} file!`, 'success')
      } else {
        this.showMessage('cleanup-result', 'Gagal mengupload semua file.', 'error')
      }

      // Reset form dan file display
      fileInput.value = ''
      const filebox = $('fileInput').closest('.filebox')
      const fileNameDisplay = filebox.querySelector('.file-name-display')
      if (fileNameDisplay) {
        fileNameDisplay.remove()
      }
      filebox.style.borderColor = ''
      filebox.style.background = ''

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

    // Admin login dengan Supabase Auth (HIDDEN FEATURE - tidak diberitahu ke user)
    if (username.includes('@')) {
      try {
        const adminData = await signInAdmin(username, password)
        setAdminSession(adminData.session)
        this.showMessage('cleanup-result', 'Login berhasil - membuka dashboard', 'success')
        setTimeout(() => this.showPage('page-admin'), 1000)
        return
      } catch (err) {
        console.error('Admin login error:', err)
        // Jangan beri tahu user bahwa ini adalah login admin, beri pesan error umum
        this.showMessage('cleanup-result', 'Login gagal: Username atau password salah', 'error')
        return
      }
    }

    // Regular file verification
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

      // Set user session and show dashboard
      setUserSession(username, record)
      this.showUserDashboard(record, username)

    } catch (err) {
      console.error('Verification error:', err)
      if (err.message.includes('PGRST116')) {
        this.showMessage('cleanup-result', 'Username tidak ditemukan.', 'error')
      } else {
        this.showMessage('cleanup-result', 'Verifikasi gagal: ' + (err.message || err), 'error')
      }
    }
  }

  showUserDashboard(fileRecord, username) {
    const userDashboard = $('userDashboard')
    const dlInfo = $('dlInfo')
    
    if (!userDashboard || !dlInfo) return

    // Update file info
    if ($('fileName')) $('fileName').textContent = fileRecord.filename || fileRecord.storage_path
    if ($('fileSize')) $('fileSize').textContent = niceBytes(fileRecord.size)
    if ($('fileTime')) $('fileTime').textContent = fileRecord.created_at ? 
      new Date(fileRecord.created_at).toLocaleString() : '-'
    if ($('fileExpiry')) {
      $('fileExpiry').textContent = fileRecord.expires_at ? 
        new Date(fileRecord.expires_at).toLocaleString() : 'Tidak expired'
    }
    if ($('fileUsername')) $('fileUsername').textContent = username

    // Show both sections
    dlInfo.classList.remove('hide')
    userDashboard.classList.remove('hide')

    // Setup download handler
    if ($('btnDownload')) {
      $('btnDownload').onclick = async () => {
        try {
          const signedUrl = await createSignedUrl(fileRecord.storage_path, 300)
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(fileRecord.storage_path)}`
          const finalUrl = signedUrl || publicUrl
          
          await forceDownloadUrl(finalUrl, fileRecord.filename || 'download')
          await recordDownload({
            file_id: fileRecord.id,
            filename: fileRecord.filename,
            username: fileRecord.username
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
      $('btnView').onclick = async () => {
        try {
          const signedUrl = await createSignedUrl(fileRecord.storage_path, 300)
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(fileRecord.storage_path)}`
          const finalUrl = signedUrl || publicUrl
          window.open(finalUrl, '_blank')
        } catch (e) {
          alert('Gagal membuka file: ' + e.message)
        }
      }
    }
  }

  handleUserLogout() {
    clearUserSession()
    const userDashboard = $('userDashboard')
    const dlInfo = $('dlInfo')
    
    if (userDashboard) userDashboard.classList.add('hide')
    if (dlInfo) dlInfo.classList.add('hide')
    
    if ($('dlUser')) $('dlUser').value = ''
    if ($('dlPass')) $('dlPass').value = ''
    
    this.showMessage('cleanup-result', 'Logout berhasil', 'success')
  }

  async handleUserDeleteFile() {
    const userSession = getUserSession()
    if (!userSession) return

    if (!confirm('Apakah Anda yakin ingin menghapus file ini? Tindakan ini tidak dapat dibatalkan.')) {
      return
    }

    try {
      await deleteFile(userSession.fileRecord)
      this.handleUserLogout()
      this.showMessage('cleanup-result', 'File berhasil dihapus', 'success')
    } catch (e) {
      this.showMessage('cleanup-result', 'Gagal menghapus file: ' + e.message, 'error')
    }
  }

  async handleUserRenameFile() {
    const userSession = getUserSession()
    if (!userSession) return

    const newName = prompt('Masukkan nama baru untuk file:', userSession.fileRecord.filename)
    if (!newName || newName.trim() === '') return

    try {
      const { error } = await supabase
        .from('files')
        .update({ filename: newName.trim() })
        .eq('id', userSession.fileRecord.id)

      if (error) throw error

      // Update local session
      userSession.fileRecord.filename = newName.trim()
      setUserSession(userSession.username, userSession.fileRecord)
      
      // Refresh dashboard
      this.showUserDashboard(userSession.fileRecord, userSession.username)
      this.showMessage('cleanup-result', 'Nama file berhasil diubah', 'success')
    } catch (e) {
      this.showMessage('cleanup-result', 'Gagal mengubah nama file: ' + e.message, 'error')
    }
  }

  showMultiUploadResults(results) {
    const credsSection = $('creds')
    if (!credsSection) return

    let credentialsHTML = `
      <div class="creds-header">
        <h4><i class="fa fa-key"></i> Kredensial File</h4>
        <small class="muted">${results.length} file berhasil diupload - Simpan informasi ini dengan aman!</small>
      </div>
    `

    results.forEach((result, index) => {
      credentialsHTML += `
        <div class="file-credential-item">
          <div class="file-credential-header">
            <i class="fa fa-file"></i>
            <span>${escapeHtml(result.filename)}</span>
          </div>
          <div class="creds-grid">
            <div class="cred-item">
              <label><i class="fa fa-user"></i> Username:</label>
              <code class="cred-value">${result.username}</code>
            </div>
            <div class="cred-item">
              <label><i class="fa fa-lock"></i> Password:</label>
              <code class="cred-value">${result.password}</code>
            </div>
            <div class="cred-item">
              <label><i class="fa fa-clock-o"></i> Expired:</label>
              <code class="cred-value">${result.expiresIso ? new Date(result.expiresIso).toLocaleString() : 'Tidak expired'}</code>
            </div>
            <div class="cred-item">
              <label><i class="fa fa-link"></i> Link:</label>
              <code class="cred-value">${BASE_LOGIN_LINK}/?user=${result.username}</code>
            </div>
          </div>
          ${index < results.length - 1 ? '<hr class="credential-divider">' : ''}
        </div>
      `
    })

    credentialsHTML += `
      <div class="row" style="margin-top:20px; justify-content: center;">
        <button id="copyAllCreds" class="btn primary">
          <i class="fa fa-clipboard"></i> Salin Semua Kredensial
        </button>
      </div>
      <div style="margin-top:16px; text-align: center;">
        <small class="muted">
          <i class="fa fa-exclamation-triangle"></i>
          Simpan informasi ini di tempat yang aman. Password tidak dapat dipulihkan!
        </small>
      </div>
    `

    credsSection.innerHTML = credentialsHTML
    credsSection.classList.remove('hide')

    // Add event listener for copy all button
    const copyAllBtn = $('copyAllCreds')
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => this.handleCopyAllCreds(results))
    }

    // Scroll to credentials section
    credsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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

  handleCopyAllCreds(results) {
    let text = `SAFENEST CREDENTIALS - ${results.length} FILE\n====================\n\n`
    
    results.forEach((result, index) => {
      text += `FILE ${index + 1}: ${result.filename}\n`
      text += `Username: ${result.username}\n`
      text += `Password: ${result.password}\n`
      text += `Link: ${BASE_LOGIN_LINK}/?user=${result.username}\n`
      text += `Expired: ${result.expiresIso ? new Date(result.expiresIso).toLocaleString() : 'Tidak expired'}\n`
      text += `====================\n\n`
    })
    
    text += `Simpan informasi ini dengan aman!`

    navigator.clipboard.writeText(text).then(() => {
      this.showMessage('cleanup-result', `Kredensial ${results.length} file berhasil disalin!`, 'success')
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

  async handleSaveChangelogSettings() {
    const toggle = $('changelog-toggle')
    const titleInput = $('changelog-title')
    const contentInput = $('changelog-content')
    const versionInput = $('changelog-version')
    const startupToggle = $('changelog-startup-toggle')

    const enabled = toggle?.checked || false
    const title = titleInput?.value || 'Pembaruan Terbaru'
    const content = contentInput?.value || 'Tidak ada pembaruan untuk saat ini.'
    const version = versionInput?.value || '1.0.0'
    const show_on_startup = startupToggle?.checked !== false

    if (!title || !content || !version) {
      this.showMessage('changelog-msg', 'Harap isi semua field!', 'error')
      return
    }

    try {
      await upsertChangelog({
        enabled,
        title,
        content,
        version,
        show_on_startup
      })

      this.showMessage('changelog-msg', 'Pengaturan changelog berhasil disimpan!', 'success')
      
      const changelog = await getChangelog()
      this.updateChangelogDisplay(changelog)

    } catch (e) {
      this.showMessage('changelog-msg', 'Gagal menyimpan pengaturan: ' + e.message, 'error')
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
document.addEventListener('DOMContentLoaded', async () => {
  const uiManager = new UIManager()

  initializeUpdateCountdown()
  initializeChangelog()

  // Background cleanup dengan error handling
  setInterval(async () => {
    try {
      await cleanExpiredFiles()
    } catch (e) {
      console.warn('Background cleanup failed:', e.message || e)
    }
  }, 2 * 60 * 1000)

  // Initial cleanup dengan error handling
  cleanExpiredFiles().catch(e => {
    console.warn('Initial cleanup failed:', e.message || e)
  })
  
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
window.hideChangelog = hideChangelog
window.hideAdminWelcome = hideAdminWelcome