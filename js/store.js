/**
 * localStorage 数据层 — 专家 & 项目原型
 */
(function () {
  const STORAGE_KEY = 'expert_platform_v1';
  const DEFAULT_EXPERT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#e8eef8"/><circle cx="40" cy="29" r="13" fill="#b8c5dc"/><ellipse cx="40" cy="63" rx="21" ry="15" fill="#b8c5dc"/></svg>'
  );
  // 任务级默认工作目录：每个对话任务独立绑定 cwd（PRD 10.7 / 2.2 一任务一 session）
  const DEFAULT_TASK_CWD = '';
  var DEV_MOCK = window.DEV_MOCK === true || String(window.DEV_MOCK).toLowerCase() === 'true';
  var sidecarAvailable = false;

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function projectSlugFromName(name) {
    var raw = String(name || '').trim().toLowerCase();
    var slug = raw
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    return slug || ('project-' + Date.now().toString(36));
  }

  function uniqueProjectSlug(name, currentProjectId) {
    var base = projectSlugFromName(name);
    var slug = base;
    var i = 2;
    while ((state.projects || []).some(function (p) {
      return String(p.slug || '') === slug && !sameId(p.id, currentProjectId);
    })) {
      slug = base + '-' + i;
      i += 1;
    }
    return slug;
  }

  function sameId(a, b) {
    return String(a) === String(b);
  }

  function nowIso() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  function daysAgoIso(days, hour, minute) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour == null ? 10 : hour, minute == null ? 0 : minute, 0, 0);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  function minutesAgoIso(minutes) {
    var d = new Date();
    d.setMinutes(d.getMinutes() - (minutes || 0));
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  function resolveDemoTaskCreatedAt(def) {
    if (def.minutesAgo != null) return minutesAgoIso(def.minutesAgo);
    return daysAgoIso(def.daysAgo, def.hour, def.minute);
  }

  function getDefaultSkillParams(skillId) {
    var schema = (window.SKILL_PARAM_SCHEMAS || {})[skillId];
    if (!schema) return {};
    var params = {};
    schema.forEach(function (s) { params[s.key] = s.default; });
    return params;
  }

  /** 将目录项转为已安装技能记录（Hermes opt-out：enabled 默认 true） */
  function catalogEntryToInstalled(entry, opts) {
    opts = opts || {};
    var clearUsage = !!opts.clearUsage;
    var usage = opts.usage || {};
    return {
      skillId: entry.id || entry.skillId,
      name: entry.name || entry.id || entry.skillId,
      description: entry.description || '',
      category: entry.category || '',
      enabled: opts.enabled !== false,
      useCount: clearUsage ? 0 : (usage.useCount != null ? usage.useCount : (entry.useCount || 0)),
      patchCount: clearUsage ? 0 : (usage.patchCount != null ? usage.patchCount : (entry.patchCount || 0)),
      lastUsedAt: clearUsage ? null : (usage.lastUsedAt !== undefined ? usage.lastUsedAt : (entry.lastUsedAt || null)),
      provenance: entry.provenance || 'bundled',
      params: getDefaultSkillParams(entry.id || entry.skillId)
    };
  }

  /** 创建时 seed：全部内置技能已安装 + 默认启用；用量清空 */
  function seedInstalledSkills(opts) {
    opts = opts || {};
    var catalog = window.SKILLS_CATALOG || [];
    var demoUsage = opts.withDemoUsage
      ? {
          plan: { useCount: 12, patchCount: 0, lastUsedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
          'github-code-review': { useCount: 3, patchCount: 1, lastUsedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString() },
          'skill-yield': { useCount: 8, patchCount: 2, lastUsedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString() },
          'skill-spc': { useCount: 5, patchCount: 0, lastUsedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString() },
          'apple-notes': { useCount: 0, patchCount: 0, lastUsedAt: null }
        }
      : {};
    var disabledIds = opts.demoDisabled || [];
    return catalog.map(function (s) {
      var usage = demoUsage[s.id] || {};
      return catalogEntryToInstalled(s, {
        clearUsage: !opts.withDemoUsage,
        enabled: disabledIds.indexOf(s.id) < 0,
        usage: usage
      });
    });
  }

  function clearSkillUsageFields(skill) {
    return Object.assign({}, skill, {
      useCount: 0,
      patchCount: 0,
      lastUsedAt: null
    });
  }

  function normalizeInstalledSkillRecord(b) {
    if (typeof b === 'string') {
      var cat = (window.SKILLS_CATALOG || []).find(function (s) { return s.id === b; });
      if (cat) return catalogEntryToInstalled(cat, { clearUsage: true, enabled: true });
      return {
        skillId: b,
        name: b,
        description: '',
        category: '',
        enabled: true,
        useCount: 0,
        patchCount: 0,
        lastUsedAt: null,
        provenance: 'bundled',
        params: getDefaultSkillParams(b)
      };
    }
    var sid = String(b.skillId || b.id || b.canonicalName || b.name || '').trim();
    if (!sid) return null;
    return {
      skillId: sid,
      name: b.name || sid,
      description: b.description || '',
      category: b.category || '',
      enabled: b.enabled !== false,
      useCount: b.useCount || 0,
      patchCount: b.patchCount || 0,
      lastUsedAt: b.lastUsedAt || null,
      provenance: b.provenance || 'bundled',
      params: b.params || getDefaultSkillParams(sid)
    };
  }

  /** 保证 DEV_MOCK 下展示「全部已安装」：合并目录缺失项 */
  function ensureFullInstalledSkills(rawList) {
    var byId = {};
    (rawList || []).forEach(function (b) {
      var rec = normalizeInstalledSkillRecord(b);
      if (rec) byId[rec.skillId] = rec;
    });
    if (DEV_MOCK && window.SKILLS_CATALOG) {
      window.SKILLS_CATALOG.forEach(function (s) {
        if (!byId[s.id]) {
          byId[s.id] = catalogEntryToInstalled(s, { clearUsage: true, enabled: true });
        } else {
          byId[s.id].name = byId[s.id].name || s.name;
          byId[s.id].description = byId[s.id].description || s.description || '';
          byId[s.id].category = byId[s.id].category || s.category || '';
          byId[s.id].provenance = byId[s.id].provenance || s.provenance || 'bundled';
        }
      });
    }
    return Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) {
      var ca = (a.category || '').localeCompare(b.category || '');
      if (ca !== 0) return ca;
      return (a.name || a.skillId).localeCompare(b.name || b.skillId);
    });
  }

  function getDefaultToolConfig(toolId) {
    var schema = (window.TOOL_PARAM_SCHEMAS || {})[toolId];
    if (!schema || !schema.length) return {};
    var config = {};
    schema.forEach(function (s) { config[s.key] = s.default !== undefined ? s.default : ''; });
    return config;
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value == null ? null : value));
  }

  function normalizeMcpServer(raw) {
    var s = raw || {};
    var name = String(s.name || s.id || '').trim();
    var type = (s.type === 'http' || s.type === 'HTTP') ? 'http' : 'stdio';
    var enabled = s.enabled !== false;
    var missingEnv = Array.isArray(s.missingEnv) ? s.missingEnv.slice() : [];
    var env = s.env && typeof s.env === 'object' ? Object.assign({}, s.env) : {};
    Object.keys(env).forEach(function (k) {
      if (env[k] === '' || env[k] === null || env[k] === undefined) {
        if (missingEnv.indexOf(k) < 0) missingEnv.push(k);
      }
    });
    var status = s.status;
    if (!enabled) status = 'disabled';
    else if (missingEnv.length) status = 'missing_secret';
    else if (status === 'connection_failed' || status === 'error') status = 'connection_failed';
    else status = 'ok';
    return {
      id: name,
      name: name,
      type: type,
      url: s.url || '',
      command: s.command || '',
      args: Array.isArray(s.args)
        ? s.args.slice()
        : (typeof s.args === 'string' && s.args.trim() ? s.args.trim().split(/[\s,]+/) : []),
      env: env,
      enabled: enabled,
      status: status,
      missingEnv: missingEnv,
      errorSummary: s.errorSummary || '',
      secretsFilled: !!s.secretsFilled
    };
  }

  function syncMcpServersToDetailMeta(expertId, list) {
    var key = String(expertId);
    var prev = (state.expertDetailMeta && state.expertDetailMeta[key]) || {};
    var toolsDetail = Object.assign({}, prev.toolsDetail || {}, { mcpServers: list });
    mergeExpertDetailMeta(key, { toolsDetail: toolsDetail });
  }

  function setMcpServersInternal(expertId, list) {
    var key = String(expertId);
    var normalized = (list || []).map(normalizeMcpServer).filter(function (s) { return !!s.name; });
    if (!state.mcpServers) state.mcpServers = {};
    state.mcpServers[key] = normalized;
    syncMcpServersToDetailMeta(key, normalized);
    return normalized;
  }

  function defaultMcpServersForClone() {
    return (window.DEFAULT_MCP_SERVERS || []).map(normalizeMcpServer);
  }

  /** DEV_MOCK MCP 演示种子版本； bump 后会对「空列表」专家补种一次（不覆盖已有配置） */
  var MCP_DEMO_SEED_VERSION = 4;

  function demoMcpServersForSeed(index) {
    var byIndex = window.DEMO_MCP_SERVERS_BY_INDEX || {};
    var list = byIndex[index] || byIndex[String(index)] || [];
    return (list || []).map(normalizeMcpServer);
  }

  function addMinutesIso(baseIso, minutes) {
    var d = new Date(String(baseIso).replace(' ', 'T'));
    if (isNaN(d.getTime())) return baseIso;
    d.setMinutes(d.getMinutes() + (minutes || 0));
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  function getExpertDemoCapabilities(expertId) {
    var skillIds = state.skillBindings[expertId] || [];
    var toolIds = normalizeToolIds(state.toolBindings[expertId] || []);
    var skill = (window.SKILLS_CATALOG || []).find(function (s) { return s.id === skillIds[0]; });
    var tool = (window.TOOLS_CATALOG || []).find(function (t) { return t.id === toolIds[0]; });
    return {
      skill: skill ? skill.name : '专业分析',
      tool: tool ? (tool.label || tool.name || tool.id) : '数据查询'
    };
  }

  function getToolsetConfigOverride(expertId, toolId) {
    var map = (state.toolsetConfigs || {})[String(expertId)] || {};
    return map[String(toolId)] || null;
  }

  function setToolsetConfigOverride(expertId, toolId, patch) {
    var key = String(expertId);
    var tid = String(toolId || '').trim();
    if (!tid) return;
    if (!state.toolsetConfigs) state.toolsetConfigs = {};
    if (!state.toolsetConfigs[key]) state.toolsetConfigs[key] = {};
    state.toolsetConfigs[key][tid] = Object.assign({}, state.toolsetConfigs[key][tid] || {}, patch || {});
  }

  /** 给旧版 action 消息补全 summary/params，使其可在 ActivityItem 中展开 */
  function normalizeLegacyActionMessage(m) {
    if (!m || m.type !== 'action') return false;
    if (m.summary || m.result) return false;
    m.summary = '检索到 3 条相关记录并完成聚合';
    m.params = m.params || { source: '内部知识库' };
    m.duration = m.duration || 1.8;
    return true;
  }

  /** 子智能体嵌套事件补全（思考项需有 duration 才显示用时） */
  function normalizeSubagentEvents(events) {
    if (!Array.isArray(events)) return events;
    return events.map(function (ev) {
      if (!ev || ev.type !== 'thought') return ev;
      var item = Object.assign({}, ev);
      var n = Number(item.duration);
      item.duration = isFinite(n) ? n : 0.8;
      return item;
    });
  }

  function normalizeLegacySubagentMessage(m) {
    if (!m || m.type !== 'subagent' || !Array.isArray(m.subagentEvents)) return false;
    var changed = false;
    m.subagentEvents = m.subagentEvents.map(function (ev) {
      if (!ev || ev.type !== 'thought') return ev;
      var n = Number(ev.duration);
      if (isFinite(n)) return ev;
      changed = true;
      return Object.assign({}, ev, { duration: 0.8 });
    });
    return changed;
  }

  function normalizeLegacyActionMessages(messagesMap) {
    if (!messagesMap) return false;
    var updated = false;
    Object.keys(messagesMap).forEach(function (key) {
      var list = messagesMap[key];
      if (!Array.isArray(list)) return;
      for (var k = 0; k < list.length; k++) {
        if (normalizeLegacyActionMessage(list[k])) updated = true;
      }
    });
    return updated;
  }

  /** 对话流仅保留 process/goal 进度提示，过滤 model/cwd/委派说明等不应出现的 status */
  function shouldKeepConversationMessage(m) {
    if (!m) return false;
    if (m.type === 'skill') return false;
    if (m.type !== 'status') return true;
    var kind = m.statusKind || '';
    return kind === 'process' || kind === 'goal';
  }

  function sanitizeLegacyConversationMessages(messagesMap) {
    if (!messagesMap) return false;
    var updated = false;
    Object.keys(messagesMap).forEach(function (key) {
      var list = messagesMap[key];
      if (!Array.isArray(list)) return;
      var filtered = list.filter(shouldKeepConversationMessage);
      if (filtered.length !== list.length) {
        messagesMap[key] = filtered;
        updated = true;
      }
      for (var k = 0; k < filtered.length; k++) {
        if (normalizeLegacyActionMessage(filtered[k])) updated = true;
        if (normalizeLegacySubagentMessage(filtered[k])) updated = true;
      }
    });
    return updated;
  }

  function enrichMessagesWithExpertFlow(messages, expertId) {
    var cap = getExpertDemoCapabilities(expertId);
    var out = [];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (m.type && m.type !== 'chat') {
        out.push(m);
        continue;
      }
      out.push(Object.assign({ type: 'chat' }, m));
      if (m.role !== 'user') continue;
      var inject = false;
      for (var j = i + 1; j < messages.length; j++) {
        if (messages[j].role === 'user') break;
        if (messages[j].role === 'expert' && (!messages[j].type || messages[j].type === 'chat')) {
          inject = true;
          break;
        }
        if (messages[j].type && messages[j].type !== 'chat') break;
      }
      if (inject) {
        out.push(
          { role: 'expert', type: 'thought', content: 'Thought: 明确问题边界，梳理所需数据来源与分析路径。' },
          { role: 'expert', type: 'action', toolName: cap.tool, params: { source: '内部知识库' }, summary: '检索到 3 条相关记录并完成聚合', duration: 1.8 }
        );
      }
    }
    return out;
  }

  function taskMessagesHaveRichTypes(msgs) {
    return (msgs || []).some(function (m) {
      return m.type === 'thought' || m.type === 'action';
    });
  }

  function buildDemoMessages(def, baseIso, expertId) {
    var raw = def.messages || [];
    var processed = enrichMessagesWithExpertFlow(raw, expertId);
    return processed.map(function (m, i) {
      var offset = m.offsetMin != null ? m.offsetMin : i * 2;
      return {
        id: uid(),
        role: m.role,
        type: m.type || 'chat',
        content: m.content,
        toolName: m.toolName || null,
        expertId: m.role === 'expert' ? String(expertId) : null,
        attachments: m.attachments || null,
        createdAt: addMinutesIso(baseIso, offset),
        // 阶段1扩展字段
        params: m.params || null,
        summary: m.summary || null,
        duration: m.duration || null,
        progress: m.progress || null,
        isError: m.isError || false,
        subagentName: m.subagentName || null,
        goal: m.goal || null,
        subagentStatus: m.subagentStatus || null,
        subagentDuration: m.subagentDuration != null ? m.subagentDuration : null,
        subagentSummary: m.subagentSummary || null,
        subagentEvents: normalizeSubagentEvents(m.subagentEvents) || null,
        requestId: m.requestId || null,
        question: m.question || null,
        choices: m.choices || null,
        answer: m.answer || null,
        command: m.command || null,
        description: m.description || null,
        allowPermanent: m.allowPermanent || false,
        choice: m.choice || null,
        statusKind: m.statusKind || null
      };
    });
  }

  function getDemoDialogueTaskBundle(expertId) {
    var bundles = window.DEMO_DIALOGUE_TASK_BUNDLES || {};
    return bundles[String(expertId)] || [];
  }

  function addDemoDialogueTask(expertId, def) {
    var createdAt = resolveDemoTaskCreatedAt(def);
    var cwdOptions = ['.', '.', '.', '工位8', '工位3', '工位12', '设备区A', '原料仓'];
    var cwd = def.cwd || cwdOptions[Math.floor(Math.random() * cwdOptions.length)];
    var task = {
      id: uid(),
      title: def.title,
      type: 'dialogue',
      status: def.status || 'pending',
      expertId: expertId,
      ownerId: 'admin',
      archived: false,
      cwd: cwd,
      titleSet: true,
      createdAt: createdAt,
      updatedAt: createdAt,
      lastActivityAt: createdAt
    };
    state.tasks.unshift(task);
    var demoMessages = buildDemoMessages(def, createdAt, expertId);
    state.messages[task.id] = demoMessages;
    task.lastActivityAt = syncTaskLastActivityAt(task);
    if (demoMessages.length) {
      task.updatedAt = demoMessages[demoMessages.length - 1].createdAt;
    }
    (def.artifacts || []).forEach(function (a) {
      if (!state.taskArtifacts) state.taskArtifacts = [];
      state.taskArtifacts.unshift({
        id: uid(),
        taskId: task.id,
        title: a.title,
        content: a.content || '',
        type: a.type || 'document',
        createdAt: createdAt
      });
    });
    return task;
  }

  function ensureDemoDialogueTasks(expertId) {
    if (!expertId) return false;
    var updated = false;
    getDemoDialogueTaskBundle(expertId).forEach(function (def) {
      var exists = state.tasks.some(function (t) {
        return t.expertId === expertId && t.type === 'dialogue' && t.title === def.title;
      });
      if (!exists) {
        addDemoDialogueTask(expertId, def);
        updated = true;
      }
    });
    return updated;
  }

  function migrateExpertDialogueTasks() {
    var updated = false;
    state.experts.forEach(function (e) {
      if (getDemoDialogueTaskBundle(e.id).length && ensureDemoDialogueTasks(e.id)) {
        updated = true;
      }
    });
    if (updated) persist();
  }

  function syncDemoDialogueArtifacts(task, def, baseIso) {
    if (!def.artifacts || !def.artifacts.length) return false;
    if (!state.taskArtifacts) state.taskArtifacts = [];
    var changed = false;
    def.artifacts.forEach(function (a) {
      var exists = state.taskArtifacts.some(function (x) {
        return x.taskId === task.id && x.title === a.title;
      });
      if (!exists) {
        state.taskArtifacts.unshift({
          id: uid(),
          taskId: task.id,
          title: a.title,
          content: a.content || '',
          type: a.type || 'document',
          createdAt: baseIso
        });
        changed = true;
      }
    });
    return changed;
  }

  function taskHasUserActivity(task, messages) {
    if (task.userTouched) return true;
    return (messages || []).some(function (m) { return m.role === 'user'; });
  }

  /** 用户最近一条消息时间；无用户消息时返回 null */
  function getLastUserMessageAt(taskId, messages) {
    var list = messages || state.messages[taskId] || [];
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].role === 'user' && list[i].createdAt) return list[i].createdAt;
    }
    return null;
  }

  /** last_activity_at：用户最近发言时间；新建未发言任务回退 createdAt */
  function resolveTaskLastActivityAt(task) {
    if (!task) return '';
    var fromMsg = getLastUserMessageAt(task.id);
    if (fromMsg) return fromMsg;
    return task.createdAt || task.lastActivityAt || task.updatedAt || '';
  }

  function syncTaskLastActivityAt(task) {
    if (!task) return '';
    var at = getLastUserMessageAt(task.id) || task.createdAt || nowIso();
    task.lastActivityAt = at;
    return at;
  }

  function shouldSyncDemoMessages(task, def, current, expected) {
    if (!expected.length) return false;
    if (taskHasUserActivity(task, current)) return false;
    var enriched = enrichMessagesWithExpertFlow(expected, task.expertId);
    if (!current.length) return true;
    if (!taskMessagesHaveRichTypes(current)) return true;
    if (current.length < enriched.length) return true;
    return false;
  }

  function migrateExpertDialogueMessages(options) {
    options = options || {};
    var force = !!options.force;
    var updated = false;
    state.experts.forEach(function (e) {
      getDemoDialogueTaskBundle(e.id).forEach(function (def) {
        var task = state.tasks.find(function (t) {
          return String(t.expertId) === String(e.id) && t.type === 'dialogue' && t.title === def.title;
        });
        if (!task) return;
        if (task.userTouched) return;
        var expected = def.messages || [];
        var current = state.messages[task.id] || [];
        var baseIso = task.createdAt || resolveDemoTaskCreatedAt(def);
        if (force || shouldSyncDemoMessages(task, def, current, expected)) {
          var demoMessages = buildDemoMessages(def, baseIso, e.id);
          state.messages[task.id] = demoMessages;
          task.updatedAt = demoMessages[demoMessages.length - 1].createdAt;
          task.lastActivityAt = syncTaskLastActivityAt(task);
          updated = true;
        }
        if (def.status && task.status !== def.status && !task.userTouched) {
          task.status = def.status;
          updated = true;
        }
        if (syncDemoDialogueArtifacts(task, def, baseIso)) updated = true;
      });
    });
    if (updated) persist();
  }

  function defaultState() {
    return {
      experts: [],
      favorites: [],
      personas: {},
      skillBindings: {},
      toolBindings: {},
      toolsetConfigs: {},
      mcpServers: {},
      memories: [],
      tasks: [],
      messages: {},
      projects: [],
      projectMembers: [],
      projectMessages: {},
      projectOutputs: [],
      projectTasks: [],
      projectEvents: [],
      projectFiles: [],
      imChannels: {},
      permissions: {},
      workspaceFiles: {},
      taskArtifacts: [],
      expertDetailMeta: {},
      demoSyncVersion: null,
      projectTaskSchemaVersion: null,
      mcpDemoSeedVersion: null
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = { ...defaultState(), ...JSON.parse(raw) };
      // 迁移：清理不应出现在对话流中的 status/skill + 给空 action 补结果
      if (parsed.messages) {
        sanitizeLegacyConversationMessages(parsed.messages);
      }
      return parsed;
    } catch {
      return defaultState();
    }
  }

  var STORAGE_WARN_BYTES = 4 * 1024 * 1024;
  var MAX_FILE_CONTENT_CHARS = 32 * 1024;
  var MAX_MESSAGES_PER_TASK = 500;
  var MAX_AVATAR_CHARS = 120 * 1024;

  function prepareStateForStorage(raw) {
    var snap = JSON.parse(JSON.stringify(raw));
    if (!DEV_MOCK) {
      snap.skillBindings = {};
      snap.toolBindings = {};
      snap.mcpServers = {};
      snap.expertDetailMeta = {};
    }
    (snap.projectFiles || []).forEach(function (f) {
      if (f.content && f.content.length > MAX_FILE_CONTENT_CHARS) {
        f.content = f.content.slice(0, MAX_FILE_CONTENT_CHARS) + '\n…（内容过长已截断以节省存储空间）';
        f.contentTruncated = true;
      }
    });
    Object.keys(snap.messages || {}).forEach(function (taskId) {
      var msgs = snap.messages[taskId];
      if (!msgs || msgs.length <= MAX_MESSAGES_PER_TASK) return;
      var task = (snap.tasks || []).find(function (t) { return t.id === taskId; });
      if (task && task.archived) {
        snap.messages[taskId] = msgs.slice(-MAX_MESSAGES_PER_TASK);
      }
    });
    (snap.experts || []).forEach(function (e) {
      if (e.avatar && e.avatar.length > MAX_AVATAR_CHARS && e.avatar.indexOf('data:image') === 0) {
        e.avatar = DEFAULT_EXPERT_AVATAR;
        e.avatarTruncated = true;
      }
    });
    return snap;
  }

  function save(state) {
    try {
      var payload = JSON.stringify(prepareStateForStorage(state));
      if (payload.length > STORAGE_WARN_BYTES) {
        console.warn('[AppStore] 本地数据接近上限：', (payload.length / 1024 / 1024).toFixed(2), 'MB');
      }
      localStorage.setItem(STORAGE_KEY, payload);
      return true;
    } catch (e) {
      console.error('[AppStore] 本地存储写入失败', e);
      if (window.ElementPlus && window.ElementPlus.ElMessage) {
        ElementPlus.ElMessage.error('本地存储空间不足，本次改动未能保存。请删除部分任务、资料或重置演示数据后重试。');
      }
      return false;
    }
  }

  let state = load();

  function mapRemoteExpert(e) {
    return {
      id: String(e.profile),
      name: e.displayName || e.profile,
      avatar: e.avatarUrl || DEFAULT_EXPERT_AVATAR,
      description: e.intro || '',
      expertise: e.domains || [],
      category: '工艺制造',
      visibility: 'public',
      status: 'active',
      updatedAt: nowIso()
    };
  }

  function isDetailPayload(e) {
    return e.skillsDetail !== undefined ||
      e.skillsCatalog !== undefined ||
      e.toolsDetail !== undefined ||
      e.toolsCatalog !== undefined ||
      e.memoryMeta !== undefined ||
      e.gateway !== undefined ||
      e.imChannels !== undefined ||
      e.materials !== undefined ||
      e.memories !== undefined ||
      e.permissions !== undefined;
  }

  function mergeExpertDetailMeta(expertId, e, opts) {
    opts = opts || {};
    state.expertDetailMeta = state.expertDetailMeta || {};
    var prev = state.expertDetailMeta[expertId] || {
      skillsDetail: [], skillsCatalog: [], toolsDetail: {}, toolsCatalog: [], memoryMeta: {}, gateway: {}
    };
    if (!isDetailPayload(e)) return;
    if (opts.skipCapabilities) {
      state.expertDetailMeta[expertId] = {
        skillsDetail: prev.skillsDetail || [],
        skillsCatalog: prev.skillsCatalog || [],
        toolsDetail: prev.toolsDetail || {},
        toolsCatalog: prev.toolsCatalog || [],
        memoryMeta: e.memoryMeta !== undefined ? (e.memoryMeta || {}) : (prev.memoryMeta || {}),
        gateway: e.gateway !== undefined ? (e.gateway || {}) : (prev.gateway || {})
      };
      return;
    }
    state.expertDetailMeta[expertId] = {
      skillsDetail: e.skillsDetail !== undefined ? (e.skillsDetail || []) : (prev.skillsDetail || []),
      skillsCatalog: e.skillsCatalog !== undefined ? (e.skillsCatalog || []) : (prev.skillsCatalog || []),
      toolsDetail: e.toolsDetail !== undefined ? (e.toolsDetail || {}) : (prev.toolsDetail || {}),
      toolsCatalog: e.toolsCatalog !== undefined ? (e.toolsCatalog || []) : (prev.toolsCatalog || []),
      memoryMeta: e.memoryMeta !== undefined ? (e.memoryMeta || {}) : (prev.memoryMeta || {}),
      gateway: e.gateway !== undefined ? (e.gateway || {}) : (prev.gateway || {})
    };
  }

  function applySkillsApiResponse(expertId, data) {
    if (!data) return;
    var list = Array.isArray(data.skills)
      ? data.skills
      : (Array.isArray(data.assigned) ? data.assigned : null);
    if (!list) return;
    mergeExpertDetailMeta(expertId, {
      skillsDetail: list,
      skillsCatalog: data.catalog || []
    });
    state.skillBindings[expertId] = list.map(function (s) {
      return normalizeInstalledSkillRecord({
        skillId: s.skillId || s.name || s.id,
        name: s.name,
        description: s.description,
        category: s.category || '',
        enabled: s.enabled !== false,
        useCount: s.useCount || 0,
        patchCount: s.patchCount || 0,
        lastUsedAt: s.lastUsedAt || null,
        provenance: s.provenance || 'bundled'
      });
    }).filter(Boolean);
    persist();
    bumpCapabilityRev(expertId);
    window.dispatchEvent(new CustomEvent('app-store-updated', { detail: { expertId: String(expertId) } }));
  }

  function applyToolsApiResponse(expertId, data) {
    if (!data) return;
    var assignedBlock = Object.assign({}, data.assigned || {});
    var key = String(expertId);
    if (!assignedBlock.mcpServers && state.mcpServers && state.mcpServers[key]) {
      assignedBlock.mcpServers = state.mcpServers[key];
    }
    mergeExpertDetailMeta(expertId, {
      toolsDetail: assignedBlock,
      toolsCatalog: (data.catalog && data.catalog.toolsets) || []
    });
    state.toolBindings[expertId] = (assignedBlock.toolsets || []).map(function (t) {
      var tid = t.toolset || t;
      return {
        toolId: tid,
        toolset: tid,
        label: t.label || '',
        description: t.description || '',
        status: t.configured ? 'configured' : 'unconfigured',
        config: getDefaultToolConfig(tid)
      };
    });
    if (Array.isArray(assignedBlock.mcpServers)) {
      setMcpServersInternal(key, assignedBlock.mcpServers);
    }
    persist();
    bumpCapabilityRev(expertId);
    window.dispatchEvent(new CustomEvent('app-store-updated', { detail: { expertId: String(expertId) } }));
  }

  var capabilityRev = {};

  function getCapabilityRev(expertId) {
    return capabilityRev[String(expertId)] || 0;
  }

  function bumpCapabilityRev(expertId) {
    var key = String(expertId);
    capabilityRev[key] = (capabilityRev[key] || 0) + 1;
    return capabilityRev[key];
  }

  function bindingSkillId(b) {
    if (typeof b === 'string') return String(b).trim();
    return String(b.skillId || b.id || b.canonicalName || b.name || '').trim();
  }

  function bindingToolId(b) {
    if (typeof b === 'string') return String(b).trim();
    return String(b.toolId || b.toolset || '').trim();
  }

  function normalizeSkillIds(bindings) {
    return (bindings || []).map(bindingSkillId).filter(function (id) { return !!id; });
  }

  function normalizeToolIds(bindings) {
    return (bindings || []).map(bindingToolId).filter(function (id) { return !!id; });
  }

  function sidecarPutSkills(expertId, assignedIds) {
    return window.SidecarApi.putExpertSkills(String(expertId), { assigned: assignedIds })
      .then(function (data) {
        if (!data || (!Array.isArray(data.assigned) && !Array.isArray(data.skills))) {
          var err = window.SidecarApi.getLastError && window.SidecarApi.getLastError();
          return Promise.reject(new Error((err && err.message) || '保存技能配置失败'));
        }
        applySkillsApiResponse(String(expertId), data);
        return data;
      });
  }

  function sidecarToggleSkill(expertId, skillId, enabled) {
    if (window.SidecarApi && window.SidecarApi.toggleExpertSkill) {
      return window.SidecarApi.toggleExpertSkill(String(expertId), skillId, enabled)
        .then(function (data) {
          if (data && (Array.isArray(data.skills) || Array.isArray(data.assigned))) {
            applySkillsApiResponse(String(expertId), data);
          }
          return data;
        });
    }
    var enabledIds = (state.skillBindings[expertId] || [])
      .filter(function (b) {
        var id = bindingSkillId(b);
        if (id === skillId) return !!enabled;
        return typeof b === 'string' ? true : b.enabled !== false;
      })
      .map(bindingSkillId)
      .filter(Boolean);
    return sidecarPutSkills(expertId, enabledIds);
  }

  function sidecarPutTools(expertId, assignedIds) {
    return window.SidecarApi.putExpertTools(String(expertId), { assigned: assignedIds })
      .then(function (data) {
        if (!data || !data.assigned || !Array.isArray(data.assigned.toolsets)) {
          var err = window.SidecarApi.getLastError && window.SidecarApi.getLastError();
          return Promise.reject(new Error((err && err.message) || '保存工具配给失败'));
        }
        applyToolsApiResponse(String(expertId), data);
        return data;
      });
  }

  function hydrateExpertFromRemote(e, opts) {
    opts = opts || {};
    var skipCapabilities = !!opts.skipCapabilities;
    var expertId = String(e.profile || e.id);
    if (!expertId) return;
    var detail = isDetailPayload(e);
    ensureExpertDefaults(expertId);
    var personaPatch = e.persona ? {
      coreDutyMd: e.persona.coreDutyMd || e.coreDutyMd || '',
      workflowMd: e.persona.workflowMd || e.workflowMd || '',
      behaviorMd: e.persona.behaviorMd || e.behaviorMd || ''
    } : {
      coreDutyMd: e.coreDutyMd,
      workflowMd: e.workflowMd,
      behaviorMd: e.behaviorMd
    };
    var prevPersona = state.personas[expertId] || {};
    if (detail || e.coreDutyMd !== undefined || e.workflowMd !== undefined || e.behaviorMd !== undefined || e.persona) {
      state.personas[expertId] = {
        coreDutyMd: personaPatch.coreDutyMd != null ? personaPatch.coreDutyMd : (prevPersona.coreDutyMd || ''),
        workflowMd: personaPatch.workflowMd != null ? personaPatch.workflowMd : (prevPersona.workflowMd || ''),
        behaviorMd: personaPatch.behaviorMd != null ? personaPatch.behaviorMd : (prevPersona.behaviorMd || '')
      };
    }
    if (!skipCapabilities) {
      if (detail && e.skillsDetail !== undefined) {
        state.skillBindings[expertId] = ensureFullInstalledSkills(e.skillsDetail.map(function (s) {
          return {
            skillId: s.skillId,
            params: {},
            name: s.name,
            description: s.description,
            category: s.category || '',
            enabled: s.enabled !== false,
            useCount: s.useCount || 0,
            patchCount: s.patchCount || 0,
            lastUsedAt: s.lastUsedAt || null,
            provenance: s.provenance || 'bundled'
          };
        }));
      } else if (DEV_MOCK && Array.isArray(e.skills) && !detail) {
        state.skillBindings[expertId] = ensureFullInstalledSkills(e.skills.map(function (sid) {
          return { skillId: sid, enabled: true, params: getDefaultSkillParams(sid) };
        }));
      } else if (detail && e.skillBindings && e.skillBindings.length) {
        state.skillBindings[expertId] = ensureFullInstalledSkills(e.skillBindings.map(function (b) {
          return {
            skillId: b.skillId,
            enabled: b.enabled !== false,
            params: b.params || {},
            useCount: b.useCount || 0,
            patchCount: b.patchCount || 0,
            lastUsedAt: b.lastUsedAt || null,
            provenance: b.provenance || 'bundled'
          };
        }));
      }
      if (detail && e.toolsDetail !== undefined && Array.isArray(e.toolsDetail.toolsets)) {
        state.toolBindings[expertId] = e.toolsDetail.toolsets.map(function (t) {
          var tid = t.toolset || t;
          return {
            toolId: tid,
            toolset: tid,
            label: t.label || '',
            description: t.description || '',
            globallyDisabled: !!t.globallyDisabled,
            status: t.configured ? 'configured' : 'unconfigured',
            config: getDefaultToolConfig(tid)
          };
        });
      } else if (detail && e.toolsDetail !== undefined) {
        state.toolBindings[expertId] = [];
      } else if (detail && e.toolBindings && e.toolBindings.length) {
        state.toolBindings[expertId] = e.toolBindings.map(function (b) {
          var tid = b.toolset || b.toolId || b;
          return {
            toolId: tid,
            toolset: tid,
            label: b.label || '',
            description: b.description || '',
            status: b.configured ? 'configured' : 'unconfigured',
            config: b.config || getDefaultToolConfig(tid)
          };
        });
      } else if (DEV_MOCK && e.tools && e.tools.length && !detail) {
        state.toolBindings[expertId] = e.tools.map(function (t) {
          if (typeof t === 'string') return { toolset: t, toolId: t, enabled: true };
          var tid = t.toolset || t.toolId || t;
          return Object.assign({ toolId: tid, toolset: tid, enabled: true }, t);
        });
      }
    }
    var expert = state.experts.find(function (x) { return String(x.id) === expertId; });
    if (expert && e.domains) expert.expertise = e.domains;
    if (e.tasks && e.tasks.length) {
      state.tasks = state.tasks.filter(function (t) { return String(t.expertId) !== expertId; });
      e.tasks.forEach(function (t) {
        state.tasks.unshift({
          id: t.id,
          title: t.title,
          type: t.source === 'project' ? 'project' : 'dialogue',
          status: t.status || 'pending',
          expertId: expertId,
          ownerId: 'admin',
          archived: false,
          cwd: t.cwd || DEFAULT_TASK_CWD,
          titleSet: !!t.titleSet,
          artifactCount: t.artifactCount || 0,
          createdAt: t.createdAt || nowIso(),
          updatedAt: t.createdAt || nowIso()
        });
      });
    }
    if (e.memories) {
      state.memories = (state.memories || []).filter(function (m) { return String(m.expertId) !== expertId; });
      e.memories.forEach(function (m) {
        state.memories.push({
          id: m.id,
          expertId: expertId,
          content: m.content,
          category: m.category || 'other',
          source: m.source || 'long_term',
          createdAt: m.createdAt || nowIso()
        });
      });
    }
    if (e.materials) {
      state.workspaceFiles = state.workspaceFiles || {};
      state.workspaceFiles[expertId] = e.materials.map(function (m) {
        return {
          id: m.id,
          name: m.name,
          size: m.size,
          type: m.mimeType || 'file',
          kind: 'material',
          parentId: null,
          createdAt: m.createdAt || nowIso()
        };
      });
    }
    if (e.artifacts) {
      state.taskArtifacts = state.taskArtifacts || {};
      e.artifacts.forEach(function (a) {
        if (!state.taskArtifacts[a.taskId]) state.taskArtifacts[a.taskId] = [];
        var exists = state.taskArtifacts[a.taskId].some(function (x) { return x.id === a.id; });
        if (!exists) {
          state.taskArtifacts[a.taskId].push({
            id: a.id,
            taskId: a.taskId,
            title: a.title,
            content: a.content,
            type: a.type || 'text',
            createdAt: a.createdAt || nowIso()
          });
        }
      });
    }
    if (e.imChannels) {
      state.imChannels = state.imChannels || {};
      state.imChannels[expertId] = e.imChannels.map(function (c) {
        return Object.assign({ subscriptions: [] }, c);
      });
    }
    if (e.permissions) {
      state.permissions = state.permissions || {};
      state.permissions[expertId] = e.permissions.map(function (p) {
        return {
          id: p.id,
          label: p.label,
          permission: p.permission,
          subjectType: p.subjectType,
          subjectId: p.subjectId
        };
      });
    }
    mergeExpertDetailMeta(expertId, e, { skipCapabilities: skipCapabilities });
  }

  function applyExpertDetailRemote(detail, opts) {
    opts = opts || {};
    if (!detail) return null;
    var mapped = mapRemoteExpert(detail);
    var idx = state.experts.findIndex(function (e) { return String(e.id) === mapped.id; });
    if (idx >= 0) state.experts[idx] = Object.assign({}, state.experts[idx], mapped);
    else state.experts.push(mapped);
    hydrateExpertFromRemote(detail, opts);
    persist();
    window.dispatchEvent(new CustomEvent('app-store-updated', { detail: { expertId: mapped.id } }));
    return mapped;
  }

  function ensureExpertDefaults(expertId) {
    if (!state.personas[expertId]) {
      state.personas[expertId] = { coreDutyMd: '', workflowMd: '', behaviorMd: '' };
    }
    if (!state.skillBindings[expertId]) state.skillBindings[expertId] = [];
    if (!state.toolBindings[expertId]) state.toolBindings[expertId] = [];
    if (!state.mcpServers) state.mcpServers = {};
    if (state.mcpServers[expertId] === undefined) state.mcpServers[expertId] = [];
  }

  async function syncExpertsFromSidecar() {
    if (DEV_MOCK) return;
    if (!window.SidecarApi || !window.SidecarApi.listExperts) return;
    state.skillBindings = {};
    state.toolBindings = {};
    state.mcpServers = {};
    state.expertDetailMeta = {};
    if (window.SidecarApi.provisionBundledProfiles) {
      await window.SidecarApi.provisionBundledProfiles();
    }
    if (window.SidecarApi.syncProfiles) {
      await window.SidecarApi.syncProfiles();
    }
    var remote = await window.SidecarApi.listExperts();
    if (remote === null) {
      sidecarAvailable = false;
      window.dispatchEvent(new CustomEvent('sidecar-status', {
        detail: { ok: false, error: window.SidecarApi.getLastError && window.SidecarApi.getLastError() }
      }));
      return;
    }
    sidecarAvailable = true;
    window.dispatchEvent(new CustomEvent('sidecar-status', { detail: { ok: true } }));
    var remoteIds = {};
    var mapped = remote.map(function (e) {
      remoteIds[String(e.profile)] = true;
      return mapRemoteExpert(e);
    });
    var localOnly = state.experts.filter(function (e) {
      var id = String(e.id);
      if (/^\d+$/.test(id)) return false;
      if (/^id_/.test(id)) return false;
      return !remoteIds[id];
    });
    state.experts = mapped.length > 0 ? mapped : mapped.concat(localOnly);
    remote.forEach(function (e) {
      hydrateExpertFromRemote(e, { skipCapabilities: true });
    });
    state.experts.forEach(function (e) { ensureExpertDefaults(e.id); });
    persist();
    window.dispatchEvent(new CustomEvent('app-store-updated'));
  }

  function persist() {
    return save(state);
  }

  function migrateExpertRoleNames() {
    var seedMap = {};
    (window.EXPERTS_DATA || []).forEach(function (s) {
      seedMap[String(s.id)] = s.name;
    });
    var updated = false;
    state.experts.forEach(function (e) {
      if (seedMap[e.id] && e.name !== seedMap[e.id]) {
        e.name = seedMap[e.id];
        updated = true;
      } else if (e.position && e.name !== e.position) {
        e.name = e.position;
        updated = true;
      }
      if (e.position) {
        e.position = '';
        updated = true;
      }
    });
    if (updated) persist();
  }

  var PROVIDER_DEFAULTS = {
    openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
    anthropic: { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1' },
    deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
    qwen: { name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' }
  };

  function buildModelConfigFromLegacy(model, provider) {
    if (!model && !provider) return null;
    var pid = provider || 'openai';
    var defaults = PROVIDER_DEFAULTS[pid] || { name: pid, baseUrl: '' };
    return {
      providerSlug: pid,
      providerName: defaults.name,
      baseUrl: defaults.baseUrl,
      apiKey: '',
      model: model || ''
    };
  }

  function slugifyProvider(name) {
    var s = String(name || '').toLowerCase().trim();
    s = s.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
    return s || 'custom';
  }

  function hostFromUrl(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  }

  function resolveProviderSlug(providerName, baseUrl) {
    if (providerName && providerName.trim()) return slugifyProvider(providerName);
    if (baseUrl) {
      var host = hostFromUrl(baseUrl);
      if (host) return slugifyProvider(host);
    }
    return 'custom';
  }

  function seedExpertToStateExpert(seed) {
    var modelConfig = seed.modelConfig || buildModelConfigFromLegacy(seed.model, seed.provider);
    return {
      id: String(seed.id),
      slug: seed.slug || String(seed.id),
      name: seed.name,
      avatar: seed.avatar,
      description: seed.description,
      expertise: (seed.expertise || seed.tags || []).slice(0, 10),
      tags: (seed.tags || seed.expertise || []).slice(0, 10),
      category: seed.category,
      model: seed.model || (modelConfig ? modelConfig.model : 'gpt-4o'),
      provider: seed.provider || (modelConfig ? modelConfig.providerSlug : 'openai'),
      modelConfig: modelConfig,
      workspaceRoot: '~/.hermes/profiles/' + (seed.slug || seed.id) + '/workspace',
      visibility: 'public',
      status: 'active',
      updatedAt: seed.updatedAt || nowIso()
    };
  }

  function migrateSeedExpertProfiles() {
    var seeds = window.EXPERTS_DATA || [];
    var seedById = {};
    var seedByName = {};
    seeds.forEach(function (s) {
      seedById[String(s.id)] = s;
      seedByName[String(s.name)] = s;
    });
    var matchedSeedIds = {};
    var updated = false;
    state.experts.forEach(function (e) {
      var seed = seedByName[String(e.name)] || seedById[String(e.id)];
      if (!seed) return;
      matchedSeedIds[String(seed.id)] = true;
      if (String(e.id) !== String(seed.id) && /^\d+$/.test(String(e.id))) {
        e.id = String(seed.id);
        updated = true;
      }
      if (seed.name && e.name !== seed.name) {
        e.name = seed.name;
        updated = true;
      }
      if (seed.avatar && e.avatar !== seed.avatar) {
        e.avatar = seed.avatar;
        updated = true;
      }
      var nextExpertise = (seed.expertise || []).slice(0, 3);
      if (JSON.stringify(e.expertise || []) !== JSON.stringify(nextExpertise)) {
        e.expertise = nextExpertise.slice();
        updated = true;
      }
      if (seed.description && e.description !== seed.description) {
        e.description = seed.description;
        updated = true;
      }
      if (seed.category && e.category !== seed.category) {
        e.category = seed.category;
        updated = true;
      }
      if (seed.slug && !e.slug) {
        e.slug = seed.slug;
        updated = true;
      }
      if (seed.model && !e.model) {
        e.model = seed.model;
        updated = true;
      }
      if (seed.provider && !e.provider) {
        e.provider = seed.provider;
        updated = true;
      }
      if (!e.modelConfig) {
        e.modelConfig = seed.modelConfig || buildModelConfigFromLegacy(e.model, e.provider);
        if (e.modelConfig) updated = true;
      }
      if (seed.tags && !e.tags) {
        e.tags = seed.tags.slice();
        updated = true;
      }
      if (!e.workspaceRoot) {
        e.workspaceRoot = '~/.hermes/profiles/' + (e.slug || e.id) + '/workspace';
        updated = true;
      }
    });
    seeds.forEach(function (seed) {
      var seedId = String(seed.id);
      var exists = matchedSeedIds[seedId] || state.experts.some(function (e) {
        return String(e.id) === seedId || String(e.name) === String(seed.name);
      });
      if (!exists) {
        state.experts.push(seedExpertToStateExpert(seed));
        updated = true;
      }
    });
    if (updated) persist();
  }

  function seedIfEmpty() {
    if (state.experts.length > 0) return;

    const seedExperts = (window.EXPERTS_DATA || []).map(function (e) {
      var mc = e.modelConfig || buildModelConfigFromLegacy(e.model, e.provider);
      return {
        id: String(e.id),
        slug: e.slug || String(e.id),
        name: e.name,
        avatar: e.avatar,
        description: e.description,
        expertise: (e.expertise || e.tags || []).slice(0, 10),
        tags: (e.tags || e.expertise || []).slice(0, 10),
        category: e.category,
        model: e.model || (mc ? mc.model : 'gpt-4o'),
        provider: e.provider || (mc ? mc.providerSlug : 'openai'),
        modelConfig: mc,
        workspaceRoot: '~/.hermes/profiles/' + (e.slug || e.id) + '/workspace',
        visibility: 'public',
        status: 'active',
        updatedAt: e.updatedAt || nowIso()
      };
    });

    state.experts = seedExperts;
    state.favorites = seedExperts.filter(function (_, i) {
      return window.EXPERTS_DATA[i] && window.EXPERTS_DATA[i].favorited;
    }).map(function (e) { return e.id; });

    seedExperts.forEach(function (e, idx) {
      state.personas[e.id] = {
        coreDutyMd: '## 核心职责\n\n负责「' + e.name + '」职责范围内的专业咨询与方案输出。',
        workflowMd: '## 工作流程\n\n1. 理解需求\n2. 收集数据\n3. 分析诊断\n4. 输出建议',
        behaviorMd: '## 行为准则\n\n- 基于事实与数据\n- 结论清晰可执行\n- 主动确认关键假设'
      };
      state.skillBindings[e.id] = seedInstalledSkills({
        withDemoUsage: true,
        demoDisabled: idx === 0 ? ['apple-notes'] : []
      });
      // platform_toolsets.cli opt-in：演示默认开启 browser；web 仍缺密钥便于展示红点
      state.toolBindings[e.id] = idx === 0 ? ['browser', 'web'] : ['browser'];
      if (!state.mcpServers) state.mcpServers = {};
      state.mcpServers[e.id] = demoMcpServersForSeed(idx);
      syncMcpServersToDetailMeta(e.id, state.mcpServers[e.id]);
      state.memories.push({
        id: uid(),
        expertId: e.id,
        content: '用户偏好：优先关注可落地的短期改进措施。',
        category: 'user_preference',
        scope: 'user',
        source: 'manual',
        createdAt: nowIso()
      });
    });

    var p1 = {
      id: uid(),
      name: '12寸产线良率提升项目',
      icon: '🏭',
      description: '针对近期良率波动，组织工艺、质量、设备专家联合攻关。',
      visibility: 'public',
      status: 'active',
      orchestratorProfileId: null,
      defaultAssignee: null,
      autoDecomposeEnabled: true,
      updatedAt: nowIso()
    };
    var p2 = {
      id: uid(),
      name: '供应链数字化规划',
      icon: '📊',
      description: '构建多工厂物料计划数字孪生模型，提升交付准时率。',
      visibility: 'public',
      status: 'active',
      orchestratorProfileId: null,
      defaultAssignee: null,
      autoDecomposeEnabled: true,
      updatedAt: nowIso()
    };
    state.projects = [p1, p2];

    if (seedExperts[0] && seedExperts[2] && seedExperts[4]) {
      state.projectMembers = [
        { id: uid(), projectId: p1.id, expertId: seedExperts[0].id, role: 'lead', progress: 80, progressSummary: '已完成根因分析，待验证', joinedAt: nowIso() },
        { id: uid(), projectId: p1.id, expertId: seedExperts[4].id, role: 'member', progress: 40, progressSummary: 'SPC 报告进行中', joinedAt: nowIso() },
        { id: uid(), projectId: p1.id, expertId: seedExperts[2].id, role: 'member', progress: 0, progressSummary: '待开始设备关联分析', joinedAt: nowIso() },
        { id: uid(), projectId: p2.id, expertId: seedExperts[3].id, role: 'lead', progress: 55, progressSummary: '需求预测模型已初版', joinedAt: nowIso() },
        { id: uid(), projectId: p2.id, expertId: seedExperts[5].id, role: 'member', progress: 30, progressSummary: '数据治理规范起草中', joinedAt: nowIso() }
      ];
      p1.orchestratorProfileId = seedExperts[0].id;
      p2.orchestratorProfileId = seedExperts[3].id;
      state.projectOutputs = [
        { id: uid(), projectId: p1.id, expertId: seedExperts[0].id, title: '良率波动根因分析报告 v1', content: '主要根因：etch 区 3 号 chamber 压力偏差 +12%。建议参数回标并加严 SPC 监控。', createdAt: nowIso() }
      ];
      state.projectTasks = defaultProjectTasksFor(p1).concat(defaultProjectTasksFor(p2));
      state.projectFiles = defaultProjectFilesFor(p1).concat(defaultProjectFilesFor(p2));
      if (!state.projectEvents) state.projectEvents = [];
      defaultYieldProjectEventsFor(p1, state.projectTasks.filter(function (t) { return sameId(t.projectId, p1.id); }))
        .forEach(function (e) { state.projectEvents.push(e); });
      defaultSupplyProjectEventsFor(p2, state.projectTasks.filter(function (t) { return sameId(t.projectId, p2.id); }))
        .forEach(function (e) { state.projectEvents.push(e); });
      state.projectTaskSchemaVersion = 6;
    }

    seedExperts.forEach(function (e) {
      if (getDemoDialogueTaskBundle(e.id).length) ensureDemoDialogueTasks(e.id);
    });

    persist();
  }

  /** 已有本地数据时补种 MCP 示例（仅 DEV_MOCK；种子版本 bump 时刷新有演示配置的专家） */
  function ensureMcpDemoSeed() {
    if (!DEV_MOCK) return;
    if (!state.mcpServers) state.mcpServers = {};
    var forceReseed = state.mcpDemoSeedVersion !== MCP_DEMO_SEED_VERSION;
    var updated = false;
    state.experts.forEach(function (e, idx) {
      var key = String(e.id);
      var existing = state.mcpServers[key];
      var seeded = demoMcpServersForSeed(idx);
      var isMissing = existing === undefined;
      var isEmpty = Array.isArray(existing) && existing.length === 0;
      // 有演示配置：版本 bump 时覆盖；否则仅补缺失/空列表
      if (seeded.length) {
        if (!forceReseed && !isMissing && !isEmpty) return;
        state.mcpServers[key] = seeded;
        syncMcpServersToDetailMeta(key, seeded);
        updated = true;
        return;
      }
      if (isMissing) {
        state.mcpServers[key] = [];
        syncMcpServersToDetailMeta(key, []);
        updated = true;
      }
    });
    if (state.mcpDemoSeedVersion !== MCP_DEMO_SEED_VERSION) {
      state.mcpDemoSeedVersion = MCP_DEMO_SEED_VERSION;
      updated = true;
    }
    if (updated) persist();
  }

  function migrateProjectsVisibility() {
    var updated = false;
    state.projects.forEach(function (p) {
      if (p.visibility === 'personal') {
        p.visibility = 'public';
        updated = true;
      }
    });
    if (updated) persist();
  }

  function migrateProjectIds() {
    var updated = false;
    state.projects.forEach(function (p) {
      if (!p.id) {
        p.id = uid();
        updated = true;
      }
    });
    if (updated) persist();
  }

  function seedDemoProjectsIfEmpty() {
    if (!DEV_MOCK || state.projects.length > 0 || state.experts.length === 0) return;
    var seedExperts = state.experts;
    var p1 = {
      id: uid(),
      name: '12寸产线良率提升项目',
      icon: '🏭',
      description: '针对近期良率波动，组织工艺、质量、设备专家联合攻关。',
      visibility: 'public',
      status: 'active',
      orchestratorProfileId: null,
      defaultAssignee: null,
      autoDecomposeEnabled: true,
      updatedAt: nowIso()
    };
    var p2 = {
      id: uid(),
      name: '供应链数字化规划',
      icon: '📊',
      description: '构建多工厂物料计划数字孪生模型，提升交付准时率。',
      visibility: 'public',
      status: 'active',
      orchestratorProfileId: null,
      defaultAssignee: null,
      autoDecomposeEnabled: true,
      updatedAt: nowIso()
    };
    state.projects = [p1, p2];
    if (seedExperts[0] && seedExperts[2] && seedExperts[4]) {
      state.projectMembers = [
        { id: uid(), projectId: p1.id, expertId: seedExperts[0].id, role: 'lead', progress: 80, progressSummary: '已完成根因分析，待验证', joinedAt: nowIso() },
        { id: uid(), projectId: p1.id, expertId: seedExperts[4].id, role: 'member', progress: 40, progressSummary: 'SPC 报告进行中', joinedAt: nowIso() },
        { id: uid(), projectId: p1.id, expertId: seedExperts[2].id, role: 'member', progress: 0, progressSummary: '待开始设备关联分析', joinedAt: nowIso() },
        { id: uid(), projectId: p2.id, expertId: seedExperts[3].id, role: 'lead', progress: 55, progressSummary: '需求预测模型已初版', joinedAt: nowIso() },
        { id: uid(), projectId: p2.id, expertId: seedExperts[5].id, role: 'member', progress: 30, progressSummary: '数据治理规范起草中', joinedAt: nowIso() }
      ];
      p1.orchestratorProfileId = seedExperts[0].id;
      p2.orchestratorProfileId = seedExperts[3].id;
      state.projectOutputs = [
        { id: uid(), projectId: p1.id, expertId: seedExperts[0].id, title: '良率波动根因分析报告 v1', content: '主要根因：etch 区 3 号 chamber 压力偏差 +12%。建议参数回标并加严 SPC 监控。', createdAt: nowIso() }
      ];
      state.projectTasks = defaultProjectTasksFor(p1).concat(defaultProjectTasksFor(p2));
      state.projectFiles = defaultProjectFilesFor(p1).concat(defaultProjectFilesFor(p2));
      if (!state.projectEvents) state.projectEvents = [];
      defaultYieldProjectEventsFor(p1, state.projectTasks.filter(function (t) { return sameId(t.projectId, p1.id); }))
        .forEach(function (e) { state.projectEvents.push(e); });
      defaultSupplyProjectEventsFor(p2, state.projectTasks.filter(function (t) { return sameId(t.projectId, p2.id); }))
        .forEach(function (e) { state.projectEvents.push(e); });
      state.projectTaskSchemaVersion = 6;
    }
    persist();
  }

  function projectTaskSeed(p, fields) {
    var now = nowIso();
    return Object.assign({
      id: uid(),
      projectId: p.id,
      title: '',
      status: 'todo',
      expertId: null,
      sortOrder: 0,
      priority: 'medium',
      parentTaskId: null,
      isTriage: false,
      commentCount: 0,
      body: '',
      latestSummary: '',
      blockedReason: '',
      blockKind: '',
      consecutiveFailures: 0,
      lastFailureError: '',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      startedAt: null,
      currentRunId: null,
      lastHeartbeatAt: null,
      workspaceKind: '',
      workspacePath: '',
      runs: [],
      taskEvents: [],
      diagnostics: [],
      comments: [],
      skills: []
    }, fields || {});
  }

  function defaultYieldProjectTasksFor(p, members) {
    var lead = members[0];
    var device = members.find(function (m) { return m.expertId !== lead.expertId; }) || members[1];
    var quality = members.find(function (m) {
      return m.expertId !== lead.expertId && m.expertId !== device.expertId;
    }) || members[0];

    var goalActive = uid();
    var goalDone = uid();
    var goalTriage = uid();
    var tReadySpc = uid();
    var tDoneRoot = uid();
    var tRunningDevice = uid();
    var tRunningFdc = uid();

    return [
      projectTaskSeed(p, {
        id: goalActive,
        title: '针对近期良率波动组织专家排查',
        status: 'todo',
        isTriage: true,
        expertId: lead.expertId,
        sortOrder: -30,
        priority: 'high',
        body: '针对 etch 区近期良率下滑，组织工艺、质量、设备专家联合排查根因并输出整改方案。',
        createdAt: minutesAgoIso(280),
        updatedAt: minutesAgoIso(15)
      }),
      projectTaskSeed(p, {
        id: goalDone,
        title: '12寸产线工艺窗口复盘',
        status: 'done',
        isTriage: true,
        expertId: lead.expertId,
        sortOrder: -20,
        priority: 'medium',
        body: '复盘 12 寸产线关键工序工艺窗口设定，识别偏差来源并输出优化建议。',
        createdAt: daysAgoIso(1, 10, 8),
        updatedAt: daysAgoIso(1, 16, 30)
      }),
      projectTaskSeed(p, {
        id: goalTriage,
        title: 'etch 区设备健康度评估',
        status: 'triage',
        isTriage: true,
        expertId: device.expertId,
        sortOrder: -10,
        priority: 'medium',
        body: '评估 etch 区关键设备健康状态，识别潜在故障模式与良率关联风险。',
        createdAt: daysAgoIso(3, 14, 20),
        updatedAt: daysAgoIso(3, 14, 20)
      }),

      projectTaskSeed(p, {
        id: tReadySpc,
        title: 'SPC 数据分析',
        status: 'ready',
        expertId: quality.expertId,
        parentTaskId: goalActive,
        sortOrder: 0,
        priority: 'high',
        body: '排查 etch 区近 4 周 SPC 异常点，更新缺陷 pareto。',
        latestSummary: '已锁定 etch-3 连续 3 点超 UCL，待生成更新版缺陷 pareto。',
        commentCount: 3,
        workspaceKind: 'git',
        workspacePath: '/workspace/yield/spc-analysis',
        skills: ['spc-analysis', 'pareto-chart'],
        taskEvents: [
          { id: uid(), kind: 'assigned', label: '分配负责人', author: lead.expertId, payload: { assignee: quality.expertId }, createdAt: minutesAgoIso(260) },
          { id: uid(), kind: 'created', label: '创建', author: lead.expertId, payload: {}, createdAt: minutesAgoIso(260) }
        ],
        comments: [
          { id: uid(), author: '工艺专家', expertId: lead.expertId, body: 'etch-3 近 4 周异常点较多，建议优先排查。', createdAt: minutesAgoIso(200) },
          { id: uid(), author: '质量专家', expertId: quality.expertId, body: '收到，已开始拉取 SPC 数据。', createdAt: minutesAgoIso(180) }
        ],
        createdAt: minutesAgoIso(260),
        updatedAt: minutesAgoIso(40)
      }),
      projectTaskSeed(p, {
        id: tDoneRoot,
        title: '良率根因分析',
        status: 'done',
        expertId: lead.expertId,
        parentTaskId: goalActive,
        sortOrder: 1,
        priority: 'high',
        body: '撰写良率波动根因分析报告，输出参数回标建议。',
        latestSummary: '主要根因：etch 区 3 号 chamber 压力偏差 +12%。',
        commentCount: 5,
        result: '主要根因：etch 区 3 号 chamber 压力偏差 +12%。建议参数回标并加严 SPC 监控。',
        completedAt: minutesAgoIso(90),
        startedAt: minutesAgoIso(160),
        workspaceKind: 'git',
        workspacePath: '/workspace/yield/root-cause',
        skills: ['root-cause-analysis', 'report-writing'],
        runs: [
          {
            id: 'run-1', profile: lead.expertId, outcome: 'completed', status: 'completed',
            startedAt: minutesAgoIso(160), endedAt: minutesAgoIso(90),
            summary: '完成根因分析报告，确认 etch-3 chamber 压力偏差 +12% 为主要根因。', error: '', metadata: { reportPages: 8, chartsGenerated: 5 }
          }
        ],
        taskEvents: [
          { id: uid(), kind: 'completed', label: '完成', author: lead.expertId, payload: { result: '主要根因已确认' }, createdAt: minutesAgoIso(90) },
          { id: uid(), kind: 'spawned', label: '启动', author: lead.expertId, payload: { assignee: lead.expertId }, createdAt: minutesAgoIso(160) },
          { id: uid(), kind: 'created', label: '创建', author: lead.expertId, payload: {}, createdAt: minutesAgoIso(250) }
        ],
        diagnostics: [],
        comments: [
          { id: uid(), author: '质量专家', expertId: quality.expertId, body: '建议将 SPC 监控窗口从 4 周扩展到 8 周以覆盖完整周期。', createdAt: minutesAgoIso(100) },
          { id: uid(), author: '设备运维专家', expertId: device.expertId, body: 'PM 记录显示该 chamber 上月有过维护，可能与偏差有关。', createdAt: minutesAgoIso(120) }
        ],
        createdAt: minutesAgoIso(250),
        updatedAt: minutesAgoIso(90)
      }),
      projectTaskSeed(p, {
        id: tRunningDevice,
        title: '设备关联分析',
        status: 'running',
        expertId: device.expertId,
        parentTaskId: goalActive,
        sortOrder: 2,
        priority: 'medium',
        body: '交叉验证 chamber PM 记录与良率关联。',
        latestSummary: '正在从设备管理系统导出近 3 个月 PM 记录。',
        commentCount: 2,
        startedAt: minutesAgoIso(35),
        currentRunId: 'run-2',
        lastHeartbeatAt: minutesAgoIso(2),
        workspaceKind: 'git',
        workspacePath: '/workspace/yield/device-analysis',
        skills: ['data-query', 'correlation-analysis'],
        runs: [
          {
            id: 'run-2', profile: device.expertId, outcome: 'running', status: 'running',
            startedAt: minutesAgoIso(35), endedAt: null,
            summary: '正在从设备管理系统导出近 3 个月 PM 记录。', error: '', metadata: null
          },
          {
            id: 'run-1', profile: device.expertId, outcome: 'timed_out', status: 'timed_out',
            startedAt: minutesAgoIso(120), endedAt: minutesAgoIso(110),
            summary: '首次尝试拉取 PM 记录，因连接超时中断。', error: 'ConnectionTimeout: EMS API timeout after 600s', metadata: { retries: 1 }
          }
        ],
        taskEvents: [
          { id: uid(), kind: 'spawned', label: '启动', author: device.expertId, payload: { assignee: device.expertId }, createdAt: minutesAgoIso(35) },
          { id: uid(), kind: 'created', label: '创建', author: lead.expertId, payload: {}, createdAt: minutesAgoIso(240) }
        ],
        diagnostics: [],
        comments: [
          { id: uid(), author: '工艺专家', expertId: lead.expertId, body: '建议同步检查冷却系统流量数据，可能与 PM 周期相关。', createdAt: minutesAgoIso(30) },
          { id: uid(), author: '设备运维专家', expertId: device.expertId, body: '收到，已加入数据拉取范围。', createdAt: minutesAgoIso(25) }
        ],
        createdAt: minutesAgoIso(240),
        updatedAt: minutesAgoIso(20)
      }),
      projectTaskSeed(p, {
        title: '缺陷 pareto 更新',
        status: 'todo',
        expertId: quality.expertId,
        parentTaskId: goalActive,
        sortOrder: 3,
        priority: 'low',
        body: '基于最新 SPC 数据更新缺陷 pareto 排名。',
        createdAt: minutesAgoIso(230),
        updatedAt: minutesAgoIso(120)
      }),
      projectTaskSeed(p, {
        title: '颗粒污染 Top3 归因',
        status: 'todo',
        expertId: quality.expertId,
        parentTaskId: goalActive,
        sortOrder: 4,
        priority: 'medium',
        body: '对 Top3 颗粒污染缺陷做归因分析，输出临时控制措施。',
        commentCount: 1,
        createdAt: minutesAgoIso(220),
        updatedAt: minutesAgoIso(100)
      }),

      projectTaskSeed(p, {
        title: '工艺窗口参数采集',
        status: 'done',
        expertId: lead.expertId,
        parentTaskId: goalDone,
        sortOrder: 10,
        priority: 'medium',
        body: '采集 etch / CMP / 光刻关键工序工艺窗口参数。',
        latestSummary: '已完成 8 条关键工序窗口参数采集。',
        createdAt: daysAgoIso(1, 10, 30),
        updatedAt: daysAgoIso(1, 12, 0)
      }),
      projectTaskSeed(p, {
        title: '窗口偏差分析报告',
        status: 'done',
        expertId: lead.expertId,
        parentTaskId: goalDone,
        sortOrder: 11,
        priority: 'medium',
        body: '分析各工序窗口偏差对良率的影响权重。',
        latestSummary: 'etch 窗口偏差贡献度最高（42%）。',
        createdAt: daysAgoIso(1, 12, 15),
        updatedAt: daysAgoIso(1, 14, 20)
      }),
      projectTaskSeed(p, {
        title: '加严监控规则制定',
        status: 'done',
        expertId: quality.expertId,
        parentTaskId: goalDone,
        sortOrder: 12,
        priority: 'medium',
        body: '针对偏差较大的工序制定加严 SPC 监控规则。',
        createdAt: daysAgoIso(1, 14, 30),
        updatedAt: daysAgoIso(1, 15, 45)
      }),
      projectTaskSeed(p, {
        title: '复盘纪要输出',
        status: 'done',
        expertId: lead.expertId,
        parentTaskId: goalDone,
        sortOrder: 13,
        priority: 'low',
        body: '汇总工艺窗口复盘结论，输出纪要并归档。',
        createdAt: daysAgoIso(1, 15, 50),
        updatedAt: daysAgoIso(1, 16, 30)
      }),

      projectTaskSeed(p, {
        title: 'chamber 参数漂移复盘',
        status: 'triage',
        expertId: lead.expertId,
        sortOrder: 20,
        priority: 'high',
        body: '反复阻塞后需重新拆解，梳理参数漂移与良率波动的关联假设。',
        latestSummary: '反复 block/unblock 已达上限，需协调专家重新拆解。',
        blockedReason: '反复阻塞已达上限，需重新拆解',
        createdAt: minutesAgoIso(180),
        updatedAt: minutesAgoIso(60)
      }),
      projectTaskSeed(p, {
        title: '下周 SPC 复测计划',
        status: 'scheduled',
        expertId: quality.expertId,
        sortOrder: 21,
        priority: 'medium',
        body: '参数回标后安排下周 SPC 复测，验证良率恢复情况。',
        createdAt: minutesAgoIso(150),
        updatedAt: minutesAgoIso(150)
      }),
      projectTaskSeed(p, {
        title: '冷却系统关联验证',
        status: 'todo',
        expertId: device.expertId,
        parentTaskId: tRunningDevice,
        sortOrder: 22,
        priority: 'medium',
        body: '待设备关联分析完成后，验证冷却系统与温度漂移的关联性。',
        commentCount: 1,
        createdAt: minutesAgoIso(140),
        updatedAt: minutesAgoIso(80)
      }),
      projectTaskSeed(p, {
        title: 'etch 区清洁周期加严',
        status: 'ready',
        expertId: quality.expertId,
        sortOrder: 23,
        priority: 'high',
        body: '根据颗粒污染归因结果，制定 etch 区清洁周期加严方案。',
        latestSummary: '方案草案已完成，待调度执行。',
        createdAt: minutesAgoIso(130),
        updatedAt: minutesAgoIso(35)
      }),
      projectTaskSeed(p, {
        title: 'CMP 区良率对标分析',
        status: 'todo',
        expertId: lead.expertId,
        sortOrder: 24,
        priority: 'medium',
        body: '对比 CMP 区近 4 周良率与标杆线差异，识别改善空间。',
        createdAt: minutesAgoIso(120),
        updatedAt: minutesAgoIso(120)
      }),
      projectTaskSeed(p, {
        id: tRunningFdc,
        title: 'FDC 告警规则梳理',
        status: 'running',
        expertId: device.expertId,
        sortOrder: 25,
        priority: 'medium',
        body: '梳理 etch 区 FDC 告警规则，识别与良率波动相关的异常模式。',
        latestSummary: '已梳理 23 条告警规则，正在交叉验证命中率。',
        commentCount: 2,
        createdAt: minutesAgoIso(110),
        updatedAt: minutesAgoIso(10)
      }),
      projectTaskSeed(p, {
        title: '工艺参数回标方案',
        status: 'review',
        expertId: lead.expertId,
        sortOrder: 26,
        priority: 'high',
        body: '输出 etch 区 3 号 chamber 参数回标方案，提交系统自动评审。',
        latestSummary: 'PR 已提交，系统正在自动评审中。',
        commentCount: 2,
        createdAt: minutesAgoIso(100),
        updatedAt: minutesAgoIso(25)
      }),
      projectTaskSeed(p, {
        title: 'MES 数据接口对接',
        status: 'blocked',
        expertId: device.expertId,
        sortOrder: 27,
        priority: 'urgent',
        body: '对接 MES 良率原始数据接口，拉取近 4 周各站点数据。',
        latestSummary: 'MES API 权限待 IT 开通，无法继续拉取数据。',
        blockedReason: 'MES API 权限待 IT 开通，无法继续拉取数据。',
        blockKind: 'capability',
        consecutiveFailures: 2,
        lastFailureError: 'Permission denied: MES API access not authorized for current profile',
        startedAt: minutesAgoIso(120),
        workspaceKind: 'git',
        workspacePath: '/workspace/yield/mes-integration',
        skills: ['data-query', 'api-integration'],
        runs: [
          {
            id: 'run-2', profile: device.expertId, outcome: 'blocked', status: 'blocked',
            startedAt: minutesAgoIso(60), endedAt: minutesAgoIso(58),
            summary: 'MES API 权限校验失败，需 IT 开通访问权限。', error: 'Permission denied: MES API access not authorized for current profile', metadata: { attempts: 2 }
          },
          {
            id: 'run-1', profile: device.expertId, outcome: 'crashed', status: 'crashed',
            startedAt: minutesAgoIso(120), endedAt: minutesAgoIso(115),
            summary: '首次连接 MES API 时认证失败。', error: 'AuthError: invalid token', metadata: null
          }
        ],
        taskEvents: [
          { id: uid(), kind: 'blocked', label: '阻塞', author: device.expertId, payload: { reason: 'MES API 权限待 IT 开通', block_kind: 'capability' }, createdAt: minutesAgoIso(30) },
          { id: uid(), kind: 'spawned', label: '启动', author: device.expertId, payload: { assignee: device.expertId }, createdAt: minutesAgoIso(120) },
          { id: uid(), kind: 'created', label: '创建', author: lead.expertId, payload: {}, createdAt: minutesAgoIso(200) }
        ],
        diagnostics: [
          { title: 'Agent 连续失败 2 次：能力/权限不足', suggestion: '建议转交给其他专家或联系 IT 开通 MES API 权限', kind: 'capability', severity: 'warn' }
        ],
        comments: [
          { id: uid(), author: '工艺专家', expertId: lead.expertId, body: 'IT 工单已提交，预计 2 小时内开通。', createdAt: minutesAgoIso(20) },
          { id: uid(), author: '设备运维专家', expertId: device.expertId, body: '已重试两次均失败，等待权限开通后重启。', createdAt: minutesAgoIso(25) }
        ],
        commentCount: 4,
        createdAt: minutesAgoIso(200),
        updatedAt: minutesAgoIso(30)
      }),
      projectTaskSeed(p, {
        title: '光刻 overlay 偏差复核',
        status: 'blocked',
        expertId: lead.expertId,
        sortOrder: 28,
        priority: 'high',
        body: '复核光刻工序 overlay 偏差数据，确认是否影响近期良率波动。',
        latestSummary: '量测设备校准证书过期，需等待计量部门更新。',
        blockedReason: '量测设备校准证书过期',
        commentCount: 1,
        createdAt: minutesAgoIso(90),
        updatedAt: minutesAgoIso(45)
      }),
      projectTaskSeed(p, {
        title: '站会纪要整理',
        status: 'done',
        expertId: lead.expertId,
        sortOrder: 29,
        priority: 'low',
        body: '整理本周良率攻关站会纪要，同步各专家进展与下周计划。',
        latestSummary: '纪要已发布至项目群组。',
        createdAt: daysAgoIso(0, 9, 30),
        updatedAt: daysAgoIso(0, 10, 0)
      }),
      projectTaskSeed(p, {
        title: '初期数据摸底',
        status: 'archived',
        expertId: quality.expertId,
        sortOrder: 30,
        priority: 'low',
        body: '项目启动初期的数据摸底与现状梳理，已归档。',
        latestSummary: '已完成各站点良率基线梳理。',
        createdAt: daysAgoIso(7, 9, 0),
        updatedAt: daysAgoIso(6, 17, 0)
      }),
      projectTaskSeed(p, {
        title: '立项背景调研',
        status: 'archived',
        expertId: lead.expertId,
        sortOrder: 31,
        priority: 'low',
        body: '项目立项前的背景调研与可行性评估，已归档。',
        latestSummary: '确认 etch 区为良率波动主要贡献站点。',
        createdAt: daysAgoIso(10, 14, 0),
        updatedAt: daysAgoIso(9, 11, 0)
      })
    ];
  }

  function defaultYieldProjectEventsFor(p, tasks) {
    var lead = (state.projectMembers.find(function (m) { return sameId(m.projectId, p.id) && m.role === 'lead'; }) || {}).expertId;
    var quality = (state.projectMembers.find(function (m) {
      return sameId(m.projectId, p.id) && m.role === 'member';
    }) || {}).expertId;
    function taskId(title) {
      var t = (tasks || []).find(function (x) { return x.title === title; });
      return t ? t.id : null;
    }
    return [
      { type: 'project_created', category: 'project', title: '项目已创建', content: '项目「12寸产线良率提升项目」已创建，协调专家开始拆解目标。', createdAt: daysAgoIso(7, 9, 0) },
      { type: 'goal_created', category: 'task', title: '目标已发起', taskId: taskId('针对近期良率波动组织专家排查'), expertId: lead, content: '用户发起目标「针对近期良率波动组织专家排查」，系统自动拆解为 5 个子任务。', createdAt: minutesAgoIso(280) },
      { type: 'task_decomposed', category: 'task', title: '任务已拆解', taskId: taskId('针对近期良率波动组织专家排查'), expertId: lead, content: '协调专家将目标拆解为 SPC 数据分析、良率根因分析、设备关联分析等 5 个子任务并派发。', createdAt: minutesAgoIso(275) },
      { type: 'task_completed', category: 'task', title: '任务已完成', taskId: taskId('良率根因分析'), expertId: lead, content: '任务「良率根因分析」已完成：主要根因 etch 区 3 号 chamber 压力偏差 +12%。', createdAt: minutesAgoIso(90) },
      { type: 'task_status_moved', category: 'task', title: '任务状态变更', taskId: taskId('设备关联分析'), expertId: (state.projectMembers.find(function (m) { return sameId(m.projectId, p.id) && m.expertId !== lead; }) || {}).expertId, content: '任务「设备关联分析」状态变更为「执行中」。', createdAt: minutesAgoIso(20) },
      { type: 'task_blocked', category: 'exception', title: '任务阻塞', taskId: taskId('MES 数据接口对接'), expertId: (state.projectMembers.find(function (m) { return sameId(m.projectId, p.id); }) || {}).expertId, content: '任务「MES 数据接口对接」被阻塞：MES API 权限待 IT 开通。', createdAt: minutesAgoIso(30) },
      { type: 'comment_added', category: 'comment', title: '新增评论', taskId: taskId('SPC 数据分析'), expertId: quality, content: '[质量专家] 建议同步检查冷却系统对颗粒污染的影响。', createdAt: minutesAgoIso(50) },
      { type: 'execution_run', category: 'execution', title: '执行记录', taskId: taskId('良率根因分析'), expertId: lead, content: 'Run #1 工艺专家 完成 18m32s — 已定位 etch 区 3 号 chamber 压力漂移。', createdAt: minutesAgoIso(95) },
      { type: 'goal_completed', category: 'task', title: '目标已完成', taskId: taskId('12寸产线工艺窗口复盘'), expertId: lead, content: '目标「12寸产线工艺窗口复盘」全部子任务已完成（4/4）。', createdAt: daysAgoIso(1, 16, 30) },
      { type: 'task_review', category: 'execution', title: '进入评审', taskId: taskId('工艺参数回标方案'), expertId: lead, content: '任务「工艺参数回标方案」已提交 PR，系统自动评审中。', createdAt: minutesAgoIso(25) }
    ].map(function (e) {
      return Object.assign({ id: uid(), projectId: p.id, meta: null }, e);
    });
  }

  function defaultSupplyProjectTasksFor(p, members) {
    var supplyLead = members[0];
    var digital = members[1];

    var goalActive = uid();
    var goalDone = uid();
    var goalTriage = uid();
    var tForecast = uid();

    return [
      projectTaskSeed(p, {
        id: goalActive,
        title: '推进供应链数字化核心能力建设',
        status: 'todo',
        isTriage: true,
        expertId: supplyLead.expertId,
        sortOrder: -30,
        priority: 'high',
        body: '构建多工厂需求预测模型，同步推进主数据治理与仿真验证，提升交付准时率。',
        createdAt: minutesAgoIso(320),
        updatedAt: minutesAgoIso(18)
      }),
      projectTaskSeed(p, {
        id: goalDone,
        title: '完成供应链数据底座建设',
        status: 'done',
        isTriage: true,
        expertId: supplyLead.expertId,
        sortOrder: -20,
        priority: 'medium',
        body: '完成历史订单清洗、主数据编码规则梳理与 WMS 数据导出，夯实供应链数据底座。',
        createdAt: daysAgoIso(5, 10, 0),
        updatedAt: daysAgoIso(2, 16, 0)
      }),
      projectTaskSeed(p, {
        id: goalTriage,
        title: '数据治理规范建设',
        status: 'triage',
        isTriage: true,
        expertId: digital.expertId,
        sortOrder: -10,
        priority: 'high',
        body: '制定供应链主数据治理规范，覆盖物料编码、供应商主数据与一对多映射规则。',
        createdAt: daysAgoIso(3, 14, 20),
        updatedAt: daysAgoIso(3, 14, 20)
      }),

      projectTaskSeed(p, {
        title: '促销日历对齐',
        status: 'done',
        expertId: supplyLead.expertId,
        parentTaskId: goalActive,
        sortOrder: 0,
        priority: 'medium',
        body: '与营销团队对齐 Q3 促销日历，纳入预测模型特征。',
        latestSummary: '促销日历已对齐并入库。',
        createdAt: minutesAgoIso(300),
        updatedAt: minutesAgoIso(200)
      }),
      projectTaskSeed(p, {
        title: '渠道反馈数据接入',
        status: 'done',
        expertId: digital.expertId,
        parentTaskId: goalActive,
        sortOrder: 1,
        priority: 'medium',
        body: '接入渠道销售反馈与海外订单数据，补充预测特征。',
        latestSummary: '已完成 6 个渠道数据源接入。',
        createdAt: minutesAgoIso(290),
        updatedAt: minutesAgoIso(180)
      }),
      projectTaskSeed(p, {
        title: '历史特征工程',
        status: 'done',
        expertId: supplyLead.expertId,
        parentTaskId: goalActive,
        sortOrder: 2,
        priority: 'high',
        body: '整理近 12 个月订单与库存数据，构建预测特征集。',
        latestSummary: '特征集 v2 已发布，含季节性分解字段。',
        createdAt: minutesAgoIso(280),
        updatedAt: minutesAgoIso(150)
      }),
      projectTaskSeed(p, {
        id: tForecast,
        title: '需求预测建模',
        status: 'running',
        expertId: supplyLead.expertId,
        parentTaskId: goalActive,
        sortOrder: 3,
        priority: 'high',
        body: '训练多 SKU 需求预测模型，完成回测与误差分析。',
        latestSummary: '已加载近 12 个月订单数据，开始特征工程。',
        commentCount: 3,
        createdAt: minutesAgoIso(270),
        updatedAt: minutesAgoIso(25)
      }),
      projectTaskSeed(p, {
        title: 'ERP 编码映射核对',
        status: 'todo',
        expertId: digital.expertId,
        parentTaskId: tForecast,
        sortOrder: 4,
        priority: 'medium',
        body: '待预测建模完成后，核对 ERP 物料编码一对多映射清单。',
        commentCount: 1,
        createdAt: minutesAgoIso(260),
        updatedAt: minutesAgoIso(100)
      }),

      projectTaskSeed(p, {
        title: '历史订单数据清洗',
        status: 'done',
        expertId: supplyLead.expertId,
        parentTaskId: goalDone,
        sortOrder: 10,
        priority: 'medium',
        body: '清洗并对齐近 12 个月历史订单数据。',
        latestSummary: '已完成近 12 个月订单数据清洗与对齐。',
        createdAt: daysAgoIso(5, 10, 30),
        updatedAt: daysAgoIso(4, 15, 0)
      }),
      projectTaskSeed(p, {
        title: '主数据编码规则梳理',
        status: 'done',
        expertId: digital.expertId,
        parentTaskId: goalDone,
        sortOrder: 11,
        priority: 'medium',
        body: '梳理物料、供应商、库位等主数据编码规则。',
        latestSummary: '编码规则清单已输出，待与 ERP 团队确认。',
        createdAt: daysAgoIso(4, 9, 0),
        updatedAt: daysAgoIso(3, 17, 0)
      }),
      projectTaskSeed(p, {
        title: 'WMS 库位热力图导出',
        status: 'done',
        expertId: digital.expertId,
        parentTaskId: goalDone,
        sortOrder: 12,
        priority: 'medium',
        body: '导出 WMS 库位热力图，供预测模型区域分仓特征使用。',
        latestSummary: '热力图已导出，可供区域分仓特征使用。',
        result: '已完成 WMS 库位热力图导出。',
        createdAt: daysAgoIso(3, 11, 0),
        updatedAt: daysAgoIso(2, 16, 0)
      }),
      projectTaskSeed(p, {
        title: '数据质量基线报告',
        status: 'done',
        expertId: supplyLead.expertId,
        parentTaskId: goalDone,
        sortOrder: 13,
        priority: 'low',
        body: '输出供应链主数据质量基线报告，定义监控指标。',
        latestSummary: '基线报告已归档，完整率 96.2%。',
        createdAt: daysAgoIso(2, 14, 0),
        updatedAt: daysAgoIso(2, 16, 0)
      }),

      projectTaskSeed(p, {
        title: '数据治理规范',
        status: 'review',
        expertId: digital.expertId,
        sortOrder: 20,
        priority: 'high',
        body: '编写供应链主数据治理规范，提交评审。',
        latestSummary: '规范草案已提交 PR，系统正在自动评审中。',
        commentCount: 2,
        createdAt: minutesAgoIso(120),
        updatedAt: minutesAgoIso(30)
      }),
      projectTaskSeed(p, {
        title: '多工厂仿真验证',
        status: 'ready',
        expertId: null,
        sortOrder: 21,
        priority: 'medium',
        body: '执行多工厂物料计划仿真验证，评估交付准时率提升空间。',
        createdAt: minutesAgoIso(110),
        updatedAt: minutesAgoIso(40)
      }),
      projectTaskSeed(p, {
        title: '安全库存策略评审',
        status: 'triage',
        expertId: supplyLead.expertId,
        sortOrder: 22,
        priority: 'high',
        body: '反复阻塞后需重新拆解安全库存策略优化方案。',
        latestSummary: '反复 block/unblock 已达上限，需重新拆解。',
        blockedReason: '反复阻塞已达上限，需重新拆解',
        createdAt: minutesAgoIso(90),
        updatedAt: minutesAgoIso(50)
      }),
      projectTaskSeed(p, {
        title: '供应商协同平台对接',
        status: 'blocked',
        expertId: digital.expertId,
        sortOrder: 23,
        priority: 'urgent',
        body: '对接供应商协同平台 API，获取实时交付数据。',
        latestSummary: '供应商平台 API 密钥待采购部门审批。',
        blockedReason: '供应商平台 API 密钥待采购部门审批',
        commentCount: 2,
        createdAt: minutesAgoIso(80),
        updatedAt: minutesAgoIso(35)
      })
    ];
  }

  function defaultSupplyProjectEventsFor(p, tasks) {
    var lead = (state.projectMembers.find(function (m) { return sameId(m.projectId, p.id) && m.role === 'lead'; }) || {}).expertId;
    var digital = (state.projectMembers.find(function (m) {
      return sameId(m.projectId, p.id) && m.role === 'member';
    }) || {}).expertId;
    function taskId(title) {
      var t = (tasks || []).find(function (x) { return x.title === title; });
      return t ? t.id : null;
    }
    return [
      { type: 'project_created', category: 'project', title: '项目已创建', content: '项目「供应链数字化规划」已创建，协调专家开始拆解目标。', createdAt: daysAgoIso(7, 9, 0) },
      { type: 'goal_created', category: 'task', title: '目标已发起', taskId: taskId('推进供应链数字化核心能力建设'), expertId: lead, content: '用户发起目标「推进供应链数字化核心能力建设」，系统自动拆解为 5 个子任务。', createdAt: minutesAgoIso(320) },
      { type: 'task_decomposed', category: 'task', title: '任务已拆解', taskId: taskId('推进供应链数字化核心能力建设'), expertId: lead, content: '协调专家将目标拆解为需求预测建模、促销日历对齐、历史特征工程等子任务并派发。', createdAt: minutesAgoIso(315) },
      { type: 'task_completed', category: 'task', title: '任务已完成', taskId: taskId('促销日历对齐'), expertId: lead, content: '任务「促销日历对齐」已完成，促销特征已纳入预测模型。', createdAt: minutesAgoIso(200) },
      { type: 'task_status_moved', category: 'task', title: '任务状态变更', taskId: taskId('需求预测建模'), expertId: lead, content: '任务「需求预测建模」状态变更为「执行中」。', createdAt: minutesAgoIso(25) },
      { type: 'task_blocked', category: 'exception', title: '任务阻塞', taskId: taskId('供应商协同平台对接'), expertId: digital, content: '任务「供应商协同平台对接」被阻塞：供应商平台 API 密钥待采购部门审批。', createdAt: minutesAgoIso(35) },
      { type: 'comment_added', category: 'comment', title: '新增评论', taskId: taskId('需求预测建模'), expertId: digital, content: '[数字化顾问] WMS 热力图特征已可供模型使用，请同步纳入。', createdAt: minutesAgoIso(60) },
      { type: 'goal_completed', category: 'task', title: '目标已完成', taskId: taskId('完成供应链数据底座建设'), expertId: lead, content: '目标「完成供应链数据底座建设」全部子任务已完成（4/4）。', createdAt: daysAgoIso(2, 16, 0) },
      { type: 'goal_created', category: 'task', title: '目标已发起', taskId: taskId('数据治理规范建设'), expertId: digital, content: '用户发起目标「数据治理规范建设」，待协调专家拆解。', createdAt: daysAgoIso(3, 14, 20) },
      { type: 'task_review', category: 'execution', title: '进入评审', taskId: taskId('数据治理规范'), expertId: digital, content: '任务「数据治理规范」已提交 PR，系统自动评审中。', createdAt: minutesAgoIso(30) }
    ].map(function (e) {
      return Object.assign({ id: uid(), projectId: p.id, meta: null }, e);
    });
  }

  function defaultProjectTasksFor(p) {
    var members = state.projectMembers.filter(function (m) { return sameId(m.projectId, p.id); });
    if (p.name.indexOf('良率') >= 0 && members.length >= 2) {
      return defaultYieldProjectTasksFor(p, members);
    }
    if (p.name.indexOf('供应链') >= 0 && members.length >= 2) {
      return defaultSupplyProjectTasksFor(p, members);
    }
    if (members.length === 0) {
      return [{ id: uid(), projectId: p.id, title: '任务拆解', status: 'queued', expertId: null, sortOrder: 0 }];
    }
    var genericTitles = ['数据收集', '分析报告', '评审闭环'];
    return members.map(function (m, i) {
      var expert = state.experts.find(function (e) { return e.id === m.expertId; });
      var status = m.progress >= 100 ? 'done' : (m.progress > 0 ? 'running' : 'queued');
      return {
        id: uid(),
        projectId: p.id,
        title: genericTitles[i % genericTitles.length],
        status: status,
        expertId: status === 'running' ? m.expertId : (m.expertId || null),
        sortOrder: i
      };
    });
  }

  var YIELD_TASK_TITLES = ['SPC 数据分析', '良率根因分析', '设备关联分析'];
  var SUPPLY_TASK_TITLES = ['需求预测建模', '数据治理规范', '多工厂仿真验证'];

  var DECOMPOSE_PLAN_TEMPLATES = [
    { match: /良率|缺陷|异常|工艺/, children: [
      { title: '现场数据采集与清洗', body: '收集近 4 周相关工序的原始数据，完成清洗与对齐。', priority: 'high' },
      { title: '根因分析与假设验证', body: '基于数据建立假设树，逐项验证关键影响因素。', priority: 'high' },
      { title: '整改方案与验证计划', body: '输出整改建议清单及验证计划，跟踪闭环。', priority: 'medium' }
    ]},
    { match: /供应链|需求|库存|预测/, children: [
      { title: '历史数据梳理与特征工程', body: '整理历史销售与库存数据，构建特征集。', priority: 'high' },
      { title: '预测建模与回测', body: '训练多 SKU 预测模型，完成回测与误差分析。', priority: 'high' },
      { title: '落地建议与监控指标', body: '输出落地建议，定义监控指标与告警阈值。', priority: 'medium' }
    ]},
    { match: /设备|故障|运维|产线/, children: [
      { title: '设备关联数据采集', body: '采集设备运行参数、PM 记录与告警事件。', priority: 'high' },
      { title: '故障模式分析', body: '识别关键故障模式及影响因素。', priority: 'high' },
      { title: '运维优化建议', body: '输出运维策略与备件优化建议。', priority: 'medium' }
    ]}
  ];

  function defaultDecomposePlan(rootTitle) {
    var text = String(rootTitle || '');
    for (var i = 0; i < DECOMPOSE_PLAN_TEMPLATES.length; i++) {
      if (DECOMPOSE_PLAN_TEMPLATES[i].match.test(text)) return DECOMPOSE_PLAN_TEMPLATES[i].children;
    }
    return [
      { title: '信息收集与现状梳理', body: '梳理目标范围、现状与关键约束。', priority: 'high' },
      { title: '方案制定与执行', body: '制定方案并组织专家推进执行。', priority: 'medium' },
      { title: '结果汇总与复盘', body: '汇总执行结果，输出复盘报告。', priority: 'medium' }
    ];
  }

  var PROJECT_TASK_TITLE_RENAMES = {
    '排查 etch 区近 4 周 SPC 异常点': 'SPC 数据分析',
    '撰写良率波动根因分析报告': '良率根因分析',
    '交叉验证 chamber PM 记录与良率关联': '设备关联分析',
    '训练多 SKU 需求预测模型': '需求预测建模',
    '编写供应链主数据治理规范': '数据治理规范',
    '执行多工厂物料计划仿真验证': '多工厂仿真验证',
    '拆解项目目标并分配子任务': '任务拆解',
    '执行分配工作项': null,
    '完成阶段调研与数据收集': '数据收集',
    '输出分析报告与改进建议': '分析报告',
    '组织评审并闭环验证事项': '评审闭环'
  };

  function stripExpertNamePrefix(title) {
    if (!title) return title;
    var changed = true;
    while (changed) {
      changed = false;
      state.experts.forEach(function (e) {
        if (changed || !e.name) return;
        if (title.indexOf(e.name + '：') === 0) {
          title = title.slice(e.name.length + 1);
          changed = true;
        } else if (title.indexOf(e.name + ':') === 0) {
          title = title.slice(e.name.length + 1);
          changed = true;
        }
      });
    }
    return title;
  }

  function normalizeProjectTaskTitle(t) {
    var title = stripExpertNamePrefix(t.title || '');
    if (PROJECT_TASK_TITLE_RENAMES[title] !== undefined) {
      title = PROJECT_TASK_TITLE_RENAMES[title];
    }
    if (title === '执行分配工作项' || title === null) {
      var project = state.projects.find(function (p) { return sameId(p.id, t.projectId); });
      var idx = t.sortOrder || 0;
      if (project && project.name.indexOf('良率') >= 0) title = YIELD_TASK_TITLES[idx % YIELD_TASK_TITLES.length];
      else if (project && project.name.indexOf('供应链') >= 0) title = SUPPLY_TASK_TITLES[idx % SUPPLY_TASK_TITLES.length];
      else title = ['数据收集', '分析报告', '评审闭环'][idx % 3];
    }
    if (title && title.indexOf('负责项') >= 0) {
      title = ['数据收集', '分析报告', '评审闭环'][(t.sortOrder || 0) % 3];
    }
    return title;
  }

  function migrateProjectTaskTitles() {
    var updated = false;
    (state.projectTasks || []).forEach(function (t) {
      var normalized = normalizeProjectTaskTitle(t);
      if (normalized && normalized !== t.title) {
        t.title = normalized;
        updated = true;
      }
    });
    if (updated) persist();
  }

  function normalizeProjectTaskStatus(status) {
    var s = String(status || '').toLowerCase();
    if (s === 'triage' || s === 'todo' || s === 'scheduled' || s === 'ready' || s === 'running' || s === 'blocked' || s === 'review' || s === 'done' || s === 'archived') return s;
    if (s === 'queued') return 'ready';
    if (s === 'completed' || s === 'complete') return 'done';
    if (s === 'thinking' || s === 'tool' || s === 'waiting' || s === 'error') return 'running';
    return 'todo';
  }

  function projectTaskStatusRank(status) {
    var s = normalizeProjectTaskStatus(status);
    var ranks = { triage: 0, todo: 1, scheduled: 2, ready: 3, running: 4, blocked: 5, review: 6, done: 7, archived: 8 };
    return ranks[s] == null ? 99 : ranks[s];
  }

  var DEMO_PROJECT_TASK_STATUSES = {
    'SPC 数据分析': 'ready',
    '良率根因分析': 'done',
    '设备关联分析': 'running',
    'chamber 参数漂移复盘': 'triage',
    '下周 SPC 复测计划': 'scheduled',
    '冷却系统关联验证': 'todo',
    '缺陷 pareto 更新': 'todo',
    '工艺参数回标方案': 'review',
    'MES 数据接口对接': 'blocked',
    '初期数据摸底': 'archived',
    '立项背景调研': 'archived',
    '针对近期良率波动组织专家排查': 'todo',
    '12寸产线工艺窗口复盘': 'done',
    'etch 区设备健康度评估': 'triage',
    '颗粒污染 Top3 归因': 'todo',
    '工艺窗口参数采集': 'done',
    '窗口偏差分析报告': 'done',
    '加严监控规则制定': 'done',
    '复盘纪要输出': 'done',
    'etch 区清洁周期加严': 'ready',
    'CMP 区良率对标分析': 'todo',
    'FDC 告警规则梳理': 'running',
    '光刻 overlay 偏差复核': 'blocked',
    '站会纪要整理': 'done',
    '推进供应链数字化核心能力建设': 'todo',
    '完成供应链数据底座建设': 'done',
    '数据治理规范建设': 'triage',
    '渠道反馈数据接入': 'done',
    '历史特征工程': 'done',
    '主数据编码规则梳理': 'done',
    '数据质量基线报告': 'done',
    '需求预测建模': 'running',
    '数据治理规范': 'review',
    '多工厂仿真验证': 'ready',
    '促销日历对齐': 'done',
    'ERP 编码映射核对': 'todo',
    '安全库存策略评审': 'triage',
    'WMS 库位热力图导出': 'done',
    '历史订单数据清洗': 'done',
    '供应商协同平台对接': 'blocked',
    '任务拆解': 'ready',
    '数据收集': 'ready',
    '分析报告': 'running',
    '评审闭环': 'done'
  };

  var LEGACY_PROJECT_TASK_STATUSES = {
    thinking: true, tool: true, waiting: true, error: true
  };

  function normalizeProjectTaskRecord(t) {
    if (!t) return t;
    var changed = false;
    var status = normalizeProjectTaskStatus(t.status);
    if (t.status !== status) { t.status = status; changed = true; }
    if (!t.body && t.description) { t.body = t.description; changed = true; }
    if (!t.assignee && t.expertId) { t.assignee = t.expertId; changed = true; }
    if (!t.expertId && t.assignee) { t.expertId = t.assignee; changed = true; }
    if (!t.priority) { t.priority = 'medium'; changed = true; }
    if (t.commentCount == null) { t.commentCount = 0; changed = true; }
    if (t.parentTaskId === undefined) { t.parentTaskId = null; changed = true; }
    if (t.isTriage === undefined) { t.isTriage = false; changed = true; }
    if (!t.latestSummary) { t.latestSummary = t.result || t.blockedReason || t.body || ''; changed = true; }
    if (!t.createdAt) { t.createdAt = t.updatedAt || nowIso(); changed = true; }
    if (!t.updatedAt) { t.updatedAt = t.createdAt || nowIso(); changed = true; }
    return changed;
  }

  function migrateProjectsKanbanFields() {
    var updated = false;
    (state.projects || []).forEach(function (p) {
      if (!p.slug) {
        p.slug = uniqueProjectSlug(p.name, p.id);
        updated = true;
      }
      if (p.defaultWorkdir == null) {
        p.defaultWorkdir = p.workdir || '';
        updated = true;
      }
      if (p.orchestratorProfileId === undefined) { p.orchestratorProfileId = null; updated = true; }
      if (p.defaultAssignee === undefined) { p.defaultAssignee = null; updated = true; }
      if (p.autoDecomposeEnabled === undefined) { p.autoDecomposeEnabled = true; updated = true; }
    });
    if (!Array.isArray(state.projectEvents)) {
      state.projectEvents = [];
      updated = true;
    }
    if (updated) persist();
  }

  function migrateProjectTaskStatus() {
    var SCHEMA = 3;
    var updated = false;
    (state.projectTasks || []).forEach(function (t) {
      var legacyStatus = t.status;
      var canonical = DEMO_PROJECT_TASK_STATUSES[t.title];
      if ((state.projectTaskSchemaVersion || 0) < SCHEMA && LEGACY_PROJECT_TASK_STATUSES[legacyStatus] && canonical) {
        t.status = canonical;
        updated = true;
      }
      if (normalizeProjectTaskRecord(t)) updated = true;
    });
    if ((state.projectTaskSchemaVersion || 0) < SCHEMA) {
      state.projectTaskSchemaVersion = SCHEMA;
      updated = true;
    }
    if (updated) persist();
  }

  function migrateProjectTaskSeed() {
    var SCHEMA = 4;
    if ((state.projectTaskSchemaVersion || 0) >= SCHEMA) return;
    (state.projects || []).forEach(function (p) {
      if (p.name.indexOf('良率') < 0 && p.name.indexOf('供应链') < 0) return;
      var existing = (state.projectTasks || []).filter(function (t) { return sameId(t.projectId, p.id); });
      if (existing.length >= 8) return;
      state.projectTasks = (state.projectTasks || []).filter(function (t) { return !sameId(t.projectId, p.id); });
      defaultProjectTasksFor(p).forEach(function (t) { state.projectTasks.push(t); });
    });
    state.projectTaskSchemaVersion = SCHEMA;
    persist();
  }

  function migrateYieldProjectSeed() {
    var SCHEMA = 5;
    if ((state.projectTaskSchemaVersion || 0) >= SCHEMA) return;
    (state.projects || []).forEach(function (p) {
      if (p.name.indexOf('良率') < 0) return;
      var existing = (state.projectTasks || []).filter(function (t) { return sameId(t.projectId, p.id); });
      if (existing.length >= 22) return;
      state.projectTasks = (state.projectTasks || []).filter(function (t) { return !sameId(t.projectId, p.id); });
      var tasks = defaultProjectTasksFor(p);
      tasks.forEach(function (t) { state.projectTasks.push(t); });
      state.projectEvents = (state.projectEvents || []).filter(function (e) { return !sameId(e.projectId, p.id); });
      defaultYieldProjectEventsFor(p, tasks).forEach(function (e) { state.projectEvents.push(e); });
      state.projectFiles = (state.projectFiles || []).filter(function (f) { return !sameId(f.projectId, p.id); });
      defaultProjectFilesFor(p).forEach(function (f) { state.projectFiles.push(f); });
    });
    state.projectTaskSchemaVersion = SCHEMA;
    persist();
  }

  function migrateSupplyProjectSeed() {
    var SCHEMA = 6;
    if ((state.projectTaskSchemaVersion || 0) >= SCHEMA) return;
    (state.projects || []).forEach(function (p) {
      if (p.name.indexOf('供应链') < 0) return;
      var existing = (state.projectTasks || []).filter(function (t) { return sameId(t.projectId, p.id); });
      var hasGoalRecords = existing.some(function (t) { return t.isTriage === true; });
      if (hasGoalRecords && existing.length >= 18) return;
      state.projectTasks = (state.projectTasks || []).filter(function (t) { return !sameId(t.projectId, p.id); });
      var tasks = defaultProjectTasksFor(p);
      tasks.forEach(function (t) { state.projectTasks.push(t); });
      state.projectEvents = (state.projectEvents || []).filter(function (e) { return !sameId(e.projectId, p.id); });
      defaultSupplyProjectEventsFor(p, tasks).forEach(function (e) { state.projectEvents.push(e); });
    });
    state.projectTaskSchemaVersion = SCHEMA;
    persist();
  }

  function migrateDialogueTaskLastActivity() {
    var updated = false;
    (state.tasks || []).forEach(function (t) {
      if (t.type && t.type !== 'dialogue') return;
      var expected = syncTaskLastActivityAt(t);
      if (t.lastActivityAt !== expected) {
        t.lastActivityAt = expected;
        updated = true;
      }
    });
    if (updated) persist();
  }

  function migrateTaskDetailFields() {
    var SCHEMA = 7;
    if ((state.projectTaskSchemaVersion || 0) >= SCHEMA) return;
    (state.projectTasks || []).forEach(function (t) {
      if (t.blockKind === undefined) t.blockKind = '';
      if (t.consecutiveFailures === undefined) t.consecutiveFailures = 0;
      if (t.lastFailureError === undefined) t.lastFailureError = '';
      if (t.completedAt === undefined) t.completedAt = null;
      if (t.startedAt === undefined) t.startedAt = null;
      if (t.currentRunId === undefined) t.currentRunId = null;
      if (t.lastHeartbeatAt === undefined) t.lastHeartbeatAt = null;
      if (t.workspaceKind === undefined) t.workspaceKind = '';
      if (t.workspacePath === undefined) t.workspacePath = '';
      if (!Array.isArray(t.runs)) t.runs = [];
      if (!Array.isArray(t.taskEvents)) t.taskEvents = [];
      if (!Array.isArray(t.diagnostics)) t.diagnostics = [];
      if (!Array.isArray(t.comments)) t.comments = [];
      if (!Array.isArray(t.skills)) t.skills = [];
    });
    state.projectTaskSchemaVersion = SCHEMA;
    persist();
  }

  function migrateProjectTasks() {
    if (state.projectTasks && state.projectTasks.length > 0) return;
    state.projectTasks = [];
    state.projects.forEach(function (p) {
      defaultProjectTasksFor(p).forEach(function (t) { state.projectTasks.push(t); });
    });
    if (state.projectTasks.length) persist();
  }

  function defaultProjectFilesFor(p) {
    if (p.name.indexOf('良率') >= 0) {
      return [
        { id: uid(), projectId: p.id, name: '良率波动根因分析.md', type: 'document', status: 'updating', expertId: null, content: '# 良率波动根因分析\n\n## 初步结论\netch 区 3 号 chamber 压力偏差 +12%…', updatedAt: minutesAgoIso(90) },
        { id: uid(), projectId: p.id, name: 'SPC 控制图模板.xlsx', type: 'spreadsheet', status: 'ready', content: 'SPC 模板：UCL / LCL / 中心线参数占位', updatedAt: daysAgoIso(2, 11, 0) },
        { id: uid(), projectId: p.id, name: 'MES 良率原始数据.csv', type: 'data', status: 'ready', content: 'date,site,yield\n2026-05-01,etch-3,0.912\n2026-05-02,etch-3,0.908', updatedAt: daysAgoIso(3, 15, 30) },
        { id: uid(), projectId: p.id, name: 'etch-3 chamber PM 记录.xlsx', type: 'spreadsheet', status: 'ready', content: 'PM 记录：近 3 个月维护日志', updatedAt: minutesAgoIso(45) },
        { id: uid(), projectId: p.id, name: '缺陷 pareto 周报.pdf', type: 'document', status: 'ready', content: '缺陷 pareto 周报 — Top1 颗粒污染 38%', updatedAt: minutesAgoIso(50) },
        { id: uid(), projectId: p.id, name: '工艺窗口复盘纪要.md', type: 'document', status: 'ready', content: '# 工艺窗口复盘纪要\n\netch 窗口偏差贡献度 42%…', updatedAt: daysAgoIso(1, 16, 30) }
      ];
    }
    if (p.name.indexOf('供应链') >= 0) {
      return [
        { id: uid(), projectId: p.id, name: '需求预测模型说明.md', type: 'document', status: 'updating', content: '# 需求预测模型\n\n初版说明…', updatedAt: nowIso() },
        { id: uid(), projectId: p.id, name: '数据治理规范草案.docx', type: 'document', status: 'ready', content: '数据治理规范草案', updatedAt: nowIso() }
      ];
    }
    return [];
  }

  function migrateProjectFiles() {
    if (state.projectFiles && state.projectFiles.length > 0) return;
    state.projectFiles = [];
    state.projects.forEach(function (p) {
      defaultProjectFilesFor(p).forEach(function (f) { state.projectFiles.push(f); });
    });
    if (state.projectFiles.length) persist();
  }

  function migrateProjectMessageTypes() {
    var updated = false;
    Object.keys(state.projectMessages || {}).forEach(function (pid) {
      (state.projectMessages[pid] || []).forEach(function (m) {
        if (!m.type) {
          m.type = m.role === 'system' ? 'chat' : 'chat';
          updated = true;
        }
      });
    });
    if (updated) persist();
  }

  function findProjectTaskId(projectId, title) {
    var task = (state.projectTasks || []).find(function (t) {
      return sameId(t.projectId, projectId) && t.title === title;
    });
    return task ? task.id : null;
  }

  function findProjectMemberExpertId(projectId, role) {
    var member = (state.projectMembers || []).find(function (m) {
      return sameId(m.projectId, projectId) && m.role === role;
    });
    return member ? member.expertId : null;
  }

  function getDemoProjectMessageDefs(project) {
    if (!project) return [];
    var pid = project.id;
    if (project.name.indexOf('良率') >= 0) {
      var eProcess = findProjectMemberExpertId(pid, 'lead') ||
        (state.projectTasks.find(function (t) { return sameId(t.projectId, pid) && t.title === '良率根因分析'; }) || {}).expertId;
      var eQuality = (state.projectTasks.find(function (t) { return sameId(t.projectId, pid) && t.title === 'SPC 数据分析'; }) || {}).expertId;
      var eDevice = (state.projectTasks.find(function (t) { return sameId(t.projectId, pid) && t.title === '设备关联分析'; }) || {}).expertId;
      var tRoot = findProjectTaskId(pid, '良率根因分析');
      var tSpc = findProjectTaskId(pid, 'SPC 数据分析');
      var tDevice = findProjectTaskId(pid, '设备关联分析');
      return [
        { role: 'system', type: 'chat', offsetMin: 0, content: '项目已创建，项目经理已拆解子任务，各位专家请同步进展。' },
        { role: 'user', type: 'chat', scope: 'group', offsetMin: 3, content: '请各位专家同步本周良率攻关进展，优先级：根因分析 → 设备关联 → SPC 数据。' },
        { role: 'user', type: 'chat', scope: 'group', taskId: tRoot, offsetMin: 8, content: '请工艺专家先输出良率波动根因摘要。' },
        { role: 'expert', type: 'chat', taskId: tRoot, expertId: eProcess, offsetMin: 12, content: '收到，已开始拉取 etch 区近 4 周良率数据，预计 30 分钟内给出初步判断。' },
        { role: 'expert', type: 'thought', taskId: tRoot, expertId: eProcess, offsetMin: 16, content: 'Thought: 需要先拉取近 4 周各站点良率趋势，对比 etch 区 chamber 参数变更记录，再交叉 SPC 异常点。' },
        { role: 'expert', type: 'action', taskId: tRoot, expertId: eProcess, toolName: 'MES 数据查询 API', offsetMin: 20, content: '' },
        { role: 'expert', type: 'chat', taskId: tRoot, expertId: eProcess, offsetMin: 28, content: '初步判断与 etch 区 3 号 chamber 压力漂移相关（+12%），详细报告今日内提交。' },
        { role: 'user', type: 'chat', targetExpertId: eQuality, taskId: tSpc, offsetMin: 38, content: '质量专家，SPC 异常点排查进展如何？' },
        { role: 'expert', type: 'thought', taskId: tSpc, expertId: eQuality, offsetMin: 42, content: 'Thought: 需先确认 etch-3 站点控制图异常规则命中情况，再更新缺陷 pareto 对比上周。' },
        { role: 'expert', type: 'chat', taskId: tSpc, expertId: eQuality, offsetMin: 48, content: '已锁定 etch-3 连续 3 点超 UCL，正在生成更新版缺陷 pareto。' },
        { role: 'expert', type: 'action', taskId: tSpc, expertId: eQuality, toolName: 'SPC 分析工具', offsetMin: 55, content: '' },
        { role: 'expert', type: 'chat', taskId: tSpc, expertId: eQuality, offsetMin: 62, content: 'Top1 颗粒污染占比升至 38%（+6pp），与工艺专家判断一致，建议同步加严清洁周期。' },
        { role: 'expert', type: 'thought', taskId: tDevice, expertId: eDevice, offsetMin: 70, content: 'Thought: 待根因报告确认后，关联设备 PM 记录与 alarm 日志做交叉验证。' },
        { role: 'user', type: 'chat', targetExpertId: eDevice, taskId: tDevice, offsetMin: 76, content: '设备专家，chamber PM 记录和 alarm 日志准备好了吗？' },
        { role: 'expert', type: 'chat', taskId: tDevice, expertId: eDevice, offsetMin: 82, content: '正在从设备管理系统导出近 3 个月 PM 记录，完成后立即做关联分析。' },
        { role: 'user', type: 'chat', scope: 'group', offsetMin: 95, content: '请今日下班前各提交阶段摘要，明早站会同步。' },
        { role: 'expert', type: 'chat', taskId: tRoot, expertId: eProcess, offsetMin: 100, content: '根因分析报告预计 17:00 前提交，含参数回标建议。' }
      ];
    }
    if (project.name.indexOf('供应链') >= 0) {
      var eSupply = findProjectMemberExpertId(pid, 'lead') ||
        (state.projectTasks.find(function (t) { return sameId(t.projectId, pid) && t.title === '需求预测建模'; }) || {}).expertId;
      var eDigital = (state.projectTasks.find(function (t) { return sameId(t.projectId, pid) && t.title === '数据治理规范'; }) || {}).expertId;
      var tForecast = findProjectTaskId(pid, '需求预测建模');
      var tGovern = findProjectTaskId(pid, '数据治理规范');
      return [
        { role: 'system', type: 'chat', offsetMin: 0, content: '项目「供应链数字化规划」已创建，各位专家请协同推进。' },
        { role: 'user', type: 'chat', scope: 'group', offsetMin: 4, content: '请供应链专家主导需求预测建模，数字化顾问配合主数据治理。' },
        { role: 'expert', type: 'thought', taskId: tForecast, expertId: eSupply, offsetMin: 10, content: 'Thought: 需整合近 12 个月订单、渠道反馈与促销日历，Top20 SKU 单独建模。' },
        { role: 'expert', type: 'chat', taskId: tForecast, expertId: eSupply, offsetMin: 16, content: '已加载近 12 个月订单数据，开始特征工程与季节性分解。' },
        { role: 'expert', type: 'chat', taskId: tGovern, expertId: eDigital, offsetMin: 22, content: '主数据治理规范草案已完成 60%，编码规则章节待与 ERP 团队对齐。' },
        { role: 'user', type: 'chat', targetExpertId: eSupply, taskId: tForecast, offsetMin: 32, content: 'Q3 Top20 SKU 预测校准结果什么时候能出？' },
        { role: 'expert', type: 'chat', taskId: tForecast, expertId: eSupply, offsetMin: 38, content: '今天下午可出初版，已纳入 6 月促销增量与海外订单反馈。' },
        { role: 'expert', type: 'action', taskId: tForecast, expertId: eSupply, toolName: '需求预测引擎', offsetMin: 45, content: '' },
        { role: 'expert', type: 'chat', taskId: tGovern, expertId: eDigital, offsetMin: 55, content: 'WMS 库位热力图已导出，可供预测模型的区域分仓特征使用。' },
        { role: 'user', type: 'chat', scope: 'group', offsetMin: 68, content: '周五下午安排阶段评审会，请准备汇报材料。' },
        { role: 'expert', type: 'chat', taskId: tForecast, expertId: eSupply, offsetMin: 74, content: '收到，同步准备 Q3 预测校准摘要和偏差分析。' },
        { role: 'expert', type: 'thought', taskId: tGovern, expertId: eDigital, offsetMin: 80, content: 'Thought: 评审前需完成物料编码一对多映射清单，供 IT 确认清洗范围。' },
        { role: 'expert', type: 'chat', taskId: tGovern, expertId: eDigital, offsetMin: 88, content: '规范草案周五前可提评审版，编码映射附录一并附上。' }
      ];
    }
    return [];
  }

  function buildProjectDemoMessages(project, baseIso) {
    return getDemoProjectMessageDefs(project).map(function (def) {
      return {
        id: uid(),
        role: def.role,
        type: def.type || 'chat',
        taskId: def.taskId || null,
        expertId: def.expertId || null,
        targetExpertId: def.targetExpertId || null,
        toolName: def.toolName || null,
        scope: def.scope || null,
        content: def.content,
        createdAt: addMinutesIso(baseIso, def.offsetMin || 0)
      };
    });
  }

  function markProjectUserTouched(projectId) {
      var project = state.projects.find(function (p) { return sameId(p.id, projectId); });
    if (project) project.userTouched = true;
  }

  function projectHasUserActivity(project, messages) {
    if (!project) return false;
    if (project.userTouched) return true;
    return (messages || []).some(function (m) { return m.fromUser; });
  }

  function ensureProjectDemoMessages(projectId) {
      var project = state.projects.find(function (p) { return sameId(p.id, projectId); });
    if (!project || !getDemoProjectMessageDefs(project).length) return false;
    var current = state.projectMessages[projectId] || [];
    if (projectHasUserActivity(project, current)) return false;
    if (current.length > 0) return false;
    var baseIso = daysAgoIso(project.name.indexOf('供应链') >= 0 ? 1 : 2, 9, 0);
    state.projectMessages[projectId] = buildProjectDemoMessages(project, baseIso);
    return true;
  }

  function migrateProjectDemoMessages() {
    var updated = false;
    state.projects.forEach(function (p) {
      if (ensureProjectDemoMessages(p.id)) updated = true;
    });
    if (updated) persist();
  }

  function migrateSkillOptOutModel() {
    if (!DEV_MOCK) return false;
    var updated = false;
    (state.experts || []).forEach(function (e, idx) {
      var id = String(e.id);
      var raw = state.skillBindings[id];
      if (!raw) {
        state.skillBindings[id] = seedInstalledSkills({
          withDemoUsage: true,
          demoDisabled: idx === 0 ? ['apple-notes'] : []
        });
        updated = true;
        return;
      }
      var looksLegacy = raw.length > 0 && raw.every(function (b) {
        return typeof b === 'string' || (b && b.skillId && b.enabled === undefined && b.useCount === undefined && b.provenance === undefined);
      });
      var tooFew = Array.isArray(raw) && (window.SKILLS_CATALOG || []).length > 0 && raw.length < (window.SKILLS_CATALOG || []).length;
      if (looksLegacy || tooFew) {
        // 旧「绑定子集」→ 全量已安装 + 默认启用（对齐 seed）；保留显式 disabled
        var seeded = seedInstalledSkills({
          withDemoUsage: true,
          demoDisabled: []
        });
        raw.forEach(function (b) {
          if (typeof b === 'object' && b && b.enabled === false) {
            var sid = bindingSkillId(b);
            seeded.forEach(function (s) {
              if (s.skillId === sid) s.enabled = false;
            });
          }
        });
        state.skillBindings[id] = seeded;
        updated = true;
      } else {
        var normalized = ensureFullInstalledSkills(raw);
        if (normalized.length !== raw.length) {
          state.skillBindings[id] = normalized;
          updated = true;
        }
      }
    });
    return updated;
  }

  /** 旧「绑定子集 / 仅 terminal」→ platform_toolsets.cli opt-in 演示数据 */
  function migrateToolOptInModel() {
    if (!DEV_MOCK) return false;
    var updated = false;
    if (!state.toolsetConfigs) {
      state.toolsetConfigs = {};
      updated = true;
    }
    (state.experts || []).forEach(function (e, idx) {
      var id = String(e.id);
      var raw = state.toolBindings[id];
      if (raw === undefined) {
        state.toolBindings[id] = idx === 0 ? ['browser', 'web'] : ['browser'];
        updated = true;
        return;
      }
      var ids = normalizeToolIds(raw);
      var onlyLegacyTerminal = ids.length === 1 && ids[0] === 'terminal';
      if (onlyLegacyTerminal) {
        state.toolBindings[id] = idx === 0 ? ['browser', 'web'] : ['browser'];
        updated = true;
        return;
      }
      // 规范化为 id 列表（去掉旧 binding 对象形态）
      var changed = !Array.isArray(raw) || raw.length !== ids.length ||
        raw.some(function (b, i) { return typeof b !== 'string' || b !== ids[i]; });
      if (changed) {
        state.toolBindings[id] = ids;
        updated = true;
      }
    });
    return updated;
  }

  var DEMO_DATA_VERSION = window.DEMO_DATA_VERSION || 1;

  /**
   * 演示数据只按版本号同步一次：避免每次启动按剧本回写、
   * 覆盖用户在演示任务里的真实操作。调整剧本后递增 DEMO_DATA_VERSION 即可触发重新同步。
   */
  function syncDemoData() {
    if (state.demoSyncVersion === DEMO_DATA_VERSION) return;
    migrateProjectDemoMessages();
    migrateExpertDialogueTasks();
    migrateExpertDialogueMessages({ force: true });
    state.demoSyncVersion = DEMO_DATA_VERSION;
    persist();
  }

  window.AppStore = {
    isDevMock: function () {
      return DEV_MOCK;
    },
    isSidecarAvailable: function () {
      return sidecarAvailable;
    },
    uid: uid,
    nowIso: nowIso,
    DEFAULT_TASK_CWD: DEFAULT_TASK_CWD,
    init: function () {
      if (DEV_MOCK) {
        seedIfEmpty();
        ensureMcpDemoSeed();
      }
      migrateExpertRoleNames();
      if (sanitizeLegacyConversationMessages(state.messages)) persist();
      else if (normalizeLegacyActionMessages(state.messages)) persist();
      if (DEV_MOCK) {
        migrateSeedExpertProfiles();
        if (migrateSkillOptOutModel()) persist();
        if (migrateToolOptInModel()) persist();
      }
      migrateProjectIds();
      seedDemoProjectsIfEmpty();
      migrateProjectsVisibility();
      migrateProjectsKanbanFields();
      migrateProjectTasks();
      migrateProjectTaskTitles();
      migrateProjectTaskStatus();
      migrateProjectTaskSeed();
      migrateYieldProjectSeed();
      migrateSupplyProjectSeed();
      migrateTaskDetailFields();
      migrateDialogueTaskLastActivity();
      migrateProjectFiles();
      migrateProjectMessageTypes();
      if (DEV_MOCK) {
        syncDemoData();
      }
      if (!DEV_MOCK) {
        syncExpertsFromSidecar();
      }
      return state;
    },
    reset: function () {
      state = defaultState();
      persist();
      if (DEV_MOCK) {
        seedIfEmpty();
        syncDemoData();
      } else {
        syncExpertsFromSidecar();
      }
    },
    resolveProviderSlug: function (providerName, baseUrl) {
      return resolveProviderSlug(providerName, baseUrl);
    },

    getState: function () { return state; },

    getExperts: function () {
      if (DEV_MOCK) migrateSeedExpertProfiles();
      return state.experts.slice().sort(function (a, b) {
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
    },
    getExpert: function (id) {
      return state.experts.find(function (e) { return e.id === String(id); }) || null;
    },
    saveExpert: function (expert) {
      var idx = state.experts.findIndex(function (e) { return e.id === expert.id; });
      expert.updatedAt = nowIso();
      if (idx >= 0) state.experts[idx] = expert;
      else state.experts.unshift(expert);
      persist();
      if (window.SidecarApi && window.SidecarApi.patchExpert) {
        window.SidecarApi.patchExpert(String(expert.id), {
          displayName: expert.name,
          intro: expert.description || '',
          avatarUrl: expert.avatar || null,
          domains: (expert.expertise || []).slice(0, 3)
        });
      }
      return expert;
    },
    createExpert: function (payload) {
      var modelConfig = null;
      if (payload.modelConfig && (payload.modelConfig.baseUrl || payload.modelConfig.model)) {
        var pslug = payload.modelConfig.providerSlug
          || resolveProviderSlug(payload.modelConfig.providerName, payload.modelConfig.baseUrl);
        modelConfig = {
          providerSlug: pslug,
          providerName: (payload.modelConfig.providerName || '').trim(),
          baseUrl: (payload.modelConfig.baseUrl || '').trim(),
          apiKey: payload.modelConfig.apiKey || '',
          model: (payload.modelConfig.model || '').trim()
        };
      }
      var expert = {
        id: payload.slug || uid(),
        slug: payload.slug || '',
        name: payload.name,
        avatar: payload.avatar || DEFAULT_EXPERT_AVATAR,
        description: payload.description,
        expertise: (payload.expertise || payload.tags || []).slice(0, 10),
        tags: (payload.tags || payload.expertise || []).slice(0, 10),
        category: payload.category || '工艺制造',
        model: modelConfig ? modelConfig.model : (payload.model || ''),
        provider: modelConfig ? modelConfig.providerSlug : (payload.provider || ''),
        modelConfig: modelConfig,
        source: payload.source || 'blank',
        cloneFrom: payload.cloneFrom || '',
        workspaceRoot: payload.workspaceRoot || '~/.hermes/profiles/' + (payload.slug || 'expert') + '/workspace',
        visibility: payload.visibility || 'internal',
        status: 'active',
        updatedAt: nowIso()
      };
      state.experts.unshift(expert);
      state.personas[expert.id] = { soulMd: '', onboarded: false };
      // 技能：seed 全部已安装并默认启用；复制来源时清空 .usage.json（不继承热度）
      if (payload.source === 'clone' && payload.cloneFrom && state.skillBindings[String(payload.cloneFrom)]) {
        state.skillBindings[expert.id] = (state.skillBindings[String(payload.cloneFrom)] || [])
          .map(normalizeInstalledSkillRecord)
          .filter(Boolean)
          .map(clearSkillUsageFields);
        state.skillBindings[expert.id] = ensureFullInstalledSkills(state.skillBindings[expert.id])
          .map(clearSkillUsageFields);
      } else if (payload.skillIds && payload.skillIds.length) {
        // 兼容旧调用：仅传 id 列表时仍 seed 全量，列表内视为启用提示（其余也启用）
        state.skillBindings[expert.id] = seedInstalledSkills({ clearUsage: true });
      } else {
        state.skillBindings[expert.id] = seedInstalledSkills({ clearUsage: true });
      }
      // 工具：创建默认不写满 platform_toolsets.cli（继承 _HERMES_CORE_TOOLS）；复制时带走源专家 opt-in 列表
      if (payload.toolIds && payload.toolIds.length) {
        state.toolBindings[expert.id] = payload.toolIds.slice();
      } else if (payload.source === 'clone' && payload.cloneFrom && payload.cloneFrom !== 'default') {
        state.toolBindings[expert.id] = normalizeToolIds(state.toolBindings[String(payload.cloneFrom)] || []).slice();
        if (state.toolsetConfigs && state.toolsetConfigs[String(payload.cloneFrom)]) {
          if (!state.toolsetConfigs) state.toolsetConfigs = {};
          state.toolsetConfigs[expert.id] = cloneJson(state.toolsetConfigs[String(payload.cloneFrom)]);
        }
      } else {
        state.toolBindings[expert.id] = [];
      }
      if (!state.mcpServers) state.mcpServers = {};
      // 对齐 Hermes --clone：复制来源保留 mcp_servers；从零开始不预置
      if (payload.source === 'default' || (payload.source === 'clone' && payload.cloneFrom === 'default')) {
        setMcpServersInternal(expert.id, defaultMcpServersForClone());
      } else if (payload.source === 'clone' && payload.cloneFrom) {
        var srcList = (state.mcpServers && state.mcpServers[String(payload.cloneFrom)]) || [];
        setMcpServersInternal(expert.id, cloneJson(srcList));
      } else {
        setMcpServersInternal(expert.id, []);
      }
      persist();
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.createExpert) {
        window.SidecarApi.createExpert({
          profile: String(expert.id),
          displayName: expert.name,
          intro: expert.description || '',
          avatarUrl: expert.avatar || null,
          domains: (expert.expertise || []).slice(0, 3),
          coreDutyMd: (payload.persona && payload.persona.coreDutyMd) || '',
          workflowMd: (payload.persona && payload.persona.workflowMd) || '',
          behaviorMd: (payload.persona && payload.persona.behaviorMd) || '',
          skills: payload.skillIds || [],
          tools: payload.toolIds || []
        }).then(function (remote) {
          if (!remote || !remote.profile) {
            var e = window.SidecarApi.getLastError && window.SidecarApi.getLastError();
            if (e) {
              console.warn('[AppStore] createExpert sidecar unavailable:', e.message);
              if (window.ElementPlus && window.ElementPlus.ElMessage) {
                ElementPlus.ElMessage.warning('sidecar 连接异常，当前仅本地保存。请检查 SIDECAR_API_BASE。');
              }
            }
            return;
          }
          sidecarAvailable = true;
          if (String(remote.profile) !== String(expert.id)) {
            var oldId = String(expert.id);
            var newId = String(remote.profile);
            expert.id = newId;
            if (state.personas[oldId]) {
              state.personas[newId] = state.personas[oldId];
              delete state.personas[oldId];
            }
            if (state.skillBindings[oldId]) {
              state.skillBindings[newId] = state.skillBindings[oldId];
              delete state.skillBindings[oldId];
            }
            if (state.toolBindings[oldId]) {
              state.toolBindings[newId] = state.toolBindings[oldId];
              delete state.toolBindings[oldId];
            }
            if (state.toolsetConfigs && state.toolsetConfigs[oldId]) {
              state.toolsetConfigs[newId] = state.toolsetConfigs[oldId];
              delete state.toolsetConfigs[oldId];
            }
            if (state.mcpServers && state.mcpServers[oldId]) {
              state.mcpServers[newId] = state.mcpServers[oldId];
              delete state.mcpServers[oldId];
              syncMcpServersToDetailMeta(newId, state.mcpServers[newId]);
            }
            if (state.imChannels[oldId]) {
              state.imChannels[newId] = state.imChannels[oldId];
              delete state.imChannels[oldId];
            }
            if (state.permissions[oldId]) {
              state.permissions[newId] = state.permissions[oldId];
              delete state.permissions[oldId];
            }
            if (state.workspaceFiles[oldId]) {
              state.workspaceFiles[newId] = state.workspaceFiles[oldId];
              delete state.workspaceFiles[oldId];
            }
            state.tasks.forEach(function (t) {
              if (String(t.expertId) === oldId) t.expertId = newId;
            });
            persist();
            window.dispatchEvent(new CustomEvent('app-store-updated'));
          } else {
            window.dispatchEvent(new CustomEvent('app-store-updated'));
          }
        }).catch(function (error) {
          console.warn('[AppStore] createExpert sidecar request failed:', error && error.message ? error.message : error);
          if (window.ElementPlus && window.ElementPlus.ElMessage) {
            ElementPlus.ElMessage.warning('sidecar 连接异常，当前仅本地保存。请检查 SIDECAR_API_BASE。');
          }
        });
      } else if (!DEV_MOCK) {
        console.warn('[AppStore] createExpert sidecar client unavailable');
      }
      return expert;
    },
    deleteExpert: function (id) {
      state.experts = state.experts.filter(function (e) { return e.id !== id; });
      delete state.personas[id];
      delete state.skillBindings[id];
      delete state.toolBindings[id];
      if (state.toolsetConfigs) delete state.toolsetConfigs[id];
      if (state.mcpServers) delete state.mcpServers[id];
      if (state.expertDetailMeta) delete state.expertDetailMeta[id];
      state.favorites = state.favorites.filter(function (f) { return f !== id; });
      persist();
      if (window.SidecarApi && window.SidecarApi.deleteExpert) {
        window.SidecarApi.deleteExpert(String(id));
      }
    },

    getRunningSessionCount: function (expertId) {
      if (DEV_MOCK && window.getRunningSessionCount) {
        return window.getRunningSessionCount(expertId);
      }
      var count = 0;
      (state.tasks || []).forEach(function (t) {
        if (String(t.expertId) === String(expertId) && t.status === 'running') count++;
      });
      return count;
    },

    getMemoryMd: function (expertId) {
      if (window.MOCK_MEMORY_MD) return window.MOCK_MEMORY_MD;
      return '';
    },

    getUserMd: function (expertId) {
      if (window.MOCK_USER_MD) return window.MOCK_USER_MD;
      return '';
    },

    getWorkspaceRoot: function (expertId) {
      var expert = state.experts.find(function (e) { return String(e.id) === String(expertId); });
      return (expert && expert.workspaceRoot) || ('~/.hermes/profiles/' + expertId + '/workspace');
    },

    updateWorkspaceRoot: function (expertId, path) {
      var expert = state.experts.find(function (e) { return String(e.id) === String(expertId); });
      if (expert) {
        expert.workspaceRoot = path;
        persist();
      }
    },

    isFavorite: function (expertId) {
      return state.favorites.indexOf(expertId) >= 0;
    },
    toggleFavorite: function (expertId) {
      var i = state.favorites.indexOf(expertId);
      if (i >= 0) state.favorites.splice(i, 1);
      else state.favorites.push(expertId);
      persist();
    },

    getPersona: function (expertId) {
      var p = state.personas[expertId];
      if (!p) return { soulMd: '', onboarded: false };
      if (p.soulMd !== undefined) return p;
      var legacy = '';
      if (p.coreDutyMd) legacy += String(p.coreDutyMd);
      if (p.workflowMd) legacy += '\n\n' + String(p.workflowMd);
      if (p.behaviorMd) legacy += '\n\n' + String(p.behaviorMd);
      return { soulMd: legacy, onboarded: false };
    },
    getExpertDetailMeta: function (expertId) {
      return (state.expertDetailMeta && state.expertDetailMeta[expertId]) || {
        skillsDetail: [],
        skillsCatalog: [],
        toolsDetail: {},
        toolsCatalog: [],
        memoryMeta: {},
        gateway: {}
      };
    },
    getSkillsDetail: function (expertId) {
      return this.getExpertDetailMeta(expertId).skillsDetail || [];
    },
    getSkillsCatalog: function (expertId) {
      var meta = this.getExpertDetailMeta(expertId);
      if (meta.skillsCatalog && meta.skillsCatalog.length) return meta.skillsCatalog;
      if (DEV_MOCK && window.SKILLS_CATALOG) {
        return window.SKILLS_CATALOG.map(function (s) {
          return {
            skillId: s.id,
            name: s.name,
            description: s.description || '',
            category: s.category || '',
            provenance: s.provenance || 'bundled'
          };
        });
      }
      return [];
    },
    getToolsDetail: function (expertId) {
      return this.getExpertDetailMeta(expertId).toolsDetail || {};
    },
    getToolsCatalog: function (expertId) {
      var meta = this.getExpertDetailMeta(expertId);
      if (meta.toolsCatalog && meta.toolsCatalog.length) return meta.toolsCatalog;
      if (DEV_MOCK && window.TOOLS_CATALOG) {
        return window.TOOLS_CATALOG.map(function (t) {
          return {
            toolset: t.id,
            name: t.name || t.id,
            label: t.label || t.name || t.id,
            description: t.description || '',
            toolCount: t.toolCount != null ? t.toolCount : (t.tools ? t.tools.length : 0),
            tools: t.tools || [],
            configured: t.configured !== false
          };
        });
      }
      return [];
    },
    /** 全部可配置 toolset + enabled（对齐 platform_toolsets.cli opt-in） */
    getConfigurableToolsets: function (expertId) {
      var key = String(expertId);
      var enabledSet = {};
      normalizeToolIds(state.toolBindings[key] || []).forEach(function (id) {
        enabledSet[id] = true;
      });
      return this.getToolsCatalog(key).map(function (t) {
        var id = t.toolset || t.name || t.id;
        var override = getToolsetConfigOverride(key, id);
        var configured = override && override.configured != null
          ? !!override.configured
          : t.configured !== false;
        return {
          toolset: id,
          name: t.name || id,
          label: t.label || t.name || id,
          description: t.description || '',
          toolCount: t.toolCount != null ? t.toolCount : ((t.tools && t.tools.length) || 0),
          tools: t.tools || [],
          configured: configured,
          enabled: !!enabledSet[id],
          config: (override && override.config) || t.config || getDefaultToolConfig(id)
        };
      });
    },
    getEnabledToolCount: function (expertId) {
      return normalizeToolIds(state.toolBindings[expertId] || []).length;
    },
    getMemoryMeta: function (expertId) {
      return this.getExpertDetailMeta(expertId).memoryMeta || {};
    },
    getGatewayMeta: function (expertId) {
      return this.getExpertDetailMeta(expertId).gateway || {};
    },
    savePersona: function (expertId, persona) {
      var soulMd = persona.soulMd || '';
      var old = state.personas[expertId];
      var oldSoul = old ? (old.soulMd !== undefined ? old.soulMd : [old.coreDutyMd, old.workflowMd, old.behaviorMd].filter(Boolean).join('\n\n')) : '';
      if (oldSoul === soulMd) return;
      var history = (old && old.history) ? old.history.slice(0, 4) : [];
      history.unshift({
        version: history.length + 1,
        savedAt: nowIso(),
        snapshot: { soulMd: oldSoul }
      });
      state.personas[expertId] = {
        soulMd: soulMd,
        onboarded: (old && old.onboarded) || false,
        history: history
      };
      persist();
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.patchExpert) {
        window.SidecarApi.patchExpert(String(expertId), {
          soulMd: soulMd
        });
      }
    },
    setPersonaOnboarded: function (expertId, onboarded) {
      var p = state.personas[expertId] || {};
      if (p.soulMd === undefined) {
        var legacy = [p.coreDutyMd, p.workflowMd, p.behaviorMd].filter(Boolean).join('\n\n');
        p = { soulMd: legacy, onboarded: false };
      }
      p.onboarded = !!onboarded;
      state.personas[expertId] = p;
      persist();
    },
    getPersonaHistory: function (expertId) {
      var p = state.personas[expertId];
      return (p && p.history) ? p.history : [];
    },
    restorePersonaVersion: function (expertId, versionIndex) {
      var p = state.personas[expertId];
      if (!p || !p.history || !p.history[versionIndex]) return null;
      var snap = p.history[versionIndex].snapshot;
      return { coreDutyMd: snap.coreDutyMd, workflowMd: snap.workflowMd, behaviorMd: snap.behaviorMd };
    },

    getSkillIds: function (expertId) {
      // 已启用技能 id（∉ skills.disabled）
      return this.getSkillBindings(expertId)
        .filter(function (b) { return b.enabled !== false; })
        .map(function (b) { return b.skillId; });
    },
    getEnabledSkillCount: function (expertId) {
      return this.getSkillIds(expertId).length;
    },
    getInstalledSkillCount: function (expertId) {
      return this.getSkillBindings(expertId).length;
    },
    getSkillBindings: function (expertId) {
      var raw = state.skillBindings[expertId] || [];
      return ensureFullInstalledSkills(raw);
    },
    setSkillBindings: function (expertId, bindings) {
      var key = String(expertId);
      state.skillBindings[key] = ensureFullInstalledSkills(bindings || []);
      persist();
      var assigned = this.getSkillIds(key);
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertSkills) {
        bumpCapabilityRev(key);
        return sidecarPutSkills(key, assigned);
      }
      return Promise.resolve({ skills: state.skillBindings[key] });
    },
    addSkillBinding: function (expertId, skillId) {
      return this.addSkillBindings(expertId, [skillId]);
    },
    addSkillBindings: function (expertId, skillIds) {
      // 兼容：将技能标记为已安装并启用（不再是「绑定」语义）
      var key = String(expertId);
      var list = this.getSkillBindings(key);
      var byId = {};
      list.forEach(function (s) { byId[s.skillId] = s; });
      var catalog = this.getSkillsCatalog(key);
      var catalogById = {};
      catalog.forEach(function (s) { catalogById[s.skillId] = s; });
      (skillIds || []).forEach(function (skillId) {
        if (!skillId) return;
        var sid = String(skillId).trim();
        if (byId[sid]) {
          byId[sid].enabled = true;
          return;
        }
        var meta = catalogById[sid] || { id: sid, skillId: sid, name: sid };
        byId[sid] = catalogEntryToInstalled(meta, { clearUsage: true, enabled: true });
      });
      state.skillBindings[key] = Object.keys(byId).map(function (k) { return byId[k]; });
      persist();
      var assigned = this.getSkillIds(key);
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertSkills) {
        bumpCapabilityRev(key);
        return sidecarPutSkills(key, assigned);
      }
      return Promise.resolve({ skills: state.skillBindings[key] });
    },
    removeSkillBinding: function (expertId, skillId) {
      // 兼容旧 API：改为禁用（不删文件 / 不从已安装列表移除）
      return this.toggleSkillEnabled(expertId, skillId, false);
    },
    toggleSkillEnabled: function (expertId, skillId, enabled) {
      var key = String(expertId);
      var list = this.getSkillBindings(key);
      var target = String(skillId || '').trim();
      var found = false;
      state.skillBindings[key] = list.map(function (b) {
        if (b.skillId !== target) return b;
        found = true;
        return Object.assign({}, b, { enabled: !!enabled });
      });
      if (!found) return Promise.resolve(null);
      persist();
      bumpCapabilityRev(key);
      window.dispatchEvent(new CustomEvent('app-store-updated', { detail: { expertId: key } }));
      if (!DEV_MOCK && window.SidecarApi) {
        return sidecarToggleSkill(key, target, !!enabled);
      }
      return Promise.resolve({ ok: true, effective: 'next_session', skills: state.skillBindings[key] });
    },
    installHubSkill: function (expertId, skill) {
      return this.installSkill(expertId, skill, 'hub');
    },
    installLocalSkill: function (expertId, skill) {
      return this.installSkill(expertId, skill, 'local');
    },
    installSkill: function (expertId, skill, provenance) {
      var key = String(expertId);
      var list = this.getSkillBindings(key);
      var sid = String((skill && (skill.id || skill.skillId)) || '').trim();
      var source = provenance || (skill && skill.provenance) || 'hub';
      if (!sid) return Promise.reject(new Error('无效的技能'));
      if (list.some(function (s) { return s.skillId === sid; })) {
        return this.toggleSkillEnabled(key, sid, true);
      }
      var entry = catalogEntryToInstalled({
        id: sid,
        name: (skill && (skill.nameZh || skill.name)) || sid,
        description: (skill && skill.description) || '',
        category: (skill && skill.category) || '',
        provenance: source
      }, { clearUsage: true, enabled: true });
      list.push(entry);
      state.skillBindings[key] = list;
      persist();
      bumpCapabilityRev(key);
      window.dispatchEvent(new CustomEvent('app-store-updated', { detail: { expertId: key } }));
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertSkills) {
        return sidecarPutSkills(key, this.getSkillIds(key));
      }
      return Promise.resolve({ skills: state.skillBindings[key] });
    },
    toggleSkillBinding: function (expertId, skillId, enabled) {
      return this.toggleSkillEnabled(expertId, skillId, enabled);
    },
    updateSkillParams: function (expertId, skillId, params) {
      if (!state.skillBindings[expertId]) return;
      state.skillBindings[expertId] = this.getSkillBindings(expertId).map(function (b) {
        if (b.skillId !== skillId) return b;
        return Object.assign({}, b, { params: params });
      });
      persist();
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.patchExpert) {
        window.SidecarApi.patchExpert(String(expertId), { skills: this.getSkillIds(expertId) });
      }
    },

    getToolIds: function (expertId) {
      return normalizeToolIds(state.toolBindings[expertId] || []);
    },
    /** 兼容旧调用：返回已启用列表；UI 请用 getConfigurableToolsets */
    getToolBindings: function (expertId) {
      return this.getConfigurableToolsets(expertId).filter(function (t) { return t.enabled; });
    },
    setToolBindings: function (expertId, bindings) {
      var key = String(expertId);
      // 接受完整行或 id 列表；落盘仅保留 opt-in 已启用 name
      var enabledIds = [];
      (bindings || []).forEach(function (b) {
        if (typeof b === 'string') {
          if (b.trim()) enabledIds.push(b.trim());
          return;
        }
        if (b && b.enabled === false) return;
        var tid = bindingToolId(b);
        if (tid) enabledIds.push(tid);
      });
      state.toolBindings[key] = enabledIds;
      persist();
      bumpCapabilityRev(key);
      window.dispatchEvent(new CustomEvent('app-store-updated', { detail: { expertId: key } }));
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertTools) {
        return sidecarPutTools(key, enabledIds);
      }
      return Promise.resolve({ assigned: { toolsets: enabledIds }, effective: 'next_session' });
    },
    addToolBinding: function (expertId, toolId) {
      return this.toggleToolEnabled(expertId, toolId, true);
    },
    addToolBindings: function (expertId, toolIds) {
      var self = this;
      var chain = Promise.resolve();
      (toolIds || []).forEach(function (toolId) {
        chain = chain.then(function () { return self.toggleToolEnabled(expertId, toolId, true); });
      });
      return chain.then(function () {
        return { assigned: { toolsets: self.getToolIds(expertId) }, effective: 'next_session' };
      });
    },
    removeToolBinding: function (expertId, toolId) {
      return this.toggleToolEnabled(expertId, toolId, false);
    },
    /** 行内开关：写入 / 移出 platform_toolsets.cli（opt-in） */
    toggleToolEnabled: function (expertId, toolId, enabled) {
      var key = String(expertId);
      var target = String(toolId || '').trim();
      if (!target) return Promise.resolve(null);
      var current = normalizeToolIds(state.toolBindings[key] || []);
      var next;
      if (enabled) {
        next = current.indexOf(target) >= 0 ? current : current.concat([target]);
      } else {
        next = current.filter(function (id) { return id !== target; });
      }
      state.toolBindings[key] = next;
      persist();
      bumpCapabilityRev(key);
      window.dispatchEvent(new CustomEvent('app-store-updated', { detail: { expertId: key } }));
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertTools) {
        return sidecarPutTools(key, next).then(function (data) {
          return Object.assign({ ok: true, effective: 'next_session' }, data || {});
        });
      }
      return Promise.resolve({ ok: true, effective: 'next_session', assigned: { toolsets: next } });
    },
    toggleToolBinding: function (expertId, toolId, enabled) {
      return this.toggleToolEnabled(expertId, toolId, enabled);
    },
    updateToolConfig: function (expertId, toolId, config) {
      var key = String(expertId);
      var tid = String(toolId || '').trim();
      if (!tid) return Promise.resolve(null);
      var cfg = config || {};
      var hasConfig = Object.keys(cfg).some(function (k) { return !!cfg[k]; });
      setToolsetConfigOverride(key, tid, {
        config: cfg,
        configured: hasConfig
      });
      persist();
      bumpCapabilityRev(key);
      window.dispatchEvent(new CustomEvent('app-store-updated', { detail: { expertId: key } }));
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.patchExpert) {
        window.SidecarApi.patchExpert(key, { tools: this.getToolIds(key) });
      }
      return Promise.resolve({ ok: true, effective: 'next_session', configured: hasConfig });
    },
    testToolConnection: function (expertId, toolId) {
      var key = String(expertId);
      var tid = String(toolId || '').trim();
      setToolsetConfigOverride(key, tid, { configured: true, status: 'connected' });
      persist();
      return Promise.resolve({ ok: true });
    },

    getMcpServers: function (expertId) {
      var key = String(expertId);
      if (!state.mcpServers) state.mcpServers = {};
      var list = state.mcpServers[key];
      if (!list) {
        var td = ((state.expertDetailMeta || {})[key] || {}).toolsDetail || {};
        list = td.mcpServers || [];
        if (list.length) setMcpServersInternal(key, list);
      }
      return (state.mcpServers[key] || []).map(normalizeMcpServer);
    },
    getMcpEnabledCount: function (expertId) {
      return this.getMcpServers(expertId).filter(function (s) { return s.enabled; }).length;
    },
    getMcpNeedsAttentionCount: function (expertId) {
      return this.getMcpServers(expertId).filter(function (s) {
        return s.enabled && (s.status === 'missing_secret' || s.status === 'connection_failed');
      }).length;
    },
    setMcpServers: function (expertId, list) {
      setMcpServersInternal(expertId, list);
      persist();
      return this.getMcpServers(expertId);
    },
    addMcpServer: function (expertId, payload) {
      var key = String(expertId);
      var list = this.getMcpServers(key).slice();
      var name = String((payload && payload.name) || '').trim();
      if (!name) return Promise.reject(new Error('请填写服务器名称'));
      if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(name)) {
        return Promise.reject(new Error('名称须匹配 ^[a-z0-9][a-z0-9_-]{0,63}$'));
      }
      if (list.some(function (s) { return s.name === name; })) {
        return Promise.reject(new Error('已存在同名 MCP 服务器'));
      }
      var type = (payload.type === 'http') ? 'http' : 'stdio';
      if (type === 'http' && !(payload.url || '').trim()) {
        return Promise.reject(new Error('HTTP 类型须填写 URL'));
      }
      if (type === 'stdio' && !(payload.command || '').trim()) {
        return Promise.reject(new Error('stdio 类型须填写 Command'));
      }
      var env = {};
      var missingEnv = [];
      if (payload.envText) {
        String(payload.envText).split(/\n+/).forEach(function (line) {
          var m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
          if (!m) return;
          env[m[1]] = m[2];
          if (!m[2]) missingEnv.push(m[1]);
        });
      }
      if (payload.secretKey && !(payload.secretValue || '').trim()) {
        missingEnv.push(payload.secretKey);
        env[payload.secretKey] = '';
      } else if (payload.secretKey && payload.secretValue) {
        env[payload.secretKey] = payload.secretValue;
      }
      list.push(normalizeMcpServer({
        name: name,
        type: type,
        url: payload.url || '',
        command: payload.command || '',
        args: payload.args || [],
        env: env,
        enabled: payload.enabled !== false,
        missingEnv: missingEnv,
        status: missingEnv.length ? 'missing_secret' : 'ok'
      }));
      setMcpServersInternal(key, list);
      persist();
      return Promise.resolve(this.getMcpServers(key));
    },
    updateMcpServer: function (expertId, name, patch) {
      var key = String(expertId);
      var list = this.getMcpServers(key).map(function (s) {
        if (s.name !== name) return s;
        return normalizeMcpServer(Object.assign({}, s, patch || {}));
      });
      setMcpServersInternal(key, list);
      persist();
      return Promise.resolve(this.getMcpServers(key));
    },
    toggleMcpServerEnabled: function (expertId, name, enabled) {
      return this.updateMcpServer(expertId, name, { enabled: !!enabled });
    },
    fillMcpSecrets: function (expertId, name, secrets) {
      var key = String(expertId);
      var list = this.getMcpServers(key).map(function (s) {
        if (s.name !== name) return s;
        var env = Object.assign({}, s.env || {});
        var missingEnv = [];
        Object.keys(secrets || {}).forEach(function (k) {
          env[k] = secrets[k];
        });
        Object.keys(env).forEach(function (k) {
          if (env[k] === '' || env[k] == null) missingEnv.push(k);
        });
        return normalizeMcpServer(Object.assign({}, s, {
          env: env,
          missingEnv: missingEnv,
          status: missingEnv.length ? 'missing_secret' : 'ok',
          secretsFilled: !missingEnv.length,
          errorSummary: missingEnv.length ? s.errorSummary : ''
        }));
      });
      setMcpServersInternal(key, list);
      persist();
      return Promise.resolve(this.getMcpServers(key));
    },
    retryMcpConnection: function (expertId, name) {
      var key = String(expertId);
      var list = this.getMcpServers(key).map(function (s) {
        if (s.name !== name) return s;
        if (s.missingEnv && s.missingEnv.length) {
          return normalizeMcpServer(Object.assign({}, s, { status: 'missing_secret' }));
        }
        // Mock：重试后视为连通成功（路径问题样例可手动再改）
        return normalizeMcpServer(Object.assign({}, s, {
          status: 'ok',
          errorSummary: ''
        }));
      });
      setMcpServersInternal(key, list);
      persist();
      return Promise.resolve(this.getMcpServers(key));
    },
    deleteMcpServer: function (expertId, name) {
      var key = String(expertId);
      var list = this.getMcpServers(key).filter(function (s) { return s.name !== name; });
      setMcpServersInternal(key, list);
      persist();
      return Promise.resolve(this.getMcpServers(key));
    },

    getMemories: function (expertId) {
      return state.memories.filter(function (m) { return m.expertId === expertId; });
    },
    addMemory: function (expertId, content, category) {
      var m = {
        id: uid(), expertId: expertId, content: content,
        category: category || 'other',
        scope: 'user', source: 'manual', createdAt: nowIso()
      };
      state.memories.unshift(m);
      persist();
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.postMemory) {
        window.SidecarApi.postMemory(String(expertId), { content: content, category: category || 'other' })
          .then(function (remote) {
            if (remote && remote.id) m.id = remote.id;
            persist();
          });
      }
      return m;
    },
    deleteMemory: function (memoryId, expertId) {
      state.memories = state.memories.filter(function (m) { return m.id !== memoryId; });
      persist();
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.deleteMemory && expertId) {
        window.SidecarApi.deleteMemory(String(expertId), memoryId);
      }
    },
    updateMemory: function (memoryId, patch) {
      var updated = null;
      state.memories = state.memories.map(function (m) {
        if (m.id !== memoryId) return m;
        updated = Object.assign({}, m, patch || {}, { updatedAt: nowIso() });
        return updated;
      });
      persist();
      return updated;
    },

    getTasksByExpert: function (expertId, type, includeArchived) {
      return state.tasks.filter(function (t) {
        if (t.expertId !== expertId) return false;
        if (type && t.type !== type) return false;
        if (!includeArchived && t.archived) return false;
        return true;
      }).sort(function (a, b) {
        return resolveTaskLastActivityAt(b).localeCompare(resolveTaskLastActivityAt(a));
      });
    },
    resolveTaskLastActivityAt: resolveTaskLastActivityAt,
    fetchExpertDetailRemote: async function (expertId) {
      if (DEV_MOCK || !window.SidecarApi || !window.SidecarApi.getExpert) return null;
      var requestId = String(expertId);
      var revAtStart = getCapabilityRev(requestId);
      var detail = await window.SidecarApi.getExpert(requestId);
      if (!detail) return null;
      if (String(detail.profile || detail.id) !== requestId) return null;
      if (getCapabilityRev(requestId) !== revAtStart) {
        return applyExpertDetailRemote(detail, { skipCapabilities: true });
      }
      return applyExpertDetailRemote(detail);
    },
    fetchTasksByExpertRemote: async function (expertId) {
      if (DEV_MOCK || !window.SidecarApi || !window.SidecarApi.listTasks) return null;
      var remote = await window.SidecarApi.listTasks(String(expertId));
      if (!remote) return null;
      var expertKey = String(expertId);
      // 保留本地已设置的 cwd（任务级工作目录），避免远程同步覆盖
      var prevByExpert = {};
      state.tasks.forEach(function (t) {
        if (String(t.expertId) === expertKey && t.cwd) prevByExpert[t.id] = t.cwd;
      });
      var mapped = remote.map(function (t) {
        return {
          id: t.id,
          title: t.title,
          type: 'dialogue',
          status: t.status || 'pending',
          expertId: String(expertId),
          ownerId: 'admin',
          archived: false,
          cwd: t.cwd || prevByExpert[t.id] || DEFAULT_TASK_CWD,
          titleSet: !!t.titleSet,
          createdAt: t.createdAt || nowIso(),
          updatedAt: t.createdAt || nowIso(),
          lastActivityAt: t.lastActivityAt || t.last_activity_at || t.createdAt || nowIso()
        };
      });
      var expertKey = String(expertId);
      state.tasks = state.tasks.filter(function (t) { return String(t.expertId) !== expertKey; });
      mapped.forEach(function (t) { state.tasks.unshift(t); });
      mapped.sort(function (a, b) {
        return resolveTaskLastActivityAt(b).localeCompare(resolveTaskLastActivityAt(a));
      });
      persist();
      return mapped;
    },
    getTask: function (taskId) {
      return state.tasks.find(function (t) { return t.id === taskId; }) || null;
    },
    createTask: function (payload) {
      var task = {
        id: uid(),
        title: payload.title || '新任务',
        type: payload.type || 'dialogue',
        status: 'pending',
        expertId: payload.expertId,
        projectId: payload.projectId || null,
        ownerId: 'admin',
        archived: false,
        cwd: payload.cwd || DEFAULT_TASK_CWD,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastActivityAt: nowIso()
      };
      state.tasks.unshift(task);
      state.messages[task.id] = [];
      persist();
      return task;
    },
    createTaskRemote: async function (expertId, title) {
      if (DEV_MOCK || !window.SidecarApi || !window.SidecarApi.createTask) return null;
      var remote = await window.SidecarApi.createTask(String(expertId), title || '新任务');
      if (!remote) return null;
      var task = {
        id: remote.id,
        title: remote.title || title || '新任务',
        type: 'dialogue',
        status: remote.status || 'pending',
        expertId: String(expertId),
        ownerId: 'admin',
        archived: false,
        cwd: remote.cwd || DEFAULT_TASK_CWD,
        titleSet: !!remote.titleSet,
        createdAt: remote.createdAt || nowIso(),
        updatedAt: remote.createdAt || nowIso(),
        lastActivityAt: remote.lastActivityAt || remote.last_activity_at || remote.createdAt || nowIso()
      };
      state.tasks.unshift(task);
      state.messages[task.id] = [];
      persist();
      return task;
    },
    updateTask: function (taskId, patch) {
      var t = state.tasks.find(function (x) { return x.id === taskId; });
      if (!t) return null;
      Object.assign(t, patch);
      // 状态/标题变更不更新 lastActivityAt；最近活跃仅随用户发言变化
      if (patch.status !== undefined || patch.title !== undefined) {
        t.userTouched = true;
      }
      if (patch.title !== undefined) {
        t.titleSet = true;
      }
      persist();
      return t;
    },
    updateTaskRemote: async function (expertId, taskId, patch) {
      if (DEV_MOCK || !window.SidecarApi || !window.SidecarApi.updateTask) return null;
      var body = {};
      if (patch && patch.title !== undefined) body.title = patch.title;
      if (patch && patch.status !== undefined) body.status = patch.status;
      if (!Object.keys(body).length) return null;
      var resp = await window.SidecarApi.updateTask(String(expertId), String(taskId), body);
      if (!resp || resp.ok !== true) return null;
      var localPatch = Object.assign({}, patch);
      if (resp.title !== undefined) localPatch.title = resp.title;
      if (resp.status !== undefined) localPatch.status = resp.status;
      this.updateTask(taskId, localPatch);
      return resp;
    },
    deleteTask: function (taskId) {
      state.tasks = state.tasks.filter(function (t) { return t.id !== taskId; });
      delete state.messages[taskId];
      if (state.taskArtifacts) {
        state.taskArtifacts = state.taskArtifacts.filter(function (a) { return a.taskId !== taskId; });
      }
      persist();
    },
    deleteTaskRemote: async function (expertId, taskId) {
      if (DEV_MOCK || !window.SidecarApi || !window.SidecarApi.deleteTask) return null;
      var resp = await window.SidecarApi.deleteTask(String(expertId), String(taskId));
      if (!resp || resp.ok !== true) return null;
      this.deleteTask(taskId);
      return true;
    },
    archiveTask: function (taskId, archived) {
      var t = state.tasks.find(function (x) { return x.id === taskId; });
      if (!t) return null;
      t.archived = !!archived;
      if (t.archived) t.archivedAt = nowIso();
      else delete t.archivedAt;
      t.updatedAt = nowIso();
      persist();
      return t;
    },

    getMessages: function (taskId) {
      return (state.messages[taskId] || []).filter(function (m) {
        // 迁移：过滤掉旧版本残留的 skill 类消息（PRD 2.5.6 不做技能卡片）
        return m.type !== 'skill';
      });
    },
    fetchTaskMessagesRemote: async function (expertId, taskId) {
      if (DEV_MOCK || !window.SidecarApi || !window.SidecarApi.listMessages) return null;
      var remote = await window.SidecarApi.listMessages(String(expertId), String(taskId));
      if (!remote) return null;
      return remote.map(function (m) {
        return {
          id: m.id,
          role: m.role === 'assistant' ? 'expert' : m.role,
          type: m.type || m.msgType || 'chat',
          content: m.content,
          expertId: String(expertId),
          // 工具调用相关
          toolName: m.toolName || null,
          params: m.params || null,
          summary: m.summary || null,
          duration: m.duration || null,
          progress: m.progress || null,
          isError: m.isError || false,
          // 子智能体相关
          subagentName: m.subagentName || null,
          goal: m.goal || null,
          subagentEvents: m.subagentEvents || null,
          // 澄清提问相关
          requestId: m.requestId || null,
          question: m.question || null,
          choices: m.choices || null,
          answer: m.answer || null,
          // 危险操作审批相关
          command: m.command || null,
          description: m.description || null,
          allowPermanent: m.allowPermanent || false,
          choice: m.choice || null,
          // 状态/进度行
          statusKind: m.statusKind || null,
          createdAt: m.createdAt
        };
      });
    },
    addMessage: function (taskId, msg) {
      if (!state.messages[taskId]) state.messages[taskId] = [];
      var message = {
        id: uid(),
        role: msg.role,
        type: msg.type || 'chat',
        content: msg.content,
        expertId: msg.expertId || null,
        // 工具调用相关（tool.start / tool.progress / tool.complete）
        toolName: msg.toolName || null,
        params: msg.params || null,
        summary: msg.summary || null,
        duration: msg.duration || null,
        progress: msg.progress || null,
        isError: msg.isError || false,
        // 子智能体相关（subagent.spawn_requested / start / complete）
        subagentName: msg.subagentName || null,
        goal: msg.goal || null,
        subagentStatus: msg.subagentStatus || null,
        subagentDuration: msg.subagentDuration != null ? msg.subagentDuration : null,
        subagentSummary: msg.subagentSummary || null,
        subagentEvents: normalizeSubagentEvents(msg.subagentEvents) || null,
        // 澄清提问相关（clarify.request / respond）
        requestId: msg.requestId || null,
        question: msg.question || null,
        choices: msg.choices || null,
        answer: msg.answer || null,
        // 危险操作审批相关（approval.request / respond）
        command: msg.command || null,
        description: msg.description || null,
        allowPermanent: msg.allowPermanent || false,
        choice: msg.choice || null,
        // 状态/进度行（status.update kind=process/goal）
        statusKind: msg.statusKind || null,
        attachments: msg.attachments || null,
        createdAt: nowIso()
      };
      state.messages[taskId].push(message);
      var task = state.tasks.find(function (t) { return t.id === taskId; });
      if (task && msg.role === 'user') {
        task.lastActivityAt = message.createdAt;
        task.updatedAt = message.createdAt;
        task.userTouched = true;
      }
      if (DEV_MOCK && task && msg.role === 'user' && !task.titleSet) {
        task.title = msg.content.slice(0, 30) + (msg.content.length > 30 ? '…' : '');
        task.titleSet = true;
      }
      persist();
      return message;
    },
    sendTaskMessageRemote: async function (expertId, taskId, content) {
      if (DEV_MOCK || !window.SidecarApi || !window.SidecarApi.sendMessage) return null;
      return await window.SidecarApi.sendMessage(String(expertId), String(taskId), content || '');
    },
    fetchTaskProgressRemote: async function (expertId, taskId) {
      if (DEV_MOCK || !window.SidecarApi || !window.SidecarApi.listProgress) return null;
      return await window.SidecarApi.listProgress(String(expertId), String(taskId));
    },

    getProjects: function (visibility) {
      return state.projects.filter(function (p) {
        if (!visibility || visibility === 'all') return true;
        return p.visibility === visibility;
      }).sort(function (a, b) {
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
    },
    getProject: function (id) {
      return state.projects.find(function (p) { return sameId(p.id, id); }) || null;
    },
    createProject: function (payload) {
      payload = payload || {};
      var project = {
        id: uid(),
        slug: uniqueProjectSlug(payload.name),
        name: payload.name,
        icon: payload.icon || '📁',
        description: payload.description,
        defaultWorkdir: payload.defaultWorkdir || payload.workdir || '',
        visibility: payload.visibility || 'public',
        status: 'active',
        orchestratorProfileId: payload.orchestratorProfileId || null,
        defaultAssignee: payload.defaultAssignee || null,
        autoDecomposeEnabled: payload.autoDecomposeEnabled !== false,
        updatedAt: nowIso()
      };
      state.projects.unshift(project);
      state.projectMessages[project.id] = [
        { id: uid(), role: 'system', content: '项目「' + project.name + '」已创建。', createdAt: nowIso() }
      ];
      (payload.expertIds || []).forEach(function (eid) {
        AppStore.addProjectMember(project.id, eid);
      });
      AppStore.addProjectEvent(project.id, {
        type: 'project_created',
        category: 'project',
        title: '项目创建',
        content: '项目「' + project.name + '」已创建并初始化为 Kanban Board。'
      }, { skipPersist: true });
      persist();
      return project;
    },
    saveProject: function (project) {
      var idx = state.projects.findIndex(function (p) { return sameId(p.id, project.id); });
      project.updatedAt = nowIso();
      project.slug = project.slug || uniqueProjectSlug(project.name, project.id);
      project.defaultWorkdir = project.defaultWorkdir || project.workdir || '';
      if (project.orchestratorProfileId === undefined) project.orchestratorProfileId = null;
      if (project.defaultAssignee === undefined) project.defaultAssignee = null;
      if (project.autoDecomposeEnabled === undefined) project.autoDecomposeEnabled = true;
      if (idx >= 0) state.projects[idx] = project;
      persist();
      return project;
    },
    deleteProject: function (id) {
      var removedTaskIds = state.tasks.filter(function (t) { return sameId(t.projectId, id); }).map(function (t) { return t.id; });
      state.projects = state.projects.filter(function (p) { return !sameId(p.id, id); });
      state.projectMembers = state.projectMembers.filter(function (m) { return !sameId(m.projectId, id); });
      delete state.projectMessages[id];
      state.projectOutputs = state.projectOutputs.filter(function (o) { return !sameId(o.projectId, id); });
      state.projectTasks = state.projectTasks.filter(function (t) { return !sameId(t.projectId, id); });
      state.projectEvents = (state.projectEvents || []).filter(function (e) { return !sameId(e.projectId, id); });
      state.projectFiles = state.projectFiles.filter(function (f) { return !sameId(f.projectId, id); });
      state.tasks = state.tasks.filter(function (t) { return !sameId(t.projectId, id); });
      removedTaskIds.forEach(function (tid) { delete state.messages[tid]; });
      persist();
    },

    getProjectMembers: function (projectId) {
      return state.projectMembers.filter(function (m) { return sameId(m.projectId, projectId); });
    },
    addProjectMember: function (projectId, expertId) {
      if (state.projectMembers.some(function (m) { return sameId(m.projectId, projectId) && sameId(m.expertId, expertId); })) return;
      state.projectMembers.push({
        id: uid(),
        projectId: projectId,
        expertId: expertId,
        role: 'member',
        progress: 0,
        progressSummary: '待分配任务',
        joinedAt: nowIso()
      });
      markProjectUserTouched(projectId);
      var pMember = state.projects.find(function (x) { return sameId(x.id, projectId); });
      if (pMember) pMember.updatedAt = nowIso();
      persist();
    },
    removeProjectMember: function (memberId) {
      var member = state.projectMembers.find(function (m) { return m.id === memberId; });
      if (member) markProjectUserTouched(member.projectId);
      state.projectMembers = state.projectMembers.filter(function (m) { return m.id !== memberId; });
      persist();
    },
    updateMemberProgress: function (memberId, progress, summary) {
      var m = state.projectMembers.find(function (x) { return x.id === memberId; });
      if (!m) return;
      m.progress = progress;
      if (summary !== undefined) m.progressSummary = summary;
      persist();
    },

    getProjectsByExpert: function (expertId, visibility) {
      var pids = state.projectMembers.filter(function (m) { return m.expertId === expertId; }).map(function (m) { return m.projectId; });
      return state.projects.filter(function (p) {
        if (!pids.some(function (pid) { return sameId(pid, p.id); })) return false;
        if (visibility && p.visibility !== visibility) return false;
        return true;
      });
    },

    getProjectMessages: function (projectId) {
      return state.projectMessages[projectId] || [];
    },
    addProjectMessage: function (projectId, msg) {
      if (!state.projectMessages[projectId]) state.projectMessages[projectId] = [];
      var message = {
        id: uid(),
        role: msg.role,
        type: msg.type || 'chat',
        taskId: msg.taskId || null,
        toolName: msg.toolName || null,
        targetExpertId: msg.targetExpertId || null,
        scope: msg.scope || null,
        content: msg.content,
        expertId: msg.expertId || null,
        attachments: msg.attachments || null,
        createdAt: nowIso()
      };
      if (msg.role === 'user') message.fromUser = true;
      state.projectMessages[projectId].push(message);
      var p = state.projects.find(function (x) { return sameId(x.id, projectId); });
      if (p) {
        if (msg.role === 'user') markProjectUserTouched(projectId);
        p.updatedAt = nowIso();
      }
      persist();
      return message;
    },

    getProjectOutputs: function (projectId) {
      return state.projectOutputs.filter(function (o) { return sameId(o.projectId, projectId); });
    },
    addProjectEvent: function (projectId, payload, opts) {
      opts = opts || {};
      if (!state.projectEvents) state.projectEvents = [];
      var event = {
        id: uid(),
        projectId: projectId,
        taskId: payload.taskId || null,
        expertId: payload.expertId || null,
        type: payload.type || 'project_event',
        category: payload.category || 'project',
        title: payload.title || '项目动态',
        content: payload.content || '',
        meta: payload.meta || null,
        createdAt: payload.createdAt || nowIso()
      };
      state.projectEvents.unshift(event);
      if (!opts.skipPersist) persist();
      return event;
    },
    getProjectEvents: function (projectId, filter) {
      var category = filter && filter !== 'all' ? filter : null;
      return (state.projectEvents || [])
        .filter(function (e) {
          if (!sameId(e.projectId, projectId)) return false;
          if (!category) return true;
          return e.category === category;
        })
        .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    },
    saveProjectWorkdir: function (projectId, workdir) {
      var p = state.projects.find(function (x) { return sameId(x.id, projectId); });
      if (!p) return null;
      p.defaultWorkdir = String(workdir || '').trim();
      p.updatedAt = nowIso();
      AppStore.addProjectEvent(projectId, {
        type: 'workdir_updated',
        category: 'project',
        title: p.defaultWorkdir ? '工作目录已更新' : '工作目录已清空',
        content: p.defaultWorkdir ? ('默认工作目录：' + p.defaultWorkdir) : '已清空项目默认工作目录。'
      }, { skipPersist: true });
      persist();
      return p;
    },
    getProjectTasks: function (projectId) {
      return (state.projectTasks || [])
        .filter(function (t) { return sameId(t.projectId, projectId); })
        .map(function (t) {
          normalizeProjectTaskRecord(t);
          var expert = t.expertId ? AppStore.getExpert(t.expertId) : null;
          var status = normalizeProjectTaskStatus(t.status);
          return Object.assign({}, t, {
            status: status,
            assignee: t.assignee || t.expertId || null,
            expert: expert,
            assigneeLabel: expert ? expert.name : '未指派'
          });
        })
        .sort(function (a, b) {
          var ra = projectTaskStatusRank(a.status);
          var rb = projectTaskStatusRank(b.status);
          if (ra !== rb) return ra - rb;
          return (b.updatedAt || '').localeCompare(a.updatedAt || '') || ((a.sortOrder || 0) - (b.sortOrder || 0));
        });
    },
    createProjectTask: function (projectId, payload) {
      payload = payload || {};
      var title = String(payload.title || '').trim();
      var task = {
        id: uid(),
        projectId: projectId,
        title: title,
        body: String(payload.body || '').trim(),
        status: normalizeProjectTaskStatus(payload.status || 'todo'),
        expertId: payload.assignee || payload.expertId || null,
        assignee: payload.assignee || payload.expertId || null,
        priority: payload.priority || 'medium',
        parentTaskId: payload.parentTaskId || null,
        isTriage: !!payload.isTriage,
        commentCount: 0,
        latestSummary: String(payload.body || '').trim(),
        result: '',
        blockedReason: '',
        sortOrder: Date.now(),
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      if (!state.projectTasks) state.projectTasks = [];
      state.projectTasks.unshift(task);
      var p = state.projects.find(function (x) { return sameId(x.id, projectId); });
      if (p) p.updatedAt = nowIso();
      AppStore.addProjectEvent(projectId, {
        type: 'task_created',
        category: 'task',
        taskId: task.id,
        expertId: task.expertId,
        title: '任务创建',
        content: '创建任务「' + task.title + '」' + (task.expertId ? ('，负责人：' + ((AppStore.getExpert(task.expertId) || {}).name || '未知专家')) : '，暂未指派负责人。')
      }, { skipPersist: true });
      persist();
      return task;
    },
    decomposeProjectTask: function (projectId, rootTaskId, plan) {
      var root = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, rootTaskId); });
      if (!root) return { children: [] };
      plan = plan || {};
      root.status = normalizeProjectTaskStatus('running');
      root.latestSummary = '协调专家正在拆解目标并派发子任务';
      root.updatedAt = nowIso();
      AppStore.addProjectEvent(projectId, {
        type: 'task_decompose_started',
        category: 'execution',
        taskId: root.id,
        expertId: root.expertId,
        title: '自动拆解启动',
        content: '协调专家开始拆解目标「' + root.title + '」并派发子任务。'
      }, { skipPersist: true });
      var members = (state.projectMembers || [])
        .filter(function (m) { return sameId(m.projectId, projectId) && !sameId(m.expertId, root.expertId); })
        .map(function (m) { return m.expertId; });
      var children = [];
      var definitions = (plan.children && plan.children.length) ? plan.children : defaultDecomposePlan(root.title);
      definitions.forEach(function (def, idx) {
        var assignee = def.assignee || (members.length ? members[idx % members.length] : null);
        var child = AppStore.createProjectTask(projectId, {
          title: def.title,
          body: def.body || '',
          assignee: assignee,
          priority: def.priority || 'medium',
          status: assignee ? 'ready' : 'todo',
          parentTaskId: root.id
        });
        children.push(child);
        AppStore.addProjectEvent(projectId, {
          type: 'task_dispatched',
          category: 'task',
          taskId: child.id,
          expertId: assignee,
          title: '子任务派发',
          content: '协调专家派发子任务「' + child.title + '」' + (assignee ? ('给 ' + ((AppStore.getExpert(assignee) || {}).name || '专家')) : '，暂未指派。')
        }, { skipPersist: true });
      });
      root.status = normalizeProjectTaskStatus('review');
      root.latestSummary = '已拆解为 ' + children.length + ' 个子任务并完成派发';
      root.updatedAt = nowIso();
      AppStore.addProjectEvent(projectId, {
        type: 'task_decompose_completed',
        category: 'execution',
        taskId: root.id,
        expertId: root.expertId,
        title: '拆解完成',
        content: '目标「' + root.title + '」已拆解为 ' + children.length + ' 个子任务并完成派发。'
      }, { skipPersist: true });
      persist();
      return { root: root, children: children };
    },
    commentProjectTask: function (projectId, taskId, comment) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      var text = String(comment || '').trim();
      task.commentCount = (task.commentCount || 0) + 1;
      if (!Array.isArray(task.comments)) task.comments = [];
      task.comments.push({
        id: uid(),
        author: '当前用户',
        expertId: null,
        body: text,
        createdAt: nowIso()
      });
      task.latestSummary = text;
      task.updatedAt = nowIso();
      if (!Array.isArray(task.taskEvents)) task.taskEvents = [];
      task.taskEvents.unshift({
        id: uid(),
        kind: 'commented',
        label: '添加评论',
        author: '当前用户',
        payload: { reason: text },
        createdAt: nowIso()
      });
      AppStore.addProjectEvent(projectId, {
        type: 'task_commented',
        category: 'comment',
        taskId: task.id,
        expertId: task.expertId,
        title: '任务评论',
        content: '在任务「' + task.title + '」下添加评论：' + text
      }, { skipPersist: true });
      persist();
      return task;
    },
    assignProjectTask: function (projectId, taskId, expertId) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      task.expertId = expertId || null;
      task.assignee = expertId || null;
      if (task.status === 'todo' && expertId) task.status = 'ready';
      task.updatedAt = nowIso();
      var expert = expertId ? AppStore.getExpert(expertId) : null;
      task.latestSummary = expert ? ('已指派给 ' + expert.name) : '已取消负责人';
      if (!Array.isArray(task.taskEvents)) task.taskEvents = [];
      task.taskEvents.unshift({
        id: uid(),
        kind: 'assigned',
        label: '分配负责人',
        author: '当前用户',
        payload: { assignee: expert ? expert.name : '未指派', expertId: expertId },
        createdAt: nowIso()
      });
      AppStore.addProjectEvent(projectId, {
        type: 'task_assigned',
        category: 'task',
        taskId: task.id,
        expertId: expertId || null,
        title: '任务指派',
        content: '任务「' + task.title + '」' + (expert ? ('已指派给 ' + expert.name + '。') : '已取消负责人。')
      }, { skipPersist: true });
      persist();
      return task;
    },
    completeProjectTask: function (projectId, taskId, result) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      var text = String(result || '').trim();
      task.status = 'done';
      task.result = text;
      task.latestSummary = text || '任务已完成';
      task.completedAt = nowIso();
      task.consecutiveFailures = 0;
      task.updatedAt = task.completedAt;
      if (!Array.isArray(task.taskEvents)) task.taskEvents = [];
      task.taskEvents.unshift({
        id: uid(),
        kind: 'completed',
        label: '完成',
        author: '当前用户',
        payload: { result: text },
        createdAt: nowIso()
      });
      AppStore.addProjectEvent(projectId, {
        type: 'task_completed',
        category: 'task',
        taskId: task.id,
        expertId: task.expertId,
        title: '任务完成',
        content: '任务「' + task.title + '」已完成。' + (text ? ('结果：' + text) : '')
      }, { skipPersist: true });
      persist();
      return task;
    },
    blockProjectTask: function (projectId, taskId, reason, blockKind) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      var text = String(reason || '').trim();
      var kind = String(blockKind || '').trim();
      task.status = 'blocked';
      task.blockedReason = text;
      task.blockKind = kind;
      task.consecutiveFailures = (task.consecutiveFailures || 0) + 1;
      task.lastFailureError = text;
      task.latestSummary = text || '任务被阻塞';
      task.updatedAt = nowIso();
      if (!Array.isArray(task.taskEvents)) task.taskEvents = [];
      task.taskEvents.unshift({
        id: uid(),
        kind: 'blocked',
        label: '阻塞',
        author: '当前用户',
        payload: { reason: text, block_kind: kind },
        createdAt: nowIso()
      });
      AppStore.addProjectEvent(projectId, {
        type: 'task_blocked',
        category: 'exception',
        taskId: task.id,
        expertId: task.expertId,
        title: '任务阻塞',
        content: '任务「' + task.title + '」被标记为阻塞。原因：' + text
      }, { skipPersist: true });
      persist();
      return task;
    },
    unblockProjectTask: function (projectId, taskId, reason) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      var text = String(reason || '').trim();
      task.status = normalizeProjectTaskStatus('ready');
      task.blockedReason = '';
      task.consecutiveFailures = 0;
      task.latestSummary = text ? ('已重启：' + text) : '任务已重启';
      task.updatedAt = nowIso();
      if (!Array.isArray(task.taskEvents)) task.taskEvents = [];
      task.taskEvents.unshift({
        id: uid(),
        kind: 'unblocked',
        label: '解除阻塞',
        author: '当前用户',
        payload: { reason: text },
        createdAt: nowIso()
      });
      AppStore.addProjectEvent(projectId, {
        type: 'task_unblocked',
        category: 'task',
        taskId: task.id,
        expertId: task.expertId,
        title: '任务重启',
        content: '任务「' + task.title + '」已解除阻塞并重启。' + (text ? ('说明：' + text) : '')
      }, { skipPersist: true });
      persist();
      return task;
    },
    archiveProjectTask: function (projectId, taskId) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      task.status = normalizeProjectTaskStatus('archived');
      task.latestSummary = '任务已归档';
      task.updatedAt = nowIso();
      AppStore.addProjectEvent(projectId, {
        type: 'task_archived',
        category: 'task',
        taskId: task.id,
        expertId: task.expertId,
        title: '任务归档',
        content: '任务「' + task.title + '」已归档。'
      }, { skipPersist: true });
      persist();
      return task;
    },
    deleteProjectTaskPermanently: function (projectId, taskId) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return false;
      state.projectTasks = state.projectTasks.filter(function (t) { return !(sameId(t.projectId, projectId) && sameId(t.id, taskId)); });
      AppStore.addProjectEvent(projectId, {
        type: 'task_deleted',
        category: 'task',
        taskId: null,
        expertId: task.expertId,
        title: '任务永久删除',
        content: '任务「' + task.title + '」已被永久删除。'
      });
      return true;
    },
    promoteProjectTask: function (projectId, taskId) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      task.status = normalizeProjectTaskStatus('ready');
      task.latestSummary = '任务已晋升为排队中';
      task.updatedAt = nowIso();
      AppStore.addProjectEvent(projectId, {
        type: 'task_promoted',
        category: 'task',
        taskId: task.id,
        expertId: task.expertId,
        title: '任务晋升',
        content: '任务「' + task.title + '」已晋升为排队中。'
      }, { skipPersist: true });
      persist();
      return task;
    },
    reassignProjectTask: function (projectId, taskId, expertId, reason) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      var text = String(reason || '').trim();
      var prevAssignee = task.expertId;
      task.expertId = expertId || null;
      task.assignee = expertId || null;
      task.latestSummary = '已转交给 ' + ((AppStore.getExpert(expertId) || {}).name || '专家');
      task.updatedAt = nowIso();
      var expert = expertId ? AppStore.getExpert(expertId) : null;
      AppStore.addProjectEvent(projectId, {
        type: 'task_reassigned',
        category: 'task',
        taskId: task.id,
        expertId: expertId || null,
        title: '任务转交',
        content: '任务「' + task.title + '」' + (expert ? ('已转交给 ' + expert.name + '。') : '已取消负责人。') + (text ? ('原因：' + text) : '')
      }, { skipPersist: true });
      persist();
      return task;
    },
    editProjectTask: function (projectId, taskId, patch) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      patch = patch || {};
      var changed = [];
      if (patch.title !== undefined && String(patch.title).trim() && patch.title !== task.title) {
        task.title = String(patch.title).trim();
        changed.push('标题');
      }
      if (patch.body !== undefined && patch.body !== task.body) {
        task.body = String(patch.body).trim();
        changed.push('说明');
      }
      if (patch.priority !== undefined && patch.priority !== task.priority) {
        task.priority = patch.priority;
        changed.push('优先级');
      }
      if (patch.result !== undefined && patch.result !== task.result) {
        task.result = String(patch.result).trim();
        changed.push('结果');
      }
      if (patch.blockedReason !== undefined && patch.blockedReason !== task.blockedReason) {
        task.blockedReason = String(patch.blockedReason).trim();
        changed.push('阻塞说明');
      }
      if (!changed.length) return task;
      task.updatedAt = nowIso();
      AppStore.addProjectEvent(projectId, {
        type: 'task_edited',
        category: 'task',
        taskId: task.id,
        expertId: task.expertId,
        title: '任务编辑',
        content: '任务「' + task.title + '」更新了：' + changed.join('、')
      }, { skipPersist: true });
      persist();
      return task;
    },
    moveProjectTaskStatus: function (projectId, taskId, targetStatus) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      var next = normalizeProjectTaskStatus(targetStatus);
      if (!next || next === task.status) return task;
      var prev = task.status;
      task.status = next;
      if (next === 'done') task.completedAt = nowIso();
      if (next !== 'blocked') task.blockedReason = '';
      task.latestSummary = '状态从「' + prev + '」变更为「' + next + '」';
      task.updatedAt = nowIso();
      AppStore.addProjectEvent(projectId, {
        type: 'task_status_moved',
        category: 'task',
        taskId: task.id,
        expertId: task.expertId,
        title: '任务状态变更',
        content: '任务「' + task.title + '」状态从「' + prev + '」变更为「' + next + '」。'
      }, { skipPersist: true });
      persist();
      return task;
    },
    getChildProjectTasks: function (projectId, parentTaskId) {
      return (state.projectTasks || []).filter(function (t) {
        return sameId(t.projectId, projectId) && sameId(t.parentTaskId, parentTaskId);
      });
    },
    getRootProjectTasks: function (projectId) {
      return (state.projectTasks || [])
        .filter(function (t) {
          if (!sameId(t.projectId, projectId)) return false;
          return t.isTriage === true;
        })
        .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    },
    normalizeProjectTaskStatus: normalizeProjectTaskStatus,
    getProjectFiles: function (projectId) {
      return (state.projectFiles || [])
        .filter(function (f) { return sameId(f.projectId, projectId); })
        .sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    },
    addProjectOutput: function (payload) {
      var o = {
        id: uid(),
        projectId: payload.projectId,
        expertId: payload.expertId || null,
        title: payload.title,
        content: payload.content,
        createdAt: nowIso()
      };
      state.projectOutputs.unshift(o);
      persist();
      return o;
    },
    addProjectFile: function (payload) {
      var f = {
        id: uid(),
        projectId: payload.projectId,
        name: payload.name,
        type: payload.type || 'document',
        status: payload.status || 'ready',
        content: payload.content || '',
        expertId: payload.expertId || null,
        updatedAt: nowIso()
      };
      if (!state.projectFiles) state.projectFiles = [];
      state.projectFiles.unshift(f);
      markProjectUserTouched(payload.projectId);
      var p = state.projects.find(function (x) { return sameId(x.id, payload.projectId); });
      if (p) p.updatedAt = nowIso();
      persist();
      return f;
    },

    getImChannels: function (expertId) {
      return state.imChannels[expertId] || [];
    },
    findImCredentialConflict: function (expertId, lockField, lockValue) {
      // dev mock：前端不持久化凭据明文，无法精确比对，默认不报冲突。
      // 真实场景由后端 acquire_scoped_lock 校验（PUT /im-channels/<platform> 返回 409 + conflict_profile）。
      // 如需演示冲突 UX，可在 demo-data.js 预置一个占用凭据的专家并在此处匹配。
      return null;
    },
    saveImChannels: function (expertId, channels, opts) {
      opts = opts || {};
      state.imChannels[expertId] = channels;
      if (opts.gatewayEnabled !== undefined) {
        state.expertDetailMeta = state.expertDetailMeta || {};
        var prev = state.expertDetailMeta[expertId] || {};
        state.expertDetailMeta[expertId] = Object.assign({}, prev, {
          gateway: Object.assign({}, prev.gateway || {}, { enabled: !!opts.gatewayEnabled })
        });
      }
      persist();
      if (opts.skipRemote) return;
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putImChannels) {
        window.SidecarApi.putImChannels(String(expertId), {
          channels: channels,
          gatewayEnabled: opts.gatewayEnabled
        });
      }
    },

    getPermissions: function (expertId) {
      if (!state.permissions[expertId]) {
        if (DEV_MOCK) {
          state.permissions[expertId] = [
            { id: uid(), subjectType: 'role', subjectId: 'admin', permission: 'admin', label: '管理员' },
            { id: uid(), subjectType: 'role', subjectId: 'user', permission: 'use', label: '普通用户（可使用）' }
          ];
          persist();
        } else {
          state.permissions[expertId] = [];
        }
      }
      return state.permissions[expertId];
    },
    savePermissions: function (expertId, list) {
      state.permissions[expertId] = list;
      persist();
    },

    getWorkspaceFiles: function (expertId) {
      return (state.workspaceFiles[expertId] || []).map(function (item) {
        return Object.assign({ parentId: null }, item);
      }).sort(function (a, b) {
        if ((a.kind === 'folder') !== (b.kind === 'folder')) return a.kind === 'folder' ? -1 : 1;
        if (a.kind === 'folder') return (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN');
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    },
    // 阶段3：组装树形结构
    getWorkspaceTree: function (expertId) {
      var list = state.workspaceFiles[expertId] || [];
      function build(parentId) {
        var nodes = list.filter(function (x) {
          var pid = x.parentId ? String(x.parentId) : null;
          return (pid || null) === (parentId || null);
        }).map(function (x) {
          var node = {
            id: x.id,
            name: x.name,
            type: x.kind === 'folder' ? 'folder' : 'file',
            kind: x.kind === 'folder' ? 'folder' : (x.kind || 'file'),
            size: x.size || 0,
            mime: x.mime || '',
            content: x.content || '',
            previewUrl: x.previewUrl || ''
          };
          if (node.type === 'folder') {
            node.children = build(x.id);
          }
          return node;
        });
        nodes.sort(function (a, b) {
          if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
          return (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN');
        });
        return nodes;
      }
      return build(null);
    },
    getFileContent: function (expertId, fileId) {
      var list = state.workspaceFiles[expertId] || [];
      var item = list.find(function (f) { return String(f.id) === String(fileId); });
      if (!item) return null;
      return {
        content: item.content || '',
        previewUrl: item.previewUrl || '',
        mime: item.mime || '',
        size: item.size || 0
      };
    },
    addWorkspaceFolder: function (expertId, payload) {
      if (!state.workspaceFiles[expertId]) state.workspaceFiles[expertId] = [];
      var parentId = payload && payload.parentId ? String(payload.parentId) : null;
      var name = String(payload && payload.name || '').trim();
      var folder = {
        id: uid(),
        name: name,
        type: 'folder',
        kind: 'folder',
        parentId: parentId,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      state.workspaceFiles[expertId].push(folder);
      persist();
      return folder;
    },
    addWorkspaceFile: function (expertId, payload) {
      if (!state.workspaceFiles[expertId]) state.workspaceFiles[expertId] = [];
      payload = payload || {};
      var f = {
        id: uid(),
        name: typeof payload === 'string' ? payload : payload.name,
        type: payload.type || 'document',
        size: payload.size || 0,
        content: payload.content || '',
        kind: 'material',
        parentId: payload.parentId ? String(payload.parentId) : null,
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      state.workspaceFiles[expertId].push(f);
      persist();
      return f;
    },
    renameWorkspaceItem: function (expertId, itemId, name) {
      var list = state.workspaceFiles[expertId] || [];
      var item = list.find(function (f) { return String(f.id) === String(itemId); });
      if (!item) return null;
      item.name = String(name || '').trim();
      item.updatedAt = nowIso();
      persist();
      return item;
    },
    moveWorkspaceItem: function (expertId, itemId, parentId) {
      var list = state.workspaceFiles[expertId] || [];
      var item = list.find(function (f) { return String(f.id) === String(itemId); });
      if (!item) return false;
      var targetParentId = parentId ? String(parentId) : null;
      if (String(item.id) === String(targetParentId)) return false;
      if (item.kind === 'folder') {
        var cursor = targetParentId;
        while (cursor) {
          if (String(cursor) === String(item.id)) return false;
          var parent = list.find(function (f) { return String(f.id) === String(cursor); });
          cursor = parent && parent.parentId ? String(parent.parentId) : null;
        }
      }
      item.parentId = targetParentId;
      item.updatedAt = nowIso();
      persist();
      return true;
    },
    deleteWorkspaceFile: function (expertId, fileId) {
      if (!state.workspaceFiles[expertId]) return;
      state.workspaceFiles[expertId] = state.workspaceFiles[expertId].filter(function (f) { return String(f.id) !== String(fileId); });
      persist();
    },
    deleteWorkspaceFolder: function (expertId, folderId) {
      if (!state.workspaceFiles[expertId]) return false;
      var hasChildren = state.workspaceFiles[expertId].some(function (f) { return String(f.parentId || '') === String(folderId); });
      if (hasChildren) return false;
      state.workspaceFiles[expertId] = state.workspaceFiles[expertId].filter(function (f) { return String(f.id) !== String(folderId); });
      persist();
      return true;
    },

    getExpertArtifacts: function (expertId) {
      if (!state.taskArtifacts) return [];
      var taskMap = {};
      state.tasks.filter(function (t) { return t.expertId === expertId; }).forEach(function (t) {
        taskMap[t.id] = t.title || '未命名任务';
      });
      return state.taskArtifacts
        .filter(function (a) { return taskMap[a.taskId]; })
        .map(function (a) {
          return Object.assign({}, a, { taskTitle: taskMap[a.taskId] });
        })
        .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    },

    getTaskArtifacts: function (taskId) {
      if (!taskId) return [];
      return state.taskArtifacts
        .filter(function (a) { return a.taskId === taskId; })
        .sort(function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    },
    renameTaskArtifact: function (artifactId, title) {
      if (!state.taskArtifacts || !Array.isArray(state.taskArtifacts)) return null;
      var item = state.taskArtifacts.find(function (a) { return String(a.id) === String(artifactId); });
      if (!item) return null;
      item.title = String(title || '').trim();
      item.updatedAt = nowIso();
      persist();
      return item;
    },
    deleteTaskArtifact: function (artifactId) {
      if (!state.taskArtifacts || !Array.isArray(state.taskArtifacts)) return;
      state.taskArtifacts = state.taskArtifacts.filter(function (a) { return String(a.id) !== String(artifactId); });
      persist();
    },
    fetchTaskArtifactsRemote: async function (expertId, taskId) {
      if (DEV_MOCK || !window.SidecarApi || !window.SidecarApi.listArtifacts) return null;
      var remote = await window.SidecarApi.listArtifacts(String(expertId), String(taskId));
      if (!remote) return null;
      return remote.map(function (a) {
        return {
          id: a.id,
          taskId: String(taskId),
          title: a.title,
          content: a.content || '',
          type: 'document',
          createdAt: a.createdAt || nowIso()
        };
      });
    },
    addTaskArtifact: function (taskId, payload) {
      var a = {
        id: uid(),
        taskId: taskId,
        title: payload.title,
        content: payload.content || '',
        type: payload.type || 'document',
        createdAt: nowIso()
      };
      if (!state.taskArtifacts) state.taskArtifacts = [];
      state.taskArtifacts.unshift(a);
      persist();
      return a;
    },

    resolveMockScript: function (text) {
      var t = String(text || '');
      if (/错误|失败|报错|异常/.test(t)) return 'error';
      if (/思考|think|推理|思路/.test(t)) return 'thought';
      if (/调用工具|工具|查询|检索|tool/.test(t)) return 'tool';
      if (/子智能体|复杂|委派|subagent/i.test(t)) return 'subagent';
      if (/澄清|clarify/.test(t)) return 'clarify';
      if (/审批|确认|approval/.test(t)) return 'approval';
      return 'normal';
    },

    playMockScript: function (expert, taskId, userText, onStep) {
      var cap = getExpertDemoCapabilities(expert.id);
      var kind = this.resolveMockScript(userText);
      var t = String(userText || '');
      var shortT = t.slice(0, 20);
      var steps = [];
      var tool = cap.tool || 'kb_search';

      function later(fn, ms) {
        if (typeof window === 'undefined') return;
        window.setTimeout(function () { try { fn(); } catch (e) {} }, ms);
      }

      function push(step) {
        steps.push(step);
        onStep && onStep(step, steps.length - 1);
      }

      if (kind === 'thought') {
        push({ type: 'thought.start', title: '思考中' });
        later(function () {
          push({ type: 'text.delta', text: '理解用户需求：' + t.slice(0, 24) + '。\n' });
        }, 600);
        later(function () {
          push({ type: 'text.delta', text: '拆解为 3 个子目标：①检索 ②聚合 ③生成结论。\n' });
        }, 1200);
        later(function () {
          push({ type: 'text.delta', text: '预估总耗时 ~4 秒，准备进入执行阶段。' });
        }, 1800);
        later(function () {
          push({ type: 'thought.commit', duration: 1.8 });
          push({ type: 'reply.start' });
          push({ type: 'text.delta', text: '已完成思考，准备开始执行。' });
        }, 2400);
        later(function () {
          push({ type: 'reply.commit', content: '已完成思考，准备开始执行。' });
          push({ type: 'done', script: 'thought' });
        }, 3000);
        return { kind: kind, scheduled: steps.length };
      }

      if (kind === 'tool') {
        push({ type: 'thought.start', title: '思考中' });
        later(function () {
          push({ type: 'text.delta', text: '需要调用 ' + tool + ' 检索相关数据。' });
          push({ type: 'thought.commit', duration: 0.6 });
        }, 600);
        later(function () {
          push({ type: 'tool.start', toolName: tool, params: { query: shortT, source: '内部知识库' } });
        }, 1200);
        later(function () {
          push({ type: 'tool.running', toolName: tool, progress: '检索中…' });
        }, 1800);
        later(function () {
          push({ type: 'tool.commit', toolName: tool, params: { query: shortT, source: '内部知识库' }, summary: '检索到 3 条相关记录并完成聚合', duration: 1.8, isError: false });
        }, 2400);
        later(function () {
          push({ type: 'reply.start' });
          push({ type: 'text.delta', text: '已调用工具完成数据检索，共 3 条记录。' });
        }, 3000);
        later(function () {
          push({ type: 'reply.commit', content: '已调用工具完成数据检索，共 3 条记录。' });
          push({ type: 'done', script: 'tool' });
        }, 3600);
        return { kind: kind, scheduled: steps.length };
      }

      if (kind === 'subagent') {
        push({ type: 'thought.start', title: '思考中' });
        later(function () {
          push({ type: 'text.delta', text: '该任务较复杂，委派子智能体并行处理。' });
          push({ type: 'thought.commit', duration: 0.5 });
        }, 600);
        later(function () {
          push({ type: 'subagent.commit', subagentName: 'research-sub-agent', goal: '收集并整理「' + shortT + '」相关资料', duration: 4.2, summary: '子智能体完成资料收集（5 条结果）', events: [
            { id: 'sa-1', type: 'thought', content: '定位数据源并提取关键信息。', duration: 0.8 },
            { id: 'sa-2', type: 'action', toolName: 'web_search', params: { q: shortT }, summary: '检索到 5 条相关结果', duration: 2.3, content: '[web_search] 执行完成 (2.3s)' },
            { id: 'sa-3', type: 'chat', content: '子智能体已完成资料收集，共 5 条有效结果。' }
          ] });
        }, 1200);
        later(function () {
          push({ type: 'reply.start' });
          push({ type: 'text.delta', text: '子智能体已完成资料收集，共 5 条有效结果。' });
        }, 1800);
        later(function () {
          push({ type: 'reply.commit', content: '子智能体已完成资料收集，共 5 条有效结果。' });
          push({ type: 'done', script: 'subagent' });
        }, 2400);
        return { kind: kind, scheduled: steps.length };
      }

      if (kind === 'error') {
        push({ type: 'thought.start', title: '思考中' });
        later(function () {
          push({ type: 'text.delta', text: '准备调用 ' + tool + ' 检索数据。' });
          push({ type: 'thought.commit', duration: 0.5 });
        }, 600);
        later(function () {
          push({ type: 'tool.start', toolName: tool, params: { query: shortT, source: '内部知识库' } });
        }, 1200);
        later(function () {
          push({ type: 'tool.running', toolName: tool, progress: '连接数据源…' });
        }, 1800);
        later(function () {
          push({ type: 'tool.commit', toolName: tool, params: { query: shortT, source: '内部知识库' }, summary: '连接数据源超时（30s）', duration: 30.0, isError: true });
          push({ type: 'error.commit', content: '工具执行失败：连接数据源超时，已重试 2 次。' });
        }, 2400);
        later(function () {
          push({ type: 'reply.start' });
          push({ type: 'text.delta', text: '抱歉，工具调用失败，建议稍后重试或切换数据源。' });
        }, 3000);
        later(function () {
          push({ type: 'reply.commit', content: '抱歉，工具调用失败，建议稍后重试或切换数据源。' });
          push({ type: 'done', script: 'error' });
        }, 3600);
        return { kind: kind, scheduled: steps.length };
      }

      if (kind === 'clarify') {
        push({ type: 'clarify.commit', requestId: 'clarify-' + Date.now(), question: '请确认您希望分析的维度：', choices: ['按时间趋势', '按地域分布', '按产品类别'] });
        later(function () {
          push({ type: 'done', script: 'clarify' });
        }, 800);
        return { kind: kind, scheduled: steps.length };
      }

      if (kind === 'approval') {
        push({ type: 'approval.commit', requestId: 'approval-' + Date.now(), command: tool, description: '将调用 ' + tool + ' 检索并返回结果，是否继续？', allowPermanent: true });
        later(function () {
          push({ type: 'done', script: 'approval' });
        }, 800);
        return { kind: kind, scheduled: steps.length };
      }

      // normal
      push({ type: 'thought.start', title: '思考中' });
      later(function () {
        push({ type: 'text.delta', text: '理解用户输入并组织回复。' });
        push({ type: 'thought.commit', duration: 0.4 });
      }, 600);
      later(function () {
        push({ type: 'reply.start' });
        push({ type: 'text.delta', text: '基于您描述的情况，我建议先从数据验证入手。\n\n（模拟回复 · 对接引擎后将替换为真实推理结果）' });
      }, 1200);
      later(function () {
        push({ type: 'reply.commit', content: '基于您描述的情况，我建议先从数据验证入手。\n\n（模拟回复 · 对接引擎后将替换为真实推理结果）\n\n针对：「' + t.slice(0, 50) + (t.length > 50 ? '…' : '') + '」' });
        push({ type: 'done', script: 'normal' });
      }, 1800);
      return { kind: kind, scheduled: steps.length };
    },

    mockTaskArtifact: function (expert, taskId, userText) {
      var types = [
        { type: 'report', label: '分析报告' },
        { type: 'document', label: '工作文档' },
        { type: 'data', label: '数据结果' }
      ];
      var pick = types[Math.floor(Math.random() * types.length)];
      var title = pick.label + ' · ' + (userText.slice(0, 12) || '任务产出') + (userText.length > 12 ? '…' : '');
      var content = '由「' + expert.name + '」基于当前对话生成。\n\n要点：' + userText.slice(0, 80) + (userText.length > 80 ? '…' : '') + '\n\n（模拟产物 · 对接引擎后替换为真实输出）';
      return this.addTaskArtifact(taskId, { title: title, content: content, type: pick.type });
    }
  };

  // 阶段3：工作空间 demo 数据（幂等；material 文件来源展示为「用户」）
  function ensureDemoWorkspace(expertId) {
    state.workspaceFiles[expertId] = state.workspaceFiles[expertId] || [];
    var list = state.workspaceFiles[expertId];
    var changed = false;
    var prefix = 'ws-' + expertId + '-';

    function findById(id) {
      return list.find(function (x) { return String(x.id) === String(id); }) || null;
    }

    function ensureFolder(idSuffix, name, parentId) {
      var id = prefix + idSuffix;
      var existing = findById(id);
      if (existing) return existing.id;
      list.push({
        id: id,
        name: name,
        type: 'folder',
        kind: 'folder',
        parentId: parentId || null,
        createdAt: '2026-06-01T09:00:00+08:00',
        updatedAt: '2026-06-01T09:00:00+08:00'
      });
      changed = true;
      return id;
    }

    function ensureFile(idSuffix, name, parentId, payload) {
      var id = prefix + idSuffix;
      if (findById(id)) return id;
      list.push(Object.assign({
        id: id,
        name: name,
        type: 'document',
        kind: 'material',
        size: 0,
        content: '',
        mime: '',
        previewUrl: '',
        parentId: parentId || null,
        createdAt: '2026-06-15T10:30:00+08:00',
        updatedAt: '2026-06-15T10:30:00+08:00',
        updatedBy: '我'
      }, payload || {}));
      changed = true;
      return id;
    }

    var fStation8 = ensureFolder('folder-station8', '工位8', null);
    var fStation3 = ensureFolder('folder-station3', '工位3', null);
    var fStation12 = ensureFolder('folder-station12', '工位12', null);
    var fDeviceA = ensureFolder('folder-device-a', '设备区A', null);
    var fWarehouse = ensureFolder('folder-warehouse', '原料仓', null);
    var fShared = ensureFolder('folder-shared', '共享资料', null);

    var fReports = ensureFolder('folder-s8-reports', '报告', fStation8);
    var fData = ensureFolder('folder-s8-data', '数据', fStation8);
    var fSrc = ensureFolder('folder-s8-refs', '参考资料', fStation8);

    // —— 根目录：用户上传文件（工作空间 Tab 根列表可见，来源=用户）——
    ensureFile('file-root-sop', '产线SOP-总览.md', null, {
      type: 'document', size: 6280, mime: 'text/markdown',
      content: '# 产线 SOP 总览\n\n## 适用范围\n工位 3 / 8 / 12 及设备区 A。\n\n## 开工检查\n1. 安全护栏完好\n2. 气路压力 0.5–0.7 MPa\n3. 视觉相机标定有效期未过\n\n## 异常处理\n- 节拍超差 >10%：呼叫线长\n- 设备报警：按《设备急停处置》执行'
    });
    ensureFile('file-root-layout', '车间布局图说明.md', null, {
      type: 'document', size: 4120, mime: 'text/markdown',
      content: '# 车间布局图说明\n\n- A 区：原料仓 → 上料缓冲\n- B 区：工位 3 / 7 协作机器人\n- C 区：工位 8 视觉检测\n- D 区：包装与出货\n\n坐标原点：西北角立柱，单位 mm。'
    });
    ensureFile('file-root-checklist', '班前检查表.xlsx', null, {
      type: 'spreadsheet', size: 18432, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    ensureFile('file-root-contacts', '产线联系人.xlsx', null, {
      type: 'spreadsheet', size: 9216, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    ensureFile('file-root-photo', '现场照片-工位8.jpg', null, {
      type: 'document', size: 245760, mime: 'image/jpeg'
    });

    // —— 共享资料 ——
    ensureFile('file-shared-glossary', '术语表.md', fShared, {
      type: 'document', size: 3560, mime: 'text/markdown',
      content: '# 术语表\n\n| 术语 | 含义 |\n|------|------|\n| OEE | 设备综合效率 |\n| FPY | 一次通过率 |\n| CT | 节拍时间 |\n| MTTR | 平均修复时间 |'
    });
    ensureFile('file-shared-template', '任务交接模板.md', fShared, {
      type: 'document', size: 2180, mime: 'text/markdown',
      content: '# 任务交接模板\n\n- 任务名称：\n- 当前进度：\n- 风险点：\n- 待办：\n- 交接人 / 接收人：'
    });

    // —— 工位8 子目录（原有 demo 内容，改为稳定 ID）——
    ensureFile('file-s8-q2', 'Q2-运营分析报告.md', fReports, {
      type: 'document', size: 8420, mime: 'text/markdown',
      content: '# Q2 运营分析报告\n\n## 概要\n- 总访问量 12.4万（环比 +18%）\n- 转化率 3.2%（环比 +0.4pt）\n- 重点品类增长稳定\n\n## 关键发现\n1. 华东区域贡献最大增量\n2. 移动端占比首超 70%\n3. 复购用户ARPU提升 12%\n\n## 建议\n- 加大华东物流投入\n- 优化移动端首屏加载\n- 启动会员复购激励计划'
    });
    ensureFile('file-s8-compete', '竞品对比.xlsx', fReports, {
      type: 'data', size: 24576, mime: 'application/vnd.ms-excel'
    });
    ensureFile('file-s8-meeting', '周会纪要-0701.md', fReports, {
      type: 'document', size: 3120, mime: 'text/markdown',
      content: '# 周会纪要 2026-07-01\n\n## 参会\n- 产品、运营、数据\n\n## 议题\n1. Q2 复盘\n2. Q3 OKR 对齐\n3. 资源调配\n\n## 决议\n- 7月底前完成移动端首屏优化\n- 数据看板新增复购维度'
    });
    ensureFile('file-s8-orders', '订单明细.csv', fData, {
      type: 'data', size: 154320, mime: 'text/csv',
      content: 'order_id,user_id,amount,region,channel,created_at\n1001,u_001,128.50,华东,mobile,2026-06-01 09:12\n1002,u_002,89.00,华南,pc,2026-06-01 10:05\n1003,u_003,256.80,华东,mobile,2026-06-01 11:48\n1004,u_004,42.10,华北,mobile,2026-06-02 08:30\n1005,u_005,310.00,华东,pc,2026-06-02 14:22'
    });
    ensureFile('file-s8-persona', '用户画像.json', fData, {
      type: 'data', size: 5210, mime: 'application/json',
      content: '{\n  "total": 12453,\n  "segments": [\n    { "name": "高价值用户", "count": 823, "ratio": 0.066 },\n    { "name": "潜力用户", "count": 2156, "ratio": 0.173 },\n    { "name": "新用户", "count": 4210, "ratio": 0.338 },\n    { "name": "沉睡用户", "count": 5264, "ratio": 0.423 }\n  ]\n}'
    });
    ensureFile('file-s8-whitepaper', '行业白皮书.pdf', fSrc, {
      type: 'document', size: 1024576, mime: 'application/pdf'
    });
    ensureFile('file-s8-manual', '产品手册.md', fSrc, {
      type: 'document', size: 15820, mime: 'text/markdown',
      content: '# 产品使用手册 v3.2\n\n## 1. 快速开始\n注册账号 → 创建工作空间 → 邀请成员\n\n## 2. 核心功能\n- 任务编排\n- 工具调用\n- 数据接入\n\n## 3. 进阶用法\n- 子智能体委派\n- 多轮澄清\n- 审批流转'
    });

    // —— 其他工位 / 区域用户资料 ——
    ensureFile('file-s3-layout', '工位3空间测量记录.md', fStation3, {
      type: 'document', size: 2680, mime: 'text/markdown',
      content: '# 工位3空间测量\n\n- 宽度：1800 mm\n- 进深：2200 mm\n- 可拆除料架后净宽：约 +600 mm\n- 结论：可部署 UR5e'
    });
    ensureFile('file-s12-agv', 'AGV路径草图说明.md', fStation12, {
      type: 'document', size: 2940, mime: 'text/markdown',
      content: '# AGV 路径草图\n\n起点：原料仓出库口\n途经：缓冲站 B2 → 工位 12\n终点：线边仓\n\n备注：转弯半径 ≥ 0.8 m，避免与人行通道交叉。'
    });
    ensureFile('file-device-a-list', '设备台账-A区.csv', fDeviceA, {
      type: 'data', size: 8192, mime: 'text/csv',
      content: 'asset_id,name,status,last_pm\nEQ-A01,拧紧枪#1,运行,2026-05-20\nEQ-A02,拧紧枪#2,待机,2026-05-20\nEQ-A03,视觉光源控制器,运行,2026-06-01'
    });
    ensureFile('file-wh-stock', '原料库存快照.json', fWarehouse, {
      type: 'data', size: 2460, mime: 'application/json',
      content: '{\n  "asOf": "2026-07-14",\n  "items": [\n    { "sku": "SCR-M4", "qty": 12000, "unit": "pcs" },\n    { "sku": "PCB-A12", "qty": 860, "unit": "pcs" },\n    { "sku": "CASE-BK", "qty": 420, "unit": "pcs" }\n  ]\n}'
    });

    if (changed) persist();
  }
  window.AppStore.ensureDemoWorkspace = ensureDemoWorkspace;

  window.AppStore.init();
})();
