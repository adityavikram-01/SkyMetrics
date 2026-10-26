import { useEffect, useState } from "react";
import { ArrowLeftRight, Plane, ChevronDown } from "lucide-react";

import { names } from "../catalogLabels";

export default function FlightSearch({
  data,
  from,
  to,
  route,
  setRoute,
  date,
  setDate,
  party,
  cabin,
  setModal,
  destinations,
  onSearch,
}) {
  const [draftRoute, setDraftRoute] = useState(route);
  const [draftDate, setDraftDate] = useState(date);
  useEffect(() => setDraftRoute(route), [route]);
  useEffect(() => setDraftDate(date), [date]);
  const [origin, destination] = draftRoute.split("-");
  const availableDestinations = data.routes
    .filter((r) => r.startsWith(origin + "-"))
    .map((r) => r.split("-")[1]);
  return (
    <form
      className="uw-search"
      aria-label="Search flights"
      onSubmit={(e) => {
        e.preventDefault();
        setRoute(draftRoute);
        setDate(draftDate);
        onSearch({ route: draftRoute, date: draftDate });
      }}
    >
      <div className="uw-search-meta">
        <span>
          <Plane size={16} /> One-way
        </span>
        <span>Domestic India · prices in INR</span>
      </div>
      <div className="uw-search-fields">
        <label>
          From
          <select
            value={origin}
            onChange={(e) =>
              setDraftRoute(
                data.routes.find((r) => r.startsWith(e.target.value + "-")),
              )
            }
          >
            {data.airports.map((a) => (
              <option key={a.code} value={a.code}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="uw-swap"
          aria-label="Swap airports"
          disabled={!data.routes.includes(`${destination}-${origin}`)}
          onClick={() => setDraftRoute(`${destination}-${origin}`)}
        >
          <ArrowLeftRight size={19} />
        </button>
        <label>
          To
          <select
            value={destination}
            onChange={(e) => setDraftRoute(`${origin}-${e.target.value}`)}
          >
            {availableDestinations.map((a) => (
              <option key={a} value={a}>
                {names[a]} ({a})
              </option>
            ))}
          </select>
        </label>
        <label>
          Travel date
          <input
            type="date"
            min={data.start}
            max={data.end}
            value={draftDate}
            onChange={(e) => {
              if (e.target.value >= data.start && e.target.value <= data.end)
                setDraftDate(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          className="uw-travellers"
          onClick={() => setModal("travellers")}
        >
          <small>Travellers & cabin</small>
          <strong>
            {party.adults + party.children + party.infants} traveller
            {party.adults + party.children + party.infants > 1
              ? "s"
              : ""} ·{" "}
            {cabin === "ECONOMY"
              ? "Economy"
              : cabin === "BUSINESS"
                ? "Business"
                : "Premium"}
          </strong>
          <ChevronDown size={15} />
        </button>
        <button type="submit" className="uw-search-submit">
          Search flights
        </button>
      </div>
    </form>
  );
}
