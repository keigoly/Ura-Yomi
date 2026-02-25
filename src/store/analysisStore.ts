/**
 * 解析状態管理（Zustand）
 */

import { create } from 'zustand';
import type {
  AnalysisResult,
  AnalysisProgress,
  VideoInfo,
  YouTubeCommentThread,
} from '../types';

/**
 * 解析ストアの状態
 */
interface AnalysisState {
  isAnalyzing: boolean;
  progress: AnalysisProgress;
  videoInfo: VideoInfo | null;
  comments: YouTubeCommentThread[];
  result: AnalysisResult | null;
  error: string | null;

  // アクション
  startAnalysis: (videoId: string, title?: string, commentCount?: number) => void;
  updateProgress: (progress: Partial<AnalysisProgress>) => void;
  setComments: (comments: YouTubeCommentThread[]) => void;
  setResult: (result: AnalysisResult) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

/**
 * 初期状態
 */
const initialState = {
  isAnalyzing: false,
  progress: {
    stage: 'fetching' as const,
    current: 0,
    total: 0,
    message: '',
  },
  videoInfo: null,
  comments: [],
  result: null,
  error: null,
};

/**
 * 解析ストア
 */
export const useAnalysisStore = create<AnalysisState>((set) => ({
  ...initialState,

  startAnalysis: (videoId: string, title?: string, commentCount?: number) =>
    set({
      isAnalyzing: true,
      videoInfo: { videoId, title, commentCount },
      progress: {
        stage: 'fetching',
        current: 0,
        total: 0,
        message: 'コメント取得を開始...',
      },
      comments: [],
      result: null,
      error: null,
    }),

  updateProgress: (progress) =>
    set((state) => ({
      progress: { ...state.progress, ...progress },
    })),

  setComments: (comments) => set({ comments }),

  setResult: (result) =>
    set({
      result,
      isAnalyzing: false,
      progress: { ...initialState.progress, stage: 'complete' },
    }),

  setError: (error) =>
    set({
      error,
      isAnalyzing: false,
    }),

  reset: () => set(initialState),
}));
