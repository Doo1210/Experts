/**
 * localStorage 数据层 — 专家 & 项目原型
 */
(function () {
  const STORAGE_KEY = 'expert_platform_v1';
  const DEFAULT_EXPERT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#e8eef8"/><circle cx="40" cy="29" r="13" fill="#b8c5dc"/><ellipse cx="40" cy="63" rx="21" ry="15" fill="#b8c5dc"/></svg>'
  );
  // 任务级默认工作目录：每个对话任务独立绑定 cwd（PRD 10.7 / 2.2 一任务一 session）
  const DEFAULT_TASK_CWD = '工位8';
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

  function getDefaultToolConfig(toolId) {
    var schema = (window.TOOL_PARAM_SCHEMAS || {})[toolId];
    if (!schema) return {};
    var config = {};
    schema.forEach(function (s) { config[s.key] = s.default !== undefined ? s.default : ''; });
    return config;
  }

  function addMinutesIso(baseIso, minutes) {
    var d = new Date(String(baseIso).replace(' ', 'T'));
    if (isNaN(d.getTime())) return baseIso;
    d.setMinutes(d.getMinutes() + (minutes || 0));
    return d.toISOString().slice(0, 19).replace('T', ' ');
  }

  function getExpertDemoCapabilities(expertId) {
    var skillIds = state.skillBindings[expertId] || [];
    var toolIds = state.toolBindings[expertId] || [];
    var skill = (window.SKILLS_CATALOG || []).find(function (s) { return s.id === skillIds[0]; });
    var tool = (window.TOOLS_CATALOG || []).find(function (t) { return t.id === toolIds[0]; });
    return {
      skill: skill ? skill.name : '专业分析',
      tool: tool ? tool.name : '数据查询'
    };
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
    var task = {
      id: uid(),
      title: def.title,
      type: 'dialogue',
      status: def.status || 'pending',
      expertId: expertId,
      ownerId: 'admin',
      archived: false,
      titleSet: true,
      createdAt: createdAt,
      updatedAt: createdAt
    };
    state.tasks.unshift(task);
    var demoMessages = buildDemoMessages(def, createdAt, expertId);
    state.messages[task.id] = demoMessages;
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
      projectTaskSchemaVersion: null
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
    if (!data || !Array.isArray(data.assigned)) return;
    mergeExpertDetailMeta(expertId, {
      skillsDetail: data.assigned,
      skillsCatalog: data.catalog || []
    });
    state.skillBindings[expertId] = data.assigned.map(function (s) {
      return {
        skillId: s.skillId,
        params: {},
        name: s.name,
        description: s.description,
        category: s.category || '',
        useCount: s.useCount || 0
      };
    });
    persist();
    bumpCapabilityRev(expertId);
    window.dispatchEvent(new CustomEvent('app-store-updated', { detail: { expertId: String(expertId) } }));
  }

  function applyToolsApiResponse(expertId, data) {
    if (!data) return;
    var assignedBlock = data.assigned || {};
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
        if (!data || !Array.isArray(data.assigned)) {
          var err = window.SidecarApi.getLastError && window.SidecarApi.getLastError();
          return Promise.reject(new Error((err && err.message) || '保存技能配给失败'));
        }
        applySkillsApiResponse(String(expertId), data);
        return data;
      });
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
        state.skillBindings[expertId] = e.skillsDetail.map(function (s) {
          return {
            skillId: s.skillId,
            params: {},
            name: s.name,
            description: s.description,
            category: s.category || '',
            useCount: s.useCount || 0
          };
        });
      } else if (DEV_MOCK && Array.isArray(e.skills) && !detail) {
        state.skillBindings[expertId] = e.skills.map(function (sid) {
          return { skillId: sid, enabled: true, params: getDefaultSkillParams(sid) };
        });
      } else if (detail && e.skillBindings && e.skillBindings.length) {
        state.skillBindings[expertId] = e.skillBindings.map(function (b) {
          return { skillId: b.skillId, enabled: b.enabled !== false, params: b.params || {} };
        });
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
  }

  async function syncExpertsFromSidecar() {
    if (DEV_MOCK) return;
    if (!window.SidecarApi || !window.SidecarApi.listExperts) return;
    state.skillBindings = {};
    state.toolBindings = {};
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

  function seedExpertToStateExpert(seed) {
    return {
      id: String(seed.id),
      name: seed.name,
      avatar: seed.avatar,
      description: seed.description,
      expertise: (seed.expertise || []).slice(0, 3),
      category: seed.category,
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
      return {
        id: String(e.id),
        name: e.name,
        avatar: e.avatar,
        description: e.description,
        expertise: (e.expertise || []).slice(0, 3),
        category: e.category,
        visibility: 'public',
        status: 'active',
        updatedAt: e.updatedAt || nowIso()
      };
    });

    state.experts = seedExperts;
    state.favorites = seedExperts.filter(function (_, i) {
      return window.EXPERTS_DATA[i] && window.EXPERTS_DATA[i].favorited;
    }).map(function (e) { return e.id; });

    seedExperts.forEach(function (e) {
      state.personas[e.id] = {
        coreDutyMd: '## 核心职责\n\n负责「' + e.name + '」职责范围内的专业咨询与方案输出。',
        workflowMd: '## 工作流程\n\n1. 理解需求\n2. 收集数据\n3. 分析诊断\n4. 输出建议',
        behaviorMd: '## 行为准则\n\n- 基于事实与数据\n- 结论清晰可执行\n- 主动确认关键假设'
      };
      state.skillBindings[e.id] = [window.SKILLS_CATALOG[0].id];
      if (window.SKILLS_CATALOG[1]) state.skillBindings[e.id].push(window.SKILLS_CATALOG[1].id);
      state.toolBindings[e.id] = [window.TOOLS_CATALOG[0].id];
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
      var ptSpc = uid();
      var ptRoot = uid();
      var ptDevice = uid();
      state.projectTasks = [
        { id: ptSpc, projectId: p1.id, title: 'SPC 数据分析', status: 'queued', expertId: seedExperts[4].id, sortOrder: 0 },
        { id: ptRoot, projectId: p1.id, title: '良率根因分析', status: 'done', expertId: seedExperts[0].id, sortOrder: 1 },
        { id: ptDevice, projectId: p1.id, title: '设备关联分析', status: 'running', expertId: seedExperts[2].id, sortOrder: 2 },
        { id: uid(), projectId: p2.id, title: '需求预测建模', status: 'running', expertId: seedExperts[3].id, sortOrder: 0 },
        { id: uid(), projectId: p2.id, title: '数据治理规范', status: 'running', expertId: seedExperts[5].id, sortOrder: 1 },
        { id: uid(), projectId: p2.id, title: '多工厂仿真验证', status: 'queued', expertId: null, sortOrder: 2 }
      ];
      state.projectFiles = [
        { id: uid(), projectId: p1.id, name: '良率波动根因分析.md', type: 'document', status: 'updating', expertId: seedExperts[0].id, content: '# 良率波动根因分析\n\n## 初步结论\netch 区 3 号 chamber 压力偏差 +12%…', updatedAt: nowIso() },
        { id: uid(), projectId: p1.id, name: 'SPC 控制图模板.xlsx', type: 'spreadsheet', status: 'ready', content: 'SPC 模板：UCL / LCL / 中心线参数占位', updatedAt: nowIso() },
        { id: uid(), projectId: p1.id, name: 'MES 良率原始数据.csv', type: 'data', status: 'ready', content: 'date,site,yield\n2026-05-01,etch-3,0.912', updatedAt: nowIso() }
      ];
    }

    seedExperts.forEach(function (e) {
      if (getDemoDialogueTaskBundle(e.id).length) ensureDemoDialogueTasks(e.id);
    });

    persist();
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
    }
    persist();
  }

  function defaultProjectTasksFor(p) {
    var members = state.projectMembers.filter(function (m) { return sameId(m.projectId, p.id); });
    if (p.name.indexOf('良率') >= 0 && members.length >= 2) {
      var lead = members[0];
      var device = members.find(function (m) { return m.expertId !== lead.expertId; }) || members[1];
      var quality = members.find(function (m) {
        return m.expertId !== lead.expertId && m.expertId !== device.expertId;
      }) || members[0];
      return [
        { id: uid(), projectId: p.id, title: 'SPC 数据分析', status: 'queued', expertId: quality.expertId, sortOrder: 0 },
        { id: uid(), projectId: p.id, title: '良率根因分析', status: 'done', expertId: lead.expertId, sortOrder: 1 },
        { id: uid(), projectId: p.id, title: '设备关联分析', status: 'running', expertId: device.expertId, sortOrder: 2 }
      ];
    }
    if (p.name.indexOf('供应链') >= 0 && members.length >= 2) {
      return [
        { id: uid(), projectId: p.id, title: '需求预测建模', status: 'running', expertId: members[0].expertId, sortOrder: 0 },
        { id: uid(), projectId: p.id, title: '数据治理规范', status: 'running', expertId: members[1].expertId, sortOrder: 1 },
        { id: uid(), projectId: p.id, title: '多工厂仿真验证', status: 'queued', expertId: null, sortOrder: 2 }
      ];
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
    'SPC 数据分析': 'queued',
    '良率根因分析': 'done',
    '设备关联分析': 'running',
    '需求预测建模': 'running',
    '数据治理规范': 'running',
    '多工厂仿真验证': 'queued',
    '任务拆解': 'queued',
    '数据收集': 'queued',
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
        { id: uid(), projectId: p.id, name: '良率波动根因分析.md', type: 'document', status: 'updating', content: '# 良率波动根因分析\n\n撰写中…', updatedAt: nowIso() },
        { id: uid(), projectId: p.id, name: 'SPC 控制图模板.xlsx', type: 'spreadsheet', status: 'ready', content: 'SPC 模板占位', updatedAt: nowIso() }
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
      }
      migrateExpertRoleNames();
      if (sanitizeLegacyConversationMessages(state.messages)) persist();
      else if (normalizeLegacyActionMessages(state.messages)) persist();
      if (DEV_MOCK) {
        migrateSeedExpertProfiles();
      }
      migrateProjectIds();
      seedDemoProjectsIfEmpty();
      migrateProjectsVisibility();
      migrateProjectsKanbanFields();
      migrateProjectTasks();
      migrateProjectTaskTitles();
      migrateProjectTaskStatus();
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
      var expert = {
        id: uid(),
        name: payload.name,
        avatar: payload.avatar || DEFAULT_EXPERT_AVATAR,
        description: payload.description,
        expertise: (payload.expertise || []).slice(0, 3),
        category: payload.category || '工艺制造',
        visibility: payload.visibility || 'internal',
        status: 'active',
        updatedAt: nowIso()
      };
      state.experts.unshift(expert);
      state.personas[expert.id] = payload.persona || { coreDutyMd: '', workflowMd: '', behaviorMd: '' };
      state.skillBindings[expert.id] = payload.skillIds || [];
      state.toolBindings[expert.id] = payload.toolIds || [];
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
      state.favorites = state.favorites.filter(function (f) { return f !== id; });
      persist();
      if (window.SidecarApi && window.SidecarApi.deleteExpert) {
        window.SidecarApi.deleteExpert(String(id));
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
      return state.personas[expertId] || { coreDutyMd: '', workflowMd: '', behaviorMd: '' };
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
            category: s.category || ''
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
            label: t.name,
            description: t.description || '',
            configured: true
          };
        });
      }
      return [];
    },
    getMemoryMeta: function (expertId) {
      return this.getExpertDetailMeta(expertId).memoryMeta || {};
    },
    getGatewayMeta: function (expertId) {
      return this.getExpertDetailMeta(expertId).gateway || {};
    },
    savePersona: function (expertId, persona) {
      var old = state.personas[expertId];
      if (old && old.coreDutyMd === persona.coreDutyMd && old.workflowMd === persona.workflowMd && old.behaviorMd === persona.behaviorMd) {
        return;
      }
      var history = (old && old.history) ? old.history.slice(0, 4) : [];
      history.unshift({
        version: history.length + 1,
        savedAt: nowIso(),
        snapshot: {
          coreDutyMd: old ? old.coreDutyMd || '' : '',
          workflowMd: old ? old.workflowMd || '' : '',
          behaviorMd: old ? old.behaviorMd || '' : ''
        }
      });
      state.personas[expertId] = {
        coreDutyMd: persona.coreDutyMd,
        workflowMd: persona.workflowMd,
        behaviorMd: persona.behaviorMd,
        history: history
      };
      persist();
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.patchExpert) {
        window.SidecarApi.patchExpert(String(expertId), {
          coreDutyMd: persona.coreDutyMd || '',
          workflowMd: persona.workflowMd || '',
          behaviorMd: persona.behaviorMd || ''
        });
      }
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
      return normalizeSkillIds(state.skillBindings[expertId] || []);
    },
    getSkillBindings: function (expertId) {
      var raw = state.skillBindings[expertId] || [];
      return raw.map(function (b) {
        if (typeof b === 'string') {
          return { skillId: b, enabled: true, params: getDefaultSkillParams(b) };
        }
        var sid = bindingSkillId(b);
        return Object.assign({}, b, { skillId: sid });
      }).filter(function (b) { return !!b.skillId; });
    },
    setSkillBindings: function (expertId, bindings) {
      var key = String(expertId);
      state.skillBindings[key] = bindings;
      persist();
      var assigned = normalizeSkillIds(bindings);
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertSkills) {
        bumpCapabilityRev(key);
        return sidecarPutSkills(key, assigned);
      }
      return Promise.resolve({ assigned: state.skillBindings[key] });
    },
    addSkillBinding: function (expertId, skillId) {
      return this.addSkillBindings(expertId, [skillId]);
    },
    addSkillBindings: function (expertId, skillIds) {
      var key = String(expertId);
      if (!state.skillBindings[key]) state.skillBindings[key] = [];
      var catalog = this.getSkillsCatalog(key);
      var catalogById = {};
      catalog.forEach(function (s) { catalogById[s.skillId] = s; });
      (skillIds || []).forEach(function (skillId) {
        if (!skillId) return;
        var sid = String(skillId).trim();
        if (state.skillBindings[key].some(function (b) { return bindingSkillId(b) === sid; })) return;
        var meta = catalogById[sid] || {};
        state.skillBindings[key].push({
          skillId: sid,
          params: getDefaultSkillParams(sid),
          name: meta.name || sid,
          description: meta.description || '',
          category: meta.category || ''
        });
      });
      persist();
      var assigned = this.getSkillIds(key);
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertSkills) {
        bumpCapabilityRev(key);
        return sidecarPutSkills(key, assigned);
      }
      return Promise.resolve({ assigned: state.skillBindings[key] });
    },
    removeSkillBinding: function (expertId, skillId) {
      var key = String(expertId);
      if (!state.skillBindings[key]) return Promise.resolve(null);
      var target = String(skillId || '').trim();
      var next = (state.skillBindings[key] || []).filter(function (b) {
        return bindingSkillId(b) !== target;
      });
      var assigned = normalizeSkillIds(next);
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertSkills) {
        bumpCapabilityRev(key);
        return sidecarPutSkills(key, assigned);
      }
      state.skillBindings[key] = next;
      persist();
      return Promise.resolve({ assigned: state.skillBindings[key] });
    },
    toggleSkillBinding: function (expertId, skillId, enabled) {
      if (!state.skillBindings[expertId]) return;
      state.skillBindings[expertId] = state.skillBindings[expertId].map(function (b) {
        var id = typeof b === 'string' ? b : b.skillId;
        if (id !== skillId) return b;
        if (typeof b === 'string') return { skillId: b, enabled: enabled, params: getDefaultSkillParams(b) };
        return Object.assign({}, b, { enabled: enabled });
      });
      persist();
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.patchExpert) {
        window.SidecarApi.patchExpert(String(expertId), { skills: this.getSkillIds(expertId) });
      }
    },
    updateSkillParams: function (expertId, skillId, params) {
      if (!state.skillBindings[expertId]) return;
      state.skillBindings[expertId] = state.skillBindings[expertId].map(function (b) {
        var id = typeof b === 'string' ? b : b.skillId;
        if (id !== skillId) return b;
        if (typeof b === 'string') return { skillId: b, enabled: true, params: params };
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
    getToolBindings: function (expertId) {
      var raw = state.toolBindings[expertId] || [];
      return raw.map(function (b) {
        if (typeof b === 'string') {
          return { toolId: b, enabled: true, status: 'unconfigured', config: getDefaultToolConfig(b) };
        }
        return b;
      });
    },
    setToolBindings: function (expertId, bindings) {
      var key = String(expertId);
      state.toolBindings[key] = bindings;
      persist();
      var assigned = normalizeToolIds(bindings);
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertTools) {
        bumpCapabilityRev(key);
        return sidecarPutTools(key, assigned);
      }
      return Promise.resolve({ assigned: { toolsets: state.toolBindings[key] } });
    },
    addToolBinding: function (expertId, toolId) {
      return this.addToolBindings(expertId, [toolId]);
    },
    addToolBindings: function (expertId, toolIds) {
      var key = String(expertId);
      if (!state.toolBindings[key]) state.toolBindings[key] = [];
      var catalog = this.getToolsCatalog(key);
      var catalogById = {};
      catalog.forEach(function (t) { catalogById[t.toolset] = t; });
      (toolIds || []).forEach(function (toolId) {
        if (!toolId) return;
        var tid = String(toolId).trim();
        if (state.toolBindings[key].some(function (b) { return bindingToolId(b) === tid; })) return;
        var meta = catalogById[tid] || {};
        state.toolBindings[key].push({
          toolId: tid,
          toolset: tid,
          label: meta.label || tid,
          description: meta.description || '',
          status: meta.configured === false ? 'unconfigured' : 'configured',
          config: getDefaultToolConfig(tid)
        });
      });
      persist();
      var assigned = this.getToolIds(key);
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertTools) {
        bumpCapabilityRev(key);
        return sidecarPutTools(key, assigned);
      }
      return Promise.resolve({ assigned: { toolsets: state.toolBindings[key] } });
    },
    removeToolBinding: function (expertId, toolId) {
      var key = String(expertId);
      if (!state.toolBindings[key]) return Promise.resolve(null);
      var target = String(toolId || '').trim();
      var next = (state.toolBindings[key] || []).filter(function (b) {
        return bindingToolId(b) !== target;
      });
      var assigned = normalizeToolIds(next);
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.putExpertTools) {
        bumpCapabilityRev(key);
        return sidecarPutTools(key, assigned);
      }
      state.toolBindings[key] = next;
      persist();
      return Promise.resolve({ assigned: { toolsets: state.toolBindings[key] } });
    },
    toggleToolBinding: function (expertId, toolId, enabled) {
      if (!state.toolBindings[expertId]) return;
      state.toolBindings[expertId] = state.toolBindings[expertId].map(function (b) {
        var id = typeof b === 'string' ? b : b.toolId;
        if (id !== toolId) return b;
        if (typeof b === 'string') return { toolId: b, enabled: enabled, status: 'unconfigured', config: getDefaultToolConfig(b) };
        return Object.assign({}, b, { enabled: enabled });
      });
      persist();
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.patchExpert) {
        window.SidecarApi.patchExpert(String(expertId), { tools: this.getToolIds(expertId) });
      }
    },
    updateToolConfig: function (expertId, toolId, config) {
      if (!state.toolBindings[expertId]) return;
      state.toolBindings[expertId] = state.toolBindings[expertId].map(function (b) {
        var id = typeof b === 'string' ? b : b.toolId;
        if (id !== toolId) return b;
        var hasConfig = config && Object.keys(config).some(function (k) { return config[k]; });
        if (typeof b === 'string') return { toolId: b, enabled: true, status: hasConfig ? 'configured' : 'unconfigured', config: config || {} };
        return Object.assign({}, b, { config: config || {}, status: hasConfig ? 'configured' : 'unconfigured' });
      });
      persist();
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.patchExpert) {
        window.SidecarApi.patchExpert(String(expertId), { tools: this.getToolIds(expertId) });
      }
    },
    testToolConnection: function (expertId, toolId) {
      if (!state.toolBindings[expertId]) return;
      state.toolBindings[expertId] = state.toolBindings[expertId].map(function (b) {
        var id = typeof b === 'string' ? b : b.toolId;
        if (id !== toolId) return b;
        if (typeof b === 'string') return { toolId: b, enabled: true, status: 'connected', config: getDefaultToolConfig(b) };
        return Object.assign({}, b, { status: 'connected' });
      });
      persist();
      if (!DEV_MOCK && window.SidecarApi && window.SidecarApi.patchExpert) {
        window.SidecarApi.patchExpert(String(expertId), { tools: this.getToolIds(expertId) });
      }
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
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      });
    },
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
          updatedAt: t.createdAt || nowIso()
        };
      });
      var expertKey = String(expertId);
      state.tasks = state.tasks.filter(function (t) { return String(t.expertId) !== expertKey; });
      mapped.forEach(function (t) { state.tasks.unshift(t); });
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
        updatedAt: nowIso()
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
        updatedAt: remote.createdAt || nowIso()
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
      // 仅状态/标题变更视为任务活动，更新 updatedAt 以反映「最近活跃」排序；
      // cwd 等会话级配置变更不应触发任务卡片重排
      if (patch.status !== undefined || patch.title !== undefined) {
        t.userTouched = true;
        t.updatedAt = nowIso();
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
      if (task) {
        task.updatedAt = nowIso();
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
      task.latestSummary = text;
      task.updatedAt = nowIso();
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
      task.updatedAt = task.completedAt;
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
    blockProjectTask: function (projectId, taskId, reason) {
      var task = (state.projectTasks || []).find(function (t) { return sameId(t.projectId, projectId) && sameId(t.id, taskId); });
      if (!task) return null;
      var text = String(reason || '').trim();
      task.status = 'blocked';
      task.blockedReason = text;
      task.latestSummary = text || '任务被阻塞';
      task.updatedAt = nowIso();
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
      task.latestSummary = text ? ('已重启：' + text) : '任务已重启';
      task.updatedAt = nowIso();
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
          return t.isTriage || normalizeProjectTaskStatus(t.status) === 'triage';
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

  // 阶段3：工作空间 demo 数据
  function ensureDemoWorkspace(expertId) {
    state.workspaceFiles[expertId] = state.workspaceFiles[expertId] || [];
    var list = state.workspaceFiles[expertId];
    // 已有 demo 数据则跳过
    var hasDemo = list.some(function (x) { return String(x.id || '').indexOf('ws-' + expertId + '-') === 0; });
    if (hasDemo) return;

    function addFolder(name, parentId) {
      var f = {
        id: 'ws-' + expertId + '-f-' + list.length,
        name: name, type: 'folder', kind: 'folder',
        parentId: parentId || null,
        createdAt: '2026-06-01T09:00:00+08:00', updatedAt: '2026-06-01T09:00:00+08:00'
      };
      list.push(f);
      return f.id;
    }
    function addFile(name, parentId, payload) {
      var f = Object.assign({
        id: 'ws-' + expertId + '-d-' + list.length,
        name: name, type: 'document', kind: 'material',
        size: 0, content: '', mime: '', previewUrl: '',
        parentId: parentId || null,
        createdAt: '2026-06-15T10:30:00+08:00', updatedAt: '2026-06-15T10:30:00+08:00'
      }, payload || {});
      list.push(f);
    }

    var rootReports = addFolder('工位8', null);
    var fReports = addFolder('报告', rootReports);
    var fData = addFolder('数据', rootReports);
    var fSrc = addFolder('参考资料', rootReports);

    addFile('Q2-运营分析报告.md', fReports, {
      type: 'document', size: 8420, mime: 'text/markdown',
      content: '# Q2 运营分析报告\n\n## 概要\n- 总访问量 12.4万（环比 +18%）\n- 转化率 3.2%（环比 +0.4pt）\n- 重点品类增长稳定\n\n## 关键发现\n1. 华东区域贡献最大增量\n2. 移动端占比首超 70%\n3. 复购用户ARPU提升 12%\n\n## 建议\n- 加大华东物流投入\n- 优化移动端首屏加载\n- 启动会员复购激励计划'
    });
    addFile('竞品对比.xlsx', fReports, { type: 'data', size: 24576, mime: 'application/vnd.ms-excel' });
    addFile('周会纪要-0701.md', fReports, {
      type: 'document', size: 3120, mime: 'text/markdown',
      content: '# 周会纪要 2026-07-01\n\n## 参会\n- 产品、运营、数据\n\n## 议题\n1. Q2 复盘\n2. Q3 OKR 对齐\n3. 资源调配\n\n## 决议\n- 7月底前完成移动端首屏优化\n- 数据看板新增复购维度'
    });

    addFile('订单明细.csv', fData, {
      type: 'data', size: 154320, mime: 'text/csv',
      content: 'order_id,user_id,amount,region,channel,created_at\n1001,u_001,128.50,华东,mobile,2026-06-01 09:12\n1002,u_002,89.00,华南,pc,2026-06-01 10:05\n1003,u_003,256.80,华东,mobile,2026-06-01 11:48\n1004,u_004,42.10,华北,mobile,2026-06-02 08:30\n1005,u_005,310.00,华东,pc,2026-06-02 14:22'
    });
    addFile('用户画像.json', fData, {
      type: 'data', size: 5210, mime: 'application/json',
      content: '{\n  "total": 12453,\n  "segments": [\n    { "name": "高价值用户", "count": 823, "ratio": 0.066 },\n    { "name": "潜力用户", "count": 2156, "ratio": 0.173 },\n    { "name": "新用户", "count": 4210, "ratio": 0.338 },\n    { "name": "沉睡用户", "count": 5264, "ratio": 0.423 }\n  ]\n}'
    });

    addFile('行业白皮书.pdf', fSrc, { type: 'document', size: 1024576, mime: 'application/pdf' });
    addFile('产品手册.md', fSrc, {
      type: 'document', size: 15820, mime: 'text/markdown',
      content: '# 产品使用手册 v3.2\n\n## 1. 快速开始\n注册账号 → 创建工作空间 → 邀请成员\n\n## 2. 核心功能\n- 任务编排\n- 工具调用\n- 数据接入\n\n## 3. 进阶用法\n- 子智能体委派\n- 多轮澄清\n- 审批流转'
    });

    persist();
  }
  window.AppStore.ensureDemoWorkspace = ensureDemoWorkspace;

  window.AppStore.init();
})();
