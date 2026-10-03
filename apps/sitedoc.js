(function () {
  "use strict";

  var DEVICE_TYPES = ["Switch", "WAP", "Server", "Computer", "Firewall", "UPS", "PatchPanel", "Camera", "IDF", "MDF", "Rack", "Other"];
  var JOB_KEY = "sitedoc:job";
  var DEVICES_KEY = "sitedoc:devices";
  var PINS_KEY = "sitedoc:pins";

  var state = {
    job: defaultJob(),
    photos: [],
    devices: [],
    pins: [],
    planUrl: null,
    selectedPin: null,
    filter: "",
    stream: null,
    staged: null,
    ready: false
  };

  var dbPromise = null;
  var mapGesture = null;

  function $(id) {
    return document.getElementById(id);
  }

  function defaultJob() {
    return {
      client: "",
      location: "",
      room: "",
      deviceType: "Switch",
      number: 1,
      autoIncrement: true,
      note: "",
      burnCaption: false,
      gps: null
    };
  }

  function slug(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function formatNN(value) {
    var num = parseInt(value, 10);
    if (!isFinite(num) || num < 1) num = 1;
    if (num > 99) num = 99;
    return String(num).padStart(2, "0");
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function currentName() {
    var client = slug(state.job.client);
    var location = slug(state.job.location);
    var room = slug(state.job.room);
    var type = slug(state.job.deviceType);
    var nn = formatNN(state.job.number);
    var ok = !!(client && location && room && type && DEVICE_TYPES.indexOf(state.job.deviceType) !== -1);
    var stem = ok ? [client, location, room, type, nn].join("-") : "";
    return {
      ok: ok,
      stem: stem,
      filename: ok ? stem + ".jpg" : "",
      nn: nn,
      client: client,
      location: location,
      room: room,
      type: type
    };
  }

  function setStatus(text) {
    $("sd-status").textContent = text;
  }

  function readForm() {
    var type = $("sd-type").value;
    if (DEVICE_TYPES.indexOf(type) === -1) type = "Other";
    state.job.client = $("sd-client").value;
    state.job.location = $("sd-location").value;
    state.job.room = $("sd-room").value;
    state.job.deviceType = type;
    state.job.number = parseInt($("sd-number").value, 10) || 1;
    state.job.note = $("sd-note").value;
    state.job.autoIncrement = $("sd-auto").checked;
    state.job.burnCaption = $("sd-caption").checked;
    if (state.job.number < 1) state.job.number = 1;
    if (state.job.number > 99) state.job.number = 99;
  }

  function writeForm() {
    $("sd-client").value = state.job.client || "";
    $("sd-location").value = state.job.location || "";
    $("sd-room").value = state.job.room || "";
    $("sd-type").value = DEVICE_TYPES.indexOf(state.job.deviceType) === -1 ? "Switch" : state.job.deviceType;
    $("sd-number").value = String(state.job.number || 1);
    $("sd-note").value = state.job.note || "";
    $("sd-auto").checked = !!state.job.autoIncrement;
    $("sd-caption").checked = !!state.job.burnCaption;
    renderGps();
  }

  function saveJob() {
    try {
      localStorage.setItem(JOB_KEY, JSON.stringify(state.job));
    } catch (err) {
      setStatus("Could not store the job on this browser.");
    }
  }

  function loadJob() {
    try {
      var raw = localStorage.getItem(JOB_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      state.job = Object.assign(defaultJob(), saved || {});
      if (DEVICE_TYPES.indexOf(state.job.deviceType) === -1) state.job.deviceType = "Other";
      state.job.number = parseInt(state.job.number, 10) || 1;
    } catch (err) {
      state.job = defaultJob();
    }
  }

  function saveDevices() {
    localStorage.setItem(DEVICES_KEY, JSON.stringify(state.devices));
    renderDeviceList();
  }

  function savePins() {
    localStorage.setItem(PINS_KEY, JSON.stringify(state.pins));
  }

  function loadLists() {
    try {
      state.devices = JSON.parse(localStorage.getItem(DEVICES_KEY) || "[]") || [];
    } catch (err) {
      state.devices = [];
    }
    try {
      state.pins = JSON.parse(localStorage.getItem(PINS_KEY) || "[]") || [];
    } catch (err) {
      state.pins = [];
    }
    if (!Array.isArray(state.devices)) state.devices = [];
    if (!Array.isArray(state.pins)) state.pins = [];
  }

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open("sitedoc", 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos", { keyPath: "stem" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "id" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbGetAll(storeName) {
    return dbPromise.then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, "readonly");
        var req = tx.objectStore(storeName).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbPut(storeName, value) {
    return dbPromise.then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put(value);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbDelete(storeName, key) {
    return dbPromise.then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function updatePreview() {
    var name = currentName();
    var node = $("sd-filename");
    node.textContent = name.ok ? name.filename : "Set client, location, and room";
    node.classList.toggle("is-ready", name.ok);
    node.dataset.ready = name.ok ? "true" : "false";
    renderExportSummary();
  }

  function renderGps() {
    var gps = state.job.gps;
    var node = $("sd-gps-read");
    if (!gps) {
      node.textContent = "No GPS fix yet. If location is denied, the photo still saves.";
      return;
    }
    node.textContent = Number(gps.lat).toFixed(5) + ", " + Number(gps.lon).toFixed(5) + " · ±" + Math.round(Number(gps.accuracy) || 0) + " m";
  }

  function showTab(name) {
    document.querySelectorAll("[data-tab]").forEach(function (tab) {
      var on = tab.getAttribute("data-tab") === name;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
    });
    document.querySelectorAll("[data-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== name;
    });
    if (name === "export") renderExportSummary();
    if (name === "floor") renderPins();
  }

  function findPhoto(stem) {
    return state.photos.find(function (photo) { return photo.stem === stem; });
  }

  function findDevice(stem) {
    return state.devices.find(function (device) { return device.stem === stem; });
  }

  function findPin(stem) {
    return state.pins.find(function (pin) { return pin.stem === stem; });
  }

  function renderDeviceList() {
    var list = $("sd-device-list");
    while (list.firstChild) list.removeChild(list.firstChild);
    state.devices.forEach(function (device) {
      var option = document.createElement("option");
      option.value = device.stem;
      list.appendChild(option);
    });
  }

  function sortedPhotos() {
    return state.photos.slice().sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }

  function renderRecent() {
    var list = $("sd-recent");
    var empty = $("sd-recent-empty");
    while (list.firstChild) list.removeChild(list.firstChild);
    var photos = sortedPhotos().slice(0, 8);
    empty.hidden = photos.length > 0;
    photos.forEach(function (photo) {
      var item = document.createElement("li");
      var button = document.createElement("button");
      button.type = "button";
      button.setAttribute("data-use-name", photo.stem);
      var img = document.createElement("img");
      img.src = photo.url;
      img.alt = "";
      var label = document.createElement("span");
      label.textContent = photo.filename;
      button.appendChild(img);
      button.appendChild(label);
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  function photoMatches(photo, query) {
    if (!query) return true;
    var hay = [photo.filename, photo.stem, photo.note, photo.deviceType, photo.room, photo.client, photo.location].join(" ").toLowerCase();
    return hay.indexOf(query.toLowerCase()) !== -1;
  }

  function renderLibrary() {
    var root = $("sd-library");
    var empty = $("sd-library-empty");
    while (root.firstChild) root.removeChild(root.firstChild);
    var photos = sortedPhotos().filter(function (photo) {
      return photoMatches(photo, state.filter);
    });
    empty.hidden = photos.length > 0;
    empty.textContent = state.photos.length && !photos.length ? "Nothing matches that filter." : "No photos yet.";
    photos.forEach(function (photo) {
      var card = document.createElement("article");
      card.className = "sd-lib-card";
      card.setAttribute("data-filename", photo.filename);
      var img = document.createElement("img");
      img.src = photo.url;
      img.alt = "";
      var body = document.createElement("div");
      var title = document.createElement("h3");
      title.textContent = photo.filename;
      var meta = document.createElement("p");
      meta.className = "sd-lib-meta";
      var bits = [photo.deviceType];
      if (photo.note) bits.push(photo.note);
      if (photo.gps) bits.push("GPS");
      meta.textContent = bits.join(" · ");
      var actions = document.createElement("div");
      actions.className = "sd-lib-actions";
      var download = document.createElement("a");
      download.className = "button button-ghost";
      download.href = photo.url;
      download.download = photo.filename;
      download.textContent = "Download";
      var use = document.createElement("button");
      use.type = "button";
      use.className = "button button-ghost";
      use.setAttribute("data-use-name", photo.stem);
      use.textContent = "Use this name";
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button button-ghost";
      remove.setAttribute("data-remove-photo", photo.stem);
      remove.textContent = "Remove";
      actions.appendChild(download);
      actions.appendChild(use);
      actions.appendChild(remove);
      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(actions);
      card.appendChild(img);
      card.appendChild(body);
      root.appendChild(card);
    });
  }

  function renderPhotos() {
    renderRecent();
    renderLibrary();
    renderPins();
    renderExportSummary();
  }

  function renderDevices() {
    var root = $("sd-devices");
    var empty = $("sd-devices-empty");
    while (root.firstChild) root.removeChild(root.firstChild);
    empty.hidden = state.devices.length > 0;
    state.devices.forEach(function (device) {
      var card = document.createElement("article");
      card.className = "sd-device";
      card.setAttribute("data-device", device.stem);
      var title = document.createElement("h3");
      title.textContent = device.stem;
      var fields = document.createElement("div");
      fields.className = "sd-device-fields";
      fields.appendChild(deviceField(device, "uplinkPort", "Uplink port", "Gi1/0/24"));
      fields.appendChild(deviceField(device, "uplinkDevice", "Uplink device", "Device stem"));
      fields.appendChild(deviceField(device, "remotePort", "Remote port", "eth0"));
      fields.appendChild(deviceField(device, "dependsOn", "Depends on", "UPS-01"));
      fields.appendChild(deviceField(device, "notes", "Notes", "Notes"));
      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button button-ghost";
      remove.setAttribute("data-remove-device", device.stem);
      remove.textContent = "Remove device";
      card.appendChild(title);
      card.appendChild(fields);
      card.appendChild(remove);
      root.appendChild(card);
    });
    renderDeviceList();
    renderExportSummary();
  }

  function deviceField(device, field, label, placeholder) {
    var wrap = document.createElement("div");
    wrap.className = "sd-field";
    var id = "sd-dev-" + field + "-" + device.stem;
    var lab = document.createElement("label");
    lab.setAttribute("for", id);
    lab.textContent = label;
    var input = field === "notes" ? document.createElement("textarea") : document.createElement("input");
    if (field !== "notes") {
      input.type = "text";
      input.setAttribute("list", field === "uplinkDevice" ? "sd-device-list" : "");
    }
    input.id = id;
    input.value = device[field] || "";
    input.placeholder = placeholder;
    input.setAttribute("data-stem", device.stem);
    input.setAttribute("data-device-field", field);
    input.autocomplete = "off";
    wrap.appendChild(lab);
    wrap.appendChild(input);
    return wrap;
  }

  function isWap(stem) {
    var pin = findPin(stem);
    var photo = findPhoto(stem);
    var device = findDevice(stem);
    return (pin && pin.deviceType === "WAP") || (photo && photo.deviceType === "WAP") || (device && device.deviceType === "WAP");
  }

  function renderPins() {
    var root = $("sd-pins");
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    state.pins.forEach(function (pin) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "sd-pin" + (state.selectedPin === pin.stem ? " is-selected" : "");
      button.setAttribute("data-pin", pin.stem);
      button.style.left = (Number(pin.x) * 100) + "%";
      button.style.top = (Number(pin.y) * 100) + "%";
      var photo = findPhoto(pin.stem);
      if (isWap(pin.stem) && photo) {
        var img = document.createElement("img");
        img.className = "sd-pin-thumb";
        img.src = photo.url;
        img.alt = "";
        button.appendChild(img);
      } else {
        var dot = document.createElement("span");
        dot.className = "sd-pin-dot";
        button.appendChild(dot);
      }
      var label = document.createElement("span");
      label.className = "sd-pin-label";
      label.textContent = pin.stem;
      button.appendChild(label);
      root.appendChild(button);
    });
    fillPinEditor();
  }

  function fillPinEditor() {
    var editor = $("sd-pin-editor");
    var pin = state.selectedPin ? findPin(state.selectedPin) : null;
    if (!pin) {
      editor.hidden = true;
      return;
    }
    editor.hidden = false;
    $("sd-pin-stem").textContent = pin.stem;
    ["uplinkPort", "uplinkDevice", "remotePort"].forEach(function (field) {
      var input = document.querySelector("[data-pin-field='" + field + "']");
      if (input && document.activeElement !== input) input.value = pin[field] || "";
    });
  }

  function renderExportSummary() {
    var counts = $("sd-export-counts");
    if (!counts) return;
    counts.textContent = state.photos.length + " photos · " + state.pins.length + " pins · " + state.devices.length + " devices";
  }

  function usePhotoName(stem) {
    var photo = findPhoto(stem);
    if (!photo) return;
    state.job.client = photo.client;
    state.job.location = photo.location;
    state.job.room = photo.room;
    state.job.deviceType = photo.deviceType;
    state.job.number = parseInt(photo.nn, 10) || 1;
    state.job.note = photo.note || "";
    writeForm();
    saveJob();
    updatePreview();
    setStatus("Current name is " + photo.filename + ".");
  }

  function addCurrentDevice() {
    var name = currentName();
    if (!name.ok) {
      setStatus("Set client, location, and room before adding a device.");
      showTab("capture");
      return;
    }
    var existing = findDevice(name.stem);
    if (existing) {
      setStatus(name.stem + " is already on the device sheet.");
      showTab("devices");
      return;
    }
    var pin = findPin(name.stem);
    state.devices.push({
      stem: name.stem,
      deviceType: state.job.deviceType,
      nn: name.nn,
      uplinkPort: pin ? pin.uplinkPort || "" : "",
      uplinkDevice: pin ? pin.uplinkDevice || "" : "",
      remotePort: pin ? pin.remotePort || "" : "",
      dependsOn: "",
      notes: ""
    });
    saveDevices();
    renderDevices();
    setStatus("Added " + name.stem + ".");
    showTab("devices");
  }

  function syncUplink(stem, source) {
    var pin = findPin(stem);
    var device = findDevice(stem);
    ["uplinkPort", "uplinkDevice", "remotePort"].forEach(function (field) {
      if (pin && device && source !== "pin") pin[field] = device[field] || "";
      if (pin && device && source === "pin") device[field] = pin[field] || "";
    });
    if (device && source === "pin") {
      saveDevices();
      document.querySelectorAll("[data-stem]").forEach(function (input) {
        if (input.getAttribute("data-stem") !== stem) return;
        var field = input.getAttribute("data-device-field");
        if (!field || document.activeElement === input) return;
        if (device[field] != null && input.value !== device[field]) input.value = device[field];
      });
    }
    if (pin) savePins();
    if (source !== "pin") fillPinEditor();
  }

  function pointFromEvent(event) {
    var rect = $("sd-map").getBoundingClientRect();
    var x = rect.width ? (event.clientX - rect.left) / rect.width : 0;
    var y = rect.height ? (event.clientY - rect.top) / rect.height : 0;
    return { x: clamp(x, 0.02, 0.98), y: clamp(y, 0.02, 0.98) };
  }

  function dropAt(x, y) {
    var name = currentName();
    if (!name.ok) {
      setStatus("Set client, location, and room before dropping a pin.");
      showTab("capture");
      return;
    }
    var device = findDevice(name.stem);
    var pin = findPin(name.stem);
    if (!pin) {
      pin = {
        stem: name.stem,
        x: x,
        y: y,
        deviceType: state.job.deviceType,
        uplinkPort: device ? device.uplinkPort || "" : "",
        uplinkDevice: device ? device.uplinkDevice || "" : "",
        remotePort: device ? device.remotePort || "" : ""
      };
      state.pins.push(pin);
    } else {
      pin.x = x;
      pin.y = y;
      pin.deviceType = state.job.deviceType;
    }
    state.selectedPin = name.stem;
    savePins();
    renderPins();
    setStatus("Dropped " + name.stem + ".");
  }

  function movePin(stem, x, y) {
    var pin = findPin(stem);
    if (!pin) return;
    pin.x = x;
    pin.y = y;
    var node = document.querySelector("[data-pin='" + stem + "']");
    if (!node) return;
    node.style.left = (x * 100) + "%";
    node.style.top = (y * 100) + "%";
  }

  function onMapPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    var pinEl = event.target.closest("[data-pin]");
    mapGesture = {
      kind: pinEl ? "pin" : "map",
      stem: pinEl ? pinEl.getAttribute("data-pin") : null,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false
    };
    if (pinEl) {
      state.selectedPin = mapGesture.stem;
      pinEl.classList.add("is-selected");
      fillPinEditor();
      pinEl.setPointerCapture(event.pointerId);
    } else {
      $("sd-map").setPointerCapture(event.pointerId);
    }
  }

  function onMapPointerMove(event) {
    if (!mapGesture || event.pointerId !== mapGesture.id) return;
    if (Math.abs(event.clientX - mapGesture.x) + Math.abs(event.clientY - mapGesture.y) > 6) {
      mapGesture.moved = true;
    }
    if (mapGesture.kind === "pin" && mapGesture.moved) {
      var point = pointFromEvent(event);
      movePin(mapGesture.stem, point.x, point.y);
    }
  }

  function onMapPointerUp(event) {
    if (!mapGesture || event.pointerId !== mapGesture.id) return;
    var gesture = mapGesture;
    mapGesture = null;
    if (gesture.kind === "pin") {
      if (gesture.moved) {
        var moved = pointFromEvent(event);
        movePin(gesture.stem, moved.x, moved.y);
        savePins();
        setStatus("Moved " + gesture.stem + ".");
      }
      renderPins();
      return;
    }
    if (!gesture.moved) {
      var point = pointFromEvent(event);
      dropAt(point.x, point.y);
    }
  }

  function canvasFromBitmap(bitmap) {
    var canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    return canvas;
  }

  function canvasFromVideo(video) {
    if (!video.videoWidth) return null;
    var canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas;
  }

  function showStaged(canvas) {
    state.staged = canvas;
    var preview = $("sd-preview");
    var maxW = 1280;
    var scale = canvas.width > maxW ? maxW / canvas.width : 1;
    preview.width = Math.max(1, Math.round(canvas.width * scale));
    preview.height = Math.max(1, Math.round(canvas.height * scale));
    preview.getContext("2d").drawImage(canvas, 0, 0, preview.width, preview.height);
    preview.hidden = false;
    $("sd-save").disabled = false;
  }

  function burnCaption(source, filename, gps) {
    var canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(source, 0, 0);
    var fontSize = clamp(Math.round(canvas.width / 36), 16, 64);
    var bar = Math.round(fontSize * 2.8);
    ctx.fillStyle = "rgba(28, 25, 21, 0.84)";
    ctx.fillRect(0, canvas.height - bar, canvas.width, bar);
    ctx.fillStyle = "#f6efe4";
    ctx.font = "600 " + fontSize + "px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillText(filename, Math.round(fontSize * 0.45), canvas.height - bar + Math.round(fontSize * 1.15));
    var gpsLine = gps
      ? Number(gps.lat).toFixed(6) + ", " + Number(gps.lon).toFixed(6) + " ±" + Math.round(Number(gps.accuracy) || 0) + "m"
      : "GPS unavailable";
    ctx.font = "400 " + Math.max(12, Math.round(fontSize * 0.72)) + "px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillText(gpsLine, Math.round(fontSize * 0.45), canvas.height - bar + Math.round(fontSize * 2.15));
    return canvas;
  }

  function canvasToJpeg(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) reject(new Error("jpeg"));
        else resolve(blob);
      }, "image/jpeg", 0.92);
    });
  }

  function rememberPhoto(record) {
    var existing = findPhoto(record.stem);
    if (existing && existing.url) URL.revokeObjectURL(existing.url);
    record.url = URL.createObjectURL(record.blob);
    if (existing) {
      Object.assign(existing, record);
    } else {
      state.photos.push(record);
    }
  }

  async function saveStaged() {
    if (!state.ready) {
      setStatus("Still opening the saved job.");
      return;
    }
    if (!state.staged) {
      setStatus("Take a photo or choose one first.");
      return;
    }
    readForm();
    var name = currentName();
    if (!name.ok) {
      setStatus("Client, location, and room are required.");
      return;
    }
    var source = state.staged;
    var burned = false;
    if (state.job.burnCaption) {
      source = burnCaption(state.staged, name.filename, state.job.gps);
      burned = true;
    }
    var blob;
    try {
      blob = await canvasToJpeg(source);
    } catch (err) {
      setStatus("Could not save that photo as a JPEG.");
      return;
    }
    var record = {
      stem: name.stem,
      filename: name.filename,
      note: state.job.note || "",
      gps: state.job.gps ? {
        lat: state.job.gps.lat,
        lon: state.job.gps.lon,
        accuracy: state.job.gps.accuracy,
        timestamp: state.job.gps.timestamp
      } : null,
      createdAt: new Date().toISOString(),
      captionBurned: burned,
      deviceType: state.job.deviceType,
      client: state.job.client,
      location: state.job.location,
      room: state.job.room,
      nn: name.nn,
      blob: blob
    };
    try {
      var stored = Object.assign({}, record);
      delete stored.url;
      await idbPut("photos", stored);
    } catch (err) {
      setStatus("Could not store the photo in this browser.");
      return;
    }
    rememberPhoto(record);
    state.staged = null;
    $("sd-save").disabled = true;
    if (state.job.autoIncrement) {
      if (state.job.number >= 99) {
        setStatus("Saved " + name.filename + ". NN stops at 99.");
      } else {
        state.job.number += 1;
        $("sd-number").value = String(state.job.number);
        setStatus("Saved " + name.filename + ".");
      }
    } else {
      setStatus("Saved " + name.filename + ".");
    }
    saveJob();
    updatePreview();
    renderPhotos();
  }

  async function stageFile(file) {
    if (!file) return;
    try {
      var bitmap = await createImageBitmap(file);
      var canvas = canvasFromBitmap(bitmap);
      if (bitmap.close) bitmap.close();
      showStaged(canvas);
      $("sd-file").value = "";
      setStatus("Photo ready. Save uses the filename above.");
    } catch (err) {
      setStatus("Could not read that image. Use a JPEG or PNG.");
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("This browser has no camera API. Use the file input.");
      return;
    }
    stopCamera();
    var stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" } }
      });
    } catch (err) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      } catch (err2) {
        setStatus("Camera unavailable. Use the file input. The photo still saves from a file.");
        return;
      }
    }
    state.stream = stream;
    var video = $("sd-video");
    video.srcObject = stream;
    video.hidden = false;
    $("sd-camera").textContent = "Stop camera";
    setStatus("Rear camera is on. Shutter saves the current name.");
  }

  function stopCamera() {
    if (!state.stream) return;
    state.stream.getTracks().forEach(function (track) { track.stop(); });
    state.stream = null;
    var video = $("sd-video");
    video.srcObject = null;
    video.hidden = true;
    $("sd-camera").textContent = "Start rear camera";
  }

  function shutter() {
    var canvas = canvasFromVideo($("sd-video"));
    if (!canvas) {
      setStatus("Start the camera, or choose a photo.");
      return;
    }
    showStaged(canvas);
    saveStaged();
  }

  function useGps() {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not available. The photo still saves.");
      return;
    }
    setStatus("Asking for location…");
    navigator.geolocation.getCurrentPosition(function (pos) {
      state.job.gps = {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp
      };
      saveJob();
      renderGps();
      setStatus("GPS stored for the next shot.");
    }, function () {
      state.job.gps = null;
      saveJob();
      renderGps();
      setStatus("Location denied. The photo still saves without GPS.");
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  function setPlanBlob(blob) {
    if (state.planUrl) URL.revokeObjectURL(state.planUrl);
    state.planUrl = blob ? URL.createObjectURL(blob) : null;
    var img = $("sd-plan");
    var map = $("sd-map");
    var hint = $("sd-map-hint");
    if (!blob) {
      img.removeAttribute("src");
      img.hidden = true;
      map.classList.add("is-grid");
      hint.hidden = false;
      hint.textContent = "Blank grid. Tap to drop the current device.";
      return;
    }
    img.src = state.planUrl;
    img.hidden = false;
    map.classList.remove("is-grid");
    hint.hidden = true;
  }

  async function storePlan(file) {
    if (!file) return;
    try {
      var bitmap = await createImageBitmap(file);
      if (bitmap.close) bitmap.close();
    } catch (err) {
      setStatus("Could not read that plan image.");
      return;
    }
    try {
      await idbPut("meta", { id: "plan", blob: file });
    } catch (err2) {
      setStatus("Could not store the plan in this browser.");
      return;
    }
    setPlanBlob(file);
    setStatus("Plan image is on the map. The grid is still there if you clear it.");
  }

  async function clearPlan() {
    try {
      await idbDelete("meta", "plan");
    } catch (err) {
      /* still clear the view */
    }
    setPlanBlob(null);
    setStatus("Blank grid. No plan is generated.");
  }

  function crc32(bytes) {
    var table = crc32.table;
    if (!table) {
      table = new Uint32Array(256);
      var n;
      var k;
      var c;
      for (n = 0; n < 256; n += 1) {
        c = n;
        for (k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
      }
      crc32.table = table;
    }
    var crc = 0xffffffff;
    var i;
    for (i = 0; i < bytes.length; i += 1) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function buildZip(files) {
    var localParts = [];
    var centralParts = [];
    var offset = 0;
    files.forEach(function (file) {
      var nameBytes = new TextEncoder().encode(file.name);
      var crc = crc32(file.data);
      var local = new Uint8Array(30 + nameBytes.length);
      var view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, 0, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, file.data.length, true);
      view.setUint32(22, file.data.length, true);
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      localParts.push(local, file.data);
      var central = new Uint8Array(46 + nameBytes.length);
      var centralView = new DataView(central.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, 0, true);
      centralView.setUint16(14, 0, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, file.data.length, true);
      centralView.setUint32(24, file.data.length, true);
      centralView.setUint16(28, nameBytes.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      central.set(nameBytes, 46);
      centralParts.push(central);
      offset += local.length + file.data.length;
    });
    var cdSize = centralParts.reduce(function (sum, part) { return sum + part.length; }, 0);
    var eocd = new Uint8Array(22);
    var endView = new DataView(eocd.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, cdSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);
    var chunks = localParts.concat(centralParts, [eocd]);
    var total = chunks.reduce(function (sum, part) { return sum + part.length; }, 0);
    var out = new Uint8Array(total);
    var pos = 0;
    chunks.forEach(function (chunk) {
      out.set(chunk, pos);
      pos += chunk.length;
    });
    return new Blob([out], { type: "application/zip" });
  }

  function manifest() {
    return {
      exportedAt: new Date().toISOString(),
      job: {
        client: state.job.client,
        location: state.job.location,
        room: state.job.room,
        deviceType: state.job.deviceType,
        number: formatNN(state.job.number),
        autoIncrement: !!state.job.autoIncrement,
        note: state.job.note || "",
        burnCaption: !!state.job.burnCaption,
        gps: state.job.gps
      },
      devices: state.devices.map(function (device) {
        return {
          id: device.stem,
          stem: device.stem,
          deviceType: device.deviceType,
          uplinkPort: device.uplinkPort || "",
          uplinkDevice: device.uplinkDevice || "",
          remotePort: device.remotePort || "",
          dependsOn: device.dependsOn || "",
          notes: device.notes || ""
        };
      }),
      pins: state.pins.map(function (pin) {
        return {
          id: pin.stem,
          stem: pin.stem,
          label: pin.stem,
          x: Math.round(Number(pin.x) * 10000) / 10000,
          y: Math.round(Number(pin.y) * 10000) / 10000,
          deviceType: pin.deviceType || "",
          uplinkPort: pin.uplinkPort || "",
          uplinkTo: pin.uplinkDevice || "",
          remotePort: pin.remotePort || ""
        };
      }),
      photos: sortedPhotos().map(function (photo) {
        return {
          filename: photo.filename,
          stem: photo.stem,
          note: photo.note || "",
          gps: photo.gps,
          createdAt: photo.createdAt,
          captionBurned: !!photo.captionBurned,
          deviceType: photo.deviceType,
          client: photo.client,
          location: photo.location,
          room: photo.room,
          nn: photo.nn
        };
      })
    };
  }

  function downloadBlob(blob, filename) {
    var link = document.createElement("a");
    var url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  async function exportZip() {
    var files = [{
      name: "manifest.json",
      data: new TextEncoder().encode(JSON.stringify(manifest(), null, 2))
    }];
    var photos = sortedPhotos();
    var i;
    for (i = 0; i < photos.length; i += 1) {
      var bytes = new Uint8Array(await photos[i].blob.arrayBuffer());
      files.push({ name: photos[i].filename, data: bytes });
    }
    var client = slug(state.job.client) || "job";
    var location = slug(state.job.location) || "site";
    var filename = "SiteDoc-" + client + "-" + location + ".zip";
    downloadBlob(buildZip(files), filename);
    setStatus("Downloaded " + filename + ".");
  }

  function onJobInput() {
    readForm();
    saveJob();
    updatePreview();
  }

  function bind() {
    ["sd-client", "sd-location", "sd-room", "sd-type", "sd-number", "sd-note"].forEach(function (id) {
      $(id).addEventListener("input", onJobInput);
      $(id).addEventListener("change", onJobInput);
    });
    $("sd-auto").addEventListener("change", onJobInput);
    $("sd-caption").addEventListener("change", onJobInput);
    document.querySelectorAll("[data-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        showTab(tab.getAttribute("data-tab"));
      });
    });
    $("sd-add-device").addEventListener("click", addCurrentDevice);
    $("sd-file").addEventListener("change", function () {
      var file = $("sd-file").files && $("sd-file").files[0];
      stageFile(file);
    });
    $("sd-save").addEventListener("click", function () { saveStaged(); });
    $("sd-shutter").addEventListener("click", shutter);
    $("sd-camera").addEventListener("click", function () {
      if (state.stream) stopCamera();
      else startCamera();
    });
    $("sd-gps").addEventListener("click", useGps);
    $("sd-filter").addEventListener("input", function () {
      state.filter = $("sd-filter").value || "";
      renderLibrary();
    });
    $("sd-library").addEventListener("click", function (event) {
      var use = event.target.closest("[data-use-name]");
      if (use) {
        usePhotoName(use.getAttribute("data-use-name"));
        return;
      }
      var remove = event.target.closest("[data-remove-photo]");
      if (!remove) return;
      removePhoto(remove.getAttribute("data-remove-photo"));
    });
    $("sd-recent").addEventListener("click", function (event) {
      var use = event.target.closest("[data-use-name]");
      if (use) usePhotoName(use.getAttribute("data-use-name"));
    });
    $("sd-devices").addEventListener("input", function (event) {
      var input = event.target.closest("[data-device-field]");
      if (!input) return;
      var device = findDevice(input.getAttribute("data-stem"));
      if (!device) return;
      device[input.getAttribute("data-device-field")] = input.value;
      saveDevices();
      syncUplink(device.stem, "device");
    });
    $("sd-devices").addEventListener("click", function (event) {
      var button = event.target.closest("[data-remove-device]");
      if (!button) return;
      var stem = button.getAttribute("data-remove-device");
      state.devices = state.devices.filter(function (device) { return device.stem !== stem; });
      saveDevices();
      renderDevices();
      setStatus("Removed " + stem + " from the sheet.");
    });
    var map = $("sd-map");
    map.addEventListener("pointerdown", onMapPointerDown);
    map.addEventListener("pointermove", onMapPointerMove);
    map.addEventListener("pointerup", onMapPointerUp);
    map.addEventListener("pointercancel", onMapPointerUp);
    ["uplinkPort", "uplinkDevice", "remotePort"].forEach(function (field) {
      document.querySelector("[data-pin-field='" + field + "']").addEventListener("input", function (event) {
        var pin = state.selectedPin ? findPin(state.selectedPin) : null;
        if (!pin) return;
        pin[field] = event.target.value;
        syncUplink(pin.stem, "pin");
      });
    });
    $("sd-pin-remove").addEventListener("click", function () {
      if (!state.selectedPin) return;
      var stem = state.selectedPin;
      state.pins = state.pins.filter(function (pin) { return pin.stem !== stem; });
      state.selectedPin = null;
      savePins();
      renderPins();
      setStatus("Removed pin " + stem + ".");
    });
    $("sd-plan-file").addEventListener("change", function () {
      var file = $("sd-plan-file").files && $("sd-plan-file").files[0];
      storePlan(file);
    });
    $("sd-grid").addEventListener("click", clearPlan);
    $("sd-export").addEventListener("click", function () { exportZip(); });
  }

  async function removePhoto(stem) {
    var photo = findPhoto(stem);
    if (photo && photo.url) URL.revokeObjectURL(photo.url);
    state.photos = state.photos.filter(function (item) { return item.stem !== stem; });
    try {
      await idbDelete("photos", stem);
    } catch (err) {
      setStatus("Could not remove the stored photo.");
    }
    renderPhotos();
    setStatus("Removed " + stem + ".");
  }

  async function init() {
    bind();
    loadJob();
    loadLists();
    writeForm();
    updatePreview();
    renderDevices();
    renderPins();
    try {
      dbPromise = openDb();
      var photos = await idbGetAll("photos");
      state.photos = photos.filter(function (photo) {
        return photo && photo.blob;
      }).map(function (photo) {
        photo.url = URL.createObjectURL(photo.blob);
        return photo;
      });
      var meta = await idbGetAll("meta");
      var plan = meta.find(function (item) { return item.id === "plan"; });
      if (plan && plan.blob) setPlanBlob(plan.blob);
      state.ready = true;
      renderPhotos();
      setStatus("Job stays in this browser.");
    } catch (err) {
      state.ready = true;
      setStatus("Photos could not be opened in this browser. The job fields are still saved.");
    }
  }

  init();
})();
