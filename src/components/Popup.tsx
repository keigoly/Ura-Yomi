/**
 * Popup Window コンポーネント
 */

import { useEffect, useState } from 'react';
import { Settings, Play, AlertCircle, CreditCard, Link } from 'lucide-react';
import { getCurrentYouTubeVideo, extractVideoId } from '../utils/youtube';
import { verifySession, getCredits, getVideoInfo } from '../services/apiServer';
import type { User } from '../types';
import { ANALYSIS_CREDIT_COST } from '../constants';
import Auth from './Auth';

function Popup() {
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

  const handleSettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  };

  // 認証されていない場合は認証画面を表示
  if (loading) {
    
    return (
      <div className="w-80 p-4 bg-gray-900 min-h-[400px]">
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-80 p-4 bg-gray-900 min-h-[400px]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">YouTubeコメント with Gemini</h1>
        </div>
        <Auth onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  const hasInsufficientCredits = credits !== null && credits < ANALYSIS_CREDIT_COST;

  return (
    <div className="w-80 p-4 bg-gray-900 min-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">YouTubeコメント with Gemini</h1>
        <div className="flex items-center gap-2">
          {credits !== null && (
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-lg">
              <CreditCard className="w-4 h-4 text-gray-300" />
              <span className="text-xs font-medium text-white">{credits}</span>
            </div>
          )}
          <button
            onClick={handleSettings}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="設定"
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
                <p className="text-xs text-gray-400 mb-1">タイトル</p>
                <p className="text-sm text-white line-clamp-2 mb-3">
                  {videoInfo.title}
                </p>
              </>
            )}
            {videoInfo.commentCount !== undefined && (
              <>
                <p className="text-xs text-gray-400 mb-1">コメント総数</p>
                <p className="text-lg font-semibold text-white">
                  {videoInfo.commentCount.toLocaleString()}件
                </p>
              </>
            )}
          </div>

          {/* Analyze Button */}
          <button
            onClick={() => handleAnalyze()}
            disabled={hasInsufficientCredits}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            解析を開始する ({ANALYSIS_CREDIT_COST}クレジット)
          </button>

          {/* Insufficient Credits Warning */}
          {hasInsufficientCredits && (
            <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-400 mb-1">
                    クレジットが不足しています
                  </p>
                  <p className="text-xs text-yellow-300 mb-2">
                    解析には{ANALYSIS_CREDIT_COST}クレジット必要です。現在の残高: {credits}クレジット
                  </p>
                  <button
                    onClick={() =>
                      chrome.tabs.create({
                        url: chrome.runtime.getURL('settings.html'),
                      })
                    }
                    className="text-xs text-yellow-400 underline hover:text-yellow-300"
                  >
                    クレジットを購入 →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm text-center">
            YouTube動画ページを開いてください
          </p>
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <div className="flex-1 border-t border-gray-700" />
            <span>またはURLを貼り付け</span>
            <div className="flex-1 border-t border-gray-700" />
          </div>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full pl-9 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            onClick={handleUrlAnalyze}
            disabled={!isValidUrl || hasInsufficientCredits || urlLoading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
              isValidUrl && !hasInsufficientCredits
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5" />
            {urlLoading ? '読み込み中...' : `解析を開始する (${ANALYSIS_CREDIT_COST}クレジット)`}
          </button>
        </div>
      )}
    </div>
  );
}

export default Popup;
