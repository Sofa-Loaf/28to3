const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

function walk(dir, acc) {
  acc = acc || [];
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function htmlFiles() {
  return walk(root).filter((file) => file.endsWith(".html"));
}

function metaContent(html, attr, name) {
  const re = new RegExp(
    "<meta\\s+" + attr + '="' + name + '"\\s+content="([^"]*)"',
    "g"
  );
  return Array.from(html.matchAll(re), (match) => match[1]);
}

function directive(policy, name) {
  const part = policy.split(";").map((item) => item.trim()).find((item) => item.startsWith(name + " "));
  assert.ok(part, name + " missing from " + policy);
  return part.slice(name.length).trim().split(/\s+/);
}

test("every HTML page carries referrer, CSP, and Permissions-Policy", () => {
  const files = htmlFiles();
  assert.ok(files.length >= 30);
  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    const referrer = metaContent(html, "name", "referrer");
    const policies = metaContent(html, "http-equiv", "Content-Security-Policy");
    const permissions = metaContent(html, "http-equiv", "Permissions-Policy");
    assert.deepEqual(referrer, ["strict-origin-when-cross-origin"], rel);
    assert.equal(policies.length, 1, rel);
    assert.equal(permissions.length, 1, rel);

    const script = directive(policies[0], "script-src");
    assert.ok(script.includes("'self'"), rel);
    assert.equal(script.includes("'unsafe-inline'"), false, rel);
    assert.ok(directive(policies[0], "style-src").includes("https://fonts.googleapis.com"), rel);
    assert.ok(directive(policies[0], "font-src").includes("https://fonts.gstatic.com"), rel);
    assert.equal(directive(policies[0], "object-src").join(" "), "'none'", rel);
    assert.equal(directive(policies[0], "frame-src").join(" "), "'none'", rel);
    assert.ok(directive(policies[0], "form-action").includes("mailto:"), rel);
    assert.equal(policies[0].includes("buy.stripe.com"), false, rel);
    assert.equal(policies[0].includes("https://github.com"), false, rel);
    assert.equal(html.includes("<script>"), false, rel);
    assert.equal(html.includes("sofa-loaf.github.io"), false, rel);
  }
});

test("CSP exceptions stay on the pages that need them", () => {
  const heic = fs.readFileSync(path.join(root, "apps/heic-save-as.html"), "utf8");
  const desk = fs.readFileSync(path.join(root, "apps/desk-lab.html"), "utf8");
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const heicPolicy = metaContent(heic, "http-equiv", "Content-Security-Policy")[0];
  const deskPolicy = metaContent(desk, "http-equiv", "Content-Security-Policy")[0];
  const homePolicy = metaContent(home, "http-equiv", "Content-Security-Policy")[0];

  assert.ok(directive(heicPolicy, "script-src").includes("'unsafe-eval'"));
  assert.ok(directive(heicPolicy, "script-src").includes("https://cdn.jsdelivr.net"));
  assert.ok(directive(heicPolicy, "worker-src").includes("blob:"));
  assert.equal(directive(homePolicy, "script-src").includes("'unsafe-eval'"), false);
  assert.equal(directive(homePolicy, "script-src").includes("https://cdn.jsdelivr.net"), false);
  assert.equal(directive(deskPolicy, "script-src").includes("'unsafe-eval'"), false);
  assert.ok(directive(deskPolicy, "script-src").includes("https://cdn.jsdelivr.net"));
  assert.ok(directive(deskPolicy, "img-src").includes("https://raw.githubusercontent.com"));
});

test("camera, microphone, and geolocation stay closed except where an app uses them", () => {
  const home = metaContent(fs.readFileSync(path.join(root, "index.html"), "utf8"), "http-equiv", "Permissions-Policy")[0];
  const afterglow = metaContent(fs.readFileSync(path.join(root, "apps/afterglow.html"), "utf8"), "http-equiv", "Permissions-Policy")[0];
  const demo = metaContent(fs.readFileSync(path.join(root, "apps/afterglow-demo.html"), "utf8"), "http-equiv", "Permissions-Policy")[0];
  const sitedoc = metaContent(fs.readFileSync(path.join(root, "apps/sitedoc.html"), "utf8"), "http-equiv", "Permissions-Policy")[0];

  for (const policy of [home, afterglow]) {
    assert.match(policy, /camera=\(\)/);
    assert.match(policy, /microphone=\(\)/);
    assert.match(policy, /geolocation=\(\)/);
  }
  assert.match(demo, /camera=\(\)/);
  assert.match(demo, /microphone=\(self\)/);
  assert.match(demo, /geolocation=\(self\)/);
  assert.match(sitedoc, /camera=\(self\)/);
  assert.match(sitedoc, /microphone=\(\)/);
  assert.match(sitedoc, /geolocation=\(self\)/);
});

test("public URLs use the 28to3.me host", () => {
  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
  assert.equal(sitemap.includes("github.io"), false);
  assert.equal(robots.includes("github.io"), false);
  assert.match(sitemap, /<loc>https:\/\/28to3\.me\/<\/loc>/);
  assert.match(robots, /Sitemap: https:\/\/28to3\.me\/sitemap\.xml/);
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(home, /rel="canonical" href="https:\/\/28to3\.me\/"/);
  assert.match(home, /property="og:url" content="https:\/\/28to3\.me\/"/);
});

test("first-party scripts do not call eval or document.write", () => {
  const files = walk(path.join(root, "apps")).filter((file) => file.endsWith(".js"));
  files.push(path.join(root, "site.js"));
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    assert.equal(/\beval\s*\(/.test(text), false, rel);
    assert.equal(/document\.write\s*\(/.test(text), false, rel);
    assert.equal(/\bnew\s+Function\s*\(/.test(text), false, rel);
  }
});

test("untrusted HTML sinks escape before innerHTML", () => {
  const billshot = fs.readFileSync(path.join(root, "apps/billshot-page.js"), "utf8");
  const heic = fs.readFileSync(path.join(root, "apps/heic-save-as.js"), "utf8");
  const soph = fs.readFileSync(path.join(root, "apps/sophpdf-demo.js"), "utf8");
  assert.match(billshot, /escapeHtml\(row\.label\)/);
  assert.match(heic, /escapeHtml\(item\.file\.name\)/);
  assert.match(heic, /escapeHtml\(item\.previewUrl\)/);
  assert.match(heic, /escapeHtml\(meta\)/);
  assert.match(soph, /escapeHtml\(state\.signature\)/);
});
