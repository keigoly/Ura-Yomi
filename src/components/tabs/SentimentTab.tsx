/**
 * Sentiment Tab コンポーネント
 */

import type { AnalysisResult } from '../../types';

interface SentimentTabProps {
  result: AnalysisResult;
}

/**
 * 感情バーコンポーネント
 */
interface SentimentBarProps {
  label: string;
  value: number;
  colorClass: string;
  textColorClass: string;
}

function SentimentBar({
  label,
  value,
  colorClass,
  textColorClass,
}: SentimentBarProps) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-700">{label}</span>
        <span className={`font-medium ${textColorClass}`}>
          {value.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`${colorClass} h-full transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SentimentTab({ result }: SentimentTabProps) {
  const { positive, negative, neutral } = result.sentiment;

  return (
    <div className="p-6 space-y-6">
      {/* Sentiment Bars */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">感情分析</h3>
        <div className="space-y-4">
          <SentimentBar
            label="ポジティブ"
            value={positive}
            colorClass="bg-green-500"
            textColorClass="text-green-600"
          />
          <SentimentBar
            label="ネガティブ"
            value={negative}
            colorClass="bg-red-500"
            textColorClass="text-red-600"
          />
          <SentimentBar
            label="ニュートラル"
            value={neutral}
            colorClass="bg-gray-500"
            textColorClass="text-gray-600"
          />
        </div>
      </div>

      {/* Keywords */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          頻出キーワード
        </h3>
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
