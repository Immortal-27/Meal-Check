import { Utensils, RotateCcw, Fingerprint, ScanLine, LayoutDashboard } from 'lucide-react';
import { useMeal } from '../context/MealContext';

export default function Header() {
  const { isOnline, resetData, currentView, setCurrentView } = useMeal();

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <span className="icon-circle large">
            <Utensils size={26} />
          </span>
          <div className="logo-text">
            <h1>MEAL<span className="accent">TRACK</span></h1>
            <p className="tagline">
              <Fingerprint size={12} style={{ display: 'inline' }} />
              UUID Verified • Code for Change 2.0
            </p>
          </div>
        </div>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-tab ${currentView === 'scanner' ? 'active' : ''}`}
          onClick={() => setCurrentView('scanner')}
          id="nav-scanner"
        >
          <ScanLine size={16} />
          <span className="nav-tab-label">Scanner</span>
        </button>
        <button
          className={`nav-tab ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
          id="nav-dashboard"
        >
          <LayoutDashboard size={16} />
          <span className="nav-tab-label">Dashboard</span>
        </button>
      </nav>

      <div className="header-right">
        <div className={`online-dot ${isOnline ? 'online' : 'offline'}`}></div>
        <button
          className="reset-btn"
          onClick={resetData}
          title="Reset all data"
          id="reset-data-btn"
        >
          <span className="icon-circle">
            <RotateCcw size={16} />
          </span>
        </button>
      </div>
    </header>
  );
}
