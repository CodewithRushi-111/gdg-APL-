// Main Application Entry & Routing
document.addEventListener('DOMContentLoaded', () => {
  // Init Modules
  MatchEngine.start();
  MatchEngine.updateUI();
  stadium3D.init('mini-stadium-canvas', true);
  fitTracker.init();
  aiEngine.init();
  ChallengeManager.init();
  SquadManager.init();

  // Load active page from storage/state
  navigate(state.activePage);

  // Setup profile charts and list activity feed
  initCharts();
  renderAchievements();
  renderActivityFeed();

  // If no Gemini API Key is configured, show onboarding key modal after delay
  if (!CONFIG.GEMINI_API_KEY) {
    setTimeout(() => {
      showApiKeyModal();
    }, 2000);
  }
});

// Sidebar navigation handler
function navigate(pageId) {
  // Remove active state from all pages & nav items
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Activate selected page
  const page = document.getElementById(`page-${pageId}`);
  if (page) {
    page.classList.add('active');
    state.activePage = pageId;

    // Trigger page-specific loads (like full 3D stadium when navigating to Live Match)
    if (pageId === 'live-match') {
      setTimeout(() => {
        stadium3D.init('stadium-3d-canvas', false);
      }, 100);
    }
  }

  const nav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (nav) {
    nav.classList.add('active');
  }

  // Close sidebar on mobile
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth <= 968) {
    sidebar.style.display = 'none';
  }
}

// Mobile sidebar toggle helper
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const isVisible = window.getComputedStyle(sidebar).display !== 'none';
    sidebar.style.display = isVisible ? 'none' : 'flex';
  }
}

// Chart Initializations
let weeklyChartInstance = null;
let sessionChartInstance = null;
let profileChartInstance = null;

function initCharts() {
  // Weekly Activity Chart
  const actCtx = document.getElementById('activity-chart');
  if (actCtx) {
    weeklyChartInstance = new Chart(actCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'XP Earned',
          data: [240, 150, 420, 300, 180, 560, 600],
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          fill: true,
          tension: 0.4
        }, {
          label: 'Reps Counted',
          data: [80, 50, 140, 100, 60, 180, 200],
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
          x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
        }
      }
    });
  }

  // Session Stats Chart
  const sesCtx = document.getElementById('session-chart');
  if (sesCtx) {
    sessionChartInstance = new Chart(sesCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Pushups', 'Squats', 'Jacks', 'Curls'],
        datasets: [{
          label: 'Reps Done',
          data: [15, 20, 45, 12],
          backgroundColor: ['#f97316', '#06b6d4', '#10b981', '#a855f7'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
          x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
        }
      }
    });
  }

  // Profile History Chart
  const profCtx = document.getElementById('profile-chart');
  if (profCtx) {
    profileChartInstance = new Chart(profCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
        datasets: [{
          label: 'Weekly XP Gain',
          data: [1200, 1800, 2100, 2450],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
          x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
        }
      }
    });
  }
}

function renderAchievements() {
  const container = document.getElementById('achievements-grid');
  if (!container) return;

  const list = [
    { title: 'Super Striker', desc: 'Complete 5 boundary challenges', icon: '🏏', color: '#f97316' },
    { title: 'Form Perfect', desc: 'Maintain > 95% form accuracy', icon: '🎯', color: '#10b981' },
    { title: 'Iron Defender', desc: 'Complete 3 wicket challenges', icon: '🛡️', color: '#3b82f6' },
    { title: 'Squad Hero', desc: 'Rank #1 in squad scoreboard', icon: '👑', color: '#eab308' }
  ];

  container.innerHTML = list.map(item => `
    <div style="background:var(--bg-secondary); border:1px solid var(--card-border); padding:1rem; border-radius:12px; display:flex; align-items:center; gap:0.75rem">
      <div style="font-size:1.8rem; background:rgba(255,255,255,0.03); width:48px; height:48px; display:flex; align-items:center; justify-content:center; border-radius:10px">${item.icon}</div>
      <div>
        <div style="font-weight:700; font-size:0.95rem; color:${item.color}">${item.title}</div>
        <div style="font-size:0.75rem; color:var(--text-muted)">${item.desc}</div>
      </div>
    </div>
  `).join('');
}

