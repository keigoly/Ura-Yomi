/**
 * Loading View コンポーネント
 */

import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { useThemeStore } from '../store/themeStore';
import type { AnalysisProgress, AnalysisStage } from '../types';

interface LoadingViewProps {
  progress: AnalysisProgress;
}

/**
 * ステージ表示ラベル
 */
const STAGE_LABELS: Record<AnalysisStage, string> = {
  fetching: 'コメント取得中',
  analyzing: 'AI解析中',
  complete: '完了',
};

function LoadingView({ progress }: LoadingViewProps) {
  const { reset } = useAnalysisStore();
  const { theme } = useThemeStore();
  const [showOverloadMessage, setShowOverloadMessage] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // 進捗率を計算（1%から100%）
  const percentage = progress.total > 0 
    ? Math.max(1, Math.min(100, Math.round((progress.current / progress.total) * 100)))
    : 1;

  // テーマをbodyに適用
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // 過負荷状態の検出（analyzingステージで20秒経過）
  useEffect(() => {
    if (progress.stage === 'analyzing') {
      // 解析開始時刻を記録
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
        setShowOverloadMessage(false);
      }

      // 20秒経過をチェック
      const checkOverload = () => {
        if (startTimeRef.current !== null) {
          const elapsed = Date.now() - startTimeRef.current;
          if (elapsed > 20000) {
            // 20秒（20000ミリ秒）を超えたらメッセージを表示
            setShowOverloadMessage(true);
          }
        }
      };

      // 定期的にチェック（1秒ごと）
      timerRef.current = setInterval(checkOverload, 1000);
      checkOverload(); // 即座にチェック

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      // analyzingステージでない場合はリセット
      startTimeRef.current = null;
      setShowOverloadMessage(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [progress.stage]);

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative ${
      isDark ? 'bg-[#0f0f0f]' : 'bg-gray-100'
    }`}>
      {/* 閉じるボタン（右上） */}
      <button
        onClick={reset}
        className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
          isDark 
            ? 'hover:bg-gray-800 text-gray-300' 
            : 'hover:bg-gray-100 text-gray-600'
        }`}
        title="キャンセル"
      >
        <X className="w-5 h-5" />
      </button>

      {/* 中央揃えのコンテンツ */}
      <div className={`flex flex-col items-center justify-center space-y-6 ${
        isDark ? 'text-white' : 'text-gray-800'
      }`}>
        {/* タイトル（中央揃え） */}
        <h2 className={`text-xl font-bold text-center ${isDark ? 'text-white' : 'text-gray-800'}`}>
          {STAGE_LABELS[progress.stage]}
        </h2>

        {/* ローダーアニメーション（中央、大きく） */}
        <div className="flex justify-center">
          <div className="loader"></div>
        </div>

        {/* Now Loadingメッセージ（中央揃え、アニメーション付き） */}
        <div className="flex flex-col items-center">
          <span className={`now-loading-text text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Now Loading
          </span>
        </div>

        {/* プログレスバー（進捗に応じて変化、アニメーション付き、サイズ固定） */}
        <div className={`w-full max-w-2xl rounded-full h-4 overflow-hidden ${
          isDark ? 'bg-gray-800' : 'bg-gray-200'
        }`} style={{ minHeight: '1rem' }}>
          <div 
            className="progress-bar-loader h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%`, minWidth: percentage > 0 ? '4px' : '0' }}
          ></div>
        </div>

        {/* 過負荷状態のメッセージ（analyzingステージで20秒経過後） */}
        {progress.stage === 'analyzing' && showOverloadMessage && (
          <div className={`mt-3 p-3 rounded-lg ${
            isDark 
              ? 'bg-yellow-900/30 border border-yellow-700' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <p className={`text-xs leading-relaxed text-center ${
              isDark ? 'text-yellow-300' : 'text-yellow-800'
            }`}>
              ⚠️ Geminiの要約に時間がかかっております。今しばらくお待ちください
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadingView;
