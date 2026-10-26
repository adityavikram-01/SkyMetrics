import Modal from "./Modal";
import { rupees } from "../offerModel";

export default function FlightFilters({
  data,
  filters,
  setFilters,
  initialFilters,
  update,
  mobileFilters,
  onClose,
}) {
  const content = (
    <aside className={`uw-filters ${mobileFilters ? "is-open" : ""}`}>
      <div className="uw-filter-title">
        <h3>Filters</h3>
        <button onClick={() => setFilters(initialFilters)}>Reset</button>
      </div>
      <fieldset>
        <legend>Stops</legend>
        {[
          ["direct", "Nonstop"],
          ["any", "All options"],
          ["one", "1 stop · self-transfer"],
        ].map(([value, label]) => (
          <label className="uw-filter-choice" key={value}>
            <input
              type="radio"
              name="stops"
              checked={filters.stops === value}
              onChange={() => update("stops", value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Airlines</legend>
        <label className="uw-filter-choice">
          <input
            type="radio"
            name="airline"
            checked={!filters.airline.length}
            onChange={() => update("airline", [])}
          />
          All airlines
        </label>
        {data.airlines.map((a) => (
          <label className="uw-filter-choice" key={a.code}>
            <input
              type="checkbox"
              name="airline"
              checked={filters.airline.includes(a.code)}
              onChange={() => update("airline", filters.airline.includes(a.code) ? filters.airline.filter(code => code !== a.code) : [...filters.airline, a.code])}
            />
            {a.name}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Departure time</legend>
        <div className="uw-time-options">
          {[
            ["night", "00–06", "Night"],
            ["morning", "06–12", "Morning"],
            ["afternoon", "12–18", "Afternoon"],
            ["evening", "18–24", "Evening"],
          ].map(([value, hours, label]) => (
            <button
              key={value}
              aria-pressed={filters.band === value}
              onClick={() =>
                update("band", filters.band === value ? "" : value)
              }
            >
              <strong>{label}</strong>
              <small>{hours}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Maximum price <strong>{rupees(filters.budget * 100)}</strong>
        <input
          type="range"
          min="3000"
          max="300000"
          step="1000"
          value={filters.budget}
          onChange={(e) => update("budget", Number(e.target.value))}
        />
      </label>
      <label>
        Maximum duration <strong>{filters.duration} hours</strong>
        <input
          type="range"
          min="2"
          max="12"
          step="1"
          value={filters.duration}
          onChange={(e) => update("duration", Number(e.target.value))}
        />
      </label>
      {[
        ["bag", "15 kg+ check-in bag"],
        ["refund", "Refundable fares"],

      ].map(([key, label]) => (
        <label className="uw-check" key={key}>
          <input
            type="checkbox"
            checked={filters[key]}
            onChange={(e) => update(key, e.target.checked)}
          />
          {label}
        </label>
      ))}
      <label>Minimum Skytrax airline certification
        <select value={filters.rating} onChange={e => update("rating", Number(e.target.value))}>
          <option value="0">Any rating</option><option value="3">3 stars and above</option><option value="4">4 stars and above</option><option value="5">5 stars</option>
        </select>
      </label>
      <small className="uw-note">
        Skytrax certifies airline service quality; it is not a passenger-review median. Unrated airlines remain visible unless filtered. Fare rules are simulated. Refund and change fees can still
        apply.
      </small>
      {mobileFilters && (
        <button className="uw-primary" onClick={onClose}>
          Show results
        </button>
      )}
    </aside>
  );
  return mobileFilters ? (
    <Modal title="Filter flights" onClose={onClose}>
      {content}
    </Modal>
  ) : (
    content
  );
}
