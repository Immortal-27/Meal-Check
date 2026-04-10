import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Keyboard, QrCode } from 'lucide-react';
import { useMeal } from '../context/MealContext';

export default function QRScanner() {
  const { handleScan, scanStatus } = useMeal();
  const [mode, setMode] = useState('manual'); // 'camera' | 'manual'
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  // Keep a stable ref to handleScan to avoid restarting the camera when handleScan recreates
  const handleScanRef = useRef(handleScan);
  useEffect(() => {
    handleScanRef.current = handleScan;
  }, [handleScan]);

  // Camera scanner
  useEffect(() => {
    if (mode !== 'camera') {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
        setIsCameraActive(false);
      }
      return;
    }

    let html5QrCode = null;

    const startCamera = async () => {
      try {
        setCameraError(null);
        html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1
          },
          (decodedText) => {
            // Use the ref here to always call the latest handleScan!
            handleScanRef.current(decodedText);
          },
          () => {}
        );
        setIsCameraActive(true);
      } catch (err) {
        console.error('Camera error:', err);
        setCameraError(
          typeof err === 'string' ? err : 'Camera access denied or not available. Use manual input.'
        );
        setIsCameraActive(false);
      }
    };

    startCamera();

    return () => {
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [mode]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleScan(manualInput.trim());
      setManualInput('');
    }
  };

  return (
    <div className="qr-scanner-section">
      <div className="scanner-mode-toggle">
        <button
          className={`mode-btn ${mode === 'camera' ? 'active' : ''}`}
          onClick={() => setMode('camera')}
          id="camera-mode-btn"
        >
          <span className="icon-circle">
            <Camera size={18} />
          </span>
          Camera
        </button>
        <button
          className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => setMode('manual')}
          id="manual-mode-btn"
        >
          <span className="icon-circle">
            <Keyboard size={18} />
          </span>
          Manual
        </button>
      </div>

      {mode === 'camera' ? (
        <div className="camera-container">
          <div id="qr-reader" ref={containerRef}></div>
          {cameraError && (
            <div className="camera-error">
              <p>{cameraError}</p>
              <button onClick={() => setMode('manual')} className="brutalist-btn small">
                Switch to Manual
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="manual-input-form">
          <div className="input-group">
            <span className="input-icon">
              <QrCode size={20} />
            </span>
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter name or UUID"
              className="brutalist-input"
              id="manual-scan-input"
              autoFocus
              disabled={scanStatus === 'scanning'}
            />
          </div>
          <button
            type="submit"
            className="brutalist-btn scan-btn"
            disabled={!manualInput.trim() || scanStatus === 'scanning'}
            id="scan-submit-btn"
          >
            {scanStatus === 'scanning' ? 'VERIFYING...' : 'SCAN & VERIFY'}
          </button>
        </form>
      )}
    </div>
  );
}
