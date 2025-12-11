
import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ICONS } from '../constants';

interface QRScannerProps {
  onBack: () => void;
}

interface ErrorState {
  title: string;
  instruction: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  const [error, setError] = useState<ErrorState | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = "qr-reader-container";
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // Initialize scanner
    const startScanner = async () => {
      try {
        // Cleanup existing if any (failsafe)
        if (scannerRef.current) {
            try { 
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (e) { 
                // Ignore stop errors if it wasn't running
            }
        }

        const html5QrCode = new Html5Qrcode(readerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isMounted.current) handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Ignore frame errors
          }
        );
      } catch (err: any) {
        console.error("Camera start error:", err);
        if (isMounted.current) {
            let title = "Camera Error";
            let instruction = "Could not access the camera. Please check permissions.";
            
            // Handle specific error types
            if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError" || err?.message?.includes("Permission denied")) {
                title = "Permission Denied";
                instruction = "Please tap the lock icon 🔒 in your browser address bar, allow Camera access, and then reload the page.";
            } else if (err?.name === "NotFoundError") {
                title = "No Camera Found";
                instruction = "We could not detect a camera on this device. Please ensure your device has a working camera.";
            } else if (err?.name === "NotReadableError") {
                title = "Camera Busy";
                instruction = "The camera is currently in use by another application. Please close other apps and try again.";
            } else if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                title = "Secure Connection Required";
                instruction = "Camera access requires a secure HTTPS connection. Please check your URL.";
            }

