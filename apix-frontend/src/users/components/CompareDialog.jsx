import Modal from "./Modal";

import { airlineNames } from "../catalogLabels";
import { rupees, timeLabel, durationLabel } from "../offerModel";
export default function CompareDialog({ setModal, compared, openDetails }) {
  return (
    <Modal title="Compare flights" onClose={() => setModal(null)}>
      <div className="uw-compare-grid">
        {compared.map((o) => (
          <article key={o.id}>
            <span className="uw-kicker">
              {airlineNames[o.airline] || "Two airlines"}
            </span>
            <h3>{rupees(o.total)}</h3>
            <p>
              {timeLabel(o.departure)} – {timeLabel(o.arrival)}
            </p>
            <dl>
              <dt>Journey</dt>
              <dd>
                {durationLabel(o.duration)} · {o.stops ? "1 stop" : "Nonstop"}
              </dd>
              <dt>Checked baggage</dt>
              <dd>{o.policy.checked_bag_kg} kg</dd>
              <dt>Cancellation</dt>
              <dd>
                {o.policy.refundable ? "Refundable; fee applies" : "Restricted"}
              </dd>
              <dt>Tickets</dt>
              <dd>{o.stops ? "Separate · self-transfer" : "Single flight"}</dd>
            </dl>
            <button
              className="uw-primary"
              onClick={() => {
                setModal(null);
                openDetails(o);
              }}
            >
              Review this option
            </button>
          </article>
        ))}
      </div>
    </Modal>
  );
}
