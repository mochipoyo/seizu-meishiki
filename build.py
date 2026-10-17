#!/usr/bin/env python3
"""src/ のファイルを1枚の index.html にまとめる。index.html は直接編集しないこと。"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"

HEAD = """<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="生年月日・時刻・出生地・名前から、四柱推命・算命学・西洋占星術・紫微斗数・九星気学・六星占術・数秘術・姓名判断・宿曜・マヤ暦などを計算し、共通する傾向と年運を総合判定する無料の占いアプリ。">
<meta property="og:title" content="星図と命式">
<meta property="og:description" content="11の占術を同じ出生データから計算し、総合判定する占いアプリ。">
<meta property="og:type" content="website">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
"""


def main():
    page = (SRC / "app.html").read_text(encoding="utf-8")
    strokes = (SRC / "strokes.txt").read_text(encoding="utf-8")
    page = page.replace("<script>/*STROKES*/</script>",
                        "<script>window.STROKE_DATA=" + json.dumps(strokes, ensure_ascii=False) + ";</script>")
    page = page.replace("<script>/*ENGINE*/</script>", "<script>\n" + (SRC / "engine.js").read_text(encoding="utf-8") + "\n</script>")
    page = page.replace("<script>/*DATA*/</script>", "<script>\n" + (SRC / "data.js").read_text(encoding="utf-8") + "\n</script>")
    page = page.replace("<script>/*GENRE*/</script>", "<script>\n" + (SRC / "genre.js").read_text(encoding="utf-8") + "\n</script>")
    page = page.replace("<script>/*EKIKYO*/</script>", "<script>\n" + (SRC / "ekikyo.js").read_text(encoding="utf-8") + "\n</script>")
    page = page.replace("<script>/*TAROT*/</script>", "<script>\n" + (SRC / "tarot.js").read_text(encoding="utf-8") + "\n</script>")
    # <title>〜</style> までを head に入れ、残りを body に入れる
    split = page.index("</style>") + len("</style>")
    out = HEAD + page[:split] + "\n</head>\n<body>\n" + page[split:] + "\n</body>\n</html>\n"
    (ROOT / "index.html").write_text(out, encoding="utf-8")
    print(f"index.html を生成しました（{len(out.encode('utf-8')):,} バイト）")


if __name__ == "__main__":
    main()
