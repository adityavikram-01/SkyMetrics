import BrandMark from './BrandMark'
import './loading.css'

export default function LoadingScreen({ label = 'Opening SkyMetrics' }) {
  return <div className="sky-loading" role="status" aria-live="polite" aria-label={label}>
    <div className="sky-loading-content">
      <div className="sky-loading-mark"><BrandMark className="brand-mark"/></div>
      <div className="sky-loading-name">Sky<span>Metrics</span></div>
      <div className="sky-loading-track" aria-hidden="true"><span/></div>
      <p>{label}<span className="sky-loading-dots" aria-hidden="true">...</span></p>
    </div>
  </div>
}
