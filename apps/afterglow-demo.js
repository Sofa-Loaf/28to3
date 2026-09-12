(function () {
  "use strict";

  /**
   * Locked doctrine for this web prototype. Do not add a feed, likes,
   * comments, stars, place ranking, or reviews.
   * GPS is the trigger. 15 m / ~50 ft is the access gate. Pins stay exact.
   * Capture is 8–12s voice, a still, or one line. Plays are listen stubs.
   */
  var DOCTRINE = {
    gpsTrigger: true,
    radiusM: 15,
    radiusFt: 50,
    precisePins: true,
    reviews: false,
    playsAreListens: true,
    sortByPlaysWhenHeard: true
  };

  var RADIUS_M = DOCTRINE.radiusM;
  var SNAP_M = 400;
  var LINE_MAX = 80;
  var VOICE_MIN_S = 8;
  var VOICE_MAX_S = 12;
  var STORAGE_KEY = "afterglow-web-prototype-v1";
  var EARTH_M = 6371000;
  var COLOR = {
    amber: "#c4a06a",
    amberSoft: "#d4b484",
    amberMuted: "rgba(196, 160, 106, 0.14)",
    tape: "#6b5340",
    line: "#3a3228",
    black: "#000000",
    dust: "#8c8070"
  };

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
  var restored = false;
  var watchId = null;
  var state = {
    stageId: "hotel",
    you: { x: 16, y: 14 },
    source: "demo",
    geoNote: "",
    locals: [],
    plays: {},
    hearingId: null,
    captureKind: null,
    voice: { stream: null, recorder: null, chunks: [], url: "", text: "", seconds: 0, timer: null, pendingLeave: false },
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
    return "a line";
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
        restored = true;
      }
      if (parsed && (parsed.source === "geo" || parsed.source === "demo")) {
        state.source = parsed.source;
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
          you: state.you,
          source: state.source
        })
      );
    } catch (err) {
      setStatus("The tape is full on this browser. The whisper was kept without the still or voice.");
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

  function inGate(item) {
    return item && item.stageId === state.stageId && distance(state.you, item) <= RADIUS_M;
  }

  function metersAway(item) {
    return distance(state.you, item);
  }

  function formatMeters(meters) {
    if (meters < 1) return "right here";
    return Math.round(meters) + " m";
  }

  function nearby() {
    var list = allAfterglows().filter(inGate);
    var anyPlays = DOCTRINE.sortByPlaysWhenHeard && list.some(function (item) {
      return item.plays >= 1;
    });
    list.sort(function (a, b) {
      if (anyPlays && b.plays !== a.plays) return b.plays - a.plays;
      return b.createdAt - a.createdAt;
    });
    return list;
  }

  function findItem(id) {
    return allAfterglows().filter(function (item) {
      return item.id === id;
    })[0] || null;
  }

  function setStatus(text) {
    if (els.status) els.status.textContent = text || "";
  }

  function currentStage() {
    return STAGES[state.stageId];
  }

  function showView(name) {
    ["home", "leave", "capture", "residue"].forEach(function (id) {
      var view = $("ag-view-" + id);
      if (view) view.hidden = id !== name;
    });
    if (name === "home") window.scrollTo(0, 0);
  }

  function tapeButton(label, kind, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = kind === "ghost" ? "ag-tape ag-tape-ghost" : "ag-tape";
    if (kind !== "ghost") {
      var left = document.createElement("span");
      left.className = "ag-reel";
      left.setAttribute("aria-hidden", "true");
      var right = document.createElement("span");
      right.className = "ag-reel";
      right.setAttribute("aria-hidden", "true");
      btn.appendChild(left);
      btn.appendChild(document.createTextNode(label));
      btn.appendChild(right);
    } else {
      btn.textContent = label;
    }
    btn.addEventListener("click", onClick);
    return btn;
  }

  function setCaptureKind(kind) {
    state.captureKind = kind;
    els.chooser.hidden = kind !== null;
    els.voicePanel.hidden = kind !== "voice";
    els.stillPanel.hidden = kind !== "still";
    els.form.hidden = kind !== "line";
    if (kind === "line") {
      els.line.focus();
      setStatus("One line. Then leave it.");
    }
    if (kind === "still") {
      setStatus("A still — no face required. Then leave it.");
    }
  }

  function resetCapture() {
    state.captureKind = null;
    els.line.value = "";
    els.voiceText.value = "";
    els.still.value = "";
    state.stillData = "";
    els.thumb.classList.remove("is-on");
    els.thumb.removeAttribute("src");
    els.lineCount.textContent = "0/" + LINE_MAX;
    els.stillLeave.disabled = true;
    els.voiceFallback.hidden = true;
    stopVoice(false);
    setCaptureKind(null);
    setStatus("Choose one. Then leave it.");
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
        stopWatch();
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
    grid.appendChild(svgEl("path", { d: "M 4 0 L 0 0 0 4", fill: "none", stroke: COLOR.line, "stroke-width": "0.12" }));
    defs.appendChild(grid);
    svg.appendChild(defs);
    svg.appendChild(svgEl("rect", { x: "0", y: "0", width: String(stage.widthM), height: String(stage.heightM), fill: COLOR.black }));
    svg.appendChild(svgEl("rect", { x: "0", y: "0", width: String(stage.widthM), height: String(stage.heightM), fill: "url(#ag-grid)" }));

    stage.landmarks.forEach(function (mark) {
      svg.appendChild(
        svgEl("text", {
          x: String(mark.x),
          y: String(mark.y - 1.2),
          fill: COLOR.dust,
          "font-size": "1.5",
          "font-family": "Menlo, IBM Plex Mono, ui-monospace, monospace",
          "text-anchor": "middle"
        })
      ).textContent = mark.label;
    });

    svg.appendChild(
      svgEl("circle", {
        cx: String(state.you.x),
        cy: String(state.you.y),
        r: String(RADIUS_M),
        fill: COLOR.amberMuted,
        stroke: COLOR.amber,
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
        var hit = svgEl("circle", {
          cx: String(item.x),
          cy: String(item.y),
          r: "1.8",
          fill: "transparent",
          "data-pin": item.id,
          style: "cursor:pointer"
        });
        if (near) {
          svg.appendChild(
            svgEl("circle", {
              class: "ag-pin-halo",
              cx: String(item.x),
              cy: String(item.y),
              r: "1.7",
              fill: COLOR.amberMuted,
              "data-pin": item.id
            })
          );
        }
        var pin = svgEl("circle", {
          cx: String(item.x),
          cy: String(item.y),
          r: near ? "0.85" : "0.7",
          fill: near ? COLOR.amber : COLOR.tape,
          stroke: near ? COLOR.amberSoft : COLOR.line,
          "stroke-width": "0.2",
          "data-pin": item.id,
          style: "cursor:pointer"
        });
        var tip = svgEl("title");
        tip.textContent =
          item.placeHint +
          " · " +
          formatMeters(metersAway(item)) +
          (near ? " · in the gate" : " · outside the gate");
        hit.appendChild(tip);
        svg.appendChild(hit);
        svg.appendChild(pin);
      });

    svg.appendChild(
      svgEl("circle", {
        class: "ag-pin-halo",
        cx: String(state.you.x),
        cy: String(state.you.y),
        r: "2.1",
        fill: COLOR.amberMuted
      })
    );
    var you = svgEl("circle", {
      class: "ag-you-dot",
      cx: String(state.you.x),
      cy: String(state.you.y),
      r: "0.85",
      fill: COLOR.amber
    });
    svg.appendChild(you);
    svg.appendChild(
      svgEl("circle", {
        cx: String(state.you.x),
        cy: String(state.you.y),
        r: "1.5",
        fill: "none",
        stroke: "rgba(196, 160, 106, 0.5)",
        "stroke-width": "0.2"
      })
    );
  }

  function renderHere() {
    var stage = currentStage();
    var count = nearby().length;
    var live = state.source === "geo";
    els.geoPanel.hidden = live;
    els.here.hidden = !live && !state.geoNote;
    if (live) {
      els.here.textContent = "At this pin · ~50 ft · " + stage.name.toLowerCase();
    } else if (state.geoNote) {
      els.here.textContent =
        "Using sample coordinates · ~50 ft · " +
        stage.name.toLowerCase() +
        " · " +
        count +
        (count === 1 ? " whisper" : " whispers");
    } else {
      els.here.textContent = "Using sample coordinates · ~50 ft";
      els.here.hidden = false;
    }
    els.stageMeta.textContent = stage.hint + (state.geoNote ? " " + state.geoNote : "");
    if (els.geo) {
      els.geo.classList.toggle("is-on", live);
    }
    if (els.leaveMeta) {
      els.leaveMeta.textContent =
        "GPS in the foreground. The pin is precise; about fifty feet is the gate. " +
        stage.name +
        ".";
    }
  }

  function renderList() {
    var items = nearby();
    els.list.innerHTML = "";
    els.emptyBox.hidden = !!items.length;

    if (els.sort) {
      var anyPlays = items.some(function (item) {
        return item.plays >= 1;
      });
      els.sort.hidden = !items.length;
      els.sort.textContent = anyPlays
        ? "Sorted by plays — listens, not a score. Not a ranking of the place."
        : "No plays yet. Newest first. Plays are listens, not reviews.";
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
      line.textContent =
        item.kind === "line" && item.line ? item.line : "at " + item.placeHint;

      var meta = document.createElement("p");
      meta.className = "ag-card-meta";
      meta.textContent =
        ageLabel(item.createdAt) +
        " · " +
        formatMeters(metersAway(item)) +
        (item.origin === "sample" ? " · sample" : "") +
        " · " +
        item.plays +
        (item.plays === 1 ? " play" : " plays");

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
    var item = findItem(state.hearingId);
    if (!item) {
      els.hear.innerHTML = "";
      return;
    }

    if (!inGate(item)) {
      els.hear.innerHTML = "";
      var farKicker = document.createElement("p");
      farKicker.className = "ag-kicker";
      farKicker.textContent = "same spot";
      var farTitle = document.createElement("p");
      farTitle.className = "ag-display";
      farTitle.textContent = "at " + item.placeHint;
      var farBox = document.createElement("div");
      farBox.className = "ag-empty-box";
      var farBody = document.createElement("p");
      farBody.className = "ag-empty";
      farBody.textContent = "This whisper stays at the pin. Stand within about fifty feet.";
      farBox.appendChild(farBody);
      var farFoot = document.createElement("div");
      farFoot.className = "ag-footer-actions";
      farFoot.appendChild(
        tapeButton("Move on", "ghost", function () {
          state.hearingId = null;
          showView("home");
        })
      );
      els.hear.appendChild(farKicker);
      els.hear.appendChild(farTitle);
      els.hear.appendChild(farBox);
      els.hear.appendChild(farFoot);
      return;
    }

    els.hear.innerHTML = "";

    var kicker = document.createElement("p");
    kicker.className = "ag-kicker";
    kicker.textContent = item.origin === "sample" ? "sample residue" : "your residue";

    var title = document.createElement("p");
    title.className = "ag-hear-line";
    title.textContent = item.line || "at " + item.placeHint;

    var meta = document.createElement("p");
    meta.className = "ag-card-meta";
    meta.textContent =
      "at " +
      item.placeHint +
      " · " +
      formatMeters(metersAway(item)) +
      " · " +
      item.plays +
      (item.plays === 1 ? " listen" : " listens") +
      " · not a review";

    els.hear.appendChild(kicker);
    els.hear.appendChild(title);
    els.hear.appendChild(meta);

    if (item.stillData) {
      var img = document.createElement("img");
      img.src = item.stillData;
      img.alt = "Still left at " + item.placeHint;
      els.hear.appendChild(img);
    } else if (item.kind === "still" || item.stillStub) {
      var stillBox = document.createElement("div");
      stillBox.className = "ag-empty-box";
      var stillNote = document.createElement("p");
      stillNote.className = "ag-empty";
      stillNote.textContent = "A still was left here. Sample entries have no photo file.";
      stillBox.appendChild(stillNote);
      els.hear.appendChild(stillBox);
    }

    if (item.voiceUrl) {
      var audio = document.createElement("audio");
      audio.controls = true;
      audio.src = item.voiceUrl;
      audio.style.width = "100%";
      audio.style.margin = "0 0 16px";
      els.hear.appendChild(audio);
    } else if (item.voiceText) {
      var voiceText = document.createElement("p");
      voiceText.className = "ag-body";
      voiceText.textContent = "Voice as text: " + item.voiceText;
      els.hear.appendChild(voiceText);
    } else if (item.kind === "voice" || item.voiceStub) {
      var voiceBox = document.createElement("div");
      voiceBox.className = "ag-empty-box";
      var voiceNote = document.createElement("p");
      voiceNote.className = "ag-empty";
      voiceNote.textContent = "A voice was left here. Sample entries have no recording file.";
      voiceBox.appendChild(voiceNote);
      els.hear.appendChild(voiceBox);
    }

    var note = document.createElement("p");
    note.className = "ag-body";
    note.textContent = "No comments. No likes. No stars. Leave it as you found it.";
    els.hear.appendChild(note);

    var foot = document.createElement("div");
    foot.className = "ag-footer-actions";
    foot.appendChild(
      tapeButton("Move on", "ghost", function () {
        state.hearingId = null;
        showView("home");
      })
    );
    els.hear.appendChild(foot);
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
    if (state.hearingId && !inGate(findItem(state.hearingId))) {
      state.hearingId = null;
    }
    saveStore();
    render();
  }

  function hear(id) {
    var item = findItem(id);
    if (!inGate(item)) {
      var away = item ? Math.round(metersAway(item)) : 0;
      state.hearingId = item ? item.id : null;
      showView("residue");
      renderHear();
      setStatus(
        item
          ? away + " m away — outside the 15 m gate. Walk closer. The pin stays exact."
          : "That whisper is outside the gate."
      );
      return;
    }
    state.plays[item.id] = playsFor(item) + 1;
    state.hearingId = item.id;
    saveStore();
    showView("residue");
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
    var pinId = event.target && event.target.getAttribute && event.target.getAttribute("data-pin");
    if (pinId) {
      var pinItem = findItem(pinId);
      if (!pinItem) return;
      hear(pinId);
      return;
    }
    var point = pointFromEvent(event);
    if (!point) return;
    stopWatch();
    goToStage(state.stageId, { x: point.x, y: point.y }, "demo");
    setStatus("You stood here. About fifty feet is the access. Pins stay exact.");
  }

  function updateVoiceMeter() {
    if (!els.recLabel) return;
    var live = !!(state.voice.recorder && state.voice.recorder.state === "recording");
    els.recLabel.textContent = (live ? state.voice.seconds + "s" : "ready") + " / " + VOICE_MAX_S + "s";
    els.recLed.hidden = false;
    els.recLed.classList.toggle("is-live", live);
    els.voiceLeave.disabled = !live || state.voice.seconds < VOICE_MIN_S;
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
    if (!keepUrl) {
      state.voice.pendingLeave = false;
      if (state.voice.url) {
        URL.revokeObjectURL(state.voice.url);
        state.voice.url = "";
      }
    }
    state.voice.stream = null;
    state.voice.recorder = null;
    state.voice.chunks = [];
    if (els.recLed) {
      els.recLed.classList.remove("is-live");
    }
    if (els.voiceStart) els.voiceStart.disabled = false;
    if (els.voiceLeave) els.voiceLeave.disabled = true;
    updateVoiceMeter();
  }

  function startVoice() {
    setCaptureKind("voice");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === "undefined") {
      els.voiceFallback.hidden = false;
      els.voiceLeave.hidden = true;
      setStatus("This browser will not record. Leave the voice as text.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        state.voice.stream = stream;
        state.voice.chunks = [];
        var mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
        state.voice.recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        var mimeType = state.voice.recorder.mimeType || "audio/webm";
        state.voice.recorder.ondataavailable = function (event) {
          if (event.data && event.data.size) state.voice.chunks.push(event.data);
        };
        state.voice.recorder.onstop = function () {
          if (!state.voice.chunks.length) {
            if (state.voice.pendingLeave) {
              state.voice.pendingLeave = false;
              setStatus("Too short. A voice afterglow is " + VOICE_MIN_S + "–" + VOICE_MAX_S + " seconds.");
            }
            return;
          }
          var blob = new Blob(state.voice.chunks, { type: mimeType });
          if (state.voice.url) URL.revokeObjectURL(state.voice.url);
          state.voice.url = URL.createObjectURL(blob);
          if (state.voice.pendingLeave) {
            state.voice.pendingLeave = false;
            persistKind({
              kind: "voice",
              line: "",
              voiceUrl: state.voice.url,
              voiceText: ""
            });
          }
        };
        state.voice.seconds = 0;
        state.voice.recorder.start();
        els.voiceStart.disabled = true;
        els.voiceLeave.hidden = false;
        setStatus("Recording. Keep it between " + VOICE_MIN_S + "–" + VOICE_MAX_S + "s.");
        updateVoiceMeter();
        state.voice.timer = window.setInterval(function () {
          state.voice.seconds += 1;
          updateVoiceMeter();
          if (state.voice.seconds >= VOICE_MAX_S) finishVoice();
        }, 1000);
      })
      .catch(function () {
        els.voiceFallback.hidden = false;
        els.voiceLeave.hidden = true;
        setStatus("Mic was not allowed. Leave the voice as text.");
      });
  }

  function finishVoice() {
    var seconds = state.voice.seconds;
    if (seconds < VOICE_MIN_S) {
      state.voice.pendingLeave = false;
      stopVoice(false);
      setStatus("Too short. A voice afterglow is " + VOICE_MIN_S + "–" + VOICE_MAX_S + " seconds.");
      return;
    }
    state.voice.pendingLeave = true;
    stopVoice(true);
  }

  function readStill(file) {
    if (!file) {
      state.stillData = "";
      els.thumb.classList.remove("is-on");
      els.thumb.removeAttribute("src");
      els.stillLeave.disabled = true;
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
        els.stillLeave.disabled = false;
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  }

  function leaveLine(event) {
    if (event) event.preventDefault();
    var line = (els.line.value || "").trim().slice(0, LINE_MAX);
    if (!line) {
      setStatus("One line. Then leave it.");
      els.line.focus();
      return;
    }
    persistKind({ kind: "line", line: line });
  }

  function leaveVoiceText() {
    var voiceText = (els.voiceText.value || "").trim();
    if (!voiceText) {
      setStatus("Leave the voice as text, or record 8–12 seconds.");
      return;
    }
    persistKind({ kind: "voice", line: "", voiceText: voiceText });
  }

  function leaveStill() {
    if (!state.stillData) {
      setStatus("A still — no face required. Then leave it.");
      return;
    }
    persistKind({ kind: "still", line: "", stillData: state.stillData });
  }

  function persistKind(partial) {
    var item = {
      id: "local-" + now().toString(36) + "-" + Math.floor(Math.random() * 1000).toString(36),
      stageId: state.stageId,
      x: state.you.x,
      y: state.you.y,
      kind: partial.kind,
      line: partial.line || "",
      placeHint: currentStage().name.toLowerCase(),
      plays: 0,
      createdAt: now(),
      voiceUrl: "",
      voiceText: partial.voiceText || "",
      stillData: partial.stillData || ""
    };

    if (partial.voiceUrl) {
      fetch(partial.voiceUrl)
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
          you: state.you,
          source: state.source
        })
      );
      state.locals = probe;
    } catch (err) {
      item.voiceUrl = "";
      item.stillData = "";
      state.locals.push(item);
      saveStore();
      setStatus("Kept the whisper. This browser would not hold the still or voice.");
      afterLeave();
      return;
    }
    setStatus("Left. Walk away, then come back into about fifty feet to hear it.");
    afterLeave();
  }

  function afterLeave() {
    resetCapture();
    showView("home");
    render();
  }

  function resetDemo() {
    state.locals = [];
    state.plays = {};
    state.hearingId = null;
    state.stillData = "";
    resetCapture();
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      /* ignore */
    }
    stopWatch();
    goToStage("hotel", STAGES.hotel.start, "demo");
    showView("home");
    setStatus("Demo tape cleared. Sample whispers are back.");
  }

  function nearestStage(here) {
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
    return { stage: nearest, meters: nearestM };
  }

  function applyGeo(pos, fromWatch) {
    var here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    var found = nearestStage(here);
    if (!found.stage || found.meters > SNAP_M) {
      if (fromWatch) return;
      state.geoNote = "GPS is on, but you are not near a demo pin. Sample stands stand in.";
      saveStore();
      render();
      setStatus("GPS trigger heard you, not near a demo pin. Hotel, train, venue, and Niagara stay as stands.");
      return;
    }
    var stand = offsetToStagePoint(found.stage, here.lat, here.lng);
    if (
      fromWatch &&
      state.source === "geo" &&
      state.stageId === found.stage.id &&
      distance(state.you, stand) < 1
    ) {
      return;
    }
    state.geoNote =
      "GPS trigger · " +
      found.stage.name +
      " · " +
      Math.round(found.meters) +
      " m from the sample origin. Pin is exact.";
    goToStage(found.stage.id, stand, "geo");
    setStatus("GPS trigger. You are here. Only the 15 m gate can hear.");
  }

  function startWatch() {
    if (!DOCTRINE.gpsTrigger || !navigator.geolocation || watchId != null) return;
    watchId = navigator.geolocation.watchPosition(
      function (pos) {
        applyGeo(pos, true);
      },
      function () {
        /* keep the last stand */
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );
  }

  function stopWatch() {
    if (watchId == null || !navigator.geolocation) return;
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  function useGeo() {
    if (!navigator.geolocation) {
      setStatus("This browser has no GPS. Tap the stage — that stand-in is the trigger.");
      return;
    }
    setStatus("GPS trigger — listening for this place…");
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        applyGeo(pos, false);
        startWatch();
      },
      function () {
        state.geoNote = "GPS was not allowed. Tap the stage to stand in for the trigger.";
        render();
        setStatus("GPS was not allowed. A tap on the stage stands in.");
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 }
    );
  }

  function goHome() {
    resetCapture();
    state.hearingId = null;
    showView("home");
    render();
  }

  function bind() {
    els.spots = $("ag-spots");
    els.stage = $("ag-stage");
    els.stageMeta = $("ag-stage-meta");
    els.here = $("ag-here");
    els.list = $("ag-list");
    els.empty = $("ag-empty");
    els.emptyBox = $("ag-empty-box");
    els.hear = $("ag-hear");
    els.status = $("ag-status");
    els.form = $("ag-form");
    els.line = $("ag-line");
    els.lineCount = $("ag-line-count");
    els.voiceStart = $("ag-voice-start");
    els.voiceLeave = $("ag-voice-leave");
    els.voiceText = $("ag-voice-text");
    els.voiceTextLeave = $("ag-voice-text-leave");
    els.voiceFallback = $("ag-voice-fallback");
    els.voicePanel = $("ag-voice-panel");
    els.stillPanel = $("ag-still-panel");
    els.chooser = $("ag-chooser");
    els.recLed = $("ag-rec-led");
    els.recLabel = $("ag-rec-label");
    els.still = $("ag-still");
    els.stillLeave = $("ag-still-leave");
    els.thumb = $("ag-thumb");
    els.geo = $("ag-geo");
    els.geoPanel = $("ag-geo-panel");
    els.reset = $("ag-reset");
    els.sort = $("ag-sort");
    els.leaveMeta = $("ag-leave-meta");

    els.stage.addEventListener("click", onStageClick);
    els.form.addEventListener("submit", leaveLine);
    els.line.addEventListener("input", function () {
      els.line.value = els.line.value.slice(0, LINE_MAX);
      els.lineCount.textContent = els.line.value.length + "/" + LINE_MAX;
    });
    els.voiceStart.addEventListener("click", startVoice);
    els.voiceLeave.addEventListener("click", finishVoice);
    els.voiceTextLeave.addEventListener("click", leaveVoiceText);
    $("ag-choose-still").addEventListener("click", function () {
      setCaptureKind("still");
    });
    $("ag-choose-line").addEventListener("click", function () {
      setCaptureKind("line");
    });
    $("ag-go-leave").addEventListener("click", function () {
      showView("leave");
    });
    $("ag-go-capture").addEventListener("click", function () {
      resetCapture();
      showView("capture");
    });
    $("ag-leave-it").addEventListener("click", function () {
      resetCapture();
      showView("capture");
    });
    $("ag-leave-back").addEventListener("click", goHome);
    $("ag-capture-back").addEventListener("click", goHome);
    els.still.addEventListener("change", function () {
      readStill(els.still.files && els.still.files[0]);
    });
    els.stillLeave.addEventListener("click", leaveStill);
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
    showView("home");
    render();
    els.lineCount.textContent = "0/" + LINE_MAX;
    setStatus("Choose one. Then leave it.");
    if (restored && state.source === "geo") {
      startWatch();
    }
  });
})();
