import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Activity, ArrowRight, CalendarDays, Download, FileText, MapPinned, RefreshCw, ShieldCheck } from 'lucide-react'
import { download, dateLabel, indexChartSvg } from './format'
import { useGovernmentResearch } from './useGovernmentResearch'
import GovernmentBriefing from './GovernmentBriefing'
import GovernmentInvestigation from './GovernmentInvestigation'
import GovernmentEvidence from './GovernmentEvidence'
import './gov-workspace.css'

const key = 'skymetrics-government-research-view'
function savedView() {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}
const sections = [
  { id: 'briefing', path: '/government', label: 'National briefing', detail: 'What changed', icon: Activity },
  { id: 'routes', path: '/government/routes', label: 'Route movement', detail: 'Where it changed', icon: MapPinned },
  { id: 'patterns', path: '/government/patterns', label: 'Fare patterns', detail: 'When and with whom', icon: CalendarDays },
  { id: 'quality', path: '/government/quality', label: 'Data quality', detail: 'What supports it', icon: ShieldCheck },
  { id: 'methods', path: '/government/methods', label: 'Methods & exports', detail: 'How to use it', icon: FileText },
]

export default function GovernmentWorkspace() {
  const location = useLocation()
  const navigate = useNavigate()
  const section = sections.find(item => item.path === location.pathname)?.id || 'briefing'
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [location.pathname])
  const [initial] = useState(savedView)
  const [asOf, setAsOf] = useState(initial.asOf || '')
  const [compareTo, setCompareTo] = useState(initial.compareTo || '')
  const [route, setRoute] = useState(initial.route || '')
  const [notice, setNotice] = useState('')
  const { report, comparison, investigation, selectedDate, selectedRoute, comparisonDate,
    reportState, comparisonState, routeState, refresh } = useGovernmentResearch(asOf, compareTo, route, section)

  const chooseRoute = value => { setRoute(value); navigate('/government/routes') }
  const saveView = () => {
    try {
      localStorage.setItem(key, JSON.stringify({ section, asOf: selectedDate, compareTo: comparisonDate, route: selectedRoute }))
      setNotice('Date and route saved on this device.')
    } catch { setNotice('This browser could not save the view.') }
  }
  const exportCsv = async (kind, routeCode) => {
    if (!report) return
    try {
      const path = routeCode
        ? `/api/v1/government/research/routes/${encodeURIComponent(routeCode)}/evidence.csv?asOf=${encodeURIComponent(selectedDate)}`
        : `/api/v1/government/research/${kind}.csv?asOf=${encodeURIComponent(selectedDate)}`
      const response = await fetch(path, { credentials: 'same-origin' })
      if (!response.ok) throw new Error('The export could not be downloaded.')
      download(`skymetrics-${routeCode ? `${routeCode.toLowerCase()}-evidence` : kind}-${selectedDate}.csv`, await response.text(), 'text/csv;charset=UTF-8')
      setNotice('Dated CSV downloaded.')
    } catch (error) { setNotice(error.message) }
  }
  const exportJson = () => {
    const currentComparison = comparison?.asOf === selectedDate && comparison?.compareTo === comparisonDate ? comparison : null
    const currentRoute = investigation?.asOf === selectedDate && investigation?.route === selectedRoute ? investigation : null
    download(`skymetrics-government-${selectedDate}.json`, JSON.stringify({ report, comparison: currentComparison, investigation: currentRoute }, null, 2), 'application/json')
    setNotice('Dated JSON report downloaded.')
  }
  const exportChart = () => {
    const currentComparison = comparison?.asOf === selectedDate && comparison?.compareTo === comparisonDate ? comparison : null
    download(`skymetrics-index-${selectedDate}.svg`, indexChartSvg(report, currentComparison), 'image/svg+xml')
    setNotice('Index chart downloaded.')
  }

  return <div className="govw">
    <header className="govw-header">
      <div><span className="govw-kicker">SKYMETRICS / RESEARCH</span><h1>Airfare observatory</h1><p>Track fare changes across India, then check the routes and evidence behind them.</p></div>
      <div className="govw-header-actions"><span className="govw-simulated"><i/> SIMULATED DATA</span><button type="button" className="govw-icon-button" onClick={refresh} aria-label="Refresh report" title="Refresh report"><RefreshCw size={17}/></button></div>
    </header>
    <div className="govw-context"><label><CalendarDays size={16}/> As of <input type="date" aria-label="Report date" value={selectedDate || ''} min={report?.firstCollectionDate} max={report?.lastCollectionDate} onChange={event => setAsOf(event.target.value)}/></label><span>{report ? `${dateLabel(report.firstCollectionDate)} to ${dateLabel(report.lastCollectionDate)} · fixed base ${dateLabel(report.baseDate)} = 100` : 'Loading collection window'}</span><button type="button" onClick={saveView} disabled={!report}>Save date and route</button></div>
    <div className="govw-disclosure"><ShieldCheck size={18}/><span><strong>Demo data.</strong> Fares and collection results are simulated. This is not live pricing or official CPI.</span></div>
    {notice && <div className="govw-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
    {reportState.loading && <div className="govw-state"><RefreshCw className="govw-spin" size={20}/> Preparing the research briefing…</div>}
    {reportState.error && <div className="govw-state govw-error">{reportState.error}<button type="button" onClick={refresh}>Retry</button></div>}
    {!reportState.loading && !reportState.error && report && <div className={`govw-layout govw-section-${section}`}>
      <label className="govw-mobile-page" htmlFor="govw-mobile-section">Workspace page<select id="govw-mobile-section" value={section} onChange={event => navigate(sections.find(item => item.id === event.target.value).path)}>{sections.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <nav className="govw-rail" aria-label="Government workspace sections"><span>WORKSPACE</span>{sections.map(({ id, path, label, detail, icon: Icon }, index) => <button type="button" key={id} className={section === id ? 'active' : ''} aria-current={section === id ? 'page' : undefined} onClick={() => navigate(path)}><b>0{index + 1}</b><Icon size={18}/><span>{label}<small>{detail}</small></span><ArrowRight size={15}/></button>)}<div className="govw-rail-foot">Dataset {report.datasetId.slice(0, 8)}<br/>{report.series.length} simulated collection days through this report</div></nav>
      <div className="govw-content">
        {section === 'briefing' && <GovernmentBriefing report={report} comparison={comparison} comparisonDate={comparisonDate} onCompareDate={setCompareTo} comparisonState={comparisonState} onChooseRoute={chooseRoute} onExportChart={exportChart}/>}
        {section === 'routes' && <GovernmentInvestigation mode="routes" report={report} data={investigation} state={routeState} route={selectedRoute} onRoute={setRoute} onNext={() => navigate('/government/patterns')}/>}
        {section === 'patterns' && <GovernmentInvestigation mode="patterns" report={report} data={investigation} state={routeState} route={selectedRoute} onRoute={setRoute} onNext={() => navigate('/government/quality')}/>}
        {section === 'quality' && <GovernmentEvidence mode="quality" report={report} data={investigation} state={routeState} route={selectedRoute} onRoute={setRoute} onExportCsv={exportCsv}/>}
        {section === 'methods' && <GovernmentEvidence mode="methods" report={report} data={investigation} state={routeState} route={selectedRoute} onRoute={setRoute} onExportCsv={exportCsv}/>}
        {section === 'methods' && <footer className="govw-report-actions"><div><FileText size={17}/><span>Export this dated research view</span></div><button type="button" onClick={() => exportCsv('index')}><Download size={15}/> Index CSV</button><button type="button" onClick={() => exportCsv('routes')}><Download size={15}/> Routes CSV</button><button type="button" onClick={exportJson}><Download size={15}/> JSON report</button></footer>}
      </div>
    </div>}
  </div>
}
