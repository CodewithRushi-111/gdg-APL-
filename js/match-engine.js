// Live Match Simulation Engine
const MatchEngine = {
  activeOver: 18.3,
  runsRequired: 26,
  ballsRemaining: 9,
  intervalId: null,

  start() {
    this.intervalId = setInterval(() => {
      this.tick();
    }, 15000); // Trigger new event every 15s
  },

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  },

  tick() {
    if (this.ballsRemaining <= 0) {
      this.stop();
      this.updateStatus("Match Completed!");
      return;
    }

    // Generate random cricket delivery event
    const events = ['1', '2', '4', '6', 'W', 'Wd', '0'];
    const weights = [0.3, 0.1, 0.15, 0.1, 0.1, 0.05, 0.2];
    const event = this.weightedRandom(events, weights);

    // Update match state
    this.ballsRemaining--;
    let ballLabel = event;

    // Over math
    let currentBalls = Math.round((this.activeOver % 1) * 10);
    if (event !== 'Wd') {
      currentBalls++;
    }
    if (currentBalls >= 6) {
      this.activeOver = Math.floor(this.activeOver) + 1;
    } else {
      this.activeOver = Math.floor(this.activeOver) + (currentBalls / 10);
    }

    let runDiff = 0;
    let comment = "";
    let isTrigger = false;
    let triggerType = "";

    switch (event) {
      case '0':
        comment = "Dot ball. Excellent defensive line by the bowler.";
        break;
      case '1':
        runDiff = 1;
        comment = "Tapped away to deep mid-wicket for a single.";
        break;
      case '2':
        runDiff = 2;
        comment = "Good running! Pushed soft hands, they come back for the double.";
        break;
      case '4':
        runDiff = 4;
        comment = "FOUR! Pierced the gap through extra cover. Magnificent timing!";
        isTrigger = true;
        triggerType = "FOUR";
        break;
      case '6':
        runDiff = 6;
        comment = "SIX! Into the stands! Absolutely smoked over long on!";
        isTrigger = true;
        triggerType = "SIX";
        break;
      case 'Wd':
        runDiff = 1;
        this.ballsRemaining++; // doesn't count as a legal ball
        comment = "Wide ball. Bowled way down the leg side.";
        break;
      case 'W':
        comment = "OUT! Clean bowled! He tried to swing wild and missed completely.";
        isTrigger = true;
        triggerType = "WICKET";
        break;
    }

    this.runsRequired = Math.max(0, this.runsRequired - runDiff);

    // Update global state
    state.liveMatch.miOvers = this.activeOver.toFixed(1);
    state.liveMatch.ballsThisOver.push(ballLabel);
    if (state.liveMatch.ballsThisOver.length > 6) {
      state.liveMatch.ballsThisOver.shift();
    }

    // Update scoreboard runs
    const runsWickets = state.liveMatch.miScore.split('/');
    let currentRuns = parseInt(runsWickets[0]) + runDiff;
    let currentWickets = parseInt(runsWickets[1]);
    if (event === 'W') {
      currentWickets++;
    }
    state.liveMatch.miScore = `${currentRuns}/${currentWickets}`;

    // Update status
    if (this.runsRequired <= 0) {
      state.liveMatch.status = "MI won the match!";
      this.stop();
    } else if (this.ballsRemaining <= 0) {
      state.liveMatch.status = `CSK won by ${this.runsRequired} runs!`;
      this.stop();
    } else {
      state.liveMatch.status = `MI need ${this.runsRequired} off ${this.ballsRemaining} balls`;
    }

    // Add commentary
    state.commentary.unshift({
      over: state.liveMatch.miOvers,
      text: comment,
      event: event === '6' ? 'six' : event === '4' ? 'four' : event === 'W' ? 'wicket' : 'run'
    });

    // Update UI elements
    this.updateUI();

    // Trigger challenge if boundary or wicket
    if (isTrigger && typeof ChallengeManager !== 'undefined') {
      ChallengeManager.triggerMatchChallenge(triggerType);
    }
  },

  weightedRandom(items, weights) {
    let i;
    let cumulative = 0;
    const r = Math.random();
    for (i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (r <= cumulative) return items[i];
    }
    return items[items.length - 1];
  },

  updateUI() {
    // Header Live Bar update
    const scoreMiEl = document.getElementById('bar-score-mi');
    const scoreCskEl = document.getElementById('bar-score-csk');
    const statusEl = document.getElementById('bar-status');

    if (scoreMiEl) scoreMiEl.innerText = `${state.liveMatch.miScore} (${state.liveMatch.miOvers})`;
    if (statusEl) statusEl.innerText = state.liveMatch.status;

    // Mini Dash / Live Page update
    const miniMi = document.getElementById('mini-mi-score');
    const miniOver = document.getElementById('mini-over');
    if (miniMi) miniMi.innerText = state.liveMatch.miScore;
    if (miniOver) miniOver.innerText = `${state.liveMatch.miOvers} ov • ${state.liveMatch.status}`;

    // Update balls display
    this.renderBalls('mini-balls-row');
    this.renderBalls('live-balls-row');

    // Update score display on match page
    const miScoreDisp = document.getElementById('mi-score-display');
    if (miScoreDisp) miScoreDisp.innerText = state.liveMatch.miScore;

    // Update commentary
    const commFeed = document.getElementById('commentary-feed');
    if (commFeed) {
      commFeed.innerHTML = state.commentary.map(c => `
        <div class="comm-item ${c.event}">
          <div class="comm-header">
            <span class="comm-over">Over ${c.over}</span>
            <span class="comm-badge">${c.event.toUpperCase()}</span>
          </div>
          <div class="comm-txt">${c.text}</div>
        </div>
      `).join('');
    }
  },

  renderBalls(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = state.liveMatch.ballsThisOver.map(ball => {
      let klass = 'ball-run';
      if (ball === '6') klass = 'ball-six';
      else if (ball === '4') klass = 'ball-four';
      else if (ball === 'W') klass = 'ball-wicket';
      return `<div class="ball-circle ${klass}">${ball}</div>`;
    }).join('');
  }
};
