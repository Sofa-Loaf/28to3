(function (root) {
  var RATES = {
    linux: { key: "linux", label: "Linux", sku: "actions_linux", multiplier: 1, perMin: 0.006 },
    windows: { key: "windows", label: "Windows", sku: "actions_windows", multiplier: 2, perMin: 0.01 },
    macos: { key: "macos", label: "macOS", sku: "actions_macos", multiplier: 10, perMin: 0.062 }
  };

  var SAMPLE = [
    "date,product,sku,quantity,unit_type,applied_cost_per_quantity,gross_amount,discount_amount,net_amount,organization,repository,workflow_path",
    "2026-08-04,actions,actions_linux,186,minutes,0.006,1.116,1.116,0,acme,checkout-api,.github/workflows/ci.yml",
    "2026-08-04,actions,actions_windows,42,minutes,0.01,0.42,0,0.42,acme,checkout-api,.github/workflows/ci.yml",
    "2026-08-04,actions,actions_macos,18,minutes,0.062,1.116,0,1.116,acme,desktop-app,.github/workflows/release.yml",
    "2026-08-11,actions,actions_linux,94,minutes,0.006,0.564,0.564,0,acme,checkout-api,.github/workflows/lint.yml",
    "2026-08-11,actions,actions_macos,9,minutes,0.062,0.558,0,0.558,acme,desktop-app,.github/workflows/release.yml"
  ].join("\n");

  function money(n) {
    if (n == null || !isFinite(n)) return "—";
    var abs = Math.abs(n);
    var digits = abs > 0 && abs < 0.01 ? 4 : abs < 10 ? 4 : 2;
    return "$" + n.toFixed(digits);
  }

  function money4(n) {
    if (n == null || !isFinite(n)) return "—";
    return "$" + n.toFixed(4);
  }

  function parseNumber(raw) {
    if (raw == null) return null;
    var text = String(raw).trim();
    if (!text) return null;
    text = text.replace(/[$,]/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
    var n = parseFloat(text);
    return isFinite(n) ? n : null;
  }

  function normalizeKey(name) {
    return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function classifySku(sku) {
    var s = String(sku || "").toLowerCase();
    if (!s) return null;
    if (/macos|osx|darwin/.test(s)) return "macos";
    if (/windows|win32/.test(s)) return "windows";
    if (/linux|ubuntu/.test(s)) return "linux";
    return null;
  }

  function isLargerRunner(sku) {
    return /(_\d+_core|larger|4-core|8-core|16-core|32-core|64-core)/i.test(String(sku || ""));
  }

  function isActionsProduct(product, sku) {
    var p = String(product || "").toLowerCase();
    var s = String(sku || "").toLowerCase();
    if (p && !/action/.test(p)) return false;
    if (s && /codespace|copilot|package|storage|git lfs|shared storage/.test(s)) return false;
    if (s && /action|linux|ubuntu|windows|macos/.test(s)) return true;
    if (p && /action/.test(p)) return true;
    return !p && !!classifySku(s);
  }

  function workflowName(path) {
    var text = String(path || "").trim();
    if (!text) return "";
    var parts = text.split(/[\\/]/);
    return parts[parts.length - 1] || text;
  }

  function parseCsv(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;
    var i;
    var c;
    var next;

    for (i = 0; i < text.length; i++) {
      c = text[i];
      next = text[i + 1];
      if (inQuotes) {
        if (c === "\"" && next === "\"") {
          field += "\"";
          i++;
        } else if (c === "\"") {
          inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === "\"") {
        inQuotes = true;
      } else if (c === "," || c === "\t") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && next === "\n") i++;
        row.push(field);
        field = "";
        if (row.some(function (cell) { return String(cell).trim(); })) rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
    if (field || row.length) {
      row.push(field);
      if (row.some(function (cell) { return String(cell).trim(); })) rows.push(row);
    }
    return rows;
  }

  function looksLikeCsv(text) {
    var first = String(text || "").split(/\r?\n/).find(function (line) {
      return line.trim();
    }) || "";
    var key = normalizeKey(first);
    return /sku/.test(key) && /quantity|minutes|product/.test(key) && (first.indexOf(",") !== -1 || first.indexOf("\t") !== -1);
  }

  function emptyOs() {
    return {
      linux: { minutes: 0, included: 0, dollars: 0, net: 0, gross: 0, rows: 0, larger: 0 },
      windows: { minutes: 0, included: 0, dollars: 0, net: 0, gross: 0, rows: 0, larger: 0 },
      macos: { minutes: 0, included: 0, dollars: 0, net: 0, gross: 0, rows: 0, larger: 0 }
    };
  }

  function addOs(os, key, minutes, dollars, net, gross, larger) {
    if (!os[key] || !minutes) return;
    var rate = RATES[key];
    os[key].minutes += minutes;
    os[key].included += minutes * rate.multiplier;
    os[key].dollars += dollars != null ? dollars : minutes * rate.perMin;
    os[key].net += net || 0;
    os[key].gross += gross || 0;
    os[key].rows += 1;
    if (larger) os[key].larger += minutes;
  }

  function parseCsvReport(text) {
    var grid = parseCsv(text);
    if (grid.length < 2) return null;
    var headers = grid[0].map(normalizeKey);
    var idx = {};
    headers.forEach(function (key, i) {
      if (key && idx[key] == null) idx[key] = i;
    });
    if (idx.sku == null || (idx.quantity == null && idx.minutes == null)) return null;

    function cell(row, names) {
      var i;
      var key;
      for (i = 0; i < names.length; i++) {
        key = names[i];
        if (idx[key] != null && row[idx[key]] != null) return String(row[idx[key]]).trim();
      }
      return "";
    }

    var os = emptyOs();
    var lines = [];
    var workflows = {};
    var skipped = 0;

    grid.slice(1).forEach(function (row) {
      var sku = cell(row, ["sku"]);
      var product = cell(row, ["product"]);
      if (!isActionsProduct(product, sku)) {
        skipped += 1;
        return;
      }
      var osKey = classifySku(sku);
      if (!osKey) {
        skipped += 1;
        return;
      }
      var quantity = parseNumber(cell(row, ["quantity", "minutes"]));
      if (quantity == null) return;
      var unit = cell(row, ["unittype", "unit"]).toLowerCase();
      var minutes = /sec/.test(unit) ? (quantity === 0 ? 0 : Math.ceil(quantity / 60)) : quantity;
      var net = parseNumber(cell(row, ["netamount", "net"]));
      var gross = parseNumber(cell(row, ["grossamount", "gross"]));
      var unitPrice = parseNumber(cell(row, ["appliedcostperquantity", "priceperunit", "priceperunit"]));
      var dollars = net != null ? net : gross != null ? gross : unitPrice != null ? minutes * unitPrice : minutes * RATES[osKey].perMin;
      var repo = cell(row, ["repository", "repositoryname"]);
      var org = cell(row, ["organization", "owner", "organizationname"]);
      var workflow = workflowName(cell(row, ["workflowpath", "actionsworkflow", "workflow"]));
      var larger = isLargerRunner(sku);

      addOs(os, osKey, minutes, dollars, net, gross, larger);
      lines.push({
        sku: sku,
        os: osKey,
        minutes: minutes,
        dollars: dollars,
        net: net,
        gross: gross,
        repo: repo,
        org: org,
        workflow: workflow,
        larger: larger
      });

      if (workflow || repo) {
        var label = [repo || org, workflow].filter(Boolean).join(" · ") || "unlabeled";
        if (!workflows[label]) {
          workflows[label] = { label: label, repo: repo, workflow: workflow, minutes: 0, dollars: 0, included: 0, os: {} };
        }
        workflows[label].minutes += minutes;
        workflows[label].dollars += dollars;
        workflows[label].included += minutes * RATES[osKey].multiplier;
        workflows[label].os[osKey] = (workflows[label].os[osKey] || 0) + minutes;
      }
    });

    if (!lines.length) return null;
    return { source: "csv", os: os, lines: lines, workflows: workflows, skipped: skipped };
  }

  function parseJobSummary(text) {
    var os = emptyOs();
    var lines = [];
    var shortJobs = 0;
    var jobRe = /(\d+m\s+\d+s|\d+s)\s*[·•|]\s*(\d+)\s*rounded\s*[·•|]\s*(actions_[a-z0-9_]+)/gi;
    var match;
    var found = false;

    function wallSeconds(wall) {
      var mmss = String(wall).match(/^(?:(\d+)m\s+)?(\d+)s$/);
      if (!mmss) return null;
      return (mmss[1] ? parseInt(mmss[1], 10) * 60 : 0) + parseInt(mmss[2], 10);
    }

    while ((match = jobRe.exec(text))) {
      var sku = match[3];
      var osKey = classifySku(sku);
      if (!osKey) continue;
      var rounded = parseInt(match[2], 10);
      var seconds = wallSeconds(match[1]);
      var dollars = rounded * RATES[osKey].perMin;
      found = true;
      if (seconds != null && seconds > 0 && seconds < 60) shortJobs += 1;
      addOs(os, osKey, rounded, dollars, 0, dollars, isLargerRunner(sku));
      lines.push({
        sku: sku,
        os: osKey,
        minutes: rounded,
        dollars: dollars,
        wall: match[1],
        short: seconds != null && seconds > 0 && seconds < 60
      });
    }

    if (!found) return null;
    return { source: "jobs", os: os, lines: lines, workflows: {}, shortJobs: shortJobs, skipped: 0 };
  }

  function parsePlainText(text) {
    var os = emptyOs();
    var found = false;
    var workflows = {};
    var lines = [];

    var osLine = /(?:^|[\n;|])\s*(linux|ubuntu|windows|macos|osx|mac\s*os)\b[^\d\n]{0,24}([\d,.]+)\s*(minutes|minute|min\b)?/gi;
    var match;
    while ((match = osLine.exec(text))) {
      var osKey = classifySku(match[1]);
      var minutes = parseNumber(match[2]);
      if (!osKey || minutes == null || minutes < 0) continue;
      found = true;
      addOs(os, osKey, minutes, minutes * RATES[osKey].perMin, 0, minutes * RATES[osKey].perMin, false);
    }

    var flowLine = /(?:^|\n)\s*([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)?\s+([A-Za-z0-9_.-]+\.ya?ml)\s+(.+)/gi;
    while ((match = flowLine.exec(text))) {
      var rest = match[3];
      var osBits = rest.match(/(linux|ubuntu|windows|macos)\s*([\d,.]+)/gi) || [];
      if (!osBits.length) continue;
      var label = [match[1], match[2]].filter(Boolean).join(" · ");
      if (!workflows[label]) {
        workflows[label] = { label: label, repo: match[1] || "", workflow: match[2], minutes: 0, dollars: 0, included: 0, os: {} };
      }
      osBits.forEach(function (bit) {
        var parts = bit.match(/(linux|ubuntu|windows|macos)\s*([\d,.]+)/i);
        if (!parts) return;
        var key = classifySku(parts[1]);
        var mins = parseNumber(parts[2]);
        if (!key || mins == null) return;
        workflows[label].minutes += mins;
        workflows[label].dollars += mins * RATES[key].perMin;
        workflows[label].included += mins * RATES[key].multiplier;
        workflows[label].os[key] = (workflows[label].os[key] || 0) + mins;
      });
    }

    if (!found) return null;
    return { source: "text", os: os, lines: lines, workflows: workflows, skipped: 0 };
  }

  function parseManual(manual) {
    var os = emptyOs();
    var found = false;
    ["linux", "windows", "macos"].forEach(function (key) {
      var minutes = parseNumber(manual && manual[key]);
      if (minutes == null || minutes < 0) return;
      found = true;
      addOs(os, key, minutes, minutes * RATES[key].perMin, 0, minutes * RATES[key].perMin, false);
    });
    if (!found) return null;
    return { source: "manual", os: os, lines: [], workflows: {}, skipped: 0 };
  }

  function sumOs(os, field) {
    return (os.linux[field] || 0) + (os.windows[field] || 0) + (os.macos[field] || 0);
  }

  function hasMinutes(os) {
    return sumOs(os, "minutes") > 0;
  }

  function parseReportedTotal(text) {
    var match = String(text || "").match(/(?:net|total|billed|invoice|est\.?)\s*(?:after[^$]{0,24})?\$?\s*([0-9][0-9,]*\.\d{2,4})/i);
    if (!match) {
      match = String(text || "").match(/\$([0-9][0-9,]*\.\d{2,4})/);
    }
    return match ? parseNumber(match[1]) : null;
  }

  function workflowList(map) {
    return Object.keys(map).map(function (key) {
      return map[key];
    }).sort(function (a, b) {
      return (b.dollars - a.dollars) || (b.included - a.included) || (b.minutes - a.minutes);
    });
  }

  function topOs(os, field) {
    return ["linux", "windows", "macos"].map(function (key) {
      return { key: key, rate: RATES[key], value: os[key][field] || 0, row: os[key] };
    }).sort(function (a, b) {
      return b.value - a.value;
    });
  }

  function explainParsed(parsed, extras) {
    extras = extras || {};
    var os = parsed ? parsed.os : emptyOs();
    var empty = !parsed || !hasMinutes(os);
    var totals = {
      minutes: sumOs(os, "minutes"),
      included: sumOs(os, "included"),
      dollars: sumOs(os, "dollars"),
      net: sumOs(os, "net"),
      gross: sumOs(os, "gross")
    };
    var reported = extras.reportedTotal;
    if (reported == null && extras.text) reported = parseReportedTotal(extras.text);
    var dollarField = totals.net > 0 ? "net" : totals.dollars > 0 ? "dollars" : "included";
    var ranked = topOs(os, dollarField === "included" ? "included" : dollarField);
    var leader = ranked[0];
    var linux = os.linux;
    var driver = {
      title: "Paste a report to see what drove the bill.",
      body: "GitHub’s usage report is a lump of minutes and SKUs. Billshot reads the OS mix and names the likely driver — usually macOS 10× or a wide Windows matrix, not the longest Linux wall time."
    };

    if (!empty && leader && leader.value > 0) {
      var share = dollarField === "included"
        ? Math.round((leader.row.included / totals.included) * 100)
        : Math.round((leader.row.dollars / (totals.dollars || 1)) * 100);
      if (leader.key === "macos") {
        driver.title = "macOS drove the bill.";
        driver.body = leader.rate.label + " used " + formatMinutes(leader.row.minutes) + " at 10× included-minute burn (" + formatMinutes(leader.row.included) + " included) and " + money4(leader.row.dollars) + " at list. That is about " + share + "% of this paste — even when Linux minutes look larger.";
      } else if (leader.key === "windows") {
        driver.title = "Windows minutes are doing the damage.";
        driver.body = "Windows used " + formatMinutes(leader.row.minutes) + " at 2× (" + formatMinutes(leader.row.included) + " included) and " + money4(leader.row.dollars) + " at list — about " + share + "% of this paste. A wide Windows matrix bills twice the included minutes of the same Linux jobs.";
      } else {
        driver.title = "Linux minutes dominate this paste.";
        driver.body = "Linux is 1×, so " + formatMinutes(linux.minutes) + " is " + formatMinutes(linux.included) + " included and " + money4(linux.dollars) + " at list. If finance still saw a surprise, look for retries, a quota reset, or minutes this report does not break out by job.";
      }
      if (leader.key !== "macos" && os.macos.minutes > 0 && os.macos.included >= os.linux.included * 0.5) {
        driver.body += " macOS is still expensive here: " + formatMinutes(os.macos.minutes) + " × 10× = " + formatMinutes(os.macos.included) + " included.";
      }
    }

    var workflows = parsed ? workflowList(parsed.workflows || {}) : [];
    if (workflows.length) {
      driver.body += " Top named line: " + workflows[0].label + " (" + formatMinutes(workflows[0].minutes) + ", " + money4(workflows[0].dollars) + ").";
    }

    var shortJobs = (parsed && parsed.shortJobs) || 0;
    var roundingBody = "GitHub rounds each started job up to the next whole minute. A 12-second lint job still bills 1 minute. Usage reports already show those rounded minutes — they will not match summed wall time.";
    if (shortJobs) {
      roundingBody = shortJobs + " job" + (shortJobs === 1 ? "" : "s") + " in this paste ran under 60 seconds and still billed 1 rounded minute each. " + roundingBody;
    }

    var notes = [];
    if (parsed && parsed.source === "csv") notes.push("Read as a GitHub usage-report CSV. Actions rows only.");
    if (parsed && parsed.source === "jobs") notes.push("Read as Actionscope / Job Summary text. Same columns as v0.1.3.");
    if (parsed && parsed.source === "text") notes.push("Read as pasted billing text. Minutes were grouped by OS name.");
    if (parsed && parsed.source === "manual") notes.push("Used the typed OS minutes. Screenshot pixels are not read.");
    if (parsed && parsed.skipped) notes.push("Skipped " + parsed.skipped + " non-Actions or unknown-SKU row" + (parsed.skipped === 1 ? "" : "s") + ".");
    if (os.linux.larger || os.windows.larger || os.macos.larger) {
      notes.push("Larger-runner SKUs cannot use included minutes. Included-minute burn here is a standard-runner estimate.");
    }
    notes.push("Estimates at Actionscope v0.1.3 list rates — not a GitHub invoice.");

    return {
      empty: empty,
      source: parsed ? parsed.source : "",
      os: os,
      totals: totals,
      reported: reported,
      workflows: workflows,
      lines: parsed ? parsed.lines : [],
      driver: driver,
      rounding: {
        title: "12 seconds still bills 1 minute.",
        body: roundingBody,
        shortJobs: shortJobs
      },
      multipliers: {
        title: "Linux 1× · Windows 2× · macOS 10×",
        body: "Included minutes are not wall minutes. Windows burns 2 included minutes per rounded minute. macOS burns 10. That is why a short macOS job can outspend a long Linux job."
      },
      notes: notes,
      rates: RATES
    };
  }

  function formatMinutes(n) {
    var rounded = Math.round(n * 10) / 10;
    var text = rounded === Math.floor(rounded) ? String(Math.floor(rounded)) : rounded.toFixed(1);
    return text + " min";
  }

  function parse(text, manual) {
    var raw = String(text || "").trim();
    var parsed = null;
    if (raw && looksLikeCsv(raw)) parsed = parseCsvReport(raw);
    if (!parsed && raw) parsed = parseJobSummary(raw);
    if (!parsed && raw) parsed = parseCsvReport(raw);
    if (!parsed && raw) parsed = parsePlainText(raw);
    var manualParsed = parseManual(manual);
    if (!parsed && manualParsed) parsed = manualParsed;
    return explainParsed(parsed, { text: raw, reportedTotal: parseNumber(manual && manual.total) });
  }

  var Billshot = {
    RATES: RATES,
    SAMPLE: SAMPLE,
    parse: parse,
    money: money,
    money4: money4,
    formatMinutes: formatMinutes
  };

  root.Billshot = Billshot;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Billshot;
  }
})(typeof window !== "undefined" ? window : globalThis);
