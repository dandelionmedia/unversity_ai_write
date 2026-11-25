/* =========================================================
   연성대학교 AI 글쓰기 특강 · 실습 프롬프트 페이지 스크립트
   AI콘텐츠마케팅연구소 유쌤클래스
   ========================================================= */
(function () {
  'use strict';

  var WB = window.WORKBOOK;
  var WB2 = window.WORKBOOK2;
  var BY_ID = {};
  var BLANK_TEXT = '[          ]';
  var lastPersona = -1;

  /* ---------- 유틸 ---------- */
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $all(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }

  // 붙여넣기 칸 강조: [ ... 붙여넣기 ... ] / [P3 결과] 등
  var PASTE_RE = /\[[^\[\]\n]*(붙여넣기|결과\]|P\d[^\[\]\n]*결과)[^\[\]\n]*\]/g;
  function highlightPaste(text) {
    var out = '', last = 0, m;
    PASTE_RE.lastIndex = 0;
    while ((m = PASTE_RE.exec(text)) !== null) {
      out += esc(text.slice(last, m.index)) + '<span class="paste-chip">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }
  // 섹션 제목(# 역할 등) 강조
  function decorateLines(html) {
    return html.split('\n').map(function (line) {
      if (/^# /.test(line)) return '<span class="p-head">' + line + '</span>';
      return line;
    }).join('\n');
  }

  var TOKEN_RE = /\{\{(\w+)\|([\s\S]*?)\}\}/g;

  function renderOriginal(p) {
    // 원본: 바꿔 쓸 부분을 노란 형광으로 표시
    var src = p.blank || p.body;
    var out = '', last = 0, m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(src)) !== null) {
      out += highlightPaste(src.slice(last, m.index)) + '<mark class="fill-mark">' + esc(m[2]) + '</mark>';
      last = m.index + m[0].length;
    }
    out += highlightPaste(src.slice(last));
    return decorateLines(out);
  }

  var HINTS = {
    deptYear: '학과/학년', deptYear2: '학과 학년', dept: '학과', worry: '요즘 고민', interest: '관심 분야', goal: '나의 목표 한 문장',
    brand: '한 줄 브랜드 메시지', track: '선택 트랙', trackGoal: '트랙 / 목표 한 문장', memo: '경험 메모 (줄바꿈 가능)',
    topic: '과제 주제', job: '희망 직무 / 기관 유형', jobShort: '희망 직무', item: '아이템 한 줄 설명', customer: '예상 고객',
    field: '전공·관심 분야', channel: '채널', reader: '독자 선택', picks: '반영할 번호', extra: '보완할 사실 (없으면 없음)',
    headline: '헤드라인 15자', sub: '서브카피 30자', kw1: '키워드1', kw2: '키워드2', kw3: '키워드3', evidence: '핵심 근거 한 줄',
    cta: '행동 유도 문구', main: '메인 HEX', point: '포인트 HEX', bg: '배경 HEX', mood: '분위기 형용사 3개', motif: '모티프 2가지',
    nick: '이름/닉네임', n: '장 번호', cardTitle: '카드 제목', cardBody: '카드 본문', cardImg: '이미지 연출',
    resultDesc: '결과물 설명', postChannel: '게시 채널', todayLog: '오늘 한 일 (단계→도구)', myEdits: '내가 직접 고친 부분',
    theme: '나의 주제', company: '기업명/직무', question: '자기소개서 문항', limit: '글자 수', star: 'STAR 경험 메모',
    to: '받는 사람', purpose: '용건', reason: '이유 (사실대로)', cGoal: '목적', cTarget: '타깃', cMsg: '핵심 메시지 한 문장', cCta: 'CTA',
    role: '역할', aim: '목적: 무엇을 만들지', context: '맥락: 내 상황과 재료', cond: '조건: 지킬 규칙', format: '출력 형식'
  };
  var MULTI = { memo: 1, todayLog: 1, myEdits: 1, star: 1, context: 1 };

  function renderBlank(p) {
    var src = p.blank, out = '', last = 0, m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(src)) !== null) {
      var key = m[1];
      out += highlightPaste(src.slice(last, m.index)) +
        '<span class="blank" contenteditable="true" spellcheck="false" role="textbox" tabindex="0"' +
        ' data-key="' + key + '"' + (MULTI[key] ? ' data-multi="1"' : '') +
        ' data-hint="' + esc(HINTS[key] || '직접 입력') + '" aria-label="' + esc(HINTS[key] || '직접 입력') + '"></span>';
      last = m.index + m[0].length;
    }
    out += highlightPaste(src.slice(last));
    return decorateLines(out);
  }

  /* ---------- 예시 생성 (클릭마다 무작위) ---------- */
  function buildExample() {
    var P = window.EXAMPLE_PERSONAS, POOL = window.EXAMPLE_POOLS;
    var idx;
    do { idx = Math.floor(Math.random() * P.length); } while (P.length > 1 && idx === lastPersona);
    lastPersona = idx;
    var p = P[idx];
    var pal = pick(window.EXAMPLE_PALETTES);
    var output = pick(POOL.outputs);
    var track = POOL.tracks[p.track];
    var deptYear = p.dept + ' ' + p.year;
    var log = 'P1 목표 진단(ChatGPT) → ' + pick(['P3-1 인터뷰(ChatGPT)', 'P3-2 경험 정리(Gemini)', 'P3-1 인터뷰(Claude)']) +
      ' → P4-' + p.track + ' 조사(Perplexity) → P4-E 출처 재검증(Perplexity) → P5-' + p.track + ' 기획서(Gemini) → P6 첨삭(Claude) → ' + output.log;
    var ex = {
      label: deptYear + ' · ' + track + ' 트랙',
      v: {
        deptYear: deptYear, deptYear2: deptYear, dept: p.dept, worry: p.worry, interest: p.interest,
        goal: p.goal, brand: p.brand, track: track, trackGoal: track + ' / ' + p.goal,
        memo: p.memo.map(function (l) { return '- ' + l; }).join('\n'),
        topic: p.topic, job: p.job, jobShort: p.job, item: p.item, customer: p.customer,
        field: p.field, channel: p.channel, reader: POOL.readers[p.track],
        picks: pick(POOL.picks), extra: pick(POOL.extras),
        headline: p.headline, sub: p.sub, kw1: p.kw[0], kw2: p.kw[1], kw3: p.kw[2],
        evidence: p.evidence, cta: p.cta, main: pal.main, point: pal.point, bg: pal.bg, mood: pal.mood, motif: pal.motif,
        nick: pick(POOL.nicknames), n: '1', cardTitle: p.cover.t, cardBody: p.cover.b, cardImg: p.cover.img,
        resultDesc: '결과물 설명: ' + output.desc(pal), postChannel: pick(POOL.postChannels),
        todayLog: log, myEdits: '내가 직접 고친 부분: ' + pick(POOL.edits)
      }
    };
    var v = ex.v, mail = pick(MAILS), five = pick(FIVE)(p);
    var theme = currentTheme() || pick([
      '내가 ' + p.dept + '를 선택한 이유', '나의 꿈: ' + p.job + '이 되는 것', '내가 좋아하는 것: ' + p.field,
      p.dept + '에서 배운 가장 소중한 경험', '요즘 나의 가장 큰 고민: ' + p.worry
    ]);
    v.theme = theme;
    v.company = p.job;
    v.question = pick(['지원 동기 및 직무 역량을 기술해 주세요', '본인의 강점이 드러난 경험을 기술해 주세요', '협업으로 문제를 해결한 경험을 기술해 주세요']);
    v.limit = pick(['500자', '700자', '800자']);
    v.star = 'S(상황): ' + p.memo[0] + '\nT(과제): ' + pick(['맡은 역할에서 눈에 보이는 결과를 만들어야 했음', '처음 해 보는 일이라 스스로 방법을 찾아야 했음', '팀원들과 정해진 기간 안에 끝내야 했음']) + '\nA(행동): ' + pick(['진행 과정을 직접 기록하고 매주 점검함', '필요한 자료를 찾아 정리하고 주변에 공유함', '문제가 생길 때마다 원인을 메모하고 방법을 바꿔 봄']) + '\nR(결과): [확인 필요 — 실제 결과를 적어 주세요]';
    v.to = mail.to; v.purpose = mail.purpose; v.reason = mail.reason;
    if (Math.random() < 0.5) {
      v.cGoal = '내 전공(' + p.dept + ')을 고등학생에게 소개'; v.cTarget = '진로를 고민하는 고등학생'; v.cMsg = p.brand; v.cCta = pick(['학과 인스타 팔로우', '학과 홈페이지 방문', '입학 설명회 신청']);
    } else {
      v.cGoal = '"' + p.item + '"을(를) 알리기'; v.cTarget = p.customer; v.cMsg = p.sub; v.cCta = p.cta;
    }
    v.role = five.role; v.aim = five.aim; v.context = five.context; v.cond = five.cond; v.format = five.format;
    return ex;
  }

  var MAILS = [
    { to: '전공기초 과목 담당 교수님', purpose: '과제 제출 기한 연장 요청', reason: '독감으로 병원 진료를 받아 3일간 과제를 하지 못함 (진료확인서 있음)' },
    { to: '지도교수님', purpose: '진로 상담 면담 요청', reason: '졸업 후 진로를 정하는 데 조언이 필요함, 다음 주 화·목 오후 가능' },
    { to: '전공실습 과목 교수님', purpose: '중간고사 성적 확인 문의', reason: '공지된 점수와 내가 계산한 점수가 3점 차이가 남' },
    { to: '학과 교수님', purpose: '추천서 작성 부탁', reason: '다음 달 마감인 기업 인턴십에 지원하려고 함' },
    { to: '교양 과목 교수님', purpose: '결석 사유 안내 및 출석 인정 문의', reason: '학과 공식 행사(현장실습 오리엔테이션) 참석으로 수업에 빠짐 (참석 확인서 있음)' },
    { to: '팀 프로젝트 과목 교수님', purpose: '팀 프로젝트 역할 분담 상담 요청', reason: '팀원 1명이 2주째 연락이 되지 않아 일정에 차질이 생김' }
  ];
  var FIVE = [
    function (p) { return { role: p.job + ' 채용 인사담당자', aim: p.job + ' 지원 동기 500자 초안', context: p.memo[0] + ' / ' + p.memo[1], cond: '500자 이내, 내가 말하지 않은 사실은 넣지 말 것', format: '초안 2개 + 각각의 장단점을 표로' }; },
    function (p) { return { role: '퍼스널브랜딩 콘텐츠 에디터', aim: p.channel + '에 올릴 첫 게시글', context: '나는 ' + p.dept + ' ' + p.year + ', 브랜드 메시지는 "' + p.brand + '"', cond: '300자 이내, 과장 표현(최고·100%) 금지', format: '제목 후보 3개 + 본문 1개' }; },
    function (p) { return { role: '대학 보고서 글쓰기 튜터', aim: '"' + p.topic + '" 보고서의 서론 문단', context: p.dept + ' 전공 수업 과제, 분량은 A4 3쪽', cond: '400자 이내, 출처 없는 통계는 쓰지 말 것', format: '서론 문단 1개 + 보완할 점 3가지' }; },
    function (p) { return { role: '청년 창업 홍보 카피라이터', aim: '"' + p.item + '" 홍보 문구', context: '타깃은 ' + p.customer + ', 나의 근거 경험은 ' + p.evidence, cond: '20자 이내, 사실만 쓰고 과장 금지', format: '문구 5개 + 각각 어울리는 채널을 표로' }; }
  ];
  function currentTheme() {
    var el = document.getElementById('themeInput');
    return el && el.value.trim() ? el.value.trim() : '';
  }

  /* ---------- 카드 렌더 ---------- */
  var TRACK_TAG = { 'A': '학업', 'B': '취업', 'C': '창업·사업', 'D': '퍼스널브랜딩' };
  function trackOf(p) {
    var m = p.title.match(/\[(학업|취업|창업·사업|퍼스널브랜딩) 트랙\]/);
    return m ? m[1] : '';
  }
  function titleClean(t) { return t.replace(/\s*\[(학업|취업|창업·사업|퍼스널브랜딩) 트랙\]\s*/, ' ').trim(); }

  function copyBtn(label) {
    return '<button type="button" class="btn btn-copy" data-act="copy"><span class="ico" aria-hidden="true">⧉</span><span class="lbl">' + (label || '프롬프트 복사하기') + '</span></button>';
  }

  function cardHTML(p, i) {
    var id = p.id || ('p-' + p.code.replace(/[^\w가-힣-]/g, ''));
    var track = trackOf(p);
    var hasBlank = !!p.blank;
    var isPaste = !hasBlank;
    var meta = p.meta.map(function (kv) {
      return '<div class="meta-row"><dt>' + esc(kv[0]) + '</dt><dd>' + esc(kv[1]) + '</dd></div>';
    }).join('');

    var h = '<article class="p-card reveal" id="' + id + '" data-code="' + esc(p.code) + '">' +
      '<header class="p-card-head">' +
        '<div class="p-code">' + esc(p.code) + '</div>' +
        '<div class="p-titles">' +
          '<h3>' + esc(titleClean(p.code === '공통' ? p.title : p.title)) + '</h3>' +
          '<div class="p-tags">' +
            (track ? '<span class="tag tag-track">' + track + ' 트랙</span>' : '') +
            (p.part ? '<span class="tag tag-track">' + esc(p.part) + '</span>' : '') +
            (/\(선택\)/.test(p.title) ? '<span class="tag tag-opt">선택</span>' : '') +
            (/\(과제\)/.test(p.title) ? '<span class="tag tag-hw">과제</span>' : '') +
            '<span class="tag tag-tool">🤖 ' + esc(p.rec) + '</span>' +
            (p.dur ? '<span class="tag tag-time">⏱ ' + esc(p.dur) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</header>';

    if (meta) h += '<dl class="p-meta">' + meta + '</dl>';

    if (hasBlank) {
      h += '<div class="seg" role="tablist">' +
        '<button type="button" class="seg-btn is-on" role="tab" aria-selected="true" data-pane="orig">📄 원본<span class="xs-hide"> 프롬프트</span></button>' +
        '<button type="button" class="seg-btn" role="tab" aria-selected="false" data-pane="fill">✍️ 직접 입력<span class="xs-hide"> 프롬프트</span></button>' +
        '<span class="seg-glider" aria-hidden="true"></span>' +
      '</div>';
    }

    h += '<div class="pane is-on" data-pane="orig">' +
        '<p class="pane-help">' + (hasBlank
          ? '<mark class="fill-mark">노란색</mark> 부분을 내 정보로 바꿔서 사용하세요. 직접 고치기 어렵다면 <b>✍️ 직접 입력 프롬프트</b> 탭을 이용하세요.'
          : (isPaste ? '<span class="paste-chip">파란색</span> 칸에 앞 단계 결과를 붙여넣어 사용하는 프롬프트입니다.' : '')) + '</p>' +
        '<pre class="prompt">' + renderOriginal(p) + '</pre>' +
        '<div class="actions">' + copyBtn() + '</div>' +
      '</div>';

    if (hasBlank) {
      h += '<div class="pane" data-pane="fill" hidden>' +
        '<p class="pane-help"><b>[&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;]</b> 빈칸을 눌러 직접 입력하거나, <b>🎲 예시내용 넣기</b>를 눌러 보세요. 누를 때마다 다른 예시가 들어갑니다.</p>' +
        '<pre class="prompt prompt-fill">' + renderBlank(p) + '</pre>' +
        '<div class="actions">' +
          '<button type="button" class="btn btn-example" data-act="example"><span class="ico" aria-hidden="true">🎲</span><span class="lbl">예시내용 넣기</span></button>' +
          '<button type="button" class="btn btn-reset" data-act="reset"><span class="ico" aria-hidden="true">↺</span><span class="lbl">비우기</span></button>' +
          copyBtn() +
        '</div>' +
      '</div>';
    }
    return h + '</article>';
  }

  /* ---------- 모듈 섹션 ---------- */
  var MOD_ICON = ['🧭', '🧱', '🎙️', '🔎', '📝', '🖍️', '🎨', '🚀'];
  var SHORT = ['오리엔테이션', '글의 구조', '자기 탐색', '근거 조사', '기획서', '첨삭', '시각콘텐츠', '발표·배포'];
  var MOD_KEY = ['나를 쓰다', '나를 쓰다', '나를 쓰다', '근거를 찾다', '기획하다', '다듬다', '보여주다', '보여주다'];

  function visualChoiceTable() {
    return '<div class="choice-grid reveal">' +
      '<div class="choice"><div class="choice-badge">A</div><h4>자기PR 포스터</h4><p><b>이미지 생성</b> P7-A1 (ChatGPT·Gemini)</p><p><b>HTML · 글자 정확</b> P7-A2 (Claude·캔버스)</p><span class="choice-for">학업(발표 포스터)·취업 트랙</span></div>' +
      '<div class="choice"><div class="choice-badge">B</div><h4>카드뉴스 5장</h4><p><b>이미지 생성</b> P7-B1 → P7-B2</p><p><b>HTML · 글자 정확</b> P7-B1 → P7-B3</p><span class="choice-for">창업·퍼스널브랜딩 트랙</span></div>' +
      '<div class="choice"><div class="choice-badge">C</div><h4>홍보웹페이지</h4><p><b>HTML 방식</b> P7-C1 → P7-C2 → P7-C3</p><p>&nbsp;</p><span class="choice-for">취업(포트폴리오)·창업·퍼스널브랜딩</span></div>' +
    '</div>';
  }

  function padletBanner(compact) {
    return '<a class="padlet-banner' + (compact ? ' compact' : '') + ' reveal" href="https://padlet.com/yu_ssam/35" target="_blank" rel="noopener">' +
      '<span class="pb-orb" aria-hidden="true"></span>' +
      '<span class="pb-icon" aria-hidden="true">📌</span>' +
      '<span class="pb-text"><span class="pb-kicker">PADLET · 실습 결과 공유 게시판</span>' +
      '<strong>' + (compact ? '오늘 만든 결과물과 교육 후기를 패들렛에 올려 주세요!' : '내가 만든 결과물을 패들렛에 공유해요') + '</strong>' +
      '<span class="pb-sub">브랜드 메시지 · 기획서 · 포스터/카드뉴스/웹페이지 · 배운 점 한 줄</span></span>' +
      '<span class="pb-go">패들렛 바로가기 <span aria-hidden="true">→</span></span>' +
    '</a>';
  }

  function renderModules() {
    var root = $('#modules');
    var html = '';
    WB.modules.forEach(function (m, idx) {
      var ps = WB.prompts.filter(function (p) { return p.module === m.id; });
      html += '<section class="module" id="' + m.id + '" data-idx="' + idx + '">' +
        '<div class="module-head reveal">' +
          '<div class="module-no"><span class="mn-num">' + m.no + '</span><span class="mn-ico" aria-hidden="true">' + MOD_ICON[idx] + '</span></div>' +
          '<div class="module-info">' +
            '<div class="module-time">' + esc(m.time) + ' · ' + MOD_KEY[idx] + '</div>' +
            '<h2>' + esc(m.title) + '</h2>' +
            '<p class="module-goal"><b>목표</b> ' + esc(m.goal) + '</p>' +
            m.notes.map(function (n) { return '<p class="module-note">💡 ' + esc(n) + '</p>'; }).join('') +
          '</div>' +
        '</div>';
      if (m.id === 'm7') html += visualChoiceTable();
      html += '<div class="card-list">' + ps.map(cardHTML).join('') + '</div>';
      if (m.id === 'm8') html += padletBanner(true);
      html += '</section>';
    });
    root.innerHTML = html;
  }

  function renderPart2() {
    var root = $('#w5');
    if (!root || !WB2) return;
    var parts = ['1부 자율 글쓰기', '2부 형식 글쓰기', '3부 알고리즘 글쓰기', '4부 콘텐츠 기획제작', '5부 프롬프트 글쓰기'];
    var h = '<div class="module-head reveal">' +
        '<div class="module-no w5-no"><span class="mn-num">5</span><span class="mn-ico" aria-hidden="true">✍️</span></div>' +
        '<div class="module-info">' +
          '<div class="module-time">실습 프롬프트 모음 · 실습 ①~⑥</div>' +
          '<h2>AI와 함께 쓰는 5가지 글쓰기</h2>' +
          '<p class="module-goal"><b>흐름</b> ' + parts.join(' → ') + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="w5-top">' +
        '<div class="theme-box reveal">' +
          '<label for="themeInput"><span class="tb-kicker">오늘의 관통 주제</span><strong>하나만 정해서 모든 실습에 사용하세요</strong></label>' +
          '<div class="tb-row"><input id="themeInput" type="text" autocomplete="off" placeholder="예) 나의 전공 / 나의 꿈 / 좋아하는 것">' +
          '<button type="button" class="btn btn-example tb-btn" id="themeExample"><span class="ico">🎲</span><span class="lbl">주제 예시</span></button></div>' +
          '<p class="tb-help">여기에 쓴 주제는 <b>실습 ①</b>의 주제 빈칸에 자동으로 들어갑니다.</p>' +
        '</div>' +
        '<div class="q3 reveal"><span class="tb-kicker">글을 쓰기 전 3가지 질문</span><ol>' +
          WB2.questions.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></div>' +
      '</div>' +
      '<ul class="w5-howto reveal">' + WB2.howto.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      '<div class="card-list">' + WB2.prompts.map(cardHTML).join('') + '</div>';
    root.innerHTML = h;

    var THEMES = ['내가 이 전공을 선택한 이유', '나의 꿈과 그 꿈을 정한 계기', '내가 좋아하는 것과 그 이유', '대학에 와서 가장 많이 성장한 순간', '나를 한 단어로 표현한다면', '요즘 가장 몰입하고 있는 일', '10년 뒤의 나에게', '나의 첫 아르바이트에서 배운 것'];
    var input = $('#themeInput');
    function pushTheme() {
      var v = input.value.trim();
      $all('#w5 .blank[data-key="theme"]').forEach(function (b) { b.textContent = v; b.classList.remove('is-example'); });
      resetCopied($('#w-1'));
    }
    input.addEventListener('input', pushTheme);
    $('#themeExample').addEventListener('click', function () {
      var cur = input.value, t;
      do { t = pick(THEMES); } while (t === cur && THEMES.length > 1);
      input.value = t; pushTheme();
      var w1 = $('#w-1');
      if (w1 && !$('.pane[data-pane=fill]', w1).hidden) { /* already visible */ }
      toast('🎲 주제 예시: <b>' + esc(t) + '</b>', 'gold');
    });
  }

  function renderNavAndTimeline() {
    var nav = $('#navChips'), tl = $('#timeline');
    var navH = '<a class="chip chip-new" href="#w5" data-target="w5"><span>✦</span>5가지 글쓰기</a>', tlH = '';
    WB.modules.forEach(function (m, idx) {
      var codes = WB.prompts.filter(function (p) { return p.module === m.id && p.code !== '공통'; }).map(function (p) { return p.code; });
      navH += '<a class="chip" href="#' + m.id + '" data-target="' + m.id + '"><span>' + m.no + '</span>' + SHORT[idx] + '</a>';
      tlH += '<a class="tl-item reveal" href="#' + m.id + '">' +
        '<span class="tl-time">' + esc(m.time) + '</span>' +
        '<span class="tl-no">' + m.no + '</span>' +
        '<span class="tl-title">' + MOD_ICON[idx] + ' ' + esc(m.title) + '</span>' +
        '<span class="tl-codes">' + codes.slice(0, 6).join(' · ') + (codes.length > 6 ? ' …' : '') + '</span>' +
      '</a>';
    });
    navH += '<a class="chip" href="#appendix" data-target="appendix"><span>＋</span>보정</a>';
    nav.innerHTML = navH;
    tl.innerHTML = tlH;
  }

  function renderAppendix() {
    $('#fixList').innerHTML = WB.appendix.map(function (row) {
      var copyable = !/^새 채팅을 열고/.test(row[1]);
      return '<div class="fix-card reveal">' +
        '<div class="fix-situ">😵 ' + esc(row[0]) + '</div>' +
        '<pre class="fix-text prompt">' + esc(row[1]) + '</pre>' +
        (copyable ? '<div class="actions">' + copyBtn() + '</div>' : '<div class="fix-tip">👉 이렇게 해 보세요</div>') +
      '</div>';
    }).join('');
  }

  /* ---------- 텍스트 추출 & 복사 ---------- */
  function blankValue(el) {
    var t = (el.innerText || el.textContent || '').replace(/ /g, ' ').replace(/\n+$/, '').trim();
    return t;
  }
  function extractText(pre) {
    var out = '';
    (function walk(node) {
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) { out += n.nodeValue; return; }
        if (n.nodeType !== 1) return;
        if (n.classList.contains('blank')) { out += blankValue(n) || BLANK_TEXT; return; }
        if (n.tagName === 'BR') { out += '\n'; return; }
        walk(n);
      });
    })(pre);
    return out;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  function setCopied(btn, on) {
    if (!btn) return;
    btn.classList.toggle('copied', on);
    $('.lbl', btn).textContent = on ? '프롬프트 복사완료' : '프롬프트 복사하기';
    $('.ico', btn).textContent = on ? '✓' : '⧉';
  }
  function resetCopied(scope) { $all('.btn-copy.copied', scope).forEach(function (b) { setCopied(b, false); }); }

  /* ---------- 토스트 ---------- */
  var toastTimer;
  function toast(msg, type) {
    var t = $('#toast');
    t.innerHTML = msg;
    t.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2600);
  }

  /* ---------- 이벤트 ---------- */
  function bindEvents() {
    document.addEventListener('click', function (e) {
      var seg = e.target.closest('.seg-btn');
      if (seg) {
        var card = seg.closest('.p-card');
        var which = seg.getAttribute('data-pane');
        $all('.seg-btn', card).forEach(function (b) {
          var on = b === seg; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on);
        });
        $('.seg', card).classList.toggle('right', which === 'fill');
        $all('.pane', card).forEach(function (p) {
          var on = p.getAttribute('data-pane') === which;
          p.classList.toggle('is-on', on); p.hidden = !on;
        });
        return;
      }

      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      var pane = btn.closest('.pane') || btn.closest('.fix-card');

      if (act === 'copy') {
        var pre = $('.prompt', pane);
        var text = pre.classList.contains('prompt-fill') ? extractText(pre) : (function () {
          var card = btn.closest('.p-card');
          if (card) {
            return BY_ID[card.id].body;
          }
          return pre.textContent;
        })();
        copyText(text).then(function () {
          setCopied(btn, true);
          btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
          var left = (text.match(/\[ {6,}\]/g) || []).length;
          toast(left ? '복사 완료! 아직 빈칸 <b>' + left + '개</b>가 남아 있어요.' : '복사 완료! AI 채팅창에 붙여넣기(Ctrl+V) 하세요.', left ? 'warn' : 'ok');
        }).catch(function () {
          toast('자동 복사가 막혔어요. 프롬프트를 길게 눌러 직접 복사해 주세요.', 'warn');
        });
        return;
      }

      if (act === 'example') {
        var ex = buildExample();
        $all('.blank', pane).forEach(function (b) {
          var v = ex.v[b.getAttribute('data-key')];
          if (v != null) { b.textContent = v; b.classList.add('is-example'); b.classList.add('flash'); }
        });
        setTimeout(function () { $all('.blank.flash', pane).forEach(function (b) { b.classList.remove('flash'); }); }, 900);
        resetCopied(pane);
        toast('🎲 <b>' + esc(ex.label) + '</b> 가상 학생 예시로 채웠어요. 다시 누르면 다른 예시!', 'gold');
        return;
      }

      if (act === 'reset') {
        $all('.blank', pane).forEach(function (b) { b.textContent = ''; b.classList.remove('is-example'); });
        resetCopied(pane);
        toast('빈칸을 모두 비웠어요.');
      }
    });

    // 빈칸 입력: 같은 항목 동기화 + 복사 상태 초기화
    document.addEventListener('input', function (e) {
      var b = e.target.closest && e.target.closest('.blank');
      if (!b) return;
      if (!blankValue(b) && b.innerHTML !== '') b.innerHTML = '';
      b.classList.remove('is-example');
      var pane = b.closest('.pane');
      var key = b.getAttribute('data-key');
      $all('.blank[data-key="' + key + '"]', pane).forEach(function (o) {
        if (o !== b) { o.textContent = b.innerText; o.classList.remove('is-example'); }
      });
      resetCopied(pane);
    });

    // 서식 없는 붙여넣기
    document.addEventListener('paste', function (e) {
      var b = e.target.closest && e.target.closest('.blank');
      if (!b) return;
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text');
      if (!b.hasAttribute('data-multi')) text = text.replace(/\s*\n\s*/g, ' ');
      if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, text);
      } else {
        b.textContent += text;
        b.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // 한 줄 빈칸은 Enter로 줄바꿈 대신 입력 완료
    document.addEventListener('keydown', function (e) {
      var b = e.target.closest && e.target.closest('.blank');
      if (!b) return;
      if (e.key === 'Enter' && !b.hasAttribute('data-multi') && !e.isComposing) { e.preventDefault(); b.blur(); }
    });
  }

  /* ---------- 스크롤: 맨위 버튼 · 네비 하이라이트 · 등장 애니메이션 ---------- */
  function bindScroll() {
    var topBtn = $('#toTop'), header = $('#siteHeader'), bar = $('#progressBar');
    var sections = $all('#w5, .module, #appendix');
    var chips = $all('#navChips .chip');
    var ticking = false;

    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop;
      topBtn.classList.toggle('show', y > 500);
      header.classList.toggle('scrolled', y > 10);
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';

      var cur = null, line = window.innerHeight * 0.3;
      sections.forEach(function (s) { if (s.getBoundingClientRect().top <= line) cur = s.id; });
      chips.forEach(function (c) {
        var on = c.getAttribute('data-target') === cur;
        if (on && !c.classList.contains('active')) {
          var wrap = c.parentNode;
          var left = c.offsetLeft - wrap.clientWidth / 2 + c.clientWidth / 2;
          wrap.scrollTo({ left: left, behavior: 'smooth' });
        }
        c.classList.toggle('active', on);
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
    onScroll();

    topBtn.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
      $all('.reveal').forEach(function (el) { io.observe(el); });
    } else {
      $all('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
  }

  /* ---------- 시작 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderNavAndTimeline();
    WB.prompts.concat(WB2 ? WB2.prompts : []).forEach(function (p) { BY_ID[p.id || ('p-' + p.code.replace(/[^\w가-힣-]/g, ''))] = p; });
    renderPart2();
    renderModules();
    renderAppendix();
    $('#promptCount').textContent = WB.prompts.filter(function (p) { return p.code !== '공통'; }).length;
    bindEvents();
    bindScroll();
  });
})();
