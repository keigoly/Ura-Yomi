/**
 * Deep Dive Tab コンポーネント
 * Geminiが選定したポジティブ/ニュートラル/ネガティブコメントを表示
 */

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import type { YouTubeCommentThread, AnalysisResult } from '../../types';
import geminiIcon from '../../icons/gemini-icon.png';

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
      author: geminiComment.author || '不明',
      likeCount: geminiComment.likeCount || 0,
      publishedAt: new Date().toISOString(),
      replyCount: 0,
      thread: null as unknown as YouTubeCommentThread,
      reason: (geminiComment as any).reason,
    };
  }
  
  return found ? { ...found, reason: (geminiComment as any).reason } : null;
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
  const { theme } = useThemeStore();
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

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
      likeCount: thread.topLevelComment.likeCount,
      publishedAt: thread.topLevelComment.publishedAt,
      replyCount: thread.topLevelComment.replyCount,
      thread: thread,
    }));

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c8966986-f336-4967-9725-2af59d2c095d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DeepDiveTab.tsx:103',message:'DeepDive - comment order check',data:{totalComments:comments.length,filteredComments:topLevelComments.length,firstComment:{author:topLevelComments[0]?.author,text:topLevelComments[0]?.text?.substring(0,50),likes:topLevelComments[0]?.likeCount},lastComment:{author:topLevelComments[topLevelComments.length-1]?.author,text:topLevelComments[topLevelComments.length-1]?.text?.substring(0,50),likes:topLevelComments[topLevelComments.length-1]?.likeCount}},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
  // #endregion

  // ポジティブコメント: Geminiが選定、またはリストの最初（人気順の一番上）
  const positiveComment = findCommentInList(result.positiveComment, topLevelComments) 
    || (topLevelComments.length > 0 ? topLevelComments[0] : null);
  
  // ニュートラルコメント: Geminiが選定（投稿者除外済み）
  const neutralComment = findCommentInList(result.neutralComment, topLevelComments);
  
  // ネガティブコメント: 人気順リストの一番下（投稿者除外済み）
  // yt-dlpの人気順（comment_sort=top）で最後のコメントを使用
  const negativeComment = topLevelComments.length > 0 
    ? topLevelComments[topLevelComments.length - 1]
    : null;
  
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c8966986-f336-4967-9725-2af59d2c095d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DeepDiveTab.tsx:120',message:'DeepDive - selected negative comment',data:{negativeAuthor:negativeComment?.author,negativeText:negativeComment?.text?.substring(0,80),negativeLikes:negativeComment?.likeCount},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c8966986-f336-4967-9725-2af59d2c095d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DeepDiveTab.tsx:109',message:'FINAL display check',data:{hasPositive:!!positiveComment,hasNeutral:!!neutralComment,hasNegative:!!negativeComment,negativeText:negativeComment?.text?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  const hasData = (positiveComment && positiveComment.text) || 
                  (negativeComment && negativeComment.text) || 
                  (neutralComment && neutralComment.text);

  return (
    <div className={`p-6 space-y-6 ${theme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-white'}`}>
      {hasData ? (
        <>
          {/* タイトル */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <img 
                src={geminiIcon} 
                alt="Gemini" 
                className="w-6 h-6 flex-shrink-0"
              />
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Geminiの深掘り
              </h2>
            </div>
          </div>
          
          {/* 1. ポジティブの分析 */}
          {positiveComment && positiveComment.text && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ThumbsUp className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  ポジティブの分析
                </h3>
              </div>
              <div className={`rounded-lg p-4 ${
                theme === 'dark' 
                  ? 'bg-green-950/30 border border-green-800/50' 
                  : 'bg-green-50 border border-green-200'
              }`}>
                {/* ユーザー情報 */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                    theme === 'dark' ? 'bg-green-800/50' : 'bg-green-100'
                  }`}>
                    <span className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-green-300' : 'text-green-700'
                    }`}>
                      {getAvatarInitial(positiveComment.author)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {positiveComment.author || '不明'}
                      </p>
                      <div className={`flex items-center gap-1 ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`}>
                        <ThumbsUp className="w-4 h-4" />
                        <span className="font-semibold text-sm">{positiveComment.likeCount.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(positiveComment.publishedAt)}
                    </p>
                  </div>
                </div>
                
                {/* コメントテキスト */}
                <p className={`text-sm leading-relaxed mb-4 whitespace-pre-line ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  {formatCommentText(positiveComment.text)}
                </p>
                
                {/* AI REASONINGブロック */}
                {(positiveComment as any).reason && (
                  <div className={`rounded-lg p-3 mb-3 ${
                    theme === 'dark' 
                      ? 'bg-green-900/30 border border-green-800/50' 
                      : 'bg-green-100 border border-green-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className={`w-4 h-4 ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      }`} />
                      <span className={`text-xs font-semibold ${
                        theme === 'dark' ? 'text-green-400' : 'text-green-700'
                      }`}>
                        AI REASONING
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {(positiveComment as any).reason}
                    </p>
                  </div>
                )}
                
                {/* 返信表示リンク */}
                {positiveComment.replyCount > 0 && positiveComment.id !== 'gemini-selected' && positiveComment.thread && (
                  <>
                    {!expandedReplies.has(positiveComment.id) ? (
                      <button 
                        onClick={() => toggleReplies(positiveComment.id)}
                        className={`flex items-center gap-1 text-sm mt-2 ${
                          theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                        } transition-colors`}
                      >
                        <span>返信を表示 ({positiveComment.replyCount}件)</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        {/* 返信リスト */}
                        {positiveComment.thread.replies && positiveComment.thread.replies.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-300/20">
                            {positiveComment.thread.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  theme === 'dark' ? 'bg-green-800/30' : 'bg-green-100'
                                }`}>
                                  <span className={`text-xs font-medium ${
                                    theme === 'dark' ? 'text-green-300' : 'text-green-700'
                                  }`}>
                                    {getAvatarInitial(reply.author)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`text-xs font-medium ${
                                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                                    }`}>
                                      {reply.author || '不明'}
                                    </p>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {formatDate(reply.publishedAt)}
                                    </p>
                                  </div>
                                  <p className={`text-sm leading-relaxed whitespace-pre-line ${
                                    theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                  }`}>
                                    {formatCommentText(reply.text)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button 
                          onClick={() => toggleReplies(positiveComment.id)}
                          className={`flex items-center gap-1 text-sm mt-2 ${
                            theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                          } transition-colors`}
                        >
                          <span>返信を非表示</span>
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
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className={`w-5 h-5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>
                  ニュートラルの分析
                </h3>
              </div>
              <div className={`rounded-lg p-4 ${
                theme === 'dark' 
                  ? 'bg-orange-950/30 border border-orange-800/50' 
                  : 'bg-orange-50 border border-orange-200'
              }`}>
                {/* ユーザー情報 */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    theme === 'dark' ? 'bg-orange-800/50' : 'bg-orange-100'
                  }`}>
                    <span className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                    }`}>
                      {getAvatarInitial(neutralComment.author)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {neutralComment.author || '不明'}
                      </p>
                      <div className={`flex items-center gap-1 ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      }`}>
                        <ThumbsUp className="w-4 h-4" />
                        <span className="font-semibold text-sm">{neutralComment.likeCount.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(neutralComment.publishedAt)}
                    </p>
                  </div>
                </div>
                
                {/* コメントテキスト */}
                <p className={`text-sm leading-relaxed mb-4 whitespace-pre-line ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  {formatCommentText(neutralComment.text)}
                </p>
                
                {/* AI REASONINGブロック */}
                {(neutralComment as any).reason && (
                  <div className={`rounded-lg p-3 mb-3 ${
                    theme === 'dark' 
                      ? 'bg-orange-900/30 border border-orange-800/50' 
                      : 'bg-orange-100 border border-orange-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className={`w-4 h-4 ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-600'
                      }`} />
                      <span className={`text-xs font-semibold ${
                        theme === 'dark' ? 'text-orange-400' : 'text-orange-700'
                      }`}>
                        AI REASONING
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {(neutralComment as any).reason}
                    </p>
                  </div>
                )}
                
                {/* 返信表示リンク */}
                {neutralComment.replyCount > 0 && neutralComment.id !== 'gemini-selected' && neutralComment.thread && (
                  <>
                    {!expandedReplies.has(neutralComment.id) ? (
                      <button 
                        onClick={() => toggleReplies(neutralComment.id)}
                        className={`flex items-center gap-1 text-sm mt-2 ${
                          theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                        } transition-colors`}
                      >
                        <span>返信を表示 ({neutralComment.replyCount}件)</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        {/* 返信リスト */}
                        {neutralComment.thread.replies && neutralComment.thread.replies.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-300/20">
                            {neutralComment.thread.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  theme === 'dark' ? 'bg-orange-800/30' : 'bg-orange-100'
                                }`}>
                                  <span className={`text-xs font-medium ${
                                    theme === 'dark' ? 'text-orange-300' : 'text-orange-700'
                                  }`}>
                                    {getAvatarInitial(reply.author)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`text-xs font-medium ${
                                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                                    }`}>
                                      {reply.author || '不明'}
                                    </p>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {formatDate(reply.publishedAt)}
                                    </p>
                                  </div>
                                  <p className={`text-sm leading-relaxed whitespace-pre-line ${
                                    theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                  }`}>
                                    {formatCommentText(reply.text)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button 
                          onClick={() => toggleReplies(neutralComment.id)}
                          className={`flex items-center gap-1 text-sm mt-2 ${
                            theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                          } transition-colors`}
                        >
                          <span>返信を非表示</span>
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
              <div className="flex items-center gap-2 mb-4">
                <ThumbsDown className={`w-5 h-5 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                  ネガティブの分析
                </h3>
              </div>
              <div className={`rounded-lg p-4 ${
                theme === 'dark' 
                  ? 'bg-red-950/30 border border-red-800/50' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {/* ユーザー情報 */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    theme === 'dark' ? 'bg-red-800/50' : 'bg-red-100'
                  }`}>
                    <span className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-red-300' : 'text-red-700'
                    }`}>
                      {getAvatarInitial(negativeComment.author)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {negativeComment.author || '不明'}
                      </p>
                      <div className={`flex items-center gap-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <ThumbsUp className="w-4 h-4" />
                        <span className="font-semibold text-sm">{negativeComment.likeCount.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(negativeComment.publishedAt)}
                    </p>
                  </div>
                </div>
                
                {/* コメントテキスト */}
                <p className={`text-sm leading-relaxed mb-4 whitespace-pre-line ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  {formatCommentText(negativeComment.text)}
                </p>
                
                {/* AI REASONINGブロック */}
                {(negativeComment as any).reason && (
                  <div className={`rounded-lg p-3 mb-3 ${
                    theme === 'dark' 
                      ? 'bg-red-900/30 border border-red-800/50' 
                      : 'bg-red-100 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className={`w-4 h-4 ${
                        theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      }`} />
                      <span className={`text-xs font-semibold ${
                        theme === 'dark' ? 'text-red-400' : 'text-red-700'
                      }`}>
                        AI REASONING
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {(negativeComment as any).reason}
                    </p>
                  </div>
                )}
                
                {/* 返信表示リンク */}
                {negativeComment.replyCount > 0 && negativeComment.id !== 'gemini-selected' && negativeComment.thread && (
                  <>
                    {!expandedReplies.has(negativeComment.id) ? (
                      <button 
                        onClick={() => toggleReplies(negativeComment.id)}
                        className={`flex items-center gap-1 text-sm mt-2 ${
                          theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                        } transition-colors`}
                      >
                        <span>返信を表示 ({negativeComment.replyCount}件)</span>
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    ) : (
                      <>
                        {/* 返信リスト */}
                        {negativeComment.thread.replies && negativeComment.thread.replies.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-300/20">
                            {negativeComment.thread.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  theme === 'dark' ? 'bg-red-800/30' : 'bg-red-100'
                                }`}>
                                  <span className={`text-xs font-medium ${
                                    theme === 'dark' ? 'text-red-300' : 'text-red-700'
                                  }`}>
                                    {getAvatarInitial(reply.author)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className={`text-xs font-medium ${
                                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                                    }`}>
                                      {reply.author || '不明'}
                                    </p>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {formatDate(reply.publishedAt)}
                                    </p>
                                  </div>
                                  <p className={`text-sm leading-relaxed whitespace-pre-line ${
                                    theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                                  }`}>
                                    {formatCommentText(reply.text)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button 
                          onClick={() => toggleReplies(negativeComment.id)}
                          className={`flex items-center gap-1 text-sm mt-2 ${
                            theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                          } transition-colors`}
                        >
                          <span>返信を非表示</span>
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
        <div className={`text-center py-8 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          <p>深掘りデータがありません</p>
        </div>
      )}
    </div>
  );
}

export default DeepDiveTab;
