// Squad Zone & Leaderboard Manager
const SquadManager = {
  activeTab: 'fitfan',
  squadMembers: [
    { name: "Rishi (You)", role: "Captain", reps: 847, points: 2450 },
    { name: "Dev", role: "V-Captain", reps: 1024, points: 2800 },
    { name: "Siddharth", role: "Warrior", reps: 780, points: 2950 },
    { name: "Virat", role: "Striker", reps: 820, points: 3200 }
  ],

  init() {
    this.renderLeaderboard();
    this.renderSquadChallenges();
    this.renderMySquad();
  },

  switchTab(tab, btn) {
    this.activeTab = tab;
    // Update active class
    const container = btn.parentElement;
    container.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.renderLeaderboard();
  },

  renderLeaderboard() {
    const lbContainer = document.getElementById('global-leaderboard');
    if (!lbContainer) return;

    let list = [];
    let isXp = true;
    let suffix = 'XP';

    if (this.activeTab === 'fitfan') {
      list = state.leaderboards.fitfan;
    } else if (this.activeTab === 'fitness') {
      list = state.leaderboards.fitness;
      isXp = false;
      suffix = 'reps';
    } else {
      list = state.leaderboards.fan;
      isXp = false;
      suffix = 'pts';
    }

    lbContainer.innerHTML = `
      <div class="lb-list">
        ${list.map(item => `
          <div class="lb-item">
            <span class="lb-rank-num">#${item.rank}</span>
            <div class="lb-user-info">
              <div class="lb-avatar">${item.avatar}</div>
              <div class="lb-username">${item.name}</div>
            </div>
            <span class="lb-xp">${isXp ? item.xp.toLocaleString() : (item.reps || item.score)} ${suffix}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Render mini leaderboard
    const miniLb = document.getElementById('mini-leaderboard');
    if (miniLb) {
      miniLb.innerHTML = state.leaderboards.fitfan.slice(0, 3).map(item => `
        <div class="lb-item" style="padding:0.5rem 0.75rem">
          <span style="font-weight:700; width:15px; font-size:0.8rem">#${item.rank}</span>
          <div class="lb-user-info" style="gap:0.5rem">
            <div class="lb-avatar" style="width:24px; height:24px; font-size:0.75rem">${item.avatar}</div>
            <div class="lb-username" style="font-size:0.85rem">${item.name}</div>
          </div>
          <span class="lb-xp" style="font-size:0.85rem">${item.xp.toLocaleString()} XP</span>
        </div>
      `).join('');
    }
  },

  renderSquadChallenges() {
    const list = document.getElementById('squad-challenges-list');
    if (!list) return;

    list.innerHTML = state.squadChallenges.map(sc => `
      <div class="lb-item mt-1">
        <div class="lb-user-info">
          <div class="lb-avatar" style="background:var(--accent-secondary)">${sc.emoji}</div>
          <div>
            <div class="lb-username">${sc.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted)">Earn +${sc.reward} XP when completed</div>
          </div>
        </div>
        <div style="width:100px">
          <div style="font-size:0.8rem; text-align:right">${sc.progress}/${sc.target}</div>
          <div class="rep-progress-bar"><div class="rep-progress-fill" style="width:${(sc.progress/sc.target)*100}%"></div></div>
        </div>
      </div>
    `).join('');
  },

  renderMySquad() {
    const list = document.getElementById('my-squad-list');
    if (!list) return;

    list.innerHTML = this.squadMembers.map(m => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--card-border)">
        <div style="display:flex; align-items:center; gap:0.6rem">
          <div class="avatar-circle" style="width:28px; height:28px; font-size:0.8rem">${m.name[0]}</div>
          <div>
            <div style="font-weight:600; font-size:0.9rem">${m.name}</div>
            <div style="font-size:0.7rem; color:var(--text-muted)">${m.role}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:0.8rem; font-weight:700; color:var(--accent-primary)">${m.points} XP</div>
          <div style="font-size:0.7rem; color:var(--text-muted)">${m.reps} reps</div>
        </div>
      </div>
    `).join('');
  }
};

// Global actions
function createSquadChallenge() {
  const name = prompt("Enter Squad Challenge Name (e.g. 50 Burpees before over 20):");
  if (name) {
    state.squadChallenges.push({
      id: 'sc-' + Date.now(),
      name,
      progress: 0,
      target: 20,
      reward: 400,
      emoji: '⚡'
    });
    SquadManager.renderSquadChallenges();
  }
}

function sendChallenge() {
  const friend = document.getElementById('friend-input').value.trim();
  if (friend) {
    alert(`Challenge request sent to ${friend}! They will get a notification during the next match boundary.`);
    document.getElementById('friend-input').value = '';
  }
}

function switchLbTab(tab, btn) {
  SquadManager.switchTab(tab, btn);
}
