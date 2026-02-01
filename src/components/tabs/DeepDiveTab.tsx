/**
 * Deep Dive Tab コンポーネント
 */

import { Sparkles, AlertTriangle } from 'lucide-react';
import type { AnalysisResult } from '../../types';

interface DeepDiveTabProps {
  result: AnalysisResult;
}

function DeepDiveTab({ result }: DeepDiveTabProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Hidden Gems */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-800">Hidden Gems</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          いいね数は少ないが、洞察に富んだコメント
        </p>
        <div className="space-y-4">
          {result.hiddenGems.map((gem, index) => (
            <div
              key={index}
              className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 mb-1">
                    {gem.author}
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-2">
                    {gem.comment}
                  </p>
                  <p className="text-xs text-gray-500 italic">{gem.reason}</p>
                </div>
                <span className="text-xs text-gray-500 ml-2">
                  {gem.likeCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controversy */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-800">Controversy</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">意見が割れているポイント</p>
        <div className="space-y-3">
          {result.controversy.map((item, index) => (
            <div
              key={index}
              className="bg-orange-50 border border-orange-200 rounded-lg p-4"
            >
              <h4 className="font-medium text-gray-800 mb-1">{item.topic}</h4>
              <p className="text-sm text-gray-700">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DeepDiveTab;
