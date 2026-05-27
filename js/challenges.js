// Match Triggered Fitness Challenges
const ChallengeManager = {
  activeChallenges: [],
  upcomingTriggers: [
    { event: "Bowler bowls Wicket", challenge: "10 Squats", reward: "100 XP" },
    { event: "Batsman hits Four", challenge: "20 Jumping Jacks", reward: "80 XP" },
    { event: "Over runs > 15", challenge: "15 Burpees", reward: "200 XP" }
  ],

  init() {
    this.renderUpcomingTriggers();
    this.renderActiveChallenges();
    this.startTimers();
  },

  triggerMatchChallenge(type) {
    let title = "SIX ALERT!";
    let desc = "Rohit hit a SIX! Do 15 pushups to earn 150 XP!";
    let target = 15;
    let reward = 150;
    let emoji = "💪";

    if (type === "FOUR") {
      title = "FOUR ALERT!";
      desc = "Boundary scored! Perform 20 Jumping Jacks to earn 80 XP!";
      target = 20;
      reward = 80;
      emoji = "⚡";
    } else if (type === "WICKET") {
      title = "WICKET ALERT!";
      desc = "A wicket falls! Complete 10 Squats to earn 100 XP!";
      target = 10;
      reward = 100;
      emoji = "🔥";
    }

    // Trigger UI notification
    this.showChallengePopup(title, desc);

    // Add to active challenges
    const newChallenge = {
      id: 'ch-' + Date.now(),
      title,
      description: desc,
      targetReps: target,
      currentReps: 0,
      timeLeft: 180, // 3 minutes
      reward,
      emoji
    };

    this.activeChallenges.unshift(newChallenge);
    state.activeChallenge = newChallenge;

    this.renderActiveChallenges();
    this.updateDashboardActiveChallenge();
  },

  showChallengePopup(title, desc) {
    const popup = document.getElementById('challenge-popup');
    const pTitle = document.getElementById('popup-title');
    const pDesc = document.getElementById('popup-desc');
    const pIcon = document.getElementById('popup-icon');

    if (!popup || !pTitle || !pDesc) return;

    pTitle.innerText = title;
    pDesc.innerText = desc;
    pIcon.innerText = title.includes("SIX") ? "🏏" : title.includes("FOUR") ? "⚡" : "🔥";

    popup.style.display = 'block';

    // Play alert sound if allowed
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch(e) {}
  },

  renderActiveChallenges() {
    const list = document.getElementById('match-challenges-list');
    if (!list) return;

    if (this.activeChallenges.length === 0) {
      list.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:1.5rem">No active challenges. Wait for boundaries/wickets!</div>`;
      return;
    }

    list.innerHTML = this.activeChallenges.map(ch => `
      <div class="lb-item mt-1">
        <div class="lb-user-info">
          <div class="lb-avatar" style="background:var(--accent-primary)">${ch.emoji}</div>
          <div>
            <div class="lb-username">${ch.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted)">${ch.description}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div class="lb-xp">+${ch.reward} XP</div>
          <div style="font-size:0.75rem; color:var(--accent-error)">${ch.timeLeft}s left</div>
        </div>
      </div>
    `).join('');
  },

  updateDashboardActiveChallenge() {
    const title = document.getElementById('dash-challenge-content');
    if (!title) return;

    const ch = state.activeChallenge;
    if (!ch) {
      title.innerHTML = `<p style="color:var(--text-muted); text-align:center; padding:1rem">No active challenges</p>`;
      return;
    }

    title.innerHTML = `
      <div class="big-emoji">${ch.emoji}</div>
      <div class="challenge-name">${ch.title}</div>
      <div class="challenge-sub">${ch.description}</div>
      <div class="rep-progress-wrap">
        <div class="rep-progress-bar"><div class="rep-progress-fill" id="dash-progress" style="width:${(ch.currentReps/ch.targetReps)*100}%"></div></div>
        <span id="dash-rep-label">${ch.currentReps} / ${ch.targetReps} reps</span>
      </div>
      <button class="btn-primary full-w mt-1" onclick="navigate('fit-arena')">Start Now <i class="fas fa-arrow-right"></i></button>
    `;

    // update Fit Arena Challenge view as well
    const fitTitle = document.getElementById('fit-challenge-title');
    const fitDesc = document.getElementById('fit-challenge-desc');
    const fitTimer = document.getElementById('fit-timer');

    if (fitTitle) fitTitle.innerText = ch.title;
    if (fitDesc) fitDesc.innerText = ch.description;
    if (fitTimer) fitTimer.innerText = `${ch.timeLeft}s remaining`;

    this.updateChallengeProgress();
  },

  updateChallengeProgress() {
    const ch = state.activeChallenge;
    if (!ch) return;

    const dashProgress = document.getElementById('dash-progress');
    const dashLabel = document.getElementById('dash-rep-label');
    const fitProgress = document.getElementById('fit-progress-fill');
    const fitLabel = document.getElementById('fit-progress-label');

    const pct = Math.min(100, (ch.currentReps / ch.targetReps) * 100);

    if (dashProgress) dashProgress.style.width = pct + '%';
    if (dashLabel) dashLabel.innerText = `${ch.currentReps} / ${ch.targetReps} reps`;
    if (fitProgress) fitProgress.style.width = pct + '%';
    if (fitLabel) fitLabel.innerText = `${ch.currentReps} / ${ch.targetReps} reps`;

    // Completion check
    if (ch.currentReps >= ch.targetReps) {
      this.completeChallenge(ch);
    }
  },

  completeChallenge(ch) {
    // Award XP
    state.user.xp += ch.reward;
    state.user.challengesDone++;
    
    // UI update
    updateXpDisplay();
    this.showChallengePopup('🎉 CHALLENGE COMPLETE!', `You earned +${ch.reward} XP! Keep it up!`);

    // Fire Confetti!
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f97316', '#2563eb', '#10b981', '#fbbf24']
      });
    }

    // Remove from active
    this.activeChallenges = this.activeChallenges.filter(c => c.id !== ch.id);
    if (state.activeChallenge.id === ch.id) {
      state.activeChallenge = this.activeChallenges[0] || null;
    }

    this.renderActiveChallenges();
    this.updateDashboardActiveChallenge();
  },

  renderUpcomingTriggers() {
    const list = document.getElementById('upcoming-challenges');
    if (!list) return;

    list.innerHTML = this.upcomingTriggers.map(tr => `
      <div style="display:flex; justify-content:space-between; font-size:0.8rem; padding:0.4rem 0; border-bottom:1px solid var(--card-border)">
        <span style="color:var(--text-muted)">${tr.event}</span>
        <span style="font-weight:600; color:var(--accent-secondary)">${tr.challenge}</span>
      </div>
    `).join('');
  },

  startTimers() {
    setInterval(() => {
      // Tick remaining timers
      this.activeChallenges.forEach(ch => {
        if (ch.timeLeft > 0) {
          ch.timeLeft--;
        }
      });

      // Filter expired
      this.activeChallenges = this.activeChallenges.filter(ch => ch.timeLeft > 0);

      this.renderActiveChallenges();

      // Update timer displays
      const timerBadge = document.getElementById('dash-timer');
      if (timerBadge && state.activeChallenge) {
        timerBadge.innerText = this.formatTime(state.activeChallenge.timeLeft);
      }
    }, 1000);
  },

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
};

// Global pop-up actions
function acceptChallenge() {
  dismissChallenge();
  navigate('fit-arena');
}

function dismissChallenge() {
  document.getElementById('challenge-popup').style.display = 'none';
}

function updateXpDisplay() {
  const xpEl = document.getElementById('total-xp');
  const dXp = document.getElementById('dash-xp');
  if (xpEl) xpEl.innerText = state.user.xp.toLocaleString();
  if (dXp) dXp.innerText = state.user.xp.toLocaleString();
}
