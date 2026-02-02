/**
 * Result Dashboard コンポーネント
 */

import { useState } from 'react';
import { FileDown, Copy, Check } from 'lucide-react';
import type { AnalysisResult, VideoInfo, YouTubeCommentThread } from '../types';
import SummaryTab from './tabs/SummaryTab';
import DeepDiveTab from './tabs/DeepDiveTab';
import CommentsTab from './tabs/CommentsTab';

/**
 * タブの種類
 */
type TabType = 'summary' | 'deepdive' | 'comments';

interface ResultDashboardProps {
  result: AnalysisResult;
  videoInfo: VideoInfo | null;
  comments: YouTubeCommentThread[];
}

function ResultDashboard({ result, videoInfo, comments }: ResultDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [copied, setCopied] = useState(false);

  const handleExportJson = () => {
    // 全コメントをフラット化（親コメント + 返信）
    const allComments: Array<{
      id: string;
      text: string;
      author: string;
      authorId: string;
      likeCount: number;
      publishedAt: string;
      replyCount: number;
      isReply: boolean;
      parentId?: string;
    }> = comments.flatMap((thread) => {
      const commentList: Array<{
        id: string;
        text: string;
        author: string;
        authorId: string;
        likeCount: number;
        publishedAt: string;
        replyCount: number;
        isReply: boolean;
        parentId?: string;
      }> = [
        {
          id: thread.topLevelComment.id,
          text: thread.topLevelComment.text,
          author: thread.topLevelComment.author,
          authorId: thread.topLevelComment.id.split('_')[0] || thread.topLevelComment.id, // IDからauthorIdを推定
          likeCount: thread.topLevelComment.likeCount,
          publishedAt: thread.topLevelComment.publishedAt,
          replyCount: thread.topLevelComment.replyCount,
          isReply: false,
        },
      ];

      if (thread.replies) {
        thread.replies.forEach((reply) => {
          commentList.push({
            id: reply.id,
            text: reply.text,
            author: reply.author,
            authorId: reply.id.split('_')[0] || reply.id,
            likeCount: reply.likeCount,
            publishedAt: reply.publishedAt,
            replyCount: 0,
            isReply: true,
            parentId: thread.topLevelComment.id,
          });
        });
      }

      return commentList;
    });

    const data = {
      videoInfo,
      analysisResult: result,
      comments: allComments,
      commentsCount: allComments.length,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-comments-with-ai-analysis-${videoInfo?.videoId || 'unknown'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = async () => {
    await navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'summary', label: '要約' },
    { id: 'deepdive', label: '深掘り' },
    { id: 'comments', label: `コメント一覧 (${comments.length})` },
  ];

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
            {videoInfo.title || videoInfo.videoId} (
            {comments.length.toLocaleString()}件のコメント)
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'summary' && <SummaryTab result={result} />}
        {activeTab === 'deepdive' && <DeepDiveTab result={result} />}
        {activeTab === 'comments' && <CommentsTab comments={comments} />}
      </div>
    </div>
  );
}

export default ResultDashboard;
