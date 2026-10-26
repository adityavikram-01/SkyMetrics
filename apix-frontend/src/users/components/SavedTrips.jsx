import { Link } from "react-router";
import { ArrowRight, Bookmark, X } from "lucide-react";
import { rupees, dayLabel } from "../offerModel";
import { airlineNames } from "../catalogLabels";

export default function SavedTrips({
  saved,
  alerts,
  setTab,
  setRoute,
  setDate,
  setParty,
  setCabin,
  persist,
  setSaved,
  setAlerts,
}) {
  return (
    <section className="uw-saved">
      <div className="uw-section-title">
        <div>
          <h2>Your shortlist</h2>
          <p>Your saved flights and price alerts.</p>
        </div>
        <button onClick={() => setTab("flights")}>
          Find another flight <ArrowRight size={16} />
        </button>
      </div>
      {!saved.length ? (
        <div className="uw-empty">
          <Bookmark />
          <h3>Keep the flights you like.</h3>
          <p>Tap the bookmark on a flight to keep it here.</p>
          <button className="uw-primary" onClick={() => setTab("flights")}>
            Explore flights
          </button>
        </div>
      ) : (
        saved.map((s) => (
          <article className="uw-saved-row" key={s.key}>
            <div>
              <strong>{s.route.replace("-", " → ")}</strong>
              <p>
                {dayLabel(s.date)} · {airlineNames[s.airline] || "Two airlines"}{" "}
                · {s.cabin.replace("_", " ")}
              </p>
            </div>
            <b>{rupees(s.total)}</b>
            <button
              onClick={() => {
                setRoute(s.route);
                setDate(s.date);
                setParty(s.party);
                setCabin(s.cabin);
                setTab("flights", { route: s.route, date: s.date });
              }}
            >
              View trip
            </button>
            <button
              aria-label="Remove saved trip"
              onClick={() =>
                persist(
                  "sm-preview-saved",
                  saved.filter((x) => x.key !== s.key),
                  setSaved,
                )
              }
            >
              <X size={17} />
            </button>
          </article>
        ))
      )}
      <h2>Price alerts</h2>
      <p>
        Saved to your account. Matching fares use simulated observations; checked when you open this page. No live or email notifications.
      </p>
      {alerts.map((a, i) => (
        <article className="uw-saved-row" key={a.id}>
          <div>
            <strong>
              {a.route.replace("-", " → ")} · under {rupees(a.target)}
            </strong>
            <p>
              {dayLabel(a.date)}
              {a.flex ? " · flexible by ±7 days" : " · exact date"}
            </p>
          </div>
          <div><span className="uw-tag">{a.matchPrice ? (a.matchPrice <= a.target ? 'Target reached' : 'Above target') : 'No matching fare'}</span>{a.matchPrice && <p>{rupees(a.matchPrice)} · {a.matchDate ? dayLabel(String(a.matchDate).slice(0,10)) : ""} · {airlineNames[a.matchAirline] || ""}<br/><small>Checked {a.checkedOn}</small><br/>{a.matchDate && <Link to={"/users?"+new URLSearchParams({route:a.route,date:String(a.matchDate).slice(0,10)})}>View matching date →</Link>}</p>}</div>
          <button
            onClick={() =>
              persist(
                "sm-preview-alerts",
                alerts.filter((x) => x.id !== a.id),
                setAlerts,
              )
            }
            aria-label="Remove price alert"
          >
            <X size={17} />
          </button>
        </article>
      ))}
    </section>
  );
}
