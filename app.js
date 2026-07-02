const CIRCUMFERENCE = 2 * Math.PI * 100;

const ringProgress = document.querySelector('.ring-progress');
const timeDisplay = document.getElementById('timeDisplay');
const statusLabel = document.getElementById('statusLabel');
const presetBtns = document.querySelectorAll('.preset-btn');
const customMinutesInput = document.getElementById('customMinutes');
const customStartBtn = document.getElementById('customStartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const completeMsg = document.getElementById('completeMsg');
const sessionLogText = document.getElementById('sessionLogText');

let totalSeconds = 0;
let remainingSeconds = 0;
let endTimestamp = null;
let intervalId = null;
let isPaused = false;
let isRunning = false;

ringProgress.style.strokeDasharray = String(CIRCUMFERENCE);
ringProgress.style.strokeDashoffset = String(CIRCUMFERENCE);

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateRing() {
  const fraction = totalSeconds === 0 ? 0 : remainingSeconds / totalSeconds;
  ringProgress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - fraction));
}

function render() {
  timeDisplay.textContent = formatTime(remainingSeconds);
  updateRing();
}

function startTimer(minutes) {
  clearInterval(intervalId);
  completeMsg.classList.add('hidden');

  totalSeconds = Math.round(minutes * 60);
  remainingSeconds = totalSeconds;
  endTimestamp = Date.now() + totalSeconds * 1000;
  isPaused = false;
  isRunning = true;

  statusLabel.textContent = '집중 중이에요 🌸';
  pauseBtn.disabled = false;
  pauseBtn.textContent = '일시정지';
  resetBtn.disabled = false;

  render();
  intervalId = setInterval(tick, 250);
}

function tick() {
  if (isPaused) return;
  const remainingMs = endTimestamp - Date.now();
  remainingSeconds = Math.max(0, Math.round(remainingMs / 1000));
  render();

  if (remainingMs <= 0) {
    finishTimer();
  }
}

function finishTimer() {
  clearInterval(intervalId);
  isRunning = false;
  isPaused = false;
  remainingSeconds = 0;
  render();

  statusLabel.textContent = '시간을 선택해주세요';
  pauseBtn.disabled = true;
  resetBtn.disabled = true;

  completeMsg.classList.remove('hidden');
  playBeep();
  notifyComplete();
  recordSession(totalSeconds / 60);
}

function pauseOrResume() {
  if (!isRunning) return;

  if (!isPaused) {
    isPaused = true;
    pauseBtn.textContent = '재개';
    statusLabel.textContent = '일시정지 중이에요';
  } else {
    isPaused = false;
    endTimestamp = Date.now() + remainingSeconds * 1000;
    pauseBtn.textContent = '일시정지';
    statusLabel.textContent = '집중 중이에요 🌸';
  }
}

function resetTimer() {
  clearInterval(intervalId);
  isRunning = false;
  isPaused = false;
  totalSeconds = 0;
  remainingSeconds = 0;
  endTimestamp = null;

  statusLabel.textContent = '시간을 선택해주세요';
  pauseBtn.disabled = true;
  pauseBtn.textContent = '일시정지';
  resetBtn.disabled = true;
  completeMsg.classList.add('hidden');

  render();
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    [0, 0.3, 0.6].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
    });
  } catch (e) {
    // 오디오 재생이 불가능한 환경이면 조용히 무시
  }
}

function notifyComplete() {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification('🌸 집중 완료!', { body: '타이머가 끝났어요. 잠깐 쉬어가요~' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

function todayKey() {
  const d = new Date();
  return `focusTimer_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function recordSession(minutes) {
  const key = todayKey();
  const raw = localStorage.getItem(key);
  const data = raw ? JSON.parse(raw) : { count: 0, totalMinutes: 0 };

  data.count += 1;
  data.totalMinutes += Math.round(minutes);

  localStorage.setItem(key, JSON.stringify(data));
  renderSessionLog();
}

function renderSessionLog() {
  const raw = localStorage.getItem(todayKey());
  if (!raw) {
    sessionLogText.textContent = '오늘 아직 집중 기록이 없어요. 시작해볼까요? 🌸';
    return;
  }
  const data = JSON.parse(raw);
  sessionLogText.textContent = `오늘 ${data.count}번, 총 ${data.totalMinutes}분 집중했어요 🌸`;
}

presetBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const minutes = Number(btn.dataset.minutes);
    startTimer(minutes);
  });
});

customStartBtn.addEventListener('click', () => {
  const value = Number(customMinutesInput.value);
  if (!value || value <= 0) return;
  startTimer(Math.min(value, 180));
});

pauseBtn.addEventListener('click', pauseOrResume);
resetBtn.addEventListener('click', resetTimer);

renderSessionLog();
