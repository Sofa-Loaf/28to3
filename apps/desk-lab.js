(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.DeskLab = api;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        api.mount(document);
      });
    } else {
      api.mount(document);
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DEVICE_ORDER = ["optiplex", "precision", "wd19", "monitor", "ups"];

  var DEVICES = {
    optiplex: {
      id: "optiplex",
      name: "Dell OptiPlex",
      short: "OptiPlex",
      role: "SFF / small-form tower. Usual fixed desktop.",
      picker: "OptiPlex",
      ports: [
        { id: "opti-ac", kind: "power", label: "IEC C13 AC in", ticket: "Tower PSU cord. Seat in a battery-backed UPS outlet, not surge-only." },
        { id: "opti-pwrbtn", kind: "power", label: "Power button", ticket: "Front power. Confirm the PSU switch (if present) is on before this." },
        { id: "opti-dp", kind: "video", label: "DP out", ticket: "DisplayPort out on the tower. Use if this desk is tower-to-monitor, not docked." },
        { id: "opti-hdmi", kind: "video", label: "HDMI out", ticket: "HDMI out on the tower. Fallback if the monitor has no DP." },
        { id: "opti-rj45", kind: "net", label: "RJ45", ticket: "Onboard NIC. Ignore if the client is supposed to be on the WD19 LAN." },
        { id: "opti-usbc", kind: "usbc", label: "USB-C", ticket: "Chassis USB-C. Not the dock upstream." },
        { id: "opti-usba", kind: "usb", label: "USB-A", ticket: "Keyboard / mouse / keys. Do not chase video here." },
        { id: "opti-audio", kind: "audio", label: "Line-out / mic", ticket: "3.5 mm analog. Headset issues are here or on the dock, not the monitor." }
      ]
    },
    precision: {
      id: "precision",
      name: "Precision laptop",
      short: "Precision",
      role: "Mobile workstation. Dock upstream lands on USB-C / Thunderbolt.",
      picker: "Precision",
      ports: [
        { id: "prec-tb1", kind: "usbc", label: "USB-C / TB (dock upstream)", ticket: "Primary Thunderbolt / USB-C. This is where the WD19 upstream cable seats." },
        { id: "prec-tb2", kind: "usbc", label: "USB-C / TB (alt)", ticket: "Second TB port. Try this if the first will not charge or show video." },
        { id: "prec-dc", kind: "power", label: "Barrel / DC-in", ticket: "Slim brick on the chassis. Use only if they are off-dock. On-dock, ignore this." },
        { id: "prec-hdmi", kind: "video", label: "HDMI out", ticket: "Laptop HDMI. Bypass the dock if you need a known-good video path." },
        { id: "prec-usba", kind: "usb", label: "USB-A", ticket: "Direct USB-A on the chassis." },
        { id: "prec-sd", kind: "usb", label: "SD card", ticket: "SD reader. Not power, not video." },
        { id: "prec-audio", kind: "audio", label: "3.5 mm combo", ticket: "Headset jack on the laptop." }
      ]
    },
    wd19: {
      id: "wd19",
      name: "WD19 dock",
      short: "WD19",
      role: "Dell WD19 / WD19TBS. Brick on barrel/DC-in. Laptop on USB-C upstream.",
      picker: "WD19",
      ports: [
        { id: "wd19-dc", kind: "power", label: "Barrel / DC-in", ticket: "180W brick. Round jack. Not USB-C. Pull, wait 10s, reseat until seated." },
        { id: "wd19-upstream", kind: "usbc", label: "USB-C upstream (to laptop)", ticket: "Thick cable, dock → Precision TB port. Charging and video ride this hop." },
        { id: "wd19-dp1", kind: "video", label: "DP out (to monitor)", ticket: "DisplayPort out on the dock. Lands on monitor DP in." },
        { id: "wd19-dp2", kind: "video", label: "DP out 2", ticket: "Second DP. Dual-display desks use this plus DP 1 or HDMI." },
        { id: "wd19-hdmi", kind: "video", label: "HDMI out (to monitor)", ticket: "HDMI out on the dock. Match the monitor HDMI in and the monitor source." },
        { id: "wd19-rj45", kind: "net", label: "RJ45", ticket: "Dock NIC. Confirm the drop is here if the ticket is 'no LAN on dock'." },
        { id: "wd19-usbc", kind: "usbc", label: "USB-C downstream", ticket: "Peripherals only. Will not power the dock or the laptop." },
        { id: "wd19-usba", kind: "usb", label: "USB-A", ticket: "Keyboard / mouse / keys on the dock." },
        { id: "wd19-audio", kind: "audio", label: "3.5 mm", ticket: "Dock analog audio." }
      ]
    },
    monitor: {
      id: "monitor",
      name: "Dell monitor",
      short: "Monitor",
      role: "External display. Video is an IN. Power is IEC AC.",
      picker: "Monitor",
      ports: [
        { id: "mon-ac", kind: "power", label: "IEC AC in", ticket: "Monitor power cord. Confirm the rocker / soft-power and the OSD is not in standby." },
        { id: "mon-dp", kind: "video", label: "DP in", ticket: "DisplayPort in. Must match a DP out on the WD19 or the OptiPlex." },
        { id: "mon-hdmi", kind: "video", label: "HDMI in", ticket: "HDMI in. Set OSD source to HDMI if that is the cable in use." },
        { id: "mon-usbc", kind: "usbc", label: "USB-C (video + power)", ticket: "USB-C video on some P-series. Not the WD19 upstream." },
        { id: "mon-usbb", kind: "usb", label: "USB-B upstream", ticket: "Legacy hub uplink to the PC. Needed only if hub ports on the monitor are dead." },
        { id: "mon-usba", kind: "usb", label: "USB-A downstream", ticket: "Monitor hub ports. They stay dead until USB-B / USB-C uplink is seated." }
      ]
    },
    ups: {
      id: "ups",
      name: "UPS",
      short: "UPS",
      role: "Battery backup under the desk. Switch + battery-backed outlets first.",
      picker: "UPS",
      ports: [
        { id: "ups-acin", kind: "power", label: "AC in (wall)", ticket: "UPS line cord to the wall. If the wall is dead, the UPS is a battery with a clock." },
        { id: "ups-switch", kind: "power", label: "Power switch", ticket: "Master switch. Many units sit in standby with no output until this is on." },
        { id: "ups-out-batt", kind: "power", label: "AC out (battery-backed)", ticket: "Battery-backed bank. Tower PSU and WD19 brick go here." },
        { id: "ups-out-dock", kind: "power", label: "AC out (dock brick)", ticket: "Second battery-backed outlet. WD19 180W brick — not a surge-only tap." },
        { id: "ups-out-surge", kind: "power", label: "AC out (surge-only)", ticket: "Surge-only. Do not park the tower or the dock brick here." },
        { id: "ups-usb", kind: "usb", label: "USB-B management", ticket: "Optional NUT / vendor agent. Not required for AC output." }
      ]
    }
  };

  var PLAYBOOKS = [
    {
      id: "dock-power",
      title: "No power on dock",
      ticket: "WD19 dark / no LED",
      needs: ["wd19"],
      device: "wd19",
      port: "wd19-dc",
      ports: ["wd19-dc"],
      cables: ["dock-brick"],
      coach: "WD19 is dark. Pull the barrel/DC-in — the brick, not USB-C. Wait 10s. Reseat.",
      ask: "Ask: is the brick brick-LED on? Are they holding the USB-C cable or the round jack?",
      steps: [
        "Confirm the 180W brick LED is lit.",
        "Trace that cable to the WD19 barrel/DC-in (round jack, not USB-C).",
        "Pull the barrel. Wait 10 seconds. Reseat until it is fully home.",
        "If still dark, swap the brick before you swap the dock."
      ]
    },
    {
      id: "no-display",
      title: "No display",
      ticket: "Blank monitor / no signal",
      needs: ["monitor"],
      device: "wd19",
      fallbackDevice: "monitor",
      port: "wd19-dp1",
      ports: ["wd19-dp1", "wd19-hdmi", "mon-dp", "mon-hdmi", "prec-hdmi", "opti-dp"],
      cables: ["dock-dp", "dock-hdmi"],
      coach: "Video leaves the dock. Trace DP or HDMI from WD19 out to the monitor IN. Set the monitor source to match.",
      ask: "Ask: which cable is in the monitor — DP or HDMI? What does the OSD source say?",
      steps: [
        "Confirm the WD19 has power (LED). A dark dock will not drive the panel.",
        "On the WD19: DP out or HDMI out — say the label, have them touch that jack.",
        "Same cable type on the monitor IN (DP in or HDMI in).",
        "OSD source = the cable in use. Auto is often wrong.",
        "Bypass: Precision HDMI or OptiPlex DP straight to the monitor if the dock path fails."
      ]
    },
    {
      id: "no-charge",
      title: "Laptop not charging on dock",
      ticket: "Precision on WD19, no charge",
      needs: ["wd19", "precision"],
      device: "wd19",
      port: "wd19-upstream",
      ports: ["wd19-upstream", "prec-tb1", "prec-tb2", "wd19-dc"],
      cables: ["dock-upstream"],
      coach: "Charging rides USB-C upstream. Reseat the thick cable at the dock and at the Precision TB port.",
      ask: "Ask: does the laptop charge on its own brick? Is the WD19 LED on?",
      steps: [
        "WD19 brick must be in barrel/DC-in. No brick, no charge pass-through.",
        "USB-C upstream is the thick cable: dock → Precision USB-C / TB.",
        "Pull both ends. Reseat. Try the other TB port on the Precision.",
        "If it charges on the slim chassis brick but not the dock, replace the upstream cable first."
      ]
    },
    {
      id: "dead-desk",
      title: "Dead desk",
      ticket: "Whole desk dark",
      needs: ["ups"],
      device: "ups",
      port: "ups-switch",
      ports: ["ups-switch", "ups-out-batt", "ups-out-dock", "opti-ac", "wd19-dc"],
      cables: ["ups-tower", "ups-dock"],
      coach: "Whole desk dark. UPS switch first. Tower and dock brick go in battery-backed outlets, not surge-only.",
      ask: "Ask: is the UPS display/LED on? Are the tower and the fat brick in the battery bank?",
      steps: [
        "UPS power switch — on, not standby.",
        "AC in (wall) seated. If the wall is dead, say so on the ticket and stop.",
        "Move OptiPlex IEC C13 and the WD19 brick onto battery-backed AC out.",
        "Do not leave those two on surge-only taps.",
        "Then re-run dock-power or no-display if only one box stayed dark."
      ]
    }
  ];

  var KIND_LABEL = {
    power: "Power",
    video: "Video",
    usbc: "USB-C / TB",
    usb: "USB",
    net: "Ethernet",
    audio: "Audio"
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function defaultPresent() {
    var present = {};
    DEVICE_ORDER.forEach(function (id) {
      present[id] = true;
    });
    return present;
  }

  function normalizePresent(input) {
    var present = defaultPresent();
    if (!input) return present;
    DEVICE_ORDER.forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(input, id)) {
        present[id] = !!input[id];
      }
    });
    return present;
  }

  function parseDeskList(raw) {
    if (!raw) return defaultPresent();
    var wanted = {};
    String(raw)
      .split(",")
      .map(function (part) {
        return part.trim().toLowerCase();
      })
      .filter(Boolean)
      .forEach(function (id) {
        if (DEVICES[id]) wanted[id] = true;
      });
    if (!Object.keys(wanted).length) return defaultPresent();
    var present = {};
    DEVICE_ORDER.forEach(function (id) {
      present[id] = !!wanted[id];
    });
    return present;
  }

  function presentToList(present) {
    return DEVICE_ORDER.filter(function (id) {
      return present[id];
    });
  }

  function playbookById(id) {
    for (var i = 0; i < PLAYBOOKS.length; i += 1) {
      if (PLAYBOOKS[i].id === id) return PLAYBOOKS[i];
    }
    return null;
  }

  function deviceById(id) {
    return DEVICES[id] || null;
  }

  function portById(device, portId) {
    if (!device) return null;
    for (var i = 0; i < device.ports.length; i += 1) {
      if (device.ports[i].id === portId) return device.ports[i];
    }
    return null;
  }

  function findPort(portId) {
    for (var i = 0; i < DEVICE_ORDER.length; i += 1) {
      var device = DEVICES[DEVICE_ORDER[i]];
      var port = portById(device, portId);
      if (port) return { device: device, port: port };
    }
    return null;
  }

  function playbookIsAvailable(playbook, present) {
    return playbook.needs.every(function (id) {
      return !!present[id];
    });
  }

  function visiblePlaybooks(present) {
    return PLAYBOOKS.filter(function (playbook) {
      return playbookIsAvailable(playbook, present);
    });
  }

  function resolvePlaybookDevice(playbook, present) {
    if (playbook.device && present[playbook.device]) return playbook.device;
    if (playbook.fallbackDevice && present[playbook.fallbackDevice]) return playbook.fallbackDevice;
    for (var i = 0; i < playbook.needs.length; i += 1) {
      if (present[playbook.needs[i]]) return playbook.needs[i];
    }
    return null;
  }

  function resolvePlaybookPort(playbook, present) {
    var deviceId = resolvePlaybookDevice(playbook, present);
    if (!deviceId) return null;
    var device = DEVICES[deviceId];
    if (playbook.port && portById(device, playbook.port) && present[deviceId]) {
      return playbook.port;
    }
    for (var i = 0; i < playbook.ports.length; i += 1) {
      var found = findPort(playbook.ports[i]);
      if (found && present[found.device.id]) return found.port.id;
    }
    return device.ports[0] ? device.ports[0].id : null;
  }

  function ticketNote(state) {
    var present = normalizePresent(state && state.present);
    var desk = presentToList(present)
      .map(function (id) {
        return DEVICES[id].short;
      })
      .join(", ");
    if (!desk) desk = "(none selected)";
    var lines = ["Desk: " + desk];
    var playbook = state && state.playbookId ? playbookById(state.playbookId) : null;
    if (playbook) {
      lines.push("Playbook: " + playbook.title + " (" + playbook.ticket + ")");
      lines.push("Coach: " + playbook.coach);
    }
    var device = state && state.deviceId ? deviceById(state.deviceId) : null;
    if (device) lines.push("Device: " + device.name);
    var port = device && state.portId ? portById(device, state.portId) : null;
    if (port) {
      lines.push("Port: " + port.label + " — " + port.ticket);
    }
    return lines.join("\n");
  }

  function parseHash(hash) {
    var raw = String(hash || "").replace(/^#/, "");
    var params = {};
    if (!raw) {
      return {
        present: defaultPresent(),
        playbookId: "",
        deviceId: "",
        portId: ""
      };
    }
    if (raw.indexOf("=") === -1 && raw.indexOf("&") === -1 && DEVICES[raw]) {
      return {
        present: defaultPresent(),
        playbookId: "",
        deviceId: raw,
        portId: ""
      };
    }
    raw.split("&").forEach(function (pair) {
      var parts = pair.split("=");
      var key = decodeURIComponent(parts[0] || "").trim();
      var value = decodeURIComponent(parts.slice(1).join("=") || "").trim();
      if (key) params[key] = value;
    });
    return {
      present: parseDeskList(params.desk),
      playbookId: params.playbook || "",
      deviceId: params.device || "",
      portId: params.port || ""
    };
  }

  function buildHash(state) {
    var present = normalizePresent(state && state.present);
    var parts = ["desk=" + presentToList(present).join(",")];
    if (state && state.playbookId && playbookById(state.playbookId)) {
      parts.push("playbook=" + state.playbookId);
    }
    if (state && state.deviceId && DEVICES[state.deviceId]) {
      parts.push("device=" + state.deviceId);
    }
    if (state && state.portId && findPort(state.portId)) {
      parts.push("port=" + state.portId);
    }
    return parts.join("&");
  }

  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(sel));
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function mount(doc) {
    var root = qs(doc, "[data-desk-lab]");
    if (!root) return null;

    var state = {
      present: defaultPresent(),
      playbookId: "",
      deviceId: "",
      portId: "",
      writingHash: false
    };

    var picker = qs(root, "[data-desk-picker]");
    var playbookBox = qs(root, "[data-playbooks]");
    var coachKicker = qs(root, "[data-coach-kicker]");
    var coachText = qs(root, "[data-coach-text]");
    var coachAsk = qs(root, "[data-coach-ask]");
    var detail = qs(root, "[data-detail]");
    var stage = qs(root, "[data-stage]");
    var copyBtn = qs(root, "[data-copy-ticket]");
    var copyStatus = qs(root, "[data-copy-status]");

    function currentPlaybook() {
      return playbookById(state.playbookId);
    }

    function writeHash() {
      if (state.writingHash || typeof location === "undefined") return;
      var next = buildHash(state);
      if (location.hash.replace(/^#/, "") === next) return;
      state.writingHash = true;
      location.hash = next;
      state.writingHash = false;
    }

    function applyPresentToDom() {
      DEVICE_ORDER.forEach(function (id) {
        var on = !!state.present[id];
        qsa(root, '[data-device="' + id + '"]').forEach(function (el) {
          el.classList.toggle("is-absent", !on);
          el.setAttribute("aria-hidden", on ? "false" : "true");
          if (el.hasAttribute("tabindex")) el.tabIndex = on ? 0 : -1;
          if (!on) el.classList.remove("is-selected");
        });
        qsa(picker, 'input[value="' + id + '"]').forEach(function (input) {
          input.checked = on;
        });
      });
      qsa(root, "[data-needs]").forEach(function (el) {
        var needs = el.getAttribute("data-needs").split(",").filter(Boolean);
        var on = needs.every(function (id) {
          return state.present[id];
        });
        el.classList.toggle("is-absent", !on);
      });
    }

    function renderPlaybooks() {
      if (!playbookBox) return;
      playbookBox.innerHTML = PLAYBOOKS.map(function (playbook) {
        var ready = playbookIsAvailable(playbook, state.present);
        var active = state.playbookId === playbook.id;
        return (
          '<button type="button" class="playbook-btn' +
          (active ? " is-active" : "") +
          '" data-playbook="' +
          playbook.id +
          '"' +
          (ready ? "" : " disabled") +
          ' aria-pressed="' +
          (active ? "true" : "false") +
          '">' +
          "<strong>" +
          playbook.title +
          "</strong>" +
          "<span>" +
          playbook.ticket +
          "</span>" +
          (ready ? "" : "<em>Need " + playbook.needs.map(function (id) { return DEVICES[id].short; }).join(" + ") + "</em>") +
          "</button>"
        );
      }).join("");
    }

    function defaultCoach() {
      return {
        kicker: "On the call",
        text: "Toggle what is on this desk. Click a device. Ports are ticket labels. Or start a playbook and read the coach line.",
        ask: ""
      };
    }

    function renderCoach() {
      var playbook = currentPlaybook();
      var found = state.portId ? findPort(state.portId) : null;
      var copy = defaultCoach();
      if (playbook) {
        copy = {
          kicker: playbook.title,
          text: playbook.coach,
          ask: playbook.ask || ""
        };
      } else if (found) {
        copy = {
          kicker: found.device.short + " · " + found.port.label,
          text: found.port.ticket,
          ask: ""
        };
      } else if (state.deviceId && DEVICES[state.deviceId]) {
        copy = {
          kicker: DEVICES[state.deviceId].name,
          text: DEVICES[state.deviceId].role,
          ask: "Click a port. The line under it is what you say."
        };
      }
      setText(coachKicker, copy.kicker);
      setText(coachText, copy.text);
      setText(coachAsk, copy.ask);
      if (coachAsk) coachAsk.hidden = !copy.ask;
    }

    function renderDetail() {
      if (!detail) return;
      var device = deviceById(state.deviceId);
      if (!device || !state.present[device.id]) {
        detail.innerHTML =
          '<p class="detail-kicker">Device</p>' +
          "<h2>Nothing selected</h2>" +
          "<p>Click a box on the desk. Ports are named the way they go on the ticket: barrel/DC-in, USB-C upstream, DP out, UPS AC out.</p>";
        return;
      }

      var playbook = currentPlaybook();
      var hotPorts = playbook ? playbook.ports : [];
      var portRows = device.ports
        .map(function (port) {
          var hot = hotPorts.indexOf(port.id) !== -1;
          var selected = state.portId === port.id;
          return (
            '<button type="button" class="port-row kind-' +
            port.kind +
            (hot ? " is-hot" : "") +
            (selected ? " is-selected" : "") +
            '" data-select-port="' +
            port.id +
            '">' +
            '<span class="port-kind">' +
            KIND_LABEL[port.kind] +
            "</span>" +
            '<span class="port-label">' +
            port.label +
            "</span>" +
            '<span class="port-ticket">' +
            port.ticket +
            "</span>" +
            "</button>"
          );
        })
        .join("");

      var selected = state.portId ? portById(device, state.portId) : null;
      var steps = "";
      if (playbook && playbookIsAvailable(playbook, state.present)) {
        steps =
          '<ol class="playbook-steps">' +
          playbook.steps
            .map(function (step) {
              return "<li>" + step + "</li>";
            })
            .join("") +
          "</ol>";
      }

      detail.innerHTML =
        '<p class="detail-kicker">' +
        device.role +
        "</p>" +
        "<h2>" +
        device.name +
        "</h2>" +
        '<div class="io-plate" role="group" aria-label="' +
        device.name +
        ' ports">' +
        device.ports
          .map(function (port) {
            return (
              '<button type="button" class="io-port kind-' +
              port.kind +
              (hotPorts.indexOf(port.id) !== -1 ? " is-hot" : "") +
              (state.portId === port.id ? " is-selected" : "") +
              '" data-select-port="' +
              port.id +
              '"><abbr title="' +
              KIND_LABEL[port.kind] +
              '">' +
              port.label +
              "</abbr></button>"
            );
          })
          .join("") +
        "</div>" +
        '<div class="port-list">' +
        portRows +
        "</div>" +
        (selected
          ? '<p class="say-line"><strong>Say:</strong> ' + selected.ticket + "</p>"
          : "") +
        steps;
    }

    function syncHighlights() {
      var playbook = currentPlaybook();
      var hotPorts = playbook ? playbook.ports : [];
      var hotCables = playbook ? playbook.cables : [];
      qsa(root, "[data-port]").forEach(function (el) {
        var id = el.getAttribute("data-port");
        el.classList.toggle("is-hot", hotPorts.indexOf(id) !== -1);
        el.classList.toggle("is-selected", state.portId === id);
      });
      qsa(root, "[data-cable]").forEach(function (el) {
        el.classList.toggle("is-hot", hotCables.indexOf(el.getAttribute("data-cable")) !== -1);
      });
      qsa(root, ".desk-unit").forEach(function (el) {
        var id = el.getAttribute("data-device");
        el.classList.toggle("is-selected", id === state.deviceId && !!state.present[id]);
        el.setAttribute("aria-pressed", id === state.deviceId && !!state.present[id] ? "true" : "false");
      });
    }

    function render() {
      applyPresentToDom();
      renderPlaybooks();
      renderCoach();
      renderDetail();
      syncHighlights();
    }

    function selectDevice(id, portId) {
      if (!DEVICES[id] || !state.present[id]) return;
      state.deviceId = id;
      if (portId && portById(DEVICES[id], portId)) {
        state.portId = portId;
      } else if (!portById(DEVICES[id], state.portId)) {
        state.portId = "";
      }
      render();
      writeHash();
    }

    function selectPort(portId) {
      var found = findPort(portId);
      if (!found || !state.present[found.device.id]) return;
      state.deviceId = found.device.id;
      state.portId = found.port.id;
      render();
      writeHash();
    }

    function clearPlaybook() {
      state.playbookId = "";
    }

    function runPlaybook(id) {
      var playbook = playbookById(id);
      if (!playbook) return;
      if (!playbookIsAvailable(playbook, state.present)) {
        state.playbookId = "";
        render();
        writeHash();
        return;
      }
      state.playbookId = playbook.id;
      state.deviceId = resolvePlaybookDevice(playbook, state.present) || "";
      state.portId = resolvePlaybookPort(playbook, state.present) || "";
      render();
      writeHash();
      if (stage) {
        stage.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    function setPresent(id, on) {
      if (!DEVICES[id]) return;
      state.present[id] = !!on;
      if (!state.present[id] && state.deviceId === id) {
        state.deviceId = "";
        state.portId = "";
      }
      var playbook = currentPlaybook();
      if (playbook && !playbookIsAvailable(playbook, state.present)) {
        clearPlaybook();
      } else if (playbook) {
        state.deviceId = resolvePlaybookDevice(playbook, state.present) || state.deviceId;
        state.portId = resolvePlaybookPort(playbook, state.present) || state.portId;
      }
      render();
      writeHash();
    }

    function applyParsed(parsed) {
      state.present = normalizePresent(parsed.present);
      state.playbookId = parsed.playbookId && playbookById(parsed.playbookId) ? parsed.playbookId : "";
      if (state.playbookId && !playbookIsAvailable(playbookById(state.playbookId), state.present)) {
        state.playbookId = "";
      }
      if (parsed.deviceId && DEVICES[parsed.deviceId] && state.present[parsed.deviceId]) {
        state.deviceId = parsed.deviceId;
      } else if (state.playbookId) {
        state.deviceId = resolvePlaybookDevice(playbookById(state.playbookId), state.present) || "";
      } else {
        state.deviceId = "";
      }
      if (parsed.portId && findPort(parsed.portId)) {
        state.portId = parsed.portId;
      } else if (state.playbookId) {
        state.portId = resolvePlaybookPort(playbookById(state.playbookId), state.present) || "";
      } else {
        state.portId = "";
      }
      render();
    }

    function copyTicket() {
      var note = ticketNote(state);
      var done = function () {
        if (copyStatus) {
          copyStatus.textContent = "Copied";
          window.setTimeout(function () {
            if (copyStatus) copyStatus.textContent = "";
          }, 1600);
        }
        if (copyBtn) copyBtn.textContent = "Copied ticket note";
        window.setTimeout(function () {
          if (copyBtn) copyBtn.textContent = "Copy ticket note";
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(note).then(done).catch(function () {
          window.prompt("Ticket note", note);
        });
      } else {
        window.prompt("Ticket note", note);
      }
    }

    if (picker) {
      picker.addEventListener("change", function (event) {
        var target = event.target;
        if (!target || target.name !== "desk-device") return;
        setPresent(target.value, target.checked);
      });
    }

    if (playbookBox) {
      playbookBox.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-playbook]");
        if (!btn || btn.disabled) return;
        if (state.playbookId === btn.getAttribute("data-playbook")) {
          clearPlaybook();
          render();
          writeHash();
          return;
        }
        runPlaybook(btn.getAttribute("data-playbook"));
      });
    }

    root.addEventListener("click", function (event) {
      var portBtn = event.target.closest("[data-select-port], [data-port]");
      if (portBtn && root.contains(portBtn)) {
        var portId = portBtn.getAttribute("data-select-port") || portBtn.getAttribute("data-port");
        if (portId) {
          event.preventDefault();
          selectPort(portId);
          return;
        }
      }
      var unit = event.target.closest(".desk-unit[data-device]");
      if (unit && root.contains(unit)) {
        var id = unit.getAttribute("data-device");
        if (state.present[id]) selectDevice(id);
      }
    });

    root.addEventListener("keydown", function (event) {
      var unit = event.target.closest(".desk-unit[data-device]");
      if (!unit || !root.contains(unit)) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        var id = unit.getAttribute("data-device");
        if (state.present[id]) selectDevice(id);
      }
    });

    if (copyBtn) {
      copyBtn.addEventListener("click", copyTicket);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("hashchange", function () {
        if (state.writingHash) return;
        applyParsed(parseHash(location.hash));
      });
      applyParsed(parseHash(location.hash));
    } else {
      render();
    }

    return {
      getState: function () {
        return clone(state);
      },
      setPresent: setPresent,
      runPlaybook: runPlaybook,
      selectDevice: selectDevice,
      selectPort: selectPort
    };
  }

  return {
    DEVICE_ORDER: DEVICE_ORDER,
    DEVICES: DEVICES,
    PLAYBOOKS: PLAYBOOKS,
    KIND_LABEL: KIND_LABEL,
    defaultPresent: defaultPresent,
    normalizePresent: normalizePresent,
    parseDeskList: parseDeskList,
    presentToList: presentToList,
    playbookById: playbookById,
    playbookIsAvailable: playbookIsAvailable,
    visiblePlaybooks: visiblePlaybooks,
    resolvePlaybookDevice: resolvePlaybookDevice,
    resolvePlaybookPort: resolvePlaybookPort,
    ticketNote: ticketNote,
    parseHash: parseHash,
    buildHash: buildHash,
    mount: mount
  };
});
