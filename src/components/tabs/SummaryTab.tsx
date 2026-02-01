/**
 * Summary Tab コンポーネント
 */

import type { AnalysisResult } from '../../types';

interface SummaryTabProps {
  result: AnalysisResult;
}

function SummaryTab({ result }: SummaryTabProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">全体の要約</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-700 whitespace-pre-line leading-relaxed">
            {result.summary}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">主要トピック</h3>
        <ul className="space-y-2">
          {result.topics.map((topic, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-blue-600 mt-1">•</span>
              <span className="text-gray-700">{topic}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default SummaryTab;
