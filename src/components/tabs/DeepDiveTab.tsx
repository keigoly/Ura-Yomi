/**
 * Deep Dive Tab コンポーネント
 * Geminiが選定したポジティブ/ニュートラル/ネガティブコメントを表示
 */

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import type { YouTubeCommentThread, AnalysisResult } from '../../types';
import { useDesignStore, isLightMode } from '../../store/designStore';
import { useCharacterStore } from '../../store/characterStore';
import { useTranslation } from '../../i18n/useTranslation';
import { rewriteWithCharacter } from '../../services/apiServer';
import geminiIcon from '../../icons/gemini-icon.png';
import mascotGemini from '../../icons/mascot-gemini.png';
import bubblePositive from '../../icons/bubble-positive.png';
import bubbleNeutral from '../../icons/bubble-neutral.png';
import bubbleNegative from '../../icons/bubble-negative.png';

interface DeepDiveTabProps {
  comments: YouTubeCommentThread[];
  result: AnalysisResult;
}

/**
 * HTMLタグをテキストに変換（<br>を改行に）
 */
function formatCommentText(text: string): string {
  if (!text) return '';

  // <br>タグを改行に変換（大文字小文字を区別しない）
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
 * Geminiが選定したコメントをコメントリストから検索
 */
function findCommentInList(
  geminiComment: { comment: string; author: string; likeCount?: number } | undefined,
  topLevelComments: Array<{
    id: string;
    text: string;
    author: string;
    authorProfileImageUrl?: string;
    likeCount: number;
    publishedAt: string;
    replyCount: number;
    thread: YouTubeCommentThread;
  }>
) {
  if (!geminiComment || !geminiComment.comment) return null;

  const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizeAuthor = (author: string) => author.trim().toLowerCase();

  const searchText = normalizeText(geminiComment.comment);
  const searchAuthor = geminiComment.author ? normalizeAuthor(geminiComment.author) : null;

  // 1. 完全一致を試みる
  let found = topLevelComments.find(c => {
    const cText = normalizeText(c.text);
    const cAuthor = normalizeAuthor(c.author);
    return cText === searchText && (!searchAuthor || cAuthor === searchAuthor);
  });

  // 2. 部分一致を試みる
  if (!found) {
    found = topLevelComments.find(c => {
      const cText = normalizeText(c.text);
      return cText.includes(searchText) || searchText.includes(cText);
    });
  }

  // 3. 見つからない場合はGeminiの情報を直接使用
  if (!found && geminiComment.comment) {
    return {
      id: 'gemini-selected',
      text: geminiComment.comment,
      author: geminiComment.author || 'Unknown',
      likeCount: geminiComment.likeCount || 0,
      publishedAt: new Date().toISOString(),
      replyCount: 0,
      thread: null as unknown as YouTubeCommentThread,
      reason: (geminiComment as any).reason,
      reason_en: (geminiComment as any).reason_en,
    };
  }

  return found ? { ...found, reason: (geminiComment as any).reason, reason_en: (geminiComment as any).reason_en } : null;
}

/**
 * アバターの初期文字を取得
 */
function getAvatarInitial(author: string): string {
  if (!author) return '?';
  const match = author.match(/@([^-\d]+)/);
  if (match && match[1]) {
    return match[1].charAt(0).toUpperCase();
  }
  return author.charAt(0).toUpperCase();
}

/**
 * 日付をフォーマット（YYYY/MM/DD）
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  } catch {
    return dateString;
  }
}

function DeepDiveTab({ comments, result }: DeepDiveTabProps) {
  const { t } = useTranslation();
  const { bgMode } = useDesignStore();
  const isLight = isLightMode(bgMode);
  const { deepdiveCharacterMode, setDeepdiveCharacterMode, cacheDeepdive, getCachedDeepdive } = useCharacterStore();
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [positiveCharacterReason, setPositiveCharacterReason] = useState<string | null>(null);
  const [neutralCharacterReason, setNeutralCharacterReason] = useState<string | null>(null);
  const [positiveCharacterLoading, setPositiveCharacterLoading] = useState(false);
  const [neutralCharacterLoading, setNeutralCharacterLoading] = useState(false);
  const [negativeAIReason, setNegativeAIReason] = useState<string | null>(null);
  const [negativeCharacterReason, setNegativeCharacterReason] = useState<string | null>(null);
  const [negativeCharacterLoading, setNegativeCharacterLoading] = useState(false);
  const lang = (localStorage.getItem('yt-gemini-language') || 'ja') as 'ja' | 'en';

  // 返信の表示/非表示を切り替え
  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // 親コメントのみを抽出（返信は含めない）
  // 投稿者（チャンネルオーナー）のコメントは除外
  const topLevelComments = comments
    .filter((thread) => {
      // isUploaderフラグがtrueの場合は除外
      const comment = thread.topLevelComment as any;
      return !comment.isUploader;
    })
    .map((thread) => ({
      id: thread.topLevelComment.id,
      text: thread.topLevelComment.text,
      author: thread.topLevelComment.author,
      authorProfileImageUrl: thread.topLevelComment.authorProfileImageUrl,
      likeCount: thread.topLevelComment.likeCount,
      publishedAt: thread.topLevelComment.publishedAt,
      replyCount: thread.topLevelComment.replyCount,
      thread: thread,
    }));

  // ポジティブコメント: Geminiが選定、またはリストの最初（人気順の一番上）
  const positiveComment = findCommentInList(result.positiveComment, topLevelComments)
    || (topLevelComments.length > 0 ? topLevelComments[0] : null);

  // ニュートラルコメント: Geminiが選定（投稿者除外済み）
  const neutralComment = findCommentInList(result.neutralComment, topLevelComments);

  // ネガティブコメント: 人気順リストの一番下（投稿者除外済み）
  // 人気順（comment_sort=top）で最後のコメントを使用
  const negativeComment = topLevelComments.length > 0
    ? topLevelComments[topLevelComments.length - 1]
    : null;

  // ポジティブのreason取得（バイリンガル対応）
  const positiveReasonRaw = (positiveComment as any)?.reason as string | undefined;
  const positiveReasonEn = (positiveComment as any)?.reason_en as string | undefined;
  const positiveReason = (lang === 'en' && positiveReasonEn) ? positiveReasonEn : positiveReasonRaw;

  const neutralReasonRaw = (neutralComment as any)?.reason as string | undefined;
  const neutralReasonEn = (neutralComment as any)?.reason_en as string | undefined;
  const neutralReason = (lang === 'en' && neutralReasonEn) ? neutralReasonEn : neutralReasonRaw;

  // キャラクターモードON時にポジティブreasonをジェミニーちゃんペルソナで書き換え
  useEffect(() => {
    if (!deepdiveCharacterMode || !positiveReason || positiveCharacterReason !== null) return;

    const cached = getCachedDeepdive(positiveReason);
    if (cached) {
      setPositiveCharacterReason(cached);
      return;
    }

    let cancelled = false;
    setPositiveCharacterLoading(true);

    rewriteWithCharacter(positiveReason, 'geminny', lang)
      .then((rewritten) => {
        if (!cancelled) {
          setPositiveCharacterReason(rewritten);
          cacheDeepdive(positiveReason, rewritten);
        }
      })
      .catch((err) => {
        console.error('[DeepDiveTab] Positive character rewrite failed:', err);
        if (!cancelled) setPositiveCharacterReason(positiveReason);
      })
      .finally(() => {
        if (!cancelled) setPositiveCharacterLoading(false);
      });

    return () => { cancelled = true; };
  }, [deepdiveCharacterMode, positiveReason, positiveCharacterReason, lang, getCachedDeepdive, cacheDeepdive]);

  // キャラクターモードON時にニュートラルreasonをジェミニーちゃんペルソナで書き換え
  useEffect(() => {
    if (!deepdiveCharacterMode || !neutralReason || neutralCharacterReason !== null) return;

    const cached = getCachedDeepdive(neutralReason);
    if (cached) {
      setNeutralCharacterReason(cached);
      return;
    }

    let cancelled = false;
    setNeutralCharacterLoading(true);

    rewriteWithCharacter(neutralReason, 'geminny', lang)
      .then((rewritten) => {
        if (!cancelled) {
          setNeutralCharacterReason(rewritten);
          cacheDeepdive(neutralReason, rewritten);
        }
      })
      .catch((err) => {
        console.error('[DeepDiveTab] Neutral character rewrite failed:', err);
        if (!cancelled) setNeutralCharacterReason(neutralReason);
      })
      .finally(() => {
        if (!cancelled) setNeutralCharacterLoading(false);
      });

    return () => { cancelled = true; };
  }, [deepdiveCharacterMode, neutralReason, neutralCharacterReason, lang, getCachedDeepdive, cacheDeepdive]);

  // キャラクターモードOFF時、または言語切替時にキャラクターreasonをリセット
  useEffect(() => {
    if (!deepdiveCharacterMode) {
      setPositiveCharacterReason(null);
      setNeutralCharacterReason(null);
      setNegativeCharacterReason(null);
    }
  }, [deepdiveCharacterMode]);

  // 言語切替時にキャラクターreasonをリセット（再生成のため）
  useEffect(() => {
    setPositiveCharacterReason(null);
    setNeutralCharacterReason(null);
    setNegativeCharacterReason(null);
  }, [lang]);

  // ネガティブコメントのAI分析をメイン解析結果から取得（バイリンガル対応）
  useEffect(() => {
    const negativeReason = (lang === 'en' && result.negativeCommentReason_en)
      ? result.negativeCommentReason_en
      : result.negativeCommentReason;
    if (negativeReason) {
      setNegativeAIReason(negativeReason);
      // 言語切替時にキャラクターreasonもリセット
      setNegativeCharacterReason(null);
    }
  }, [result.negativeCommentReason, result.negativeCommentReason_en, lang]);

  // キャラクターモードON時にネガティブreasonをジェミニーちゃんペルソナで書き換え
  useEffect(() => {
    if (!deepdiveCharacterMode || !negativeAIReason || negativeCharacterReason !== null) return;

    const cached = getCachedDeepdive(negativeAIReason);
    if (cached) {
      setNegativeCharacterReason(cached);
      return;
    }

    let cancelled = false;
    setNegativeCharacterLoading(true);

    rewriteWithCharacter(negativeAIReason, 'geminny', lang)
      .then((rewritten) => {
        if (!cancelled) {
          setNegativeCharacterReason(rewritten);
          cacheDeepdive(negativeAIReason, rewritten);
        }
      })
      .catch((err) => {
        console.error('[DeepDiveTab] Negative character rewrite failed:', err);
        if (!cancelled) setNegativeCharacterReason(negativeAIReason);
      })
      .finally(() => {
        if (!cancelled) setNegativeCharacterLoading(false);
      });

    return () => { cancelled = true; };
  }, [deepdiveCharacterMode, negativeAIReason, negativeCharacterReason, lang, getCachedDeepdive, cacheDeepdive]);

  const hasData = (positiveComment && positiveComment.text) ||
                  (negativeComment && negativeComment.text) ||
                  (neutralComment && neutralComment.text);

  return (
    <div className="min-h-full bg-inherit">
      <div className="max-w-4xl mx-auto px-6 pt-3 pb-8 space-y-6">
      {hasData ? (
        <>
          {/* キャラクターモード トグル */}
          <div className="flex items-center justify-end gap-3 -mb-2">
            <span className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              {t('character.toggle')}
            </span>
            <button
              onClick={() => setDeepdiveCharacterMode(!deepdiveCharacterMode)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                deepdiveCharacterMode
                  ? 'bg-purple-500'
                  : isLight ? 'bg-gray-300' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  deepdiveCharacterMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* タイトル */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <img
                src={deepdiveCharacterMode ? mascotGemini : geminiIcon}
                alt="Gemini"
                className={`flex-shrink-0 ${deepdiveCharacterMode ? 'w-9 h-9 rounded-full object-cover' : 'w-6 h-6'}`}
              />
              <h2 className={`text-2xl font-bold whitespace-nowrap ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {deepdiveCharacterMode ? t('character.geminny') : t('deepdive.title')}
              </h2>
            </div>
          </div>

          {/* 1. ポジティブの分析 */}
          {positiveComment && positiveComment.text && (
            <div>
              {deepdiveCharacterMode ? (
                <div className="flex justify-center px-2 py-1 mb-4 animate-bounce-in" style={{ animationFillMode: 'both' }}>
                  <img
                    src={bubblePositive}
                    alt={t('deepdive.positiveAnalysis')}
                    className="w-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 0 #fff) drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(1.5px 1.5px 0 #fff) drop-shadow(-1.5px 1.5px 0 #fff) drop-shadow(1.5px -1.5px 0 #fff) drop-shadow(-1.5px -1.5px 0 #fff)',
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsUp className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-green-400">
                    {t('deepdive.positiveAnalysis')}
                  </h3>
                </div>
              )}
              <div className="rounded-lg p-4 bg-green-950/30 border border-green-800/50">
                {/* ユーザー情報 */}
                <div className="flex items-start gap-3 mb-3">
                  {positiveComment.authorProfileImageUrl ? (
                    <img
                      src={positiveComment.authorProfileImageUrl}
                      alt={positiveComment.author}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-green-800/50">
                      <span className="text-sm font-medium text-green-300">
                        {getAvatarInitial(positiveComment.author)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {positiveComment.author || t('deepdive.unknown')}
                      </p>
                      <div className="flex items-center gap-1 text-green-400">
                        <ThumbsUp className="w-4 h-4" />
                        <span className="font-semibold text-sm">{positiveComment.likeCount.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDate(positiveComment.publishedAt)}
                    </p>
                  </div>
                </div>

                {/* コメントテキスト */}
                <p className={`text-sm leading-relaxed mb-4 whitespace-pre-line ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                  {formatCommentText(positiveComment.text)}
                </p>

                {/* AI REASONINGブロック */}
                {positiveReason && (
                  deepdiveCharacterMode ? (
                    <div className="mb-3">
                      <div className={`rounded-xl p-3 ${isLight ? 'bg-purple-50 border border-purple-200' : 'bg-[#3b1f5e] border border-purple-700/50'}`}>
                        {positiveCharacterLoading ? (
                          <div className="flex items-center justify-center gap-2 py-2">
                            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            <span className={`text-sm ${isLight ? 'text-purple-600' : 'text-purple-300'}`}>
                              {lang === 'ja' ? 'ジェミニーちゃんが解説中...' : 'Geminny is analyzing...'}
                            </span>
                          </div>
                        ) : (
                          <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                            {positiveCharacterReason || positiveReason}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg p-3 mb-3 bg-green-900/30 border border-green-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">
                          AI REASONING
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                        {positiveReason}
                      </p>
                    </div>
                  )
                )}

                {/* 返信表示リンク */}
                {positiveComment.replyCount > 0 && positiveComment.id !== 'gemini-selected' && positiveComment.thread && (
                  <>
                    {!expandedReplies.has(positiveComment.id) ? (
                      <button
                        onClick={() => toggleReplies(positiveComment.id)}
                        className="flex items-center gap-1 text-sm mt-2 text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <span>{t('deepdive.showReplies')} ({positiveComment.replyCount}{t('deepdive.repliesCount')})</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        {/* 返信リスト */}
                        {positiveComment.thread.replies && positiveComment.thread.replies.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-300/20">
                            {positiveComment.thread.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-green-800/30">
                                  <span className="text-xs font-medium text-green-300">
                                    {getAvatarInitial(reply.author)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`text-xs font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                      {reply.author || t('deepdive.unknown')}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {formatDate(reply.publishedAt)}
                                    </p>
                                  </div>
                                  <p className={`text-sm leading-relaxed whitespace-pre-line ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                                    {formatCommentText(reply.text)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => toggleReplies(positiveComment.id)}
                          className="flex items-center gap-1 text-sm mt-2 text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          <span>{t('deepdive.hideReplies')}</span>
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* 2. ニュートラルの分析 */}
          {neutralComment && neutralComment.text && (
            <div>
              {deepdiveCharacterMode ? (
                <div className="flex justify-center px-2 py-1 mb-4 animate-bounce-in" style={{ animationFillMode: 'both' }}>
                  <img
                    src={bubbleNeutral}
                    alt={t('deepdive.neutralAnalysis')}
                    className="w-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 0 #fff) drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(1.5px 1.5px 0 #fff) drop-shadow(-1.5px 1.5px 0 #fff) drop-shadow(1.5px -1.5px 0 #fff) drop-shadow(-1.5px -1.5px 0 #fff)',
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-semibold text-orange-400">
                    {t('deepdive.neutralAnalysis')}
                  </h3>
                </div>
              )}
              <div className="rounded-lg p-4 bg-orange-950/30 border border-orange-800/50">
                {/* ユーザー情報 */}
                <div className="flex items-start gap-3 mb-3">
                  {neutralComment.authorProfileImageUrl ? (
                    <img
                      src={neutralComment.authorProfileImageUrl}
                      alt={neutralComment.author}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-800/50">
                      <span className="text-sm font-medium text-orange-300">
                        {getAvatarInitial(neutralComment.author)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {neutralComment.author || t('deepdive.unknown')}
                      </p>
                      <div className="flex items-center gap-1 text-orange-400">
                        <ThumbsUp className="w-4 h-4" />
                        <span className="font-semibold text-sm">{neutralComment.likeCount.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDate(neutralComment.publishedAt)}
                    </p>
                  </div>
                </div>

                {/* コメントテキスト */}
                <p className={`text-sm leading-relaxed mb-4 whitespace-pre-line ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                  {formatCommentText(neutralComment.text)}
                </p>

                {/* AI REASONINGブロック */}
                {neutralReason && (
                  deepdiveCharacterMode ? (
                    <div className="mb-3">
                      <div className={`rounded-xl p-3 ${isLight ? 'bg-purple-50 border border-purple-200' : 'bg-[#3b1f5e] border border-purple-700/50'}`}>
                        {neutralCharacterLoading ? (
                          <div className="flex items-center justify-center gap-2 py-2">
                            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            <span className={`text-sm ${isLight ? 'text-purple-600' : 'text-purple-300'}`}>
                              {lang === 'ja' ? 'ジェミニーちゃんが解説中...' : 'Geminny is analyzing...'}
                            </span>
                          </div>
                        ) : (
                          <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                            {neutralCharacterReason || neutralReason}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg p-3 mb-3 bg-orange-900/30 border border-orange-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-semibold text-orange-400">
                          AI REASONING
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                        {neutralReason}
                      </p>
                    </div>
                  )
                )}

                {/* 返信表示リンク */}
                {neutralComment.replyCount > 0 && neutralComment.id !== 'gemini-selected' && neutralComment.thread && (
                  <>
                    {!expandedReplies.has(neutralComment.id) ? (
                      <button
                        onClick={() => toggleReplies(neutralComment.id)}
                        className="flex items-center gap-1 text-sm mt-2 text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <span>{t('deepdive.showReplies')} ({neutralComment.replyCount}{t('deepdive.repliesCount')})</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        {/* 返信リスト */}
                        {neutralComment.thread.replies && neutralComment.thread.replies.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-300/20">
                            {neutralComment.thread.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-800/30">
                                  <span className="text-xs font-medium text-orange-300">
                                    {getAvatarInitial(reply.author)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`text-xs font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                      {reply.author || t('deepdive.unknown')}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {formatDate(reply.publishedAt)}
                                    </p>
                                  </div>
                                  <p className={`text-sm leading-relaxed whitespace-pre-line ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                                    {formatCommentText(reply.text)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => toggleReplies(neutralComment.id)}
                          className="flex items-center gap-1 text-sm mt-2 text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          <span>{t('deepdive.hideReplies')}</span>
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* 3. ネガティブの分析 */}
          {negativeComment && negativeComment.text && (
            <div>
              {deepdiveCharacterMode ? (
                <div className="flex justify-center px-2 py-1 mb-4 animate-bounce-in" style={{ animationFillMode: 'both' }}>
                  <img
                    src={bubbleNegative}
                    alt={t('deepdive.negativeAnalysis')}
                    className="w-full object-contain"
                    style={{
                      filter: 'drop-shadow(0 0 0 #fff) drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(1.5px 1.5px 0 #fff) drop-shadow(-1.5px 1.5px 0 #fff) drop-shadow(1.5px -1.5px 0 #fff) drop-shadow(-1.5px -1.5px 0 #fff)',
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-4">
                  <ThumbsDown className="w-5 h-5 text-red-400" />
                  <h3 className="text-lg font-semibold text-red-400">
                    {t('deepdive.negativeAnalysis')}
                  </h3>
                </div>
              )}
              <div className="rounded-lg p-4 bg-red-950/30 border border-red-800/50">
                {/* ユーザー情報 */}
                <div className="flex items-start gap-3 mb-3">
                  {negativeComment.authorProfileImageUrl ? (
                    <img
                      src={negativeComment.authorProfileImageUrl}
                      alt={negativeComment.author}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-red-800/50">
                      <span className="text-sm font-medium text-red-300">
                        {getAvatarInitial(negativeComment.author)}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                        {negativeComment.author || t('deepdive.unknown')}
                      </p>
                      <div className="flex items-center gap-1 text-gray-400">
                        <ThumbsUp className="w-4 h-4" />
                        <span className="font-semibold text-sm">{negativeComment.likeCount.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDate(negativeComment.publishedAt)}
                    </p>
                  </div>
                </div>

                {/* コメントテキスト */}
                <p className={`text-sm leading-relaxed mb-4 whitespace-pre-line ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                  {formatCommentText(negativeComment.text)}
                </p>

                {/* AI REASONINGブロック */}
                {negativeAIReason && (
                  deepdiveCharacterMode ? (
                    <div className="mb-3">
                      <div className={`rounded-xl p-3 ${isLight ? 'bg-purple-50 border border-purple-200' : 'bg-[#3b1f5e] border border-purple-700/50'}`}>
                        {negativeCharacterLoading ? (
                          <div className="flex items-center justify-center gap-2 py-2">
                            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            <span className={`text-sm ${isLight ? 'text-purple-600' : 'text-purple-300'}`}>
                              {lang === 'ja' ? 'ジェミニーちゃんが解説中...' : 'Geminny is analyzing...'}
                            </span>
                          </div>
                        ) : (
                          <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                            {negativeCharacterReason || negativeAIReason}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg p-3 mb-3 bg-red-900/30 border border-red-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-semibold text-red-400">
                          AI REASONING
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                        {negativeAIReason}
                      </p>
                    </div>
                  )
                )}

                {/* 返信表示リンク */}
                {negativeComment.replyCount > 0 && negativeComment.id !== 'gemini-selected' && negativeComment.thread && (
                  <>
                    {!expandedReplies.has(negativeComment.id) ? (
                      <button
                        onClick={() => toggleReplies(negativeComment.id)}
                        className="flex items-center gap-1 text-sm mt-2 text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <span>{t('deepdive.showReplies')} ({negativeComment.replyCount}{t('deepdive.repliesCount')})</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        {/* 返信リスト */}
                        {negativeComment.thread.replies && negativeComment.thread.replies.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-300/20">
                            {negativeComment.thread.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-red-800/30">
                                  <span className="text-xs font-medium text-red-300">
                                    {getAvatarInitial(reply.author)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`text-xs font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                                      {reply.author || t('deepdive.unknown')}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {formatDate(reply.publishedAt)}
                                    </p>
                                  </div>
                                  <p className={`text-sm leading-relaxed whitespace-pre-line ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                                    {formatCommentText(reply.text)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => toggleReplies(negativeComment.id)}
                          className="flex items-center gap-1 text-sm mt-2 text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          <span>{t('deepdive.hideReplies')}</span>
                          <ChevronUp className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={`text-center py-8 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          <p>{t('deepdive.noData')}</p>
        </div>
      )}
      </div>
    </div>
  );
}

export default DeepDiveTab;
