(function (root) {
  var DEFAULT_ROUND_SEC = 180;
  var DEFAULT_REST_SEC = 60;
  var DEFAULT_ROUNDS = 3;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function formatClock(totalSeconds) {
    var sec = Math.max(0, Math.ceil(totalSeconds));
    return Math.floor(sec / 60) + ":" + pad(sec % 60);
  }

  function speakDuration(seconds) {
    if (seconds === 30) return "Thirty seconds";
    if (seconds === 45) return "Forty five seconds";
    if (seconds === 60) return "One minute";
    if (seconds === 90) return "One minute thirty";
    if (seconds === 120) return "Two minutes";
    if (seconds % 60 === 0) return seconds / 60 + " minutes";
    return seconds + " seconds";
  }

  function parseRoundSeconds(raw, fallback) {
    var text = String(raw == null ? "" : raw).trim();
    if (!text) return fallback;
    var mmss = text.match(/^([1-3]):([0-5]\d)$/);
    if (mmss) {
      var sec = parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10);
      return clamp(sec, 60, 180);
    }
    if (/^[1-3]$/.test(text)) return parseInt(text, 10) * 60;
    var asNum = Number(text);
    if (asNum >= 1 && asNum <= 3) return Math.round(asNum * 60);
    if (asNum >= 60 && asNum <= 180) return Math.round(asNum);
    return null;
  }

  function parseOverrides(raw, rounds, defaultSec) {
    var text = String(raw || "").trim();
    var list = [];
    var i;
    if (!text) {
      for (i = 0; i < rounds; i += 1) list.push(defaultSec);
      return { seconds: list };
    }
    var parts = text.split(/[\n,]+/);
    for (i = 0; i < parts.length; i += 1) {
      var piece = parts[i].trim();
      if (!piece) continue;
      var parsed = parseRoundSeconds(piece, null);
      if (parsed == null) {
        return { error: "Per-round list must be 1–3 minutes each (3 or 3:00)." };
      }
      list.push(parsed);
    }
    if (!list.length) {
      for (i = 0; i < rounds; i += 1) list.push(defaultSec);
      return { seconds: list };
    }
    while (list.length < rounds) list.push(defaultSec);
    return { seconds: list.slice(0, rounds) };
  }

  function parseSettings(input) {
    var rounds = clamp(parseInt(input.rounds, 10) || 0, 0, 12);
    if (rounds < 1) return { error: "Rounds must be 1–12." };
    var roundSec = parseRoundSeconds(input.roundMinutes, DEFAULT_ROUND_SEC);
    if (roundSec == null) return { error: "Round duration must be 1–3 minutes." };
    var restSec = parseInt(input.restSeconds, 10);
    if (!(restSec >= 30 && restSec <= 120)) return { error: "Rest must be 30 seconds–2 minutes." };
    var overrides = parseOverrides(input.overrides, rounds, roundSec);
    if (overrides.error) return overrides;
    return {
      rounds: rounds,
      roundSeconds: overrides.seconds,
      restSeconds: restSec
    };
  }

  function createSession(settings) {
    return {
      rounds: settings.rounds,
      roundSeconds: settings.roundSeconds.slice(),
      restSeconds: settings.restSeconds,
      status: "idle",
      phase: "round",
      index: 0,
      remainingMs: settings.roundSeconds[0] * 1000,
      fired30: false,
      fired10: false
    };
  }

  function phaseLabel(session) {
    if (session.status === "done") return "DONE";
    return session.phase === "rest" ? "REST" : "ROUND";
  }

  function announceForStart(session) {
    return "Round " + (session.index + 1);
  }

  function announceForRest(session) {
    return "Rest. " + speakDuration(session.restSeconds) + ".";
  }

  function nextAfterZero(session) {
    if (session.phase === "round") {
      if (session.index + 1 >= session.rounds) {
        session.status = "done";
        session.remainingMs = 0;
        return { kind: "done", speak: "Done. Workout complete.", bell: "end" };
      }
      session.phase = "rest";
      session.remainingMs = session.restSeconds * 1000;
      session.fired30 = false;
      session.fired10 = false;
      return { kind: "rest", speak: announceForRest(session), bell: "end" };
    }
    session.phase = "round";
    session.index += 1;
    session.remainingMs = session.roundSeconds[session.index] * 1000;
    session.fired30 = false;
    session.fired10 = false;
    return { kind: "round", speak: announceForStart(session), bell: "start" };
  }

  function marksForTick(session, previousMs) {
    var marks = [];
    if (session.phase !== "round" || session.status !== "running") return marks;
    if (!session.fired30 && previousMs > 30000 && session.remainingMs <= 30000) {
      session.fired30 = true;
      marks.push({ speak: "Thirty seconds", bell: "warn" });
    }
    if (!session.fired10 && previousMs > 10000 && session.remainingMs <= 10000) {
      session.fired10 = true;
      marks.push({ speak: "Ten seconds", bell: "warn" });
    }
    return marks;
  }

  function advance(session, elapsedMs) {
    if (session.status !== "running") return { marks: [], event: null };
    var previousMs = session.remainingMs;
    session.remainingMs = Math.max(0, session.remainingMs - elapsedMs);
    var marks = marksForTick(session, previousMs);
    var event = null;
    if (session.remainingMs <= 0) event = nextAfterZero(session);
    return { marks: marks, event: event };
  }

  var api = {
    DEFAULT_ROUND_SEC: DEFAULT_ROUND_SEC,
    DEFAULT_REST_SEC: DEFAULT_REST_SEC,
    DEFAULT_ROUNDS: DEFAULT_ROUNDS,
    formatClock: formatClock,
    speakDuration: speakDuration,
    parseSettings: parseSettings,
    parseOverrides: parseOverrides,
    createSession: createSession,
    phaseLabel: phaseLabel,
    announceForStart: announceForStart,
    announceForRest: announceForRest,
    advance: advance
  };

  root.JassBoxing = api;
})(typeof window !== "undefined" ? window : globalThis);

