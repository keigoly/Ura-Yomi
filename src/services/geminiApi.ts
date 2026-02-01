/**
 * Google Gemini API クライアント
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnalysisResult, SummaryLength } from '../types';
import { GEMINI_MODEL, SUMMARY_LENGTH_MAP } from '../constants';
import { extractJsonFromResponse } from '../utils/jsonParser';

/**
 * コメントデータ（解析用の簡略化された形式）
 */
interface CommentData {
  text: string;
  author: string;
  likeCount: number;
}

/**
 * 解析プロンプトを生成
 */
function buildAnalysisPrompt(
  comments: CommentData[],
  summaryLength: SummaryLength
): string {
  const commentsJson = JSON.stringify(comments, null, 2);

  return `以下のYouTube動画のコメントリスト（${comments.length}件）を分析してください。

【指示】
1. **要約**: 全体の要約を${SUMMARY_LENGTH_MAP[summaryLength]}で作成してください。
2. **感情分析**: ポジティブ、ネガティブ、ニュートラルの比率を算出してください（合計100%）。
3. **主要トピック**: 議論されている主要なトピックを5-10個抽出してください。
4. **Hidden Gems（重要）**: いいね数が平均以下だが、具体的かつ論理的な指摘を含んでいる、または議論の核心を突いているコメントを5-10個特定してください。各コメントについて、なぜ価値があると判断したかの理由も記載してください。
5. **Controversy**: 意見が割れているポイントを3-5個特定してください。
6. **頻出キーワード**: 頻繁に出現するキーワードを10-20個抽出してください。

【コメントデータ】
\`\`\`json
${commentsJson}
\`\`\`

【出力形式】
以下のJSON形式で返してください：
\`\`\`json
{
  "summary": "要約テキスト",
  "sentiment": {
    "positive": 45.5,
    "negative": 20.3,
    "neutral": 34.2
  },
  "topics": ["トピック1", "トピック2", ...],
  "hiddenGems": [
    {
      "comment": "コメント本文",
      "author": "投稿者名",
      "likeCount": 5,
      "reason": "なぜ価値があるか"
    }
  ],
  "controversy": [
    {
      "topic": "議論のポイント",
      "description": "説明"
    }
  ],
  "keywords": ["キーワード1", "キーワード2", ...]
}
\`\`\``;
}

/**
 * 解析結果にデフォルト値を適用
 */
function normalizeAnalysisResult(raw: Partial<AnalysisResult>): AnalysisResult {
  return {
    summary: raw.summary || '要約を取得できませんでした',
    sentiment: {
      positive: raw.sentiment?.positive || 0,
      negative: raw.sentiment?.negative || 0,
      neutral: raw.sentiment?.neutral || 0,
    },
    topics: raw.topics || [],
    hiddenGems: raw.hiddenGems || [],
    controversy: raw.controversy || [],
    keywords: raw.keywords || [],
  };
}

/**
 * Gemini APIでコメントを解析
 */
export async function analyzeCommentsWithGemini(
  apiKey: string,
  comments: CommentData[],
  summaryLength: SummaryLength = 'medium'
): Promise<AnalysisResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const prompt = buildAnalysisPrompt(comments, summaryLength);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const rawResult = extractJsonFromResponse<Partial<AnalysisResult>>(text);
    return normalizeAnalysisResult(rawResult);
  } catch (error) {
    console.error('Gemini API Error:', error);

    if (error instanceof SyntaxError) {
      throw new Error(
        'Gemini API解析エラー: JSONの解析に失敗しました。レスポンス形式が正しくない可能性があります。'
      );
    }

    throw new Error(
      `Gemini API解析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * API Keyの接続テスト
 */
export async function testGeminiApiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent('Hello');
    await result.response;
    return true;
  } catch {
    return false;
  }
}
