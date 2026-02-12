/**
 * Loading View コンポーネント
 */

import { useEffect, useState, useRef } from 'react';
import { StopCircle } from 'lucide-react';
import { useDesignStore, BG_COLORS, isLightMode } from '../store/designStore';
import { useTranslation } from '../i18n/useTranslation';
import type { AnalysisProgress, AnalysisStage } from '../types';

interface LoadingViewProps {
  progress: AnalysisProgress;
  onCancel: () => void;
}

function LoadingView({ progress, onCancel }: LoadingViewProps) {
  const { t } = useTranslation();
  const { fontSize, bgMode } = useDesignStore();
  const isLight = isLightMode(bgMode);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showOverloadMessage, setShowOverloadMessage] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const STAGE_LABELS: Record<AnalysisStage, string> = {
    fetching: t('loading.fetching'),
    analyzing: t('loading.analyzing'),
    complete: t('loading.complete'),
  };

  // 過負荷状態の検出（analyzingステージで20秒経過）
  useEffect(() => {
    if (progress.stage === 'analyzing') {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        setShowOverloadMessage(false);
      }

      const checkOverload = () => {
        if (startTimeRef.current !== null) {
          const elapsed = Date.now() - startTimeRef.current;
          if (elapsed > 20000) {
            setShowOverloadMessage(true);
          }
        }
      };

      timerRef.current = setInterval(checkOverload, 1000);
      checkOverload();

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      startTimeRef.current = null;
      setShowOverloadMessage(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [progress.stage]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative"
      style={{ backgroundColor: BG_COLORS[bgMode], fontSize: `${fontSize}px` }}
    >
      <div className={`flex flex-col items-center justify-center space-y-6 ${isLight ? 'text-gray-900' : 'text-white'}`}>
        <h2 className={`text-xl font-bold text-center ${isLight ? 'text-gray-900' : 'text-white'}`}>
          {STAGE_LABELS[progress.stage]}
        </h2>

        <div className="flex justify-center">
          <div className="loader"></div>
        </div>

        <div className="flex flex-col items-center">
          <span className={`now-loading-text text-sm ${isLight ? 'text-gray-500' : 'text-gray-300'}`}>
            Now Loading
          </span>
        </div>

        <div className={`w-full max-w-2xl rounded-full h-4 overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-gray-800'}`} style={{ minHeight: '1rem' }}>
          <div
            className="progress-bar-loader h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(1, progress.total > 0 ? (progress.current / progress.total) * 100 : 0))}%`,
              transition: 'width 0.3s ease-out',
            }}
          ></div>
        </div>

        {progress.stage === 'analyzing' && showOverloadMessage && (
          <div className={`mt-3 p-3 rounded-lg border ${isLight ? 'bg-yellow-50 border-yellow-300' : 'bg-yellow-900/30 border-yellow-700'}`}>
            <p className={`text-xs leading-relaxed text-center ${isLight ? 'text-yellow-700' : 'text-yellow-300'}`}>
              {t('loading.overload')}
            </p>
          </div>
        )}

        <p className={`text-xs ${isLight ? 'text-red-500' : 'text-red-400'}`}>
          {t('loading.doNotClose')}
        </p>

        <button
          onClick={() => setShowCancelDialog(true)}
          className="mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <StopCircle className="w-5 h-5" />
          {t('loading.cancel')}
        </button>
      </div>

      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <div className={`mx-4 w-full max-w-xs rounded-xl p-6 shadow-2xl ${isLight ? 'bg-white' : 'bg-gray-800'}`}>
            <p className={`text-center font-semibold mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {t('loading.confirmCancel')}
            </p>
            <p className={`text-center text-xs mb-6 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              {t('loading.creditWarning')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
              >
                {t('loading.no')}
              </button>
              <button
                onClick={() => {
                  setShowCancelDialog(false);
                  onCancel();
                }}
                className="flex-1 py-2.5 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                {t('loading.yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoadingView;