(function () {
  if (typeof document === "undefined") return;
  var engine = window.JassBoxing;
  if (!engine || !document.getElementById("jass-clock")) return;

  var clockEl = document.getElementById("jass-clock");
  var phaseEl = document.getElementById("jass-phase");
  var metaEl = document.getElementById("jass-meta");
  var boardEl = document.getElementById("jass-board");
  var errorEl = document.getElementById("jass-error");
  var startBtn = document.getElementById("jass-start");
  var pauseBtn = document.getElementById("jass-pause");
  var resetBtn = document.getElementById("jass-reset");
  var settingsForm = document.getElementById("jass-settings");
  var fields = settingsForm ? settingsForm.querySelectorAll("input, select, textarea") : [];

  var session = null;
  var timerId = null;
  var lastTick = 0;
  var audioCtx = null;
  var wakeLock = null;

  function settingsFromForm() {
    return engine.parseSettings({
      rounds: document.getElementById("rounds").value,
      roundMinutes: document.getElementById("round-minutes").value,
      restSeconds: document.getElementById("rest-seconds").value,
      overrides: document.getElementById("overrides").value
    });
  }

  function setError(message) {
    if (!errorEl) return;
    if (!message) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function lockSettings(locked) {
    fields.forEach(function (field) {
      field.disabled = locked;
    });
  }

  function speak(text) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 0.85;
    window.speechSynthesis.speak(utter);
  }

  function ensureAudio() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(ctx, start, freq, dur, type, gainVal) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function bell(kind) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var now = ctx.currentTime;
    if (kind === "start") {
      tone(ctx, now, 880, 0.18, "triangle", 0.22);
      tone(ctx, now + 0.16, 1320, 0.28, "triangle", 0.18);
    } else if (kind === "end") {
      tone(ctx, now, 660, 0.22, "square", 0.16);
      tone(ctx, now + 0.2, 440, 0.35, "triangle", 0.2);
    } else {
      tone(ctx, now, 990, 0.16, "sine", 0.2);
    }
  }

  function requestWake() {
    if (!navigator.wakeLock || !navigator.wakeLock.request) return;
    navigator.wakeLock.request("screen").then(function (lock) {
      wakeLock = lock;
    }).catch(function () {});
  }

  function releaseWake() {
    if (wakeLock) {
      wakeLock.release().catch(function () {});
      wakeLock = null;
    }
  }

  function render() {
    if (!session) return;
    var remainingSec = session.remainingMs / 1000;
    clockEl.textContent = engine.formatClock(remainingSec);
    phaseEl.textContent = engine.phaseLabel(session);
    metaEl.textContent = session.status === "done"
      ? session.rounds + " / " + session.rounds
      : (session.index + 1) + " / " + session.rounds;
    boardEl.classList.toggle("is-rest", session.phase === "rest" && session.status !== "done");
    boardEl.classList.toggle("is-done", session.status === "done");
    startBtn.disabled = session.status === "running";
    pauseBtn.disabled = session.status !== "running";
    startBtn.textContent = session.status === "paused" || session.status === "done" ? "Resume" : "Start";
    if (session.status === "done") startBtn.textContent = "Start";
    lockSettings(session.status === "running" || session.status === "paused");
  }

  function stopTicker() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function applySignals(result) {
    result.marks.forEach(function (mark) {
      bell(mark.bell);
      speak(mark.speak);
    });
    if (result.event) {
      bell(result.event.bell);
      speak(result.event.speak);
      if (result.event.kind === "done") {
        session.status = "done";
        stopTicker();
        releaseWake();
      }
    }
  }

  function tick() {
    if (!session || session.status !== "running") return;
    var now = Date.now();
    var elapsed = now - lastTick;
    lastTick = now;
    applySignals(engine.advance(session, elapsed));
    render();
  }

  function startWorkout() {
    var parsed = settingsFromForm();
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setError("");
    ensureAudio();
    session = engine.createSession(parsed);
    session.status = "running";
    lastTick = Date.now();
    stopTicker();
    timerId = window.setInterval(tick, 100);
    requestWake();
    bell("start");
    speak(engine.announceForStart(session));
    render();
  }

  function resumeWorkout() {
    if (!session || session.status !== "paused") return;
    ensureAudio();
    session.status = "running";
    lastTick = Date.now();
    stopTicker();
    timerId = window.setInterval(tick, 100);
    requestWake();
    render();
  }

  function pauseWorkout() {
    if (!session || session.status !== "running") return;
    session.status = "paused";
    stopTicker();
    render();
  }

  function resetWorkout() {
    stopTicker();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    releaseWake();
    var parsed = settingsFromForm();
    session = parsed.error ? engine.createSession({
      rounds: engine.DEFAULT_ROUNDS,
      roundSeconds: [engine.DEFAULT_ROUND_SEC, engine.DEFAULT_ROUND_SEC, engine.DEFAULT_ROUND_SEC],
      restSeconds: engine.DEFAULT_REST_SEC
    }) : engine.createSession(parsed);
    session.status = "idle";
    setError(parsed.error || "");
    lockSettings(false);
    render();
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    startBtn.textContent = "Start";
  }

  startBtn.addEventListener("click", function () {
    if (!session || session.status === "idle" || session.status === "done") {
      startWorkout();
      return;
    }
    if (session.status === "paused") resumeWorkout();
  });

  pauseBtn.addEventListener("click", pauseWorkout);
  resetBtn.addEventListener("click", resetWorkout);

  settingsForm.addEventListener("input", function () {
    if (session && (session.status === "running" || session.status === "paused")) return;
    resetWorkout();
  });

  resetWorkout();
})();
