// firebase.js — realtime comments (newest first)
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const commentsCol = collection(db, 'comments');

function escapeHtml(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;') }

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

// expose sendComment for app.js
window.sendComment = async function({ name, message }){
  if(!message || !message.trim()) throw new Error('Message kosong')
  const safeName = (name || 'anon').trim().slice(0,80)
  const safeMsg = message.trim().slice(0,1000)
  return addDoc(commentsCol, { name: safeName, message: safeMsg, createdAt: serverTimestamp() })
}

// realtime listener: newest first
function startListener(){
  const container = document.getElementById('commentsBox')
  if(!container) return
  const q = query(commentsCol, orderBy('createdAt','desc'), limit(500))
  onSnapshot(q, snap => {
    container.innerHTML = ''
    snap.forEach(doc => {
      const el = makeCommentEl(doc.data())
      container.appendChild(el)
    })
    // keep scroll top so newest visible
    container.scrollTop = 0
  }, err => console.error('comments listener error', err))
}

window.addEventListener('DOMContentLoaded', () => startListener())