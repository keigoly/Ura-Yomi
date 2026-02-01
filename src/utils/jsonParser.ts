/**
 * JSON解析ユーティリティ
 * AIレスポンスからJSONを抽出するための共通処理
 */

/**
 * AIレスポンステキストからJSONを抽出
 * @param text AIからのレスポンステキスト
 * @returns パースされたJSONオブジェクト
 */
export function extractJsonFromResponse<T>(text: string): T {
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

  return JSON.parse(jsonText);
}
