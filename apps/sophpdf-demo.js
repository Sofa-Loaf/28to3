(function () {
  var pageBody = document.getElementById("page-body");
  var marks = document.getElementById("marks");
  var page = document.getElementById("page");
  var toast = document.getElementById("toast");
  var hint = document.getElementById("tool-hint");
  var signInput = document.getElementById("sign-name");
  var winTitle = document.getElementById("win-title");
  var statusLeft = document.getElementById("status-left");
  var statusRight = document.getElementById("status-right");
  var toastTimer;

  var state = {
    file: "invoice",
    page: 1,
    tool: "select",
    signature: "",
    stamp: false,
    fields: { date: "", amount: "", clerk: "" },
    highlights: [],
    note: false
  };

  var files = {
    invoice: { name: "invoice.pdf", pages: 2 },
    letter: { name: "letter-to-sign.pdf", pages: 1 },
    timesheet: { name: "timesheet-april.pdf", pages: 1 }
  };

  function invoicePage1() {
    return (
      '<p class="sd-doc-kicker">North Office Supplies</p>' +
      "<h2>Invoice 1042</h2>" +
      '<div class="sd-doc-meta">' +
      "<div>Bill to: City Hall — Records</div>" +
      "<div>Invoice date: 12 April 2026</div>" +
      "<div>Due: Upon receipt</div>" +
      "<div>PO: DESK-19</div>" +
      "</div>" +
      '<table class="sd-table">' +
      "<thead><tr><th>Qty</th><th>Description</th><th class=\"num\">Amount</th></tr></thead>" +
      "<tbody>" +
      "<tr><td>1</td><td>Letterhead ream</td><td class=\"num\">$24.00</td></tr>" +
      "<tr><td>2</td><td>Manila folders (100)</td><td class=\"num\">$18.50</td></tr>" +
      "<tr><td>1</td><td>Desk tray</td><td class=\"num\">$12.00</td></tr>" +
      "<tr><td></td><td><strong>Total</strong></td><td class=\"num\"><strong>$54.50</strong></td></tr>" +
      "</tbody></table>" +
      "<p>Date received: <input class=\"sd-field\" id=\"field-date\" data-field=\"date\" type=\"text\" maxlength=\"24\" placeholder=\"____\" autocomplete=\"off\" disabled></p>" +
      "<p>Amount received: <input class=\"sd-field\" id=\"field-amount\" data-field=\"amount\" type=\"text\" maxlength=\"16\" placeholder=\"$____\" autocomplete=\"off\" disabled></p>" +
      "<p>Please review, sign, and print. Mark the amount. Fill the date. Sign at the bottom.</p>" +
      '<div class="sd-sign-line"><span>Signature</span><div class="sd-sign-rule" id="sign-rule"></div></div>' +
      "<p>Clerk: <input class=\"sd-field\" id=\"field-clerk\" data-field=\"clerk\" type=\"text\" maxlength=\"32\" placeholder=\"name\" autocomplete=\"off\" disabled></p>"
    );
  }

  function invoicePage2() {
    return (
      '<p class="sd-doc-kicker">File copy</p>' +
      "<h2>Invoice 1042 — notes</h2>" +
      "<p>Keep this page with the paid invoice. The envelope copy is page 1.</p>" +
      "<p>Accounts: use the date and amount on page 1. Do not open another suite for a highlight or a name.</p>" +
      "<p>Big buttons. Everyday words. That is the job.</p>"
    );
  }

  function letterPage() {
    return (
      '<p class="sd-doc-kicker">Records · outgoing</p>' +
      "<h2>Letter to sign</h2>" +
      "<p>12 April 2026</p>" +
      "<p>Dear Records Clerk,</p>" +
      "<p>Please find invoice 1042 enclosed. Review the amount. Sign if the desk order matches the packing slip. Print two copies.</p>" +
      "<p>Date: <input class=\"sd-field\" id=\"field-date\" data-field=\"date\" type=\"text\" maxlength=\"24\" placeholder=\"____\" disabled></p>" +
      '<div class="sd-sign-line"><span>Signature</span><div class="sd-sign-rule" id="sign-rule"></div></div>' +
      "<p>Clerk: <input class=\"sd-field\" id=\"field-clerk\" data-field=\"clerk\" type=\"text\" maxlength=\"32\" placeholder=\"name\" disabled></p>"
    );
  }

  function timesheetPage() {
    return (
      '<p class="sd-doc-kicker">Staff office</p>' +
      "<h2>Timesheet — April 2026</h2>" +
      '<table class="sd-table">' +
      "<thead><tr><th>Week</th><th>Hours</th><th>Notes</th></tr></thead>" +
      "<tbody>" +
      "<tr><td>6–10 Apr</td><td>38</td><td>Front desk</td></tr>" +
      "<tr><td>13–17 Apr</td><td>40</td><td>Records scan</td></tr>" +
      "<tr><td>20–24 Apr</td><td>36</td><td>Half day Friday</td></tr>" +
      "</tbody></table>" +
      "<p>Supervisor date: <input class=\"sd-field\" id=\"field-date\" data-field=\"date\" type=\"text\" maxlength=\"24\" placeholder=\"____\" disabled></p>" +
      '<div class="sd-sign-line"><span>Supervisor</span><div class="sd-sign-rule" id="sign-rule"></div></div>'
    );
  }

  function pageHtml() {
    if (state.file === "invoice" && state.page === 2) return invoicePage2();
    if (state.file === "letter") return letterPage();
    if (state.file === "timesheet") return timesheetPage();
    return invoicePage1();
  }

  function canMark() {
    return !(state.file === "invoice" && state.page === 2);
  }

  function renderMarks() {
    var html = "";
    if (!canMark()) {
      marks.innerHTML = "";
      return;
    }
    state.highlights.forEach(function (box) {
      html +=
        '<span class="sd-highlight" style="left:' +
        box.x +
        "%;top:" +
        box.y +
        "%;width:" +
        box.w +
        "%;height:" +
        box.h +
        '%;"></span>';
    });
    if (state.stamp) html += '<span class="sd-stamp">Approved</span>';
    if (state.note) {
      html +=
        '<span class="sd-note" style="left:64%;top:8%;">Check packing slip before you sign.</span>';
    }
    marks.innerHTML = html;
  }

  function applyFields() {
    ["date", "amount", "clerk"].forEach(function (key) {
      var el = document.getElementById("field-" + key);
      if (!el) return;
      el.value = state.fields[key] || "";
      el.disabled = state.tool !== "fill";
    });
    var rule = document.getElementById("sign-rule");
    if (rule) {
      rule.innerHTML = state.signature
        ? '<span class="sd-signature">' + escapeHtml(state.signature) + "</span>"
        : "";
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderPage() {
    var meta = files[state.file];
    page.dataset.file = state.file;
    page.dataset.page = String(state.page);
    pageBody.innerHTML = pageHtml();
    winTitle.textContent = "SophPDF Debloat — " + meta.name;
    statusLeft.textContent = "Ready · " + meta.name;
    statusRight.textContent = "Page " + state.page + " of " + meta.pages + " · web demo";
    document.querySelectorAll("[data-page]").forEach(function (btn) {
      if (!btn.classList.contains("sd-thumb") && btn.tagName !== "BUTTON") return;
      if (btn.classList.contains("sd-thumb")) {
        btn.setAttribute("aria-current", btn.getAttribute("data-page") === String(state.page) ? "true" : "false");
      }
    });
    document.querySelectorAll(".sd-thumb").forEach(function (btn) {
      btn.hidden = Number(btn.getAttribute("data-page")) > meta.pages;
    });
    renderMarks();
    applyFields();
    bindFields();
  }

  function bindFields() {
    pageBody.querySelectorAll(".sd-field").forEach(function (input) {
      input.addEventListener("input", function () {
        state.fields[input.getAttribute("data-field")] = input.value;
      });
    });
  }

  function setTool(tool) {
    state.tool = state.tool === tool ? "select" : tool;
    document.body.classList.toggle("is-annotate", state.tool === "annotate");
    document.body.classList.toggle("is-fill", state.tool === "fill");
    document.body.classList.toggle("is-sign", state.tool === "sign");
    document.querySelectorAll("[data-tool]").forEach(function (btn) {
      var on = btn.getAttribute("data-tool") === state.tool;
      btn.classList.toggle("is-on", on);
      if (btn.hasAttribute("aria-pressed")) btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (state.tool === "annotate") {
      hint.textContent = "Click the page to highlight a line. Click again for a note. Use the toolbar for a stamp.";
    } else if (state.tool === "fill") {
      hint.textContent = "The dashed boxes are form fields. Type the date, amount, and clerk name.";
    } else {
      hint.textContent = "";
    }
    applyFields();
    if (state.tool === "sign") signInput.focus();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-on");
    }, 3200);
  }

  function openDialog(id) {
    closeMenus();
    document.querySelectorAll(".sd-modal").forEach(function (el) {
      el.hidden = el.id !== id;
    });
  }

  function closeDialogs() {
    document.querySelectorAll(".sd-modal").forEach(function (el) {
      el.hidden = true;
    });
  }

  function closeMenus() {
    document.querySelectorAll(".sd-menu").forEach(function (menu) {
      menu.classList.remove("is-open");
      var btn = menu.querySelector(":scope > button");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function openFile(id) {
    state.file = id;
    state.page = 1;
    state.highlights = [];
    state.stamp = false;
    state.note = false;
    state.signature = "";
    state.fields = { date: "", amount: "", clerk: "" };
    closeDialogs();
    renderPage();
    showToast("Opened " + files[id].name);
  }

  function addHighlight(event) {
    if (state.tool !== "annotate" || !canMark()) return;
    if (event.target.closest(".sd-field, .sd-sign-line")) return;
    var rect = page.getBoundingClientRect();
    var x = ((event.clientX - rect.left) / rect.width) * 100;
    var y = ((event.clientY - rect.top) / rect.height) * 100;
    if (state.highlights.length >= 6) state.highlights.shift();
    state.highlights.push({
      x: Math.max(6, Math.min(70, x - 12)),
      y: Math.max(8, Math.min(88, y - 1.2)),
      w: 28,
      h: 3.2
    });
    if (state.highlights.length === 2) state.note = true;
    if (state.highlights.length >= 3) state.stamp = true;
    renderMarks();
    statusLeft.textContent = "Highlight added · " + files[state.file].name;
  }

  function applyShot() {
    var params = new URLSearchParams(window.location.search);
    var shot = params.get("shot");
    if (!shot) return;
    document.body.classList.add("shot");
    if (shot === "twitter" || shot === "twitter-annotate") {
      document.body.classList.add("shot-twitter");
    }
    if (shot === "annotate" || shot === "twitter-annotate") {
      state.file = "invoice";
      state.page = 1;
      state.fields = { date: "14 Apr 2026", amount: "$54.50", clerk: "M. Chen" };
      state.signature = "M. Chen";
      state.highlights = [
        { x: 74, y: 47.6, w: 16, h: 3.5 },
        { x: 7, y: 70.5, w: 78, h: 6.4 }
      ];
      state.stamp = true;
      state.note = true;
      renderPage();
      setTool("annotate");
      return;
    }
    state.file = "invoice";
    state.page = 1;
    renderPage();
  }

  document.querySelectorAll("[data-menu] > button").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      var menu = btn.parentElement;
      var open = !menu.classList.contains("is-open");
      closeMenus();
      menu.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  document.addEventListener("click", function () {
    closeMenus();
  });

  document.querySelectorAll("[data-tool]").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      closeMenus();
      setTool(btn.getAttribute("data-tool"));
    });
  });

  document.querySelectorAll("[data-open-dialog]").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      openDialog(btn.getAttribute("data-open-dialog"));
    });
  });

  document.querySelectorAll("[data-close-dialog]").forEach(function (btn) {
    btn.addEventListener("click", closeDialogs);
  });

  document.querySelectorAll(".sd-modal").forEach(function (modal) {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeDialogs();
    });
  });

  document.querySelectorAll("button[data-file]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openFile(btn.getAttribute("data-file"));
    });
  });

  document.querySelectorAll("button[data-page]").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      closeMenus();
      var next = Number(btn.getAttribute("data-page"));
      if (!next || next > files[state.file].pages) return;
      state.page = next;
      renderPage();
    });
  });

  document.querySelectorAll("[data-action]").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      closeMenus();
      var action = btn.getAttribute("data-action");
      if (action === "print") openDialog("print-dialog");
      if (action === "export") openDialog("export-dialog");
      if (action === "do-print") {
        closeDialogs();
        showToast("Print stub — use the browser dialog for a paper copy.");
        window.setTimeout(function () {
          window.print();
        }, 200);
      }
      if (action === "do-export") {
        closeDialogs();
        showToast("Export stub — in the app this writes a PDF to Documents.");
      }
      if (action === "apply-sign") {
        state.signature = signInput.value.trim() || "M. Chen";
        signInput.value = state.signature;
        renderPage();
        showToast("Signature applied.");
      }
      if (action === "clear-sign") {
        state.signature = "";
        signInput.value = "";
        renderPage();
      }
      if (action === "help") {
        showToast("Open, annotate, fill, sign, print. Marks stay in this browser tab.");
      }
    });
  });

  page.addEventListener("click", addHighlight);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeDialogs();
      closeMenus();
    }
    if (event.target.matches("input, textarea")) return;
    var key = event.key.toLowerCase();
    if (key === "o") openDialog("open-dialog");
    if (key === "p") openDialog("print-dialog");
    if (key === "e") openDialog("export-dialog");
    if (key === "a") setTool("annotate");
    if (key === "f") setTool("fill");
    if (key === "s") setTool("sign");
  });

  renderPage();
  applyShot();
})();
