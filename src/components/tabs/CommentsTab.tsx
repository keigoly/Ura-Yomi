/**
 * コメント一覧タブコンポーネント
 * YouTube風のデザインでコメントを表示
 *
 * スレッドラインはYouTube本家のCSSロジックを使用:
 * - DOM順序: コンテナの最後の子要素として配置
 * - CSS: position: absolute; top: 40px; height: calc(100% - 40px);
 */

import { useState, useMemo } from 'react';
import { ThumbsUp, ThumbsDown, Search, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import type { YouTubeCommentThread } from '../../types';
import { useDesignStore, isLightMode, BG_COLORS } from '../../store/designStore';
import { useTranslation } from '../../i18n/useTranslation';

const FREE_VISIBLE_THREADS = 50;

interface CommentsTabProps {
  comments: YouTubeCommentThread[];
  plan?: 'free' | 'pro';
}

type SortField = 'popularity' | 'likeCount' | 'publishedAt';
type SortOrder = 'asc' | 'desc';

/**
 * HTMLタグをテキストに変換
 */
function formatCommentText(text: string): string {
  if (!text) return '';

  // <br>タグを改行に変換
  let formatted = text.replace(/<br\s*\/?>/gi, '\n');

  // その他のHTMLタグを削除
  formatted = formatted.replace(/<[^>]+>/g, '');

  // HTMLエンティティをデコード
  formatted = formatted
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return formatted.trim();
}

/**
 * 相対時間を計算（例：「2時間前」）
 */
function getRelativeTime(dateString: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffYear > 0) return t('comments.yearsAgo', { n: diffYear });
    if (diffMonth > 0) return t('comments.monthsAgo', { n: diffMonth });
    if (diffDay > 0) return t('comments.daysAgo', { n: diffDay });
    if (diffHour > 0) return t('comments.hoursAgo', { n: diffHour });
    if (diffMin > 0) return t('comments.minutesAgo', { n: diffMin });
    return t('comments.justNow');
  } catch {
    return dateString;
  }
}

/**
 * アバターの初期文字を取得（ユーザー名の最初の文字）
 */
function getAvatarInitial(author: string): string {
  if (!author) return '?';
  // @を除去して最初の文字を取得
  const cleanAuthor = author.replace(/^@/, '');
  return cleanAuthor.charAt(0).toUpperCase();
}

/**
 * コメントコンポーネント（YouTube風）
 */
