(function () {
  var RATES = {
    linux: { sku: "actions_linux", label: "Linux", multiplier: 1, perMin: 0.006 },
    windows: { sku: "actions_windows", label: "Windows", multiplier: 2, perMin: 0.01 },
    macos: { sku: "actions_macos", label: "macOS", multiplier: 10, perMin: 0.062 }
  };

  function parseWall(raw) {
    var text = String(raw || "").trim();
    if (!text) return { error: "Enter wall duration (seconds or mm:ss)." };

    var mmss = text.match(/^(\d{1,3}):([0-5]\d)$/);
    if (mmss) {
      return { seconds: parseInt(mmss[1], 10) * 60 + parseInt(mmss[2], 10) };
    }

    if (/^\d+$/.test(text)) {
      return { seconds: parseInt(text, 10) };
    }

    return { error: "Use seconds (12) or mm:ss (1:04)." };
  }

  function formatWall(seconds) {
    if (seconds < 60) return seconds + "s";
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return s ? m + "m " + s + "s" : m + "m";
  }

  function money(n) {
    return "$" + n.toFixed(4);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setHtml(id, value) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  function render() {
    var wallEl = document.getElementById("wall");
    var parsed = parseWall(wallEl ? wallEl.value : "");
    var osEl = document.querySelector("input[name=os]:checked");
    var os = osEl ? osEl.value : "linux";
    var rate = RATES[os] || RATES.linux;
    var out = document.getElementById("calc-out");

    if (parsed.error) {
      if (out) out.classList.add("is-invalid");
      setText("out-dollars", "—");
      setText("out-sub", parsed.error);
      setHtml("out-quirk", "<strong>Quirk:</strong> a 12-second job still burns 1 rounded minute.");
      setText("out-wall", "—");
      setText("out-rounded", "—");
      setHtml("out-included", "—");
      setHtml("out-rate", "—");
      setHtml("out-sku", "<code>" + rate.sku + "</code>");
      return;
    }

    if (out) out.classList.remove("is-invalid");
    var seconds = parsed.seconds;
    var rounded = seconds === 0 ? 0 : Math.ceil(seconds / 60);
    var included = rounded * rate.multiplier;
    var dollars = rounded * rate.perMin;
    var quirk = seconds > 0 && seconds < 60
      ? "<strong>Quirk:</strong> " + formatWall(seconds) + " wall still bills <strong>1</strong> rounded minute."
      : "<strong>Quirk:</strong> a 12-second job still burns 1 rounded minute. GitHub ceils each started job to a whole minute.";

    setText("out-dollars", money(dollars));
    setText("out-sub", rounded + " rounded min · " + included + " included min · " + rate.label + " " + rate.multiplier + "×");
    setHtml("out-quirk", quirk);
    setText("out-wall", formatWall(seconds));
    setText("out-rounded", String(rounded));
    setHtml("out-included", included + " <span class=\"muted\">(" + rate.label + " " + rate.multiplier + "×)</span>");
    setHtml("out-rate", rounded + " × " + money(rate.perMin) + " = <strong>" + money(dollars) + "</strong>");
    setHtml("out-sku", "<code>" + rate.sku + "</code>");
  }

  document.getElementById("minutes-form").addEventListener("input", render);
  document.getElementById("minutes-form").addEventListener("change", render);
  document.getElementById("minutes-form").addEventListener("submit", function (event) {
    event.preventDefault();
    render();
  });
  render();
})();
