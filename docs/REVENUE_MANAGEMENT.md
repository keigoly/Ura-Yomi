# 収益管理と開発者インセンティブ

## 概要

YouTubeコメントwithAIでは、クレジット購入時に開発者（あなた）へのインセンティブ（手数料）が自動的に計算・記録されます。

## 仕組み

### 収益の分配

クレジット購入時に、以下のように収益が分配されます：

```
ユーザーがクレジットを購入（例: 500円）
  ↓
開発者へのインセンティブ: 500円 × 30% = 150円
プラットフォーム収益: 500円 × 70% = 350円（APIコスト等に使用）
```

### 分配率の設定

`server/.env`ファイルで分配率を設定できます：

```env
DEVELOPER_COMMISSION_RATE=0.30  # 30%
```

- `0.30` = 30%（デフォルト）
- `0.50` = 50%
- `0.70` = 70%
- など、0.0〜1.0の範囲で設定可能

## 管理者API

### 月間収益統計を取得

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  http://localhost:3000/api/admin/revenue/monthly
```

レスポンス例：
```json
{
  "success": true,
  "stats": {
    "month": "2026-02",
    "totalRevenue": 5000,
    "developerCommission": 1500,
    "platformRevenue": 3500,
    "transactionCount": 10,
    "commissionRate": 0.30
  }
}
```

### 全期間の収益統計を取得

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  http://localhost:3000/api/admin/revenue/all-time
```

レスポンス例：
```json
{
  "success": true,
  "stats": {
    "totalRevenue": 50000,
    "totalDeveloperCommission": 15000,
    "totalPlatformRevenue": 35000,
    "totalTransactionCount": 100,
    "commissionRate": 0.30,
    "unpaidCommission": 15000
  }
}
```

### トランザクション履歴を取得

```bash
# 全ユーザーの履歴
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  http://localhost:3000/api/admin/revenue/transactions

# 特定ユーザーの履歴
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  "http://localhost:3000/api/admin/revenue/transactions?userId=google_123456789"
```

### 分配率を取得

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  http://localhost:3000/api/admin/revenue/commission-rate
```

## クレジットプランと価格

| プランID | クレジット数 | 価格 | 開発者インセンティブ（30%の場合） |
|---------|------------|------|----------------------------|
| `credits_100` | 100 | 500円 | 150円 |
| `credits_500` | 500 | 2,000円 | 600円 |
| `subscription_monthly` | 1,000 | 3,000円 | 900円 |

## 収益の記録

クレジット購入時に、以下の情報が記録されます：

- トランザクションID
- ユーザーID
- プランID
- 支払い金額
- 開発者への分配額
- プラットフォーム収益
- タイムスタンプ
- 決済情報

## 注意事項

1. **現在の実装**: 収益はメモリ内（Map）に保存されています。本番環境ではデータベースに保存する必要があります。

2. **決済処理**: 現在は簡易実装です。実際の決済処理（Stripe、PayPal等）を統合する必要があります。

3. **分配率の変更**: 分配率を変更した場合、新しい購入から新しい分配率が適用されます。過去の記録は変更されません。

4. **未払い分配額**: `unpaidCommission`は、記録された分配額の合計です。実際の支払い履歴を管理する場合は、支払い済み額を差し引く必要があります。

## 次のステップ

1. **データベース統合**: 収益記録をデータベースに保存
2. **決済システム統合**: Stripe、PayPal等の実際の決済処理
3. **支払い管理**: 開発者への実際の支払い履歴を管理
4. **ダッシュボード**: 収益統計を可視化する管理者ダッシュボード

<!-- Updated -->
