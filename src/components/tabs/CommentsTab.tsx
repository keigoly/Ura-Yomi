/**
 * コメント一覧タブコンポーネント
 * 全てのコメントを詳細情報と共に表示
 */

import { useState, useMemo } from 'react';
import { ThumbsUp, User, Calendar, MessageSquare, Search, ArrowUpDown } from 'lucide-react';
import type { YouTubeCommentThread } from '../../types';

interface CommentsTabProps {
  comments: YouTubeCommentThread[];
}

type SortField = 'likeCount' | 'publishedAt' | 'author';
type SortOrder = 'asc' | 'desc';

function CommentsTab({ comments }: CommentsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('likeCount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 全コメントをフラット化（親コメント + 返信）
  const allComments = useMemo(() => {
    const flatComments: Array<{
      id: string;
      text: string;
      author: string;
      likeCount: number;
      publishedAt: string;
      replyCount: number;
      isReply: boolean;
      parentId?: string;
    }> = [];

    comments.forEach((thread) => {
      // 親コメント
      flatComments.push({
        id: thread.topLevelComment.id,
        text: thread.topLevelComment.text,
        author: thread.topLevelComment.author,
        likeCount: thread.topLevelComment.likeCount,
        publishedAt: thread.topLevelComment.publishedAt,
        replyCount: thread.topLevelComment.replyCount,
        isReply: false,
      });

      // 返信コメント
      if (thread.replies) {
        thread.replies.forEach((reply) => {
          flatComments.push({
            id: reply.id,
            text: reply.text,
            author: reply.author,
            likeCount: reply.likeCount,
            publishedAt: reply.publishedAt,
            replyCount: 0,
            isReply: true,
            parentId: thread.topLevelComment.id,
          });
        });
      }
    });

    return flatComments;
  }, [comments]);

  // 検索とソートを適用
  const filteredAndSortedComments = useMemo(() => {
    let filtered = allComments;

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (comment) =>
          comment.text.toLowerCase().includes(query) ||
          comment.author.toLowerCase().includes(query)
      );
    }

    // ソート
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'likeCount':
          aValue = a.likeCount;
          bValue = b.likeCount;
          break;
        case 'publishedAt':
          aValue = new Date(a.publishedAt).getTime();
          bValue = new Date(b.publishedAt).getTime();
          break;
        case 'author':
          aValue = a.author.toLowerCase();
          bValue = b.author.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [allComments, searchQuery, sortField, sortOrder]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* 検索とソート */}
      <div className="space-y-3">
        {/* 検索バー */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="コメントまたは投稿者名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* ソートボタン */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleSortChange('likeCount')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
              sortField === 'likeCount'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            いいね数
            {sortField === 'likeCount' && (
              <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            )}
          </button>
          <button
            onClick={() => handleSortChange('publishedAt')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
              sortField === 'publishedAt'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            投稿日時
            {sortField === 'publishedAt' && (
              <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            )}
          </button>
          <button
            onClick={() => handleSortChange('author')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
              sortField === 'author'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <User className="w-4 h-4" />
            投稿者名
            {sortField === 'author' && (
              <ArrowUpDown className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
            )}
          </button>
        </div>

        {/* 統計情報 */}
        <div className="text-sm text-gray-600">
          全{allComments.length}件のコメント
          {searchQuery && `（検索結果: ${filteredAndSortedComments.length}件）`}
        </div>
      </div>

      {/* コメント一覧 */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredAndSortedComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? '検索条件に一致するコメントが見つかりませんでした' : 'コメントがありません'}
          </div>
        ) : (
          filteredAndSortedComments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 border rounded-lg bg-white hover:shadow-md transition-shadow ${
                comment.isReply ? 'ml-8 border-l-4 border-l-blue-300 bg-blue-50' : ''
              }`}
            >
              {/* ヘッダー（投稿者情報） */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-800">{comment.author}</span>
                  {comment.isReply && (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      返信
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(comment.publishedAt)}</span>
                  </div>
                </div>
              </div>

              {/* コメントID */}
              <div className="mb-2">
                <span className="text-xs font-mono text-gray-400">ID: {comment.id}</span>
              </div>

              {/* コメント本文 */}
              <div className="mb-3">
                <p className="text-gray-700 whitespace-pre-wrap break-words">{comment.text}</p>
              </div>

              {/* フッター（いいね数、返信数） */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  <span>{comment.likeCount.toLocaleString()}いいね</span>
                </div>
                {!comment.isReply && comment.replyCount > 0 && (
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{comment.replyCount}件の返信</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CommentsTab;
