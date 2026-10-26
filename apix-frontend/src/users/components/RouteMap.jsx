import { useId, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import indiaMap from '../../india-states.svg';
import { names } from '../catalogLabels';
import { buildOffers, dayLabel, rupees } from '../offerModel';
import { airportPoints, networkPaths, routeCurve } from '../routeGeometry';

export default function RouteMap({ data, route, date, party, cabin, filters }) {
  const [open, setOpen] = useState(false);
  return <details className="uw-journey-map" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><MapPin size={17} /> View route map <span>{route.replace('-', ' → ')}</span></summary>
    {open && <MapContent key={`${route}:${date}`} {...{data, route, date, party, cabin, filters}} />}
  </details>;
}

function MapContent({ data, route, date, party, cabin, filters }) {
  const [via, setVia] = useState('');
  const [showNetwork, setShowNetwork] = useState(true);
  const markerId = useId().replace(/:/g, '');
  const [from, to] = route.split('-');
  const connections = useMemo(() => {
    const cheapestByStop = new Map();
    for (const offer of buildOffers(data, route, date, party, cabin, {...filters, stops: 'one'})) {
      if (!cheapestByStop.has(offer.via) || offer.total < cheapestByStop.get(offer.via).total) cheapestByStop.set(offer.via, offer);
    }
    return [...cheapestByStop.values()].sort((a,b) => a.total-b.total);
  }, [data, route, date, party, cabin, filters]);
  const selectedVia = connections.some(offer => offer.via === via) ? via : '';
  const itinerary = selectedVia ? [from, selectedVia, to] : [from, to];
  const paths = useMemo(() => networkPaths(data.routes), [data.routes]);
  const covered = [...new Set(data.routes.flatMap(code => code.split('-')))];
  const active = new Set(itinerary);
  const offsets = {BOM: [-12,-5,'end'], PNQ: [12,15,'start'], GOI: [-10,5,'end'], BLR: [-10,5,'end'], MAA: [10,12,'start']};
  return <div className="uw-map-content">
    <div className="uw-map-copy">
      <h3>Your journey</h3>
      <p>{dayLabel(date)} · {selectedVia ? 'Self-transfer · separate tickets' : 'Direct route'}</p>
      <ol className="uw-map-itinerary">{itinerary.map((code,index) => <li key={code}>
        <span>{index===0?'From':index===itinerary.length-1?'To':'Via'}</span>
        <strong>{names[code]} <small>{code}</small></strong>
      </li>)}</ol>
      <label className="uw-map-choice">Show journey<select aria-label="Map journey" value={selectedVia} onChange={event=>setVia(event.target.value)}>
        <option value="">Direct · {from} → {to}</option>
        {connections.map(offer=><option key={offer.via} value={offer.via}>Via {names[offer.via]} · from {rupees(offer.total)}</option>)}
      </select></label>
      <label className="uw-map-toggle"><input type="checkbox" checked={showNetwork} onChange={event=>setShowNetwork(event.target.checked)}/> Show network routes</label>
      <p className="uw-map-note">{data.routes.length} directional routes · {covered.length} airports. Connecting options follow your current filters and available simulated flights.</p>
    </div>
    <div className="uw-map-canvas">
      <svg viewBox="0 40 420 375" role="img" aria-label={`Flight path: ${itinerary.map(code=>names[code]).join(' to ')}`}>
        <defs><marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ffb47b"/></marker></defs>
        <image href={indiaMap} width="420" height="470"/>
        {showNetwork && <g className="uw-map-network">{paths.map(item=><path key={item.route} d={item.path}/>)}</g>}
        <g className="uw-map-selected">{itinerary.slice(1).map((code,index)=><path key={code} d={routeCurve(itinerary[index],code)} markerEnd={`url(#${markerId})`}/>)}</g>
        {covered.map(code => {
          const point=airportPoints[code];
          if(!point) return null;
          const [dx,dy,anchor]=offsets[code] || [10,-7,'start'];
          return <g key={code} className={active.has(code)?'uw-map-airport selected':'uw-map-airport'} transform={`translate(${point[0]} ${point[1]})`}>
            <title>{names[code]} ({code}){code===from?' · Origin':code===to?' · Destination':''}</title>
            {active.has(code) && <circle className="uw-map-ring" r="10"/>}
            <circle r={active.has(code)?4.5:2.5}/>
            <text x={dx} y={dy} textAnchor={anchor}>{code}</text>
          </g>;
        })}
      </svg>
      <div className="uw-map-key"><span>━ Selected journey</span><span>┄ Network routes</span></div>
      <small>Simulated network · schematic paths · Boundaries: geoBoundaries, CC BY 4.0</small>
    </div>
  </div>;
}
