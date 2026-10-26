import { useEffect, useState } from 'react'
import { api } from '../api'

export function useGovernmentResearch(asOf, compareTo, route, section) {
  const [report, setReport] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [investigation, setInvestigation] = useState(null)
  const [reportState, setReportState] = useState({ loading: true, error: '' })
  const [comparisonState, setComparisonState] = useState({ loading: false, error: '' })
  const [routeState, setRouteState] = useState({ loading: false, error: '' })
  const [revision, refresh] = useState(0)

  useEffect(() => {
    let current = true
    setReportState({ loading: true, error: '' })
    api.governmentResearch(asOf || undefined).then(data => {
      if (!current) return
      setReport(data)
      setReportState({ loading: false, error: '' })
    }).catch(error => {
      if (!current) return
      setReport(null)
      setReportState({ loading: false, error: error.message || 'The report could not be loaded.' })
    })
    return () => { current = false }
  }, [asOf, revision])

  const selectedDate = report?.asOf
  const defaultCompare = report?.series?.at(-31)?.date || report?.baseDate
  const comparisonDate = compareTo && compareTo <= selectedDate ? compareTo : defaultCompare
  const needsComparison = section === 'briefing'
  useEffect(() => {
    if (!selectedDate || !comparisonDate || !needsComparison) return
    let current = true
    setComparisonState({ loading: true, error: '' })
    api.governmentComparison(selectedDate, comparisonDate).then(data => {
      if (current) { setComparison(data); setComparisonState({ loading: false, error: '' }) }
    }).catch(error => {
      if (current) { setComparison(null); setComparisonState({ loading: false, error: error.message || 'Comparison unavailable.' }) }
    })
    return () => { current = false }
  }, [selectedDate, comparisonDate, needsComparison, revision])

  const coveredRoutes = report?.routes?.map(item => item.route) || []
  const preferredRoute = route
  const selectedRoute = coveredRoutes.includes(preferredRoute) ? preferredRoute : coveredRoutes[0]
  const needsRoute = section === 'routes' || section === 'patterns' || section === 'quality'
  useEffect(() => {
    if (!selectedDate || !selectedRoute || !needsRoute) return
    let current = true
    setRouteState({ loading: true, error: '' })
    api.governmentRoute(selectedRoute, selectedDate).then(data => {
      if (current) { setInvestigation(data); setRouteState({ loading: false, error: '' }) }
    }).catch(error => {
      if (current) { setInvestigation(null); setRouteState({ loading: false, error: error.message || 'Route evidence unavailable.' }) }
    })
    return () => { current = false }
  }, [selectedDate, selectedRoute, needsRoute, revision])

  return { report, comparison, investigation, selectedDate, selectedRoute, comparisonDate,
    reportState, comparisonState, routeState, refresh: () => refresh(value => value + 1) }
}
