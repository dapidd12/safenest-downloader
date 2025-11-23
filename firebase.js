// firebase.js — realtime comments (newest first) dengan error handling
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ===== change this to your firebase config if needed =====
const firebaseConfig = {
  apiKey: "AIzaSyCD0D2XOFUCWv-2dtCr5RDyBcpbMdiI094",
  authDomain: "piwforum.firebaseapp.com",
  projectId: "piwforum",
  storageBucket: "piwforum.firebasestorage.app",
  messagingSenderId: "701229787359",
  appId: "1:701229787359:web:01248916730a1a3f9ae16a"
};
// =========================================================

let db = null;
let commentsCol = null;
let isFirebaseInitialized = false;

function escapeHtml(s=''){ 
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;') 
}

function makeCommentEl(data){
  const name = escapeHtml(data.name||'anon')
  const msg = escapeHtml(data.message||'')
  const ts = data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : null
  const timeStr = ts ? ts.toLocaleString() : ''
  const el = document.createElement('div')
  el.className = 'comment'
  el.innerHTML = `<div class="meta">${name} • ${timeStr}</div><div class="message">${msg}</div>`
  return el
}

// Initialize Firebase with error handling
function initializeFirebase() {
  try {
    if (isFirebaseInitialized) return true;
    
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    commentsCol = collection(db, 'comments');
    isFirebaseInitialized = true;
    console.log('[Firebase] Initialized successfully');
    return true;
  } catch (error) {
    console.warn('[Firebase] Initialization failed:', error);
    return false;
  }
}

// expose sendComment for app.js dengan error handling
window.sendComment = async function({ name, message }){
  if(!isFirebaseInitialized) {
    if(!initializeFirebase()) {
      throw new Error('Firebase not available');
    }
  }
  
  if(!message || !message.trim()) throw new Error('Message kosong')
  const safeName = (name || 'anon').trim().slice(0,80)
  const safeMsg = message.trim().slice(0,1000)
  
  try {
    return await addDoc(commentsCol, { name: safeName, message: safeMsg, createdAt: serverTimestamp() })
  } catch (error) {
    console.error('[Firebase] Send comment failed:', error);
    throw error;
  }
}

// realtime listener: newest first dengan error handling
function startListener(){
  if(!isFirebaseInitialized) {
    if(!initializeFirebase()) {
      console.warn('[Firebase] Cannot start listener - Firebase not available');
      return;
    }
  }
  
  const container = document.getElementById('commentsBox')
  if(!container) {
    console.warn('[Firebase] Comments container not found');
    return;
  }
  
  try {
    const q = query(commentsCol, orderBy('createdAt','desc'), limit(500))
    onSnapshot(q, 
      (snap) => {
        container.innerHTML = ''
        snap.forEach(doc => {
          const el = makeCommentEl(doc.data())
          container.appendChild(el)
        })
        // keep scroll top so newest visible
        container.scrollTop = 0
      }, 
      (err) => {
        console.error('comments listener error', err)
        container.innerHTML = '<div class="muted text-center">Komentar tidak dapat dimuat</div>'
      }
    )
  } catch (error) {
    console.error('[Firebase] Listener setup failed:', error);
    container.innerHTML = '<div class="muted text-center">Error memuat komentar</div>'
  }
}

// Initialize when DOM is ready dengan safety delay
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Firebase] DOM Content Loaded - Initializing Firebase');
  
  // Try to initialize Firebase immediately
  initializeFirebase();
  
  // Start listener with delay to ensure DOM is ready
  setTimeout(() => {
    startListener();
  }, 2000);
});

// Export for potential use in other modules
export { initializeFirebase, startListener };