/**
 * Result Dashboard コンポーネント
 */

import { useState } from 'react';
import { FileDown, Copy, Check } from 'lucide-react';
import { AnalysisResult } from '../services/geminiApi';
import { YouTubeCommentThread } from '../services/youtubeApi';
import SummaryTab from './tabs/SummaryTab';
import DeepDiveTab from './tabs/DeepDiveTab';
import SentimentTab from './tabs/SentimentTab';

interface ResultDashboardProps {
  result: AnalysisResult;
  videoInfo: { videoId: string; title?: string } | null;
  comments: YouTubeCommentThread[];
}

function ResultDashboard({ result, videoInfo, comments }: ResultDashboardProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'deepdive' | 'sentiment'>('summary');
  const [copied, setCopied] = useState(false);

  const handleExportJson = () => {
    const data = {
      videoInfo,
      analysisResult: result,
      commentsCount: comments.length,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tubeinsight-analysis-${videoInfo?.videoId || 'unknown'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = async () => {
    await navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-800">解析結果</h2>
          <div className="flex gap-2">
            <button
              onClick={handleCopySummary}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="要約をコピー"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={handleExportJson}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="JSONでエクスポート"
            >
              <FileDown className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        {videoInfo && (
          <p className="text-sm text-gray-600">
            {videoInfo.title || videoInfo.videoId} ({comments.length.toLocaleString()}件のコメント)
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'summary'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          要約
        </button>
        <button
          onClick={() => setActiveTab('deepdive')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'deepdive'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          深掘り
        </button>
        <button
          onClick={() => setActiveTab('sentiment')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'sentiment'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          感情
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'summary' && <SummaryTab result={result} />}
        {activeTab === 'deepdive' && <DeepDiveTab result={result} />}
        {activeTab === 'sentiment' && <SentimentTab result={result} />}
      </div>
    </div>
  );
}

export default ResultDashboard;
