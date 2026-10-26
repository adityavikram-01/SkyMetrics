import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { rupees, dayLabel } from "../offerModel";
export default function NearbyDates({ calendar, date, setDate, lowDate }) {
  const [start, setStart] = useState(0);
  useEffect(() => {
    const i = calendar.findIndex((d) => d.date === date);
    setStart(Math.max(0, Math.min(calendar.length - 5, i - 2)));
  }, [date, calendar]);
  return (
    <section className="uw-calendar" aria-label="Nearby date fares">
      <div className="uw-calendar-heading">
        <strong>Nearby dates</strong>
        <small>All airlines · direct fares</small>
      </div>
      <div className="uw-calendar-controls">
        <button
          aria-label="Earlier dates"
          disabled={start === 0}
          onClick={() => setStart(Math.max(0, start - 5))}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="uw-days">
          {calendar.slice(start, start + 5).map((d) => (
            <button
              key={d.date}
              disabled={!d.price}
              aria-pressed={d.date === date}
              className={`${d.date === date ? "selected" : ""} ${d.date === lowDate?.date ? "lowest" : ""}`}
              onClick={() => setDate(d.date)}
            >
              <small>{dayLabel(d.date)}</small>
              <strong>{d.price ? rupees(d.price) : "No fare"}</strong>
              <span>
                {d.date === lowDate?.date
                  ? "Lowest"
                  : d.date === date
                    ? "Selected"
                    : " "}
              </span>
            </button>
          ))}
        </div>
        <button
          aria-label="Later dates"
          disabled={start + 5 >= calendar.length}
          onClick={() => setStart(Math.min(calendar.length - 5, start + 5))}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
