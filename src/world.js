/* 世の中の暦：天文・暦イベント（計算）、占術上の年のテーマ、歴史の振り返り、相場アノマリー検証。 */
(function (root) {
  'use strict';
  const A = (typeof require === 'function' && typeof window === 'undefined') ? require('astronomy-engine') : root.Astronomy;
  const U = root.Uranai;
  const mod = (a, n) => ((a % n) + n) % n;

  // ---------------- 占術上の年のテーマ ----------------
  const STEM_T = ['甲：大樹。新しい芽吹き、改革の始まり', '乙：草花。しなやかな広がり、調整', '丙：太陽。明るさ・拡大・表面化', '丁：灯火。内なる熱、技術・文化の深化', '戊：山。安定・土台づくり', '己：田畑。育成・実務・地道な蓄え', '庚：鋼。決断・刷新・対立の表面化', '辛：宝石。洗練・選別・価値の見直し', '壬：大河。大きな流れ・移動・変化', '癸：雨。浸透・準備・次への静かな蓄積'];
  const BR_T = ['子：始まりと繁殖', '丑：忍耐と基盤固め', '寅：勢いよく走り出す', '卯：跳ねるような伸び', '辰：大きな動き・上昇の極み', '巳：知恵と変容・天井圏', '午：最も高い熱と転換', '未：粘りと辛抱', '申：変化と騒がしさ', '酉：実りと収穫・騒がしさ', '戌：守りと笑い', '亥：固まる・次の準備'];
  const KYU_WORLD = [
    '一白水星：水の年。流れ・人のつながり・水面下の動きが表に出やすい。物事の始まりと冷え込みの両面。',
    '二黒土星：大地の年。地道な努力、労働・生活基盤・農業が重視される。変化はゆっくり。',
    '三碧木星：雷の年。新しいものが勢いよく芽を出し、技術・情報・若い力が注目される。',
    '四緑木星：風の年。交流・交渉・流通が広がり、まとまる話が増える。',
    '五黄土星：中央の年。強いエネルギーで、破壊と再生が同時に起こりやすいとされる。',
    '六白金星：天の年。権威・政治・資本の動きが活発になり、リーダーの交代も。',
    '七赤金星：沢の年。金融・飲食・娯楽が活発。喜びと浪費、口論も起こりやすい。',
    '八白土星：山の年。変化・継承・相続・不動産。古い体制の入れ替わり。',
    '九紫火星：火の年。注目・名誉・技術・芸術が華やかになり、隠れていたことが明るみに。',
  ];
  const SIGN_DOMAIN = ['指導者・軍事・新規事業・スポーツ', '金融・農業・資源・不動産価値', '通信・メディア・交通・教育', '住宅・家族・食料・国土', '娯楽・エンタメ・指導者の存在感・子ども', '医療・労働・健康・実務', '外交・司法・同盟・美', '金融の再編・債務・エネルギー・保険', '宗教・高等教育・海外・航空・法', '政府・大企業・制度・規律', 'テクノロジー・社会改革・ネットワーク', '医療・福祉・海・芸術・幻想'];
  const UNIVERSAL = { 1: '始まりの年（新しい周期の起点）', 2: '協調と調整の年', 3: '表現と拡大の年', 4: '基盤固めと制度の年', 5: '変化と自由の年', 6: '責任と調和の年', 7: '内省と探究の年', 8: '力と経済の年', 9: '完了と手放しの年' };
  const ROKU = [['土星', [10, 11]], ['金星', [8, 9]], ['火星', [6, 7]], ['天王星', [4, 5]], ['木星', [2, 3]], ['水星', [0, 1]]];
  const CYC = ['種子', '緑生', '立花', '健弱', '達成', '乱気', '再会', '財成', '安定', '陰影', '停止', '減退'];
  const TCH = ['子丑', '寅卯', '辰巳', '午未', '申酉', '戌亥'];
  const digitsum = n => String(n).split('').reduce((a, b) => a + +b, 0);
  const red = n => { while (n > 9) n = digitsum(n); return n; };
  const SIGNS = ['牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座', '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'];
  function lon(body, d) { const t = A.MakeTime(d); if (body === 'Sun') return A.SunPosition(t).elon; if (body === 'Moon') return A.EclipticGeoMoon(t).lon; return A.Ecliptic(A.GeoVector(A.Body[body], t, true)).elon; }
  const sgn = l => Math.floor(mod(l, 360) / 30);

  function yearTheme(Y) {
    const i = mod(Y - 4, 60), s = i % 10, b = i % 12;
    const kyu = U.honmeiOf(Y);
    const roku = [];
    ROKU.forEach(([n, [X, Yb]]) => [['+', X], ['−', Yb]].forEach(([sg, stop]) => { const c = CYC[mod(b - (stop + 2), 12)]; if (['陰影', '停止', '減退'].includes(c)) roku.push(`${n}人(${sg})＝${c}`); }));
    const tc = TCH.find(p => p.includes(U.BRANCHES[b]));
    const pos = m => [0, 6, 11].map(mm => sgn(lon(m, new Date(Date.UTC(Y, mm, 15)))));
    const uniq = a => a.filter((x, k) => a.indexOf(x) === k);
    const ju = uniq(pos('Jupiter')), sa = uniq(pos('Saturn'));
    return { Y, kanshi: U.kanshi(i), stem: s, branch: b, stemText: STEM_T[s], brText: BR_T[b], kyu, kyuName: U.KYUSEI[kyu - 1], kyuText: KYU_WORLD[kyu - 1], roku, tc: tc + '天中殺', uni: red(Y), uniText: UNIVERSAL[red(Y)], jupiter: ju, saturn: sa, jText: ju.map(x => `${SIGNS[x]}（${SIGN_DOMAIN[x]}）`).join(' → '), sText: sa.map(x => `${SIGNS[x]}（${SIGN_DOMAIN[x]}）`).join(' → ') };
  }

  // ---------------- 天文イベント ----------------
  const TOKYO = A ? new A.Observer(35.69, 139.69, 0) : null;
  const JST = d => new Date(d.getTime() + 9 * 3600e3);
  const fmt = d => { const t = JST(d); return `${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };
  const fmtFull = d => { const t = JST(d); return `${t.getUTCFullYear()}/${t.getUTCMonth() + 1}/${t.getUTCDate()}`; };
  function moonUp(time) { const eq = A.Equator(A.Body.Moon, time, TOKYO, true, true); return A.Horizon(time, TOKYO, eq.ra, eq.dec, 'normal').altitude > 0; }
  function eventsOfYear(Y) {
    const ev = [], s = new Date(Date.UTC(Y, 0, 1) - 9 * 3600e3), e = new Date(Date.UTC(Y + 1, 0, 1) - 9 * 3600e3);
    // 季節
    const se = A.Seasons(Y);
    [['春分', se.mar_equinox], ['夏至', se.jun_solstice], ['秋分', se.sep_equinox], ['冬至', se.dec_solstice]].forEach(([n, t]) => ev.push({ d: t.date, kind: 'season', text: n }));
    // 月食
    let le = A.SearchLunarEclipse(A.MakeTime(s));
    while (le.peak.date < e) { const k = { penumbral: '半影月食', partial: '部分月食', total: '皆既月食' }[le.kind]; ev.push({ d: le.peak.date, kind: 'eclipse', text: k, note: moonUp(le.peak) ? '日本で見える（食の最大時に月が地平線上）' : '日本では食の最大時に月が地平線下' }); le = A.NextLunarEclipse(le.peak); }
    // 日食（世界）＋日本での見え方
    let ge = A.SearchGlobalSolarEclipse(A.MakeTime(s));
    while (ge.peak.date < e) {
      const k = { partial: '部分日食', annular: '金環日食', total: '皆既日食', hybrid: '金環皆既日食' }[ge.kind];
      let note = '日本では見えない';
      try { const lo = A.SearchLocalSolarEclipse(A.MakeTime(new Date(ge.peak.date.getTime() - 2 * 864e5)), TOKYO); if (Math.abs(lo.peak.time.date - ge.peak.date) < 864e5 && lo.peak.altitude > 0) note = `東京で${{ partial: '部分日食', annular: '金環日食', total: '皆既日食' }[lo.kind] || '部分日食'}として見える（${fmt(lo.peak.time.date)}）`; } catch (x) { }
      ev.push({ d: ge.peak.date, kind: 'eclipse', text: k + '（世界のどこかで見える）', note });
      ge = A.NextGlobalSolarEclipse(ge.peak);
    }
    // 逆行（水星・金星・火星）とイングレス（木星〜冥王星）
    const days = Math.round((e - s) / 864e5) + 40;
    const start = new Date(s.getTime() - 20 * 864e5);
    const bodies = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    const JP = { Mercury: '水星', Venus: '金星', Mars: '火星', Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星' };
    bodies.forEach(b => {
      let prevL = lon(b, start), prevD = null, rStart = null;
      for (let k = 1; k <= days; k++) {
        const d = new Date(start.getTime() + k * 864e5), L = lon(b, d);
        const dl = mod(L - prevL + 180, 360) - 180;
        const dir = dl < 0 ? -1 : 1;
        if (prevD !== null && dir !== prevD) {
          // 留（向きが変わる瞬間）を二分法で求める
          const rate = t => mod(lon(b, new Date(t + 18e5)) - lon(b, new Date(t - 18e5)) + 180, 360) - 180;
          let lo = d.getTime() - 2 * 864e5, hi = d.getTime();
          const sLo = Math.sign(rate(lo));
          for (let it = 0; it < 20; it++) { const mid = (lo + hi) / 2; if (Math.sign(rate(mid)) === sLo) lo = mid; else hi = mid; }
          const st = new Date(hi);
          if (dir === -1) rStart = st; else if (rStart && ['Mercury', 'Venus', 'Mars'].includes(b) && rStart >= s && rStart < e) { ev.push({ d: rStart, kind: 'retro', text: `${JP[b]}逆行（${fmt(rStart)}〜${fmtFull(st)}）`, end: st }); rStart = null; }
          else if (dir === 1 && rStart && ['Mercury', 'Venus', 'Mars'].includes(b) && st >= s && rStart < s) { ev.push({ d: s, kind: 'retro', text: `${JP[b]}逆行（前年${fmt(rStart)}〜${fmt(st)}）`, end: st }); rStart = null; }
        }
        if (['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(b) && sgn(L) !== sgn(prevL) && d >= s && d < e) ev.push({ d, kind: 'ingress', text: `${JP[b]}が${SIGNS[sgn(L)]}へ${dir < 0 ? '（逆行で戻る）' : ''}`, note: `${SIGN_DOMAIN[sgn(L)]}の分野に関心が移るとされる` });
        prevD = dir; prevL = L;
      }
      if (rStart && ['Mercury', 'Venus', 'Mars'].includes(b) && rStart >= s && rStart < e) ev.push({ d: rStart, kind: 'retro', text: `${JP[b]}逆行（${fmt(rStart)}〜翌年）` });
    });
    ev.sort((a, b) => a.d - b.d);
    return ev;
  }
  // 20年間の外惑星の会合（2日刻みで探索）
  const PAIRS = [['Jupiter', 'Saturn'], ['Jupiter', 'Uranus'], ['Jupiter', 'Neptune'], ['Jupiter', 'Pluto'], ['Saturn', 'Uranus'], ['Saturn', 'Neptune'], ['Saturn', 'Pluto'], ['Uranus', 'Neptune'], ['Uranus', 'Pluto'], ['Neptune', 'Pluto']];
  const PJP = { Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星' };
  const PAIR_MEAN = { 'Jupiter-Saturn': '約20年ごとの社会・経済の大きな周期の節目とされる', 'Saturn-Neptune': '約36年周期。理想と現実、制度と信念の再編', 'Saturn-Pluto': '約33〜38年周期。権力構造の再編・危機と再建', 'Saturn-Uranus': '約45年周期。古い秩序と革新の衝突', 'Jupiter-Uranus': '約14年周期。急な技術革新・ブーム', 'Jupiter-Neptune': '約13年周期。理想・熱狂・バブル的な楽観', 'Jupiter-Pluto': '約12〜13年周期。巨大な力・富の拡大', 'Uranus-Neptune': '約170年周期', 'Uranus-Pluto': '約110〜140年周期', 'Neptune-Pluto': '約490年周期' };
  function conjunctions(Y0, Y1) {
    const out = [], step = 2, s = new Date(Date.UTC(Y0, 0, 1)), n = Math.round((Date.UTC(Y1 + 1, 0, 1) - s) / 864e5 / step);
    const prev = {};
    for (let k = 0; k <= n; k++) {
      const d = new Date(s.getTime() + k * step * 864e5), L = {};
      ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].forEach(b => L[b] = lon(b, d));
      PAIRS.forEach(([a, b]) => {
        const key = a + '-' + b, diff = mod(L[a] - L[b] + 180, 360) - 180;
        if (prev[key] !== undefined && Math.sign(diff) !== Math.sign(prev[key]) && Math.abs(diff - prev[key]) < 90) out.push({ d, a, b, key, text: `${PJP[a]}と${PJP[b]}の会合（${SIGNS[sgn(L[a])]} ${Math.floor(mod(L[a], 30))}°）`, note: PAIR_MEAN[key] || '' });
        prev[key] = diff;
      });
    }
    return out;
  }

  // ---------------- 歴史年表（主要な出来事の抜粋） ----------------
  // [年, 区分(J=日本, W=世界), 分類(eco経済/dis災害/war戦争・紛争/pol政治・社会/cul文化・技術), 内容]
  const EVENTS = [
    [1900, 'W', 'war', '義和団の乱'], [1904, 'J', 'war', '日露戦争が始まる'], [1905, 'J', 'war', '日露戦争が終わる（ポーツマス条約）'], [1906, 'W', 'dis', 'サンフランシスコ地震'],
    [1910, 'J', 'pol', '韓国併合'], [1912, 'J', 'pol', '明治から大正へ'], [1912, 'W', 'dis', 'タイタニック号が沈没'], [1914, 'W', 'war', '第一次世界大戦が始まる'], [1917, 'W', 'pol', 'ロシア革命'],
    [1918, 'W', 'war', '第一次世界大戦が終わる'], [1918, 'W', 'dis', 'スペインかぜの世界的流行（〜1920年）'], [1918, 'J', 'pol', '米騒動'], [1920, 'W', 'pol', '国際連盟が発足'], [1922, 'W', 'pol', 'ソビエト連邦が成立'],
    [1923, 'J', 'dis', '関東大震災'], [1926, 'J', 'pol', '大正から昭和へ'], [1927, 'J', 'eco', '昭和金融恐慌'], [1929, 'W', 'eco', '世界恐慌（ニューヨーク株式市場の暴落）'], [1931, 'J', 'war', '満州事変'],
    [1932, 'J', 'pol', '五・一五事件'], [1933, 'J', 'pol', '日本が国際連盟を脱退'], [1933, 'J', 'dis', '昭和三陸地震・津波'], [1936, 'J', 'pol', '二・二六事件'], [1937, 'J', 'war', '日中戦争が始まる'], [1939, 'W', 'war', '第二次世界大戦が始まる'],
    [1941, 'J', 'war', '太平洋戦争が始まる'], [1944, 'J', 'dis', '東南海地震'], [1945, 'W', 'war', '第二次世界大戦が終わる'], [1946, 'J', 'pol', '日本国憲法が公布される'], [1946, 'J', 'dis', '昭和南海地震'],
    [1947, 'J', 'pol', '日本国憲法が施行される'], [1948, 'J', 'dis', '福井地震'], [1949, 'J', 'eco', '東京証券取引所が再開'], [1949, 'W', 'pol', '中華人民共和国が成立'], [1950, 'W', 'war', '朝鮮戦争が始まる（日本は特需景気）'],
    [1951, 'J', 'pol', 'サンフランシスコ平和条約に調印'], [1953, 'W', 'war', '朝鮮戦争が休戦'], [1953, 'J', 'cul', 'NHKがテレビ本放送を開始'], [1955, 'J', 'pol', '「55年体制」が始まる'], [1956, 'J', 'pol', '日本が国際連合に加盟'],
    [1957, 'W', 'cul', 'ソ連が人工衛星スプートニク1号を打ち上げ'], [1958, 'J', 'cul', '東京タワーが完成'], [1959, 'J', 'dis', '伊勢湾台風'], [1960, 'J', 'pol', '安保闘争'], [1960, 'J', 'dis', 'チリ地震による津波が日本に到達'],
    [1961, 'W', 'pol', 'ベルリンの壁が建設される'], [1962, 'W', 'war', 'キューバ危機'], [1963, 'W', 'pol', 'ケネディ米大統領が暗殺される'], [1964, 'J', 'cul', '東京オリンピック・東海道新幹線開業'], [1965, 'J', 'eco', '証券不況（山一證券に日銀特融）'],
    [1966, 'J', 'cul', '丙午の迷信で出生数が前年比約25%減少'], [1966, 'J', 'cul', 'ビートルズが来日'], [1968, 'J', 'eco', '日本のGNPが西ドイツを抜き資本主義国で第2位に'], [1969, 'W', 'cul', 'アポロ11号が月面着陸'], [1970, 'J', 'cul', '大阪万博（日本万国博覧会）'],
    [1971, 'W', 'eco', 'ニクソン・ショック（ドルと金の交換停止）'], [1972, 'J', 'pol', '沖縄が日本に返還'], [1972, 'J', 'pol', '日中国交正常化'], [1973, 'W', 'eco', '第一次オイルショック'], [1973, 'J', 'eco', '円が変動相場制に移行'],
    [1974, 'J', 'eco', '戦後初のマイナス成長'], [1976, 'J', 'pol', 'ロッキード事件'], [1978, 'J', 'pol', '日中平和友好条約'], [1978, 'J', 'dis', '宮城県沖地震'], [1979, 'W', 'eco', '第二次オイルショック（イラン革命）'],
    [1980, 'W', 'war', 'イラン・イラク戦争が始まる'], [1983, 'J', 'cul', '東京ディズニーランドが開園'], [1985, 'W', 'eco', 'プラザ合意（円高ドル安へ）'], [1985, 'J', 'dis', '日航ジャンボ機墜落事故'], [1986, 'W', 'dis', 'チェルノブイリ原子力発電所事故'],
    [1986, 'J', 'eco', 'バブル景気が始まる（12月〜）'], [1987, 'W', 'eco', 'ブラックマンデー（世界的な株価暴落）'], [1988, 'J', 'pol', 'リクルート事件'], [1989, 'J', 'pol', '昭和から平成へ'], [1989, 'W', 'pol', 'ベルリンの壁が崩壊'],
    [1989, 'J', 'eco', '日経平均が史上最高値（当時）3万8915円で年末を終える'], [1990, 'J', 'eco', 'バブル崩壊が始まり株価が急落'], [1990, 'W', 'pol', '東西ドイツが統一'], [1991, 'W', 'war', '湾岸戦争'], [1991, 'W', 'pol', 'ソビエト連邦が崩壊'],
    [1991, 'J', 'dis', '雲仙・普賢岳で大火砕流'], [1993, 'J', 'dis', '北海道南西沖地震'], [1993, 'W', 'pol', '欧州連合（EU）が発足'], [1995, 'J', 'dis', '阪神・淡路大震災'], [1995, 'J', 'pol', '地下鉄サリン事件'],
    [1995, 'J', 'eco', '円が1ドル79円台まで急騰'], [1997, 'J', 'eco', '山一證券・北海道拓殖銀行が破綻'], [1997, 'W', 'eco', 'アジア通貨危機'], [1997, 'J', 'eco', '消費税が5%に'], [1998, 'J', 'eco', '日本長期信用銀行・日本債券信用銀行が破綻'],
    [1999, 'W', 'eco', 'ユーロが導入される'], [2000, 'W', 'eco', 'ITバブルが崩壊'], [2001, 'W', 'war', '米国同時多発テロ'], [2002, 'W', 'eco', 'ユーロの紙幣・硬貨の流通開始'], [2003, 'W', 'war', 'イラク戦争'],
    [2003, 'W', 'dis', 'SARSの流行'], [2004, 'J', 'dis', '新潟県中越地震'], [2004, 'W', 'dis', 'スマトラ島沖地震・インド洋大津波'], [2006, 'J', 'eco', 'ライブドア・ショック'], [2007, 'W', 'eco', 'サブプライムローン問題が表面化'],
    [2008, 'W', 'eco', 'リーマン・ショック（世界金融危機）'], [2009, 'J', 'pol', '民主党政権が誕生'], [2010, 'W', 'eco', '欧州債務危機（ギリシャ危機）'], [2011, 'J', 'dis', '東日本大震災・福島第一原発事故'], [2011, 'J', 'eco', '円が戦後最高値の1ドル75円台に'],
    [2012, 'J', 'pol', '第2次安倍内閣が発足（アベノミクス）'], [2013, 'J', 'eco', '日銀が「異次元緩和」を開始'], [2014, 'J', 'eco', '消費税が8%に'], [2015, 'W', 'eco', 'チャイナ・ショック（人民元切り下げ）'], [2016, 'J', 'eco', '日銀がマイナス金利を導入'],
    [2016, 'W', 'pol', '英国が国民投票でEU離脱を決定'], [2016, 'J', 'dis', '熊本地震'], [2018, 'J', 'dis', '西日本豪雨・北海道胆振東部地震'], [2019, 'J', 'pol', '平成から令和へ'], [2019, 'J', 'eco', '消費税が10%に'],
    [2020, 'W', 'dis', '新型コロナウイルス感染症の世界的流行'], [2021, 'J', 'cul', '東京オリンピック（1年延期）'], [2022, 'W', 'war', 'ロシアがウクライナに侵攻'], [2022, 'J', 'eco', '急速な円安（32年ぶりの1ドル150円台）'], [2023, 'J', 'eco', '日経平均がバブル後の高値を更新'],
    [2024, 'J', 'dis', '能登半島地震'], [2024, 'J', 'eco', '日経平均が34年ぶりに史上最高値を更新'], [2024, 'J', 'eco', '日銀がマイナス金利を解除'], [2024, 'J', 'eco', '日経平均が1日で過去最大の下げ幅（8月）'], [2025, 'J', 'cul', '大阪・関西万博'],
    [2025, 'W', 'eco', '米国の大幅な関税引き上げで世界の株価が急落（4月）'],
  ];
  const CATN = { eco: '経済', dis: '災害・事故', war: '戦争・紛争', pol: '政治・社会', cul: '文化・技術' };
  function history(Y) {
    const tY = mod(Y - 4, 60), kY = U.honmeiOf(Y);
    const sameKanshi = [], sameKyu = [];
    for (let y = 1900; y <= 2025; y++) { if (mod(y - 4, 60) === tY) sameKanshi.push(y); if (U.honmeiOf(y) === kY && mod(y - 4, 60) !== tY) sameKyu.push(y); }
    const pick = ys => ys.map(y => ({ y, kanshi: U.kanshi(mod(y - 4, 60)), list: EVENTS.filter(e => e[0] === y) }));
    return { kanshi: pick(sameKanshi), kyu: pick(sameKyu.slice(-6)) };
  }

  // ---------------- 相場アノマリー ----------------
  const PROVERB = ['子は繁栄', '丑はつまずき', '寅千里を走る', '卯は跳ねる', '辰巳天井', '辰巳天井', '午尻下がり', '未辛抱', '申酉騒ぐ', '申酉騒ぐ', '戌は笑い', '亥固まる'];
  function returns(series) {
    const out = [];
    series.c.forEach((c, i) => { const y = series.start + i; const base = i === 0 ? series.o[0] : series.c[i - 1]; out.push({ y, r: c / base - 1, partial: i === 0 || i === series.c.length - 1, c }); });
    return out;
  }
  function stats(list) {
    if (!list.length) return null;
    const rs = list.map(x => x.r).sort((a, b) => a - b), n = rs.length;
    const avg = rs.reduce((a, b) => a + b, 0) / n, med = n % 2 ? rs[(n - 1) / 2] : (rs[n / 2 - 1] + rs[n / 2]) / 2;
    return { n, avg, med, up: list.filter(x => x.r > 0).length, min: rs[0], max: rs[n - 1] };
  }
  function anomaly(series, cur) {
    const r = returns(series).filter(x => !x.partial && x.y < cur);
    const byBranch = Array.from({ length: 12 }, (_, b) => { const l = r.filter(x => mod(x.y - 4, 12) === b); return { b, list: l, st: stats(l) }; });
    const byKyu = Array.from({ length: 9 }, (_, k) => { const l = r.filter(x => U.honmeiOf(x.y) === k + 1); return { k: k + 1, list: l, st: stats(l) }; });
    const all = stats(r);
    return { byBranch, byKyu, all, years: r };
  }

  root.UWorld = { yearTheme, eventsOfYear, conjunctions, history, anomaly, returns, PROVERB, CATN, SIGNS, fmtFull, fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.UWorld;
})(typeof window !== 'undefined' ? window : globalThis);
