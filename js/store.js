/**
 * localStorage 数据层 — 专家 & 项目原型
 */
(function () {
  const STORAGE_KEY = 'expert_platform_v1';
  const DEFAULT_EXPERT_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#e8eef8"/><circle cx="40" cy="29" r="13" fill="#b8c5dc"/><ellipse cx="40" cy="63" rx="21" ry="15" fill="#b8c5dc"/></svg>'
  );

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
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
          { role: 'expert', type: 'skill', skillName: cap.skill, content: '正在运用 [' + cap.skill + '] 技能处理该请求…' },
          { role: 'expert', type: 'action', toolName: cap.tool, content: '正在调用 [' + cap.tool + '] 获取相关数据…' }
        );
      }
    }
    return out;
  }

  function taskMessagesHaveRichTypes(msgs) {
    return (msgs || []).some(function (m) {
      return m.type === 'thought' || m.type === 'skill' || m.type === 'action';
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
        skillName: m.skillName || null,
        expertId: m.role === 'expert' ? String(expertId) : null,
        attachments: m.attachments || null,
        createdAt: addMinutesIso(baseIso, offset)
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

  function migrateExpertDialogueMessages() {
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
        if (shouldSyncDemoMessages(task, def, current, expected)) {
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
      projectFiles: [],
      imChannels: {},
      permissions: {},
      workspaceFiles: {},
      taskArtifacts: [],
      demoSyncVersion: null,
      projectTaskSchemaVersion: null
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return { ...defaultState(), ...JSON.parse(raw) };
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

  function seedIfEmpty() {
    if (state.experts.length > 0) return;

    const seedExperts = (window.EXPERTS_DATA || []).map(function (e) {
      return {
        id: String(e.id),
        name: e.name,
        avatar: e.avatar,
        description: e.description,
        expertise: e.expertise || [],
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
      updatedAt: nowIso()
    };
    var p2 = {
      id: uid(),
      name: '供应链数字化规划',
      icon: '📊',
      description: '构建多工厂物料计划数字孪生模型，提升交付准时率。',
      visibility: 'public',
      status: 'active',
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

  function defaultProjectTasksFor(p) {
    var members = state.projectMembers.filter(function (m) { return m.projectId === p.id; });
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
      var project = state.projects.find(function (p) { return p.id === t.projectId; });
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
    if (status === 'done' || status === 'queued' || status === 'running') return status;
    if (status === 'thinking' || status === 'tool' || status === 'waiting' || status === 'error') return 'running';
    return 'queued';
  }

  function projectTaskStatusRank(status) {
    var s = normalizeProjectTaskStatus(status);
    if (s === 'done') return 0;
    if (s === 'running') return 1;
    return 2;
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

  function migrateProjectTaskStatus() {
    var SCHEMA = 2;
    if ((state.projectTaskSchemaVersion || 0) >= SCHEMA) {
      var touched = false;
      (state.projectTasks || []).forEach(function (t) {
        var next = normalizeProjectTaskStatus(t.status);
        if (next !== t.status) {
          t.status = next;
          touched = true;
        }
      });
      if (touched) persist();
      return;
    }

    var updated = false;
    (state.projectTasks || []).forEach(function (t) {
      var legacyStatus = t.status;
      var canonical = DEMO_PROJECT_TASK_STATUSES[t.title];
      var next = canonical || normalizeProjectTaskStatus(legacyStatus);
      if (LEGACY_PROJECT_TASK_STATUSES[legacyStatus] && canonical) next = canonical;
      if (next !== t.status) {
        t.status = next;
        updated = true;
      }
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
      return t.projectId === projectId && t.title === title;
    });
    return task ? task.id : null;
  }

  function findProjectMemberExpertId(projectId, role) {
    var member = (state.projectMembers || []).find(function (m) {
      return m.projectId === projectId && m.role === role;
    });
    return member ? member.expertId : null;
  }

  function getDemoProjectMessageDefs(project) {
    if (!project) return [];
    var pid = project.id;
    if (project.name.indexOf('良率') >= 0) {
      var eProcess = findProjectMemberExpertId(pid, 'lead') ||
        (state.projectTasks.find(function (t) { return t.projectId === pid && t.title === '良率根因分析'; }) || {}).expertId;
      var eQuality = (state.projectTasks.find(function (t) { return t.projectId === pid && t.title === 'SPC 数据分析'; }) || {}).expertId;
      var eDevice = (state.projectTasks.find(function (t) { return t.projectId === pid && t.title === '设备关联分析'; }) || {}).expertId;
      var tRoot = findProjectTaskId(pid, '良率根因分析');
      var tSpc = findProjectTaskId(pid, 'SPC 数据分析');
      var tDevice = findProjectTaskId(pid, '设备关联分析');
      return [
        { role: 'system', type: 'chat', offsetMin: 0, content: '项目已创建，项目经理已拆解子任务，各位专家请同步进展。' },
        { role: 'user', type: 'chat', scope: 'group', offsetMin: 3, content: '请各位专家同步本周良率攻关进展，优先级：根因分析 → 设备关联 → SPC 数据。' },
        { role: 'user', type: 'chat', scope: 'group', taskId: tRoot, offsetMin: 8, content: '请工艺专家先输出良率波动根因摘要。' },
        { role: 'expert', type: 'chat', taskId: tRoot, expertId: eProcess, offsetMin: 12, content: '收到，已开始拉取 etch 区近 4 周良率数据，预计 30 分钟内给出初步判断。' },
        { role: 'expert', type: 'thought', taskId: tRoot, expertId: eProcess, offsetMin: 16, content: 'Thought: 需要先拉取近 4 周各站点良率趋势，对比 etch 区 chamber 参数变更记录，再交叉 SPC 异常点。' },
        { role: 'expert', type: 'action', taskId: tRoot, expertId: eProcess, toolName: 'MES 数据查询 API', offsetMin: 20, content: '正在调用 [MES 数据查询 API] 获取 etch 区良率时序数据…' },
        { role: 'expert', type: 'chat', taskId: tRoot, expertId: eProcess, offsetMin: 28, content: '初步判断与 etch 区 3 号 chamber 压力漂移相关（+12%），详细报告今日内提交。' },
        { role: 'user', type: 'chat', targetExpertId: eQuality, taskId: tSpc, offsetMin: 38, content: '质量专家，SPC 异常点排查进展如何？' },
        { role: 'expert', type: 'thought', taskId: tSpc, expertId: eQuality, offsetMin: 42, content: 'Thought: 需先确认 etch-3 站点控制图异常规则命中情况，再更新缺陷 pareto 对比上周。' },
        { role: 'expert', type: 'chat', taskId: tSpc, expertId: eQuality, offsetMin: 48, content: '已锁定 etch-3 连续 3 点超 UCL，正在生成更新版缺陷 pareto。' },
        { role: 'expert', type: 'action', taskId: tSpc, expertId: eQuality, toolName: 'SPC 分析工具', offsetMin: 55, content: '正在调用 [SPC 分析工具] 生成 etch-3 控制图与判异报告…' },
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
        (state.projectTasks.find(function (t) { return t.projectId === pid && t.title === '需求预测建模'; }) || {}).expertId;
      var eDigital = (state.projectTasks.find(function (t) { return t.projectId === pid && t.title === '数据治理规范'; }) || {}).expertId;
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
        { role: 'expert', type: 'action', taskId: tForecast, expertId: eSupply, toolName: '需求预测引擎', offsetMin: 45, content: '正在调用 [需求预测引擎] 训练多 SKU 预测模型…' },
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
    var project = state.projects.find(function (p) { return p.id === projectId; });
    if (project) project.userTouched = true;
  }

  function projectHasUserActivity(project, messages) {
    if (!project) return false;
    if (project.userTouched) return true;
    return (messages || []).some(function (m) { return m.fromUser; });
  }

  function ensureProjectDemoMessages(projectId) {
    var project = state.projects.find(function (p) { return p.id === projectId; });
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
    migrateExpertDialogueMessages();
    state.demoSyncVersion = DEMO_DATA_VERSION;
    persist();
  }

  window.AppStore = {
    uid: uid,
    nowIso: nowIso,
    init: function () {
      seedIfEmpty();
      migrateExpertRoleNames();
      migrateProjectsVisibility();
      migrateProjectTasks();
      migrateProjectTaskTitles();
      migrateProjectTaskStatus();
      migrateProjectFiles();
      migrateProjectMessageTypes();
      syncDemoData();
      return state;
    },
    reset: function () {
      state = defaultState();
      persist();
      seedIfEmpty();
      syncDemoData();
    },
    getState: function () { return state; },

    getExperts: function () {
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
      return expert;
    },
    createExpert: function (payload) {
      var expert = {
        id: uid(),
        name: payload.name,
        avatar: payload.avatar || DEFAULT_EXPERT_AVATAR,
        description: payload.description,
        expertise: payload.expertise || [],
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
      return expert;
    },
    deleteExpert: function (id) {
      state.experts = state.experts.filter(function (e) { return e.id !== id; });
      delete state.personas[id];
      delete state.skillBindings[id];
      delete state.toolBindings[id];
      state.favorites = state.favorites.filter(function (f) { return f !== id; });
      persist();
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
      var bindings = state.skillBindings[expertId] || [];
      return bindings.map(function (b) { return typeof b === 'string' ? b : b.skillId; });
    },
    getSkillBindings: function (expertId) {
      var raw = state.skillBindings[expertId] || [];
      return raw.map(function (b) {
        if (typeof b === 'string') {
          return { skillId: b, enabled: true, params: getDefaultSkillParams(b) };
        }
        return b;
      });
    },
    setSkillBindings: function (expertId, bindings) {
      state.skillBindings[expertId] = bindings;
      persist();
    },
    addSkillBinding: function (expertId, skillId) {
      if (!state.skillBindings[expertId]) state.skillBindings[expertId] = [];
      if (state.skillBindings[expertId].some(function (b) {
        return (typeof b === 'string' ? b : b.skillId) === skillId;
      })) return;
      state.skillBindings[expertId].push({
        skillId: skillId, enabled: true, params: getDefaultSkillParams(skillId)
      });
      persist();
    },
    removeSkillBinding: function (expertId, skillId) {
      if (!state.skillBindings[expertId]) return;
      state.skillBindings[expertId] = state.skillBindings[expertId].filter(function (b) {
        return (typeof b === 'string' ? b : b.skillId) !== skillId;
      });
      persist();
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
    },

    getToolIds: function (expertId) {
      var bindings = state.toolBindings[expertId] || [];
      return bindings.map(function (b) { return typeof b === 'string' ? b : b.toolId; });
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
      state.toolBindings[expertId] = bindings;
      persist();
    },
    addToolBinding: function (expertId, toolId) {
      if (!state.toolBindings[expertId]) state.toolBindings[expertId] = [];
      if (state.toolBindings[expertId].some(function (b) {
        return (typeof b === 'string' ? b : b.toolId) === toolId;
      })) return;
      state.toolBindings[expertId].push({
        toolId: toolId, enabled: true, status: 'unconfigured', config: getDefaultToolConfig(toolId)
      });
      persist();
    },
    removeToolBinding: function (expertId, toolId) {
      if (!state.toolBindings[expertId]) return;
      state.toolBindings[expertId] = state.toolBindings[expertId].filter(function (b) {
        return (typeof b === 'string' ? b : b.toolId) !== toolId;
      });
      persist();
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
      return m;
    },
    deleteMemory: function (memoryId) {
      state.memories = state.memories.filter(function (m) { return m.id !== memoryId; });
      persist();
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
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      state.tasks.unshift(task);
      state.messages[task.id] = [];
      persist();
      return task;
    },
    updateTask: function (taskId, patch) {
      var t = state.tasks.find(function (x) { return x.id === taskId; });
      if (!t) return null;
      Object.assign(t, patch, { updatedAt: nowIso() });
      if (patch.status !== undefined || patch.title !== undefined) {
        t.userTouched = true;
      }
      persist();
      return t;
    },
    deleteTask: function (taskId) {
      state.tasks = state.tasks.filter(function (t) { return t.id !== taskId; });
      delete state.messages[taskId];
      if (state.taskArtifacts) {
        state.taskArtifacts = state.taskArtifacts.filter(function (a) { return a.taskId !== taskId; });
      }
      persist();
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
      return state.messages[taskId] || [];
    },
    addMessage: function (taskId, msg) {
      if (!state.messages[taskId]) state.messages[taskId] = [];
      var message = {
        id: uid(),
        role: msg.role,
        type: msg.type || 'chat',
        content: msg.content,
        expertId: msg.expertId || null,
        toolName: msg.toolName || null,
        skillName: msg.skillName || null,
        attachments: msg.attachments || null,
        createdAt: nowIso()
      };
      state.messages[taskId].push(message);
      var task = state.tasks.find(function (t) { return t.id === taskId; });
      if (task) {
        task.updatedAt = nowIso();
        task.userTouched = true;
      }
      if (task && msg.role === 'user' && !task.titleSet) {
        task.title = msg.content.slice(0, 30) + (msg.content.length > 30 ? '…' : '');
        task.titleSet = true;
      }
      persist();
      return message;
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
      return state.projects.find(function (p) { return p.id === id; }) || null;
    },
    createProject: function (payload) {
      var project = {
        id: uid(),
        name: payload.name,
        icon: payload.icon || '📁',
        description: payload.description,
        visibility: payload.visibility || 'public',
        status: 'active',
        updatedAt: nowIso()
      };
      state.projects.unshift(project);
      state.projectMessages[project.id] = [
        { id: uid(), role: 'system', content: '项目「' + project.name + '」已创建。', createdAt: nowIso() }
      ];
      (payload.expertIds || []).forEach(function (eid) {
        AppStore.addProjectMember(project.id, eid);
      });
      persist();
      return project;
    },
    saveProject: function (project) {
      var idx = state.projects.findIndex(function (p) { return p.id === project.id; });
      project.updatedAt = nowIso();
      if (idx >= 0) state.projects[idx] = project;
      persist();
      return project;
    },
    deleteProject: function (id) {
      var removedTaskIds = state.tasks.filter(function (t) { return t.projectId === id; }).map(function (t) { return t.id; });
      state.projects = state.projects.filter(function (p) { return p.id !== id; });
      state.projectMembers = state.projectMembers.filter(function (m) { return m.projectId !== id; });
      delete state.projectMessages[id];
      state.projectOutputs = state.projectOutputs.filter(function (o) { return o.projectId !== id; });
      state.projectTasks = state.projectTasks.filter(function (t) { return t.projectId !== id; });
      state.projectFiles = state.projectFiles.filter(function (f) { return f.projectId !== id; });
      state.tasks = state.tasks.filter(function (t) { return t.projectId !== id; });
      removedTaskIds.forEach(function (tid) { delete state.messages[tid]; });
      persist();
    },

    getProjectMembers: function (projectId) {
      return state.projectMembers.filter(function (m) { return m.projectId === projectId; });
    },
    addProjectMember: function (projectId, expertId) {
      if (state.projectMembers.some(function (m) { return m.projectId === projectId && m.expertId === expertId; })) return;
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
      var pMember = state.projects.find(function (x) { return x.id === projectId; });
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
        if (pids.indexOf(p.id) < 0) return false;
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
      var p = state.projects.find(function (x) { return x.id === projectId; });
      if (p) {
        if (msg.role === 'user') markProjectUserTouched(projectId);
        p.updatedAt = nowIso();
      }
      persist();
      return message;
    },

    getProjectOutputs: function (projectId) {
      return state.projectOutputs.filter(function (o) { return o.projectId === projectId; });
    },
    getProjectTasks: function (projectId) {
      return (state.projectTasks || [])
        .filter(function (t) { return t.projectId === projectId; })
        .map(function (t) {
          var expert = t.expertId ? AppStore.getExpert(t.expertId) : null;
          var status = normalizeProjectTaskStatus(t.status);
          return Object.assign({}, t, {
            status: status,
            expert: expert,
            assigneeLabel: expert ? expert.name : '待分配'
          });
        })
        .sort(function (a, b) {
          var ra = projectTaskStatusRank(a.status);
          var rb = projectTaskStatusRank(b.status);
          if (ra !== rb) return ra - rb;
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        });
    },
    normalizeProjectTaskStatus: normalizeProjectTaskStatus,
    getProjectFiles: function (projectId) {
      return (state.projectFiles || [])
        .filter(function (f) { return f.projectId === projectId; })
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
      var p = state.projects.find(function (x) { return x.id === payload.projectId; });
      if (p) p.updatedAt = nowIso();
      persist();
      return f;
    },

    getImChannels: function (expertId) {
      return state.imChannels[expertId] || [];
    },
    saveImChannels: function (expertId, channels) {
      state.imChannels[expertId] = channels;
      persist();
    },

    getPermissions: function (expertId) {
      if (!state.permissions[expertId]) {
        state.permissions[expertId] = [
          { id: uid(), subjectType: 'role', subjectId: 'admin', permission: 'admin', label: '管理员' },
          { id: uid(), subjectType: 'role', subjectId: 'user', permission: 'use', label: '普通用户（可使用）' }
        ];
        persist();
      }
      return state.permissions[expertId];
    },
    savePermissions: function (expertId, list) {
      state.permissions[expertId] = list;
      persist();
    },

    getWorkspaceFiles: function (expertId) {
      return (state.workspaceFiles[expertId] || []).slice().sort(function (a, b) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    },
    addWorkspaceFile: function (expertId, payload) {
      if (!state.workspaceFiles[expertId]) state.workspaceFiles[expertId] = [];
      var f = {
        id: uid(),
        name: typeof payload === 'string' ? payload : payload.name,
        type: payload.type || 'document',
        size: payload.size || 0,
        content: payload.content || '',
        kind: 'material',
        createdAt: nowIso()
      };
      state.workspaceFiles[expertId].push(f);
      persist();
      return f;
    },
    deleteWorkspaceFile: function (expertId, fileId) {
      if (!state.workspaceFiles[expertId]) return;
      state.workspaceFiles[expertId] = state.workspaceFiles[expertId].filter(function (f) { return f.id !== fileId; });
      persist();
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

    mockExpertWorkflowSteps: function (expert, taskId, userText) {
      var cap = getExpertDemoCapabilities(expert.id);
      var snippet = (userText || '').slice(0, 40) + ((userText || '').length > 40 ? '…' : '');
      this.addMessage(taskId, {
        role: 'expert', type: 'thought', expertId: expert.id,
        content: 'Thought: 理解用户需求后，先确认关键假设与所需数据来源。'
      });
      this.addMessage(taskId, {
        role: 'expert', type: 'skill', expertId: expert.id, skillName: cap.skill,
        content: '正在运用 [' + cap.skill + '] 技能分析：「' + (snippet || '当前任务') + '」'
      });
      this.addMessage(taskId, {
        role: 'expert', type: 'action', expertId: expert.id, toolName: cap.tool,
        content: '正在调用 [' + cap.tool + '] 获取相关数据…'
      });
    },

    mockExpertReply: function (expert, userText) {
      var snippets = [
        '基于您描述的情况，我建议先从数据验证入手。',
        '我已结合「' + (expert.expertise[0] || '专业') + '」经验梳理思路，请确认以下假设是否成立。',
        '初步方案已整理，如需我可调用绑定工具进一步分析。',
        '收到。我会整理相关资料，完成后同步给您。'
      ];
      var base = snippets[Math.floor(Math.random() * snippets.length)];
      return base + '\n\n（模拟回复 · 对接引擎后将替换为真实推理结果）\n\n针对：「' + userText.slice(0, 50) + (userText.length > 50 ? '…' : '') + '」';
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

  window.AppStore.init();
})();
