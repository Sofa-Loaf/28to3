(function () {
  var devices = {
    wd19: {
      name: "Dell WD19",
      kicker: "Dock",
      title: "WD19 — start at the barrel",
      coach: "That’s power on the WD19 — pull that one. Fat round plug on the left. Not the USB-C under the laptop.",
      note: "Client-facing: the brick feeds the dock. The USB-C to the Precision is the other end. If the dock is dark, do not start at the laptop.",
      ports: [
        { id: "wd19-dc", tag: "DC", name: "Barrel power", coach: "That’s power on the WD19 — pull that one.", callout: true },
        { id: "wd19-usbc", tag: "C", name: "USB-C to laptop", coach: "That’s the host cable. It goes under the Precision — it is not wall power." },
        { id: "wd19-hdmi", tag: "HDMI", name: "HDMI out", coach: "If they said HDMI, this is the dock end. Other end is the Dell panel." },
        { id: "wd19-dp1", tag: "DP", name: "DisplayPort 1", coach: "Latch, not a thumb screw. Ask them if it clicks." },
        { id: "wd19-dp2", tag: "DP", name: "DisplayPort 2", coach: "Second panel or a DP-to-HDMI pigtail. Confirm which port is actually used." },
        { id: "wd19-rj45", tag: "NET", name: "Ethernet", coach: "Link light on the dock. If the laptop has Wi-Fi only, this is the drop." },
        { id: "wd19-usba", tag: "A", name: "USB-A", coach: "Keyboard and mouse. Dead USB here is still a dock-power ticket first." },
        { id: "wd19-audio", tag: "3.5", name: "Audio", coach: "Headset on the dock, not the laptop, if that’s how the desk is built." }
      ]
    },
    precision: {
      name: "Dell Precision",
      kicker: "Workstation",
      title: "Precision — laptop or tower",
      coach: "If it’s on the WD19, charging is the dock brick, not a magic USB-C. Ask them to leave the lid how they use it.",
      note: "Match chassis in Configure. Laptop on dock is the common ticket. Tower is a different rear panel.",
      ports: [
        { id: "prec-tb", tag: "TB", name: "USB-C / Thunderbolt", coach: "That’s the cable to the WD19. Fully seated — wiggle test, then leave it." },
        { id: "prec-hdmi", tag: "HDMI", name: "HDMI", coach: "Direct to the Dell panel if they skipped the dock. Say which path they’re on." },
        { id: "prec-usba", tag: "A", name: "USB-A", coach: "Local stick or mouse. Not how the dock gets power." },
        { id: "prec-sd", tag: "SD", name: "SD reader", coach: "Ignore on a power ticket. Do not let them unplug the dock for this." },
        { id: "prec-led", tag: "LED", name: "Charge LED", coach: "Amber / white / dark. Dark on dock means we go back to the WD19 barrel." }
      ]
    },
    optiplex: {
      name: "Dell OptiPlex",
      kicker: "SFF",
      title: "OptiPlex SFF — rear first",
      coach: "IEC power in the back. Then DP or HDMI to the Dell panel. Front power button last.",
      note: "SFF on the desk or under it. If they only have an OptiPlex, hide the laptop in Configure.",
      ports: [
        { id: "opti-iec", tag: "AC", name: "IEC power", coach: "That’s the kettle lead in the OptiPlex. Confirm it’s the one that wiggles, not the monitor." },
        { id: "opti-dp", tag: "DP", name: "DisplayPort", coach: "Latch at the SFF. Same cable should click at the Dell panel." },
        { id: "opti-hdmi", tag: "HDMI", name: "HDMI", coach: "If DP is empty, this is the picture path. Monitor input must match." },
        { id: "opti-rj45", tag: "NET", name: "Ethernet", coach: "Link light on the SFF. Separate from dock Ethernet." },
        { id: "opti-usba", tag: "A", name: "USB-A", coach: "Keyboard / mouse on the SFF if this is not a docked laptop desk." },
        { id: "opti-pwr", tag: "BTN", name: "Power button", coach: "One press. If fans stay down, we are still on the UPS / outlet script." }
      ]
    },
    monitor: {
      name: "Dell monitor",
      kicker: "Display",
      title: "Dell monitor — LED, then input",
      coach: "Ask for the LED: off, amber, or white. Then DP latch or HDMI — tell me which one is in the monitor.",
      note: "OSD input left on VGA is a real ticket. Cable at the panel first, source second.",
      ports: [
        { id: "mon-ac", tag: "AC", name: "Power brick / IEC", coach: "Panel brick in a battery outlet if there’s a UPS. Surge-only looks live and isn’t." },
        { id: "mon-dp", tag: "DP", name: "DisplayPort in", coach: "DP latch or HDMI — tell me which one is in the monitor." },
        { id: "mon-hdmi", tag: "HDMI", name: "HDMI in", coach: "If they used HDMI, the OSD cannot sit on DisplayPort." },
        { id: "mon-usb", tag: "USB", name: "USB upstream", coach: "Hub on the panel. Dead hub is not a black-screen root cause." },
        { id: "mon-osd", tag: "OSD", name: "Joystick / buttons", coach: "Input source. Walk them to DP or HDMI — not Auto if Auto is lying." }
      ]
    },
    ups: {
      name: "UPS",
      kicker: "Power path",
      title: "UPS — battery row, not surge",
      coach: "If the UPS clicked off, the surge row can still look live. Move the WD19 brick to a battery outlet.",
      note: "Battery outlets vs surge-only. Front button. Overload from tower + panel + dock on one unit.",
      ports: [
        { id: "ups-in", tag: "IN", name: "Wall inlet", coach: "Follow the UPS cord to the wall or strip. Strip switch is a real outage." },
        { id: "ups-battery-1", tag: "BAT", name: "Battery outlet", coach: "Dock brick and OptiPlex belong here. Not the surge-only row." },
        { id: "ups-surge-1", tag: "SRG", name: "Surge-only", coach: "Looks like an outlet. Dies when the UPS is off. Do not park the WD19 here." },
        { id: "ups-btn", tag: "BTN", name: "Front button", coach: "Ask them to read the LED — green, amber, or dark. Dark means the unit is off." },
        { id: "ups-usb", tag: "USB", name: "USB / serial", coach: "Management cable. Ignore on a hard-down desk unless they mentioned graceful shutdown." }
      ]
    }
  };

  var scripts = {
    "no-dock-power": {
      name: "No dock power",
      title: "Ticket: WD19 is dark",
      coach: "That’s power on the WD19 — pull that one. Do not start at the USB-C.",
      note: "LEDs off. Client says everything is plugged in. Barrel, then brick, then the UPS row.",
      need: { dock: "wd19" },
      steps: [
        { device: "wd19", port: "wd19-dc", say: "Look at the left end of the WD19. Fat round barrel. That’s power on the WD19 — pull that one.", callout: true },
        { device: "wd19", port: "wd19-usbc", say: "Leave the USB-C to the laptop. That is not how the dock gets wall power." },
        { device: "ups", port: "ups-battery-1", say: "Follow the brick. Battery outlet on the UPS — not the surge-only row." },
        { device: "wd19", port: "wd19-dc", say: "Reseat the barrel. Ten seconds out. Plug back. Ask for a dock LED.", callout: true },
        { device: "precision", port: "prec-led", say: "If the dock stays dark, swap the 130W / 180W brick. Precision often wants 180W." }
      ]
    },
    "no-display": {
      name: "No display",
      title: "Ticket: no picture",
      coach: "DP latch or HDMI — tell me which one is in the monitor.",
      note: "Dock may already be alive. Black panel is cable, input, then source.",
      need: { display: "dell" },
      steps: [
        { device: "monitor", port: "mon-osd", say: "LED on the Dell panel — off, amber, or white. Off is still a power path." },
        { device: "monitor", port: "mon-dp", say: "The cable in the monitor — DP latch or HDMI. Tell me which one.", callout: true },
        { device: "wd19", port: "wd19-dp1", say: "Other end: WD19 DP/HDMI, or the OptiPlex rear. Pick one path and stay on it." },
        { device: "optiplex", port: "opti-dp", say: "If this desk is SFF-only, latch DP on the OptiPlex. Same cable should click at the panel." },
        { device: "precision", port: "prec-tb", say: "Laptop lid how they use it. Windows display cycle only after the cable is honest." }
      ]
    },
    "not-charging": {
      name: "Laptop not charging",
      title: "Ticket: Precision drains on the dock",
      coach: "That’s power on the WD19 — pull that one. USB-C under the laptop is the other end.",
      note: "Battery falling while docked. The WD19 needs its own brick.",
      need: { dock: "wd19", chassis: "precision-laptop" },
      steps: [
        { device: "wd19", port: "wd19-dc", say: "That’s power on the WD19 — pull that one. Confirm the barrel is in and the brick is warm.", callout: true },
        { device: "precision", port: "prec-tb", say: "USB-C under the laptop is host. Fully seated. Wiggle test, then leave it." },
        { device: "precision", port: "prec-led", say: "Charge LED: amber, white, or dark. Dark with a live dock is still a brick / wattage ticket." },
        { device: "ups", port: "ups-battery-1", say: "Brick in a battery outlet. Surge-only will drop the dock and the laptop stops charging." },
        { device: "wd19", port: "wd19-dc", say: "130W vs 180W. Precision mobile brownouts on the smaller brick. Swap if they have the 180W.", callout: true }
      ]
    },
    "ups-dead": {
      name: "UPS / outlet dead",
      title: "Ticket: desk has no power",
      coach: "If the UPS clicked off, the surge row can still look live. Move the WD19 brick to a battery outlet.",
      note: "Whole desk or just dock + panel. Front button, then which row, then the wall.",
      need: { power: "ups" },
      steps: [
        { device: "ups", port: "ups-btn", say: "Front button. Ask them to read the LED — green, amber, or dark." },
        { device: "ups", port: "ups-surge-1", say: "Surge-only looks like an outlet. It dies when the UPS is off. Do not park the dock there." },
        { device: "ups", port: "ups-battery-1", say: "Move the WD19 brick to a battery outlet. Same for the OptiPlex kettle lead.", callout: true },
        { device: "wd19", port: "wd19-dc", say: "That’s power on the WD19 — pull that one, then plug it back on the battery row." },
        { device: "ups", port: "ups-in", say: "If the UPS is dark, wall or strip behind the desk. Overload if tower + panel + dock are on one unit." }
      ]
    }
  };

  var lab = document.querySelector(".desk-lab");
  var panelKicker = document.getElementById("panel-kicker");
  var panelTitle = document.getElementById("panel-title");
  var panelCoach = document.getElementById("panel-coach");
  var panelNote = document.getElementById("panel-note");
  var portsEl = document.getElementById("desk-ports");
  var stepsEl = document.getElementById("desk-steps");
  var configForm = document.getElementById("desk-config");
  var statusEl = document.getElementById("desk-status");
  var sceneTitle = document.getElementById("scene-title");
  var copyCoachBtn = document.getElementById("copy-coach");
  var copyTicketBtn = document.getElementById("copy-ticket");

  var state = {
    panel: "scene",
    device: null,
    script: null,
    step: 0,
    port: null
  };

  function config() {
    return {
      chassis: lab.getAttribute("data-chassis"),
      dock: lab.getAttribute("data-dock"),
      display: lab.getAttribute("data-display"),
      power: lab.getAttribute("data-power")
    };
  }

  function quote(text) {
    var t = String(text || "").replace(/^“|”$/g, "");
    return "“" + t + "”";
  }

  function coachText() {
    return (panelCoach.textContent || "").replace(/^[“"]|[”"]$/g, "").trim();
  }

  function ticketText() {
    var cfg = config();
    var lines = [
      "Desk Lab — " + (state.script && scripts[state.script] ? scripts[state.script].name : state.device ? devices[state.device].name : "desk"),
      "Coach: " + coachText(),
      "Desk: " + cfg.chassis + ", dock " + cfg.dock + ", display " + cfg.display + ", power " + cfg.power,
      "https://28to3.me/apps/desk-lab.html" + location.hash
    ];
    return lines.join("\n");
  }

  function setStatus(message) {
    statusEl.textContent = message || "";
  }

  function copyText(text, ok) {
    var done = function () {
      setStatus(ok);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        window.prompt("Copy", text);
        done();
      });
    } else {
      window.prompt("Copy", text);
      done();
    }
  }

  function clearMarks() {
    lab.querySelectorAll(".is-selected, .is-lit, .is-callout, .is-active").forEach(function (node) {
      node.classList.remove("is-selected", "is-lit", "is-callout", "is-active");
    });
  }

  function markDevice(id, extra) {
    lab.querySelectorAll("[data-device=\"" + id + "\"]").forEach(function (node) {
      node.classList.add(extra || "is-lit");
    });
  }

  function markPort(id, extra) {
    if (!id) return;
    lab.querySelectorAll("[data-port=\"" + id + "\"]").forEach(function (node) {
      node.classList.add(extra || "is-callout");
    });
  }

  function needWarning(need) {
    if (!need) return "";
    var cfg = config();
    if (need.dock && cfg.dock !== need.dock) return "This ticket wants a WD19. Turn the dock on in Match their desk.";
    if (need.display && cfg.display !== need.display) return "This ticket wants the Dell panel. Turn the monitor on in Match their desk.";
    if (need.power && cfg.power !== need.power) return "This ticket wants the UPS in the path. Switch power in Match their desk.";
    if (need.chassis && cfg.chassis !== need.chassis) return "This ticket is a docked Precision laptop. Switch chassis in Match their desk.";
    return "";
  }

  function setPanel(kicker, title, coach, note) {
    panelKicker.textContent = kicker;
    panelTitle.textContent = title;
    panelCoach.textContent = quote(coach);
    panelNote.textContent = note;
  }

  function hideExtras() {
    portsEl.hidden = true;
    stepsEl.hidden = true;
    configForm.hidden = true;
    portsEl.innerHTML = "";
    stepsEl.innerHTML = "";
  }

  function renderPorts(deviceId, activePort) {
    var device = devices[deviceId];
    portsEl.hidden = false;
    portsEl.innerHTML = device.ports.map(function (port) {
      var active = port.id === activePort ? " is-active" : "";
      var callout = port.callout && port.id === activePort ? " is-callout" : "";
      return (
        "<button type=\"button\" class=\"desk-port" + active + callout + "\" data-port-pick=\"" + port.id + "\">" +
          "<span class=\"desk-port-tag\">" + port.tag + "</span>" +
          "<strong>" + port.name + "</strong>" +
          "<span>" + port.coach + "</span>" +
        "</button>"
      );
    }).join("");
  }

  function renderSteps(scriptId, stepIndex) {
    var script = scripts[scriptId];
    stepsEl.hidden = false;
    stepsEl.innerHTML = script.steps.map(function (step, index) {
      var active = index === stepIndex ? " is-active" : "";
      var callout = step.callout && index === stepIndex ? " is-callout" : "";
      return (
        "<button type=\"button\" class=\"desk-step" + active + callout + "\" data-step-pick=\"" + index + "\">" +
          "<span class=\"desk-step-num\">" + (index + 1) + "/" + script.steps.length + "</span>" +
          "<strong>" + (devices[step.device] ? devices[step.device].name : step.device) + "</strong>" +
          "<span>" + step.say + "</span>" +
        "</button>"
      );
    }).join("");
  }

  function showScene() {
    state.panel = "scene";
    state.device = null;
    state.script = null;
    state.step = 0;
    state.port = null;
    clearMarks();
    hideExtras();
    sceneTitle.textContent = "Click a box. Ports open on the right.";
    setPanel(
      "Say this",
      "Share the desk. Click a unit.",
      "Look at the left end of the WD19. Fat round plug. That’s power on the WD19 — pull that one.",
      "Default desk: Precision laptop on a WD19, Dell monitor, OptiPlex SFF on the side, UPS in the path. Match their desk if this isn’t it."
    );
    syncChrome();
    writeHash("scene");
  }

  function showDevice(deviceId, portId) {
    var device = devices[deviceId];
    if (!device) return;
    var port = device.ports.find(function (item) {
      return item.id === portId;
    });
    state.panel = "device";
    state.device = deviceId;
    state.script = null;
    state.step = 0;
    state.port = port ? port.id : null;
    clearMarks();
    hideExtras();
    markDevice(deviceId, "is-selected");
    if (port) markPort(port.id, port.callout ? "is-callout" : "is-lit");
    sceneTitle.textContent = device.name + " — labeled ports.";
    setPanel(
      device.kicker,
      port ? port.name : device.title,
      port ? port.coach : device.coach,
      device.note
    );
    renderPorts(deviceId, state.port);
    syncChrome();
    writeHash(deviceId + (port ? "/" + port.id : ""));
  }

  function showScript(scriptId, stepIndex) {
    var script = scripts[scriptId];
    if (!script) return;
    var index = Math.max(0, Math.min(script.steps.length - 1, stepIndex || 0));
    var step = script.steps[index];
    state.panel = "script";
    state.script = scriptId;
    state.device = step.device;
    state.step = index;
    state.port = step.port || null;
    clearMarks();
    hideExtras();
    markDevice(step.device, "is-selected");
    markPort(step.port, step.callout ? "is-callout" : "is-lit");
    sceneTitle.textContent = script.name + " · step " + (index + 1) + " of " + script.steps.length;
    setPanel("Guided script", script.title, step.say, needWarning(script.need) || script.note);
    renderSteps(scriptId, index);
    syncChrome();
    writeHash("script-" + scriptId + "/" + (index + 1));
  }

  function showConfigure() {
    state.panel = "configure";
    state.device = null;
    state.script = null;
    state.step = 0;
    state.port = null;
    clearMarks();
    hideExtras();
    configForm.hidden = false;
    sceneTitle.textContent = "Match what the client can see.";
    setPanel(
      "Configure",
      "What’s on their desk",
      "Turn off the WD19 if they don’t have a dock. Leave the UPS on if it’s in the path.",
      "This is for the ticket, not a shopper. Hidden units stay dim so you don’t talk to the wrong box."
    );
    syncChrome();
    writeHash("configure");
  }

  function syncChrome() {
    document.querySelectorAll("[data-script]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-script") === state.script);
    });
    document.querySelectorAll("[data-device]").forEach(function (node) {
      var on = node.getAttribute("data-device") === state.device;
      node.classList.toggle("is-active", on);
      if (node.classList.contains("desk-hit") && on) node.classList.add("is-selected");
    });
    document.querySelectorAll("[data-panel]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-panel") === state.panel);
    });
  }

  function writeHash(value) {
    var next = "#" + value;
    if (location.hash !== next) {
      history.replaceState(null, "", next);
    }
  }

  function applyHash() {
    var raw = (location.hash || "#scene").slice(1);
    if (raw === "scene" || raw === "") {
      showScene();
      return;
    }
    if (raw === "configure") {
      showConfigure();
      return;
    }
    if (raw.indexOf("script-") === 0) {
      var parts = raw.replace("script-", "").split("/");
      var scriptId = parts[0];
      var step = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
      if (scripts[scriptId]) {
        showScript(scriptId, isNaN(step) ? 0 : step);
        return;
      }
    }
    var deviceParts = raw.split("/");
    if (devices[deviceParts[0]]) {
      showDevice(deviceParts[0], deviceParts[1]);
      return;
    }
    showScene();
  }

  function applyConfigFromForm() {
    if (!configForm) return;
    var data = new FormData(configForm);
    lab.setAttribute("data-chassis", data.get("chassis") || "precision-laptop");
    lab.setAttribute("data-dock", data.get("dock") || "wd19");
    lab.setAttribute("data-display", data.get("display") || "dell");
    lab.setAttribute("data-power", data.get("power") || "ups");
    if (state.script) showScript(state.script, state.step);
  }

  document.querySelectorAll("[data-script]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      showScript(btn.getAttribute("data-script"), 0);
      document.getElementById("desk-panel").scrollIntoView({ block: "nearest" });
    });
  });

  document.querySelectorAll("[data-device]").forEach(function (node) {
    var activate = function (event) {
      event.preventDefault();
      showDevice(node.getAttribute("data-device"));
    };
    node.addEventListener("click", activate);
    node.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") activate(event);
    });
  });

  document.querySelectorAll("[data-panel]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var panel = btn.getAttribute("data-panel");
      if (panel === "configure") showConfigure();
      if (panel === "scene") showScene();
    });
  });

  portsEl.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-port-pick]");
    if (!btn || !state.device) return;
    showDevice(state.device, btn.getAttribute("data-port-pick"));
  });

  stepsEl.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-step-pick]");
    if (!btn || !state.script) return;
    showScript(state.script, parseInt(btn.getAttribute("data-step-pick"), 10));
  });

  configForm.addEventListener("change", applyConfigFromForm);

  copyCoachBtn.addEventListener("click", function () {
    copyText(coachText(), "Coach line copied.");
  });

  copyTicketBtn.addEventListener("click", function () {
    copyText(ticketText(), "Ticket blurb copied.");
  });

  window.addEventListener("hashchange", applyHash);
  applyConfigFromForm();
  applyHash();
})();
