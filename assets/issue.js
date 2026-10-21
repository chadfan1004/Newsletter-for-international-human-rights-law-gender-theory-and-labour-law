// 單期快報頁：本期目錄、每則條目的「連結」按鈕、列印按鈕。
(function () {
  var article = document.querySelector('article.issue');
  if (!article) return;
  var prose = article.querySelector('.prose');
  if (!prose) return;
  var head = article.querySelector('.issue-head');
  var wide = window.matchMedia('(min-width: 761px)').matches;

  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function isItemHeading(p) {
    if (p.tagName !== 'P' || !p.firstElementChild) return false;
    var c = p.firstElementChild;
    return c.tagName === 'STRONG' && c.textContent.trim() === p.textContent.replace(/收藏\s*$/, '').trim();
  }

  // 1. 本期目錄（## 與 ###）
  var heads = prose.querySelectorAll('h2, h3');
  var used = {};
  heads.forEach(function (h, i) {
    if (!h.id || used[h.id]) h.id = 's-' + (i + 1);
    used[h.id] = 1;
  });
  if (heads.length >= 3) {
    var html = '', open = false;
    heads.forEach(function (h) {
      var a = '<a href="#' + h.id + '">' + h.textContent.replace(/</g, '&lt;') + '</a>';
      if (h.tagName === 'H2') {
        if (open) { html += '</ol></li>'; open = false; }
        html += '<li>' + a;
        var next = h.nextElementSibling;
        while (next && next.tagName !== 'H2' && next.tagName !== 'H3') next = next.nextElementSibling;
        if (next && next.tagName === 'H3') { html += '<ol>'; open = true; } else html += '</li>';
      } else {
        html += '<li>' + a + '</li>';
      }
    });
    if (open) html += '</ol></li>';
    var nav = document.createElement('nav');
    nav.className = 'toc';
    nav.setAttribute('aria-label', '本期目錄');
    nav.innerHTML = '<details' + (wide ? ' open' : '') + '><summary>本期目錄</summary><ol>' + html + '</ol></details>';
    prose.parentNode.insertBefore(nav, prose);
  }

  // 2. 每則條目：固定的錨點與「連結」按鈕
  function copy(text, btn) {
    function done() { var t = btn.textContent; btn.textContent = '已複製'; btn.classList.add('is-done'); setTimeout(function () { btn.textContent = t; btn.classList.remove('is-done'); }, 1600); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }
  var base = location.href.split('#')[0];
  var seen = {};
  Array.prototype.forEach.call(prose.children, function (el) {
    if (!isItemHeading(el)) return;
    var title = el.firstElementChild.textContent.trim();
    var id = 'i-' + hash(title);
    if (seen[id]) id += '-' + (++seen[id]); else seen[id] = 1;
    el.id = id;
    el.classList.add('item-head');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'linkbtn';
    b.textContent = '連結';
    b.setAttribute('aria-label', '複製這一則的連結：' + title.slice(0, 40));
    b.addEventListener('click', function () {
      var url = base + '#' + id;
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      copy(url, b);
    });
    el.appendChild(document.createTextNode(' '));
    el.appendChild(b);
  });

  // 錨點是載入後才產生的，所以手動捲到該則並標示
  if (location.hash.length > 1) {
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      target.classList.add('is-target');
      setTimeout(function () { target.scrollIntoView({ block: 'start' }); }, 50);
    }
  }

  // 3. 列印／存成 PDF
  if (head) {
    var pb = document.createElement('button');
    pb.type = 'button';
    pb.className = 'printbtn';
    pb.textContent = '列印或存成 PDF';
    pb.addEventListener('click', function () {
      var d = article.querySelector('.toc details');
      if (d) d.open = true;
      window.print();
    });
    var date = head.querySelector('.issue-date');
    (date || head).appendChild(pb);
  }
})();
