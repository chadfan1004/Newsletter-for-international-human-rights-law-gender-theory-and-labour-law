// 在快報條目旁加上「收藏」按鈕。
// 按下後打開 GitHub 的新增檔案頁面，內容已預先填好；按 Commit changes 即加入收藏專區。
(function () {
  var article = document.querySelector('article.issue[data-section]');
  if (!article) return;
  var prose = article.querySelector('.prose');
  if (!prose) return;

  var section = article.getAttribute('data-section');
  var issueTitle = article.getAttribute('data-title') || document.title;
  var issueUrl = article.getAttribute('data-url') || location.href;
  var repo = article.getAttribute('data-repo');
  var SKIP = /來源清單|檢查紀錄|待確認/;

  function taipeiNow() {
    return new Date(Date.now() + 8 * 3600 * 1000); // read with getUTC* = Taipei wall clock
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function stamp(d) {
    return '' + d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + '-' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds());
  }
  // YAML single-quoted scalar: only ' needs escaping (doubled). Newlines collapsed.
  function q(s) { return "'" + String(s || '').replace(/\s+/g, ' ').trim().replace(/'/g, "''") + "'"; }
  function clip(s, n) { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; }

  function isItemHeading(p) {
    if (p.tagName !== 'P' || p.children.length !== 1) return false;
    var c = p.firstElementChild;
    return c.tagName === 'STRONG' && c.textContent.trim() === p.textContent.trim();
  }

  // Walk the prose top-level blocks, tracking the current h2.
  var currentH2 = '';
  var blocks = Array.prototype.slice.call(prose.children);
  blocks.forEach(function (el, idx) {
    if (el.tagName === 'H2') { currentH2 = el.textContent; return; }
    if (SKIP.test(currentH2) || !isItemHeading(el)) return;

    // Gather the item's following blocks until the next heading or item.
    var url = '', context = '';
    for (var j = idx + 1; j < blocks.length; j++) {
      var nx = blocks[j];
      if (/^H[1-4]$/.test(nx.tagName) || isItemHeading(nx)) break;
      if (!url) {
        var a = nx.querySelector('a[href^="http"]');
        if (a) url = a.href;
      }
      if (!context) {
        var li = Array.prototype.find.call(nx.querySelectorAll('li'), function (x) { return /摘要/.test(x.textContent); });
        context = li ? li.textContent.replace(/^\s*(內容)?摘要[:：]\s*/, '') : nx.textContent;
      }
    }

    var title = el.textContent.trim();
    function build() {
      var now = taipeiNow();
      var yaml = [
        '# 按 Commit changes 即收藏',
        'status: 待整理',
        'title: ' + q(title),
        'url: ' + q(url || issueUrl),
        'sections: [' + section + ']',
        'type: 待整理',
        "note: ''",
        'source: ' + q(issueUrl),
        'source_title: ' + q(issueTitle),
        'context: ' + q(clip(context, 100)),
        'added: ' + ymd(now),
        ''
      ].join('\n');
      return 'https://github.com/' + repo + '/new/main/_data/library' +
        '?filename=' + encodeURIComponent(stamp(now) + '-' + section + '.yml') +
        '&value=' + encodeURIComponent(yaml);
    }

    var btn = document.createElement('a');
    btn.className = 'collect';
    btn.href = build();
    btn.addEventListener('click', function () { btn.href = build(); });
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.textContent = '收藏';
    btn.setAttribute('aria-label', '收藏：' + clip(title, 60));
    el.appendChild(document.createTextNode(' '));
    el.appendChild(btn);
  });
})();
