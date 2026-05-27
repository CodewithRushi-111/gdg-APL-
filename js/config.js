// Application Configuration & Shared State
const CONFIG = {
  GEMINI_API_KEY: localStorage.getItem('cricfit_gemini_key') || '',
  DEFAULT_EXERCISE: 'pushup',
  XP_PER_REP: 10,
  POLL_INTERVAL: 15000 // 15 seconds
};

// Global App State
const state = {
  user: {
    name: 'Rishi',
    level: 12,
    xp: 2450,
    streak: 7,
    reps: 847,
    challengesDone: 24,
    rank: '#4'
  },
  activePage: 'dashboard',
  liveMatch: {
    miScore: '186/4',
    miOvers: '18.3',
    cskScore: '211/4',
    cskOvers: '20.0',
    ballsThisOver: ['1', '4', '6', 'Wd', 'W', '6'],
    status: 'MI need 26 off 9 balls',
    batsmen: [
      { name: 'Rohit Sharma★', score: '67(42)', sr: '159' },
      { name: 'Suryakumar', score: '45(28)', sr: '160' }
    ]
  },
  activeChallenge: {
    id: 'six_blitz',
    title: 'SIX ALERT! Pushup Blitz',
    description: 'Rohit hit a SIX! Do 15 pushups to earn 150 XP!',
    targetReps: 15,
    currentReps: 6,
    timeLeft: 165, // seconds
    emoji: '💪',
    xpReward: 150
  },
  commentary: [
    { over: '18.3', text: 'SIX! Absolutely monstrous from Suryakumar! Clears cow corner easily!', event: 'six' },
    { over: '18.2', text: 'OUT! Rohit falls after a magnificent knock. Caught at deep cover. Big wicket!', event: 'wicket' },
    { over: '18.1', text: 'Wide ball. Down the leg side, keeper fumbles slightly.', event: 'run' },
    { over: '17.6', text: 'FOUR! Smashed straight down the ground by Rohit!', event: 'four' }
  ],
  squadChallenges: [
    { id: 'sc1', name: '100 Rep Challenge', progress: 75, target: 100, reward: 500, emoji: '⚡' },
    { id: 'sc2', name: 'Boundary Burpees', progress: 2, target: 5, reward: 300, emoji: '🔥' }
  ],
  leaderboards: {
    fitfan: [
      { rank: 1, name: 'Virat', avatar: 'V', xp: 3200 },
      { rank: 2, name: 'Siddharth', avatar: 'S', xp: 2950 },
      { rank: 3, name: 'Dev', avatar: 'D', xp: 2800 },
      { rank: 4, name: 'Rishi (You)', avatar: 'R', xp: 2450 },
      { rank: 5, name: 'Ishita', avatar: 'I', xp: 2100 }
    ],
    fitness: [
      { rank: 1, name: 'Dev', avatar: 'D', reps: 1024 },
      { rank: 2, name: 'Rishi (You)', avatar: 'R', reps: 847 },
      { rank: 3, name: 'Virat', avatar: 'V', reps: 820 },
      { rank: 4, name: 'Siddharth', avatar: 'S', reps: 780 }
    ],
    fan: [
      { rank: 1, name: 'Siddharth', avatar: 'S', score: 450 },
      { rank: 2, name: 'Ishita', avatar: 'I', score: 410 },
      { rank: 3, name: 'Virat', avatar: 'V', score: 390 },
      { rank: 4, name: 'Rishi (You)', avatar: 'R', score: 350 }
    ]
  }
};

// LocalStorage helpers
function saveApiKey() {
  const key = document.getElementById('api-key-input').value.trim();
  if (key) {
    CONFIG.GEMINI_API_KEY = key;
    localStorage.setItem('cricfit_gemini_key', key);
    alert('Gemini API key saved!');
    closeApiModal();
    if (typeof aiEngine !== 'undefined') {
      aiEngine.init();
    }
  }
}

function showApiKeyModal() {
  document.getElementById('api-modal').style.display = 'flex';
}

function closeApiModal() {
  document.getElementById('api-modal').style.display = 'none';
}
