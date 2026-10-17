/* 総合占いエンジン — 計算部分（表示文言は data.js）
 * ブラウザでは window.Astronomy（astronomy-engine）を使う。Node では require。
 */
(function (root) {
  'use strict';
  const A = (typeof require === 'function' && typeof window === 'undefined')
    ? require('astronomy-engine') : root.Astronomy;

  // ---------- 基本テーブル ----------
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]; // 0木1火2土3金4水
  const BR_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
  const ELN = ['木', '火', '土', '金', '水'];
  // 蔵干（中国式の標準。先頭が本気）
  const HIDDEN = [[9], [5, 9, 7], [0, 2, 4], [1], [4, 1, 9], [2, 6, 4], [3, 5], [5, 3, 1], [6, 8, 4], [7], [4, 7, 3], [8, 0]];
  const TSUHEN = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '偏官', '正官', '偏印', '印綬'];
  const SHUSEI = ['貫索星', '石門星', '鳳閣星', '調舒星', '禄存星', '司禄星', '車騎星', '牽牛星', '龍高星', '玉堂星'];
  const UNSEI = ['長生', '沐浴', '冠帯', '建禄', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'];
  const JUSEI = ['天貴星', '天恍星', '天南星', '天禄星', '天将星', '天堂星', '天胡星', '天極星', '天庫星', '天馳星', '天報星', '天印星'];
  const CHOSEI = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 各日干の長生の支（陽干順行・陰干逆行）

  const mod = (a, n) => ((a % n) + n) % n;
  const kanshi = i => STEMS[i % 10] + BRANCHES[i % 12];
  const idxFromSB = (s, b) => { for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i; return -1; };

  function tsuhen(dayStem, other) {
    const de = STEM_EL[dayStem], oe = STEM_EL[other];
    const same = (dayStem % 2) === (other % 2);
    const rel = mod(oe - de, 5); // 0比和 1我生 2我剋 3剋我 4生我
    return [0, 2, 4, 6, 8][rel] + (same ? 0 : 1);
  }
  function unsei(dayStem, branch) {
    const s = CHOSEI[dayStem];
    return dayStem % 2 === 0 ? mod(branch - s, 12) : mod(s - branch, 12);
  }

  // ---------- 日付ユーティリティ ----------
  // y,m,d の通日（JDN）
  function jdn(y, m, d) {
    const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  function fromJdn(J) {
    const a = J + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
    const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * d / 4), m = Math.floor((5 * e + 2) / 153);
    return { y: 100 * b + d - 4800 + Math.floor(m / 10), m: m + 3 - 12 * Math.floor(m / 10), d: e - Math.floor((153 * m + 2) / 5) + 1 };
  }
  const dayIndex = J => mod(J + 49, 60); // 0=甲子
  // UTC Date → 指定オフセット(時間)の現地日付 JDN
  const localJdn = (date, off) => { const t = new Date(date.getTime() + off * 3600e3); return jdn(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); };
  const sunLon = date => A.SunPosition(A.MakeTime(date)).elon;
  const searchSun = (lon, from, days) => A.SearchSunLongitude(lon, A.MakeTime(from), days).date;

  // 指定日時の直後/直前の「節」（太陽黄経 15°+30°k）
  function nextSetsu(date) {
    const L = sunLon(date); let target = mod(Math.floor((L - 15) / 30) * 30 + 45, 360);
    return { lon: target, date: searchSun(target, date, 40) };
  }
  function prevSetsu(date) {
    const L = sunLon(date); const target = mod(Math.floor((L - 15) / 30) * 30 + 15, 360);
    return { lon: target, date: searchSun(target, new Date(date.getTime() - 40 * 864e5), 41) };
  }
  const risshun = y => searchSun(315, new Date(Date.UTC(y, 0, 15)), 40);

  // ---------- 入力の正規化 ----------
  // input: {y,m,d,hh,mm (null=不明), tz(時間), lon, lat, dst(bool), sex:'m'|'f'|null, lmt(bool), dayBoundary23(bool)}
  function prepare(inp) {
    const timeKnown = inp.hh !== null && inp.hh !== undefined && inp.hh !== '';
    const hh = timeKnown ? +inp.hh : 12, mi = timeKnown ? +(inp.mm || 0) : 0;
    const clockOff = inp.tz + (inp.dst ? 1 : 0);
    const utc = new Date(Date.UTC(inp.y, inp.m - 1, inp.d, hh, mi) - clockOff * 3600e3);
    // 地方平均時（経度補正）: 標準時の時刻 + (経度-基準経度)*4分
    const lmtShift = inp.lmt && timeKnown ? (inp.lon - inp.tz * 15) * 4 : 0; // 分
    const local = new Date(Date.UTC(inp.y, inp.m - 1, inp.d, hh, mi) - (inp.dst ? 3600e3 : 0) + lmtShift * 60e3);
    return { ...inp, timeKnown, utc, local, lmtShift };
  }

  // ---------- 四柱推命 ----------
  function shichu(P) {
    const res = { notes: [] };
    // 年柱（立春）
    let gy = P.y; const rs = risshun(P.y);
    if (P.utc < rs) gy -= 1;
    const yIdx = mod(gy - 4, 60);
    // 月柱（節入り）
    const L = sunLon(P.utc);
    const mOff = Math.floor(mod(L - 315, 360) / 30); // 0=寅月
    const mBr = mod(2 + mOff, 12);
    const mStem = mod((yIdx % 10) * 2 + 2 + mOff, 10); // 五虎遁
    const mIdx = idxFromSB(mStem, mBr);
    // 日柱（地方時の日付。23時境界オプション）
    const lt = P.local;
    let J = jdn(lt.getUTCFullYear(), lt.getUTCMonth() + 1, lt.getUTCDate());
    const lh = lt.getUTCHours() + lt.getUTCMinutes() / 60;
    if (P.timeKnown && P.dayBoundary23 && lh >= 23) J += 1;
    const dIdx = dayIndex(J);
    // 時柱
    let hIdx = null;
    if (P.timeKnown) {
      const hBr = mod(Math.floor((lh + 1) / 2), 12);
      const hStem = mod((dIdx % 10) * 2 + hBr, 10); // 五鼠遁
      hIdx = idxFromSB(hStem, hBr);
    } else res.notes.push('出生時刻が不明のため時柱は算出していません。');
    const pil = [yIdx, mIdx, dIdx, hIdx];
    const ds = dIdx % 10;
    const pillars = pil.map((i, k) => i === null ? null : {
      idx: i, name: kanshi(i), stem: i % 10, branch: i % 12,
      stemTsuhen: k === 2 ? '日主' : TSUHEN[tsuhen(ds, i % 10)],
      hidden: HIDDEN[i % 12].map(h => ({ stem: STEMS[h], tsuhen: TSUHEN[tsuhen(ds, h)] })),
      unsei: UNSEI[unsei(ds, i % 12)],
    });
    // 五行バランス（天干・地支の本気、各1点）
    const el = [0, 0, 0, 0, 0];
    pillars.forEach(p => { if (p) { el[STEM_EL[p.stem]]++; el[BR_EL[p.branch]]++; } });
    // 通変星の出現数（天干＋蔵干本気、日干除く）
    const tcount = {};
    pillars.forEach((p, k) => { if (!p) return; if (k !== 2) tcount[p.stemTsuhen] = (tcount[p.stemTsuhen] || 0) + 1; const h = p.hidden[0].tsuhen; tcount[h] = (tcount[h] || 0) + 1; });
    // 簡易 身強弱：日干と同じ五行＋日干を生む五行の数
    const me = STEM_EL[ds], mother = mod(me - 1, 5);
    const support = el[me] + el[mother], total = el.reduce((a, b) => a + b, 0);
    // 空亡
    const xs = dIdx - (dIdx % 10), kub = [mod(xs % 12 + 10, 12), mod(xs % 12 + 11, 12)];
    // 大運
    let daiun = null;
    if (P.sex === 'm' || P.sex === 'f') {
      const yang = (yIdx % 10) % 2 === 0;
      const forward = (yang && P.sex === 'm') || (!yang && P.sex === 'f');
      const s = forward ? nextSetsu(P.utc) : prevSetsu(P.utc);
      const days = Math.abs(s.date - P.utc) / 864e5;
      const startAge = days / 3;
      const list = [];
      for (let k = 1; k <= 9; k++) {
        const i = mod(mIdx + (forward ? k : -k), 60);
        list.push({ from: Math.round((startAge + (k - 1) * 10) * 10) / 10, name: kanshi(i), tsuhen: TSUHEN[tsuhen(ds, i % 10)], unsei: UNSEI[unsei(ds, i % 12)] });
      }
      daiun = { forward, startAge, list };
    }
    // 節入りとの近さ（境界警告）
    const ps = prevSetsu(P.utc), ns = nextSetsu(P.utc);
    const nearH = Math.min(Math.abs(P.utc - ps.date), Math.abs(ns.date - P.utc)) / 3600e3;
    if (nearH < 24) res.notes.push(`節入り（${fmtJst(Math.abs(P.utc - ps.date) < Math.abs(ns.date - P.utc) ? ps.date : ns.date)}）の前後24時間以内の生まれです。出生時刻の誤差で月柱（年頭なら年柱も）が変わる可能性があります。`);
    if (P.timeKnown) {
      const nearBoundary = Math.min(...[1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23].map(b => Math.abs(lh - b)), Math.abs(lh - 25), Math.abs(lh + 1));
      if (nearBoundary < 0.25) res.notes.push('時柱の境目（奇数時ちょうど）付近の生まれです。数分の差で時柱が変わります。');
    }
    return Object.assign(res, { pillars, dayStem: ds, dayMaster: STEMS[ds], element: el, tcount, support, total, kubou: kub.map(b => BRANCHES[b]), kubouIdx: kub, daiun, yearIdx: yIdx, monthIdx: mIdx, dayIdx: dIdx, hourIdx: hIdx, risshun: rs });
  }
  function fmtJst(d) { const t = new Date(d.getTime() + 9 * 3600e3); return `${t.getUTCFullYear()}/${t.getUTCMonth() + 1}/${t.getUTCDate()} ${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`; }

  // 流年（対象年）
  function annualShichu(sc, Y) {
    const yi = mod(Y - 4, 60), ds = sc.dayStem;
    return { name: kanshi(yi), tsuhen: TSUHEN[tsuhen(ds, yi % 10)], unsei: UNSEI[unsei(ds, yi % 12)], kubou: sc.kubouIdx.includes(yi % 12), shusei: SHUSEI[tsuhen(ds, yi % 10)], jusei: JUSEI[unsei(ds, yi % 12)] };
  }

  // ---------- 算命学（陽占の簡易版：蔵干は本元を採用） ----------
  function sanmei(sc) {
    const ds = sc.dayStem, [Y, M, D] = sc.pillars;
    const S = s => SHUSEI[tsuhen(ds, s)];
    const honmoto = p => HIDDEN[p.branch][0];
    const body = {
      north: S(Y.stem), // 頭
      east: S(honmoto(Y)), // 右手
      center: S(honmoto(M)), // 胸（中心星）
      west: S(honmoto(D)), // 左手
      south: S(M.stem), // 腹
    };
    const jusei = { early: JUSEI[unsei(ds, Y.branch)], middle: JUSEI[unsei(ds, M.branch)], late: JUSEI[unsei(ds, D.branch)] };
    const tc = ['戌亥', '申酉', '午未', '辰巳', '寅卯', '子丑'][Math.floor(sc.dayIdx / 10)];
    return { body, jusei, tenchusatsu: tc + '天中殺', tcBranches: sc.kubouIdx };
  }

  // ---------- 六星占術（日干支番号＝星数、と公表情報から整合を確認した方式） ----------
  const ROKU_STARS = ['土星', '金星', '火星', '天王星', '木星', '水星'];
  const ROKU_PAIR = [[10, 11], [8, 9], [6, 7], [4, 5], [2, 3], [0, 1]]; // 各星の天中殺（陽支, 陰支）
  const ROKU_CYCLE = ['種子', '緑生', '立花', '健弱', '達成', '乱気', '再会', '財成', '安定', '陰影', '停止', '減退'];
  function rokusei(P) {
    const J = jdn(P.y, P.m, P.d);
    const n = dayIndex(J) + 1; // 1..60
    const star = Math.floor((n - 1) / 10);
    const yb = mod(P.y - 4, 12); // 暦年の干支（1月1日区切り）
    const plus = yb % 2 === 0;
    const [X, Yb] = ROKU_PAIR[star];
    const stop = plus ? X : Yb;
    const seed = mod(stop + 2, 12);
    const cyc = b => ROKU_CYCLE[mod(b - seed, 12)];
    return { num: n, star: ROKU_STARS[star], starIdx: star, sign: plus ? '+' : '−', reigo: yb === stop, cycleOf: Y => cyc(mod(Y - 4, 12)), daisakkai: [mod(stop - 1, 12), stop, mod(stop + 1, 12)].map(b => BRANCHES[b]) };
  }

  // ---------- 五星三心占い（命数は公式表で確認して手入力） ----------
  const GOSEI = ['羅針盤座', 'インディアン座', '鳳凰座', '時計座', 'カメレオン座', 'イルカ座'];
  function gosei(P, meisu) {
    if (!meisu || meisu < 1 || meisu > 60) return null;
    const t = Math.floor((meisu - 1) / 10);
    return { meisu, type: (P.y % 2 === 0 ? '金の' : '銀の') + GOSEI[t], base: GOSEI[t], gold: P.y % 2 === 0, idx: t };
  }

  // ---------- 九星気学 ----------
  const KYUSEI = ['一白水星', '二黒土星', '三碧木星', '四緑木星', '五黄土星', '六白金星', '七赤金星', '八白土星', '九紫火星'];
  const KY_EL = [4, 2, 0, 0, 2, 3, 3, 2, 1];
  const PALACE_DIR = ['', '北', '南西', '東', '南東', '中央', '北西', '西', '北東', '南'];
  const n9 = x => mod(x - 1, 9) + 1;
  const honmeiOf = y => n9(11 - mod(y, 9) + 9 * 3);
  function kyusei(P, sc) {
    const gy = sc.yearIdx; // 立春年
    const y = P.utc < sc.risshun ? P.y - 1 : P.y;
    const hon = honmeiOf(y);
    const L = sunLon(P.utc), mOff = Math.floor(mod(L - 315, 360) / 30);
    const start = [1, 4, 7].includes(hon) ? 8 : [3, 6, 9].includes(hon) ? 5 : 2;
    const getsu = n9(start - mOff);
    return { year: y, honmei: hon, getsumei: getsu, honmeiName: KYUSEI[hon - 1], getsumeiName: KYUSEI[getsu - 1] };
  }
  const palaceOf = (star, center) => mod(star - center + 4, 9) + 1;
  function kyuseiYear(ky, Y) {
    const c = honmeiOf(Y);
    const pal = palaceOf(ky.honmei, c);
    const dirOfStar = s => PALACE_DIR[palaceOf(s, c)];
    const opp = { '北': '南', '南': '北', '東': '西', '西': '東', '北東': '南西', '南西': '北東', '北西': '南東', '南東': '北西', '中央': null };
    const goou = dirOfStar(5);
    const kyou = { '五黄殺': goou, '暗剣殺': opp[goou] };
    const brDir = ['北', '北東', '北東', '東', '南東', '南東', '南', '南西', '南西', '西', '北西', '北西'];
    kyou['歳破'] = opp[brDir[mod(Y - 4, 12)]];
    const hd = dirOfStar(ky.honmei);
    if (hd !== '中央') { kyou['本命殺'] = hd; kyou['本命的殺'] = opp[hd]; }
    // 本命星と相生・比和の星（五黄除く）が入る方位で、凶方位に当たらないもの
    const me = KY_EL[ky.honmei - 1];
    const good = [];
    for (let s = 1; s <= 9; s++) {
      if (s === 5 || s === ky.honmei) continue;
      const e = KY_EL[s - 1]; const r = mod(e - me, 5);
      const ok = r === 0 || r === 1 || r === 4;
      const d = dirOfStar(s);
      if (ok && d !== '中央' && !Object.values(kyou).includes(d)) good.push({ dir: d, star: KYUSEI[s - 1] });
    }
    return { center: KYUSEI[c - 1], palace: pal, palaceDir: PALACE_DIR[pal], kyou, good };
  }

  // ---------- 旧暦（日本時間・定気法の中国暦ルール） ----------
  function newMoonsBetween(from, to) {
    const out = []; let t = A.MakeTime(new Date(from.getTime() - 864e5));
    while (true) {
      const nm = A.SearchMoonPhase(0, t, 40); if (!nm || nm.date > to) break;
      out.push(nm.date); t = nm.AddDays(1);
    }
    return out;
  }
  const jstJdn = d => localJdn(d, 9);
  function m11Start(y) { // y年の冬至を含む月の朔日(JDN)
    const ws = searchSun(270, new Date(Date.UTC(y, 11, 1)), 40);
    const W = jstJdn(ws);
    const nms = newMoonsBetween(new Date(ws.getTime() - 32 * 864e5), new Date(ws.getTime() + 864e5)).map(jstJdn).filter(j => j <= W);
    return nms[nms.length - 1];
  }
  function lunarYearMonths(y) { // 前年冬至月〜当年冬至月の直前まで
    const s = m11Start(y - 1), e = m11Start(y);
    const starts = newMoonsBetween(new Date(Date.UTC(fromJdn(s).y, fromJdn(s).m - 1, fromJdn(s).d) - 864e5), new Date(Date.UTC(fromJdn(e).y, fromJdn(e).m - 1, fromJdn(e).d) + 864e5))
      .map(jstJdn).filter((j, i, a) => j >= s && j <= e && a.indexOf(j) === i);
    // 中気の日付
    const chuki = [];
    for (let k = 0; k < 14; k++) {
      const lon = mod(270 + 30 * k, 360);
      const from = k === 0 ? new Date(Date.UTC(fromJdn(s).y, fromJdn(s).m - 1, fromJdn(s).d) - 5 * 864e5) : chuki[k - 1].date;
      const d = searchSun(lon, new Date(from.getTime() + (k === 0 ? 0 : 864e5)), 40);
      chuki.push({ lon, date: d, j: jstJdn(d) });
    }
    const months = [];
    for (let i = 0; i < starts.length - 1; i++) {
      const a = starts[i], b = starts[i + 1];
      const has = chuki.some(c => c.j >= a && c.j < b);
      months.push({ start: a, end: b, hasChuki: has });
    }
    const leapNeeded = months.length === 13;
    let leapUsed = false, cur = 10;
    months.forEach(mo => {
      if (leapNeeded && !leapUsed && !mo.hasChuki) { mo.leap = true; leapUsed = true; mo.num = cur; }
      else { mo.leap = false; cur = cur === 12 ? 1 : cur + 1; mo.num = cur; }
    });
    return months;
  }
  function toLunar(y, m, d) {
    const J = jdn(y, m, d);
    let sy = y, months = lunarYearMonths(sy);
    if (J >= months[months.length - 1].end) { sy = y + 1; months = lunarYearMonths(sy); }
    else if (J < months[0].start) { sy = y - 1; months = lunarYearMonths(sy); }
    const mo = months.find(x => J >= x.start && J < x.end);
    // 11月・12月は前の旧暦年、1〜10月はその年
    const lunarYear = mo.num >= 11 ? sy - 1 : sy;
    return { year: lunarYear, month: mo.num, leap: mo.leap, day: J - mo.start + 1, monthStart: mo.start, leapInYear: months.some(x => x.leap) ? months.find(x => x.leap).num : null };
  }

  // ---------- 紫微斗数 ----------
  const PALACES = ['命宮', '兄弟宮', '夫妻宮', '子女宮', '財帛宮', '疾厄宮', '遷移宮', '交友宮', '官禄宮', '田宅宮', '福徳宮', '父母宮'];
  const NAYIN_EL = [3, 1, 0, 2, 3, 1, 4, 2, 3, 0, 4, 2, 1, 0, 4, 3, 1, 0, 2, 3, 1, 4, 2, 3, 0, 4, 2, 1, 0, 4]; // 納音五行(0木1火2土3金4水) 甲子乙丑=金…
  const KYOKU = { 4: 2, 0: 3, 3: 4, 2: 5, 1: 6 }; // 水2木3金4土5火6
  const KYOKU_NAME = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };
  const SIHUA = [['廉貞', '破軍', '武曲', '太陽'], ['天機', '天梁', '紫微', '太陰'], ['天同', '天機', '文昌', '廉貞'], ['太陰', '天同', '天機', '巨門'], ['貪狼', '太陰', '右弼', '天機'], ['武曲', '貪狼', '天梁', '文曲'], ['太陽', '武曲', '太陰', '天同'], ['巨門', '太陽', '文曲', '文昌'], ['天梁', '紫微', '左輔', '武曲'], ['破軍', '巨門', '太陰', '貪狼']];
  function shibi(P, lunar, sc) {
    if (!P.timeKnown) return { error: '紫微斗数は出生時刻（時支）が必要なため、時刻不明では算出できません。' };
    const yS = mod(lunar.year - 4, 10), yB = mod(lunar.year - 4, 12);
    const h = sc.pillars[3].branch; // 時支
    const m = lunar.month; // 閏月は当月扱い
    const mei = mod(2 + (m - 1) - h, 12), shin = mod(2 + (m - 1) + h, 12);
    const tigerStem = mod(yS * 2 + 2, 10); // 寅宮の干
    const palStem = b => mod(tigerStem + mod(b - 2, 12), 10);
    const meiIdx = idxFromSB(palStem(mei), mei);
    const kyoku = KYOKU[NAYIN_EL[Math.floor(meiIdx / 2)]];
    // 紫微星
    let x = 0; while ((lunar.day + x) % kyoku !== 0) x++;
    const q = (lunar.day + x) / kyoku;
    let ziwei = mod(2 + q - 1 + (x % 2 === 1 ? -x : x), 12);
    const stars = {}; const put = (b, n) => { (stars[mod(b, 12)] = stars[mod(b, 12)] || []).push(n); };
    put(ziwei, '紫微'); put(ziwei - 1, '天機'); put(ziwei - 3, '太陽'); put(ziwei - 4, '武曲'); put(ziwei - 5, '天同'); put(ziwei - 8, '廉貞');
    const tf = mod(4 - ziwei, 12);
    put(tf, '天府'); put(tf + 1, '太陰'); put(tf + 2, '貪狼'); put(tf + 3, '巨門'); put(tf + 4, '天相'); put(tf + 5, '天梁'); put(tf + 6, '七殺'); put(tf + 10, '破軍');
    const main14 = JSON.parse(JSON.stringify(stars));
    // 副星
    put(10 - h, '文昌'); put(4 + h, '文曲'); put(4 + (m - 1), '左輔'); put(10 - (m - 1), '右弼');
    const LU = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][yS]; put(LU, '禄存'); put(LU + 1, '擎羊'); put(LU - 1, '陀羅');
    const KUI = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [6, 2], [3, 5], [3, 5]][yS]; put(KUI[0], '天魁'); put(KUI[1], '天鉞');
    const grp = [0, 4, 8].includes(yB) ? 0 : [2, 6, 10].includes(yB) ? 1 : [5, 9, 1].includes(yB) ? 2 : 3; // 申子辰/寅午戌/巳酉丑/亥卯未
    const HUO = [2, 1, 3, 9][grp], LING = [10, 3, 10, 10][grp]; put(HUO + h, '火星'); put(LING + h, '鈴星');
    put(11 + h, '地劫'); put(11 - h, '地空');
    const sihua = SIHUA[yS];
    const palaces = [];
    for (let k = 0; k < 12; k++) {
      const b = mod(mei - k, 12);
      const st = (stars[b] || []).map(n => { const i = sihua.indexOf(n); return i < 0 ? n : n + '化' + '禄権科忌'[i]; });
      palaces.push({ name: PALACES[k], branch: BRANCHES[b], bIdx: b, stem: STEMS[palStem(b)], stars: st, main: main14[b] || [], shin: b === shin });
    }
    // 大限
    const yang = yS % 2 === 0;
    const fwd = P.sex ? ((yang && P.sex === 'm') || (!yang && P.sex === 'f')) : null;
    let taigen = null;
    if (fwd !== null) taigen = Array.from({ length: 12 }, (_, k) => { const b = mod(mei + (fwd ? k : -k), 12); return { from: kyoku + 10 * k, to: kyoku + 10 * k + 9, palace: palaces.find(p => p.bIdx === b).name, branch: BRANCHES[b] }; });
    const meiMain = main14[mei] || [];
    const opp = main14[mod(mei + 6, 12)] || [];
    return { lunar, kyoku: KYOKU_NAME[kyoku], meiBranch: BRANCHES[mei], shinBranch: BRANCHES[shin], shinPalace: palaces.find(p => p.bIdx === shin).name, palaces, meiMain, borrowed: meiMain.length ? null : opp, taigen, sihua, ziweiBranch: BRANCHES[ziwei] };
  }
  function shibiYear(sb, Y) {
    if (sb.error) return null;
    const b = mod(Y - 4, 12);
    const p = sb.palaces.find(x => x.bIdx === b);
    return { branch: BRANCHES[b], palace: p.name, stars: p.main };
  }

  // ---------- 宿曜占星術 ----------
  const SHUKU = ['昴宿', '畢宿', '觜宿', '参宿', '井宿', '鬼宿', '柳宿', '星宿', '張宿', '翼宿', '軫宿', '角宿', '亢宿', '氐宿', '房宿', '心宿', '尾宿', '箕宿', '斗宿', '女宿', '虚宿', '危宿', '室宿', '壁宿', '奎宿', '婁宿', '胃宿'];
  const SHUKU_START = [22, 24, 26, 1, 3, 5, 8, 11, 13, 15, 18, 20]; // 旧暦1〜12月の1日の宿
  function sukuyo(lunar) { const i = mod(SHUKU_START[lunar.month - 1] + lunar.day - 1, 27); return { idx: i, name: SHUKU[i] }; }

  // ---------- 西洋占星術 ----------
  const SIGNS = ['牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座', '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'];
  const SIGN_GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const PLANETS = [['Sun', '太陽', '☉'], ['Moon', '月', '☽'], ['Mercury', '水星', '☿'], ['Venus', '金星', '♀'], ['Mars', '火星', '♂'], ['Jupiter', '木星', '♃'], ['Saturn', '土星', '♄'], ['Uranus', '天王星', '♅'], ['Neptune', '海王星', '♆'], ['Pluto', '冥王星', '♇']];
  function eclLon(body, date) {
    const t = A.MakeTime(date);
    if (body === 'Moon') return A.EclipticGeoMoon(t).lon;
    if (body === 'Sun') return A.SunPosition(t).elon;
    return A.Ecliptic(A.GeoVector(A.Body[body], t, true)).elon;
  }
  const signOf = l => Math.floor(mod(l, 360) / 30);
  const fmtDeg = l => { const s = signOf(l), d = mod(l, 30); return `${SIGNS[s]} ${Math.floor(d)}°${String(Math.floor((d % 1) * 60)).padStart(2, '0')}′`; };
  const rad = Math.PI / 180;
  function angles(date, lat, lon) {
    const t = A.MakeTime(date);
    const ramc = mod(A.SiderealTime(t) * 15 + lon, 360);
    const eps = A.e_tilt(t).tobl;
    const e = eps * rad, f = lat * rad, r = ramc * rad;
    const asc = mod(Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(f) * Math.sin(e))) / rad, 360);
    const mc = mod(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) / rad, 360);
    // プラシーダス
    let cusps = null, system = 'プラシーダス';
    const lamFromRA = ra => mod(Math.atan2(Math.sin(ra * rad), Math.cos(ra * rad) * Math.cos(e)) / rad, 360);
    const dsaOf = lam => { const d = Math.asin(Math.sin(e) * Math.sin(lam * rad)); const x = -Math.tan(f) * Math.tan(d); return Math.abs(x) > 1 ? null : Math.acos(x) / rad; };
    function cusp(fn) { let lam = mc; for (let i = 0; i < 60; i++) { const dsa = dsaOf(lam); if (dsa === null) return null; const nl = lamFromRA(fn(dsa)); if (Math.abs(((nl - lam + 540) % 360) - 180) < 1e-7) { lam = nl; break; } lam = nl; } return lam; }
    if (Math.abs(lat) < 66) {
      const c11 = cusp(d => ramc + d / 3), c12 = cusp(d => ramc + 2 * d / 3), c2 = cusp(d => ramc + 2 * d / 3 + 60), c3 = cusp(d => ramc + d / 3 + 120);
      if ([c11, c12, c2, c3].every(v => v !== null)) cusps = [asc, c2, c3, mod(mc + 180, 360), mod(c11 + 180, 360), mod(c12 + 180, 360), mod(asc + 180, 360), mod(c2 + 180, 360), mod(c3 + 180, 360), mc, c11, c12];
    }
    if (!cusps) { system = 'イコールハウス'; cusps = Array.from({ length: 12 }, (_, i) => mod(asc + 30 * i, 360)); }
    return { asc, mc, ramc, eps, cusps, system };
  }
  function houseOf(l, cusps) { for (let i = 0; i < 12; i++) { const a = cusps[i], b = cusps[(i + 1) % 12]; const w = mod(b - a, 360); if (mod(l - a, 360) < w) return i + 1; } return 1; }
  const ASPECTS = [[0, '合（コンジャンクション）', 8, '☌'], [60, 'セクスタイル', 5, '⚹'], [90, 'スクエア', 7, '□'], [120, 'トライン', 7, '△'], [180, 'オポジション', 8, '☍']];
  function western(P) {
    const planets = PLANETS.map(([b, jp, g]) => {
      const l = eclLon(b, P.utc);
      const l2 = b === 'Sun' || b === 'Moon' ? null : eclLon(b, new Date(P.utc.getTime() + 864e5));
      const retro = l2 !== null && mod(l2 - l + 180, 360) - 180 < 0;
      return { key: b, name: jp, glyph: g, lon: l, sign: signOf(l), signName: SIGNS[signOf(l)], deg: fmtDeg(l), retro };
    });
    // ドラゴンヘッド（平均）
    const T = (A.MakeTime(P.utc).tt) / 36525;
    const node = mod(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T, 360);
    planets.push({ key: 'Node', name: 'ドラゴンヘッド', glyph: '☊', lon: node, sign: signOf(node), signName: SIGNS[signOf(node)], deg: fmtDeg(node), retro: false });
    let ang = null; const notes = [];
    if (P.timeKnown) {
      ang = angles(P.utc, P.lat, P.lon);
      planets.forEach(p => p.house = houseOf(p.lon, ang.cusps));
    } else {
      notes.push('出生時刻が不明のため、正午で計算しています。アセンダント・ハウスは表示しません。');
      const m0 = eclLon('Moon', new Date(P.utc.getTime() - 12 * 3600e3)), m1 = eclLon('Moon', new Date(P.utc.getTime() + 12 * 3600e3));
      if (signOf(m0) !== signOf(m1)) notes.push(`この日は月が${SIGNS[signOf(m0)]}から${SIGNS[signOf(m1)]}へ移動しています。月星座は出生時刻によって変わります。`);
    }
    const sl = planets[0].lon, sm = mod(sl, 30);
    if (sm < 0.6 || sm > 29.4) notes.push('太陽が星座の境目付近にあります。生まれた時刻によって太陽星座が隣の星座になる可能性があります（雑誌などの「誕生日表」と異なる場合があります）。');
    const aspects = [];
    const core = planets.slice(0, 10);
    for (let i = 0; i < core.length; i++) for (let j = i + 1; j < core.length; j++) {
      const d = Math.abs(mod(core[i].lon - core[j].lon + 180, 360) - 180);
      for (const [a, n, orb, g] of ASPECTS) if (Math.abs(d - a) <= orb) aspects.push({ a: core[i].name, b: core[j].name, type: n, glyph: g, angle: a, orb: Math.abs(d - a) });
    }
    const elem = [0, 0, 0, 0], qual = [0, 0, 0];
    core.forEach((p, i) => { const w = i < 2 ? 2 : 1; elem[p.sign % 4] += w; qual[p.sign % 3] += w; });
    if (ang) { elem[signOf(ang.asc) % 4] += 2; qual[signOf(ang.asc) % 3] += 2; }
    return { planets, angles: ang, aspects, elem, qual, notes, ascSign: ang ? signOf(ang.asc) : null, mcSign: ang ? signOf(ang.mc) : null };
  }
  function westernYear(w, Y) {
    const mid = new Date(Date.UTC(Y, 6, 1));
    const ju = [new Date(Date.UTC(Y, 0, 1)), mid, new Date(Date.UTC(Y, 11, 31))].map(d => signOf(eclLon('Jupiter', d)));
    const sa = [new Date(Date.UTC(Y, 0, 1)), mid, new Date(Date.UTC(Y, 11, 31))].map(d => signOf(eclLon('Saturn', d)));
    const sun = w.planets[0].sign;
    const houseFromSun = s => mod(s - sun, 12) + 1; // ソーラーサイン方式のハウス
    return { jupiter: [...new Set(ju)], saturn: [...new Set(sa)], sun, houseFromSun };
  }

  // ---------- 数秘術 ----------
  const digitsum = n => String(n).split('').reduce((a, b) => a + +b, 0);
  function reduce(n, keepMaster = true) { while (n > 9 && !(keepMaster && (n === 11 || n === 22 || n === 33))) n = digitsum(n); return n; }
  const PYTH = { A: 1, J: 1, S: 1, B: 2, K: 2, T: 2, C: 3, L: 3, U: 3, D: 4, M: 4, V: 4, E: 5, N: 5, W: 5, F: 6, O: 6, X: 6, G: 7, P: 7, Y: 7, H: 8, Q: 8, Z: 8, I: 9, R: 9 };
  function numerology(P, romaji, Y) {
    const all = `${P.y}${String(P.m).padStart(2, '0')}${String(P.d).padStart(2, '0')}`;
    const lp = reduce(digitsum(all));
    const bd = reduce(P.d);
    const py = reduce(digitsum(`${Y}${P.m}${P.d}`), false);
    let destiny = null, soul = null, persona = null;
    const nm = (romaji || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (nm.length) {
      const vals = nm.split('').map(c => PYTH[c]);
      destiny = reduce(vals.reduce((a, b) => a + b, 0));
      const v = nm.split('').filter(c => 'AEIOU'.includes(c)).map(c => PYTH[c]);
      const c = nm.split('').filter(c => !'AEIOU'.includes(c)).map(c => PYTH[c]);
      soul = v.length ? reduce(v.reduce((a, b) => a + b, 0)) : null;
      persona = c.length ? reduce(c.reduce((a, b) => a + b, 0)) : null;
    }
    return { lifePath: lp, lpSum: digitsum(all), birthday: bd, personalYear: py, destiny, soul, persona };
  }

  // ---------- 姓名判断（五格・新字体画数） ----------
  let STROKES = null;
  function loadStrokes(txt) { STROKES = {}; txt.split('|').forEach(g => { const [n, cs] = g.split(':'); for (const c of cs) STROKES[c] = +n; }); }
  const KANA_STROKES = (() => {
    const t = { // ひらがな（一般的な数え方。流派差あり）
      'あ': 3, 'い': 2, 'う': 2, 'え': 2, 'お': 3, 'か': 3, 'き': 4, 'く': 1, 'け': 3, 'こ': 2, 'さ': 3, 'し': 1, 'す': 2, 'せ': 3, 'そ': 2, 'た': 4, 'ち': 2, 'つ': 1, 'て': 1, 'と': 2,
      'な': 4, 'に': 3, 'ぬ': 2, 'ね': 2, 'の': 1, 'は': 3, 'ひ': 1, 'ふ': 4, 'へ': 1, 'ほ': 4, 'ま': 3, 'み': 2, 'む': 3, 'め': 2, 'も': 3, 'や': 3, 'ゆ': 2, 'よ': 2,
      'ら': 2, 'り': 2, 'る': 1, 'れ': 2, 'ろ': 1, 'わ': 2, 'ゐ': 1, 'ゑ': 3, 'を': 3, 'ん': 1, 'ゃ': 3, 'ゅ': 2, 'ょ': 2, 'っ': 1, 'ぁ': 3, 'ぃ': 2, 'ぅ': 2, 'ぇ': 2, 'ぉ': 3, 'ー': 1, '々': 3,
      'ア': 2, 'イ': 2, 'ウ': 3, 'エ': 3, 'オ': 3, 'カ': 2, 'キ': 3, 'ク': 2, 'ケ': 3, 'コ': 2, 'サ': 3, 'シ': 3, 'ス': 2, 'セ': 2, 'ソ': 2, 'タ': 3, 'チ': 3, 'ツ': 3, 'テ': 3, 'ト': 2,
      'ナ': 2, 'ニ': 2, 'ヌ': 2, 'ネ': 4, 'ノ': 1, 'ハ': 2, 'ヒ': 2, 'フ': 1, 'ヘ': 1, 'ホ': 4, 'マ': 2, 'ミ': 3, 'ム': 2, 'メ': 2, 'モ': 3, 'ヤ': 2, 'ユ': 2, 'ヨ': 3,
      'ラ': 2, 'リ': 2, 'ル': 2, 'レ': 1, 'ロ': 3, 'ワ': 2, 'ヲ': 3, 'ン': 2, 'ャ': 2, 'ュ': 2, 'ョ': 3, 'ッ': 3, 'ァ': 2, 'ィ': 2, 'ゥ': 3, 'ェ': 3, 'ォ': 3, 'ヴ': 5
    };
    // 濁点+2・半濁点+1
    const dak = 'がぎぐげござじずぜぞだぢづでどばびぶべぼガギグゲゴザジズゼゾダヂヅデドバビブベボ', han = 'ぱぴぷぺぽパピプペポ';
    for (const c of dak) { const b = String.fromCharCode(c.charCodeAt(0) - 1); t[c] = t[b] + 2; }
    for (const c of han) { const b = String.fromCharCode(c.charCodeAt(0) - 2); t[c] = t[b] + 1; }
    return t;
  })();
  function strokeOf(c, overrides) { if (overrides && overrides[c]) return +overrides[c]; if (KANA_STROKES[c]) return KANA_STROKES[c]; return STROKES && STROKES[c] ? STROKES[c] : null; }
  function seimei(sei, mei, overrides, reisu) {
    const sc = [...sei].map(c => ({ c, n: strokeOf(c, overrides) }));
    const mc = [...mei].map(c => ({ c, n: strokeOf(c, overrides) }));
    const missing = [...sc, ...mc].filter(x => !x.n).map(x => x.c);
    if (!sc.length || !mc.length) return null;
    if (missing.length) return { missing, chars: [...sc, ...mc] };
    const sum = a => a.reduce((s, x) => s + x.n, 0);
    const S = sum(sc), M = sum(mc);
    const r1 = reisu && sc.length === 1 ? 1 : 0, r2 = reisu && mc.length === 1 ? 1 : 0;
    const ten = S + r1, chi = M + r2;
    const jin = sc[sc.length - 1].n + mc[0].n;
    const sou = S + M;
    const gai = (ten + chi) - jin || null;
    return { chars: [...sc, ...mc], ten, jin, chi, gai, sou, reisuUsed: !!(r1 || r2) };
  }

  // ---------- マヤ暦（ドリームスペル方式のKIN） ----------
  function maya(P) {
    // 基準: 2013/7/26 = KIN164（ドリームスペル）。2/29は数えない。
    const leapDaysBetween = (j1, j2) => { let c = 0; const a = Math.min(j1, j2), b = Math.max(j1, j2); const y1 = fromJdn(a).y, y2 = fromJdn(b).y; for (let y = y1; y <= y2; y++) { if ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) { const L = jdn(y, 2, 29); if (L > a && L <= b) c++; } } return c; };
    let J = jdn(P.y, P.m, P.d);
    const isFeb29 = P.m === 2 && P.d === 29;
    if (isFeb29) J -= 1; // 2/29 は 2/28 と同じKIN
    const ref = jdn(2013, 7, 26);
    let diff = J - ref; diff += diff >= 0 ? -leapDaysBetween(ref, J) : leapDaysBetween(J, ref);
    const kin = mod(163 + diff, 260) + 1;
    return { kin, seal: (kin - 1) % 20, tone: (kin - 1) % 13 + 1, feb29: isFeb29 };
  }

  // ---------- 月ごとの運勢（指定日時の月柱・月盤） ----------
  function monthAt(sc, ky, date) {
    const y0 = date.getUTCFullYear();
    const gy = date < risshun(y0) ? y0 - 1 : y0; // 立春年
    const yIdx = mod(gy - 4, 60);
    const mOff = Math.floor(mod(sunLon(date) - 315, 360) / 30); // 0=寅月
    const mBr = mod(2 + mOff, 12), mStem = mod((yIdx % 10) * 2 + 2 + mOff, 10);
    const idx = idxFromSB(mStem, mBr);
    const hon = honmeiOf(gy);
    const start = [1, 4, 7].includes(hon) ? 8 : [3, 6, 9].includes(hon) ? 5 : 2;
    const center = n9(start - mOff);
    const ds = sc.dayStem;
    return { name: kanshi(idx), stem: mStem, branch: mBr, tsuhen: TSUHEN[tsuhen(ds, mStem)], unsei: UNSEI[unsei(ds, mBr)], kubou: sc.kubouIdx.includes(mBr), center, palace: palaceOf(ky.honmei, center), yearStem: yIdx % 10 };
  }
  const tsuhenOf = (ds, s) => TSUHEN[tsuhen(ds, s)];

  const api = { monthAt, tsuhenOf, palaceOf, BR_EL, STEM_EL, STEMS, BRANCHES, ELN, TSUHEN, SHUSEI, JUSEI, UNSEI, KYUSEI, SIGNS, SIGN_GLYPH, PALACES, SHUKU, ROKU_CYCLE, GOSEI, PALACE_DIR, kanshi, mod, jdn, fromJdn, dayIndex, prepare, shichu, annualShichu, sanmei, rokusei, gosei, kyusei, kyuseiYear, toLunar, lunarYearMonths, shibi, shibiYear, sukuyo, western, westernYear, angles, numerology, seimei, loadStrokes, strokeOf, maya, fmtJst, eclLon, signOf, fmtDeg, risshun, honmeiOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Uranai = api;
})(typeof window !== 'undefined' ? window : globalThis);
