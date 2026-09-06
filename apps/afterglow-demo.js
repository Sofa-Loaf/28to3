(function () {
  "use strict";

  var RADIUS_M = 15;
  var LINE_MAX = 80;
  var VOICE_MAX_S = 12;
  var STORAGE_KEY = "afterglow-web-prototype-v1";
  var EARTH_M = 6371000;

  var STAGES = {
    hotel: {
      id: "hotel",
      name: "Hotel room",
      hint: "Fourth floor. The ice machine is down the hall.",
      stub: false,
      widthM: 48,
      heightM: 36,
      origin: { lat: 42.8925, lng: -78.8762 },
      start: { x: 16, y: 14 },
      landmarks: [
        { x: 16, y: 14, label: "bed" },
        { x: 22, y: 10, label: "window" },
        { x: 12, y: 18, label: "desk" },
        { x: 38, y: 28, label: "hall" },
        { x: 44, y: 8, label: "lift" }
      ]
    },
    train: {
      id: "train",
      name: "Train corner",
      hint: "Last car. The tracks are farther than they look.",
      stub: false,
      widthM: 50,
      heightM: 36,
      origin: { lat: 42.8784, lng: -78.8736 },
      start: { x: 12, y: 18 },
      landmarks: [
        { x: 12, y: 18, label: "platform" },
        { x: 18, y: 14, label: "ticket" },
        { x: 36, y: 20, label: "tracks" }
      ]
    },
    venue: {
      id: "venue",
      name: "Venue sidewalk",
      hint: "Doors just closed. The encore stayed in the alley.",
      stub: false,
      widthM: 52,
      heightM: 36,
      origin: { lat: 42.899, lng: -78.87 },
      start: { x: 14, y: 16 },
      landmarks: [
        { x: 14, y: 16, label: "door" },
        { x: 22, y: 22, label: "alley" },
        { x: 42, y: 14, label: "street" }
      ]
    },
    niagara: {
      id: "niagara",
      name: "Niagara stub",
      hint: "A far pin. Walk in to hear it. Stub on purpose.",
      stub: true,
      widthM: 60,
      heightM: 40,
      origin: { lat: 43.0896, lng: -79.0698 },
      start: { x: 10, y: 28 },
      landmarks: [
        { x: 10, y: 28, label: "lot" },
        { x: 48, y: 12, label: "overlook" }
      ]
    }
  };

  var SAMPLE = [
    {
      id: "hotel-window",
      stageId: "hotel",
      x: 22,
      y: 10,
      kind: "line",
      line: "The radiator clicked after they left.",
      placeHint: "the window",
      plays: 4,
      hoursAgo: 6
    },
    {
      id: "hotel-desk",
      stageId: "hotel",
      x: 12,
      y: 18,
      kind: "voice",
      line: "A short take. Ice in the hallway.",
      placeHint: "the desk",
      plays: 1,
      hoursAgo: 14,
      voiceStub: true
    },
    {
      id: "hotel-ice",
      stageId: "hotel",
      x: 38,
      y: 28,
      kind: "line",
      line: "Someone laughed once, then the bucket.",
      placeHint: "the ice machine",
      plays: 0,
      hoursAgo: 20
    },
    {
      id: "hotel-lift",
      stageId: "hotel",
      x: 44,
      y: 8,
      kind: "still",
      line: "A still of the lift light. No face.",
      placeHint: "the elevator",
      plays: 2,
      hoursAgo: 30,
      stillStub: true
    },
    {
      id: "train-platform",
      stageId: "train",
      x: 12,
      y: 18,
      kind: "line",
      line: "Last car. Nobody sat.",
      placeHint: "the platform corner",
      plays: 7,
      hoursAgo: 3
    },
    {
      id: "train-ticket",
      stageId: "train",
      x: 18,
      y: 14,
      kind: "still",
      line: "A wet ticket, already punched.",
      placeHint: "the ticket machine",
      plays: 0,
      hoursAgo: 11,
      stillStub: true
    },
    {
      id: "train-tracks",
      stageId: "train",
      x: 36,
      y: 20,
      kind: "voice",
      line: "Doors, then the tunnel.",
      placeHint: "across the tracks",
      plays: 2,
      hoursAgo: 26,
      voiceStub: true
    },
    {
      id: "venue-door",
      stageId: "venue",
      x: 14,
      y: 16,
      kind: "line",
      line: "They kept the encore in the alley.",
      placeHint: "the sidewalk door",
      plays: 5,
      hoursAgo: 2
    },
    {
      id: "venue-alley",
      stageId: "venue",
      x: 22,
      y: 22,
      kind: "voice",
      line: "A laugh, then the loading dock.",
      placeHint: "the alley",
      plays: 0,
      hoursAgo: 9,
      voiceStub: true
    },
    {
      id: "venue-street",
      stageId: "venue",
      x: 42,
      y: 14,
      kind: "line",
      line: "A wet flyer. The name already gone.",
      placeHint: "across the street",
      plays: 1,
      hoursAgo: 18
    },
    {
      id: "niagara-overlook",
      stageId: "niagara",
      x: 48,
      y: 12,
      kind: "line",
      line: "The mist was louder than the cameras.",
      placeHint: "the overlook",
      plays: 1,
      hoursAgo: 40
    }
  ];

  var els = {};
  var state = {
    stageId: "hotel",
    you: { x: 16, y: 14 },
    source: "demo",
    geoNote: "",
    locals: [],
    plays: {},
    hearingId: null,
    voice: { stream: null, recorder: null, chunks: [], url: "", text: "", seconds: 0, timer: null },
    stillData: ""
  };

  function $(id) {
    return document.getElementById(id);
  }

  function now() {
    return Date.now();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  function haversine(a, b) {
    var dLat = toRadians(b.lat - a.lat);
    var dLng = toRadians(b.lng - a.lng);
    var lat1 = toRadians(a.lat);
    var lat2 = toRadians(b.lat);
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function offsetToStagePoint(stage, lat, lng) {
    var dLat = toRadians(lat - stage.origin.lat);
    var dLng = toRadians(lng - stage.origin.lng);
    var north = dLat * EARTH_M;
    var east = dLng * EARTH_M * Math.cos(toRadians(stage.origin.lat));
    return {
      x: clamp(stage.widthM / 2 + east, 1, stage.widthM - 1),
      y: clamp(stage.heightM / 2 - north, 1, stage.heightM - 1)
    };
  }

  function ageLabel(createdAt) {
    var hours = Math.max(0, (now() - createdAt) / 3600000);
    if (hours < 1) return "just now";
    if (hours < 24) return Math.round(hours) + "h ago";
    var days = Math.round(hours / 24);
    return days + (days === 1 ? "d ago" : "d ago");
  }

  function kindLabel(item) {
    if (item.kind === "voice") return "voice";
    if (item.kind === "still") return "still";
    return "one line";
  }

  function loadStore() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.locals)) state.locals = parsed.locals;
      if (parsed && parsed.plays && typeof parsed.plays === "object") state.plays = parsed.plays;
      if (parsed && parsed.you && STAGES[parsed.stageId]) {
        state.stageId = parsed.stageId;
        state.you = { x: parsed.you.x, y: parsed.you.y };
      }
    } catch (err) {
      state.geoNote = "This browser would not keep the demo tape.";
    }
  }

  function saveStore() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          locals: state.locals,
          plays: state.plays,
          stageId: state.stageId,
          you: state.you
        })
      );
    } catch (err) {
      setStatus("The tape is full on this browser. The line was kept without the still or voice.");
    }
  }

  function playsFor(item) {
    if (Object.prototype.hasOwnProperty.call(state.plays, item.id)) {
      return state.plays[item.id];
    }
    return item.plays || 0;
  }

  function allAfterglows() {
    var samples = SAMPLE.map(function (item) {
      return {
        id: item.id,
        stageId: item.stageId,
        x: item.x,
        y: item.y,
        kind: item.kind,
        line: item.line,
        placeHint: item.placeHint,
        plays: playsFor(item),
        createdAt: now() - item.hoursAgo * 3600000,
        origin: "sample",
        voiceStub: !!item.voiceStub,
        stillStub: !!item.stillStub,
        voiceUrl: "",
        voiceText: "",
        stillData: ""
      };
    });
    return samples.concat(
      state.locals.map(function (item) {
        return {
          id: item.id,
          stageId: item.stageId,
          x: item.x,
          y: item.y,
          kind: item.kind,
          line: item.line,
          placeHint: item.placeHint || "this place",
          plays: playsFor(item),
          createdAt: item.createdAt,
          origin: "local",
          voiceStub: false,
          stillStub: false,
          voiceUrl: item.voiceUrl || "",
          voiceText: item.voiceText || "",
          stillData: item.stillData || ""
        };
      })
    );
  }

  function nearby() {
    var here = state.you;
    var list = allAfterglows().filter(function (item) {
      return item.stageId === state.stageId && distance(here, item) <= RADIUS_M;
    });
    var anyPlays = list.some(function (item) {
      return item.plays >= 1;
    });
    list.sort(function (a, b) {
      if (anyPlays && b.plays !== a.plays) return b.plays - a.plays;
      return b.createdAt - a.createdAt;
    });
    return list;
  }

  function setStatus(text) {
    if (els.status) els.status.textContent = text || "";
  }

  function currentStage() {
    return STAGES[state.stageId];
  }

  function renderSpots() {
    els.spots.innerHTML = "";
    Object.keys(STAGES).forEach(function (id) {
      var stage = STAGES[id];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ag-spot" + (id === state.stageId ? " is-on" : "") + (stage.stub ? " is-stub" : "");
      btn.textContent = stage.name;
      btn.setAttribute("aria-pressed", id === state.stageId ? "true" : "false");
      btn.addEventListener("click", function () {
        goToStage(id, stage.start, "demo");
      });
      els.spots.appendChild(btn);
    });
  }

  function svgEl(name, attrs) {
    var node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function renderStage() {
    var stage = currentStage();
    var svg = els.stage;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", "0 0 " + stage.widthM + " " + stage.heightM);
    svg.setAttribute("aria-label", stage.name + " location stage. Click to stand somewhere.");

    var defs = svgEl("defs");
    var grid = svgEl("pattern", {
      id: "ag-grid",
      width: "4",
      height: "4",
      patternUnits: "userSpaceOnUse"
    });
    grid.appendChild(svgEl("path", { d: "M 4 0 L 0 0 0 4", fill: "none", stroke: "#2c241c", "stroke-width": "0.12" }));
    defs.appendChild(grid);
    svg.appendChild(defs);
    svg.appendChild(svgEl("rect", { x: "0", y: "0", width: String(stage.widthM), height: String(stage.heightM), fill: "#1a1511" }));
    svg.appendChild(svgEl("rect", { x: "0", y: "0", width: String(stage.widthM), height: String(stage.heightM), fill: "url(#ag-grid)" }));

    stage.landmarks.forEach(function (mark) {
      svg.appendChild(
        svgEl("text", {
          x: String(mark.x),
          y: String(mark.y - 1.2),
          fill: "#6b5340",
          "font-size": "1.5",
          "font-family": "IBM Plex Mono, ui-monospace, monospace",
          "text-anchor": "middle"
        })
      ).textContent = mark.label;
    });

    svg.appendChild(
      svgEl("circle", {
        cx: String(state.you.x),
        cy: String(state.you.y),
        r: String(RADIUS_M),
        fill: "rgba(232, 162, 90, 0.08)",
        stroke: "#d4a574",
        "stroke-width": "0.28",
        "stroke-dasharray": "0.8 0.7"
      })
    );

    allAfterglows()
      .filter(function (item) {
        return item.stageId === state.stageId;
      })
      .forEach(function (item) {
        var near = distance(state.you, item) <= RADIUS_M;
        svg.appendChild(
          svgEl("circle", {
            cx: String(item.x),
            cy: String(item.y),
            r: near ? "0.7" : "0.55",
            fill: near ? "#c45c26" : "#5a4c3c",
            stroke: near ? "#e8a25a" : "#3a3228",
            "stroke-width": "0.18"
          })
        );
      });

    var you = svgEl("circle", {
      class: "ag-you-dot",
      cx: String(state.you.x),
      cy: String(state.you.y),
      r: "0.85",
      fill: "#e8a25a"
    });
    svg.appendChild(you);
    svg.appendChild(
      svgEl("circle", {
        cx: String(state.you.x),
        cy: String(state.you.y),
        r: "1.5",
        fill: "none",
        stroke: "rgba(232, 162, 90, 0.45)",
        "stroke-width": "0.2"
      })
    );
  }

  function renderHere() {
    var stage = currentStage();
    var count = nearby().length;
    var source =
      state.source === "geo"
        ? "browser place, snapped to the nearest demo pin"
        : "demo spot — click the stage or pick a pin";
    els.here.innerHTML =
      "You are at <strong>" +
      stage.name +
      "</strong> · earshot 15 m / ~50 ft · " +
      count +
      (count === 1 ? " whisper" : " whispers") +
      " in range. Pins stay precise. " +
      source +
      ".";
    els.stageMeta.textContent = stage.hint + (state.geoNote ? " " + state.geoNote : "");
  }

  function renderList() {
    var items = nearby();
    els.list.innerHTML = "";
    if (!items.length) {
      els.empty.hidden = false;
      els.empty.textContent =
        "Nothing in earshot. Walk closer — click the stage, or leave the first whisper here.";
    } else {
      els.empty.hidden = true;
    }

    items.forEach(function (item) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ag-card";
      btn.setAttribute("data-id", item.id);

      var kind = document.createElement("p");
      kind.className = "ag-card-kind";
      kind.textContent = kindLabel(item);

      var line = document.createElement("p");
      line.className = "ag-card-line";
      line.textContent = item.line || "A residue was left at " + item.placeHint + ".";

      var meta = document.createElement("p");
      meta.className = "ag-card-meta";
      meta.textContent =
        item.placeHint +
        " · " +
        ageLabel(item.createdAt) +
        " · " +
        item.plays +
        (item.plays === 1 ? " play" : " plays") +
        (item.origin === "sample" ? " · sample" : " · yours");

      btn.appendChild(kind);
      btn.appendChild(line);
      btn.appendChild(meta);
      btn.addEventListener("click", function () {
        hear(item.id);
      });
      li.appendChild(btn);
      els.list.appendChild(li);
    });
  }

  function renderHear() {
    var item = allAfterglows().filter(function (entry) {
      return entry.id === state.hearingId;
    })[0];
    if (!item || distance(state.you, item) > RADIUS_M) {
      els.hear.hidden = true;
      els.hear.innerHTML = "";
      return;
    }

    els.hear.hidden = false;
    els.hear.innerHTML = "";

    var kicker = document.createElement("p");
    kicker.className = "ag-kicker";
    kicker.textContent = item.origin === "sample" ? "sample residue" : "your residue";

    var title = document.createElement("p");
    title.className = "ag-hear-line";
    title.textContent = item.line || "A residue was left at " + item.placeHint + ".";

    var meta = document.createElement("p");
    meta.className = "ag-card-meta";
    meta.textContent =
      "at " +
      item.placeHint +
      " · " +
      item.plays +
      (item.plays === 1 ? " play" : " plays") +
      " · no comments · no likes";

    els.hear.appendChild(kicker);
    els.hear.appendChild(title);
    els.hear.appendChild(meta);

    if (item.stillData) {
      var img = document.createElement("img");
      img.src = item.stillData;
      img.alt = "Still left at " + item.placeHint;
      els.hear.appendChild(img);
    } else if (item.kind === "still" || item.stillStub) {
      var stillNote = document.createElement("p");
      stillNote.className = "ag-status";
      stillNote.textContent = "A still was left here. Sample entries have no photo file.";
      els.hear.appendChild(stillNote);
    }

    if (item.voiceUrl) {
      var audio = document.createElement("audio");
      audio.controls = true;
      audio.src = item.voiceUrl;
      audio.style.width = "100%";
      audio.style.margin = "0.5rem 0";
      els.hear.appendChild(audio);
    } else if (item.voiceText) {
      var voiceText = document.createElement("p");
      voiceText.className = "ag-status";
      voiceText.textContent = "Voice as text: " + item.voiceText;
      els.hear.appendChild(voiceText);
    } else if (item.kind === "voice" || item.voiceStub) {
      var voiceNote = document.createElement("p");
      voiceNote.className = "ag-status";
      voiceNote.textContent = "A voice was left here. Sample entries have no recording file.";
      els.hear.appendChild(voiceNote);
    }

    var note = document.createElement("p");
    note.className = "ag-note";
    note.textContent = "No comments. No likes. Not a review. Leave it as you found it.";
    els.hear.appendChild(note);

    var move = document.createElement("button");
    move.type = "button";
    move.className = "ag-btn ag-btn-quiet";
    move.textContent = "Move on";
    move.addEventListener("click", function () {
      state.hearingId = null;
      renderHear();
    });
    els.hear.appendChild(move);
  }

  function render() {
    renderSpots();
    renderStage();
    renderHere();
    renderList();
    renderHear();
  }

  function goToStage(id, point, source) {
    var stage = STAGES[id];
    if (!stage) return;
    state.stageId = id;
    state.you = {
      x: clamp(point.x, 0.8, stage.widthM - 0.8),
      y: clamp(point.y, 0.8, stage.heightM - 0.8)
    };
    state.source = source || "demo";
    if (state.hearingId) {
      var heard = allAfterglows().filter(function (item) {
        return item.id === state.hearingId;
      })[0];
      if (!heard || heard.stageId !== id || distance(state.you, heard) > RADIUS_M) {
        state.hearingId = null;
      }
    }
    saveStore();
    render();
  }

  function hear(id) {
    var item = allAfterglows().filter(function (entry) {
      return entry.id === id;
    })[0];
    if (!item || distance(state.you, item) > RADIUS_M) {
      setStatus("That whisper is outside earshot. Walk closer.");
      return;
    }
    state.plays[item.id] = playsFor(item) + 1;
    state.hearingId = item.id;
    saveStore();
    setStatus("A whisper from the past. Then you move on.");
    render();
  }

  function pointFromEvent(event) {
    var svg = els.stage;
    var pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) return null;
    var local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function onStageClick(event) {
    var point = pointFromEvent(event);
    if (!point) return;
    goToStage(state.stageId, point, state.source === "geo" ? "geo" : "demo");
    setStatus("You stood here. Only residue inside 15 m can be heard.");
  }

  function stopVoice(keepUrl) {
    if (state.voice.timer) {
      window.clearInterval(state.voice.timer);
      state.voice.timer = null;
    }
    if (state.voice.recorder && state.voice.recorder.state !== "inactive") {
      try {
        state.voice.recorder.stop();
      } catch (err) {
        /* ignore */
      }
    }
    if (state.voice.stream) {
      state.voice.stream.getTracks().forEach(function (track) {
        track.stop();
      });
    }
    if (!keepUrl && state.voice.url) {
      URL.revokeObjectURL(state.voice.url);
      state.voice.url = "";
    }
    state.voice.stream = null;
    state.voice.recorder = null;
    state.voice.chunks = [];
    els.recLed.classList.remove("is-live");
    els.recLed.hidden = true;
    els.voiceStart.disabled = false;
    els.voiceStop.disabled = true;
  }

  function startVoice() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
      els.voiceFallback.hidden = false;
      setStatus("This browser will not record. Leave the voice as text, or just the line.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        state.voice.stream = stream;
        state.voice.chunks = [];
        var mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
        state.voice.recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        state.voice.recorder.ondataavailable = function (event) {
          if (event.data && event.data.size) state.voice.chunks.push(event.data);
        };
        state.voice.recorder.onstop = function () {
          if (!state.voice.chunks.length) return;
          var blob = new Blob(state.voice.chunks, { type: state.voice.recorder.mimeType || "audio/webm" });
          if (state.voice.url) URL.revokeObjectURL(state.voice.url);
          state.voice.url = URL.createObjectURL(blob);
          setStatus("Voice taped. Leave it with the line.");
        };
        state.voice.seconds = 0;
        state.voice.recorder.start();
        els.recLed.hidden = false;
        els.recLed.classList.add("is-live");
        els.voiceStart.disabled = true;
        els.voiceStop.disabled = false;
        setStatus("Recording. Keep it short — under " + VOICE_MAX_S + "s.");
        state.voice.timer = window.setInterval(function () {
          state.voice.seconds += 1;
          var recLabel = document.getElementById("ag-rec-label");
          if (recLabel) recLabel.textContent = " rec " + state.voice.seconds + "s";
          if (state.voice.seconds >= VOICE_MAX_S) stopVoice(true);
        }, 1000);
      })
      .catch(function () {
        els.voiceFallback.hidden = false;
        setStatus("Mic was not allowed. Leave the voice as text, or just the line.");
      });
  }

  function readStill(file) {
    if (!file) {
      state.stillData = "";
      els.thumb.classList.remove("is-on");
      els.thumb.removeAttribute("src");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 480;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        state.stillData = canvas.toDataURL("image/jpeg", 0.7);
        els.thumb.src = state.stillData;
        els.thumb.classList.add("is-on");
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  }

  function leaveAfterglow(event) {
    event.preventDefault();
    var line = (els.line.value || "").trim().slice(0, LINE_MAX);
    if (!line) {
      setStatus("One line is required. Then you can leave it.");
      els.line.focus();
      return;
    }
    var voiceText = (els.voiceText.value || "").trim();
    var item = {
      id: "local-" + now().toString(36) + "-" + Math.floor(Math.random() * 1000).toString(36),
      stageId: state.stageId,
      x: state.you.x,
      y: state.you.y,
      kind: state.voice.url || voiceText ? "voice" : state.stillData ? "still" : "line",
      line: line,
      placeHint: currentStage().name.toLowerCase(),
      plays: 0,
      createdAt: now(),
      voiceUrl: "",
      voiceText: voiceText,
      stillData: state.stillData
    };

    if (state.voice.url) {
      fetch(state.voice.url)
        .then(function (res) {
          return res.blob();
        })
        .then(function (blob) {
          return blobToDataUrl(blob);
        })
        .then(function (url) {
          item.voiceUrl = url;
          persistLocal(item);
        })
        .catch(function () {
          persistLocal(item);
        });
      return;
    }
    persistLocal(item);
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ""));
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function persistLocal(item) {
    try {
      var probe = state.locals.concat([item]);
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          locals: probe,
          plays: state.plays,
          stageId: state.stageId,
          you: state.you
        })
      );
      state.locals = probe;
    } catch (err) {
      item.voiceUrl = "";
      item.stillData = "";
      state.locals.push(item);
      saveStore();
      setStatus("Kept the line. This browser would not hold the still or voice.");
      afterLeave();
      return;
    }
    setStatus("Left. Walk away, then come back into the 15 m ring to hear it.");
    afterLeave();
  }

  function afterLeave() {
    els.line.value = "";
    els.voiceText.value = "";
    els.still.value = "";
    state.stillData = "";
    els.thumb.classList.remove("is-on");
    els.thumb.removeAttribute("src");
    stopVoice(false);
    state.voice.text = "";
    render();
  }

  function resetDemo() {
    state.locals = [];
    state.plays = {};
    state.hearingId = null;
    state.stillData = "";
    stopVoice(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      /* ignore */
    }
    goToStage("hotel", STAGES.hotel.start, "demo");
    setStatus("Demo tape cleared. Sample whispers are back.");
  }

  function useGeo() {
    if (!navigator.geolocation) {
      setStatus("This browser has no geolocation. Use the sample spots.");
      return;
    }
    setStatus("Listening for this place…");
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        var nearest = null;
        var nearestM = Infinity;
        Object.keys(STAGES).forEach(function (id) {
          var stage = STAGES[id];
          var meters = haversine(here, stage.origin);
          if (meters < nearestM) {
            nearestM = meters;
            nearest = stage;
          }
        });
        if (!nearest || nearestM > 400) {
          state.geoNote = "You are not near a demo pin, so the sample spots stay.";
          state.source = "demo";
          saveStore();
          render();
          setStatus("Not near a demo pin. Hotel, train, venue, and Niagara stay as sample spots.");
          return;
        }
        state.geoNote = "Snapped to " + nearest.name + " (" + Math.round(nearestM) + " m from the pin).";
        goToStage(nearest.id, offsetToStagePoint(nearest, here.lat, here.lng), "geo");
        setStatus("Using this place, mapped onto the nearest demo pin.");
      },
      function () {
        state.geoNote = "Location was not allowed. Sample spots stay.";
        render();
        setStatus("Location was not allowed. Click the stage or pick a sample spot.");
      },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 8000 }
    );
  }

  function bind() {
    els.spots = $("ag-spots");
    els.stage = $("ag-stage");
    els.stageMeta = $("ag-stage-meta");
    els.here = $("ag-here");
    els.list = $("ag-list");
    els.empty = $("ag-empty");
    els.hear = $("ag-hear");
    els.status = $("ag-status");
    els.form = $("ag-form");
    els.line = $("ag-line");
    els.lineCount = $("ag-line-count");
    els.voiceStart = $("ag-voice-start");
    els.voiceStop = $("ag-voice-stop");
    els.voiceText = $("ag-voice-text");
    els.voiceFallback = $("ag-voice-fallback");
    els.recLed = $("ag-rec-led");
    els.still = $("ag-still");
    els.thumb = $("ag-thumb");
    els.geo = $("ag-geo");
    els.reset = $("ag-reset");

    els.stage.addEventListener("click", onStageClick);
    els.form.addEventListener("submit", leaveAfterglow);
    els.line.addEventListener("input", function () {
      els.line.value = els.line.value.slice(0, LINE_MAX);
      els.lineCount.textContent = els.line.value.length + "/" + LINE_MAX;
    });
    els.voiceStart.addEventListener("click", startVoice);
    els.voiceStop.addEventListener("click", function () {
      stopVoice(true);
    });
    els.still.addEventListener("change", function () {
      readStill(els.still.files && els.still.files[0]);
    });
    els.geo.addEventListener("click", useGeo);
    els.reset.addEventListener("click", resetDemo);
  }

  document.addEventListener("DOMContentLoaded", function () {
    bind();
    loadStore();
    if (!STAGES[state.stageId]) {
      state.stageId = "hotel";
      state.you = { x: 16, y: 14 };
    }
    render();
    els.lineCount.textContent = "0/" + LINE_MAX;
    setStatus("Whispers from the past. Stand somewhere. Only 15 m can hear.");
  });
})();
