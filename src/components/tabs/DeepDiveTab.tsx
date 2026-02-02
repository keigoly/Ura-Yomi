/**
 * Deep Dive Tab コンポーネント
 */

import { Sparkles, AlertTriangle } from 'lucide-react';
import type { AnalysisResult } from '../../types';

interface DeepDiveTabProps {
  result: AnalysisResult;
}

function DeepDiveTab({ result }: DeepDiveTabProps) {
  // hiddenGemsが配列でない場合は空配列を使用
  const hiddenGems = Array.isArray(result.hiddenGems) ? result.hiddenGems : [];
  
  // controversyが配列でない場合は空配列を使用
  const controversy = Array.isArray(result.controversy) ? result.controversy : [];

  return (
    <div className="p-6 space-y-6">
      {/* Hidden Gems */}
      {hiddenGems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-800">Hidden Gems</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            いいね数は少ないが、洞察に富んだコメント
          </p>
          <div className="space-y-4">
            {hiddenGems.map((gem, index) => {
              // gemがオブジェクトでない場合はスキップ
              if (!gem || typeof gem !== 'object') {
                return null;
              }
              
              return (
                <div
                  key={index}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800 mb-1">
                        {gem.author || '不明'}
                      </p>
                      <p className="text-gray-700 text-sm leading-relaxed mb-2">
                        {gem.comment || ''}
                      </p>
                      {gem.reason && (
                        <p className="text-xs text-gray-500 italic">{gem.reason}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      {gem.likeCount || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controversy */}
      {controversy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-800">Controversy</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">意見が割れているポイント</p>
          <div className="space-y-3">
            {controversy.map((item, index) => {
              // itemがオブジェクトでない場合はスキップ
              if (!item || typeof item !== 'object') {
                return null;
              }
              
              return (
                <div
                  key={index}
                  className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                >
                  <h4 className="font-medium text-gray-800 mb-1">
                    {item.topic || 'トピック'}
                  </h4>
                  <p className="text-sm text-gray-700">
                    {item.description || ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {hiddenGems.length === 0 && controversy.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p>深掘りデータがありません</p>
        </div>
      )}
    </div>
  );
}

export default DeepDiveTab;