function CommentItem({
  comment,
  isReply = false,
  isLight = false,
  onToggleReplies,
  t,
}: {
  comment: {
    id: string;
    text: string;
    author: string;
    authorProfileImageUrl?: string;
    likeCount: number;
    publishedAt: string;
    replyCount: number;
  };
  isReply?: boolean;
  isLight?: boolean;
  onToggleReplies?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const commentText = formatCommentText(comment.text);
  const shouldTruncate = commentText.length > 200;
  const displayText = shouldTruncate && !expanded
    ? commentText.substring(0, 200) + '...'
    : commentText;

  return (
    <div className={`flex gap-3 relative ${isReply ? 'reply-comment' : 'parent-comment'}`}>
      {/* アバター */}
      <div className={`flex-shrink-0 relative ${isReply ? 'avatar-reply' : 'avatar-parent'}`}>
        {comment.authorProfileImageUrl && !imageError ? (
          <img
            src={comment.authorProfileImageUrl}
            alt={comment.author}
            className={`rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity ${isLight ? 'border-gray-300' : 'border-gray-700'} ${isReply ? 'w-6 h-6' : 'w-10 h-10'}`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={`rounded-full flex items-center justify-center font-medium transition-colors cursor-pointer ${isLight ? 'bg-gray-300 text-gray-600 hover:bg-gray-400' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'} ${isReply ? 'w-6 h-6 text-xs' : 'w-10 h-10 text-sm'}`}>
            {getAvatarInitial(comment.author)}
          </div>
        )}
      </div>

      {/* コメント本体 */}
      <div className="flex-1 min-w-0">
        {/* ヘッダー（投稿者名 + 投稿日時） */}
        <div className="flex items-center gap-2 mb-1">
          <a
            href={`https://www.youtube.com/${comment.author}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-medium transition-colors ${isLight ? 'text-gray-900 hover:text-blue-600' : 'text-white hover:text-blue-400'}`}
          >
            {comment.author}
          </a>
          <span className="text-sm text-gray-400">
            {getRelativeTime(comment.publishedAt, t)}
          </span>
        </div>

        {/* コメント本文 */}
        <div className="mb-2">
          <p className={`whitespace-pre-wrap break-words leading-relaxed ${isLight ? 'text-gray-800' : 'text-gray-100'}`}>
            {displayText}
          </p>
          {shouldTruncate && (
            <button
              onClick={() => setExpanded(!expanded)}
              className={`text-sm mt-1 font-medium ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
            >
              {expanded ? t('comments.showLess') : t('comments.showMore')}
            </button>
          )}
        </div>

        {/* エンゲージメントバー（いいね/低評価/返信） */}
        <div className="flex items-center gap-4 mt-2">
          {/* いいねボタン */}
          <button className={`flex items-center gap-1 transition-colors ${isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}`}>
            <ThumbsUp className="w-4 h-4" />
            <span className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>{comment.likeCount > 0 ? comment.likeCount.toLocaleString() : ''}</span>
          </button>

          {/* 低評価ボタン */}
          <button className={`flex items-center gap-1 transition-colors ${isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}`}>
            <ThumbsDown className="w-4 h-4" />
          </button>

          {/* 返信ボタン */}
          {!isReply && (
            <button
              onClick={onToggleReplies}
              className={`text-sm transition-colors font-medium ${isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {t('comments.reply')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentsTab({ comments, plan = 'free' }: CommentsTabProps) {
  const { t } = useTranslation();
  const { bgMode } = useDesignStore();
  const isLight = isLightMode(bgMode);
  const isFree = plan !== 'pro';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('popularity');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // スレッド構造を保持したままソート
  const sortedThreads = useMemo(() => {
    // 投稿者のコメントを除外
    const filteredThreads = comments.filter((thread) => {
      const comment = thread.topLevelComment as any;
      // isUploaderフラグがtrueの場合は除外
      return !comment.isUploader;
    });

    const threads = [...filteredThreads];

    // 人気順の場合はいいね数でソート（固定コメントも含めて）
    if (sortField === 'popularity') {
      threads.sort((a, b) => {
        // 固定コメントも人気順のアルゴリズムに組み込む（いいね数でソート）
        const aLikes = a.topLevelComment.likeCount;
        const bLikes = b.topLevelComment.likeCount;
        // 降順（いいね数が多い順）
        return bLikes - aLikes;
      });
      return threads;
    }

    threads.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'likeCount':
          aValue = a.topLevelComment.likeCount;
          bValue = b.topLevelComment.likeCount;
          break;
        case 'publishedAt':
          aValue = new Date(a.topLevelComment.publishedAt).getTime();
          bValue = new Date(b.topLevelComment.publishedAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return threads;
  }, [comments, sortField, sortOrder]);

  // 検索フィルタ
  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return sortedThreads;

    const query = searchQuery.toLowerCase();
    return sortedThreads.filter((thread) => {
      // 親コメントでマッチ
      const matchesTop =
        thread.topLevelComment.text.toLowerCase().includes(query) ||
        thread.topLevelComment.author.toLowerCase().includes(query);

      // 返信でマッチ
      const matchesReplies = thread.replies?.some(
        (reply) =>
          reply.text.toLowerCase().includes(query) ||
          reply.author.toLowerCase().includes(query)
      );

      return matchesTop || matchesReplies;
    });
  }, [sortedThreads, searchQuery]);

  // 全コメント数（検索結果含む）
  const totalCommentCount = useMemo(() => {
    return filteredThreads.reduce((sum, thread) => {
      return sum + 1 + (thread.replies?.length || 0);
    }, 0);
  }, [filteredThreads]);

  // ページネーション: 表示するスレッド
  // Freeプラン: 50件 + フェードアウト用に数件追加表示
  const effectiveVisibleCount = isFree
    ? Math.min(FREE_VISIBLE_THREADS + 7, filteredThreads.length)
    : visibleCount;
  const visibleThreads = useMemo(() => {
    return filteredThreads.slice(0, effectiveVisibleCount);
  }, [filteredThreads, effectiveVisibleCount]);

  const remainingCount = filteredThreads.length - visibleCount;

  const handleSortChange = (field: SortField) => {
    setVisibleCount(PAGE_SIZE); // ソート変更時にリセット
    if (field === 'popularity') {
      setSortField('popularity');
    } else if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleReplies = (threadId: string) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(threadId)) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-inherit">
      {/* 検索とソートバー（固定ヘッダー） */}
      <div className={`p-4 border-b flex-shrink-0 ${isLight ? 'border-gray-200' : 'border-gray-700'} bg-inherit`}>
        <div className="space-y-3">
          {/* 検索バー */}
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isLight ? 'text-gray-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder={t('comments.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLight ? 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400' : 'border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500'}`}
            />
          </div>

          {/* ソートボタン */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSortChange('popularity')}
              className={`px-4 py-2 text-sm rounded-full transition-colors flex items-center gap-2 ${
                sortField === 'popularity'
                  ? 'bg-blue-600 text-white font-medium'
                  : isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              {t('comments.sortPopularity')}
            </button>
            <button
              onClick={() => handleSortChange('likeCount')}
              className={`px-4 py-2 text-sm rounded-full transition-colors flex items-center gap-2 ${
                sortField === 'likeCount'
                  ? 'bg-blue-600 text-white font-medium'
                  : isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              {t('comments.sortLikes')} {sortField === 'likeCount' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => handleSortChange('publishedAt')}
              className={`px-4 py-2 text-sm rounded-full transition-colors flex items-center gap-2 ${
                sortField === 'publishedAt'
                  ? 'bg-blue-600 text-white font-medium'
                  : isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              {t('comments.sortDate')} {sortField === 'publishedAt' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>

          {/* 統計情報 */}
          <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
            {t('comments.totalComments', { count: totalCommentCount })}
            {searchQuery && t('comments.searchResults', { count: filteredThreads.length })}
          </div>
        </div>
      </div>

      {/* コメント一覧（スクロール可能） */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 bg-inherit">
        {filteredThreads.length === 0 ? (
          <div className={`text-center py-12 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
            {searchQuery ? t('comments.noResults') : t('comments.noComments')}
          </div>
        ) : (
          <div className="space-y-6">
            {visibleThreads.map((thread, index) => {
              const isExpanded = expandedThreads.has(thread.id);
              const hasReplies = thread.replies && thread.replies.length > 0;
              const showReplies = hasReplies && isExpanded;
              // Freeプラン: 50件以降はフェードアウト（50件目からグラデーション開始）
              const isFaded = isFree && index >= FREE_VISIBLE_THREADS;
              const fadeOpacity = isFaded
                ? Math.max(0.08, 1 - (index - FREE_VISIBLE_THREADS) * 0.15)
                : 1;
              return (
                <div
                  key={thread.id}
                  className={`youtube-comment-thread ${hasReplies ? 'has-replies' : 'no-replies'} ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
                  style={isFaded ? { opacity: fadeOpacity, filter: `blur(${Math.min(4, (index - FREE_VISIBLE_THREADS) * 0.7)}px)`, pointerEvents: 'none', userSelect: 'none' } : undefined}
                >
                  {/* 親コメント */}
                  <div className="comment-parent">
                    <CommentItem
                      comment={thread.topLevelComment}
                      isReply={false}
                      isLight={isLight}
                      onToggleReplies={() => toggleReplies(thread.id)}
                      t={t}
                    />
                  </div>

                  {/* ========================================================================
                   * 返信セクション - YouTube本家3パーツ構成
                   *
                   * 本家仕様:
                   * - ytSubThreadConnection: L字接続パーツ（高さ30px固定）
                   * - ytSubThreadContinuation: 縦線継続パーツ
                   * - スレッドラインコンテナを親に配置し、マスク処理不要
                   * ======================================================================== */}
                  {hasReplies && (
                    <div className="comment-replies-section" style={{ position: 'relative' }}>
                      {/* ===== 折りたたみ時: ボタンのみ ===== */}
                      {!isExpanded && (
                        <div className="replies-toggle-wrapper" style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          height: '24px',
                          marginTop: '0px',  // ボタンの位置を基準にするため0pxに設定
                        }}>
                          <button
                            onClick={() => toggleReplies(thread.id)}
                            className="replies-toggle-btn"
                          >
                            <ChevronDown className="w-4 h-4" />
                            {t('comments.repliesCount', { count: thread.replies?.length || 0 })}
                          </button>
                        </div>
                      )}

                      {/* ===== 展開時: 返信リスト + 非表示ボタン ===== */}
                      {showReplies && thread.replies && (
                        <>
                          <div className="replies-container">
                            {thread.replies.map((reply) => (
                              <div key={reply.id} className="reply-wrapper" style={{ position: 'relative' }}>
                                <div
                                  className="reply-branch"
                                  style={{
                                    position: 'absolute',
                                    left: '-57px',
                                    top: '0',
                                    width: '53px',
                                    height: '12px',
                                    borderStyle: 'solid',
                                    borderWidth: '0 0 2px 0',
                                    borderColor: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                                    pointerEvents: 'none',
                                  }}
                                />
                                <CommentItem
                                  comment={reply}
                                  isReply={true}
                                  isLight={isLight}
                                  t={t}
                                />
                              </div>
                            ))}
                          </div>

                          <div className="replies-toggle-wrapper replies-toggle-bottom" style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            height: '24px',
                            marginTop: '0px',  // ボタンの位置を基準にするため0pxに設定
                          }}>
                            <button
                              onClick={() => toggleReplies(thread.id)}
                              className="replies-toggle-btn"
                            >
                              <ChevronUp className="w-4 h-4" />
                              {t('comments.hideReplies')}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ========================================================================
                   * スレッドラインコンテナ（縦線 + L字）
                   * 折りたたみ時用: 「N件の返信」ボタンに接続
                   * ======================================================================== */}
                  {hasReplies && !isExpanded && (
                    <div
                      className="thread-line-container"
                      style={{
                        position: 'absolute',
                        left: '19px',
                        top: '40px',
                        // 折りたたみ時のボタン用: border-bottom 32pxで正解
                        bottom: '32px',
                        display: 'flex',
                        flexDirection: 'column',
                        width: '2px',
                        zIndex: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      {/* 縦線（flex-grow で自動伸縮） */}
                      <div
                        className="thread-line-continuation"
                        style={{
                          flexGrow: 1,
                          width: '0px',
                          borderLeft: isLight ? '2px solid rgba(0, 0, 0, 0.15)' : '2px solid rgba(255, 255, 255, 0.15)',
                        }}
                      />
                      {/* L字接続パーツ */}
                      <div
                        className="thread-line-connection"
                        style={{
                          height: '18px',
                          width: '33px',
                          borderStyle: 'solid',
                          borderWidth: '0 0 2px 2px',
                          borderColor: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                          borderBottomLeftRadius: '16px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}

                  {/* ========================================================================
                   * スレッドラインコンテナ（縦線 + L字）
                   * 展開時用: 「返信を非表示」ボタンに接続（個別調整可能）
                   * ======================================================================== */}
                  {hasReplies && isExpanded && (
                    <div
                      className="thread-line-container thread-line-container-expanded"
                      style={{
                        position: 'absolute',
                        left: '19px',
                        top: '40px',
                        // 展開時のボタン用: 24pxで正解（L字の横線がボタン中心に来る）
                        bottom: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        width: '2px',
                        zIndex: 0,
                        pointerEvents: 'none',
                      }}
                    >
                      {/* 縦線（flex-grow で自動伸縮） */}
                      <div
                        className="thread-line-continuation"
                        style={{
                          flexGrow: 1,
                          width: '0px',
                          borderLeft: isLight ? '2px solid rgba(0, 0, 0, 0.15)' : '2px solid rgba(255, 255, 255, 0.15)',
                        }}
                      />
                      {/* L字接続パーツ */}
                      <div
                        className="thread-line-connection"
                        style={{
                          height: '18px',
                          width: '33px',
                          borderStyle: 'solid',
                          borderWidth: '0 0 2px 2px',
                          borderColor: isLight ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)',
                          borderBottomLeftRadius: '16px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Freeプラン: アップグレードCTA */}
            {isFree && filteredThreads.length > FREE_VISIBLE_THREADS && (
              <div className="relative -mt-2">
                {/* フェードグラデーションオーバーレイ */}
                <div
                  className="absolute -top-24 left-0 right-0 h-24 pointer-events-none"
                  style={{ background: `linear-gradient(to bottom, transparent, ${BG_COLORS[bgMode]})` }}
                />
                <div className={`relative text-center py-6 px-4 rounded-xl border ${
                  isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/80 border-gray-700'
                }`}>
                  <Crown className={`w-8 h-8 mx-auto mb-2 ${isLight ? 'text-yellow-500' : 'text-yellow-400'}`} />
                  <p className={`text-sm mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    {t('comments.freeLimit', { limit: FREE_VISIBLE_THREADS })}
                  </p>
                  <p className={`text-sm font-semibold mb-3 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    {t('comments.upgradeToSeeAll', { total: totalCommentCount })}
                  </p>
                  <button
                    className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-colors"
                    style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
                    onClick={() => {
                      // 設定画面のアップグレードセクションを開く
                      localStorage.setItem('yt-gemini-openSettings', 'true');
                      window.location.reload();
                    }}
                  >
                    {t('paywall.upgradeToPro')}
                  </button>
                </div>
              </div>
            )}

            {/* もっと見るボタン（Proプランのみ） */}
            {!isFree && remainingCount > 0 && (
              <div className="flex justify-center py-4">
                <button
                  onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                  className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    isLight
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {t('comments.loadMore')} ({t('comments.remaining', { count: remainingCount })})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentsTab;
