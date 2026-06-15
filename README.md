# 旬献立 — 総合献立アプリ（フルスタック版）

季節の食材で、**献立・買い物・記録**までまるごと管理する Web アプリ。
**Node.js + Express + PostgreSQL** 構成・タブ式 UI・PWA で、Render にそのままデプロイできます。

## タブ構成

| タブ | 内容 |
|------|------|
| 📅 今日 | 今日のメニューを大きく表示。材料を人数分に換算、「食べた」記録・★評価、今週の流れ |
| 🍱 献立 | 季節・予算・たんぱく質から週7日を自動生成。栄養ダッシュボード・保存 |
| 🛒 買い物 | 献立から食材を合算し人数分に換算。チェック保存・コピー・印刷・スーパー比較 |
| 🗓 カレンダー | 日付に料理を割当（予定）＋食べた記録・★評価・メモ。月の統計・保存献立の履歴 |
| 🍳 料理 | 料理カタログCRUD。検索・季節/お気に入り絞り込み・並び替え |

## 主な機能

| 機能 | 説明 |
|------|------|
| 週間献立の自動生成 | 季節・予算・たんぱく質の条件から7日分を最適化（お気に入りを優先） |
| 料理カタログ(CRUD) | アプリ画面から料理を追加・編集・削除（DBに保存） |
| 予定＋記録（カレンダー） | 日付ごとに料理を割当・「食べた」・★評価・メモを保存。「今週の献立を反映」で一括登録 |
| 週間献立プラン保存・履歴 | 作成した献立を保存して後から呼び出し |
| 買い物リスト | 同じ食材を合算し、人数分（1〜6人）に分量を自動換算。チェック状態もDB保存 |
| 栄養ダッシュボード | 平均たんぱく質・カロリー・予算をアニメ表示。PFCを各日に可視化 |
| ダーク/ライトテーマ | OS設定に追従＋手動切替。設定はDBに保存 |
| PWA | ホーム画面に追加・オフライン起動（インストール可能） |

## アーキテクチャ

```
condate/
├── server.js              … Express サーバ（静的配信 + REST API）
├── db/
│   ├── pool.js            … PostgreSQL 接続プール
│   ├── schema.sql         … テーブル定義（起動時に自動適用）
│   └── seed.js            … 初期データ（料理24品）。空のとき自動投入
├── public/                … フロントエンド（PWA）
│   ├── index.html         … UI（モダンUI・インラインCSS）
│   ├── app.js             … API連携ロジック
│   ├── sw.js              … Service Worker（オフライン）
│   ├── manifest.webmanifest
│   └── icon-*.png / apple-touch-icon.png
├── render.yaml            … Render Blueprint（Web + DB を自動作成）
├── .env.example
└── package.json
```

### データモデル（認証なし・単一ユーザー）
- `dishes` … 料理カタログ（`is_favorite` 含む）
- `meal_plans` … 保存した週間献立（履歴）
- `app_state` … 単一行。設定・現在の献立・買い物チェック・最後のタブ
- `schedule` … 予定＋記録。日付(`YYYY-MM-DD`)ごとに料理・食べた・評価・メモ

### API
| メソッド | パス | 用途 |
|---|---|---|
| GET | `/api/dishes?season=` | 料理一覧 |
| POST/PUT/DELETE | `/api/dishes[/:id]` | 料理の追加・更新・削除 |
| PATCH | `/api/dishes/:id/favorite` | お気に入り切替 |
| GET/PUT | `/api/state` | アプリ状態の取得・保存 |
| GET/POST/DELETE | `/api/plans[/:id]` | 献立プランの取得・保存・削除 |
| GET | `/api/schedule?from=&to=` | 期間の予定・記録 |
| PUT/DELETE | `/api/schedule/:date` | 日付の予定・記録の保存・削除 |
| GET | `/api/health` | ヘルスチェック |

## Render へのデプロイ

1. このフォルダを GitHub リポジトリにプッシュ
2. Render ダッシュボード → **New +** → **Blueprint** → リポジトリを選択
3. `render.yaml` が読まれ、**Web サービス**と**PostgreSQL**が自動作成される
   - `DATABASE_URL` は Render が自動で注入
   - 初回起動時にテーブル作成＋料理24品を自動投入
4. 発行された URL をスマホで開き、「ホーム画面に追加」でアプリ化

> 無料プランの注意：Web サービスは無操作でスリープし初回アクセスが遅い。無料 PostgreSQL は有効期限あり（Renderの最新仕様を確認）。

## ローカルで動かす

PostgreSQL が必要です（ローカル or クラウドDBのURLでOK）。

```bash
npm install
cp .env.example .env        # DATABASE_URL を自分の環境に書き換え
npm run dev                 # http://localhost:3000
```

- 起動時にテーブル自動作成＋シード投入（`npm run seed` で手動投入も可）
- DBが無い場合でも静的画面は表示されますが、API は 500 を返します

## カスタマイズ

- **料理を追加**：アプリ右上の「🍳 料理管理」→「＋ 新しい料理を追加」（DBに保存）
- **初期データを変更**：`db/seed.js` の `SEED_DISHES` を編集
- **スーパーを実データ化**：`public/app.js` の `SUPERMARKETS` を Google Places API（バックエンド経由）の結果に置き換え

## 次の拡張候補
- ユーザー認証（複数人で別々の献立を管理）
- AI献立提案（Claude API：手元の食材・気分から動的生成）
- 各社チラシ・特売情報のリアルタイム取得
- レシピ手順・分量の詳細表示
