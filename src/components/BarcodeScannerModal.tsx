import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Keyboard,
  Check,
  AlertCircle,
  Zap,
  ZapOff,
  SwitchCamera,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
];

function playBeepFeedback() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {
    // AudioContext blocked or not supported
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate([60, 40, 60]);
    } catch (e) {}
  }
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras / EAN',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerId = 'html5-barcode-scanner-viewport';

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    }
    setIsScanning(false);
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      if (!decodedText) return;
      playBeepFeedback();
      await stopScanner();
      onScan(decodedText.trim());
      onClose();
    },
    [onScan, onClose, stopScanner]
  );

  const startScanner = useCallback(
    async (cameraIdOrFacing?: string | { facingMode: string }) => {
      await stopScanner();
      setCameraError(null);
      setHasCamera(null);

      try {
        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        html5QrCodeRef.current = scanner;

        // Try getting available cameras list
        try {
          const deviceList = await Html5Qrcode.getCameras();
          if (deviceList && deviceList.length > 0) {
            setCameras(deviceList);
          }
        } catch (e) {
          // Camera listing might require permission first
        }

        const cameraConfig = cameraIdOrFacing || { facingMode: 'environment' };

        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const width = Math.floor(Math.min(viewfinderWidth * 0.85, 320));
              const height = Math.floor(Math.min(viewfinderHeight * 0.55, 180));
              return { width: Math.max(width, 200), height: Math.max(height, 100) };
            },
            aspectRatio: 1.333334,
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Frame detection tick
          }
        );

        setHasCamera(true);
        setIsScanning(true);

        // Check if torch/flashlight is supported
        try {
          const track = (scanner as any).getRunningTrackCameraCapabilities?.();
          if (track && track.torchFeature && track.torchFeature().isSupported()) {
            setHasTorch(true);
          }
        } catch (e) {}
      } catch (err: any) {
        console.warn('Barcode Scanner start error:', err);
        setHasCamera(false);
        setIsScanning(false);
        const msg = String(err?.message || err || '');
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setCameraError('Permissão da câmera foi negada. Conceda acesso ou digite o código abaixo.');
        } else if (msg.includes('NotFound') || msg.includes('DevicesNotFoundError')) {
          setCameraError('Nenhuma câmera foi encontrada no seu dispositivo.');
        } else {
          setCameraError('Não foi possível iniciar a câmera em tempo real. Você pode carregar uma foto ou digitar o código abaixo.');
        }
      }
    },
    [handleScanSuccess, stopScanner]
  );

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow DOM container element to mount
      const timer = setTimeout(() => {
        startScanner({ facingMode: 'environment' });
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  // Switch between available cameras
  const handleToggleCamera = async () => {
    if (cameras.length <= 1) {
      // Toggle facing mode directly
      const nextMode = selectedCameraIndex === 0 ? 'user' : 'environment';
      setSelectedCameraIndex(selectedCameraIndex === 0 ? 1 : 0);
      await startScanner({ facingMode: nextMode });
    } else {
      const nextIndex = (selectedCameraIndex + 1) % cameras.length;
      setSelectedCameraIndex(nextIndex);
      await startScanner(cameras[nextIndex].id);
    }
  };

  // Toggle flashlight
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    try {
      const next = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        // @ts-ignore
        advanced: [{ torch: next }],
      });
      setTorchOn(next);
    } catch (e) {
      console.warn('Torch toggle not supported on this track', e);
    }
  };

  // Scan from photo / image file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFile(true);
      setCameraError(null);

      // Create a temporary scanner instance if not present
      const scanner =
        html5QrCodeRef.current ||
        new Html5Qrcode(containerId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });

      const decodedText = await scanner.scanFile(file, false);
      if (decodedText) {
        handleScanSuccess(decodedText);
      }
    } catch (err: any) {
      setCameraError('Não foi possível reconhecer nenhum código de barras na imagem enviada.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="barcode-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Aponte para o código EAN / Barras ou QR
              </p>
            </div>
          </div>
          <button
            id="close-scanner-btn"
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video / Camera Viewport */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[280px] max-h-[360px] overflow-hidden">
          {/* Container for Html5Qrcode */}
          <div id={containerId} className="w-full h-full min-h-[280px] object-cover" />

          {/* Overlay Aim Frame */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
              <div className="w-[82%] max-w-[280px] h-[140px] border-2 border-emerald-400/90 rounded-2xl relative shadow-2xl shadow-emerald-500/30 flex items-center justify-center">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-lg -mb-1 -mr-1" />
                <div className="w-full h-0.5 bg-emerald-400/80 shadow-md animate-pulse" />
              </div>
              <span className="mt-3 text-[11px] font-semibold text-white/95 bg-black/70 px-3 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                Posicione o código de barras dentro da moldura
              </span>
            </div>
          )}

          {/* Quick Camera Toolbar on Top Right */}
          {isScanning && (
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  title={torchOn ? 'Desligar Flash' : 'Ligar Flash'}
                  className={`p-2 rounded-xl backdrop-blur-md border text-xs transition-colors shadow-lg ${
                    torchOn
                      ? 'bg-amber-500 text-white border-amber-400'
                      : 'bg-black/60 text-white/90 hover:bg-black/80 border-white/20'
                  }`}
                >
                  {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleCamera}
                title="Alternar Câmera"
                className="p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white/90 backdrop-blur-md border border-white/20 text-xs transition-colors shadow-lg"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Camera Error / Fallback State */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-slate-300 z-20">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-2.5" />
              <p className="text-sm font-semibold text-slate-100 mb-1">Atenção</p>
              <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">{cameraError}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  id="retry-camera-btn"
                  type="button"
                  onClick={() => startScanner()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white border border-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Tentar Câmera Novamente
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs text-white transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Ler de Imagem / Foto
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar: Scan from gallery photo + Manual input */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Outras formas de entrada:
            </span>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              disabled={isProcessingFile}
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isProcessingFile ? 'Lendo imagem...' : 'Carregar Foto de Código'}</span>
            </button>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="scanner-manual-input"
                  type="text"
                  placeholder="Digitar código de barras ou SKU..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>
              <button
                id="scanner-confirm-manual-btn"
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
              >
                <Check className="w-4 h-4" /> Usar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
