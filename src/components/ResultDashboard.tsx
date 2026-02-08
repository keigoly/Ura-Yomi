/**
 * Result Dashboard コンポーネント
 */

import { useState, useEffect, useRef } from 'react';
import { FileDown, Copy, Check, Menu, X, ArrowLeft, Bookmark } from 'lucide-react';
import type { AnalysisResult, VideoInfo, YouTubeCommentThread } from '../types';
import { useDesignStore, BG_COLORS, isLightMode } from '../store/designStore';
import { useTranslation } from '../i18n/useTranslation';
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
  onBack?: () => void;
  onSave?: () => void;
}

function ResultDashboard({ result, videoInfo, comments, onBack, onSave }: ResultDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { fontSize, bgMode } = useDesignStore();
  const bgColor = BG_COLORS[bgMode];
  const isLight = isLightMode(bgMode);

  // メニューの外側をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);


  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const handleCopySummary = async () => {
    await navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setMenuOpen(false);
    showToast(t('result.toastCopied'));
  };

  const handleExportJson = () => {
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
          authorId: thread.topLevelComment.id.split('_')[0] || thread.topLevelComment.id,
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
    setMenuOpen(false);
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast(t('result.toastSaved'));
    }
    setMenuOpen(false);
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'summary', label: t('result.tabSummary') },
    { id: 'deepdive', label: t('result.tabDeepDive') },
    { id: 'comments', label: `${t('result.tabComments')} (${comments.length})` },
  ];

  return (
    <div
      className="h-full flex flex-col"
      style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontSize: `${fontSize}px`, backgroundColor: bgColor }}
    >
      {/* Header - 固定 */}
      <div
        className={`p-4 border-b ${isLight ? 'border-gray-200' : 'border-gray-800'}`}
        style={{ flexShrink: 0, backgroundColor: bgColor }}
      >
        {/* 解析結果タイトルとハンバーガーメニューを同じ行に配置 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'}`}
              >
                <ArrowLeft className={`w-5 h-5 ${isLight ? 'text-gray-600' : 'text-gray-300'}`} />
              </button>
            )}
            <h2 className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {t('result.title')}
            </h2>
          </div>
          {/* ハンバーガーメニュー */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-800 text-gray-300'}`}
              title={t('result.menu')}
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* ドロップダウンメニュー */}
            {menuOpen && (
              <div
                className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-2xl border z-[100] ${isLight ? 'border-gray-200' : 'border-gray-700'}`}
                style={{
                  backgroundColor: isLight ? '#ffffff' : '#1f2937',
                  opacity: 1,
                  backdropFilter: 'none',
                  boxShadow: isLight ? '0 10px 25px rgba(0, 0, 0, 0.15)' : '0 10px 25px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div className="py-1">
                  {/* 要約をコピー */}
                  <button
                    onClick={handleCopySummary}
                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-700 text-gray-200'}`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{t('result.copied')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">{t('result.copySummary')}</span>
                      </>
                    )}
                  </button>

                  {/* JSONでエクスポート */}
                  <button
                    onClick={handleExportJson}
                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-700 text-gray-200'}`}
                  >
                    <FileDown className="w-4 h-4" />
                    <span className="text-sm">{t('result.exportJson')}</span>
                  </button>

                  {/* 解析結果を保存 */}
                  {onSave && (
                    <button
                      onClick={handleSave}
                      className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${isLight ? 'hover:bg-gray-100 text-gray-700' : 'hover:bg-gray-700 text-gray-200'}`}
                    >
                      {saved ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{t('result.saved')}</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4" />
                          <span className="text-sm">{t('result.saveResult')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 動画情報（2行目） */}
        {videoInfo && (
          <p className={`text-sm mt-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
            {videoInfo.title || videoInfo.videoId} ({comments.length.toLocaleString()}{t('result.commentsCount')})
          </p>
        )}
      </div>

      {/* Tabs - 固定 */}
      <div
        className={`flex justify-center border-b ${isLight ? 'border-gray-200' : 'border-gray-800'}`}
        style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, backgroundColor: bgColor }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-500'
                : isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - スクロール可能 */}
      <div
        className="flex-1"
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          flex: '1 1 auto',
          backgroundColor: bgColor,
        }}
      >
        {activeTab === 'summary' && <SummaryTab result={result} />}
        {activeTab === 'deepdive' && <DeepDiveTab comments={comments} result={result} />}
        {activeTab === 'comments' && <CommentsTab comments={comments} />}
      </div>

      {/* トースト通知 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-toast-in">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${isLight ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}>
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultDashboard;