function renderActivityFeed() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  const items = [
    { text: "Completed SIX ALERT challenge", detail: "+150 XP • 15 Pushups", time: "10 mins ago" },
    { text: "Claimed daily streak reward", detail: "+50 XP • 7 day streak", time: "2 hrs ago" },
    { text: "Won Squad challenge against Dev", detail: "+300 XP • 100 Reps Challenge", time: "1 day ago" }
  ];

  feed.innerHTML = items.map(it => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 0; border-bottom:1px solid var(--card-border)">
      <div>
        <div style="font-weight:600; font-size:0.9rem">${it.text}</div>
        <div style="font-size:0.75rem; color:var(--text-muted)">${it.detail}</div>
      </div>
      <span style="font-size:0.75rem; color:var(--text-muted)">${it.time}</span>
    </div>
  `).join('');
}

// WebSocket Client Connectivity for Real-Time Fan Chat & Synced Alerts
let wsConn = null;

function connectWebSocket() {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

  console.log(`Connecting to WebSocket: ${wsUrl}`);
  wsConn = new WebSocket(wsUrl);

  wsConn.onopen = () => {
    console.log("Connected to CricFit Arena real-time network.");
  };

  wsConn.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'chat') {
        appendFanChatMessage(data.user, data.text, data.time);
      } else if (data.type === 'system') {
        appendFanChatMessage('System', data.text);
      } else if (data.type === 'match_alert') {
        // Trigger live match boundary alerts
        if (typeof ChallengeManager !== 'undefined') {
          const cleanEvent = data.event.replace(" ALERT!", "");
          ChallengeManager.triggerMatchChallenge(cleanEvent);
        }
      }
    } catch (e) {
      console.error("Error handling WebSocket packet", e);
    }
  };

  wsConn.onclose = () => {
    console.warn("WebSocket closed. Attempting reconnect in 5s...");
    setTimeout(connectWebSocket, 5000);
  };

  wsConn.onerror = (err) => {
    console.error("WebSocket encountered error", err);
  };
}

function sendFanChatMessage() {
  const input = document.getElementById('fan-chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  if (wsConn && wsConn.readyState === WebSocket.OPEN) {
    wsConn.send(JSON.stringify({
      type: 'chat',
      user: state.user.name,
      text: text
    }));
  } else {
    // Local offline mock chat fallback if server isn't running
    appendFanChatMessage(state.user.name, text);
    setTimeout(() => {
      const responses = [
        "Let's go MI! Rohit is hitting them clean!",
        "Just finished 15 pushups for that six. My arms are burning!",
        "Who is doing squats next over? Let's race!",
        "CSK needs to tighten this line. Too many boundaries!"
      ];
      const randomReply = responses[Math.floor(Math.random() * responses.length)];
      appendFanChatMessage("Dev (Squad)", randomReply);
    }, 1000);
  }

  input.value = '';
}

function appendFanChatMessage(user, text, time = '') {
  const container = document.getElementById('fan-chat-messages');
  if (!container) return;

  const isSystem = user === 'System';
  const displayTime = time ? `<span style="font-size:0.7rem; color:var(--text-muted); margin-left:0.5rem">${time}</span>` : '';
  const bubbleStyle = isSystem 
    ? 'padding:0.5rem; background:rgba(255,255,255,0.03); color:var(--accent-secondary)' 
    : 'padding:0.5rem; background:var(--bg-secondary); border-left: 2px solid var(--accent-primary)';

  const html = `
    <div class="msg" style="max-width:100%; margin-bottom:0.5rem">
      <div class="msg-bubble" style="${bubbleStyle}">
        <strong>${user}</strong>: ${text} ${displayTime}
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);
  container.scrollTop = container.scrollHeight;
}

// Start WebSocket connection
connectWebSocket();

