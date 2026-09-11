(function () {
  var treeEl = document.getElementById("tree");
  var filesEl = document.getElementById("files");
  var previewEl = document.getElementById("preview");
  var searchEl = document.getElementById("search");
  var pathEl = document.getElementById("path");
  var filesLabel = document.getElementById("files-label");
  var winTitle = document.getElementById("win-title");
  var statusLeft = document.getElementById("status-left");
  var toast = document.getElementById("toast");
  var toastTimer;

  var folders = [
    { id: "desktop", name: "Desktop", path: "This PC \\ Desktop", parent: null },
    { id: "documents", name: "Documents", path: "This PC \\ Documents", parent: null },
    { id: "invoices", name: "Invoices", path: "This PC \\ Documents \\ Invoices", parent: "documents" },
    { id: "letters", name: "Letters", path: "This PC \\ Documents \\ Letters", parent: "documents" },
    { id: "downloads", name: "Downloads", path: "This PC \\ Downloads", parent: null },
    { id: "pictures", name: "Pictures", path: "This PC \\ Pictures", parent: null }
  ];

  var files = [
    { id: "invoice", folder: "documents", name: "invoice.pdf", type: "pdf", kind: "invoice" },
    { id: "budget", folder: "documents", name: "Q3-budget.xlsx", type: "xlsx" },
    { id: "letter", folder: "documents", name: "letter-to-sign.docx", type: "docx" },
    { id: "scan", folder: "documents", name: "scan-0412.pdf", type: "pdf", kind: "scan" },
    { id: "parking", folder: "invoices", name: "parking-pass.pdf", type: "pdf", kind: "pass" },
    { id: "inv-copy", folder: "invoices", name: "invoice-1042.pdf", type: "pdf", kind: "invoice" },
    { id: "offer", folder: "letters", name: "offer-letter.docx", type: "docx" },
    { id: "roster", folder: "desktop", name: "staff-roster.xlsx", type: "xlsx" },
    { id: "notes", folder: "desktop", name: "meeting-notes.docx", type: "docx" },
    { id: "timesheet", folder: "downloads", name: "timesheet-april.pdf", type: "pdf", kind: "timesheet" },
    { id: "photo", folder: "pictures", name: "desk-photo.jpg", type: "jpg" }
  ];

  var state = {
    folder: "documents",
    selected: "invoice",
    query: ""
  };

  function folderById(id) {
    return folders.find(function (folder) {
      return folder.id === id;
    });
  }

  function fileById(id) {
    return files.find(function (file) {
      return file.id === id;
    });
  }

  function visibleFiles() {
    var query = state.query.trim().toLowerCase();
    return files.filter(function (file) {
      var inFolder = !query ? file.folder === state.folder : true;
      var match = !query || file.name.toLowerCase().indexOf(query) !== -1;
      return inFolder && match;
    });
  }

  function invoicePreview(title) {
    return (
      '<article class="sd-paper">' +
      '<p class="sd-doc-kicker">PDF preview on</p>' +
      "<h2>" +
      title +
      "</h2>" +
      '<div class="sd-doc-meta"><div>Bill to: City Hall — Records</div><div>12 April 2026</div></div>' +
      '<table class="sd-table"><thead><tr><th>Item</th><th class="num">Amount</th></tr></thead>' +
      "<tbody><tr><td>Letterhead ream</td><td class=\"num\">$24.00</td></tr>" +
      "<tr><td>Manila folders</td><td class=\"num\">$18.50</td></tr>" +
      "<tr><td>Desk tray</td><td class=\"num\">$12.00</td></tr>" +
      "<tr><td><strong>Total</strong></td><td class=\"num\"><strong>$54.50</strong></td></tr></tbody></table>" +
      "<p>Please review, sign, and print. Open in SophPDF Debloat when you need to mark the page.</p>" +
      "</article>"
    );
  }

  function scanPreview() {
    return (
      '<article class="sd-paper">' +
      '<p class="sd-doc-kicker">Scan · 12 April 2026</p>' +
      "<h2>scan-0412.pdf</h2>" +
      "<p>Front desk scan. Date stamp in the corner. Preview is on — no extra viewer.</p>" +
      "<p>Page is a bit skewed. Open in SophPDF Debloat if you need a highlight or a name on the line.</p>" +
      "</article>"
    );
  }

  function timesheetPreview() {
    return (
      '<article class="sd-paper">' +
      '<p class="sd-doc-kicker">Staff office</p>' +
      "<h2>Timesheet — April</h2>" +
      '<table class="sd-table"><thead><tr><th>Week</th><th>Hours</th></tr></thead>' +
      "<tbody><tr><td>6–10 Apr</td><td>38</td></tr><tr><td>13–17 Apr</td><td>40</td></tr></tbody></table>" +
      "</article>"
    );
  }

  function passPreview() {
    return (
      '<article class="sd-paper">' +
      '<p class="sd-doc-kicker">Building</p>' +
      "<h2>Parking pass</h2>" +
      "<p>Lot B. Expires 30 June 2026. Keep a printed copy on the dash.</p>" +
      "</article>"
    );
  }

  function otherPreview(file) {
    return (
      '<p class="sd-preview-empty">No page preview for ' +
      file.type.toUpperCase() +
      ". Select a PDF — preview stays on by default.</p>"
    );
  }

  function renderPreview(file) {
    if (!file) {
      previewEl.innerHTML = '<p class="sd-preview-empty">Select a file.</p>';
      return;
    }
    if (file.type !== "pdf") {
      previewEl.innerHTML = otherPreview(file);
      return;
    }
    if (file.kind === "scan") previewEl.innerHTML = scanPreview();
    else if (file.kind === "timesheet") previewEl.innerHTML = timesheetPreview();
    else if (file.kind === "pass") previewEl.innerHTML = passPreview();
    else previewEl.innerHTML = invoicePreview(file.name);
  }

  function renderTree() {
    treeEl.innerHTML = folders
      .map(function (folder) {
        var current = folder.id === state.folder ? "true" : "false";
        var extra = folder.parent ? " is-child" : "";
        return (
          "<li><button class=\"sd-tree-btn" +
          extra +
          '" type="button" data-folder="' +
          folder.id +
          '" aria-current="' +
          current +
          '">' +
          folder.name +
          "</button></li>"
        );
      })
      .join("");
  }

  function renderFiles() {
    var list = visibleFiles();
    if (!list.some(function (file) { return file.id === state.selected; })) {
      state.selected = list[0] ? list[0].id : null;
    }
    filesEl.innerHTML = list.length
      ? list
          .map(function (file) {
            var current = file.id === state.selected ? "true" : "false";
            return (
              "<li><button class=\"sd-file\" type=\"button\" data-file=\"" +
              file.id +
              '" aria-current="' +
              current +
              '"><span aria-hidden="true">' +
              (file.type === "pdf" ? "▣" : "▢") +
              "</span><span>" +
              file.name +
              '</span><span class="ext">' +
              file.type +
              "</span></button></li>"
            );
          })
          .join("")
      : "<li class=\"sd-preview-empty\" style=\"padding:0.8rem\">No files match that search.</li>";

    var folder = folderById(state.folder);
    var searching = state.query.trim();
    filesLabel.textContent = searching ? "Search results" : folder.name;
    pathEl.textContent = searching ? "Search in this PC · “" + state.query + "”" : folder.path;
    winTitle.textContent = "Soph Explorer Debloat — " + (searching ? "Search" : folder.name);
    var selected = fileById(state.selected);
    var count = list.length + (list.length === 1 ? " file" : " files");
    statusLeft.textContent = selected && selected.type === "pdf"
      ? "PDF preview on · " + count
      : "Preview · " + count;
    renderPreview(selected);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-on");
    }, 2800);
  }

  function closeMenus() {
    document.querySelectorAll(".sd-menu").forEach(function (menu) {
      menu.classList.remove("is-open");
      var btn = menu.querySelector(":scope > button");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  }

  function selectFolder(id) {
    var folder = folderById(id);
    if (!folder) return;
    state.folder = id;
    state.query = "";
    searchEl.value = "";
    var first = files.find(function (file) {
      return file.folder === id;
    });
    state.selected = first ? first.id : null;
    renderTree();
    renderFiles();
  }

  function selectFile(id) {
    state.selected = id;
    renderFiles();
  }

  function applyShot() {
    var params = new URLSearchParams(window.location.search);
    var shot = params.get("shot");
    if (!shot) return;
    document.body.classList.add("shot");
    if (shot === "twitter" || shot === "twitter-search") {
      document.body.classList.add("shot-twitter");
    }
    if (shot === "search" || shot === "twitter-search") {
      state.folder = "documents";
      state.query = "invoice";
      searchEl.value = "invoice";
      state.selected = "invoice";
      renderTree();
      renderFiles();
      return;
    }
    state.folder = "documents";
    state.selected = "invoice";
    renderTree();
    renderFiles();
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

  document.addEventListener("click", closeMenus);

  treeEl.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-folder]");
    if (!btn) return;
    selectFolder(btn.getAttribute("data-folder"));
  });

  filesEl.addEventListener("click", function (event) {
    var btn = event.target.closest("[data-file]");
    if (!btn) return;
    selectFile(btn.getAttribute("data-file"));
  });

  document.querySelectorAll("[data-folder]").forEach(function (btn) {
    if (btn.closest("#tree")) return;
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      closeMenus();
      selectFolder(btn.getAttribute("data-folder"));
    });
  });

  document.querySelectorAll("[data-action]").forEach(function (btn) {
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      closeMenus();
      var action = btn.getAttribute("data-action");
      if (action === "focus-search") searchEl.focus();
      if (action === "up") {
        var folder = folderById(state.folder);
        selectFolder(folder && folder.parent ? folder.parent : "documents");
      }
      if (action === "open-pdf") {
        var file = fileById(state.selected);
        if (file && file.type === "pdf") {
          window.location.href = "sophpdf-demo.html";
        } else {
          showToast("Select a PDF first. Preview stays on for PDFs.");
        }
      }
    });
  });

  searchEl.addEventListener("input", function () {
    state.query = searchEl.value;
    renderFiles();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeMenus();
    if (event.key === "/" && !event.target.matches("input, textarea")) {
      event.preventDefault();
      searchEl.focus();
    }
  });

  renderTree();
  renderFiles();
  applyShot();
})();
