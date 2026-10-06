(function () {
  var KEY = "lie-detector";
  var HOLD_MS = 3000;
  var MODES = ["truth", "lie", "random"];
  var STATUS_LINES = [
    "Analyzing wiggle factor...",
    "Checking for cookie crumbs...",
    "Consulting the Truth-o-Meter..."
  ];
  var LIE_LINES = [
    "Your pants are smoking!",
    "The cookie jar saw everything!",
    "That giggle gave you away!",
    "The Truth-o-Meter just hiccuped!"
  ];

  var settings = load();
  var phase = "idle";
  var activePointer = null;
  var suppressClick = false;
  var doneTimer = 0;
  var statusTimer = 0;
  var shockTimer = 0;
  var raf = 0;
  var startedAt = 0;
  var audioCtx = null;
  var logoTimer = 0;
  var logoStart = null;
  var cornerTaps = 0;
  var cornerTimer = 0;
  var lieCursor = 0;

  var corner = document.getElementById("corner");
  var logo = document.getElementById("logo");
  var muteBtn = document.getElementById("mute");
  var scanScreen = document.getElementById("scan-screen");
  var resultScreen = document.getElementById("result-screen");
  var statusEl = document.getElementById("status");
  var meterBox = document.getElementById("meter-box");
  var canvas = document.getElementById("graph");
  var pad = document.getElementById("pad");
  var bolt = document.getElementById("bolt");
  var flash = document.getElementById("flash");
  var fx = document.getElementById("fx");
  var resultCard = document.getElementById("result-card");
  var resultTitle = document.getElementById("result-title");
  var resultExtra = document.getElementById("result-extra");
  var resultName = document.getElementById("result-name");
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

  function reduceMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function primeAudio() {
    if (settings.muted) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (err) {}
  }

  function withAudio(fn) {
    if (settings.muted) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      if (!audioCtx) audioCtx = new AC();
      var run = function () { fn(audioCtx); };
      if (audioCtx.state === "suspended") {
        audioCtx.resume().then(run).catch(function () {});
      } else {
        run();
      }
    } catch (err) {}
  }

  function blip(ctx, freq, dur, delay, type, volume) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    var now = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function ding() {
    withAudio(function (ctx) {
      blip(ctx, 880, 0.14, 0, "sine", 0.07);
      blip(ctx, 1318, 0.22, 0.13, "sine", 0.06);
    });
  }

  function zap() {
    withAudio(function (ctx) {
      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);

      var length = Math.floor(ctx.sampleRate * 0.07);
      var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      var i;
      for (i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      var noise = ctx.createBufferSource();
      var noiseGain = ctx.createGain();
      noise.buffer = buffer;
      noiseGain.gain.value = 0.035;
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    });
  }

  function pulse() {
    if (typeof navigator.vibrate !== "function") return;
    try { navigator.vibrate([35, 40, 35, 40, 60]); } catch (err) {}
  }

  function stopBuzz() {
    if (typeof navigator.vibrate !== "function") return;
    try { navigator.vibrate(0); } catch (err) {}
  }

  function clearScanTimers() {
    window.clearTimeout(doneTimer);
    window.clearInterval(statusTimer);
    window.cancelAnimationFrame(raf);
    doneTimer = 0;
    statusTimer = 0;
    raf = 0;
  }

  function drawNeedle(ctx, x, y) {
    ctx.strokeStyle = "#c43232";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 3);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = "#e23d3d";
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGraph(progress, time, calm) {
    var parent = canvas.parentElement;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = parent.clientWidth;
    var h = parent.clientHeight;
    if (w < 2 || h < 2) return;
    var bw = Math.round(w * dpr);
    var bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#f6f0dc";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(36, 70, 58, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    var step = 16;
    var gx;
    var gy;
    for (gx = step; gx < w; gx += step) {
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, h);
    }
    for (gy = step; gy < h; gy += step) {
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
    }
    ctx.stroke();

    var mid = h * 0.56;
    ctx.strokeStyle = "rgba(20, 90, 70, 0.28)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(8, mid);
    ctx.lineTo(w - 8, mid);
    ctx.stroke();
    ctx.setLineDash([]);

    var x0 = 10;
    var x1 = w - 12;
    var span = Math.max(1, x1 - x0);
    var maxX = x0 + span * Math.max(0, Math.min(1, progress));

    function sample(px) {
      var nx = (px - x0) / span;
      var amp = h * (calm ? 0.1 : 0.3);
      var flutter = calm ? 0 : Math.sin(time / 80) * amp * 0.12;
      var yy = mid
        + Math.sin(nx * Math.PI * 7.5 + time / 150) * amp * 0.72
        + Math.sin(nx * Math.PI * 19 + time / 60) * amp * (calm ? 0.12 : 0.38)
        + flutter;
      if (yy < h * 0.14) yy = h * 0.14;
      if (yy > h * 0.88) yy = h * 0.88;
      return yy;
    }

    if (progress <= 0) {
      drawNeedle(ctx, x0, mid);
      return;
    }

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0e8f62";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    var first = true;
    var px;
    for (px = x0; px <= maxX; px += 2) {
      var py = sample(px);
      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    drawNeedle(ctx, maxX, sample(maxX));
  }

  function idleGraph() {
    drawGraph(0, 0, true);
  }

  function frame(now) {
    if (phase !== "scanning") return;
    var p = Math.min(1, (now - startedAt) / HOLD_MS);
    drawGraph(p, now, reduceMotion());
    if (p < 1) raf = window.requestAnimationFrame(frame);
  }

  function clearFx() {
    fx.replaceChildren();
  }

  function fillStars() {
    var spots = [
      [4, 22], [88, 20], [3, 44], [90, 48],
      [5, 66], [87, 70], [12, 84], [82, 82],
      [16, 30], [78, 28], [24, 90], [68, 88]
    ];
    var i;
    var star;
    var poly;
    clearFx();
    for (i = 0; i < spots.length; i += 1) {
      star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      star.setAttribute("viewBox", "0 0 24 24");
      star.setAttribute("class", "star");
      star.setAttribute("aria-hidden", "true");
      star.style.left = spots[i][0] + "%";
      star.style.top = spots[i][1] + "%";
      star.style.width = (16 + (i % 4) * 6) + "px";
      star.style.height = (16 + (i % 4) * 6) + "px";
      star.style.color = i % 3 === 0 ? "#fff6c2" : (i % 3 === 1 ? "#ffe14a" : "#9dffc4");
      star.style.animationDelay = (i * 0.12) + "s";
      poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      poly.setAttribute("points", "12,1.5 15,8.5 22.5,9 16.8,14 18.6,21.5 12,17.4 5.4,21.5 7.2,14 1.5,9 9,8.5");
      poly.setAttribute("fill", "currentColor");
      star.appendChild(poly);
      fx.appendChild(star);
    }
  }

  function hideBolt() {
    bolt.hidden = true;
    bolt.classList.remove("strike");
  }

  function clearShockVisuals() {
    hideBolt();
    pad.classList.remove("is-zapped");
    document.body.classList.remove("is-shake");
    flash.classList.remove("go", "calm");
  }

  function nextLieLine() {
    var line = LIE_LINES[lieCursor % LIE_LINES.length];
    lieCursor += 1;
    return line;
  }

  function showResult(outcome) {
    phase = "result";
    clearShockVisuals();
    document.body.classList.remove("is-truth", "is-lie");
    document.body.classList.add(outcome === "truth" ? "is-truth" : "is-lie");
    resultCard.classList.toggle("is-truth", outcome === "truth");
    resultCard.classList.toggle("is-lie", outcome === "lie");
    resultScreen.dataset.outcome = outcome;
    resultTitle.textContent = outcome === "truth" ? "TRUTH DETECTED!" : "LIE DETECTED! Bzzzt!";
    if (outcome === "lie") {
      resultExtra.hidden = false;
      resultExtra.textContent = nextLieLine();
      clearFx();
    } else {
      resultExtra.hidden = true;
      resultExtra.textContent = "";
      fillStars();
      ding();
    }
    if (settings.name) {
      resultName.hidden = false;
      resultName.textContent = settings.name;
    } else {
      resultName.hidden = true;
      resultName.textContent = "";
    }
    scanScreen.hidden = true;
    resultScreen.hidden = false;
  }

  function playShock() {
    var calm = reduceMotion();
    pad.classList.add("is-zapped");
    bolt.hidden = false;
    bolt.classList.remove("strike");
    if (!calm) {
      void bolt.offsetWidth;
      bolt.classList.add("strike");
    }
    flash.classList.remove("go", "calm");
    void flash.offsetWidth;
    flash.classList.add(calm ? "calm" : "go");
    if (!calm) document.body.classList.add("is-shake");
    zap();
    pulse();
    shockTimer = window.setTimeout(function () {
      shockTimer = 0;
      if (phase !== "shock") return;
      showResult("lie");
    }, calm ? 420 : 700);
  }

  function finishScan() {
    if (phase !== "scanning") return;
    clearScanTimers();
    if (activePointer !== null) suppressClick = true;
    pad.classList.remove("is-scanning");
    meterBox.classList.remove("is-live");
    var outcome = pickOutcome(settings.mode);
    if (outcome === "lie") {
      phase = "shock";
      playShock();
    } else {
      showResult("truth");
    }
  }

  function pickOutcome(mode) {
    if (mode === "truth" || mode === "lie") return mode;
    return Math.random() < 0.5 ? "truth" : "lie";
  }

  function cancelScan() {
    if (phase !== "scanning") return;
    phase = "idle";
    clearScanTimers();
    stopBuzz();
    pad.classList.remove("is-scanning");
    meterBox.classList.remove("is-live");
    clearShockVisuals();
    idleGraph();
    statusEl.textContent = "Let go too soon. Press and hold to try again.";
  }

  function abortShock() {
    window.clearTimeout(shockTimer);
    shockTimer = 0;
    stopBuzz();
    clearShockVisuals();
    meterBox.classList.remove("is-live");
    phase = "idle";
    idleGraph();
    statusEl.textContent = "Press and hold the pad";
  }

  function startScan() {
    if (phase !== "idle") return;
    phase = "scanning";
    primeAudio();
    pad.classList.add("is-scanning");
    meterBox.classList.add("is-live");
    statusEl.textContent = STATUS_LINES[0];
    var step = 0;
    statusTimer = window.setInterval(function () {
      if (phase !== "scanning") return;
      step += 1;
      statusEl.textContent = STATUS_LINES[step % STATUS_LINES.length];
    }, 900);
    startedAt = performance.now();
    raf = window.requestAnimationFrame(frame);
    doneTimer = window.setTimeout(finishScan, HOLD_MS);
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
  window.addEventListener("pointerup", onPadUp);
  window.addEventListener("pointercancel", onPadUp);
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
    document.body.classList.remove("is-truth", "is-lie", "is-shake");
    resultCard.classList.remove("is-truth", "is-lie");
    clearFx();
    clearShockVisuals();
    resultExtra.hidden = true;
    resultName.hidden = true;
    idleGraph();
    statusEl.textContent = "Press and hold the pad";
    pad.focus();
  });

  muteBtn.addEventListener("click", function () {
    settings.muted = !settings.muted;
    save();
    renderMute();
    if (settings.muted) stopBuzz();
  });

  function openParents() {
    if (phase === "scanning") cancelScan();
    if (phase === "shock") abortShock();
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
  window.requestAnimationFrame(idleGraph);
  window.addEventListener("resize", function () {
    if (phase === "idle") idleGraph();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("lie-detector-sw.js", {
      scope: "lie-detector.html",
      updateViaCache: "none"
    }).catch(function () {});
  }
})();
