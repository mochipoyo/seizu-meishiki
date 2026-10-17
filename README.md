# 星図と命式

生年月日・時刻・出生地・名前から11の占術を計算し、共通する傾向と年運を総合判定する無料の占いWebアプリです。

公開URL: https://mochipoyo.github.io/seizu-meishiki/

## 対応している占術

四柱推命 / 算命学 / 易占い（毎日の一卦） / タロット / 世の中の暦（今後20年の天文・暦・相場アノマリー） / 西洋占星術（ホロスコープ・星占い） / 紫微斗数 / 九星気学 / 六星占術 / 五星三心占い（命数は手入力） / 数秘術 / 姓名判断 / 宿曜占星術 / マヤ暦

入力内容はブラウザの中だけで計算し、外部には送信しません。

## ファイル構成

- `src/app.html` 画面（HTML・CSS・画面用のスクリプト）
- `src/engine.js` 計算エンジン（暦・天体・各占術）
- `src/data.js` 表示する文言
- `src/genre.js` ジャンル別（金運・仕事運・恋愛運など）と月別運勢の分析
- `src/ekikyo.js` 易占い（六十四卦と三枚硬貨法）
- `src/tarot.js` タロット（78枚・正逆・5種類のスプレッド）
- `src/world.js` 世の中の暦（天文イベント・年のテーマ・歴史年表・相場アノマリー）
- `src/market.js` 相場の年次データ（`tools/make_market.py` で生成）
- `src/strokes.txt` 漢字の画数データ
- `build.py` `src/` のファイルを1枚の `index.html` にまとめるスクリプト

`index.html` は直接編集せず、`src/` を直してから次を実行してください。

```
python3 build.py
```

## 使用しているデータ・ライブラリ

- 相場データ: TradingView の年足（TVC:NI225、FX:USDJPY、FX:GBPJPY）を2026年10月17日に取得し、終値・始値を `tools/market_raw.py` に転記
- 天体計算: [Astronomy Engine](https://github.com/cosinekitty/astronomy)（MIT License）をCDNから読み込み
- 漢字の画数: [KANJIDIC](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project)（Electronic Dictionary Research and Development Group, CC BY-SA 4.0）由来のデータを、[kanji-data](https://github.com/davidluzgouveia/kanji-data) 経由で画数のみ抽出して使用。`src/strokes.txt` は CC BY-SA 4.0 に従います。

## 注意

占いは統計的・科学的に効果が確かめられた予測ではありません。各占術の計算方法と、本アプリ独自の仮定はアプリ内の「計算の根拠」タブに記載しています。
