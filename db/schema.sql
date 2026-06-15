-- 旬献立 スキーマ（単一ユーザー / 認証なし）

-- 料理カタログ
CREATE TABLE IF NOT EXISTS dishes (
  id            SERIAL PRIMARY KEY,
  name          TEXT      NOT NULL,
  seasons       TEXT[]    NOT NULL DEFAULT '{}',   -- {'spring','summer',...}
  protein       INT       NOT NULL DEFAULT 0,
  carbs         INT       NOT NULL DEFAULT 0,
  fat           INT       NOT NULL DEFAULT 0,
  kcal          INT       NOT NULL DEFAULT 0,
  cost          INT       NOT NULL DEFAULT 0,       -- 1人分の主菜材料費(円)
  main_protein  TEXT      NOT NULL DEFAULT '',
  ingredients   TEXT[]    NOT NULL DEFAULT '{}',
  steps         TEXT[]    NOT NULL DEFAULT '{}',    -- レシピ手順
  prep_time     INT       NOT NULL DEFAULT 15,      -- 調理時間(分)
  meal_type     TEXT[]    NOT NULL DEFAULT '{dinner}',
  is_favorite   BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 週間献立プラン（保存・履歴）
CREATE TABLE IF NOT EXISTS meal_plans (
  id          SERIAL PRIMARY KEY,
  title       TEXT    NOT NULL DEFAULT '',
  season      TEXT    NOT NULL DEFAULT '',
  servings    INT     NOT NULL DEFAULT 2,
  budget      INT,
  min_protein INT,
  dish_ids    INT[]   NOT NULL DEFAULT '{}',        -- 曜日順の dish.id 配列
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- アプリ状態（単一行: 設定・現在の献立・買い物チェック）
CREATE TABLE IF NOT EXISTS app_state (
  id               INT     PRIMARY KEY,
  settings         JSONB   NOT NULL DEFAULT '{}',
  current_dish_ids INT[]   NOT NULL DEFAULT '{}',
  checked_items    TEXT[]  NOT NULL DEFAULT '{}',
  CONSTRAINT app_state_single CHECK (id = 1)
);

-- 予定＋記録（日付ごとに1食。割当・食べた・評価・メモ）
-- date は 'YYYY-MM-DD' 文字列（タイムゾーン問題を避けるため TEXT）
CREATE TABLE IF NOT EXISTS schedule (
  date     TEXT    PRIMARY KEY,
  dish_id  INT,
  note     TEXT    NOT NULL DEFAULT '',
  eaten    BOOLEAN NOT NULL DEFAULT FALSE,
  rating   INT     NOT NULL DEFAULT 0
);

