/**
 * Result Dashboard コンポーネント
 */

import { useState, useEffect, useRef } from 'react';
import { FileDown, Copy, Check, Moon, Sun, Menu, X } from 'lucide-react';
import type { AnalysisResult, VideoInfo, YouTubeCommentThread } from '../types';
import { useThemeStore } from '../store/themeStore';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useThemeStore();

  // テーマをbodyに適用
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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


  const handleCopySummary = async () => {
    await navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setMenuOpen(false); // メニューを閉じる
  };

  const handleToggleTheme = () => {
    toggleTheme();
    setMenuOpen(false); // メニューを閉じる
  };

  const handleExportJson = () => {
    // 既存のhandleExportJsonの処理をここに移動
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
    setMenuOpen(false); // メニューを閉じる
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'summary', label: '要約' },
    { id: 'deepdive', label: '深掘り' },
    { id: 'comments', label: `コメント一覧 (${comments.length})` },
  ];

  return (
    <div 
      className={`h-full flex flex-col ${theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-white'}`}
      style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header - 固定 */}
      <div 
        className={`p-4 border-b ${theme === 'dark' ? 'bg-[#0f0f0f] border-gray-800' : 'bg-white border-gray-200'}`}
        style={{ flexShrink: 0 }}
      >
        {/* 解析結果タイトルとハンバーガーメニューを同じ行に配置 */}
        <div className="flex items-center justify-between mb-2">
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
            解析結果
          </h2>
          {/* ハンバーガーメニュー */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-gray-800 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="メニュー"
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
                className={`absolute right-0 top-full mt-2 w-48 rounded-lg shadow-2xl border z-[100] ${
                  theme === 'dark' 
                    ? 'border-gray-700' 
                    : 'border-gray-200'
                }`}
                style={{ 
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  opacity: 1,
                  backdropFilter: 'none',
                  boxShadow: theme === 'dark' 
                    ? '0 10px 25px rgba(0, 0, 0, 0.5)' 
                    : '0 10px 25px rgba(0, 0, 0, 0.15)'
                }}
              >
                <div className="py-1">
                  {/* ライトモード/ダークモード切り替え */}
                  <button
                    onClick={handleToggleTheme}
                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                      theme === 'dark' 
                        ? 'hover:bg-gray-700 text-gray-200' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-4 h-4" />
                        <span className="text-sm">ライトモードに切り替え</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4" />
                        <span className="text-sm">ダークモードに切り替え</span>
                      </>
                    )}
                  </button>

                  {/* 要約をコピー */}
                  <button
                    onClick={handleCopySummary}
                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                      theme === 'dark' 
                        ? 'hover:bg-gray-700 text-gray-200' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">コピーしました</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="text-sm">要約をコピー</span>
                      </>
                    )}
                  </button>

                  {/* JSONでエクスポート */}
                  <button
                    onClick={handleExportJson}
                    className={`w-full px-4 py-2 text-left flex items-center gap-3 transition-colors ${
                      theme === 'dark' 
                        ? 'hover:bg-gray-700 text-gray-200' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <FileDown className="w-4 h-4" />
                    <span className="text-sm">JSONでエクスポート</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 動画情報（2行目） */}
        {videoInfo && (
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {videoInfo.title || videoInfo.videoId} ({comments.length.toLocaleString()}件のコメント)
          </p>
        )}
      </div>

      {/* Tabs - 固定 */}
      <div 
        className={`flex justify-center border-b ${theme === 'dark' ? 'bg-[#0f0f0f] border-gray-800' : 'bg-white border-gray-200'}`}
        style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 font-medium transition-colors relative ${
              activeTab === tab.id
                ? theme === 'dark'
                  ? 'text-blue-400'
                  : 'text-blue-600'
                : theme === 'dark'
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'
              }`} />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content - スクロール可能 */}
      <div 
        className={`flex-1 ${theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-white'}`}
        style={{ 
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
          flex: '1 1 auto'
        }}
      >
        {activeTab === 'summary' && <SummaryTab result={result} />}
        {activeTab === 'deepdive' && <DeepDiveTab comments={comments} result={result} />}
        {activeTab === 'comments' && <CommentsTab comments={comments} />}
      </div>
    </div>
  );
}

export default ResultDashboard;
