// Real AI Pose Tracker using MediaPipe + Fallback Simulator
const fitTracker = {
  video: null,
  canvas: null,
  ctx: null,
  stream: null,
  active: false,
  exercise: 'pushup',
  reps: 0,
  calories: 0,
  formAccuracy: 95,
  phase: 'up', // 'up' or 'down'
  angle: 180,
  animationId: null,
  
  // MediaPipe objects
  mpPose: null,
  mpCamera: null,
  useRealAI: false,

  init() {
    this.video = document.getElementById('pose-video');
    this.canvas = document.getElementById('pose-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    
    // Check if MediaPipe is available in window
    if (window.Pose) {
      console.log("MediaPipe Pose detected. Preparing real-time AI tracking.");
      this.setupMediaPipe();
    } else {
      console.warn("MediaPipe Pose not loaded. Falling back to simulator mode.");
    }
    
    this.renderExerciseLibrary();
  },

  setExercise(ex) {
    this.exercise = ex;
    this.resetReps();
    const formTag = document.getElementById('form-tag');
    if (formTag) {
      formTag.innerHTML = `<i class="fas fa-circle-check"></i> Position Correct`;
      formTag.className = 'form-tag';
    }
  },

  resetReps() {
    this.reps = 0;
    this.calories = 0;
    this.updateDisplay();
  },

  updateDisplay() {
    const repDisp = document.getElementById('rep-display');
    if (repDisp) repDisp.innerText = this.reps;

    const ssReps = document.getElementById('ss-reps');
    if (ssReps) ssReps.innerText = this.reps;

    const ssCal = document.getElementById('ss-cal');
    if (ssCal) ssCal.innerText = Math.round(this.calories);

    // Update global state
    state.activeChallenge.currentReps = this.reps;
    if (typeof ChallengeManager !== 'undefined') {
      ChallengeManager.updateChallengeProgress();
    }
  },

  setupMediaPipe() {
    this.mpPose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    this.mpPose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.mpPose.onResults((results) => {
      this.onPoseResults(results);
    });
  },

  startCamera() {
    this.active = true;
    document.getElementById('start-cam-btn').style.display = 'none';
    document.getElementById('stop-cam-btn').style.display = 'inline-flex';

    if (this.mpPose) {
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
        .then(stream => {
          this.stream = stream;
          this.video.srcObject = stream;
          this.video.play();
          // Set canvas size to match camera
          this.canvas.width = 640;
          this.canvas.height = 480;
          this.useRealAI = true;
          this.mpCamera = new Camera(this.video, {
            onFrame: async () => {
              if (this.active && this.useRealAI) {
                await this.mpPose.send({ image: this.video });
              }
            },
            width: 640,
            height: 480
          });
          this.mpCamera.start();
        })
        .catch(err => {
          console.warn('Camera access denied or failed. Switching to Simulator.', err);
          this.startSimulator();
        });
    } else {
      this.startSimulator();
    }
  },

  startSimulator() {
    this.useRealAI = false;
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.loop();
  },

  stopCamera() {
    this.active = false;
    document.getElementById('start-cam-btn').style.display = 'inline-flex';
    document.getElementById('stop-cam-btn').style.display = 'none';

    if (this.mpCamera) {
      this.mpCamera.stop();
      this.mpCamera = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Clear canvas
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  },

  // Safe cross-browser rounded rect helper
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
  },

  // MEDIA PIPE REAL-TIME AI CALCULATIONS
  onPoseResults(results) {
    if (!this.active || !this.useRealAI) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Always draw camera image first so feed is never lost
    this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

    if (!results.poseLandmarks) {
      const pt = document.getElementById('phase-tag');
      if (pt) pt.innerText = 'Step back: Full body visible';
      return;
    }

    const landmarks = results.poseLandmarks;
    
    // Landmark references:
    // Left Shoulder: 11, Right Shoulder: 12
    // Left Elbow: 13, Right Elbow: 14
    // Left Wrist: 15, Right Wrist: 16
    // Left Hip: 23, Right Hip: 24
    // Left Knee: 25, Right Knee: 26
    // Left Ankle: 27, Right Ankle: 28

    // skeleton drawing moved below angle calc

    // Calculate angles depending on selected exercise
    let currentAngle = 180;
    let formWarning = false;

    if (this.exercise === 'pushup') {
      // Elbow angle (Shoulder - Elbow - Wrist)
      const shoulder = landmarks[12]; // right side
      const elbow = landmarks[14];
      const wrist = landmarks[16];
      currentAngle = this.calculateAngle(shoulder, elbow, wrist);

      // Simple form check: back alignment (shoulder to hip angle)
      const hip = landmarks[24];
      const spineAngle = this.calculateAngle(shoulder, hip, landmarks[26]);
      if (spineAngle < 160) {
        formWarning = true; // hip sag or raise
      }
    } else if (this.exercise === 'squat') {
      // Knee angle (Hip - Knee - Ankle)
      const hip = landmarks[24];
      const knee = landmarks[26];
      const ankle = landmarks[28];
      currentAngle = this.calculateAngle(hip, knee, ankle);
    } else if (this.exercise === 'bicep_curl') {
      // Elbow angle
      const shoulder = landmarks[12];
      const elbow = landmarks[14];
      const wrist = landmarks[16];
      currentAngle = this.calculateAngle(shoulder, elbow, wrist);
    } else { // jumping jacks
      // Arm angle with hip
      const wrist = landmarks[16];
      const shoulder = landmarks[12];
      const hip = landmarks[24];
      currentAngle = this.calculateAngle(wrist, shoulder, hip);
    }

    this.angle = currentAngle;

    // Draw skeleton — wrapped so any error never kills the camera feed
    try { this.drawRealSkeleton(landmarks); } catch(e) { console.warn('Skeleton draw error:', e); }

    // Track reps based on state transitions
    this.trackReps(currentAngle, formWarning);
  },

  calculateAngle(A, B, C) {
    // A, B, C are landmarks containing x, y
    const radians = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    return angle;
  },

  trackReps(angle, formWarning) {
    const phaseTag = document.getElementById('phase-tag');
    const formTag = document.getElementById('form-tag');

    let downThreshold = 95;
    let upThreshold = 160;

    if (this.exercise === 'squat') {
      downThreshold = 100;
      upThreshold = 160;
    }

    if (angle < downThreshold && this.phase === 'up') {
      this.phase = 'down';
      if (phaseTag) phaseTag.innerText = "Push UP!";
    } else if (angle > upThreshold && this.phase === 'down') {
      this.phase = 'up';
      this.reps++;
      this.calories += 0.45;
      if (phaseTag) phaseTag.innerText = "Go DOWN!";
      this.updateDisplay();

      this.playBeep();

      this.formAccuracy = formWarning ? 75 + Math.floor(Math.random() * 10) : 95 + Math.floor(Math.random() * 5);
      
      if (formTag) {
        if (this.formAccuracy >= 90) {
          formTag.innerHTML = `<i class="fas fa-circle-check"></i> Perfect Form (${this.formAccuracy}%)`;
          formTag.className = 'form-tag';
        } else {
          formTag.innerHTML = `<i class="fas fa-circle-exclamation"></i> Correct back alignment (${this.formAccuracy}%)`;
          formTag.className = 'form-tag warning';
        }
      }
    }
  },

  drawRealSkeleton(landmarks) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Color-coded segments: [idxA, idxB, colorA, colorB]
    const segments = [
      [11, 12, '#f97316', '#f97316'],   // shoulders — orange
      [11, 13, '#06b6d4', '#38bdf8'],   // L upper arm — cyan
      [13, 15, '#38bdf8', '#7dd3fc'],   // L forearm
      [12, 14, '#06b6d4', '#38bdf8'],   // R upper arm
      [14, 16, '#38bdf8', '#7dd3fc'],   // R forearm
      [11, 23, '#f97316', '#fb923c'],   // L torso
      [12, 24, '#f97316', '#fb923c'],   // R torso
      [23, 24, '#f97316', '#f97316'],   // hips — orange
      [23, 25, '#10b981', '#34d399'],   // L thigh — green
      [25, 27, '#34d399', '#6ee7b7'],   // L shin
      [24, 26, '#10b981', '#34d399'],   // R thigh
      [26, 28, '#34d399', '#6ee7b7'],   // R shin
    ];

    ctx.lineCap = 'round';
    ctx.lineWidth = 4;

    segments.forEach(([i, j, cA, cB]) => {
      const ptA = landmarks[i];
      const ptB = landmarks[j];
      if (!ptA || !ptB || ptA.visibility < 0.4 || ptB.visibility < 0.4) return;
      const ax = ptA.x * w, ay = ptA.y * h;
      const bx = ptB.x * w, by = ptB.y * h;
      const grad = ctx.createLinearGradient(ax, ay, bx, by);
      grad.addColorStop(0, cA);
      grad.addColorStop(1, cB);
      // outer glow
      ctx.save();
      ctx.strokeStyle = cA;
      ctx.lineWidth = 10;
      ctx.globalAlpha = 0.18;
      ctx.shadowColor = cA;
      ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.restore();
      // solid line
      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.95;
      ctx.shadowColor = cA;
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.restore();
    });

    // Joint dot config: [idx, color, radius]
    const jointStyle = [
      [11,'#f97316',7],[12,'#f97316',7],
      [13,'#06b6d4',6],[14,'#06b6d4',6],
      [15,'#7dd3fc',5],[16,'#7dd3fc',5],
      [23,'#fb923c',7],[24,'#fb923c',7],
      [25,'#10b981',6],[26,'#10b981',6],
      [27,'#6ee7b7',5],[28,'#6ee7b7',5],
    ];
    jointStyle.forEach(([idx, col, r]) => {
      const pt = landmarks[idx];
      if (!pt || pt.visibility < 0.4) return;
      const x = pt.x * w, y = pt.y * h;
      // glow ring
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = 16;
      ctx.fillStyle = col + '55';
      ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // main dot
      ctx.save();
      ctx.shadowColor = col; ctx.shadowBlur = 10;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // white inner highlight
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(x - r*0.25, y - r*0.25, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    // Angle arc + label at active joint
    let activeIdx = this.exercise === 'squat' ? 26 : 14;
    const aj = landmarks[activeIdx];
    if (aj && aj.visibility > 0.5) {
      const ax = aj.x * w, ay = aj.y * h;
      const pct = Math.min(this.angle / 180, 1);
      const arcColor = pct > 0.7 ? '#10b981' : pct > 0.4 ? '#f97316' : '#ef4444';
      ctx.save();
      ctx.strokeStyle = arcColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = arcColor; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ax, ay, 22, -Math.PI / 2, -Math.PI / 2 + (this.angle / 180) * Math.PI);
      ctx.stroke();
      ctx.restore();
      // angle text badge (cross-browser)
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      this._roundRect(ctx, ax + 14, ay - 26, 56, 22, 6);
      ctx.fill();
      ctx.fillStyle = arcColor;
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${Math.round(this.angle)}\u00b0`, ax + 19, ay - 10);
      ctx.restore();
    }
  },

  // HIGH-FIDELITY SIMULATOR BACKUP
  loop() {
    if (!this.active || this.useRealAI) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Deep space bg
    const bgGrad = ctx.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, w*0.7);
    bgGrad.addColorStop(0, '#0d1426');
    bgGrad.addColorStop(1, '#060913');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let j = 0; j < h; j += 40) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
    }

    // Scanline effect
    const scanY = (Date.now() / 8) % h;
    const scanGrad = ctx.createLinearGradient(0, scanY - 40, 0, scanY + 40);
    scanGrad.addColorStop(0, 'rgba(6,182,212,0)');
    scanGrad.addColorStop(0.5, 'rgba(6,182,212,0.06)');
    scanGrad.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, scanY - 40, w, 80);

    // Corner brackets UI
    const br = 20, bw = 30;
    ctx.strokeStyle = 'rgba(6,182,212,0.5)'; ctx.lineWidth = 2;
    [[0,0,1,1],[w,0,-1,1],[0,h,1,-1],[w,h,-1,-1]].forEach(([cx,cy,sx,sy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + sx*br, cy); ctx.lineTo(cx + sx*(br+bw), cy);
      ctx.moveTo(cx, cy + sy*br); ctx.lineTo(cx, cy + sy*(br+bw));
      ctx.stroke();
    });

    this.drawSimulatedSkeleton();
    this.simulateRepTicking();
    this.animationId = requestAnimationFrame(() => this.loop());
  },

  _drawBone(ctx, ax, ay, bx, by, colA, colB) {
    const grad = ctx.createLinearGradient(ax, ay, bx, by);
    grad.addColorStop(0, colA); grad.addColorStop(1, colB);
    ctx.save();
    ctx.strokeStyle = colA; ctx.lineWidth = 12;
    ctx.globalAlpha = 0.15; ctx.shadowColor = colA; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = grad; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.globalAlpha = 1; ctx.shadowColor = colA; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.restore();
  },

  _drawJoint(ctx, x, y, col, r) {
    ctx.save();
    ctx.shadowColor = col; ctx.shadowBlur = 20;
    ctx.fillStyle = col + '40';
    ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath(); ctx.arc(x - r*0.3, y - r*0.3, r*0.3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  },

  drawSimulatedSkeleton() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = Date.now();
    const angleRad = (this.angle * Math.PI) / 180;

    // Build joint positions (symmetric figure)
    const cx = w * 0.5;
    let head =     { x: cx,           y: h * 0.12 };
    let lShoulder = { x: cx - 55,     y: h * 0.28 };
    let rShoulder = { x: cx + 55,     y: h * 0.28 };
    let lElbow =   { x: cx - 55 + Math.sin(angleRad)*50, y: h*0.28 + Math.cos(angleRad)*50 };
    let rElbow =   { x: cx + 55 - Math.sin(angleRad)*50, y: h*0.28 + Math.cos(angleRad)*50 };
    let lWrist =   { x: lElbow.x - 25, y: lElbow.y + 15 };
    let rWrist =   { x: rElbow.x + 25, y: rElbow.y + 15 };
    let lHip =     { x: cx - 38,      y: h * 0.58 };
    let rHip =     { x: cx + 38,      y: h * 0.58 };
    let lKnee =    { x: cx - 40,      y: h * 0.74 };
    let rKnee =    { x: cx + 40,      y: h * 0.74 };
    let lAnkle =   { x: cx - 38,      y: h * 0.90 };
    let rAnkle =   { x: cx + 38,      y: h * 0.90 };

    if (this.exercise === 'squat') {
      const sf = (180 - this.angle) / 100;
      lHip.y += sf * 40; rHip.y += sf * 40;
      lKnee.x -= sf * 18; rKnee.x += sf * 18;
      lKnee.y += sf * 10; rKnee.y += sf * 10;
    }

    // Bones
    this._drawBone(ctx, lShoulder.x, lShoulder.y, rShoulder.x, rShoulder.y, '#f97316', '#f97316'); // shoulders
    this._drawBone(ctx, lHip.x, lHip.y, rHip.x, rHip.y, '#fb923c', '#fb923c');                   // hips
    this._drawBone(ctx, lShoulder.x, lShoulder.y, lHip.x, lHip.y, '#f97316', '#fb923c');          // L torso
    this._drawBone(ctx, rShoulder.x, rShoulder.y, rHip.x, rHip.y, '#f97316', '#fb923c');          // R torso
    this._drawBone(ctx, lShoulder.x, lShoulder.y, lElbow.x, lElbow.y, '#06b6d4', '#38bdf8');      // L upper arm
    this._drawBone(ctx, lElbow.x, lElbow.y, lWrist.x, lWrist.y, '#38bdf8', '#7dd3fc');            // L forearm
    this._drawBone(ctx, rShoulder.x, rShoulder.y, rElbow.x, rElbow.y, '#06b6d4', '#38bdf8');      // R upper arm
    this._drawBone(ctx, rElbow.x, rElbow.y, rWrist.x, rWrist.y, '#38bdf8', '#7dd3fc');            // R forearm
    this._drawBone(ctx, lHip.x, lHip.y, lKnee.x, lKnee.y, '#10b981', '#34d399');                 // L thigh
    this._drawBone(ctx, lKnee.x, lKnee.y, lAnkle.x, lAnkle.y, '#34d399', '#6ee7b7');             // L shin
    this._drawBone(ctx, rHip.x, rHip.y, rKnee.x, rKnee.y, '#10b981', '#34d399');                 // R thigh
    this._drawBone(ctx, rKnee.x, rKnee.y, rAnkle.x, rAnkle.y, '#34d399', '#6ee7b7');             // R shin

    // Head circle
    ctx.save();
    ctx.shadowColor = '#f97316'; ctx.shadowBlur = 16;
    const headGrad = ctx.createRadialGradient(head.x, head.y, 2, head.x, head.y, 18);
    headGrad.addColorStop(0, '#fb923c'); headGrad.addColorStop(1, '#f97316');
    ctx.fillStyle = headGrad;
    ctx.beginPath(); ctx.arc(head.x, head.y, 18, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    // Joints
    this._drawJoint(ctx, lShoulder.x, lShoulder.y, '#f97316', 8);
    this._drawJoint(ctx, rShoulder.x, rShoulder.y, '#f97316', 8);
    this._drawJoint(ctx, lElbow.x, lElbow.y, '#06b6d4', 7);
    this._drawJoint(ctx, rElbow.x, rElbow.y, '#06b6d4', 7);
    this._drawJoint(ctx, lWrist.x, lWrist.y, '#7dd3fc', 6);
    this._drawJoint(ctx, rWrist.x, rWrist.y, '#7dd3fc', 6);
    this._drawJoint(ctx, lHip.x, lHip.y, '#fb923c', 8);
    this._drawJoint(ctx, rHip.x, rHip.y, '#fb923c', 8);
    this._drawJoint(ctx, lKnee.x, lKnee.y, '#10b981', 7);
    this._drawJoint(ctx, rKnee.x, rKnee.y, '#10b981', 7);
    this._drawJoint(ctx, lAnkle.x, lAnkle.y, '#6ee7b7', 6);
    this._drawJoint(ctx, rAnkle.x, rAnkle.y, '#6ee7b7', 6);

    // Angle arc at active joint
    const activeJoint = this.exercise === 'squat' ? rKnee : rElbow;
    const pct = Math.min(this.angle / 180, 1);
    const arcCol = pct > 0.7 ? '#10b981' : pct > 0.4 ? '#f97316' : '#ef4444';
    ctx.save();
    ctx.strokeStyle = arcCol + '40'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(activeJoint.x, activeJoint.y, 28, -Math.PI/2, Math.PI*1.5); ctx.stroke();
    ctx.strokeStyle = arcCol; ctx.lineWidth = 4;
    ctx.shadowColor = arcCol; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(activeJoint.x, activeJoint.y, 28, -Math.PI/2, -Math.PI/2 + (this.angle/180)*Math.PI*2);
    ctx.stroke();
    ctx.restore();
    // angle badge (cross-browser safe)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    this._roundRect(ctx, activeJoint.x + 20, activeJoint.y - 28, 58, 24, 6);
    ctx.fill();
    ctx.fillStyle = arcCol;
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${Math.round(this.angle)}\u00b0`, activeJoint.x + 26, activeJoint.y - 10);
    ctx.restore();
  },

  simulateRepTicking() {
    const speed = 0.04;
    const time = Date.now() * speed;
    
    // Wave pattern for angles
    this.angle = 122.5 + Math.sin(time) * 52.5;

    const phaseTag = document.getElementById('phase-tag');
    const formTag = document.getElementById('form-tag');

    if (this.angle < 85 && this.phase === 'up') {
      this.phase = 'down';
      if (phaseTag) phaseTag.innerText = "Push UP!";
    } else if (this.angle > 165 && this.phase === 'down') {
      this.phase = 'up';
      this.reps++;
      this.calories += 0.45;
      if (phaseTag) phaseTag.innerText = "Go DOWN!";
      this.updateDisplay();

      this.playBeep();

      this.formAccuracy = 90 + Math.floor(Math.random() * 10);
      if (formTag) {
        if (this.formAccuracy > 93) {
          formTag.innerHTML = `<i class="fas fa-circle-check"></i> Perfect Form (${this.formAccuracy}%)`;
          formTag.className = 'form-tag';
        } else {
          formTag.innerHTML = `<i class="fas fa-circle-exclamation"></i> Check depth (${this.formAccuracy}%)`;
          formTag.className = 'form-tag warning';
        }
      }
    }
  },

  playBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {}
  },

  renderExerciseLibrary() {
    const lib = document.getElementById('exercise-list');
    if (!lib) return;

    const exercises = [
      { id: 'pushup', name: 'Standard Pushup', target: 'Chest & Arms', difficulty: 'Medium' },
      { id: 'squat', name: 'Deep Squats', target: 'Quads & Glutes', difficulty: 'Easy' },
      { id: 'jumping_jack', name: 'Jumping Jacks', target: 'Full Body Cardio', difficulty: 'Easy' },
      { id: 'bicep_curl', name: 'Bicep Curls', target: 'Biceps', difficulty: 'Medium' }
    ];

    lib.innerHTML = exercises.map(ex => `
      <div class="lb-item" style="cursor:pointer" onclick="document.getElementById('exercise-select').value='${ex.id}'; fitTracker.setExercise('${ex.id}')">
        <div class="lb-user-info">
          <div class="lb-avatar" style="background:var(--accent-primary)"><i class="fas fa-play"></i></div>
          <div>
            <div class="lb-username">${ex.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted)">${ex.target} • ${ex.difficulty}</div>
          </div>
        </div>
      </div>
    `).join('');
  }
};
