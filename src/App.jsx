import { MealProvider } from './context/MealContext';
import Header from './components/Header';
import MealToggle from './components/MealToggle';
import QRScanner from './components/QRScanner';
import ScanFeedback from './components/ScanFeedback';
import RecentScans from './components/RecentScans';
import StatusCube from './components/StatusCube';
import SyncFooter from './components/SyncFooter';
import AttendanceDashboard from './components/AttendanceDashboard';
import { useMeal } from './context/MealContext';

function AppContent() {
  const { scanStatus, isLoading, currentView } = useMeal();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-cube"></div>
        <h2>LOADING PARTICIPANTS...</h2>
        <p>Decrypting hashed database</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Header />

      <main className="main-content">
        {currentView === 'scanner' ? (
          <div className="content-grid">
            <div className="left-column">
              <MealToggle />
              <QRScanner />
              <ScanFeedback />
            </div>
            <div className="right-column">
              <div className="cube-wrapper">
                <StatusCube status={scanStatus} />
              </div>
              <RecentScans />
            </div>
          </div>
        ) : (
          <AttendanceDashboard />
        )}
      </main>

      <SyncFooter />
    </div>
  );
}

export default function App() {
  return (
    <MealProvider>
      <AppContent />
    </MealProvider>
  );
}
