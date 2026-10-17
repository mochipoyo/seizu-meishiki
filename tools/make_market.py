"""tools/market_raw.py から src/market.js を生成する。"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from market_raw import NI225, USDJPY, GBPJPY
out = {
  'asof': '2026-10-17',
  'source': 'TradingView（TVC:NI225 / FX:USDJPY / FX:GBPJPY の年足）',
  'series': {
    'ni225': dict(name='日経平均', unit='円', **NI225),
    'usdjpy': dict(name='ドル円', unit='円', **USDJPY),
    'gbpjpy': dict(name='ポンド円', unit='円', **GBPJPY),
  }}
p = pathlib.Path(__file__).parent.parent / 'src' / 'market.js'
p.write_text('/* 自動生成（tools/make_market.py）。直接編集しないこと。 */\n(function(r){r.UMarket=' + json.dumps(out, ensure_ascii=False) + ';if(typeof module!=="undefined"&&module.exports)module.exports=r.UMarket;})(typeof window!=="undefined"?window:globalThis);\n', encoding='utf-8')
print('wrote', p)
