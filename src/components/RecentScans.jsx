import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { useMeal } from '../context/MealContext';

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle,
    label: 'Verified',
    className: 'status-success'
  },
  already_taken: {
    icon: XCircle,
    label: 'Duplicate',
    className: 'status-duplicate'
  },
  not_found: {
    icon: AlertTriangle,
    label: 'Unknown',
    className: 'status-unknown'
  }
};

export default function RecentScans() {
  const { recentScans } = useMeal();

  if (recentScans.length === 0) {
    return (
      <div className="recent-scans-section">
        <h2 className="section-title">SCAN LOG</h2>
        <div className="empty-state">
          <Clock size={32} />
          <p>No scans yet. Start scanning!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-scans-section">
      <h2 className="section-title">
        SCAN LOG
        <span className="scan-count">{recentScans.length}</span>
      </h2>
      <div className="scans-list">
        {recentScans.map((scan) => {
          const config = STATUS_CONFIG[scan.status];
          const Icon = config.icon;

          return (
            <div key={scan.id} className={`scan-item ${config.className}`}>
              <span className="scan-icon">
                <Icon size={18} />
              </span>
              <div className="scan-info">
                <span className="scan-name">
                  {scan.name || scan.uuid || scan.raw || 'Unknown'}
                </span>
                <span className="scan-meta">
                  {scan.meal.toUpperCase()} • {scan.time}
                </span>
              </div>
              <span className={`scan-badge ${config.className}`}>
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
