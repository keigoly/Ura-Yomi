/**
 * Popup Window コンポーネント
 */

import { useEffect, useState } from 'react';
import { Settings, Play, AlertCircle, Link, PanelRight, Crown } from 'lucide-react';
import { getCurrentYouTubeVideo, extractVideoId } from '../utils/youtube';
import { verifySession, getUserPlan, getVideoInfo } from '../services/apiServer';
import type { User, PlanResponse } from '../types';
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
  const [planInfo, setPlanInfo] = useState<PlanResponse | null>(null);
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
      await loadPlanInfo();
    }
    setLoading(false);
  };

  const loadPlanInfo = async () => {
    const result = await getUserPlan();
    if (result.success) {
      setPlanInfo(result);
      chrome.storage.local.set({ planInfo: { plan: result.plan, dailyRemaining: result.dailyRemaining } });
    }
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    loadPlanInfo();
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
          setVideoInfo({
            videoId: info.videoId,
            title: info.title,
          });
        }
      } catch (error) {
        console.error('Failed to load video info:', error);
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

  const isPro = planInfo?.plan === 'pro';
  const hasReachedDailyLimit = !isPro && planInfo !== null && planInfo.dailyRemaining !== null && planInfo.dailyRemaining <= 0;

  return (
    <div className="w-80 p-4 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <img src={chrome.runtime.getURL('icons/logo-urayomi.png')} alt="ウラヨミ！" className="h-16" />
        <div className="flex items-center gap-2">
          {/* Plan Badge */}
          {planInfo && (
            <button
              onClick={() => {
                localStorage.setItem('yt-gemini-openPlanSection', 'true');
                handleOpenSidePanel();
              }}
              className="cursor-pointer transition-opacity hover:opacity-80"
              title={t('settings.planManagement')}
            >
              {isPro ? (
                <span className="relative inline-flex rounded-full p-[2px] overflow-hidden" style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}>
                  <span className="block text-xs font-bold px-3 py-0.5 rounded-full bg-gray-900 text-gray-100">PRO</span>
                </span>
              ) : (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-800 border border-gray-600 text-gray-400">FREE</span>
              )}
            </button>
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
            disabled={hasReachedDailyLimit}
            className={`w-full rounded-[20px] p-[2px] transition-all ${
              hasReachedDailyLimit
                ? 'opacity-40 cursor-not-allowed'
                : 'cursor-pointer hover:brightness-125 hover:shadow-[0_0_12px_2px_rgba(100,100,255,0.5)]'
            }`}
            style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
          >
            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f0f] rounded-[18px] text-white font-semibold">
              <Play className="w-5 h-5" />
              {t('side.startAnalysis')}
            </div>
          </button>

          {/* Daily Limit Warning (Free users only) */}
          {hasReachedDailyLimit && (
            <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-400 mb-1">
                    {t('popup.dailyLimitReached')}
                  </p>
                  <p className="text-xs text-yellow-300 mb-2">
                    {t('popup.upgradeToProMessage')}
                  </p>
                  <button
                    onClick={handleSettings}
                    className="text-xs text-yellow-400 underline hover:text-yellow-300"
                  >
                    {t('popup.upgradeToPro')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Daily remaining for free users */}
          {!isPro && planInfo && planInfo.dailyRemaining !== null && planInfo.dailyRemaining > 0 && (
            <p className="text-xs text-gray-500 text-center">
              {t('popup.dailyRemaining', { remaining: planInfo.dailyRemaining })}
            </p>
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
            disabled={!isValidUrl || hasReachedDailyLimit || urlLoading}
            className={`w-full rounded-[20px] p-[2px] transition-all ${
              isValidUrl && !hasReachedDailyLimit
                ? 'cursor-pointer hover:brightness-125 hover:shadow-[0_0_12px_2px_rgba(100,100,255,0.5)]'
                : 'opacity-40 cursor-not-allowed'
            }`}
            style={{ background: 'conic-gradient(from 180deg, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8C00, #FF0000, #0000FF)' }}
          >
            <div className={`flex items-center justify-center gap-2 px-4 py-3 bg-[#0f0f0f] rounded-[18px] font-semibold ${isValidUrl && !hasReachedDailyLimit ? 'text-white' : 'text-gray-500'}`}>
              <Play className="w-5 h-5" />
              {urlLoading ? t('auth.loading') : t('side.startAnalysis')}
            </div>
          </button>
        </div>
      )}

      {/* フッター: セリフ + シェアアイコン + バージョン */}
      <div className="flex flex-col items-center gap-1.5 mt-4 pt-3 border-t border-gray-800">
        <p className="text-[10px] text-gray-500">
          {t('share.yuchanAsk')}
        </p>
        <div className="flex items-center gap-2">
          {/* X (Twitter) */}
          <button
            onClick={() => {
              const text = encodeURIComponent(t('share.text'));
              const url = encodeURIComponent('https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn');
              window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, '_blank');
            }}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
            title={t('share.x')}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>
          {/* LINE */}
          <button
            onClick={() => {
              const url = encodeURIComponent('https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn');
              window.open(`https://social-plugins.line.me/lineit/share?url=${url}&text=${encodeURIComponent(t('share.text'))}`, '_blank');
            }}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
            title={t('share.line')}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1c-6.615 0-12 4.398-12 9.806 0 4.882 4.27 8.934 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.104 9.436-7.019C23.176 14.748 24 12.362 24 9.806 24 5.398 18.615 1 12 1zM6.63 13.224H4.622a.48.48 0 0 1-.481-.48V8.34a.48.48 0 0 1 .962 0v3.922H6.63a.48.48 0 0 1 0 .962zm2.276 0a.48.48 0 0 1-.481-.48V8.34a.48.48 0 0 1 .962 0v4.404a.48.48 0 0 1-.48.48zm5.186 0a.48.48 0 0 1-.396-.208l-2.348-3.218v2.946a.48.48 0 0 1-.962 0V8.34a.48.48 0 0 1 .48-.48h.015a.48.48 0 0 1 .396.207l2.346 3.216V8.34a.48.48 0 0 1 .962 0v4.404a.48.48 0 0 1-.48.48h-.013zm4.178-3.463a.48.48 0 0 1 0 .962h-1.908v1.02h1.908a.48.48 0 0 1 0 .962h-2.389a.48.48 0 0 1-.481-.48V8.34a.48.48 0 0 1 .48-.48h2.39a.48.48 0 0 1 0 .962h-1.909v1.019h1.909z" />
            </svg>
          </button>
          {/* Facebook */}
          <button
            onClick={() => {
              const url = encodeURIComponent('https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn');
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
            }}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
            title={t('share.facebook')}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>
          {/* Reddit */}
          <button
            onClick={() => {
              const url = encodeURIComponent('https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn');
              const title = encodeURIComponent(t('share.text'));
              window.open(`https://www.reddit.com/submit?url=${url}&title=${title}`, '_blank');
            }}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
            title={t('share.reddit')}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
          </button>
          {/* Chrome Web Store URLコピー */}
          <button
            onClick={() => navigator.clipboard.writeText('https://chromewebstore.google.com/detail/mhgmmpapgdegmimfdgmanbdakeopmojn')}
            className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors text-gray-500 hover:text-gray-300"
            title={t('share.copyUrl')}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.819 7.555l-3.953 6.848A12 12 0 0 0 24 12c0-1.576-.309-3.08-.855-4.455zM12 8.181a3.818 3.818 0 1 0 0 7.636 3.818 3.818 0 0 0 0-7.636z" />
            </svg>
          </button>
        </div>
        <span className="text-[9px] text-gray-600">v{chrome.runtime.getManifest().version}</span>
      </div>
    </div>
  );
}

export default Popup;
