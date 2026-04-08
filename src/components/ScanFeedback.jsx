import { useMeal } from '../context/MealContext';

export default function ScanFeedback() {
  const { scanStatus, lastScanInfo } = useMeal();

  if (scanStatus === 'idle' || !lastScanInfo) return null;

  const getMessage = () => {
    switch (scanStatus) {
      case 'success':
        return {
          title: 'MEAL VERIFIED ✓',
          subtitle: `${lastScanInfo.name}`,
          detail: `${lastScanInfo.meal.toUpperCase()} marked as taken`,
          className: 'feedback-success'
        };
      case 'already_taken':
        return {
          title: 'ALREADY TAKEN ✗',
          subtitle: `${lastScanInfo.name}`,
          detail: `${lastScanInfo.meal.toUpperCase()} was already collected`,
          className: 'feedback-duplicate'
        };
      case 'not_found':
        return {
          title: 'NOT FOUND ?',
          subtitle: `ID: ${lastScanInfo.raw}`,
          detail: 'This participant is not registered',
          className: 'feedback-unknown'
        };
      default:
        return null;
    }
  };

  const msg = getMessage();
  if (!msg) return null;

  return (
    <div className={`scan-feedback ${msg.className}`}>
      <div className="feedback-content">
        <h3 className="feedback-title">{msg.title}</h3>
        <p className="feedback-subtitle">{msg.subtitle}</p>
        <p className="feedback-detail">{msg.detail}</p>
      </div>
    </div>
  );
}
