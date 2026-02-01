/**
 * Loading View コンポーネント
 */

import { X } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
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
  const percentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          {STAGE_LABELS[progress.stage]}
        </h2>
        <button
          onClick={reset}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="キャンセル"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{progress.message}</span>
            <span>
              {progress.current.toLocaleString()} /{' '}
              {progress.total.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {progress.stage === 'fetching' && (
          <p className="text-xs text-gray-500">
            APIレート制限を考慮して、適切な間隔で取得しています...
          </p>
        )}

        {progress.stage === 'analyzing' && (
          <p className="text-xs text-gray-500">
            Gemini 3.0 Flashでコメントを解析中...
          </p>
        )}
      </div>
    </div>
  );
}

export default LoadingView;
