/* 1023 prototype helpers: UI sectioning over one SOUL.md and MCP JSON import. */
(function () {
  var SOUL_HEADINGS = ['岗位职责', '作业流程', '工作规范'];
  var SECTION_KEYS = ['duty', 'flow', 'rules'];
  var DEFAULT_RULES = '生成文件使用相对路径，写在当前工作目录内；不要写到工作空间根下的 outputs/，也不要自行创建 inputs/、tmp/ 这类目录。\n可以读取工作空间内的任意文件。当前工作目录之外的共享资料，使用 ../ 或绝对路径；需要搜索时，把 search_files 的路径指到工作空间根。\n不要把共享 SOP 复制进每个对话目录。';

  function emptySections() { return { duty: '', flow: '', rules: '' }; }
  function clean(value) { return String(value == null ? '' : value).replace(/\r\n?/g, '\n').trim(); }
  function isReservedHeading(line) {
    return /^\s*##\s*(岗位职责|作业流程|工作规范)\s*$/.test(line);
  }
  function composeSoul(sections) {
    var parts = [];
    SECTION_KEYS.forEach(function (key, index) {
      var body = clean(sections && sections[key]);
      if (body) parts.push('## ' + SOUL_HEADINGS[index] + '\n\n' + body);
    });
    return parts.length ? '# 岗位说明\n\n' + parts.join('\n\n') + '\n' : '';
  }
  function splitSoul(raw) {
    var source = clean(raw);
    var result = emptySections();
    if (!source || (window.DEFAULT_SOUL_MD && source === clean(window.DEFAULT_SOUL_MD))) {
      return { sections: result, legacy: false };
    }
    var lines = source.split('\n');
    var current = 'duty';
    var found = false;
    lines.forEach(function (line) {
      if (/^\s*#\s*岗位说明\s*$/.test(line)) return;
      var match = line.match(/^\s*##\s*(岗位职责|作业流程|工作规范)\s*$/);
      if (match) {
        current = SECTION_KEYS[SOUL_HEADINGS.indexOf(match[1])];
        found = true;
        return;
      }
      result[current] += line + '\n';
    });
    SECTION_KEYS.forEach(function (key) { result[key] = clean(result[key]); });
    return { sections: result, legacy: !found };
  }
  function validateSoul(sections) {
    var conflict = '';
    SECTION_KEYS.some(function (key) {
      var line = clean(sections && sections[key]).split('\n').find(isReservedHeading);
      if (line) { conflict = line.trim(); return true; }
      return false;
    });
    var length = Array.from(composeSoul(sections)).length;
    return { ok: !conflict && length <= 20000, length: length, conflict: conflict, overLimit: length > 20000 };
  }
  function templateSections() {
    return {
      duty: '负责：\n不负责：',
      flow: '1. 先核对当前工作目录和已有资料\n2. 做完先给结论，再给依据\n3. 高风险操作先停下来问人',
      rules: DEFAULT_RULES
    };
  }

  function parseMcpJson(text) {
    var source = clean(text).replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
    var parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('请粘贴 mcp.json 对象');
    var map = parsed.mcpServers || parsed.mcp_servers || parsed;
    if (!map || typeof map !== 'object' || Array.isArray(map) || map.command || map.url) {
      throw new Error('需要服务器名称，请包成 {"mcpServers":{"名字":{…}}}');
    }
    var names = Object.keys(map);
    if (!names.length) throw new Error('mcp.json 中没有服务器');
    return names.map(function (originalName) {
      var entry = map[originalName];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !(entry.command || entry.url)) {
        throw new Error('服务器「' + originalName + '」缺少 command 或 url');
      }
      var name = originalName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+/, '').slice(0, 64);
      if (!name) throw new Error('服务器名称无效：' + originalName);
      return { originalName: originalName, name: name, config: entry };
    });
  }

  window.Expert1023Utils = {
    emptySections: emptySections, splitSoul: splitSoul, composeSoul: composeSoul,
    validateSoul: validateSoul, templateSections: templateSections, defaultRules: DEFAULT_RULES,
    parseMcpJson: parseMcpJson
  };
})();
