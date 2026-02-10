/**
 * Popup Window コンポーネント
 */

import { useEffect, useState } from 'react';
import { Settings, Play, AlertCircle, CreditCard, Link, PanelRight } from 'lucide-react';
import { getCurrentYouTubeVideo, extractVideoId } from '../utils/youtube';
import { verifySession, getCredits, getVideoInfo } from '../services/apiServer';
import type { User } from '../types';
import { ANALYSIS_CREDIT_COST } from '../constants';
import Auth from './Auth';
import { useTranslation } from '../i18n/useTranslation';

function Popup() {
  const { t } = useTranslation();
  const [videoInfo, setVideoInfo] = useState<{
    videoId: string;
    title?: string;
    commentCount?: number;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  const urlVideoId = extractVideoId(urlInput);
  const isValidUrl = urlVideoId !== null;

  useEffect(() => {
    checkAuth();
    loadVideoInfo();
  }, []);

  const checkAuth = async () => {
    setLoading(true);
    const result = await verifySession();
    
    if (result.success && result.user) {
      setUser(result.user);
      await loadCredits();
    }
    setLoading(false);
  };

  const loadCredits = async () => {
    const result = await getCredits();
    if (result.success && result.credits !== undefined) {
      setCredits(result.credits);
    }
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setCredits(authenticatedUser.credits);
  };

  const loadVideoInfo = async () => {
    const info = await getCurrentYouTubeVideo();
    if (info) {
      // サーバーから動画情報（タイトルとコメント総数）を取得
      try {
        const videoData = await getVideoInfo(info.videoId);
        if (videoData.success) {
          setVideoInfo({
            videoId: info.videoId,
            title: videoData.title || info.title,
            commentCount: videoData.commentCount,
          });
        } else {
          // エラーが発生した場合は、基本的な情報のみ設定
          setVideoInfo({
            videoId: info.videoId,
            title: info.title,
          });
        }
      } catch (error) {
        console.error('Failed to load video info:', error);
        // エラーが発生した場合は、基本的な情報のみ設定
        setVideoInfo({
          videoId: info.videoId,
          title: info.title,
        });
      }
    } else {
      setVideoInfo(null);
    }
  };

  const handleAnalyze = async (targetVideoId?: string, targetTitle?: string) => {
    const vid = targetVideoId || videoInfo?.videoId;
    const title = targetTitle || videoInfo?.title;
    if (!vid) return;

    // Side Panelを開く
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id && tab.windowId !== undefined) {
      await chrome.sidePanel.open({ windowId: tab.windowId });

      // chrome.storageを使用してSide Panelに解析開始を通知
      await chrome.storage.local.set({
        pendingAnalysis: {
          videoId: vid,
          title: title,
          timestamp: Date.now(),
        },
      });
      window.close();
    }
  };

  const handleUrlAnalyze = async () => {
    if (!urlVideoId) return;
    setUrlLoading(true);
    try {
      const videoData = await getVideoInfo(urlVideoId);
      const title = videoData.success ? videoData.title : undefined;
      await handleAnalyze(urlVideoId, title);
    } catch {
      await handleAnalyze(urlVideoId);
    } finally {
      setUrlLoading(false);
    }
  };

  const handleOpenSidePanel = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id && tab.windowId !== undefined) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      window.close();
    }
  };

  const handleSettings = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id && tab.windowId !== undefined) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      await chrome.storage.local.set({ openSettings: true });
      window.close();
    }
  };

  // 認証されていない場合は認証画面を表示
  if (loading) {
    
    return (
      <div className="w-80 p-4 bg-gray-900">
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">{t('auth.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-80 p-4 bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <img src={chrome.runtime.getURL('icons/logo-urayomi.png')} alt="ウラヨミ！" className="h-16" />
        </div>
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  const hasInsufficientCredits = credits !== null && credits < ANALYSIS_CREDIT_COST;

  return (
    <div className="w-80 p-4 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <img src={chrome.runtime.getURL('icons/logo-urayomi.png')} alt="ウラヨミ！" className="h-16" />
        <div className="flex items-center gap-2">
          {credits !== null && (
            <div
              className="rounded-full p-[1.5px]"
              style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
            >
              <div className="flex items-center gap-1 px-2.5 py-1 bg-[#0f0f0f] rounded-full">
                <CreditCard className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-xs font-bold text-white">{credits}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleOpenSidePanel}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title={t('popup.openSidePanel')}
          >
            <PanelRight className="w-5 h-5 text-gray-300" />
          </button>
          <button
            onClick={handleSettings}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title={t('popup.settings')}
          >
            <Settings className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Video Info Panel */}
      {videoInfo ? (
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            {videoInfo.title && (
              <>
                <p className="text-xs text-gray-400 mb-1">{t('side.title')}</p>
                <p className="text-sm text-white line-clamp-2 mb-3">
                  {videoInfo.title}
                </p>
              </>
            )}
            {videoInfo.commentCount !== undefined && (
              <>
                <p className="text-xs text-gray-400 mb-1">{t('side.commentCount')}</p>
                <p className="text-lg font-semibold text-white">
                  {videoInfo.commentCount.toLocaleString()}{t('side.commentUnit')}
                </p>
              </>
            )}
          </div>

          {/* Analyze Button */}
          <button
            onClick={() => handleAnalyze()}
            disabled={hasInsufficientCredits}
            className={`w-full rounded-[20px] p-[2px] transition-all ${
              hasInsufficientCredits
                ? 'opacity-40 cursor-not-allowed'
                : 'cursor-pointer hover:brightness-125 hover:shadow-[0_0_12px_2px_rgba(100,100,255,0.5)]'
            }`}
            style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
          >
            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f0f] rounded-[18px] text-white font-semibold">
              <Play className="w-5 h-5" />
              {t('side.startAnalysis')} ({ANALYSIS_CREDIT_COST} {t('side.credits')})
            </div>
          </button>

          {/* Insufficient Credits Warning */}
          {hasInsufficientCredits && (
            <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-400 mb-1">
                    {t('popup.insufficientCredits')}
                  </p>
                  <p className="text-xs text-yellow-300 mb-2">
                    {t('popup.creditsRequired', { cost: ANALYSIS_CREDIT_COST, balance: credits })}
                  </p>
                  <button
                    onClick={() =>
                      chrome.tabs.create({
                        url: chrome.runtime.getURL('settings.html'),
                      })
                    }
                    className="text-xs text-yellow-400 underline hover:text-yellow-300"
                  >
                    {t('popup.purchaseCredits')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm text-center">
            {t('popup.openYoutube')}
          </p>
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <div className="flex-1 border-t border-gray-700" />
            <span>{t('popup.orPasteUrl')}</span>
            <div className="flex-1 border-t border-gray-700" />
          </div>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t('side.urlPlaceholder')}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            onClick={handleUrlAnalyze}
            disabled={!isValidUrl || hasInsufficientCredits || urlLoading}
            className={`w-full rounded-[20px] p-[2px] transition-all ${
              isValidUrl && !hasInsufficientCredits
                ? 'cursor-pointer hover:brightness-125 hover:shadow-[0_0_12px_2px_rgba(100,100,255,0.5)]'
                : 'opacity-40 cursor-not-allowed'
            }`}
            style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
          >
            <div className={`flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f0f] rounded-[18px] font-semibold ${isValidUrl && !hasInsufficientCredits ? 'text-white' : 'text-gray-500'}`}>
              <Play className="w-5 h-5" />
              {urlLoading ? t('auth.loading') : `${t('side.startAnalysis')} (${ANALYSIS_CREDIT_COST} ${t('side.credits')})`}
            </div>
          </button>
        </div>
      )}

      {/* フッター: セリフ + シェアアイコン + バージョン */}
      <div className="flex flex-col items-center gap-1.5 mt-4 pt-3 border-t border-gray-800">
        <p className="text-[10px] text-gray-500">
          {t('share.yuchanAsk')}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const text = encodeURIComponent(t('share.text'));
              const url = encodeURIComponent('https://chromewebstore.google.com/detail/urayomi/placeholder');
              window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank');
            }}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
            title={t('share.x')}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
          <button
            onClick={() => window.open('https://www.instagram.com/', '_blank')}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
            title={t('share.instagram')}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </button>
          <button
            onClick={() => navigator.clipboard.writeText('https://chromewebstore.google.com/detail/urayomi/placeholder')}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
            title={t('share.copyUrl')}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </div>
        <span className="text-[9px] text-gray-600">v{chrome.runtime.getManifest().version}</span>
      </div>
    </div>
  );
}

export default Popup;
