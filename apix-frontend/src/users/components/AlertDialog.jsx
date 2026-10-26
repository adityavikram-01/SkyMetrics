import Modal from "./Modal";

import { names } from "../catalogLabels";
import { dayLabel } from "../offerModel";
export default function AlertDialog({
  setModal,
  alerts,
  persist,
  route,
  date,
  cabin,
  party,
  alertTarget,
  flex,
  setAlerts,
  setMessage,
  from,
  to,
  setAlertTarget,
  setFlex,
}) {
  return (
    <Modal title="Keep an eye on this trip" onClose={() => setModal(null)}>
      <form
        className="uw-party"
        onSubmit={async (e) => {
          e.preventDefault();
          const written = await persist(
            "sm-preview-alerts",
            [
              ...alerts,
              {
                id: Date.now(),
                route,
                date,
                cabin,
                party,
                target: alertTarget * 100,
                flex,
              },
            ],
            setAlerts,
          );
          if (!written) return;
          setModal(null);
          setMessage(
            "Alert saved to your account. Check Saved flights for matching fares.",
          );
        }}
      >
        <p>
          {names[from]} → {names[to]} · {dayLabel(date)}
        </p>
        <label>
          Target fare (₹)
          <input
            required
            type="number"
            min="1"
            step="1"
            value={alertTarget}
            onChange={(e) => setAlertTarget(Number(e.target.value))}
          />
        </label>
        <label className="uw-check">
          <input
            type="checkbox"
            checked={flex}
            onChange={(e) => setFlex(e.target.checked)}
          />
          Include 7 days before and after
        </label>
        <p className="uw-note">
          Saved to your account. Matches use the latest simulated observations, not live fares. Email delivery is unavailable.
        </p>
        <button className="uw-primary">Save price alert</button>
      </form>
    </Modal>
  );
}
