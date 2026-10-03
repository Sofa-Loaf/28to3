(function () {
  var KEY = "naughty-or-nice";
  var HOLD_MS = 3000;
  var MODES = ["nice", "naughty", "naughty-then-nice", "random"];
  var LOG_LINES = [
    "NPOS v24.12 // NORTH POLE OPERATING SYSTEM",
    "ELF-7 AUTHENTICATING THUMBPRINT...",
    "CROSS-CHECKING SANTA DATABASE (2,184,000,000 RECORDS)",
    "COOKIE-SHARING INDEX: 98%",
    "CHECKING LIST... CHECKING IT TWICE...",
    "RESULT VERIFIED BY HEAD ELF"
  ];

  var settings = load();
  var phase = "idle";
  var activePointer = null;
  var suppressClick = false;
  var doneTimer = 0;
  var tickTimer = 0;
  var raf = 0;
  var startedAt = 0;
  var audioCtx = null;
  var logoTimer = 0;
  var logoStart = null;
  var cornerTaps = 0;
  var cornerTimer = 0;
  var logStops = [];
  var rainRaf = 0;
  var rainColumns = [];
  var currentCase = "";

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
  var terminal = document.getElementById("terminal");
  var terminalLog = document.getElementById("terminal-log");
  var rainCanvas = document.getElementById("rain");
  var sealWrap = document.getElementById("seal-wrap");
  var sleigh = document.getElementById("sleigh");
  var naughtyStamp = document.getElementById("naughty-stamp");
  var stillTime = document.getElementById("still-time");
  var caseNo = document.getElementById("case-no");
  var certDate = document.getElementById("cert-date");
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
    var notes = [
      [659, 0.12, 0],
      [659, 0.12, 140],
      [659, 0.2, 280],
      [659, 0.12, 500],
      [659, 0.12, 640],
      [659, 0.2, 780],
      [659, 0.12, 1040],
      [784, 0.12, 1180],
      [523, 0.14, 1320],
      [587, 0.12, 1480],
      [659, 0.28, 1620]
    ];
    notes.forEach(function (note) {
      window.setTimeout(function () { beep(note[0], note[1]); }, note[2]);
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
    window.clearInterval(tickTimer);
    window.cancelAnimationFrame(raf);
    clearLogStops();
    window.cancelAnimationFrame(rainRaf);
  }

  function reduceMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function clearLogStops() {
    logStops.forEach(function (stop) { stop(); });
    logStops = [];
  }

  function later(fn, ms) {
    var id = window.setTimeout(fn, ms);
    logStops.push(function () { window.clearTimeout(id); });
  }

  function every(fn, ms) {
    var id = window.setInterval(fn, ms);
    logStops.push(function () { window.clearInterval(id); });
  }

  function resetTerminal() {
    clearLogStops();
    window.cancelAnimationFrame(rainRaf);
    rainColumns = [];
    terminal.hidden = true;
    terminalLog.textContent = "";
    scanScreen.classList.remove("is-live");
    var ctx = rainCanvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
  }

  function resizeRain() {
    var screen = rainCanvas.parentElement;
    rainCanvas.width = Math.max(1, screen.clientWidth);
    rainCanvas.height = Math.max(1, screen.clientHeight);
    rainColumns = [];
  }

  function drawRain(move) {
    var ctx = rainCanvas.getContext("2d");
    var w = rainCanvas.width;
    var h = rainCanvas.height;
    var colW = 12;
    var cols = Math.max(1, Math.ceil(w / colW));
    var c;
    var r;
    var y;
    if (!rainColumns.length) {
      for (c = 0; c < cols; c += 1) rainColumns.push((c * 28) % Math.max(h, 1));
    }
    ctx.fillStyle = move ? "rgba(4, 18, 8, 0.28)" : "#041208";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillStyle = "#39f57a";
    for (c = 0; c < cols; c += 1) {
      y = rainColumns[c] || 0;
      for (r = 0; r < 7; r += 1) {
        var yy = y - r * 14;
        if (yy < 8 || yy > h) continue;
        ctx.globalAlpha = move ? 1 - r / 8 : 0.75;
        ctx.fillText((c + r) % 2 === 0 ? "0" : "1", c * colW, yy);
      }
      if (move) {
        rainColumns[c] = y + 14;
        if (rainColumns[c] > h + 16) rainColumns[c] = 0;
      }
    }
    ctx.globalAlpha = 1;
  }

  function startRain() {
    resizeRain();
    if (reduceMotion()) {
      drawRain(false);
      return;
    }
    function tick() {
      if (phase !== "scanning") return;
      drawRain(true);
      rainRaf = window.requestAnimationFrame(tick);
    }
    tick();
  }

  function typeLine(line, instant) {
    var row = document.createElement("div");
    row.className = "log-line";
    terminalLog.appendChild(row);
    if (instant) {
      row.textContent = line;
      statusEl.textContent = line;
      return;
    }
    var i = 0;
    every(function () {
      if (phase !== "scanning") return;
      i += 4;
      if (i >= line.length) {
        row.textContent = line;
        statusEl.textContent = line;
        return;
      }
      row.textContent = line.slice(0, i);
    }, 28);
  }

  function startTerminal() {
    resetTerminal();
    terminal.hidden = false;
    scanScreen.classList.add("is-live");
    var instant = reduceMotion();
    window.requestAnimationFrame(function () {
      if (phase !== "scanning") return;
      startRain();
    });
    LOG_LINES.forEach(function (line, index) {
      later(function () {
        if (phase !== "scanning") return;
        typeLine(line, instant);
      }, index * 420);
    });
  }

  function clearFx() {
    fx.replaceChildren();
  }

  function fillFx() {
    var colors = ["#f0c14a", "#ffe08a", "#fff6e4", "#e0b03a", "#fff"];
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

  function makeCase() {
    var digits = "";
    var i;
    for (i = 0; i < 6; i += 1) digits += String(Math.floor(Math.random() * 10));
    return "NP-" + new Date().getFullYear() + "-" + digits;
  }

  function formatToday() {
    try {
      return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch (err) {
      return new Date().toDateString();
    }
  }

  function playReveal() {
    sealWrap.classList.remove("is-stamping");
    sleigh.classList.remove("go", "parked");
    sleigh.hidden = true;
    void sealWrap.offsetWidth;
    sealWrap.classList.add("is-stamping");
    sleigh.hidden = false;
    sleigh.classList.add(reduceMotion() ? "parked" : "go");
  }

  function renderOutcome(outcome) {
    var showNice = outcome === "nice";
    document.body.classList.toggle("is-nice", showNice);
    document.body.classList.toggle("is-naughty", !showNice);
    kiddingBtn.hidden = outcome !== "naughty-then-nice";
    naughtyStamp.hidden = showNice;
    stillTime.hidden = showNice;
    resultScreen.dataset.outcome = outcome;
    caseNo.textContent = currentCase;
    certDate.textContent = formatToday();
    playReveal();
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
    resetTerminal();
    meterFill.style.width = "100%";
    meter.setAttribute("aria-valuenow", "100");
    var outcome = pickOutcome(settings.mode);
    currentCase = makeCase();
    scanScreen.hidden = true;
    resultScreen.hidden = false;
    renderOutcome(outcome);
  }

  function cancelScan() {
    if (phase !== "scanning") return;
    phase = "idle";
    clearScanTimers();
    stopBuzz();
    pad.classList.remove("is-scanning");
    resetTerminal();
    resetMeter();
    statusEl.textContent = "Let go too soon. Press and hold to try again.";
  }

  function startScan() {
    if (phase !== "idle") return;
    phase = "scanning";
    pad.classList.add("is-scanning");
    statusEl.textContent = LOG_LINES[0];
    resetMeter();
    startTerminal();
    startedAt = performance.now();
    raf = window.requestAnimationFrame(frame);
    doneTimer = window.setTimeout(finishScan, HOLD_MS);
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
    resetTerminal();
    kiddingBtn.hidden = true;
    resultName.hidden = true;
    naughtyStamp.hidden = true;
    stillTime.hidden = true;
    sleigh.hidden = true;
    sleigh.classList.remove("go", "parked");
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

  function watchArt(img, fallback) {
    function fail() {
      img.hidden = true;
      fallback.hidden = false;
    }
    img.addEventListener("error", fail);
    if (img.complete && img.naturalWidth === 0) fail();
  }

  watchArt(document.getElementById("elf-art"), document.getElementById("elf-fallback"));
  watchArt(document.getElementById("seal-art"), document.getElementById("seal-fallback"));
  watchArt(document.getElementById("santa-art"), document.getElementById("santa-fallback"));

  renderMute();
  syncForm();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("naughty-or-nice-sw.js", {
      scope: "naughty-or-nice.html",
      updateViaCache: "none"
    }).catch(function () {});
  }
})();
