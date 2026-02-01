/**
 * Google Gemini API クライアント
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AnalysisResult {
  summary: string;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topics: string[];
  hiddenGems: Array<{
    comment: string;
    author: string;
    likeCount: number;
    reason: string;
  }>;
  controversy: Array<{
    topic: string;
    description: string;
  }>;
  keywords: string[];
}

/**
 * Gemini APIでコメントを解析
 */
export async function analyzeCommentsWithGemini(
  apiKey: string,
  comments: Array<{ text: string; author: string; likeCount: number }>,
  summaryLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<AnalysisResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.0-flash' });

  // コメントデータを軽量化（不要なフィールドを削除）
  const simplifiedComments = comments.map(c => ({
    text: c.text,
    author: c.author,
    likeCount: c.likeCount,
  }));

  const commentsJson = JSON.stringify(simplifiedComments, null, 2);

  const summaryLengthMap = {
    short: '3-5行',
    medium: '5-10行',
    long: '10-20行',
  };

  const prompt = `以下のYouTube動画のコメントリスト（${comments.length}件）を分析してください。

【指示】
1. **要約**: 全体の要約を${summaryLengthMap[summaryLength]}で作成してください。
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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSONを抽出（コードブロック内のJSONを取得）
    let jsonText = text;
    
    // まずjsonコードブロックを探す
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      jsonText = jsonBlockMatch[1].trim();
    } else {
      // jsonコードブロックがない場合、通常のコードブロックを探す
      const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
        // 最初の行がjsonでない場合、削除
        if (!jsonText.startsWith('{')) {
          jsonText = jsonText.split('\n').slice(1).join('\n').trim();
        }
      } else {
        // コードブロックがない場合、最初の{から最後の}までを探す
        const braceMatch = text.match(/\{[\s\S]*\}/);
        if (braceMatch) {
          jsonText = braceMatch[0];
        }
      }
    }

    const analysisResult: AnalysisResult = JSON.parse(jsonText);
    
    // デフォルト値を設定（APIが一部のフィールドを返さない場合）
    return {
      summary: analysisResult.summary || '要約を取得できませんでした',
      sentiment: {
        positive: analysisResult.sentiment?.positive || 0,
        negative: analysisResult.sentiment?.negative || 0,
        neutral: analysisResult.sentiment?.neutral || 0,
      },
      topics: analysisResult.topics || [],
      hiddenGems: analysisResult.hiddenGems || [],
      controversy: analysisResult.controversy || [],
      keywords: analysisResult.keywords || [],
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    if (error instanceof SyntaxError) {
      throw new Error(`Gemini API解析エラー: JSONの解析に失敗しました。レスポンス形式が正しくない可能性があります。`);
    }
    throw new Error(`Gemini API解析エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * API Keyの接続テスト
 */
export async function testGeminiApiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.0-flash' });
    const result = await model.generateContent('Hello');
    await result.response;
    return true;
  } catch {
    return false;
  }
}
