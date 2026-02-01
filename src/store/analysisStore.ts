/**
 * 解析状態管理（Zustand）
 */

import { create } from 'zustand';
import { AnalysisResult } from '../services/geminiApi';
import { YouTubeCommentThread } from '../services/youtubeApi';

interface AnalysisState {
  isAnalyzing: boolean;
  progress: {
    stage: 'fetching' | 'analyzing' | 'complete';
    current: number;
    total: number;
    message: string;
  };
  videoInfo: {
    videoId: string;
    title?: string;
  } | null;
  comments: YouTubeCommentThread[];
  result: AnalysisResult | null;
  error: string | null;
  startAnalysis: (videoId: string, title?: string) => void;
  updateProgress: (progress: Partial<AnalysisState['progress']>) => void;
  setComments: (comments: YouTubeCommentThread[]) => void;
  setResult: (result: AnalysisResult) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

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

export const useAnalysisStore = create<AnalysisState>((set) => ({
  ...initialState,
  startAnalysis: (videoId: string, title?: string) =>
    set({
      isAnalyzing: true,
      videoInfo: { videoId, title },
      progress: { stage: 'fetching', current: 0, total: 0, message: 'コメント取得を開始...' },
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
