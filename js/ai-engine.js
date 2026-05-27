// Gemini AI Integration Engine
const aiEngine = {
  geminiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',

  init() {
    this.renderQuickPrompts();
    this.renderPolls();
    
    // Warm up speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  },

  speak(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.1;
      utterance.rate = 1.05;
      
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  },

  async callGemini(promptText) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-gemini-key': CONFIG.GEMINI_API_KEY
        },
        body: JSON.stringify({ prompt: promptText })
      });

      if (!response.ok) {
        throw new Error(`Proxy error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text;
    } catch (err) {
      console.error("Gemini call through server proxy failed. Trying local offline heuristics.", err);
      return this.offlineFallback(promptText);
    }
  },

  offlineFallback(promptText) {
    // Basic heuristics based on incoming prompts
    const promptLower = promptText.toLowerCase();
    
    if (promptLower.includes('poll')) {
      const polls = [
        "Will Rohit Sharma reach a half-century? \n[A] Yes, easily!\n[B] No, bowler is tight\n[C] Out under 40 runs",
        "Which workout will you finish during this match break?\n[A] 20 squats\n[B] 15 pushups\n[C] 10 burpees",
        "Who takes the next wicket?\n[A] Bumrah\n[B] Chawla\n[C] Coetzee"
      ];
      return polls[Math.floor(Math.random() * polls.length)];
    }

    if (promptLower.includes('challenge')) {
      return "Match Trigger: Six! Challenge: 15 Squats in 2 mins.";
    }

    if (promptLower.includes('diet') || promptLower.includes('eat') || promptLower.includes('snack')) {
      return "Great question! Watching cricket often means eating junk. Swap chips for roasted makhana (lotus seeds) or spicy roasted chickpeas. Keep a 1L water bottle beside you and sip after every over.";
    }

    if (promptLower.includes('six') || promptLower.includes('pushup')) {
      return "Awesome effort! Doing pushups after a boundaries raises your heart rate, turning IPL time into active fat-burn. Keep your elbows tucked to 45 degrees to protect your shoulders!";
    }

    return "Keep pushin' champ! Consistency is key. Tie your workout goals directly to live overs: every single run could be 1 pushup. Let's conquer CricFit Arena!";
  },

  renderQuickPrompts() {
    const qp = document.getElementById('quick-prompts');
    if (!qp) return;

    const prompts = [
      "🏏 Live Match snack replacement?",
      "💪 How to protect shoulders in pushups?",
      "🔥 Suggest a workout game based on wickets",
      "🚀 Motivation check: MI is chasing down!"
    ];

    qp.innerHTML = prompts.map(pr => `
      <button class="qp-btn" onclick="askCoach('${pr.replace("'", "\\'")}')">${pr}</button>
    `).join('');
  },

  renderPolls() {
    // Generate initial live polls
    generateDashPoll();
    generateMatchPoll();
  }
};

// Global handlers
async function askCoach(text) {
  const chatInput = document.getElementById('chat-input');
  if (chatInput) chatInput.value = text;
  sendCoachMessage();
}

async function sendCoachMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  // Add User Message
  appendChatMessage(text, 'user-msg');
  input.value = '';

  // Add Typing Indicator
  const typingId = appendChatMessage("Thinking...", 'bot-msg typing');

  // Request Gemini Response
  const prompt = `You are Coach Gemini in CricFit Arena (a platform combining live IPL cricket with fitness tracking). Provide a brief, highly motivating fitness tip, strategy, or response to the user query. Match State: MI vs CSK (MI chasing 212). User says: ${text}`;
  
  const response = await aiEngine.callGemini(prompt);
  
  // Replace Typing Indicator
  const typingEl = document.getElementById(typingId);
  if (typingEl) {
    typingEl.classList.remove('typing');
    typingEl.querySelector('.msg-bubble').innerText = response;
  }

  // Voice feedback
  if (aiEngine.speak) {
    aiEngine.speak(response);
  }
}

function appendChatMessage(text, klass) {
  const chatMsgs = document.getElementById('chat-messages');
  if (!chatMsgs) return;

  const msgId = 'msg-' + Date.now();
  const msgHtml = `
    <div class="msg ${klass}" id="${msgId}">
      <div class="msg-bubble">${text}</div>
      <div class="msg-time">Just now</div>
    </div>
  `;
  chatMsgs.insertAdjacentHTML('beforeend', msgHtml);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;

  return msgId;
}

// Generate & Render Polls
async function generateDashPoll() {
  const pollArea = document.getElementById('dash-poll-area');
  if (!pollArea) return;

  const prompt = "Generate a single multiple-choice poll question for cricket fans watching MI vs CSK, encouraging a friendly active bet (e.g. 'If Bumrah gets a wicket, what will you do?'). Format strictly as: Question? [A] Option 1 [B] Option 2 [C] Option 3";
  const rawResponse = await aiEngine.callGemini(prompt);
  renderPollUI('dash-poll-area', rawResponse);
}

async function generateMatchPoll() {
  const pollArea = document.getElementById('match-poll-area');
  if (!pollArea) return;

  const prompt = "Generate a live match poll based on wickets or sixes. Format strictly as: Question? [A] Option 1 [B] Option 2 [C] Option 3";
  const rawResponse = await aiEngine.callGemini(prompt);
  renderPollUI('match-poll-area', rawResponse);
}

function renderPollUI(elementId, pollText) {
  const container = document.getElementById(elementId);
  if (!container) return;

  // Parser
  let question = "Who will win the next over?";
  let options = ["MI starts swinging", "CSK builds pressure", "Tied battle"];

  try {
    const lines = pollText.split('\n').filter(l => l.trim() !== '');
    if (lines.length > 0) {
      question = lines[0];
      const parsedOptions = [];
      const optionMatches = pollText.match(/\[[A-C]\]\s*([^\[]+)/g);
      if (optionMatches) {
        optionMatches.forEach(opt => {
          parsedOptions.push(opt.replace(/\[[A-C]\]\s*/, '').trim());
        });
        options = parsedOptions;
      }
    }
  } catch (e) {
    console.warn("Failed to parse poll options, using default.", e);
  }

  container.innerHTML = `
    <div class="poll-q">${question}</div>
    <div class="poll-opts">
      ${options.map((opt, idx) => `
        <button class="poll-opt-btn" onclick="submitVote(this, ${idx})">
          <span>${opt}</span>
          <strong class="vote-pct" style="display:none">${35 + (idx * 12)}%</strong>
        </button>
      `).join('')}
    </div>
  `;
}

function submitVote(btn, idx) {
  const parent = btn.parentElement;
  const allBtns = parent.querySelectorAll('.poll-opt-btn');
  allBtns.forEach((b, i) => {
    b.classList.add('voted');
    const pct = b.querySelector('.vote-pct');
    if (pct) pct.style.display = 'inline';
    b.disabled = true;
  });
}
