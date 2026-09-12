(function () {
  var form = document.getElementById("heic-form");
  var fileInput = document.getElementById("heic-files");
  var drop = document.getElementById("heic-drop");
  var dropCopy = document.getElementById("heic-drop-copy");
  var convertBtn = document.getElementById("convert-btn");
  var downloadAllBtn = document.getElementById("download-all");
  var clearBtn = document.getElementById("clear-files");
  var statusEl = document.getElementById("heic-status");
  var listEl = document.getElementById("heic-list");
  var resultsTitle = document.getElementById("results-title");
  var resultsSub = document.getElementById("results-sub");
  var qualityInput = document.getElementById("quality");
  var qualityRead = document.getElementById("quality-read");
  var qualityField = document.getElementById("quality-field");

  var items = [];
  var busy = false;

  function formatOf() {
    var checked = form.querySelector("input[name=format]:checked");
    return checked && checked.value === "png" ? "png" : "jpeg";
  }

  function mimeOf(format) {
    return format === "png" ? "image/png" : "image/jpeg";
  }

  function extOf(format) {
    return format === "png" ? "png" : "jpg";
  }

  function qualityOf() {
    var value = parseInt(qualityInput.value, 10);
    if (isNaN(value)) return 0.92;
    return Math.min(1, Math.max(0.5, value / 100));
  }

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle("is-error", !!isError);
  }

  function bytesLabel(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function looksHeic(file) {
    var name = (file.name || "").toLowerCase();
    var type = (file.type || "").toLowerCase();
    return (
      /\.(heic|heif|heics)$/.test(name) ||
      type.indexOf("heic") !== -1 ||
      type.indexOf("heif") !== -1
    );
  }

  function alreadyRaster(file) {
    var name = (file.name || "").toLowerCase();
    var type = (file.type || "").toLowerCase();
    return (
      type.indexOf("image/jpeg") === 0 ||
      type.indexOf("image/png") === 0 ||
      type.indexOf("image/webp") === 0 ||
      type.indexOf("image/gif") === 0 ||
      /\.(jpe?g|png|webp|gif)$/.test(name)
    );
  }

  function baseName(filename) {
    return String(filename || "photo").replace(/\.[^.]+$/, "") || "photo";
  }

  function revokeItem(item) {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    item.previewUrl = "";
    item.outputs = [];
  }

  function syncQualityUi() {
    var format = formatOf();
    qualityRead.textContent = qualityInput.value + "%";
    qualityField.classList.toggle("quality-hidden", format === "png");
    qualityInput.disabled = format === "png";
  }

  function render() {
    var ready = items.filter(function (item) { return item.outputs.length; });
    convertBtn.disabled = !items.length || busy;
    downloadAllBtn.disabled = !ready.length || busy;

    if (!items.length) {
      resultsTitle.textContent = "No photos yet";
      resultsSub.textContent = "Converted files show a preview and a Save as button.";
      listEl.innerHTML = "";
      return;
    }

    resultsTitle.textContent = ready.length
      ? ready.length + " ready"
      : items.length + (items.length === 1 ? " photo" : " photos");
    resultsSub.textContent = ready.length
      ? "Save as uses the system picker when the browser has one. Download is the fallback."
      : "Convert when the format looks right. JPG quality is optional.";

    listEl.innerHTML = items.map(function (item, index) {
      var thumb = item.previewUrl
        ? "<img class=\"heic-thumb\" alt=\"\" src=\"" + item.previewUrl + "\">"
        : "<div class=\"heic-thumb is-empty\">" + (item.error ? "Couldn’t convert" : "Waiting") + "</div>";
      var meta = item.error
        ? item.error
        : item.outputs.length
          ? item.outputs.map(function (out) { return out.name + " · " + bytesLabel(out.blob.size); }).join(" · ")
          : bytesLabel(item.file.size) + " · " + (item.file.type || "HEIC");
      var actions = item.outputs.map(function (out, outIndex) {
        return "<button class=\"button button-primary\" type=\"button\" data-save=\"" + index + "\" data-out=\"" + outIndex + "\">Save as</button>" +
          "<button class=\"button button-ghost\" type=\"button\" data-download=\"" + index + "\" data-out=\"" + outIndex + "\">Download</button>";
      }).join("");
      return "<li class=\"heic-item\" data-index=\"" + index + "\">" +
        thumb +
        "<div><h3>" + escapeHtml(item.file.name) + "</h3><p>" + escapeHtml(meta) + "</p>" +
        "<div class=\"heic-item-actions\">" + actions + "</div></div></li>";
    }).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch];
    });
  }

  function addFiles(fileList) {
    var incoming = Array.prototype.slice.call(fileList || []);
    if (!incoming.length) return;

    var added = 0;
    incoming.forEach(function (file) {
      if (alreadyRaster(file) && !looksHeic(file)) {
        setStatus(file.name + " is already a JPG/PNG. This page converts HEIC photos.", true);
        return;
      }
      items.push({
        file: file,
        outputs: [],
        previewUrl: "",
        error: ""
      });
      added += 1;
    });

    if (!added) {
      render();
      return;
    }

    dropCopy.textContent = items.length === 1
      ? items[0].file.name
      : items.length + " photos ready.";
    setStatus(items.length === 1 ? "One photo ready. Convert when you want." : items.length + " photos ready. Convert when you want.");
    render();
  }

  function blobsFrom(result) {
    if (!result) return [];
    return Array.isArray(result) ? result : [result];
  }

  function convertOne(item, format) {
    if (typeof heic2any !== "function") {
      return Promise.reject(new Error("heic2any did not load. Check the CDN and try again."));
    }

    return heic2any({
      blob: item.file,
      toType: mimeOf(format),
      quality: qualityOf()
    }).then(function (result) {
      var blobs = blobsFrom(result).filter(Boolean);
      if (!blobs.length) throw new Error("No image came back from the converter.");
      var stem = baseName(item.file.name);
      item.outputs = blobs.map(function (blob, index) {
        var suffix = blobs.length > 1 ? "-" + (index + 1) : "";
        return {
          blob: blob,
          name: stem + suffix + "." + extOf(format)
        };
      });
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      item.previewUrl = URL.createObjectURL(item.outputs[0].blob);
      item.error = "";
    }).catch(function (err) {
      item.outputs = [];
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      item.previewUrl = "";
      item.error = (err && err.message) ? err.message : "Could not convert this file.";
      throw err;
    });
  }

  function convertAll() {
    if (busy || !items.length) return Promise.resolve();
    if (typeof heic2any !== "function") {
      setStatus("The converter script did not load. Refresh, or allow cdn.jsdelivr.net.", true);
      return Promise.resolve();
    }

    busy = true;
    var format = formatOf();
    var failed = 0;
    convertBtn.disabled = true;
    downloadAllBtn.disabled = true;

    function next(index) {
      if (index >= items.length) {
        busy = false;
        var ready = items.filter(function (item) { return item.outputs.length; }).length;
        if (!ready) {
          setStatus("Nothing converted. These files may not be HEIC, or this browser blocked the converter.", true);
        } else if (failed) {
          setStatus("Converted " + ready + ". " + failed + " could not be read.", true);
        } else {
          setStatus("Converted " + ready + (ready === 1 ? " photo." : " photos.") + " Save as or download.");
        }
        render();
        return Promise.resolve();
      }

      setStatus("Converting " + (index + 1) + " of " + items.length + "…");
      return convertOne(items[index], format).catch(function () {
        failed += 1;
      }).then(function () {
        render();
        return next(index + 1);
      });
    }

    return next(0);
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1500);
  }

  function saveBlob(blob, filename) {
    if (!window.showSaveFilePicker) {
      downloadBlob(blob, filename);
      return Promise.resolve();
    }

    var format = filename.toLowerCase().slice(-3) === "png" ? "png" : "jpeg";
    return window.showSaveFilePicker({
      suggestedName: filename,
      types: [{
        description: format === "png" ? "PNG image" : "JPEG image",
        accept: format === "png" ? { "image/png": [".png"] } : { "image/jpeg": [".jpg", ".jpeg"] }
      }]
    }).then(function (handle) {
      return handle.createWritable().then(function (writable) {
        return writable.write(blob).then(function () {
          return writable.close();
        });
      });
    }).catch(function (err) {
      if (err && err.name === "AbortError") return;
      downloadBlob(blob, filename);
    });
  }

  function outputFromButton(button, attr) {
    var itemIndex = parseInt(button.getAttribute(attr), 10);
    var outIndex = parseInt(button.getAttribute("data-out"), 10);
    var item = items[itemIndex];
    if (!item || !item.outputs[outIndex]) return null;
    return item.outputs[outIndex];
  }

  function downloadEveryReady() {
    var queue = [];
    items.forEach(function (item) {
      item.outputs.forEach(function (out) {
        queue.push(out);
      });
    });
    if (!queue.length) return;

    queue.forEach(function (out, index) {
      window.setTimeout(function () {
        downloadBlob(out.blob, out.name);
      }, index * 350);
    });
    setStatus("Started " + queue.length + (queue.length === 1 ? " download." : " downloads."));
  }

  function clearAll() {
    items.forEach(revokeItem);
    items = [];
    fileInput.value = "";
    dropCopy.textContent = "Or choose files. One photo or a batch. They never leave this browser.";
    setStatus("Drop a HEIC to start.");
    render();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    convertAll();
  });

  convertBtn.addEventListener("click", convertAll);
  downloadAllBtn.addEventListener("click", downloadEveryReady);
  clearBtn.addEventListener("click", clearAll);

  fileInput.addEventListener("change", function () {
    addFiles(fileInput.files);
  });

  form.addEventListener("change", function (event) {
    if (event.target && event.target.name === "format") {
      syncQualityUi();
    }
  });

  qualityInput.addEventListener("input", syncQualityUi);

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
    if (event.dataTransfer && event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  });

  listEl.addEventListener("click", function (event) {
    var saveBtn = event.target.closest("[data-save]");
    var downloadBtn = event.target.closest("[data-download]");
    var out;
    if (saveBtn) {
      out = outputFromButton(saveBtn, "data-save");
      if (out) saveBlob(out.blob, out.name);
      return;
    }
    if (downloadBtn) {
      out = outputFromButton(downloadBtn, "data-download");
      if (out) downloadBlob(out.blob, out.name);
    }
  });

  if (typeof heic2any !== "function") {
    setStatus("Waiting for heic2any from the CDN…", true);
    window.addEventListener("load", function () {
      if (typeof heic2any !== "function") {
        setStatus("heic2any did not load. Allow cdn.jsdelivr.net and refresh.", true);
      } else {
        setStatus("Drop a HEIC to start.");
      }
    });
  }

  syncQualityUi();
  render();
})();
