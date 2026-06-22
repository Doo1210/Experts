/**
 * 通用工具函数
 */
(function () {
  window.readImageFile = function (file, onSuccess) {
    if (!file) return false;
    if (!file.type || file.type.indexOf('image/') !== 0) {
      ElementPlus.ElMessage.warning('请选择图片文件');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      ElementPlus.ElMessage.warning('图片大小不能超过 2MB');
      return false;
    }
    var reader = new FileReader();
    reader.onload = function (ev) { onSuccess(ev.target.result); };
    reader.readAsDataURL(file);
    return true;
  };

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sanitizeHref(href) {
    var url = String(href || '').trim();
    if (/^(https?:|mailto:|#)/i.test(url)) return url;
    return '#';
  }

  window.renderMarkdown = function renderMarkdown(md) {
    if (!md) return '';
    var codeBlocks = [];
    var src = String(md).replace(/\r\n/g, '\n');
    src = src.replace(/```[^\n]*\n([\s\S]*?)```/g, function (_m, code) {
      var id = codeBlocks.length;
      codeBlocks.push('<pre class="md-pre"><code>' + escapeHtml(code.replace(/\n$/, '')) + '</code></pre>');
      return '@@CODEBLOCK' + id + '@@';
    });

    var lines = src.split('\n');
    var htmlParts = [];
    var inUl = false;
    var inOl = false;

    function closeLists() {
      if (inUl) { htmlParts.push('</ul>'); inUl = false; }
      if (inOl) { htmlParts.push('</ol>'); inOl = false; }
    }

    function inlineFormat(text) {
      var s = escapeHtml(text);
      s = s.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
      s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_m, label, href) {
        return '<a href="' + sanitizeHref(href) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
      });
      return s;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      if (/^@@CODEBLOCK\d+@@$/.test(trimmed)) {
        closeLists();
        htmlParts.push(trimmed);
        continue;
      }

      if (!trimmed) {
        closeLists();
        continue;
      }

      var heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        closeLists();
        var level = heading[1].length + 1;
        if (level > 4) level = 4;
        htmlParts.push('<h' + level + '>' + inlineFormat(heading[2]) + '</h' + level + '>');
        continue;
      }

      if (/^>\s?/.test(trimmed)) {
        closeLists();
        htmlParts.push('<blockquote>' + inlineFormat(trimmed.replace(/^>\s?/, '')) + '</blockquote>');
        continue;
      }

      var ul = trimmed.match(/^[-*+]\s+(.+)$/);
      if (ul) {
        if (inOl) { htmlParts.push('</ol>'); inOl = false; }
        if (!inUl) { htmlParts.push('<ul>'); inUl = true; }
        htmlParts.push('<li>' + inlineFormat(ul[1]) + '</li>');
        continue;
      }

      var ol = trimmed.match(/^\d+\.\s+(.+)$/);
      if (ol) {
        if (inUl) { htmlParts.push('</ul>'); inUl = false; }
        if (!inOl) { htmlParts.push('<ol>'); inOl = true; }
        htmlParts.push('<li>' + inlineFormat(ol[1]) + '</li>');
        continue;
      }

      closeLists();
      htmlParts.push('<p>' + inlineFormat(trimmed) + '</p>');
    }
    closeLists();

    var html = htmlParts.join('');
    for (var j = 0; j < codeBlocks.length; j++) {
      html = html.replace('@@CODEBLOCK' + j + '@@', codeBlocks[j]);
    }
    return html;
  };
})();
