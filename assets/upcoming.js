// 追蹤：把各期快報找到的預告事項（即將發布、宣判、生效、截止、會議）依日期排好。
// 首頁顯示近 30 天內的幾則；/upcoming/ 顯示全部，可依主題篩選，也可以加入行事曆。
(function () {
  var dataEl = document.getElementById('up-data');
  if (!dataEl) return;
  var data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var SEC = data.sections || {};
  // 取消追蹤的事項：SERVER 是已 commit 到 GitHub 的（key 對應檔名），
  // 瀏覽器另外記住「剛取消、還沒生效」與「剛恢復、還沒生效」的事項。
  var SERVER = {};
  (data.hidden || []).forEach(function (h) {
    if (!h) return;
    if (typeof h === 'string') SERVER[h] = '';
    else if (h.k) SERVER[h.k] = h.f || '';
  });
  var LS = 'up-hidden', LR = 'up-restored';
  function lsGet(n) { try { return JSON.parse(localStorage.getItem(n) || '[]'); } catch (e) { return []; } }
  function lsSet(n, a) { try { localStorage.setItem(n, JSON.stringify(a)); } catch (e) {} }
  function lsAdd(n, k) { var a = lsGet(n); if (a.indexOf(k) < 0) a.push(k); lsSet(n, a); }
  function lsDel(n, k) { lsSet(n, lsGet(n).filter(function (x) { return x !== k; })); }
  function isHidden(k) {
    if (lsGet(LR).indexOf(k) >= 0) return false;
    return Object.prototype.hasOwnProperty.call(SERVER, k) || lsGet(LS).indexOf(k) >= 0;
  }
  var WD = '日一二三四五六';

  // 台北時間的今天
  var today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  var thisMonth = today.slice(0, 7);

  // 整理與去重：同一天、同一連結（沒有連結就用標題）視為同一件事，主題合併
  var seen = {}, items = [];
  (data.items || []).forEach(function (x) {
    var d = String(x.d || '').slice(0, 10);
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(d) || !x.t) return;
    var key = d + '|' + (x.u || x.t);
    var secs = Array.isArray(x.s) ? x.s : [];
    if (seen[key]) {
      secs.forEach(function (s) { if (seen[key].s.indexOf(s) < 0) seen[key].s.push(s); });
      return;
    }
    var it = { key: key, d: d, t: x.t, k: x.k || '', u: x.u || '', s: secs.slice(), src: x.src || '', srcT: x.srcT || '' };
    seen[key] = it; items.push(it);
  });
  function sortKey(x) { return x.d.length === 7 ? x.d + '-99' : x.d; }
  items.sort(function (a, b) { return sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0; });
  function visible() { return items.filter(function (x) { return !isHidden(x.key); }); }
  function isUpcoming(x) { return x.d.length === 7 ? x.d >= thisMonth : x.d >= today; }
  function daysLeft(x) {
    if (x.d.length === 7) return null;
    return Math.round((Date.parse(x.d + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 864e5);
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dateLabel(x) {
    var p = x.d.split('-');
    if (p.length === 2) return '<span class="up-md">' + (+p[1]) + ' 月</span><span class="up-wd">日期未定</span>';
    var w = new Date(x.d + 'T00:00:00Z').getUTCDay();
    return '<span class="up-md">' + (+p[1]) + ' 月 ' + (+p[2]) + ' 日</span><span class="up-wd">週' + WD[w] + '</span>';
  }
  function countLabel(x) {
    var n = daysLeft(x);
    if (n === null) return '';
    if (n === 0) return '<span class="up-count is-today">今天</span>';
    if (n === 1) return '<span class="up-count is-soon">明天</span>';
    if (n > 0) return '<span class="up-count' + (n <= 7 ? ' is-soon' : '') + '">還有 ' + n + ' 天</span>';
    return '<span class="up-count is-past">' + (-n) + ' 天前</span>';
  }
  function ics(x) {
    var d = x.d.length === 7 ? x.d + '-01' : x.d;
    var start = d.replace(/-/g, '');
    var end = new Date(Date.parse(d + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10).replace(/-/g, '');
    var desc = (x.u ? '原始來源：' + x.u + '\\n' : '') + (x.src ? '出自：' + location.origin + x.src : '');
    var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//miotsukushi//upcoming//ZH', 'BEGIN:VEVENT',
      'UID:' + start + '-' + Math.abs(hash(x.t)) + '@miotsukushi', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART;VALUE=DATE:' + start, 'DTEND;VALUE=DATE:' + end,
      'SUMMARY:' + (x.k ? '［' + x.k + '］' : '') + x.t.replace(/[,;]/g, ' '),
      'DESCRIPTION:' + desc.replace(/[,;]/g, ' '),
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + x.t.replace(/[,;]/g, ' '), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
  }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  function itemHTML(x, opts) {
    var secChips = x.s.map(function (s) { return '<span class="chip sec-' + esc(s) + '">' + esc(SEC[s] || s) + '</span>'; }).join('');
    var title = x.u ? '<a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.t) + '</a>' : esc(x.t);
    var foot = [];
    if (x.src) foot.push('出自 <a href="' + esc(x.src) + '">' + esc(x.srcT || '快報') + '</a>');
    if (opts.restore) foot.push('<a class="up-restore" href="#" data-key="' + esc(x.key) + '">恢復追蹤</a>');
    if (!opts.compact) {
      foot.push('<a href="' + ics(x) + '" download="' + esc(x.d) + '.ics">加入行事曆</a>');
      foot.push('<a class="up-hide" href="#" data-key="' + esc(x.key) + '">不追蹤</a>');
    }
    return '<li class="up-item sec-' + esc(x.s[0] || '') + '" data-secs="' + esc(x.s.join(' ')) + '">' +
      '<time class="up-date" datetime="' + esc(x.d) + '">' + dateLabel(x) + '</time>' +
      '<div class="up-main"><p class="up-meta">' + countLabel(x) + (x.k ? '<span class="up-kind">' + esc(x.k) + '</span>' : '') + secChips + '</p>' +
      '<p class="up-title">' + title + '</p>' +
      (foot.length ? '<p class="up-foot">' + foot.join('<span aria-hidden="true">　</span>') + '</p>' : '') +
      '</div></li>';
  }

  // 月曆：有事的日子標上主題顏色的點，點日期可篩選當天事項
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function calendar(root, onPick) {
    var cur = today.slice(0, 7), picked = '';
    function draw() {
      var map = {};
      visible().forEach(function (x) { if (x.d.length === 10) (map[x.d] = map[x.d] || []).push(x); });
      var y = +cur.slice(0, 4), m = +cur.slice(5, 7);
      var start = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
      var days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      var h = '<div class="cal-head"><button type="button" class="cal-nav" data-step="-1" aria-label="上個月">‹</button>' +
        '<span class="cal-title">' + y + ' 年 ' + m + ' 月</span>' +
        '<button type="button" class="cal-nav" data-step="1" aria-label="下個月">›</button></div><div class="cal-grid">';
      WD.split('').forEach(function (w) { h += '<span class="cal-wd">' + w + '</span>'; });
      for (var i = 0; i < start; i++) h += '<span class="cal-pad"></span>';
      for (var d = 1; d <= days; d++) {
        var ds = cur + '-' + pad2(d), ev = map[ds] || [];
        var cls = 'cal-day' + (ds === today ? ' is-today' : '') + (ds === picked ? ' is-picked' : '') + (ds < today ? ' is-past' : '');
        var secs = [];
        ev.forEach(function (x) { var s0 = x.s[0] || ''; if (secs.indexOf(s0) < 0) secs.push(s0); });
        var dots = '<span class="cal-dots">' + secs.slice(0, 3).map(function (s) { return '<i class="sec-' + esc(s) + '"></i>'; }).join('') + '</span>';
        h += ev.length
          ? '<button type="button" class="' + cls + ' has-ev" data-d="' + ds + '" aria-pressed="' + (ds === picked) + '" aria-label="' + m + ' 月 ' + d + ' 日，' + ev.length + ' 件事"><span>' + d + '</span>' + dots + '</button>'
          : '<span class="' + cls + '"><span>' + d + '</span>' + dots + '</span>';
      }
      root.innerHTML = h + '</div>';
    }
    root.addEventListener('click', function (e) {
      var nav = e.target.closest('.cal-nav');
      if (nav) {
        var y = +cur.slice(0, 4), m = +cur.slice(5, 7) - 1 + (+nav.getAttribute('data-step'));
        var dt = new Date(Date.UTC(y, m, 1));
        cur = dt.getUTCFullYear() + '-' + pad2(dt.getUTCMonth() + 1);
        draw(); return;
      }
      var b = e.target.closest('.cal-day[data-d]');
      if (b) { picked = picked === b.getAttribute('data-d') ? '' : b.getAttribute('data-d'); draw(); onPick(picked); }
    });
    draw();
    return { redraw: draw, clear: function () { picked = ''; draw(); } };
  }
  function dayLabel(ds) { var p = ds.split('-'); return (+p[1]) + ' 月 ' + (+p[2]) + ' 日'; }

  // 首頁：月曆，加上近 30 天內最多 5 則；點月曆的日期則改列當天事項
  var home = document.getElementById('up-home');
  if (home) {
    var homeList = home.querySelector('.up-list');
    var homeNote = home.querySelector('.cal-note');
    var homeCal;
    var rowHTML = function (x) {
        var p = x.d.split('-');
        var n = daysLeft(x);
        var cnt = n === null ? '' : n === 0 ? '今天' : n === 1 ? '明天' : n > 0 ? n + ' 天後' : (-n) + ' 天前';
        var t = x.u ? '<a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.t) + '</a>' : '<a href="' + esc(x.src || '#') + '">' + esc(x.t) + '</a>';
        return '<li class="up-row sec-' + esc(x.s[0] || '') + '"><time datetime="' + esc(x.d) + '">' + (+p[1]) + '/' + (+p[2]) + '</time>' +
          '<span class="up-row-count' + (n !== null && n >= 0 && n <= 1 ? ' is-soon' : '') + '">' + cnt + '</span><span class="up-row-t">' + t + '</span></li>';
    };
    var showHome = function (day) {
      var list = day
        ? visible().filter(function (x) { return x.d === day; })
        : visible().filter(function (x) { var n = daysLeft(x); return isUpcoming(x) && n !== null && n <= 30; }).slice(0, 5);
      homeList.innerHTML = list.length ? list.map(rowHTML).join('') : '<li class="up-empty">30 天內沒有預定事項。</li>';
      if (homeNote) {
        homeNote.hidden = !day;
        if (day) homeNote.innerHTML = dayLabel(day) + '的事項<button type="button" class="cal-reset">顯示近期</button>';
      }
    };
    var calRoot = home.querySelector('.up-cal');
    if (calRoot) homeCal = calendar(calRoot, showHome);
    if (homeNote) homeNote.addEventListener('click', function (e) { if (e.target.closest('.cal-reset')) { homeCal && homeCal.clear(); showHome(''); } });
    showHome('');
    home.hidden = false;
  }

  // 追蹤頁
  var page = document.getElementById('up-page');
  if (page) {
    var list = page.querySelector('.up-groups');
    var status = page.querySelector('.up-status');
    var pastBox = page.querySelector('#up-past');
    var hidBox = page.querySelector('#up-hid');
    var pickedDay = '';
    var pageCal = null;
    function val(name) { var r = page.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
    function render() {
      var sec = val('usec');
      var showPast = pastBox && pastBox.checked;
      var inSec = function (x) { return !sec || x.s.indexOf(sec) >= 0; };
      var pool = visible().filter(inSec);
      var hid = items.filter(function (x) { return isHidden(x.key) && inSec(x); });
      if (pickedDay) {
        var dayItems = pool.filter(function (x) { return x.d === pickedDay; });
        list.innerHTML = '<section class="up-month"><h2>' + dayLabel(pickedDay) + '</h2>' +
          (dayItems.length ? '<ul class="up-list">' + dayItems.map(function (x) { return itemHTML(x, {}); }).join('') + '</ul>' : '<p class="muted">這一天在目前的篩選條件下沒有事項。</p>') + '</section>';
        status.innerHTML = '目前只顯示 ' + dayLabel(pickedDay) + '。<button type="button" class="cal-reset">顯示全部</button>';
        if (pageCal) pageCal.redraw();
        return;
      }
      var future = pool.filter(isUpcoming);
      var past = pool.filter(function (x) { return !isUpcoming(x); }).reverse();
      var html = '', month = '';
      future.forEach(function (x) {
        var m = x.d.slice(0, 7);
        if (m !== month) {
          if (month) html += '</ul></section>';
          month = m;
          html += '<section class="up-month"><h2>' + m.slice(0, 4) + ' 年 ' + (+m.slice(5, 7)) + ' 月</h2><ul class="up-list">';
        }
        html += itemHTML(x, {});
      });
      if (month) html += '</ul></section>';
      if (showPast && past.length) {
        html += '<section class="up-month up-pastgroup"><h2>已過去</h2><ul class="up-list">' + past.map(function (x) { return itemHTML(x, { compact: true }); }).join('') + '</ul></section>';
      }
      if (hidBox && hidBox.checked) {
        html += '<section class="up-month up-pastgroup"><h2>已取消追蹤</h2>' +
          (hid.length ? '<ul class="up-list">' + hid.map(function (x) { return itemHTML(x, { compact: true, restore: true }); }).join('') + '</ul>'
                      : '<p class="muted">沒有取消追蹤的事項。</p>') + '</section>';
      }
      list.innerHTML = html;
      status.textContent = future.length ? '接下來共有 ' + future.length + ' 件事。點月曆上的日期，可以只看那一天。' : '目前沒有即將發生的事項。快報找到預告時會自動出現在這裡。';
      if (pageCal) pageCal.redraw();
    }
    var pcRoot = page.querySelector('.up-cal');
    if (pcRoot) pageCal = calendar(pcRoot, function (day) { pickedDay = day; render(); });
    status.addEventListener('click', function (e) { if (e.target.closest('.cal-reset')) { pickedDay = ''; if (pageCal) pageCal.clear(); render(); } });
    page.querySelectorAll('input').forEach(function (i) { i.addEventListener('change', render); });

    var repo = page.getAttribute('data-repo');
    function yq(s) { return "'" + String(s || '').replace(/\s+/g, ' ').trim().replace(/'/g, "''") + "'"; }
    function stamp() {
      var n = new Date(Date.now() + 8 * 3600e3).toISOString();
      return n.slice(0, 10).replace(/-/g, '') + '-' + n.slice(11, 19).replace(/:/g, '');
    }
    function ghNew(dir, name, body) {
      return 'https://github.com/' + repo + '/new/main/_data/' + dir + '?filename=' + encodeURIComponent(name) + '&value=' + encodeURIComponent(body);
    }
    // 新增追蹤事項
    var add = page.querySelector('.up-add');
    if (add) add.addEventListener('click', function () {
      add.href = ghNew('upcoming', stamp() + '-manual.yml', [
        '# 填好後按 Commit changes 即加入追蹤。',
        "# date 寫 '2026-11-05'；只知道月份寫 '2026-11'。kind 可寫：發布、通過、宣判、生效、施行、截止、會議、其他。",
        '# sections 可寫：' + Object.keys(SEC).map(function (k) { return k + '（' + SEC[k] + '）'; }).join('、') + '，例如 [gender, human-rights]',
        "- date: ''",
        "  title: ''",
        "  kind: '其他'",
        '  sections: []',
        "  url: ''",
        ''].join('\n'));
    });
    list.addEventListener('click', function (e) {
      // 恢復追蹤：在這台瀏覽器立刻恢復；若已 commit 過，打開 GitHub 刪除那個取消檔
      var r = e.target.closest('.up-restore');
      if (r) {
        e.preventDefault();
        var rk = r.getAttribute('data-key');
        lsDel(LS, rk);
        if (Object.prototype.hasOwnProperty.call(SERVER, rk)) {
          lsAdd(LR, rk);
          if (SERVER[rk]) window.open('https://github.com/' + repo + '/delete/main/_data/upcoming_hidden/' + encodeURIComponent(SERVER[rk]) + '.yml', '_blank', 'noopener');
        }
        render();
        return;
      }
      // 不追蹤：先在這台瀏覽器隱藏，再打開 GitHub 讓設定在所有裝置生效
      var a = e.target.closest('.up-hide');
      if (!a) return;
      e.preventDefault();
      var key = a.getAttribute('data-key');
      var it = items.filter(function (x) { return x.key === key; })[0];
      lsDel(LR, key);
      lsAdd(LS, key);
      render();
      if (it) window.open(ghNew('upcoming_hidden', stamp() + '.yml', [
        '# 按 Commit changes 後，這件事就不會再出現在追蹤（所有裝置）。想恢復時，到追蹤頁勾選「顯示已取消追蹤的事項」，按「恢復追蹤」。',
        'key: ' + yq(key),
        'title: ' + yq(it.t),
        ''].join('\n')), '_blank', 'noopener');
    });
    render();
  }
})();
