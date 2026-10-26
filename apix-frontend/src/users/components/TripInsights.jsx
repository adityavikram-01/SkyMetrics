import { ArrowRight } from "lucide-react";
import { rupees, dayLabel } from "../offerModel";

export default function TripInsights({
  history,
  route,
  bestWindow,
  date,
  lowDate,
  setDate,
  setTab,
}) {
  if (!history.length) return <section className="uw-empty"><h2>Not enough history for this route</h2><p>Choose another route to compare booking times.</p></section>;
  return (
    <section className="uw-insights">
      <div className="uw-insight-lead">
        <span className="uw-kicker">BOOKING TIME</span>
        <h2>
          When were fares lowest?
        </h2>
        <p>
          For this route, the lowest historical median in the sample was at{" "}
          <strong>{bestWindow?.days} {bestWindow?.days === 1 ? 'day' : 'days'} before departure</strong>.
        </p>
        <div className="uw-stat-pair">
          <div>
            <small>Historical median · 1 adult, economy</small>
            <b>{rupees(bestWindow?.median || 0)}</b>
          </div>
          <div>
            <small>For a {dayLabel(date)} trip, that means</small>
            <b>
              {dayLabel(
                new Date(
                  new Date(date + "T12:00:00").getTime() -
                    (bestWindow?.days || 0) * 86400000,
                )
                  .toISOString()
                  .slice(0, 10),
              )}
            </b>
          </div>
        </div>
        <p className="uw-note">
          A planning reference from simulated completed flights, not the
          expected price on that day. Different horizons may contain different
          available flights.
        </p>
      </div>
      <article className="uw-panel">
        <h3>Fares by booking time</h3>
        <p>Median economy fares · previous 30 completed travel dates</p>
        <div className="uw-history-bars">
          {[...history].reverse().map((h) => (
            <div key={h.days}>
              <b>{rupees(h.median)}</b>
              <div>
                <i
                  style={{
                    height: `${(h.median / Math.max(...history.map((x) => x.median))) * 100}%`,
                  }}
                />
              </div>
              <strong>{h.days} {h.days === 1 ? 'day' : 'days'}</strong>
              <small>{h.count.toLocaleString()} fares</small>
            </div>
          ))}
        </div>
      </article>
      <article className="uw-panel">
        <h3>Lowest nearby fare</h3>
        <p>
          {lowDate
            ? `${dayLabel(lowDate.date)} starts at ${rupees(lowDate.price)} for your traveller and cabin selection.`
            : "No nearby offers for this cabin."}
        </p>
        <button
          className="uw-primary"
          onClick={() => {
            if (lowDate) setDate(lowDate.date);
            setTab("flights", { route: route, date: lowDate?.date || date });
          }}
        >
          View flights on this date <ArrowRight size={15} />
        </button>
      </article>
    </section>
  );
}
