import Modal from "./Modal";
import { Bookmark, Check } from "lucide-react";
import { airlineNames, names } from "../catalogLabels";
import { rupees, dayLabel, timeLabel, durationLabel } from "../offerModel";
export default function FareDetailsDialog({
  setDetail,
  detail,
  date,
  bundle,
  setBundle,
  save,
}) {
  return (
    <Modal title="Fare details" onClose={() => setDetail(null)}>
      <div className="uw-detail">
        <p>
          {detail.route.replace("-", " → ")} · {dayLabel(date)} ·{" "}
          {durationLabel(detail.duration)}
        </p>
        {detail.stops ? (
          <>
            <div className="uw-transfer-note">
              Separate tickets · {durationLabel(detail.layover)} in {detail.via}
              . Transfer protection is not included.
            </div>
            {detail.legs.map((l) => (
              <div className="uw-leg-detail" key={l.id}>
                <strong>{airlineNames[l.airline]}</strong> ·{" "}
                {l.route.replace("-", " → ")} · {timeLabel(l.departure)} –{" "}
                {timeLabel(l.arrival)}
                <small>{durationLabel(l.duration)} · {rupees(l.total)} · {l.policy.checked_bag_kg} kg checked baggage</small>
                <small>Change fee {rupees(l.policy.change_fee_paise)} + fare difference · Cancellation fee {rupees(l.policy.cancel_fee_paise)} per person, capped at eligible fare</small>
              </div>
            ))}
            <h3>{rupees(detail.total)} total</h3>
          </>
        ) : (
          <>
            <div className="uw-packages">
              {detail.packages.map((p, i) => (
                <button
                  className={bundle === i ? "selected" : ""}
                  key={p.id}
                  onClick={() => setBundle(i)}
                >
                  <strong>{p.code.replace("_", " ")}</strong>
                  <b>{rupees(p.total)}</b>
                  <span>{p.checked_bag_kg} kg checked bag</span>
                  <span>
                    {p.meal_included ? "Meal included" : "Meal optional"}
                  </span>
                  <span>
                    {p.seat_selection_included
                      ? "Seat selection included"
                      : "Seat selection may cost extra"}
                  </span>
                  {bundle === i && <Check size={16} />}
                </button>
              ))}
            </div>
            <dl className="uw-fare-rules">
              <dt>Change fee, per person</dt>
              <dd>
                {rupees(detail.packages[bundle].change_fee_paise)} + any fare
                difference
              </dd>
              <dt>Cancellation fee, per person</dt>
              <dd>
                {rupees(detail.packages[bundle].cancel_fee_paise)} · capped at
                eligible fare
              </dd>
              <dt>Cabin baggage</dt>
              <dd>{detail.packages[bundle].cabin_bag_kg} kg</dd>
              <dt>Seats available in this cabin</dt>
              <dd>{detail.seats} simulated seats</dd>
            </dl>
          </>
        )}
        {!detail.stops && detail.publicReferences?.length > 0 && (
          <details>
            <summary>Published airline information</summary>
            <p>Airline-level references, checked 13 Oct 2026. Aircraft assignment and available seats for this simulated flight are not verified.</p>
            {detail.publicReferences.map((r, i) => {
              const fact = typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload;
              return <p key={i}>
                {r.kind === "CERTIFICATION"
                  ? `${fact.provider}: ${fact.value}/${fact.scale} expert certification · not a passenger-review median`
                  : `${fact.aircraft}: ${fact.total_seats} total seats · published layout`}
                {" · "}<a href={r.source_url} target="_blank" rel="noopener noreferrer">Source</a>
              </p>;
            })}
          </details>
        )}
        <p className="uw-note">
          All fares, availability and package rules here are simulated. Airline
          booking hand-off will be added when a real offer source is connected.
        </p>
        <button
          className="uw-primary"
          onClick={() =>
            save(
              detail.stops
                ? detail
                : {
                    ...detail,
                    total: detail.packages[bundle].total,
                    policy: detail.packages[bundle],
                  },
            )
          }
        >
          <Bookmark size={16} />
          Save this option
        </button>
      </div>
    </Modal>
  );
}
