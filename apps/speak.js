(function () {
  var PHRASES_KEY = "speak.phrases";
  var HISTORY_KEY = "speak.history";
  var SETTINGS_KEY = "speak.settings";
  var HISTORY_LIMIT = 20;

  var DEFAULT_PHRASES = [
    "I need the nurse",
    "I need help",
    "Pain",
    "Water please",
    "Bathroom",
    "I'm cold",
    "I'm hot",
    "Yes",
    "No",
    "Thank you",
    "Please wait",
    "I can't talk right now",
    "Call my family"
  ];

  var textEl = document.getElementById("text");
  var speakBtn = document.getElementById("speak");
  var stopBtn = document.getElementById("stop");
  var showBtn = document.getElementById("show-text");
  var banner = document.getElementById("live-banner");
  var statusEl = document.getElementById("status");
  var noSpeech = document.getElementById("no-speech");
  var grid = document.getElementById("phrase-grid");
  var editor = document.getElementById("phrase-editor");
  var editToggle = document.getElementById("edit-toggle");
  var phraseList = document.getElementById("phrase-list");
  var newPhrase = document.getElementById("new-phrase");
  var addBtn = document.getElementById("add-phrase");
  var resetBtn = document.getElementById("reset-phrases");
  var historyList = document.getElementById("history-list");
  var historyEmpty = document.getElementById("history-empty");
  var clearHistoryBtn = document.getElementById("clear-history");
  var voiceSel = document.getElementById("voice");
  var rateEl = document.getElementById("rate");
  var pitchEl = document.getElementById("pitch");
  var rateValue = document.getElementById("rate-value");
  var pitchValue = document.getElementById("pitch-value");
  var showWhenEl = document.getElementById("show-when-speaking");
  var testBtn = document.getElementById("test");
  var board = document.getElementById("text-board");
  var boardText = document.getElementById("board-text");

  var phrases = loadPhrases();
  var history = loadHistory();
  var settings = loadSettings();
  var editing = false;
  var lastSpoken = "";
  var generation = 0;
  var resumeTimer = 0;

  /* Global so Chrome cannot garbage-collect the utterance mid-speech. */
  window.speakUtterance = null;
  window.speakUtterances = [];

  function clamp(n, min, max, fallback) {
    if (typeof n !== "number" || isNaN(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (err) {
      return null;
    }
  }

  function loadPhrases() {
    var saved = readJson(PHRASES_KEY);
    if (!Array.isArray(saved)) return DEFAULT_PHRASES.slice();
    var next = [];
    saved.forEach(function (item) {
      var phrase = clean(item);
      if (phrase) next.push(phrase.slice(0, 160));
    });
    return next;
  }

  function loadHistory() {
    var saved = readJson(HISTORY_KEY);
    if (!Array.isArray(saved)) return [];
    var next = [];
    saved.forEach(function (item) {
      var line = clean(item);
      if (line) next.push(line.slice(0, 500));
    });
    return next.slice(0, HISTORY_LIMIT);
  }

  function loadSettings() {
    var saved = readJson(SETTINGS_KEY);
    var base = { voiceURI: "", rate: 1, pitch: 1, showText: false };
    if (!saved || typeof saved !== "object") return base;
    return {
      voiceURI: typeof saved.voiceURI === "string" ? saved.voiceURI : "",
      rate: clamp(Number(saved.rate), 0.5, 1.5, 1),
      pitch: clamp(Number(saved.pitch), 0.5, 2, 1),
      showText: !!saved.showText
    };
  }

  function savePhrases() {
    localStorage.setItem(PHRASES_KEY, JSON.stringify(phrases));
  }

  function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function canSpeak() {
    return !!(window.speechSynthesis && typeof window.SpeechSynthesisUtterance === "function");
  }

  function setStatus(message) {
    statusEl.textContent = message || "";
  }

  function showUnavailable() {
    noSpeech.hidden = false;
    setStatus("Speech is not available in this browser.");
  }

  function getVoices() {
    try {
      if (!window.speechSynthesis || !window.speechSynthesis.getVoices) return [];
      return window.speechSynthesis.getVoices() || [];
    } catch (err) {
      return [];
    }
  }

  function chosenVoice() {
    if (!settings.voiceURI) return null;
    var voices = getVoices();
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].voiceURI === settings.voiceURI) return voices[i];
    }
    return null;
  }

  function fillVoices() {
    var voices = getVoices();
    var current = settings.voiceURI;
    voiceSel.replaceChildren();
    var def = document.createElement("option");
    def.value = "";
    def.textContent = "Default";
    voiceSel.appendChild(def);
    voices.forEach(function (voice) {
      var opt = document.createElement("option");
      opt.value = voice.voiceURI;
      opt.textContent = voice.name + " (" + voice.lang + ")";
      voiceSel.appendChild(opt);
    });
    var hasCurrent = current && voices.some(function (voice) {
      return voice.voiceURI === current;
    });
    if (hasCurrent) {
      voiceSel.value = current;
    } else if (voices.length && current) {
      settings.voiceURI = "";
      voiceSel.value = "";
      saveSettings();
    } else {
      voiceSel.value = "";
    }
  }

  function formatNum(n) {
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  function applySettingsToForm() {
    rateEl.value = String(settings.rate);
    pitchEl.value = String(settings.pitch);
    rateValue.textContent = formatNum(settings.rate);
    pitchValue.textContent = formatNum(settings.pitch);
    showWhenEl.checked = !!settings.showText;
    fillVoices();
  }

  /* Sentence chunks. Chrome on Android stops speechSynthesis after about 15s. */
  function chunkText(text) {
    var source = clean(text);
    if (!source) return [];
    var parts = source.match(/[^.!?\n]+[.!?]+|[^.!?\n]+/g) || [source];
    var chunks = [];
    parts.forEach(function (part) {
      var sentence = clean(part);
      if (!sentence) return;
      if (sentence.length <= 180) {
        chunks.push(sentence);
        return;
      }
      var words = sentence.split(" ");
      var buf = "";
      words.forEach(function (word) {
        var next = buf ? buf + " " + word : word;
        if (buf && next.length > 160) {
          chunks.push(buf);
          buf = word;
        } else {
          buf = next;
        }
      });
      if (buf) chunks.push(buf);
    });
    return chunks;
  }

  function remember(text) {
    var line = clean(text);
    if (!line) return;
    history = history.filter(function (item) { return item !== line; });
    history.unshift(line);
    history = history.slice(0, HISTORY_LIMIT);
    saveHistory();
    renderHistory();
  }

  function hideBanner() {
    banner.hidden = true;
    banner.textContent = "";
  }

  function showBanner(text) {
    if (!settings.showText) {
      hideBanner();
      return;
    }
    banner.textContent = text;
    banner.hidden = false;
  }

  function stopResume() {
    if (resumeTimer) {
      window.clearInterval(resumeTimer);
      resumeTimer = 0;
    }
  }

  function armResume() {
    stopResume();
    resumeTimer = window.setInterval(function () {
      if (!window.speechSynthesis) return;
      if (window.speechSynthesis.speaking && window.speechSynthesis.resume) {
        window.speechSynthesis.resume();
      }
    }, 4000);
  }

  function stopSpeaking() {
    generation += 1;
    window.speakUtterance = null;
    window.speakUtterances = [];
    stopResume();
    if (window.speechSynthesis && window.speechSynthesis.cancel) {
      window.speechSynthesis.cancel();
    }
    hideBanner();
    setStatus("Stopped");
  }

  function speakChunks(chunks, gen) {
    var index = 0;
    window.speakUtterances = [];

    function next() {
      if (gen !== generation) return;
      if (index >= chunks.length) {
        stopResume();
        setStatus("");
        return;
      }
      var utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.volume = 1.0;
      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      var voice = chosenVoice();
      if (voice) {
        utterance.voice = voice;
        if (voice.lang) utterance.lang = voice.lang;
      }
      window.speakUtterance = utterance;
      window.speakUtterances.push(utterance);
      utterance.onend = function () {
        index += 1;
        next();
      };
      utterance.onerror = function (event) {
        var reason = event && event.error;
        if (reason === "interrupted" || reason === "canceled" || reason === "cancelled") return;
        index += 1;
        next();
      };
      window.speechSynthesis.speak(utterance);
    }

    next();
  }

  function speak(text, options) {
    options = options || {};
    var line = clean(text);
    if (!line) {
      setStatus("Type something first.");
      return;
    }
    lastSpoken = line;
    if (options.history !== false) remember(line);
    showBanner(line);
    if (!canSpeak()) {
      showUnavailable();
      return;
    }
    var chunks = chunkText(line);
    if (!chunks.length) return;
    generation += 1;
    var gen = generation;
    window.speechSynthesis.cancel();
    setStatus("Speaking");
    armResume();
    window.setTimeout(function () {
      if (gen !== generation) return;
      speakChunks(chunks, gen);
    }, 50);
  }

  function openBoard(message) {
    var line = clean(message) || lastSpoken || clean(textEl.value) || "Nothing to show yet.";
    boardText.textContent = line;
    board.hidden = false;
  }

  function closeBoard() {
    board.hidden = true;
  }

  function renderPhrases() {
    grid.replaceChildren();
    phraseList.replaceChildren();
    phrases.forEach(function (phrase, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "phrase";
      btn.textContent = phrase;
      btn.addEventListener("click", function () {
        speak(phrase);
      });
      grid.appendChild(btn);

      var item = document.createElement("li");
      var input = document.createElement("input");
      input.type = "text";
      input.value = phrase;
      input.maxLength = 160;
      input.setAttribute("aria-label", "Rename phrase");
      input.addEventListener("change", function () {
        var next = clean(input.value).slice(0, 160);
        if (!next) {
          input.value = phrases[index];
          return;
        }
        if (next === phrases[index]) return;
        phrases[index] = next;
        savePhrases();
        renderPhrases();
      });
      var del = document.createElement("button");
      del.type = "button";
      del.textContent = "Delete";
      del.setAttribute("aria-label", "Delete " + phrase);
      del.addEventListener("click", function () {
        phrases.splice(index, 1);
        savePhrases();
        renderPhrases();
      });
      item.appendChild(input);
      item.appendChild(del);
      phraseList.appendChild(item);
    });
  }

  function renderHistory() {
    historyList.replaceChildren();
    historyEmpty.hidden = history.length > 0;
    history.forEach(function (line) {
      var item = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = line;
      btn.addEventListener("click", function () {
        speak(line);
      });
      item.appendChild(btn);
      historyList.appendChild(item);
    });
  }

  function setEditing(on) {
    editing = !!on;
    editor.hidden = !editing;
    grid.hidden = editing;
    editToggle.textContent = editing ? "Done" : "Edit";
    editToggle.setAttribute("aria-pressed", editing ? "true" : "false");
  }

  speakBtn.addEventListener("click", function () {
    speak(textEl.value);
  });

  stopBtn.addEventListener("click", stopSpeaking);

  showBtn.addEventListener("click", function () {
    openBoard(lastSpoken || textEl.value);
  });

  board.addEventListener("click", closeBoard);
  banner.addEventListener("click", hideBanner);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !board.hidden) closeBoard();
  });

  editToggle.addEventListener("click", function () {
    setEditing(!editing);
  });

  addBtn.addEventListener("click", function () {
    var next = clean(newPhrase.value).slice(0, 160);
    if (!next) return;
    phrases.push(next);
    newPhrase.value = "";
    savePhrases();
    renderPhrases();
  });

  newPhrase.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addBtn.click();
    }
  });

  resetBtn.addEventListener("click", function () {
    if (!window.confirm("Reset phrases to the original list?")) return;
    phrases = DEFAULT_PHRASES.slice();
    savePhrases();
    renderPhrases();
  });

  clearHistoryBtn.addEventListener("click", function () {
    history = [];
    saveHistory();
    renderHistory();
  });

  voiceSel.addEventListener("change", function () {
    settings.voiceURI = voiceSel.value;
    saveSettings();
  });

  rateEl.addEventListener("input", function () {
    settings.rate = clamp(Number(rateEl.value), 0.5, 1.5, 1);
    rateValue.textContent = formatNum(settings.rate);
    saveSettings();
  });

  pitchEl.addEventListener("input", function () {
    settings.pitch = clamp(Number(pitchEl.value), 0.5, 2, 1);
    pitchValue.textContent = formatNum(settings.pitch);
    saveSettings();
  });

  showWhenEl.addEventListener("change", function () {
    settings.showText = !!showWhenEl.checked;
    saveSettings();
    if (!settings.showText) hideBanner();
  });

  testBtn.addEventListener("click", function () {
    speak("This is a test.", { history: false });
  });

  applySettingsToForm();
  renderPhrases();
  renderHistory();
  setEditing(false);
  if (!canSpeak()) showUnavailable();

  if (canSpeak() && window.speechSynthesis.addEventListener) {
    window.speechSynthesis.addEventListener("voiceschanged", fillVoices);
    window.setTimeout(fillVoices, 250);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("speak-sw.js", {
      scope: "speak.html",
      updateViaCache: "none"
    }).catch(function (err) {
      window.speakSwError = String(err && err.message ? err.message : err);
    });
  }
})();
