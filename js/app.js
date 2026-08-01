(() => {
  "use strict";

  const STORAGE_PRIZES = "kb_wheel_prizes_v1";
  const STORAGE_HISTORY = "kb_wheel_history_v1";
  const STORAGE_MUTE = "kb_wheel_muted_v1";

  const DEFAULT_PRIZES = [
    { id: "p1", label: "10% Descuento", emoji: "🏷️", color: "#c9b6f2", weight: 18 },
    { id: "p2", label: "Envío Gratis", emoji: "🚚", color: "#8fd3f4", weight: 14 },
    { id: "p3", label: "Regalo Sorpresa", emoji: "🎁", color: "#ff9ec7", weight: 8 },
    { id: "p4", label: "5% Descuento", emoji: "🏷️", color: "#9ee8c9", weight: 20 },
    { id: "p5", label: "Sigue Intentando", emoji: "🍼", color: "#ffc3a0", weight: 20 },
    { id: "p6", label: "20% Descuento", emoji: "⭐", color: "#ffe08a", weight: 6 },
    { id: "p7", label: "Kit de Bienvenida", emoji: "🧸", color: "#b7c6f5", weight: 6 },
    { id: "p8", label: "Sorpresa KidsBabys", emoji: "🎉", color: "#f7a8c4", weight: 8 }
  ];

  /* ---------------- State ---------------- */
  let prizes = loadPrizes();
  let history = loadHistory();
  let muted = localStorage.getItem(STORAGE_MUTE) === "1";
  let currentRotation = 0;
  let spinning = false;
  let audioCtx = null;

  /* ---------------- DOM ---------------- */
  const canvas = document.getElementById("wheelCanvas");
  const ctx = canvas.getContext("2d");
  const btnSpin = document.getElementById("btnSpin");
  const btnSound = document.getElementById("btnSound");
  const iconSoundOn = document.getElementById("iconSoundOn");
  const iconSoundOff = document.getElementById("iconSoundOff");
  const btnSettings = document.getElementById("btnSettings");
  const btnHistory = document.getElementById("btnHistory");
  const btnAbout = document.getElementById("btnAbout");
  const btnResetHistory = document.getElementById("btnResetHistory");

  const prizeModal = document.getElementById("prizeModal");
  const prizeName = document.getElementById("prizeName");
  const prizeEmoji = document.getElementById("prizeEmoji");
  const confettiLayer = document.getElementById("confettiLayer");
  const btnCloseModal = document.getElementById("btnCloseModal");

  const historyModal = document.getElementById("historyModal");
  const historyList = document.getElementById("historyList");
  const btnCloseHistory = document.getElementById("btnCloseHistory");

  const settingsModal = document.getElementById("settingsModal");
  const prizeEditorList = document.getElementById("prizeEditorList");
  const btnAddPrize = document.getElementById("btnAddPrize");
  const btnSaveSettings = document.getElementById("btnSaveSettings");
  const btnRestoreDefaults = document.getElementById("btnRestoreDefaults");

  const aboutModal = document.getElementById("aboutModal");
  const btnCloseAbout = document.getElementById("btnCloseAbout");

  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------------- Persistence ---------------- */
  function loadPrizes() {
    try {
      const raw = localStorage.getItem(STORAGE_PRIZES);
      if (!raw) return structuredCloneSafe(DEFAULT_PRIZES);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
      return structuredCloneSafe(DEFAULT_PRIZES);
    } catch (e) {
      return structuredCloneSafe(DEFAULT_PRIZES);
    }
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function structuredCloneSafe(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function savePrizes() {
    localStorage.setItem(STORAGE_PRIZES, JSON.stringify(prizes));
  }

  function saveHistory() {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
  }

  /* ---------------- Audio (Web Audio API, no external files) ---------------- */
  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function playTick() {
    if (muted) return;
    try {
      const ac = getAudioCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "square";
      osc.frequency.value = 950;
      gain.gain.setValueAtTime(0.16, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.07);
    } catch (e) { /* audio unavailable in this environment, ignore */ }
  }

  function playWin() {
    if (muted) return;
    try {
      const ac = getAudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const start = ac.currentTime + i * 0.11;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch (e) { /* audio unavailable in this environment, ignore */ }
  }

  function playWhoosh() {
    if (muted) return;
    try {
      const ac = getAudioCtx();
      const bufferSize = ac.sampleRate * 0.4;
      const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const noise = ac.createBufferSource();
      noise.buffer = buffer;
      const filter = ac.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 800;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.25, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      noise.start();
    } catch (e) { /* audio unavailable in this environment, ignore */ }
  }

  function updateSoundIcon() {
    iconSoundOn.hidden = muted;
    iconSoundOff.hidden = !muted;
  }
  updateSoundIcon();

  btnSound.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem(STORAGE_MUTE, muted ? "1" : "0");
    updateSoundIcon();
    if (!muted) playTick();
  });

  /* ---------------- Wheel drawing ---------------- */
  function drawWheel() {
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 6;
    const n = prizes.length;
    const segAngle = (Math.PI * 2) / n;

    ctx.clearRect(0, 0, size, size);

    // outer ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    prizes.forEach((prize, i) => {
      const start = i * segAngle - Math.PI / 2;
      const end = start + segAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + segAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#3f2f43";
      ctx.font = "600 " + Math.round(size * 0.036) + "px 'Nunito', sans-serif";
      const label = prize.emoji ? prize.emoji + "  " + prize.label : prize.label;
      ctx.fillText(truncateLabel(ctx, label, radius * 0.86), radius * 0.92, 0);
      ctx.restore();
    });

    // center hole (visual, hub button sits above it)
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.24, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  function truncateLabel(context, text, maxWidth) {
    if (context.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && context.measureText(t + "…").width > maxWidth) {
      t = t.slice(0, -1);
    }
    return t + "…";
  }

  /* ---------------- Spin logic ---------------- */
  function weightedRandomIndex() {
    const total = prizes.reduce((s, p) => s + Math.max(0.0001, Number(p.weight) || 0), 0);
    let r = Math.random() * total;
    for (let i = 0; i < prizes.length; i++) {
      r -= Math.max(0.0001, Number(prizes[i].weight) || 0);
      if (r <= 0) return i;
    }
    return prizes.length - 1;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function spin() {
    if (spinning || prizes.length < 2) return;
    spinning = true;
    btnSpin.disabled = true;
    document.querySelector(".wheel-wrap").classList.add("spinning");

    const n = prizes.length;
    const segAngleDeg = 360 / n;
    const targetIndex = weightedRandomIndex();

    const midAngleDeg = targetIndex * segAngleDeg + segAngleDeg / 2;
    const jitter = (Math.random() - 0.5) * segAngleDeg * 0.6;
    const targetMid = midAngleDeg + jitter;

    const normalizedCurrent = ((currentRotation % 360) + 360) % 360;
    const desiredFinalNormalized = ((360 - targetMid) % 360 + 360) % 360;

    let delta = desiredFinalNormalized - normalizedCurrent;
    if (delta <= 0) delta += 360;

    const extraSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full turns
    const totalDelta = extraSpins * 360 + delta;
    const startRotation = currentRotation;
    const endRotation = currentRotation + totalDelta;

    const duration = 4200 + Math.random() * 600;
    const startTime = performance.now();

    playWhoosh();

    let lastSegCrossed = -1;

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const rotation = startRotation + totalDelta * eased;
      canvas.style.transform = `rotate(${rotation}deg)`;

      const traveled = rotation - startRotation;
      const segCrossed = Math.floor(traveled / segAngleDeg);
      if (segCrossed !== lastSegCrossed) {
        lastSegCrossed = segCrossed;
        playTick();
      }

      currentRotation = rotation;

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        currentRotation = endRotation % 360;
        canvas.style.transform = `rotate(${endRotation}deg)`;
        finishSpin(targetIndex);
      }
    }

    requestAnimationFrame(frame);
  }

  function finishSpin(index) {
    spinning = false;
    btnSpin.disabled = false;
    document.querySelector(".wheel-wrap").classList.remove("spinning");

    const prize = prizes[index];
    if (navigator.vibrate) navigator.vibrate([40, 30, 90]);
    playWin();

    const entry = { label: prize.label, emoji: prize.emoji, color: prize.color, date: new Date().toISOString() };
    history.unshift(entry);
    if (history.length > 100) history.length = 100;
    saveHistory();

    showPrizeModal(prize);
  }

  /* ---------------- Prize modal + confetti ---------------- */
  function showPrizeModal(prize) {
    prizeEmoji.textContent = prize.emoji || "🎉";
    prizeName.textContent = prize.label;
    launchConfetti();
    openModal(prizeModal);
  }

  function launchConfetti() {
    confettiLayer.innerHTML = "";
    const colors = prizes.map(p => p.color);
    const count = 40;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)] || "#ff9ec7";
      piece.style.animationDuration = 1.2 + Math.random() * 1.4 + "s";
      piece.style.animationDelay = Math.random() * 0.3 + "s";
      piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      confettiLayer.appendChild(piece);
    }
  }

  /* ---------------- Modal helpers ---------------- */
  function openModal(el) { el.classList.add("open"); }
  function closeModal(el) { el.classList.remove("open"); }

  btnCloseModal.addEventListener("click", () => closeModal(prizeModal));
  prizeModal.addEventListener("click", (e) => { if (e.target === prizeModal) closeModal(prizeModal); });

  btnCloseAbout.addEventListener("click", () => closeModal(aboutModal));
  aboutModal.addEventListener("click", (e) => { if (e.target === aboutModal) closeModal(aboutModal); });
  btnAbout.addEventListener("click", () => openModal(aboutModal));

  /* ---------------- History ---------------- */
  function renderHistory() {
    historyList.innerHTML = "";
    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">Aún no hay giros registrados.</div>';
      return;
    }
    history.forEach(entry => {
      const row = document.createElement("div");
      row.className = "history-item";
      const date = new Date(entry.date);
      row.innerHTML = `
        <span class="history-swatch" style="background:${entry.color}"></span>
        <span class="h-name">${entry.emoji || ""} ${escapeHtml(entry.label)}</span>
        <span class="h-date">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      `;
      historyList.appendChild(row);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  btnHistory.addEventListener("click", () => { renderHistory(); openModal(historyModal); });
  btnCloseHistory.addEventListener("click", () => closeModal(historyModal));
  historyModal.addEventListener("click", (e) => { if (e.target === historyModal) closeModal(historyModal); });

  btnResetHistory.addEventListener("click", () => {
    if (history.length === 0) return;
    if (confirm("¿Borrar todo el historial de premios?")) {
      history = [];
      saveHistory();
      renderHistory();
    }
  });

  /* ---------------- Settings / customization ---------------- */
  let draftPrizes = [];

  function renderPrizeEditor() {
    prizeEditorList.innerHTML = "";
    draftPrizes.forEach((prize, i) => {
      const row = document.createElement("div");
      row.className = "prize-editor-row";
      row.innerHTML = `
        <input type="color" value="${prize.color}" data-field="color" data-index="${i}">
        <input type="text" value="${escapeAttr(prize.label)}" maxlength="24" placeholder="Nombre del premio" data-field="label" data-index="${i}">
        <input type="number" value="${prize.weight}" min="1" max="100" title="Probabilidad relativa" data-field="weight" data-index="${i}">
        <button type="button" class="del-row" data-index="${i}" title="Eliminar">✕</button>
      `;
      prizeEditorList.appendChild(row);
    });

    prizeEditorList.querySelectorAll("input").forEach(input => {
      input.addEventListener("input", (e) => {
        const idx = Number(e.target.dataset.index);
        const field = e.target.dataset.field;
        draftPrizes[idx][field] = field === "weight" ? Number(e.target.value) : e.target.value;
      });
    });

    prizeEditorList.querySelectorAll(".del-row").forEach(btn => {
      btn.addEventListener("click", (e) => {
        if (draftPrizes.length <= 2) {
          alert("Debe haber al menos 2 premios en la ruleta.");
          return;
        }
        const idx = Number(e.target.dataset.index);
        draftPrizes.splice(idx, 1);
        renderPrizeEditor();
      });
    });
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }

  const PALETTE = ["#ff9ec7", "#8fd3f4", "#c9b6f2", "#9ee8c9", "#ffe08a", "#ffc3a0", "#b7c6f5", "#f7a8c4"];

  btnSettings.addEventListener("click", () => {
    draftPrizes = structuredCloneSafe(prizes);
    renderPrizeEditor();
    openModal(settingsModal);
  });

  settingsModal.addEventListener("click", (e) => { if (e.target === settingsModal) closeModal(settingsModal); });

  btnAddPrize.addEventListener("click", () => {
    if (draftPrizes.length >= 12) {
      alert("Máximo 12 premios por ruleta.");
      return;
    }
    draftPrizes.push({
      id: "p" + Date.now(),
      label: "Nuevo premio",
      emoji: "🎁",
      color: PALETTE[draftPrizes.length % PALETTE.length],
      weight: 10
    });
    renderPrizeEditor();
  });

  btnRestoreDefaults.addEventListener("click", () => {
    if (confirm("Esto restaurará los premios predeterminados de KidsBabys. ¿Continuar?")) {
      draftPrizes = structuredCloneSafe(DEFAULT_PRIZES);
      renderPrizeEditor();
    }
  });

  btnSaveSettings.addEventListener("click", () => {
    const cleaned = draftPrizes
      .map(p => ({
        id: p.id,
        label: (p.label || "").trim() || "Premio",
        emoji: p.emoji || "🎁",
        color: p.color || "#ff9ec7",
        weight: Math.max(1, Number(p.weight) || 1)
      }));

    if (cleaned.length < 2) {
      alert("Debe haber al menos 2 premios.");
      return;
    }

    prizes = cleaned;
    savePrizes();
    drawWheel();
    closeModal(settingsModal);
  });

  /* ---------------- Spin trigger ---------------- */
  btnSpin.addEventListener("click", spin);

  /* ---------------- Init ---------------- */
  drawWheel();
})();
