/**
 * お気に入り or 履歴ページコンポーネント（フルページビュー）
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Star, Trash2, Clock, Crown, AlertTriangle } from 'lucide-react';
import { useDesignStore, BG_COLORS, isLightMode } from '../store/designStore';
import { useTranslation } from '../i18n/useTranslation';

const FREE_VISIBLE_ENTRIES = 5;
import {
  getFavoritesList,
  getHistoryList,
  removeFavorite,
  removeFromHistory,
  clearAllHistory,
} from '../services/analysisStorage';
import type { FavoriteListItem, HistoryListItem } from '../services/analysisStorage';

interface HistorySectionProps {
  mode: 'favorites' | 'history';
  plan?: 'free' | 'pro';
  onBack: () => void;
  onLoadEntry: (id: string) => void;
  refreshKey?: number;
}

function HistorySection({ mode, plan = 'free', onBack, onLoadEntry, refreshKey }: HistorySectionProps) {
  const { t } = useTranslation();
  const { bgMode } = useDesignStore();
  const bgColor = BG_COLORS[bgMode];
  const isLight = isLightMode(bgMode);
  const isFree = plan !== 'pro';

  const [favorites, setFavorites] = useState<FavoriteListItem[]>([]);
  const [history, setHistory] = useState<HistoryListItem[]>([]);

  // 削除確認ポップアップ用state
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'favorite' | 'history' | 'clearAll';
    id?: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (mode === 'favorites') {
      setFavorites(await getFavoritesList());
    } else {
      setHistory(await getHistoryList());
    }
  }, [mode]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const requestRemoveFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDialog({ type: 'favorite', id });
  };

  const requestRemoveHistory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDialog({ type: 'history', id });
  };

  const requestClearAll = () => {
    setConfirmDialog({ type: 'clearAll' });
  };

  const executeDelete = async () => {
    if (!confirmDialog) return;
    if (confirmDialog.type === 'favorite' && confirmDialog.id) {
      await removeFavorite(confirmDialog.id);
    } else if (confirmDialog.type === 'history' && confirmDialog.id) {
      await removeFromHistory(confirmDialog.id);
    } else if (confirmDialog.type === 'clearAll') {
      await clearAllHistory();
    }
    setConfirmDialog(null);
    await loadData();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays < 7) {
        return `${diffDays}${t('comments.daysAgo').replace('{n}', '')}`;
      } else {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  const pageTitle = mode === 'favorites' ? t('history.favorites') : t('history.recentHistory');

  return (
    <div className="flex flex-col" style={{ backgroundColor: bgColor, height: '100vh' }}>
      {/* ヘッダー（固定） */}
      <div className={`flex items-center gap-3 p-4 border-b flex-shrink-0 ${isLight ? 'border-gray-200' : 'border-gray-700'}`} style={{ backgroundColor: bgColor }}>
        <button onClick={onBack} className={`p-1.5 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'}`}>
          <ArrowLeft className={`w-5 h-5 ${isLight ? 'text-gray-600' : 'text-gray-300'}`} />
        </button>
        <div className="flex items-center gap-2">
          {mode === 'favorites'
            ? <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            : <Clock className={`w-5 h-5 ${isLight ? 'text-gray-600' : 'text-gray-300'}`} />
          }
          <h1 className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{pageTitle}</h1>
        </div>
      </div>

      {/* コンテンツ（スクロール） */}
      <div className="flex-1 overflow-y-auto p-4">

        {mode === 'favorites' ? (
          /* ===== お気に入りページ ===== */
          <div className="space-y-2">
            {favorites.length === 0 ? (
              <p className={`text-sm text-center py-12 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('history.noFavorites')}
              </p>
            ) : (
              <>
                {(isFree ? favorites.slice(0, FREE_VISIBLE_ENTRIES + 3) : favorites).map((item, index) => {
                  const isFaded = isFree && index >= FREE_VISIBLE_ENTRIES;
                  const fadeOpacity = isFaded ? Math.max(0.1, 1 - (index - FREE_VISIBLE_ENTRIES) * 0.3) : 1;
                  return (
                    <div
                      key={item.id}
                      onClick={isFaded ? undefined : () => onLoadEntry(item.id)}
                      className={`flex items-center gap-2 px-3 py-3 rounded-lg border transition-colors ${
                        isFaded
                          ? isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800'
                          : `cursor-pointer ${isLight ? 'border-gray-200 bg-white hover:bg-gray-50' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`
                      }`}
                      style={isFaded ? { opacity: fadeOpacity, filter: `blur(${Math.min(4, (index - FREE_VISIBLE_ENTRIES) * 1)}px)`, pointerEvents: 'none', userSelect: 'none' } : undefined}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                          {item.videoTitle || item.videoId}
                        </p>
                        <p className={`text-xs mt-0.5 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(item.analyzedAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => requestRemoveFavorite(e, item.id)}
                        className={`p-1.5 rounded transition-colors flex-shrink-0 ${isLight ? 'hover:bg-gray-100 text-yellow-500' : 'hover:bg-gray-600 text-yellow-500'}`}
                        title={t('history.removeFavorite')}
                      >
                        <Star className="w-4 h-4 fill-yellow-500" />
                      </button>
                    </div>
                  );
                })}
                {isFree && favorites.length > FREE_VISIBLE_ENTRIES && (
                  <UpgradeCTA isLight={isLight} bgColor={bgColor} total={favorites.length} limit={FREE_VISIBLE_ENTRIES} t={t} label={t('history.favorites')} />
                )}
              </>
            )}
          </div>
        ) : (
          /* ===== 履歴ページ ===== */
          <div className="space-y-2">
            {history.length === 0 ? (
              <p className={`text-sm text-center py-12 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('history.noHistory')}
              </p>
            ) : (
              <>
                {(isFree ? history.slice(0, FREE_VISIBLE_ENTRIES + 3) : history).map((item, index) => {
                  const isFaded = isFree && index >= FREE_VISIBLE_ENTRIES;
                  const fadeOpacity = isFaded ? Math.max(0.1, 1 - (index - FREE_VISIBLE_ENTRIES) * 0.3) : 1;
                  return (
                    <div
                      key={item.id}
                      onClick={isFaded ? undefined : () => onLoadEntry(item.id)}
                      className={`flex items-center gap-2 px-3 py-3 rounded-lg border transition-colors ${
                        isFaded
                          ? isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800'
                          : `cursor-pointer ${isLight ? 'border-gray-200 bg-white hover:bg-gray-50' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`
                      }`}
                      style={isFaded ? { opacity: fadeOpacity, filter: `blur(${Math.min(4, (index - FREE_VISIBLE_ENTRIES) * 1)}px)`, pointerEvents: 'none', userSelect: 'none' } : undefined}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                          {item.videoTitle || item.videoId}
                        </p>
                        <p className={`text-xs mt-0.5 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatDate(item.analyzedAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => requestRemoveHistory(e, item.id)}
                        className={`p-1.5 rounded transition-colors flex-shrink-0 ${isLight ? 'hover:bg-red-100 text-gray-400 hover:text-red-500' : 'hover:bg-red-900/30 text-gray-500 hover:text-red-400'}`}
                        title={t('history.deleteEntry')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                {isFree && history.length > FREE_VISIBLE_ENTRIES && (
                  <UpgradeCTA isLight={isLight} bgColor={bgColor} total={history.length} limit={FREE_VISIBLE_ENTRIES} t={t} label={t('history.recentHistory')} />
                )}
                {/* 全履歴削除ボタン */}
                {(!isFree || history.length <= FREE_VISIBLE_ENTRIES) && (
                  <button
                    onClick={requestClearAll}
                    className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors mt-2 ${isLight ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-500 hover:text-red-400 hover:bg-red-900/20'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('history.clearAll')}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 削除確認ポップアップ */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className={`mx-6 w-full max-w-xs rounded-2xl p-5 shadow-xl ${isLight ? 'bg-white' : 'bg-gray-800'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isLight ? 'bg-red-50' : 'bg-red-900/30'}`}>
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className={`text-base font-bold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {t('history.confirmDeleteTitle')}
              </h3>
              <p className={`text-sm mb-5 leading-relaxed ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                {confirmDialog.type === 'clearAll'
                  ? t('history.confirmClearAllDetail')
                  : confirmDialog.type === 'favorite'
                    ? t('history.confirmDeleteFavorite')
                    : t('history.confirmDeleteHistory')
                }
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                >
                  {t('history.confirmCancel')}
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  {t('history.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Freeプラン用アップグレードCTA */
function UpgradeCTA({ isLight, bgColor, total, limit, t, label }: {
  isLight: boolean; bgColor: string; total: number; limit: number;
  t: (key: string, params?: Record<string, string | number>) => string; label: string;
}) {
  return (
    <div className="relative -mt-1">
      <div
        className="absolute -top-16 left-0 right-0 h-16 pointer-events-none"
        style={{ background: `linear-gradient(to bottom, transparent, ${bgColor})` }}
      />
      <div className={`relative text-center py-5 px-4 rounded-xl border ${
        isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/80 border-gray-700'
      }`}>
        <Crown className={`w-7 h-7 mx-auto mb-2 ${isLight ? 'text-yellow-500' : 'text-yellow-400'}`} />
        <p className={`text-xs mb-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          {t('history.freeLimit', { limit, total })}
        </p>
        <p className={`text-sm font-semibold mb-3 ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
          {t('history.upgradeToSeeAll')}
        </p>
        <button
          className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-colors"
          style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
          onClick={() => {
            localStorage.setItem('yt-gemini-openSettings', 'true');
            window.location.reload();
          }}
        >
          {t('paywall.upgradeToPro')}
        </button>
      </div>
    </div>
  );
}

export default HistorySection;
