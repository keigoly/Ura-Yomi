/**
 * Settings Page コンポーネント
 */

import { useEffect, useState } from 'react';
import { Save, Check, X, CreditCard } from 'lucide-react';
import { getSettings, saveSettings } from '../utils/storage';
import { testYouTubeApiKey } from '../services/youtubeApi';
import { testGeminiApiKey } from '../services/geminiApi';
import { AppSettings } from '../utils/storage';
import Billing from './Billing';
import { getCredits, CreditsResponse } from '../services/apiServer';

function Settings() {
  const [settings, setSettings] = useState<AppSettings>({
    youtubeApiKey: '',
    geminiApiKey: '',
    commentLimit: 10000,
    summaryLength: 'medium',
  });
  const [youtubeApiKeyVisible, setYoutubeApiKeyVisible] = useState(false);
  const [geminiApiKeyVisible, setGeminiApiKeyVisible] = useState(false);
  const [testing, setTesting] = useState<{ youtube: boolean; gemini: boolean }>({
    youtube: false,
    gemini: false,
  });
  const [testResults, setTestResults] = useState<{ youtube: boolean | null; gemini: boolean | null }>({
    youtube: null,
    gemini: null,
  });
  const [saved, setSaved] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    loadSettings();
    loadCredits();
  }, []);

  const loadCredits = async () => {
    const result = await getCredits();
    if (result.success && result.credits !== undefined) {
      setCredits(result.credits);
    }
  };

  const loadSettings = async () => {
    const currentSettings = await getSettings();
    setSettings(currentSettings);
  };

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestYouTube = async () => {
    if (!settings.youtubeApiKey) return;
    setTesting((prev) => ({ ...prev, youtube: true }));
    const result = await testYouTubeApiKey(settings.youtubeApiKey);
    setTestResults((prev) => ({ ...prev, youtube: result }));
    setTesting((prev) => ({ ...prev, youtube: false }));
  };

  const handleTestGemini = async () => {
    if (!settings.geminiApiKey) return;
    setTesting((prev) => ({ ...prev, gemini: true }));
    const result = await testGeminiApiKey(settings.geminiApiKey);
    setTestResults((prev) => ({ ...prev, gemini: result }));
    setTesting((prev) => ({ ...prev, gemini: false }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">設定</h1>

        {/* API Key取得ガイド */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">📋 API Keyの取得方法</h2>
          <div className="text-xs text-blue-800 space-y-2">
            <p><strong>1. YouTube Data API Key:</strong></p>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Cloud Console
                </a>
                にアクセス
              </li>
              <li>プロジェクトを作成または選択</li>
              <li>「APIとサービス」→「ライブラリ」で「YouTube Data API v3」を有効化</li>
              <li>「認証情報」→「認証情報を作成」→「APIキー」を選択</li>
            </ol>
            <p className="mt-2"><strong>2. Google Gemini API Key:</strong></p>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google AI Studio
                </a>
                にアクセス
              </li>
              <li>「Create API Key」をクリック</li>
              <li>API Keyをコピー</li>
            </ol>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* YouTube API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube Data API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={youtubeApiKeyVisible ? 'text' : 'password'}
                  value={settings.youtubeApiKey || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, youtubeApiKey: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="YouTube Data API v3 のAPI Keyを入力"
                />
                <button
                  type="button"
                  onClick={() => setYoutubeApiKeyVisible(!youtubeApiKeyVisible)}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 text-sm"
                >
                  {youtubeApiKeyVisible ? '非表示' : '表示'}
                </button>
              </div>
              <button
                onClick={handleTestYouTube}
                disabled={!settings.youtubeApiKey || testing.youtube}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {testing.youtube ? 'テスト中...' : 'テスト'}
              </button>
            </div>
            {testResults.youtube !== null && (
              <div className="mt-2 flex items-center gap-2">
                {testResults.youtube ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">接続成功</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">接続失敗</span>
                  </>
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Cloud Console
              </a>
              でAPI Keyを取得できます
            </p>
          </div>

          {/* Gemini API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Gemini API Key
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={geminiApiKeyVisible ? 'text' : 'password'}
                  value={settings.geminiApiKey || ''}
                  onChange={(e) =>
                    setSettings({ ...settings, geminiApiKey: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Google AI Studio または Google Cloud のAPI Keyを入力"
                />
                <button
                  type="button"
                  onClick={() => setGeminiApiKeyVisible(!geminiApiKeyVisible)}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-700 text-sm"
                >
                  {geminiApiKeyVisible ? '非表示' : '表示'}
                </button>
              </div>
              <button
                onClick={handleTestGemini}
                disabled={!settings.geminiApiKey || testing.gemini}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {testing.gemini ? 'テスト中...' : 'テスト'}
              </button>
            </div>
            {testResults.gemini !== null && (
              <div className="mt-2 flex items-center gap-2">
                {testResults.gemini ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">接続成功</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-600">接続失敗</span>
                  </>
                )}
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google AI Studio
              </a>
              または
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Cloud Console
              </a>
              でAPI Keyを取得できます
            </p>
          </div>

          {/* Comment Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              取得コメント数上限
            </label>
            <select
              value={settings.commentLimit || 10000}
              onChange={(e) =>
                setSettings({ ...settings, commentLimit: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={500}>500件</option>
              <option value={2000}>2,000件</option>
              <option value={5000}>5,000件</option>
              <option value={10000}>10,000件（MAX）</option>
            </select>
          </div>

          {/* Summary Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              要約の長さ
            </label>
            <select
              value={settings.summaryLength || 'medium'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  summaryLength: e.target.value as 'short' | 'medium' | 'long',
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="short">Short（3-5行）</option>
              <option value="medium">Medium（5-10行）</option>
              <option value="long">Long（10-20行）</option>
            </select>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5" />
                  保存しました
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  設定を保存
                </>
              )}
            </button>
          </div>
        </div>

        {/* 課金セクション */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">クレジット管理</h2>
            {credits !== null && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">{credits}クレジット</span>
              </div>
            )}
          </div>
          
          {showBilling ? (
            <Billing
              onPurchaseSuccess={() => {
                setShowBilling(false);
                loadCredits();
              }}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                クレジットが不足している場合は、追加購入できます。
              </p>
              <button
                onClick={() => setShowBilling(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <CreditCard className="w-5 h-5" />
                クレジットを購入
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
