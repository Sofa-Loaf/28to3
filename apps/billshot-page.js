(function () {
  var report = document.getElementById("report");
  var linux = document.getElementById("manual-linux");
  var windows = document.getElementById("manual-windows");
  var macos = document.getElementById("manual-macos");
  var total = document.getElementById("manual-total");
  var out = document.getElementById("billshot-out");
  var shot = document.getElementById("shot");
  var drop = document.getElementById("shot-drop");
  var preview = document.getElementById("shot-preview");
  var previewImg = document.getElementById("shot-img");
  var previewUrl = "";

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function manualValues() {
    return {
      linux: linux.value,
      windows: windows.value,
      macos: macos.value,
      total: total.value
    };
  }

  function render() {
    var result = window.Billshot.parse(report.value, manualValues());
    if (out) out.classList.toggle("is-invalid", result.empty);

    setText("out-title", result.empty ? "Paste a report" : result.driver.title);
    setText("out-sub", result.empty
      ? "Load the sample to see a mixed-OS month."
      : result.totals.minutes + " rounded min · " + result.totals.included + " included min · " + window.Billshot.money4(result.totals.dollars) + " list");
    setText("out-driver", result.driver.body);
    setText("out-round-title", result.rounding.title);
    setText("out-round-body", result.rounding.body);
    setText("out-mult-title", result.multipliers.title);
    setText("out-mult-body", result.multipliers.body);
    setText("out-minutes", result.empty ? "—" : window.Billshot.formatMinutes(result.totals.minutes));
    setText("out-included", result.empty ? "—" : window.Billshot.formatMinutes(result.totals.included));
    setText("out-dollars", result.empty ? "—" : window.Billshot.money4(result.totals.dollars));
    setText("out-net", result.empty ? "—" : (result.totals.net > 0 ? window.Billshot.money4(result.totals.net) : (result.reported != null ? window.Billshot.money4(result.reported) : "—")));
    setText("out-notes", result.notes.join(" "));

    var body = document.getElementById("os-body");
    if (body) {
      body.innerHTML = ["linux", "windows", "macos"].map(function (key) {
        var rate = result.rates[key];
        var row = result.os[key];
        var cls = key === "macos" ? " class=\"macos\"" : "";
        if (result.empty) {
          return "<tr" + cls + "><th scope=\"row\">" + rate.label + " " + rate.multiplier + "×</th><td class=\"num\">—</td><td class=\"num\">—</td><td class=\"num\">—</td></tr>";
        }
        return "<tr" + cls + "><th scope=\"row\">" + rate.label + " " + rate.multiplier + "×</th><td class=\"num\">" + window.Billshot.formatMinutes(row.minutes) + "</td><td class=\"num\">" + window.Billshot.formatMinutes(row.included) + "</td><td class=\"num\">" + window.Billshot.money4(row.dollars) + "</td></tr>";
      }).join("");
    }

    var flowWrap = document.getElementById("flow-wrap");
    var flowBody = document.getElementById("flow-body");
    if (flowWrap && flowBody) {
      if (!result.workflows.length) {
        flowWrap.hidden = true;
        flowBody.innerHTML = "";
      } else {
        flowWrap.hidden = false;
        flowBody.innerHTML = result.workflows.map(function (row) {
          return "<tr><th scope=\"row\">" + escapeHtml(row.label) + "</th><td class=\"num\">" + window.Billshot.formatMinutes(row.minutes) + "</td><td class=\"num\">" + window.Billshot.formatMinutes(row.included) + "</td><td class=\"num\">" + window.Billshot.money4(row.dollars) + "</td></tr>";
        }).join("");
      }
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch];
    });
  }

  function showPreview(file) {
    if (!file || !file.type || file.type.indexOf("image/") !== 0) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    previewImg.src = previewUrl;
    preview.classList.remove("is-hidden");
    document.getElementById("shot-copy").textContent = file.name + " — preview only. Type the minutes you can read.";
    document.getElementById("manual-fields").scrollIntoView({ block: "nearest" });
  }

  document.getElementById("load-sample").addEventListener("click", function () {
    report.value = window.Billshot.SAMPLE;
    render();
    out.scrollIntoView({ block: "nearest" });
  });

  document.getElementById("clear-report").addEventListener("click", function () {
    report.value = "";
    linux.value = "";
    windows.value = "";
    macos.value = "";
    total.value = "";
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    previewImg.removeAttribute("src");
    preview.classList.add("is-hidden");
    shot.value = "";
    document.getElementById("shot-copy").textContent = "Drop a billing screenshot, or choose a file. Preview only — this page does not read pixels. Type the minutes you can see.";
    render();
  });

  document.getElementById("billshot-form").addEventListener("input", render);
  document.getElementById("billshot-form").addEventListener("submit", function (event) {
    event.preventDefault();
    render();
  });

  shot.addEventListener("change", function () {
    if (shot.files && shot.files[0]) showPreview(shot.files[0]);
  });

  ["dragenter", "dragover"].forEach(function (name) {
    drop.addEventListener(name, function (event) {
      event.preventDefault();
      drop.classList.add("is-over");
    });
  });
  ["dragleave", "drop"].forEach(function (name) {
    drop.addEventListener(name, function (event) {
      event.preventDefault();
      drop.classList.remove("is-over");
    });
  });
  drop.addEventListener("drop", function (event) {
    var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) showPreview(file);
  });

  if (/(?:[?&#]sample(?:[=&#]|$))/.test(window.location.href)) {
    report.value = window.Billshot.SAMPLE;
  }

  render();
})();