            setError({ title, instruction });
            setIsScanning(false);
        }
      }
    };

    // Small delay to ensure DOM is ready and transition is smooth
    const timer = setTimeout(() => {
        if (!scannedResult && !error) {
            startScanner();
        }
    }, 500); // Increased delay slightly to avoid race conditions on quick mount/unmount

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      if (scannerRef.current) {
         // Best effort cleanup
         try {
             scannerRef.current.stop().catch(e => console.warn("Scanner stop error", e));
             scannerRef.current.clear().catch(e => console.warn("Scanner clear error", e));
         } catch (e) {
             console.warn("Cleanup error", e);
         }
      }
    };
  }, []);

  const handleScanSuccess = (text: string) => {
    if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
            setIsScanning(false);
            setScannedResult(text);
            if (navigator.vibrate) navigator.vibrate(200); // Haptic feedback
        }).catch(err => console.error("Stop failed", err));
    }
  };

  const getTypeInfo = (text: string) => {
      // USSD Regex: starts with * or #, ends with # (e.g., *182#) OR starts with tel:
      const isUSSD = /^[\*#].+#$/.test(text) || text.startsWith('tel:');
      const isURL = text.startsWith('http://') || text.startsWith('https://');

      if (isUSSD) return { 
          type: 'ussd', 
          label: 'Mobile Money Code', 
          action: 'Dial Code', 
          icon: ICONS.Phone,
          color: 'text-emerald-400',
          btnBg: 'bg-emerald-500 hover:bg-emerald-400'
      };
      if (isURL) return { 
          type: 'url', 
          label: 'Website Link', 
          action: 'Open Link', 
          icon: ICONS.Scan,
          color: 'text-blue-400',
          btnBg: 'bg-blue-600 hover:bg-blue-500'
      };
      return { 
          type: 'text', 
          label: 'Plain Text', 
          action: 'Copy Text', 
          icon: ICONS.Copy,
          color: 'text-slate-300',
          btnBg: 'bg-slate-700 hover:bg-slate-600'
      };
  };

  const executeAction = () => {
    if (!scannedResult) return;
    const info = getTypeInfo(scannedResult);

    if (info.type === 'ussd') {
        let code = scannedResult;
        if (!code.startsWith('tel:')) {
            // IMPORTANT: Encode # as %23 for tel links to work on Android/iOS dialers
            // Raw: *182# -> tel:*182%23
            code = `tel:${code.replace(/#/g, '%23')}`;
        }
        window.location.href = code;
    } else if (info.type === 'url') {
        window.open(scannedResult, '_blank');
    } else {
        navigator.clipboard.writeText(scannedResult);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const resetScanner = () => {
    setScannedResult(null);
    setIsScanning(true);
    setError(null);
    setCopySuccess(false);
    // Instead of full reload, try to remount the scanner or just reset state
    // For reliability with camera streams, a reload is often safest, but let's try a soft reset first
    // Actually, full reload ensures fresh permission request if user changed settings
    window.location.reload(); 
  };

  const getDisplayText = (text: string) => {
    if (text.startsWith('tel:')) {
        return decodeURIComponent(text.replace('tel:', ''));
    }
    return text;
  };

  const resultInfo = scannedResult ? getTypeInfo(scannedResult) : null;

  return (
    <div className="flex flex-col h-full bg-black absolute inset-0 z-50 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full z-20 flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <button 
          onClick={onBack} 
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all pointer-events-auto"
        >
          <ICONS.XMark className="w-6 h-6" />
        </button>
        <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-xs font-bold text-white uppercase tracking-wider">
          Smart Scanner
        </div>
        <div className="w-10"></div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col justify-center bg-black">
        
        {/* Camera Container */}
        <div id={readerId} className={`w-full h-full object-cover ${!isScanning ? 'hidden' : 'block'}`} />
        
        {/* Error State */}
        {error && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center bg-black animate-in fade-in duration-300">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 shadow-lg shadow-red-900/20">
                    <ICONS.XMark className="w-10 h-10 text-red-500" />
                </div>
                <p className="text-white font-bold text-xl mb-4 max-w-[280px] leading-snug">
                   {error.title}
                </p>
                <p className="text-slate-400 text-sm mb-8 max-w-[280px] leading-relaxed">
                   {error.instruction}
                </p>
                <div className="flex gap-4">
                    <button 
                      onClick={onBack}
                      className="px-6 py-3.5 bg-slate-800 text-white font-bold rounded-2xl border border-white/10 hover:bg-slate-700 transition-all"
                    >
                      Close
                    </button>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-6 py-3.5 bg-white text-black font-extrabold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                      Reload
                    </button>
                </div>
            </div>
        )}

        {/* Scanning Overlay (only visible when scanning) */}
        {isScanning && !error && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             {/* Reticle */}
             <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl-xl shadow-sm" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr-xl shadow-sm" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl-xl shadow-sm" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br-xl shadow-sm" />
                
                {/* Scanning Laser Line */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-[scan_2s_linear_infinite]" />
             </div>
             
             <div className="absolute bottom-24 text-white/90 font-semibold text-sm bg-black/60 px-6 py-3 rounded-full backdrop-blur-md border border-white/10 text-center">
                Point at Mobile Money QR<br/>or any code
             </div>
          </div>
        )}

        {/* Result State */}
        {scannedResult && resultInfo && (
           <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white mb-6 shadow-2xl ${resultInfo.type === 'ussd' ? 'bg-emerald-500 shadow-emerald-500/40' : (resultInfo.type === 'url' ? 'bg-blue-600 shadow-blue-500/40' : 'bg-slate-700 shadow-slate-500/20')}`}>
                 <ICONS.Check className="w-10 h-10" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">{resultInfo.label} Detected</h2>
              
              <div className="w-full bg-white/10 rounded-xl p-4 mb-8 border border-white/5 text-center">
                 <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">Content</div>
                 <div className={`text-xl font-mono break-all select-all ${resultInfo.color}`}>
                    {getDisplayText(scannedResult)}
                 </div>
              </div>

              <div className="w-full space-y-3">
                 <button 
                   onClick={executeAction}
                   className={`w-full py-4 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${resultInfo.btnBg}`}
                 >
                   {copySuccess ? <ICONS.Check className="w-5 h-5" /> : <resultInfo.icon className="w-5 h-5" />}
                   {copySuccess ? 'Copied!' : resultInfo.action}
                 </button>
                 
                 <button 
                   onClick={resetScanner}
                   className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/10 active:scale-[0.98] transition-all"
                 >
                   Scan Another
                 </button>
              </div>
           </div>
        )}

      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
