// 追蹤：把各期快報找到的預告事項（即將發布、宣判、生效、截止、會議）依日期排好。
// 首頁顯示近 30 天內的幾則；/upcoming/ 顯示全部，可依主題篩選，也可以加入行事曆。
(function () {
  var dataEl = document.getElementById('up-data');
  if (!dataEl) return;
  var data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var SEC = data.sections || {};
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
    var it = { d: d, t: x.t, k: x.k || '', u: x.u || '', s: secs.slice(), src: x.src || '', srcT: x.srcT || '' };
    seen[key] = it; items.push(it);
  });
  function sortKey(x) { return x.d.length === 7 ? x.d + '-99' : x.d; }
  items.sort(function (a, b) { return sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0; });
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
    if (!opts.compact) foot.push('<a href="' + ics(x) + '" download="' + esc(x.d) + '.ics">加入行事曆</a>');
    return '<li class="up-item sec-' + esc(x.s[0] || '') + '" data-secs="' + esc(x.s.join(' ')) + '">' +
      '<time class="up-date" datetime="' + esc(x.d) + '">' + dateLabel(x) + '</time>' +
      '<div class="up-main"><p class="up-meta">' + countLabel(x) + (x.k ? '<span class="up-kind">' + esc(x.k) + '</span>' : '') + secChips + '</p>' +
      '<p class="up-title">' + title + '</p>' +
      (foot.length ? '<p class="up-foot">' + foot.join('<span aria-hidden="true">　</span>') + '</p>' : '') +
      '</div></li>';
  }

  // 首頁：近 30 天內，最多 6 則
  var home = document.getElementById('up-home');
  if (home) {
    var soon = items.filter(function (x) { var n = daysLeft(x); return isUpcoming(x) && n !== null && n <= 30; }).slice(0, 6);
    if (soon.length) {
      home.querySelector('.up-list').innerHTML = soon.map(function (x) { return itemHTML(x, { compact: true }); }).join('');
      home.hidden = false;
    }
  }

  // 追蹤頁
  var page = document.getElementById('up-page');
  if (page) {
    var list = page.querySelector('.up-groups');
    var status = page.querySelector('.up-status');
    var pastBox = page.querySelector('#up-past');
    function val(name) { var r = page.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
    function render() {
      var sec = val('usec');
      var showPast = pastBox && pastBox.checked;
      var pool = items.filter(function (x) { return !sec || x.s.indexOf(sec) >= 0; });
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
      list.innerHTML = html;
      status.textContent = future.length ? '接下來共有 ' + future.length + ' 件事。' : '目前沒有即將發生的事項。快報找到預告時會自動出現在這裡。';
    }
    page.querySelectorAll('input').forEach(function (i) { i.addEventListener('change', render); });
    render();
  }
})();
