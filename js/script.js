/* =========================================================
   연성대학교 AI 글쓰기 특강 · 실습 프롬프트 페이지 스크립트
   AI콘텐츠마케팅연구소 유쌤클래스
   ========================================================= */
(function () {
  'use strict';

  var WB = window.WORKBOOK;
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
    resultDesc: '결과물 설명', postChannel: '게시 채널', todayLog: '오늘 한 일 (단계→도구)', myEdits: '내가 직접 고친 부분'
  };
  var MULTI = { memo: 1, todayLog: 1, myEdits: 1 };

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
    return {
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
    var id = 'p-' + p.code.replace(/[^\w가-힣-]/g, '');
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
        '<button type="button" class="seg-btn is-on" role="tab" aria-selected="true" data-pane="orig">📄 원본 프롬프트</button>' +
        '<button type="button" class="seg-btn" role="tab" aria-selected="false" data-pane="fill">✍️ 직접 입력 프롬프트</button>' +
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

  function renderNavAndTimeline() {
    var nav = $('#navChips'), tl = $('#timeline');
    var navH = '', tlH = '';
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
            var code = card.getAttribute('data-code');
            var p = WB.prompts.filter(function (x) { return x.code === code; })[0];
            return p.body;
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
    var sections = $all('.module, #appendix');
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
    renderModules();
    renderAppendix();
    $('#promptCount').textContent = WB.prompts.filter(function (p) { return p.code !== '공통'; }).length;
    bindEvents();
    bindScroll();
  });
})();
