const test = require("node:test");
const assert = require("node:assert/strict");
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

test("dock-power playbook points at WD19 barrel/DC-in", () => {
  const playbook = DeskLab.playbookById("dock-power");
  assert.equal(playbook.port, "wd19-dc");
  assert.match(playbook.coach, /barrel\/DC-in/i);
  assert.equal(DeskLab.resolvePlaybookPort(playbook, DeskLab.defaultPresent()), "wd19-dc");
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

test("hash round-trips desk + playbook", () => {
  const hash = DeskLab.buildHash({
    present: { optiplex: false, precision: true, wd19: true, monitor: true, ups: false },
    playbookId: "dock-power",
    deviceId: "wd19",
    portId: "wd19-dc"
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
});
