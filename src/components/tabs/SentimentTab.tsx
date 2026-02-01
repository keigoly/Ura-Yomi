/**
 * Sentiment Tab コンポーネント
 */

import { AnalysisResult } from '../../services/geminiApi';

interface SentimentTabProps {
  result: AnalysisResult;
}

function SentimentTab({ result }: SentimentTabProps) {
  const { positive, negative, neutral } = result.sentiment;

  return (
    <div className="p-6 space-y-6">
      {/* Sentiment Bars */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">感情分析</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700">ポジティブ</span>
              <span className="font-medium text-green-600">{positive.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all"
                style={{ width: `${positive}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700">ネガティブ</span>
              <span className="font-medium text-red-600">{negative.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-red-500 h-full transition-all"
                style={{ width: `${negative}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700">ニュートラル</span>
              <span className="font-medium text-gray-600">{neutral.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gray-500 h-full transition-all"
                style={{ width: `${neutral}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Keywords */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">頻出キーワード</h3>
        <div className="flex flex-wrap gap-2">
          {result.keywords.map((keyword, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SentimentTab;
