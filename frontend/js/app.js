// ===========================
// SwapifyIndia – Core JS
// ===========================

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://swapifyindia-api.onrender.com/api';

// ── AUTH UTILITIES ──
function getToken() { return localStorage.getItem('si_token'); }
function getUser() {
  const u = localStorage.getItem('si_user');
  return u ? JSON.parse(u) : null;
}
function isLoggedIn() { return !!getToken(); }

function logout() {
  localStorage.removeItem('si_token');
  localStorage.removeItem('si_user');
  showToast('Logged out successfully', 'success');
  setTimeout(() => window.location.href = 'index.html', 800);
}

function requireAuth() {
  if (!isLoggedIn()) {
    showToast('Please login to continue', 'error');
    setTimeout(() => window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`, 1000);
    return false;
  }
  return true;
}

function updateNavAuth() {
  const user = getUser();
  const authDiv = document.getElementById('nav-auth');
  const userDiv = document.getElementById('nav-user');
  const dashLink = document.getElementById('nav-dashboard');

  if (user && getToken()) {
    if (authDiv) authDiv.style.display = 'none';
    if (userDiv) { userDiv.style.display = 'flex'; }
    if (dashLink) dashLink.style.display = 'block';
    const nameEl = document.getElementById('nav-username');
    if (nameEl) nameEl.textContent = `Hi, ${user.name.split(' ')[0]}`;
  } else {
    if (authDiv) authDiv.style.display = 'flex';
    if (userDiv) userDiv.style.display = 'none';
  }
}

// ── API HELPER ──
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  const data = await res.json();

  if (res.status === 401) {
    localStorage.removeItem('si_token');
    localStorage.removeItem('si_user');
    window.location.href = 'login.html';
    throw new Error('Unauthorized');
  }

  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function apiUpload(endpoint, formData) {
  const headers = {};
  if (getToken()) headers['Authorization'] = `Bearer ${getToken()}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
}

// ── TOAST ──
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const div = document.createElement('div');
  div.className = `toast toast-${type}`;
  div.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(div);
  setTimeout(() => {
    div.style.animation = 'slideDown 0.3s ease forwards';
    setTimeout(() => div.remove(), 300);
  }, duration);
}

// ── TICKET CARD RENDERER ──
function renderTicketCard(ticket, showBuyBtn = true) {
  const isSold = ticket.status === 'sold';
  const isReturned = ticket.status === 'returned' || ticket.status === 'expired';
  const categoryEmojis = {
    'Concerts': '🎵', 'Sports': '🏏', 'Movies': '🎬',
    'Comedy Shows': '😂', 'Festivals': '🎪', 'Other Events': '✨'
  };
  const emoji = categoryEmojis[ticket.category] || '🎟';
  const date = new Date(ticket.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const statusClass = `status-${ticket.status || 'available'}`;

  return `
    <a href="ticket-details.html?id=${ticket._id}" class="ticket-card">
      <div class="ticket-img-wrap">
        ${ticket.ticketImage
          ? `<img src="${API_BASE.replace('/api','')}/${ticket.ticketImage}" alt="${ticket.eventName}" />`
          : `<div class="ticket-img-placeholder">
               <span style="font-size:2.5rem">${emoji}</span>
               <span style="color:#444;font-size:12px">${ticket.category}</span>
             </div>`
        }
        <div class="qr-shield">
          <div class="qr-shield-icon">🔒</div>
          <span style="font-size:10px;color:#999;font-weight:600">QR Hidden Until Purchase</span>
        </div>
        <div class="ticket-badge ${statusClass}">
          ${ticket.status === 'available' ? '● Available' : ticket.status === 'sold' ? '● Sold' : '● ' + (ticket.status || 'Available')}
        </div>
      </div>
      <div class="p-4">
        <p style="font-size:11px;color:#666;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">${ticket.category}</p>
        <h3 style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;margin-bottom:8px;line-height:1.3">${ticket.eventName}</h3>
        <div style="display:flex;gap:12px;margin-bottom:12px;font-size:12px;color:#666">
          <span>📍 ${ticket.city}</span>
          <span>📅 ${date}</span>
        </div>
        <div style="font-size:11px;color:#555;margin-bottom:12px">💺 ${ticket.seat || 'General'}</div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:18px;color:#ff4d1c">₹${ticket.price.toLocaleString('en-IN')}</div>
          ${!isSold && !isReturned && showBuyBtn ? `<span style="background:rgba(255,77,28,0.1);border:1px solid rgba(255,77,28,0.3);color:#ff4d1c;font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px">Buy Now</span>` : `<span style="color:#555;font-size:11px">${isSold ? 'Sold Out' : 'Unavailable'}</span>`}
        </div>
      </div>
    </a>`;
}

// ── DEMO TICKETS (fallback when API unavailable) ──
function demoTickets() {
  return [
    { _id: 'demo1', eventName: 'Arijit Singh Live – Mumbai', category: 'Concerts', city: 'Mumbai', date: new Date(Date.now() + 7*86400000), seat: 'A12', price: 2500, status: 'available' },
    { _id: 'demo2', eventName: 'IPL 2025 – MI vs CSK', category: 'Sports', city: 'Mumbai', date: new Date(Date.now() + 3*86400000), seat: 'Stand B-45', price: 1800, status: 'available' },
    { _id: 'demo3', eventName: 'Sunburn Festival Goa', category: 'Festivals', city: 'Goa', date: new Date(Date.now() + 14*86400000), seat: 'General', price: 3200, status: 'available' },
    { _id: 'demo4', eventName: 'Zakir Khan – Comedy Night', category: 'Comedy Shows', city: 'Delhi', date: new Date(Date.now() + 5*86400000), seat: 'Row C', price: 999, status: 'available' },
  ];
}

// ── DATE FORMATTING ──
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatDateTime(d) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── URL PARAMS ──
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ── CURRENCY FORMAT ──
function rupees(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

window.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
});