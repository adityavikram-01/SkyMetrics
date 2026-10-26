export function validParty(party) {
  return (
    ["adults", "children", "infants"].every(
      (k) => Number.isInteger(party[k]) && party[k] >= 0,
    ) &&
    party.adults >= 1 &&
    party.adults + party.children <= 9 &&
    party.infants <= party.adults
  );
}
export function savedOfferKey(offer, date, cabin, party) {
  return [
    offer.id,
    date,
    cabin,
    party.adults,
    party.children,
    party.infants,
    offer.policy.id || offer.policy.code,
  ].join(":");
}
export const rupees = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n / 100);
export const dayLabel = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
export const timeLabel = (d) =>
  new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
export const durationLabel = (minutes) =>
  `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
export function quoteFlight(f, data, party, cabin, filters = {}) {
  if (!validParty(party)) return null;
  const s = data.services[f.service],
    c = s.cabins.find((c) => c.cabin === cabin);
  if (!c) return null;
  const premium = s.cabins
    .filter((c) => c.cabin !== "ECONOMY")
    .reduce((n, c) => n + Math.floor((f.seats * c.capacity) / s.capacity), 0);
  const seats =
    cabin === "ECONOMY"
      ? f.seats - premium
      : Math.floor((f.seats * c.capacity) / s.capacity);
  if (seats < party.adults + party.children) return null;
  const policies = data.policies
    .filter(
      (p) =>
        p.airline === s.airline &&
        p.cabin === cabin &&
        (!filters.bag || p.checked_bag_kg >= 15) &&
        (!filters.refund || p.refundable),
    )
    .sort((a, b) => a.surcharge_paise - b.surcharge_paise);
  if (!policies.length) return null;
  const calculate = (p) => {
    const base = Math.round((f.base * c.price_multiplier_bp) / 10000),
      common = f.tax + f.fee + p.surcharge_paise;
    return (
      party.adults *
        (Math.round((base * p.adult_multiplier_bp) / 10000) + common) +
      party.children *
        (Math.round((base * p.child_multiplier_bp) / 10000) + common) +
      party.infants * p.infant_fee_paise
    );
  };
  return {
    ...f,
    ...s,
    id: f.id,
    service: f.service,
    departure: f.departure,
    arrival: f.arrival,
    seats,
    policies,
    policy: policies[0],
    total: calculate(policies[0]),
    packages: policies.map((p) => ({ ...p, total: calculate(p) })),
    rating: data.ratings[s.airline] == null ? null : Number(data.ratings[s.airline]),
    publicReferences: (data.publicReferences || []).filter(r => r.airline === s.airline),
    duration: (new Date(f.arrival) - new Date(f.departure)) / 60000,
    legs: [f],
    stops: 0,
  };
}
export function buildOffers(data, route, date, party, cabin, filters) {
  const [from, to] = route.split("-");
  const quoted = data.flights
    .map((f) => quoteFlight(f, data, party, cabin, filters))
    .filter(Boolean);
  const direct = quoted.filter((f) => f.route === route && f.date === date);
  const connecting = [];
  if (filters.stops !== "direct") {
    const first = quoted.filter(
      (f) =>
        f.route.startsWith(from + "-") &&
        f.date === date &&
        !f.route.endsWith("-" + to),
    );
    const second = quoted.filter(
      (f) => f.route.endsWith("-" + to) && f.date >= date,
    );
    for (const a of first)
      for (const b of second) {
        const via = a.route.split("-")[1];
        if (b.route.split("-")[0] !== via) continue;
        const layover = (new Date(b.departure) - new Date(a.arrival)) / 60000,
          duration = (new Date(b.arrival) - new Date(a.departure)) / 60000;
        if (
          layover < (["DEL", "BOM"].includes(via) ? 180 : 120) ||
          layover > 360 ||
          duration > 720
        )
          continue;
        connecting.push({
          ...a,
          id: `${a.id}:${b.id}`,
          route,
          date,
          arrival: b.arrival,
          total: a.total + b.total,
          duration,
          via,
          layover,
          stops: 1,
          legs: [a, b],
          rating: a.rating == null || b.rating == null ? null : Math.min(a.rating, b.rating),
          seats: Math.min(a.seats, b.seats),
          policy: {
            ...a.policy,
            checked_bag_kg: Math.min(
              a.policy.checked_bag_kg,
              b.policy.checked_bag_kg,
            ),
            refundable: a.policy.refundable && b.policy.refundable,
          },
          airline: a.airline === b.airline ? a.airline : "MULTI",
        });
      }
  }
  let items = [...direct, ...connecting];
  if (filters.stops === "one") items = connecting;
  const matching = items.filter(
    (f) =>
      (!(Array.isArray(filters.airline) ? filters.airline.length : filters.airline) ||
        f.legs.every(
          (l) =>
            (Array.isArray(filters.airline) ? filters.airline : [filters.airline]).includes(data.services[l.service]?.airline || l.airline),
        )) &&
      f.total <= filters.budget * 100 &&
      f.duration <= filters.duration * 60 &&
      (!filters.rating || (f.rating != null && f.rating >= (filters.rating === true ? 4 : Number(filters.rating)))) &&
      (!filters.band ||
        (() => {
          const h = Number(timeLabel(f.departure).split(":")[0]);
          return filters.band === "morning"
            ? h >= 6 && h < 12
            : filters.band === "afternoon"
              ? h >= 12 && h < 18
              : filters.band === "evening"
                ? h >= 18 && h < 24
                : h < 6;
        })()),
  );
  // Baseline respects the same passenger, cabin, baggage, airline and time choices.
  const comparableDirect = filters.stops === "direct" ? matching : buildOffers(data, route, date, party, cabin, {...filters, stops: "direct"});
  const baseline = comparableDirect.length ? Math.min(...comparableDirect.map(o => o.total)) : null;
  return matching.map(o => o.stops ? {...o, directBaseline: baseline, directSaving: baseline === null ? null : baseline - o.total} : o);

}

export const travellerLabel = (party) => [
  party.adults ? `${party.adults} adult${party.adults === 1 ? "" : "s"}` : null,
  party.children ? `${party.children} ${party.children === 1 ? "child" : "children"}` : null,
  party.infants ? `${party.infants} infant${party.infants === 1 ? "" : "s"}` : null,
].filter(Boolean).join(", ");
