import FareDetailsDialog from "./components/FareDetailsDialog";
import CompareDialog from "./components/CompareDialog";
import AlertDialog from "./components/AlertDialog";
import TravellersDialog from "./components/TravellersDialog";
import SavedTrips from "./components/SavedTrips";
import TripInsights from "./components/TripInsights";
import FlightFilters from "./components/FlightFilters";
import NearbyDates from "./components/NearbyDates";
import FlightSearch from "./components/FlightSearch";
import FlightCard from "./components/FlightCard";
import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import SiteNav from "../SiteNav";
import { authApi } from "../authApi";
import {
  ArrowRight,
  Plane,
  SlidersHorizontal,
  Bell,
  Check,
  ChevronDown,
  ArrowUpRight,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import BrandMark from "../BrandMark";
import RouteMap from "./components/RouteMap";
import { names, airlineNames, initialFilters } from "./catalogLabels";
import {
  buildOffers,
  quoteFlight,
  validParty,
  savedOfferKey,
  dayLabel,
  rupees,
  durationLabel,
} from "./offerModel";
import "./users-workspace.css";
export default function UsersWorkspace({ view = "flights", data, onSelection, initialSaved = [], initialAlerts = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const preview = location.pathname === '/users/preview';
  const tab = preview ? (['flights', 'insights', 'saved'].includes(query.get('view')) ? query.get('view') : 'flights') : view;
  const setTab = (next, selection = { route, date }) => {
    const params = new URLSearchParams(selection);
    if (preview) params.set('view', next);
    navigate(`${preview ? '/users/preview' : next === 'flights' ? '/users' : '/users/' + next}?${params}`);
  };
  const
    [route, setRoute] = useState(() => data.routes.includes(query.get("route")) ? query.get("route") : "BOM-DEL"),
    [date, setDate] = useState(() => query.get("date") >= data.start && query.get("date") <= data.end ? query.get("date") : data.selectedDate),
    [party, setParty] = useState({ adults: 1, children: 0, infants: 0 }),
    [cabin, setCabin] = useState("ECONOMY"),
    [filters, setFilters] = useState(initialFilters),
    [sort, setSort] = useState("best"),
    [limit, setLimit] = useState(8),
    [mobileFilters, setMobileFilters] = useState(false),
    [detail, setDetail] = useState(null),
    [compared, setCompared] = useState([]),
    [modal, setModal] = useState(null),
    [saved, setSaved] = useState(initialSaved),
    [alerts, setAlerts] = useState(initialAlerts),
    [message, setMessage] = useState(""),
    [alertTarget, setAlertTarget] = useState(10000),
    [flex, setFlex] = useState(true),
    [bundle, setBundle] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (data.routes.includes(params.get('route'))) setRoute(params.get('route'));
    const selected = params.get('date');
    if (selected >= data.start && selected <= data.end) setDate(selected);
  }, [location.search]);
  useEffect(() => { onSelection(route, date); }, [route, date, onSelection]);
  useEffect(() => {
    setCompared([]);
    setDetail(null);
    setLimit(8);
  }, [route, date, party, cabin, filters]);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(id);
  }, [message]);
  const saving = useRef(false);
  const persist = async (key, items, setter) => {
    if (saving.current) return false;
    saving.current = true;
    try {
      await authApi.saveTravellerSelections(key.endsWith("alerts") ? "alerts" : "saved", items);
      setter(await authApi.travellerSelections(key.endsWith("alerts") ? "alerts" : "saved"));
      return true;
    } catch {
      setMessage(
        "Unable to save to your account. Please try again.",
      );
      return false;
    } finally { saving.current = false; }
  };
  const update = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const offers = useMemo(
    () => buildOffers(data, route, date, party, cabin, filters),
    [data, route, date, party, cabin, filters],
  );
  const sorted = useMemo(
    () =>
      [...offers].sort((a, b) =>
        sort === "fastest"
          ? a.duration - b.duration || a.total - b.total
          : sort === "earliest"
            ? a.departure.localeCompare(b.departure)
            : sort === "cheapest"
              ? a.total - b.total
              : a.total + a.duration * 140 - (b.total + b.duration * 140),
      ),
    [offers, sort],
  );
  const [from, to] = route.split("-"),
    destinations = data.routes
      .filter((r) => r.startsWith(from + "-"))
      .map((r) => r.split("-")[1]);
  const calendar = useMemo(
    () =>
      Array.from({ length: Math.round((new Date(data.calendarEnd) - new Date(data.calendarStart))/86400000) + 1 }, (_, i) => {
        const d = new Date(data.calendarStart + "T12:00:00");
        d.setDate(d.getDate() + i);
        const day = d.toISOString().slice(0, 10);
        const prices = data.flights
          .filter(
            (f) => f.date === day && data.services[f.service].route === route,
          )
          .map((f) => quoteFlight(f, data, party, cabin, filters))
          .filter(Boolean)
          .map((f) => f.total);
        return { date: day, price: prices.length ? Math.min(...prices) : null };
      }),
    [data, route, party, cabin, filters.bag, filters.refund],
  );
  const lowDate = calendar
    .filter((d) => d.price)
    .sort((a, b) => a.price - b.price)[0];
  const history = data.history[route] || [],
    bestWindow = [...history].sort((a, b) => a.median - b.median)[0];
  const cheap = offers.length ? Math.min(...offers.map((o) => o.total)) : null;
  const save = async (o) => {
    const key = savedOfferKey(o, date, cabin, party);
    const exists = saved.some((s) => s.key === key);
    const written = await persist(
      "sm-preview-saved",
      exists
        ? saved.filter((s) => s.key !== key)
        : [
            ...saved,
            {
              key,
              route,
              date,
              cabin,
              party,
              total: o.total,
              package: o.policy.code,
              airline: o.airline,
              departure: o.departure,
            },
          ],
      setSaved,
    );
    if (written)
      setMessage(
        exists ? "Removed from saved flights." : "Saved to your account.",
      );
  };
  const compare = (o) =>
    setCompared((c) =>
      c.some((x) => x.id === o.id)
        ? c.filter((x) => x.id !== o.id)
        : c.length < 3
          ? [...c, o]
          : (setMessage(
              "Compare up to three flights. Remove one to add another.",
            ),
            c),
    );
  const openDetails = (o) => {
    setDetail(o);
    setBundle(0);
  };
  const changeParty = (key, value) => {
    const next = { ...party, [key]: Number(value) };
    if (!validParty(next)) {
      setMessage(
        "Choose up to 9 seated travellers and one lap infant per adult.",
      );
      return;
    }
    setParty(next);
  };
  return (
    <div className="uw">
      <SiteNav section="flights" selection={{ route, date }} previewView={preview ? tab : undefined}/>
      <div className="uw-demo">
        <span>
          <i />
          Demo · simulated fares
        </span>
        <span>Observed {dayLabel(data.asOf)} {data.asOf.slice(0,4)} · booking unavailable</span>
      </div>
      <main>
        {tab !== "saved" && <FlightSearch
          data={data}
          from={from}
          to={to}
          route={route}
          setRoute={setRoute}
          date={date}
          setDate={setDate}
          party={party}
          cabin={cabin}
          setModal={setModal}
          destinations={destinations}
          onSearch={(selection) => {
            setTab("flights", selection);
            setFilters(initialFilters);
            setMessage("Flight results updated.");
          }}
        />}
        {tab === "saved" ? (
          <SavedTrips
            saved={saved}
            alerts={alerts}
            setTab={setTab}
            setRoute={setRoute}
            setDate={setDate}
            setParty={setParty}
            setCabin={setCabin}
            persist={persist}
            setSaved={setSaved}
            setAlerts={setAlerts}
          />
        ) : (
          <>
            <div className="uw-trip-heading" id="uw-results">
              <div>
                <h2>
                  {names[from]} to {names[to]}
                </h2>
                <p>
                  {dayLabel(date)} {date.slice(0,4)} ·{" "}
                  {cabin.replace("_", " ").toLowerCase()} · prices include taxes
                </p>
              </div>
              <button
                className="uw-alert"
                onClick={() => {
                  setAlertTarget(cheap ? Math.ceil(cheap / 100) : 10000);
                  setModal("alert");
                }}
              >
                <Bell size={17} />
                Price alert
              </button>
            </div>
            {tab === "insights" ? (
              <TripInsights route={route}
                history={history}
                bestWindow={bestWindow}
                date={date}
                lowDate={lowDate}
                setDate={setDate}
                setTab={setTab}
              />
            ) : (
              <>
                <RouteMap {...{data, route, date, party, cabin, filters}} />
                <div className="uw-results-grid">
                  <div className="uw-sidebar">
                    <FlightFilters
                      data={data}
                      filters={filters}
                      setFilters={setFilters}
                      initialFilters={initialFilters}
                      update={update}
                      mobileFilters={mobileFilters}
                      onClose={() => setMobileFilters(false)}
                    />

                  </div>
                  <section className="uw-results">
                    <NearbyDates
                      calendar={calendar}
                      date={date}
                      setDate={setDate}
                      lowDate={lowDate}
                    />
                    <div
                      className="uw-sort-tabs"
                      aria-label="Sort flight results"
                    >
                      {[
                        ["best", "Recommended", "Price + journey time"],
                        [
                          "cheapest",
                          "Cheapest",
                          cheap
                            ? rupees(cheap) + " onwards"
                            : "No matching fares",
                        ],
                        [
                          "fastest",
                          "Fastest",
                          offers.length
                            ? durationLabel(
                                Math.min(...offers.map((o) => o.duration)),
                              )
                            : "No matching flights",
                        ],
                      ].map(([key, label, note]) => (
                        <button
                          key={key}
                          aria-pressed={sort === key}
                          className={sort === key ? "selected" : ""}
                          onClick={() => setSort(key)}
                        >
                          <strong>{label}</strong>
                          <small>{note}</small>
                        </button>
                      ))}
                    </div>
                    <div className="uw-results-toolbar">
                      <strong aria-live="polite">
                        {offers.length} flights
                      </strong>
                      <button
                        className="uw-mobile-filter"
                        onClick={() => setMobileFilters(!mobileFilters)}
                      >
                        <SlidersHorizontal size={16} />
                        Filters
                      </button>
                      <label>
                        Sort
                        <select
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          <option value="best">Recommended</option>
                          <option value="cheapest">Lowest price</option>
                          <option value="fastest">Shortest trip</option>
                          <option value="earliest">Earliest departure</option>
                        </select>
                      </label>
                    </div>
                    <div
                      className="uw-filter-chips"
                      aria-label="Active filters"
                    >
                      {[
                        [
                          "airline",
                          filters.airline.length
                            ? filters.airline.map(code => airlineNames[code]).join(", ")
                            : null,
                          [],
                        ],
                        [
                          "band",
                          filters.band ? `${filters.band} departure` : null,
                          "",
                        ],
                        ["bag", filters.bag ? "15 kg+ bag" : null, false],
                        ["refund", filters.refund ? "Refundable" : null, false],
                        [
                          "rating",
                          filters.rating ? `Skytrax ${filters.rating}+★` : null,
                          0,
                        ],
                      ]
                        .filter(([, label]) => label)
                        .map(([key, label, reset]) => (
                          <button
                            key={key}
                            onClick={() => update(key, reset)}
                            aria-label={`Remove ${label} filter`}
                          >
                            {label} ×
                          </button>
                        ))}
                    </div>
                    {filters.stops !== "direct" && (
                      <div className="uw-transfer-note">
                        <ShieldCheck size={18} />
                        Self-transfers use separate tickets. Allow time to
                        collect bags and check in again; connections are not
                        protected.
                      </div>
                    )}
                    <div className="uw-flight-list">
                    {sorted.slice(0, limit).map((o) => (
                      <FlightCard
                        key={o.id}
                        offer={o}
                        party={party}
                        selected={compared.some((c) => c.id === o.id)}
                        onCompare={compare}
                        onDetails={openDetails}
                        onSave={save}
                        saved={saved.some(
                          (s) => s.key === savedOfferKey(o, date, cabin, party),
                        )}
                      />
                    ))}
                    </div>
                    {!offers.length && (
                      <div className="uw-empty">
                        <Plane />
                        <h3>No flights fit these choices.</h3>
                        <p>
                          Try another date, cabin or fewer filters.
                        </p>
                        <button
                          className="uw-primary"
                          onClick={() => {
                            setFilters(initialFilters);
                            setCabin("ECONOMY");
                          }}
                        >
                          Reset filters & cabin
                        </button>
                      </div>
                    )}
                    {sorted.length > limit && (
                      <button
                        className="uw-load"
                        onClick={() => setLimit((n) => n + 8)}
                      >
                        Show 8 more flights <ChevronDown size={16} />
                      </button>
                    )}
                  </section>
                </div>
              </>
            )}
          </>
        )}
      </main>
      <footer className="uw-footer">
        <strong>SkyMetrics</strong>
        <span>Flight comparison · simulated data</span>
        <Link to="/users/trends">Fare trends</Link>
        <Link to="/help">How this works</Link>
      </footer>
      {compared.length > 0 && tab === "flights" && (
        <div className="uw-compare-bar">
          <span>
            <strong>{compared.length}/3 flights</strong> in your comparison
          </span>
          <button onClick={() => setCompared([])}>Clear</button>
          <button
            className="uw-primary"
            disabled={compared.length < 2}
            onClick={() => setModal("compare")}
          >
            Compare flights <ArrowRight size={16} />
          </button>
        </div>
      )}
      {message && (
        <div role="status" className="uw-toast">
          <Check size={17} />
          {message}
        </div>
      )}
      {modal === "travellers" && (
        <TravellersDialog
          setModal={setModal}
          party={party}
          changeParty={changeParty}
          cabin={cabin}
          setCabin={setCabin}
        />
      )}
      {modal === "alert" && (
        <AlertDialog
          setModal={setModal}
          alerts={alerts}
          persist={persist}
          route={route}
          date={date}
          cabin={cabin}
          party={party}
          alertTarget={alertTarget}
          flex={flex}
          setAlerts={setAlerts}
          setMessage={setMessage}
          from={from}
          to={to}
          setAlertTarget={setAlertTarget}
          setFlex={setFlex}
        />
      )}
      {modal === "compare" && (
        <CompareDialog
          setModal={setModal}
          compared={compared}
          openDetails={openDetails}
        />
      )}
      {detail && (
        <FareDetailsDialog
          setDetail={setDetail}
          detail={detail}
          date={date}
          bundle={bundle}
          setBundle={setBundle}
          save={save}
        />
      )}
    </div>
  );
}
