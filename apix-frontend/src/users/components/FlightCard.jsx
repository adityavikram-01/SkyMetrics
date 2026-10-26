import { ArrowRight, Plane, Bookmark, Briefcase } from "lucide-react";
import { rupees, timeLabel, durationLabel, travellerLabel } from "../offerModel";
import { airlineNames, names } from "../catalogLabels";
export default function FlightCard({
  offer,
  party,
  selected,
  onCompare,
  onDetails,
  onSave,
  saved,
}) {
  return (
    <article className="uw-flight">
      <div className="uw-flight-main">
        <div className="uw-flight-top">
          <span className={`uw-airline uw-${offer.airline}`}>
            {offer.airline === "MULTI" ? <Plane size={20} /> : offer.airline}
          </span>
          <div>
            <strong>{airlineNames[offer.airline] || "Two airlines"}</strong>
            <small>
              {offer.stops ? "Separate tickets" : offer.flight_number} ·{" "}
              <span title={offer.rating == null ? "No published airline certification found" : "Skytrax airline-level expert certification; not a route review median"}>
                {offer.rating == null ? "No published rating" : `Skytrax ${offer.rating}★ · airline`}
              </span>
            </small>
          </div>
          <button
            className={saved ? "uw-icon active" : "uw-icon"}
            onClick={() => onSave(offer)}
            aria-label={saved ? "Remove saved flight" : "Save flight"}
          >
            <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
        <div className="uw-flight-body">
          <div>
            <b>{timeLabel(offer.departure)}</b>
            <small>{offer.route.split("-")[0]}</small>
          </div>
          <div className="uw-flight-line">
            <span>{durationLabel(offer.duration)}</span>
            <i />
            <small>{offer.stops ? `1 stop · ${offer.via}` : "Nonstop"}</small>
          </div>
          <div>
            <b>{timeLabel(offer.arrival)}</b>
            <small>
              {offer.route.split("-")[1]}
              {new Date(offer.arrival).toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata",
              }) !==
              new Date(offer.departure).toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata",
              })
                ? " +1 day"
                : ""}
            </small>
          </div>
          <div className="uw-fare">
            <b>{rupees(offer.total)}</b>
            <small>
              Total fare · {travellerLabel(party)}
            </small>
            <button className="uw-primary" onClick={() => onDetails(offer)}>
              View fares <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
      {offer.stops > 0 && <div className="uw-connection-summary">
        <div><strong>{offer.route.split("-")[0]} → {offer.via} → {offer.route.split("-")[1]}</strong><span>{durationLabel(offer.layover)} layover in {names[offer.via] || offer.via} · Self-transfer</span></div>
        {offer.directSaving > 0 ? <span className="uw-saving">{rupees(offer.directSaving)} below lowest matching nonstop</span> : <span>{offer.directBaseline == null ? "No matching nonstop to compare" : "No saving over lowest matching nonstop"}</span>}
      </div>}
      <footer>
        <span>
          <Briefcase size={14} />
          {offer.policy.checked_bag_kg
            ? `${offer.policy.checked_bag_kg} kg check-in`
            : "Cabin bag only"}
        </span>
        <span>
          {offer.policy.refundable
            ? "Refundable · fee applies"
            : "Restricted cancellation"}
        </span>
        <label>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onCompare(offer)}
          />
          Compare
        </label>
      </footer>
    </article>
  );
}
