import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  validParty,
  quoteFlight,
  buildOffers,
  savedOfferKey,
} from "./offerModel.js";
const data = JSON.parse(
  readFileSync(new URL("./preview.json", import.meta.url)),
);
const party = { adults: 1, children: 0, infants: 0 };
const filters = {
  stops: "direct",
  airline: "",
  band: "",
  budget: 300000,
  duration: 12,
  bag: false,
  refund: false,
  rating: false,
};
const f = data.flights.find(
  (f) => f.seats > 8 && data.services[f.service].route === "BOM-DEL",
);
test("traveller constraints reject fractional, negative and unaccompanied passengers", () => {
  for (const p of [
    { adults: 0, children: 1, infants: 0 },
    { ...party, children: -1 },
    { ...party, adults: 1.5 },
    { ...party, infants: 2 },
    { ...party, children: 9 },
  ])
    assert.equal(validParty(p), false);
  assert.equal(validParty({ adults: 2, children: 3, infants: 2 }), true);
});
test("group totals use the selected cabin and passenger policy, including fees", () => {
  const group = { adults: 2, children: 1, infants: 1 },
    q = quoteFlight(f, data, group, "ECONOMY"),
    p = q.policy,
    c = data.services[f.service].cabins.find((c) => c.cabin === "ECONOMY");
  const base = Math.round((f.base * c.price_multiplier_bp) / 10000),
    common = f.tax + f.fee + p.surcharge_paise;
  assert.equal(
    q.total,
    2 * (Math.round((base * p.adult_multiplier_bp) / 10000) + common) +
      Math.round((base * p.child_multiplier_bp) / 10000) +
      common +
      p.infant_fee_paise,
  );
  assert.equal(quoteFlight({ ...f, seats: 0 }, data, party, "ECONOMY"), null);
  assert.equal(quoteFlight(f, data, party, "FIRST"), null);
});
test("each package has a distinct saved identity", () => {
  const q = quoteFlight(f, data, party, "ECONOMY");
  assert.ok(q.packages.length > 1);
  assert.notEqual(
    savedOfferKey(q, f.date, "ECONOMY", party),
    savedOfferKey({ ...q, policy: q.packages[1] }, f.date, "ECONOMY", party),
  );
});
test("filters constrain actual offers and preserve honest empty results", () => {
  const offers = buildOffers(data, "BOM-DEL", f.date, party, "ECONOMY", {
    ...filters,
    bag: true,
    refund: true,
  });
  assert.ok(offers.length);
  assert.ok(
    offers.every(
      (o) =>
        o.policy.checked_bag_kg >= 15 && o.policy.refundable && o.stops === 0,
    ),
  );
  assert.equal(
    buildOffers(data, "BOM-DEL", f.date, party, "ECONOMY", {
      ...filters,
      budget: 1,
    }).length,
    0,
  );
});
test("connections preserve leg totals, airports and transfer time", () => {
  const offers = buildOffers(data, "BOM-DEL", f.date, party, "ECONOMY", {
    ...filters,
    stops: "one",
  });
  assert.ok(offers.length);
  for (const o of offers) {
    const [a, b] = o.legs;
    assert.equal(o.total, a.total + b.total);
    assert.equal(a.route.split("-")[1], b.route.split("-")[0]);
    assert.ok(o.layover >= (["DEL", "BOM"].includes(o.via) ? 180 : 120));
    assert.ok(o.layover <= 360 && o.duration <= 720);
  }
});
test('multiple selected airlines and minimum score apply to every connection leg', () => {
  const options = buildOffers(data, 'BOM-DEL', f.date, party, 'ECONOMY', {...filters, stops:'any', airline:['6E','AI'], rating:3.5});
  assert.ok(options.length);
  for (const o of options) {
    assert.ok(o.rating >= 3.5);
    assert.ok(o.legs.every(l => ['6E','AI'].includes(data.services[l.service]?.airline || l.airline)));
  }
});
test('self-transfer saving uses the lowest matching direct group fare', () => {
  const selection = {...filters, airline:['6E','AI'], rating:3.5};
  const direct = buildOffers(data,'BOM-DEL',f.date,party,'ECONOMY',selection);
  const connections = buildOffers(data,'BOM-DEL',f.date,party,'ECONOMY',{...selection,stops:'one'});
  assert.ok(direct.length && connections.length);
  const baseline = Math.min(...direct.map(o => o.total));
  for (const o of connections) {
    assert.equal(o.directBaseline,baseline);
    assert.equal(o.directSaving,baseline-o.total);
  }
});
