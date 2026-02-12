/**
 * JSON解析ユーティリティ
 * AIレスポンスからJSONを抽出するための共通処理
 * 全パターンをモジュールレベルで事前コンパイル
 */

// ============================================================
// 事前コンパイル済み正規表現パターン
// ============================================================

/** ```json ... ``` (非貪欲) */
const RE_JSON_BLOCK = /```json\s*([\s\S]*?)\s*```/;
/** ```json ... ``` (貪欲) */
const RE_JSON_BLOCK_GREEDY = /```json\s*([\s\S]*)\s*```/;
/** ``` ... ``` (非貪欲) */
const RE_CODE_BLOCK = /```\s*([\s\S]*?)\s*```/;
/** ``` ... ``` (貪欲) */
const RE_CODE_BLOCK_GREEDY = /```\s*([\s\S]*)\s*```/;
/** { ... } 直接検出 */
const RE_BRACE_MATCH = /\{[\s\S]*\}/;
/** 末尾の余分なカンマ */
const RE_TRAILING_COMMA = /,\s*([}\]])/g;
/** 空の配列/オブジェクト修正 */
const RE_EMPTY_CONTAINER = /([,\[])\s*([}\]])/g;

// ============================================================
// コア関数
// ============================================================

/**
 * テキストからJSON文字列部分を抽出
 * コードブロック > 直接JSONの順で検出
 */
export function extractJsonText(text: string): string {
  if (!text || typeof text !== 'string') return text;

  const trimmed = text.trim();

  // パターン1: ```json ... ``` (非貪欲)
  let match = trimmed.match(RE_JSON_BLOCK);
  if (match) return match[1].trim();

  // パターン2: ```json ... ``` (貪欲)
  match = trimmed.match(RE_JSON_BLOCK_GREEDY);
  if (match) return match[1].trim();

  // パターン3: ``` ... ``` (非貪欲)
  match = trimmed.match(RE_CODE_BLOCK);
  if (match) {
    let jsonText = match[1].trim();
    if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) {
      jsonText = jsonText.split('\n').slice(1).join('\n').trim();
    }
    return jsonText;
  }

  // パターン4: ``` ... ``` (貪欲)
  match = trimmed.match(RE_CODE_BLOCK_GREEDY);
  if (match) {
    let jsonText = match[1].trim();
    if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) {
      jsonText = jsonText.split('\n').slice(1).join('\n').trim();
    }
    return jsonText;
  }

  // パターン5: { ... } 直接検出
  match = trimmed.match(RE_BRACE_MATCH);
  if (match) return match[0];

  return trimmed;
}

/**
 * JSON文字列を修復（trailing comma等の一般的なエラーを修正）
 */
export function repairJson(jsonText: string): string {
  if (!jsonText) return jsonText;
  let fixed = jsonText;
  fixed = fixed.replace(RE_TRAILING_COMMA, '$1');
  fixed = fixed.replace(RE_EMPTY_CONTAINER, '$1$2');
  return fixed;
}

/**
 * テキストからJSONを抽出・修復・パース（統合関数）
 */
export function extractAndParseJson<T>(text: string): T {
  const jsonText = extractJsonText(text);
  const repaired = repairJson(jsonText);
  return JSON.parse(repaired);
}

// ============================================================
// 解析結果専用パーサー
// ============================================================

/**
 * 感情分析値を数値に正規化
 */
function parseSentimentValue(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
}

/**
 * サーバーレスポンスの解析結果をパースする
 * SidePanel / SummaryTab 両方で使える一元化パーサー
 */
export function parseAnalysisResult(rawData: any): any {
  if (!rawData) return rawData;

  let resultData = rawData;

  // resultプロパティがある場合はマージして削除
  if (resultData.result && typeof resultData.result === 'object') {
    const { result: _, ...rest } = resultData;
    resultData = { ...rest, ...resultData.result };
  }

  // resultDataが文字列の場合はパース
  if (typeof resultData === 'string') {
    try {
      resultData = extractAndParseJson(resultData);
    } catch {
      // パース失敗時はそのまま返す
      return rawData;
    }
  }

  // summaryがJSON文字列 or コードブロックの場合を処理
  if (resultData && typeof resultData.summary === 'string') {
    const summaryText = resultData.summary.trim();
    const jsonText = extractJsonText(summaryText);

    if (jsonText && (jsonText.startsWith('{') || jsonText.startsWith('['))) {
      try {
        const repaired = repairJson(jsonText);
        const parsed = JSON.parse(repaired);

        // パースした結果をresultDataにマージ（parsed側が優先）
        resultData = {
          ...resultData,
          summary: parsed.summary || resultData.summary,
          sentiment: parsed.sentiment || resultData.sentiment,
          topics: parsed.topics || resultData.topics,
          hiddenGems: parsed.hiddenGems || resultData.hiddenGems,
          controversy: parsed.controversy || resultData.controversy,
          keywords: parsed.keywords || resultData.keywords,
        };
      } catch {
        // パース失敗時はそのまま
      }
    }
  }

  // sentiment正規化
  if (resultData.sentiment && typeof resultData.sentiment === 'object' && !Array.isArray(resultData.sentiment)) {
    resultData.sentiment = {
      positive: parseSentimentValue(resultData.sentiment.positive),
      negative: parseSentimentValue(resultData.sentiment.negative),
      neutral: parseSentimentValue(resultData.sentiment.neutral),
    };
  } else if (typeof resultData.sentiment === 'string') {
    try {
      const parsed = JSON.parse(resultData.sentiment);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        resultData.sentiment = {
          positive: parseSentimentValue(parsed.positive),
          negative: parseSentimentValue(parsed.negative),
          neutral: parseSentimentValue(parsed.neutral),
        };
      }
    } catch {
      // パース失敗時はデフォルト
      resultData.sentiment = { positive: 0, negative: 0, neutral: 0 };
    }
  }

  // topics正規化
  if (typeof resultData.topics === 'string') {
    try {
      const parsed = JSON.parse(resultData.topics);
      if (Array.isArray(parsed)) {
        resultData.topics = parsed.filter((t: any) => t && typeof t === 'string' && t.trim().length > 0);
      }
    } catch {
      resultData.topics = [];
    }
  } else if (Array.isArray(resultData.topics)) {
    resultData.topics = resultData.topics.filter((t: any) => t && typeof t === 'string' && t.trim().length > 0);
  }

  return resultData;
}

// ============================================================
// 後方互換: 旧API
// ============================================================

/**
 * @deprecated extractAndParseJson を使用してください
 */
export function extractJsonFromResponse<T>(text: string): T {
  return extractAndParseJson<T>(text);
}
