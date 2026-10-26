import Modal from "./Modal";

export default function TravellersDialog({
  setModal,
  party,
  changeParty,
  cabin,
  setCabin,
}) {
  return (
    <Modal title="Who’s flying?" onClose={() => setModal(null)}>
      <div className="uw-party">
        {[
          ["adults", "Adults", "12 years and over", 1],
          ["children", "Children", "2–11 years · own seat", 0],
          ["infants", "Infants", "Under 2 · on an adult’s lap", 0],
        ].map(([key, label, note, min]) => (
          <label key={key}>
            <span>
              <strong>{label}</strong>
              <small>{note}</small>
            </span>
            <input
              type="number"
              min={min}
              max={key === "infants" ? party.adults : 9}
              value={party[key]}
              onChange={(e) => changeParty(key, e.target.value)}
            />
          </label>
        ))}
        <label>
          Cabin
          <select value={cabin} onChange={(e) => setCabin(e.target.value)}>
            <option value="ECONOMY">Economy</option>
            <option value="PREMIUM_ECONOMY">Premium economy</option>
            <option value="BUSINESS">Business</option>
          </select>
        </label>
        <p className="uw-note">
          Premium cabins are available on selected simulated Air India services.
          Child and infant prices use demo rules.
        </p>
        <button className="uw-primary" onClick={() => setModal(null)}>
          Apply travellers
        </button>
      </div>
    </Modal>
  );
}
