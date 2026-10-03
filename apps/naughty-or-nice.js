(function () {
  var KEY = "naughty-or-nice";
  var HOLD_MS = 3000;
  var MODES = ["nice", "naughty", "naughty-then-nice", "random"];
  var LINES = [
    "Checking Santa's list...",
    "Warming up the reindeer...",
    "Counting cookies...",
    "Asking the elves...",
    "Looking for kind deeds..."
  ];

  var settings = load();
  var phase = "idle";
  var activePointer = null;
  var suppressClick = false;
  var doneTimer = 0;
  var lineTimer = 0;
  var tickTimer = 0;
  var raf = 0;
  var startedAt = 0;
  var audioCtx = null;
  var logoTimer = 0;
  var logoStart = null;
  var cornerTaps = 0;
  var cornerTimer = 0;

  var corner = document.getElementById("corner");
  var logo = document.getElementById("logo");
  var muteBtn = document.getElementById("mute");
  var scanScreen = document.getElementById("scan-screen");
  var resultScreen = document.getElementById("result-screen");
  var statusEl = document.getElementById("status");
  var meter = document.getElementById("meter");
  var meterFill = document.getElementById("meter-fill");
  var pad = document.getElementById("pad");
  var fx = document.getElementById("fx");
  var artNice = document.getElementById("art-nice");
  var artNaughty = document.getElementById("art-naughty");
  var resultTitle = document.getElementById("result-title");
  var resultName = document.getElementById("result-name");
  var kiddingBtn = document.getElementById("kidding");
  var againBtn = document.getElementById("again");
  var parents = document.getElementById("parents");
  var nameInput = document.getElementById("kid-name");
  var doneBtn = document.getElementById("done");

  function load() {
    var data = { mode: "random", name: "", muted: false };
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return data;
      var parsed = JSON.parse(raw);
      if (MODES.indexOf(parsed.mode) !== -1) data.mode = parsed.mode;
      if (typeof parsed.name === "string") data.name = parsed.name.trim().slice(0, 40);
      data.muted = !!parsed.muted;
    } catch (err) {}
    return data;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch (err) {}
  }

  function renderMute() {
    muteBtn.textContent = settings.muted ? "Muted" : "Sound";
    muteBtn.setAttribute("aria-pressed", settings.muted ? "true" : "false");
    muteBtn.setAttribute("aria-label", settings.muted ? "Sound is off" : "Sound is on");
  }

  function syncForm() {
    var input = document.querySelector('input[name="mode"][value="' + settings.mode + '"]');
    if (input) input.checked = true;
    nameInput.value = settings.name;
  }

  function beep(freq, dur) {
    if (settings.muted) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var now = audioCtx.currentTime;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch (err) {}
  }

  function buzz(pattern) {
    if (settings.muted) return;
    if (typeof navigator.vibrate !== "function") return;
    try { navigator.vibrate(pattern); } catch (err) {}
  }

  function stopBuzz() {
    if (typeof navigator.vibrate !== "function") return;
    try { navigator.vibrate(0); } catch (err) {}
  }

  function chimeNice() {
    [523, 659, 784, 1047].forEach(function (freq, index) {
      window.setTimeout(function () { beep(freq, 0.16); }, index * 110);
    });
    buzz([24, 36, 24]);
  }

  function chimeNaughty() {
    beep(392, 0.12);
    window.setTimeout(function () { beep(330, 0.14); }, 130);
    buzz(14);
  }

  function resetMeter() {
    meterFill.style.width = "0%";
    meter.setAttribute("aria-valuenow", "0");
  }

  function clearScanTimers() {
    window.clearTimeout(doneTimer);
    window.clearInterval(lineTimer);
    window.clearInterval(tickTimer);
    window.cancelAnimationFrame(raf);
  }

  function clearFx() {
    fx.replaceChildren();
  }

  function fillFx() {
    var colors = ["#c0392b", "#f0c14a", "#fff6e4", "#1f8a4c", "#f08a80"];
    var piece;
    var i;
    clearFx();
    for (i = 0; i < 16; i += 1) {
      piece = document.createElement("span");
      piece.className = i % 3 === 0 ? "snow flake" : "snow";
      if (i % 3 === 0) piece.textContent = "❄";
      piece.style.left = ((i * 17) % 100) + "%";
      piece.style.animationDuration = (3.2 + (i % 5) * 0.45) + "s";
      piece.style.animationDelay = (-(i % 8) * 0.35) + "s";
      fx.appendChild(piece);
    }
    for (i = 0; i < 28; i += 1) {
      piece = document.createElement("span");
      piece.className = "confetti";
      piece.style.left = ((i * 13) % 100) + "%";
      piece.style.background = colors[i % colors.length];
      piece.style.width = (6 + (i % 4) * 2) + "px";
      piece.style.height = (9 + (i % 3) * 4) + "px";
      piece.style.animationDuration = (2.4 + (i % 4) * 0.35) + "s";
      piece.style.animationDelay = (-(i % 10) * 0.22) + "s";
      fx.appendChild(piece);
    }
  }

  function renderOutcome(outcome) {
    var showNice = outcome === "nice";
    document.body.classList.toggle("is-nice", showNice);
    document.body.classList.toggle("is-naughty", !showNice);
    artNice.hidden = !showNice;
    artNaughty.hidden = showNice;
    kiddingBtn.hidden = outcome !== "naughty-then-nice";
    resultScreen.dataset.outcome = outcome;
    if (showNice) {
      resultTitle.textContent = "You're on the NICE list!";
      resultTitle.classList.remove("is-long");
      if (settings.name) {
        resultName.hidden = false;
        resultName.textContent = settings.name;
      } else {
        resultName.hidden = true;
        resultName.textContent = "";
      }
      fillFx();
      chimeNice();
    } else {
      resultTitle.textContent = "Hmm... a little naughty. Santa says there's still time!";
      resultTitle.classList.add("is-long");
      resultName.hidden = true;
      resultName.textContent = "";
      clearFx();
      chimeNaughty();
    }
  }

  function pickOutcome(mode) {
    if (mode === "nice" || mode === "naughty" || mode === "naughty-then-nice") return mode;
    var roll = Math.random();
    if (roll < 1 / 3) return "nice";
    if (roll < 2 / 3) return "naughty";
    return "naughty-then-nice";
  }

  function frame(now) {
    if (phase !== "scanning") return;
    var pct = Math.min(100, ((now - startedAt) / HOLD_MS) * 100);
    meterFill.style.width = pct + "%";
    meter.setAttribute("aria-valuenow", String(Math.round(pct)));
    if (pct < 100) raf = window.requestAnimationFrame(frame);
  }

  function finishScan() {
    if (phase !== "scanning") return;
    phase = "result";
    if (activePointer !== null) suppressClick = true;
    clearScanTimers();
    stopBuzz();
    pad.classList.remove("is-scanning");
    meterFill.style.width = "100%";
    meter.setAttribute("aria-valuenow", "100");
    scanScreen.hidden = true;
    resultScreen.hidden = false;
    renderOutcome(pickOutcome(settings.mode));
  }

  function cancelScan() {
    if (phase !== "scanning") return;
    phase = "idle";
    clearScanTimers();
    stopBuzz();
    pad.classList.remove("is-scanning");
    resetMeter();
    statusEl.textContent = "Let go too soon. Press and hold to try again.";
  }

  function startScan() {
    if (phase !== "idle") return;
    phase = "scanning";
    pad.classList.add("is-scanning");
    statusEl.textContent = LINES[0];
    resetMeter();
    startedAt = performance.now();
    raf = window.requestAnimationFrame(frame);
    doneTimer = window.setTimeout(finishScan, HOLD_MS);
    var line = 0;
    lineTimer = window.setInterval(function () {
      line = (line + 1) % LINES.length;
      statusEl.textContent = LINES[line];
    }, 800);
    var notes = [523, 587, 659, 698, 784];
    var step = 0;
    beep(notes[0], 0.07);
    buzz(12);
    tickTimer = window.setInterval(function () {
      step += 1;
      beep(notes[step % notes.length], 0.07);
      buzz(12);
    }, 450);
  }

  function onPadDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (activePointer !== null) return;
    activePointer = event.pointerId;
    try { pad.setPointerCapture(event.pointerId); } catch (err) {}
    startScan();
  }

  function onPadUp(event) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    if (phase === "scanning") cancelScan();
    window.setTimeout(function () { suppressClick = false; }, 0);
  }

  document.addEventListener("click", function (event) {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  pad.addEventListener("pointerdown", onPadDown);
  pad.addEventListener("pointerup", onPadUp);
  pad.addEventListener("pointercancel", onPadUp);
  pad.addEventListener("contextmenu", function (event) { event.preventDefault(); });
  pad.addEventListener("keydown", function (event) {
    if (event.repeat) return;
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    startScan();
  });
  pad.addEventListener("keyup", function (event) {
    if (event.key !== " " && event.key !== "Enter") return;
    if (phase === "scanning") cancelScan();
  });

  againBtn.addEventListener("click", function () {
    phase = "idle";
    activePointer = null;
    resultScreen.hidden = true;
    delete resultScreen.dataset.outcome;
    scanScreen.hidden = false;
    document.body.classList.remove("is-nice", "is-naughty");
    clearFx();
    resetMeter();
    artNice.hidden = true;
    artNaughty.hidden = true;
    kiddingBtn.hidden = true;
    resultName.hidden = true;
    statusEl.textContent = "Press and hold the pad";
    pad.focus();
  });

  kiddingBtn.addEventListener("click", function () {
    renderOutcome("nice");
  });

  muteBtn.addEventListener("click", function () {
    settings.muted = !settings.muted;
    save();
    renderMute();
    if (settings.muted) stopBuzz();
  });

  function openParents() {
    if (phase === "scanning") cancelScan();
    syncForm();
    if (typeof parents.showModal === "function") {
      if (!parents.open) parents.showModal();
    } else {
      parents.setAttribute("open", "");
    }
  }

  logo.addEventListener("pointerdown", function (event) {
    if (event.button !== undefined && event.button !== 0) return;
    logoStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    try { logo.setPointerCapture(event.pointerId); } catch (err) {}
    logoTimer = window.setTimeout(function () {
      logoTimer = 0;
      openParents();
    }, 700);
  });

  function endLogo(event) {
    if (!logoStart || event.pointerId !== logoStart.id) return;
    window.clearTimeout(logoTimer);
    logoTimer = 0;
    logoStart = null;
  }

  logo.addEventListener("pointerup", endLogo);
  logo.addEventListener("pointercancel", endLogo);
  logo.addEventListener("pointermove", function (event) {
    if (!logoStart || event.pointerId !== logoStart.id) return;
    var dx = event.clientX - logoStart.x;
    var dy = event.clientY - logoStart.y;
    if (dx * dx + dy * dy > 144) endLogo(event);
  });
  logo.addEventListener("contextmenu", function (event) { event.preventDefault(); });

  corner.addEventListener("pointerup", function () {
    cornerTaps += 1;
    window.clearTimeout(cornerTimer);
    cornerTimer = window.setTimeout(function () { cornerTaps = 0; }, 1200);
    if (cornerTaps >= 3) {
      cornerTaps = 0;
      window.clearTimeout(cornerTimer);
      openParents();
    }
  });

  document.querySelectorAll('input[name="mode"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (!input.checked) return;
      if (MODES.indexOf(input.value) === -1) return;
      settings.mode = input.value;
      save();
    });
  });

  nameInput.addEventListener("input", function () {
    settings.name = nameInput.value.trim().slice(0, 40);
    save();
  });
  nameInput.addEventListener("blur", function () {
    nameInput.value = settings.name;
  });

  doneBtn.addEventListener("click", function () {
    settings.name = nameInput.value.trim().slice(0, 40);
    save();
    nameInput.value = settings.name;
    if (typeof parents.close === "function") parents.close();
    else parents.removeAttribute("open");
  });

  renderMute();
  syncForm();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("naughty-or-nice-sw.js", {
      scope: "naughty-or-nice.html",
      updateViaCache: "none"
    }).catch(function () {});
  }
})();
