const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const DeskLab = require("../apps/desk-lab.js");

test("four MSP playbooks stay available on a full Dell desk", () => {
  const present = DeskLab.defaultPresent();
  const ids = DeskLab.visiblePlaybooks(present).map((item) => item.id);
  assert.deepEqual(ids, ["dock-power", "no-display", "no-charge", "dead-desk"]);
});

test("picker hides playbooks that need missing gear", () => {
  const present = DeskLab.normalizePresent({
    optiplex: true,
    precision: false,
    wd19: false,
    monitor: true,
    ups: true
  });
  const ids = DeskLab.visiblePlaybooks(present).map((item) => item.id);
  assert.deepEqual(ids, ["no-display", "dead-desk"]);
  assert.equal(DeskLab.playbookIsAvailable(DeskLab.playbookById("no-charge"), present), false);
});

test("dock-power playbook points at WD19 barrel/DC-in on the rear photo", () => {
  const playbook = DeskLab.playbookById("dock-power");
  const present = DeskLab.defaultPresent();
  assert.equal(playbook.port, "wd19-dc");
  assert.match(playbook.coach, /that'?s power on the WD19 — pull that one/i);
  assert.match(playbook.coach, /barrel\/DC-in/i);
  assert.equal(DeskLab.resolvePlaybookPort(playbook, present), "wd19-dc");
  assert.equal(DeskLab.resolvePlaybookFace(playbook, present), "rear");
  const port = DeskLab.DEVICES.wd19.ports.find((item) => item.id === "wd19-dc");
  assert.equal(DeskLab.hasHotspot(port), true);
  assert.equal(port.face, "rear");
});

test("ticket note is short and ticket-shaped", () => {
  const note = DeskLab.ticketNote({
    present: DeskLab.defaultPresent(),
    playbookId: "no-charge",
    deviceId: "wd19",
    portId: "wd19-upstream"
  });
  assert.match(note, /Desk: OptiPlex, Precision, WD19, Monitor, UPS/);
  assert.match(note, /Laptop not charging on dock/);
  assert.match(note, /USB-C upstream/);
});

test("hash round-trips desk + playbook + face", () => {
  const hash = DeskLab.buildHash({
    present: { optiplex: false, precision: true, wd19: true, monitor: true, ups: false },
    playbookId: "dock-power",
    deviceId: "wd19",
    portId: "wd19-dc",
    faceId: "rear"
  });
  const parsed = DeskLab.parseHash("#" + hash);
  assert.deepEqual(parsed.present, {
    optiplex: false,
    precision: true,
    wd19: true,
    monitor: true,
    ups: false
  });
  assert.equal(parsed.playbookId, "dock-power");
  assert.equal(parsed.portId, "wd19-dc");
  assert.equal(parsed.faceId, "rear");
});

test("every device has photo faces and playbook ports have hotspots", () => {
  const root = path.join(__dirname, "..", "apps", "assets", "desk-lab", "panels");
  for (const id of DeskLab.DEVICE_ORDER) {
    const device = DeskLab.DEVICES[id];
    assert.ok(device.faces.length, id + " needs a face");
    for (const face of device.faces) {
      assert.ok(fs.existsSync(path.join(root, path.basename(face.src))), face.src);
    }
  }
  for (const playbook of DeskLab.PLAYBOOKS) {
    const found = DeskLab.DEVICES[playbook.device].ports.find((port) => port.id === playbook.port);
    assert.equal(DeskLab.hasHotspot(found), true, playbook.id + " target port needs a hotspot");
  }
});
