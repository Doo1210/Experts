/**
 * localStorage 数据层 — 专家 & 项目原型
 */
(function () {
  const STORAGE_KEY = 'expert_platform_v1';

  function uid() {
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function nowIso() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
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
      taskArtifacts: []
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

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = load();

  function persist() {
    save(state);
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
        scope: 'user',
        source: 'manual',
        createdAt: nowIso()
      });
    });

    var p1 = {
      id: uid(),
      name: '12寸产线良率提升项目',
      description: '针对近期良率波动，组织工艺、质量、设备专家联合攻关。',
      visibility: 'public',
      status: 'active',
      updatedAt: nowIso()
    };
    var p2 = {
      id: uid(),
      name: '供应链数字化规划',
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
        { id: ptRoot, projectId: p1.id, title: '良率根因分析', status: 'tool', expertId: seedExperts[0].id, sortOrder: 1 },
        { id: ptDevice, projectId: p1.id, title: '设备关联分析', status: 'thinking', expertId: seedExperts[2].id, sortOrder: 2 },
        { id: uid(), projectId: p2.id, title: '需求预测建模', status: 'running', expertId: seedExperts[3].id, sortOrder: 0 },
        { id: uid(), projectId: p2.id, title: '数据治理规范', status: 'running', expertId: seedExperts[5].id, sortOrder: 1 },
        { id: uid(), projectId: p2.id, title: '多工厂仿真验证', status: 'queued', expertId: null, sortOrder: 2 }
      ];
      state.projectFiles = [
        { id: uid(), projectId: p1.id, name: '良率波动根因分析.md', type: 'document', status: 'updating', expertId: seedExperts[0].id, content: '# 良率波动根因分析\n\n## 初步结论\netch 区 3 号 chamber 压力偏差 +12%…', updatedAt: nowIso() },
        { id: uid(), projectId: p1.id, name: 'SPC 控制图模板.xlsx', type: 'spreadsheet', status: 'ready', content: 'SPC 模板：UCL / LCL / 中心线参数占位', updatedAt: nowIso() },
        { id: uid(), projectId: p1.id, name: 'MES 良率原始数据.csv', type: 'data', status: 'ready', content: 'date,site,yield\n2026-05-01,etch-3,0.912', updatedAt: nowIso() }
      ];
      state.projectMessages[p1.id] = [
        { id: uid(), role: 'system', type: 'chat', taskId: null, content: '项目已创建，项目经理已拆解子任务，各位专家请同步进展。', createdAt: nowIso() },
        { id: uid(), role: 'user', type: 'chat', taskId: ptRoot, content: '请工艺专家先输出良率波动根因摘要。', createdAt: nowIso() },
        { id: uid(), role: 'expert', type: 'thought', taskId: ptRoot, expertId: seedExperts[0].id, content: 'Thought: 需要先拉取近 4 周各站点良率趋势，对比 etch 区 chamber 参数变更记录，再交叉 SPC 异常点。', createdAt: nowIso() },
        { id: uid(), role: 'expert', type: 'action', taskId: ptRoot, expertId: seedExperts[0].id, toolName: 'MES 数据查询 API', content: '工艺专家正在调用 [MES 数据查询 API] 获取 etch 区良率时序数据…', createdAt: nowIso() },
        { id: uid(), role: 'expert', type: 'chat', taskId: ptRoot, expertId: seedExperts[0].id, content: '收到。初步判断与 etch 区 chamber 参数漂移相关，详细报告今日内提交。', createdAt: nowIso() },
        { id: uid(), role: 'expert', type: 'thought', taskId: ptDevice, expertId: seedExperts[2].id, content: 'Thought: 待根因报告确认后，关联设备 PM 记录与 alarm 日志做交叉验证。', createdAt: nowIso() }
      ];
    }

    var t1 = {
      id: uid(),
      title: '分析上周良率下降原因',
      type: 'dialogue',
      status: 'running',
      expertId: seedExperts[0] ? seedExperts[0].id : '1',
      ownerId: 'admin',
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    state.tasks = [t1];
    state.messages[t1.id] = [
      { id: uid(), role: 'user', content: '请帮我分析上周产线良率下降 2% 的可能原因。', createdAt: nowIso() },
      { id: uid(), role: 'expert', content: '好的。我需要以下数据：1) 各站点良率趋势 2) 缺陷 pareto 3) 关键设备 PM 记录。您可先上传或授权 MES 查询。', createdAt: nowIso() }
    ];
    state.taskArtifacts = [
      {
        id: uid(),
        taskId: t1.id,
        title: '良率数据需求清单',
        content: '请提供：① 各站点良率趋势（近 4 周）② 缺陷 pareto ③ 关键设备 PM 记录',
        type: 'document',
        createdAt: nowIso()
      }
    ];

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
        { id: uid(), projectId: p.id, title: '良率根因分析', status: 'running', expertId: lead.expertId, sortOrder: 1 },
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

  window.AppStore = {
    uid: uid,
    nowIso: nowIso,
    init: function () {
      seedIfEmpty();
      migrateExpertRoleNames();
      migrateProjectsVisibility();
      migrateProjectTasks();
      migrateProjectTaskTitles();
      migrateProjectFiles();
      migrateProjectMessageTypes();
      return state;
    },
    reset: function () {
      state = defaultState();
      persist();
      seedIfEmpty();
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
        avatar: payload.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(payload.name),
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
      state.personas[expertId] = persona;
      persist();
    },

    getSkillIds: function (expertId) {
      return state.skillBindings[expertId] || [];
    },
    setSkillIds: function (expertId, ids) {
      state.skillBindings[expertId] = ids;
      persist();
    },
    getToolIds: function (expertId) {
      return state.toolBindings[expertId] || [];
    },
    setToolIds: function (expertId, ids) {
      state.toolBindings[expertId] = ids;
      persist();
    },

    getMemories: function (expertId) {
      return state.memories.filter(function (m) { return m.expertId === expertId; });
    },
    addMemory: function (expertId, content) {
      var m = { id: uid(), expertId: expertId, content: content, scope: 'user', source: 'manual', createdAt: nowIso() };
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
        status: 'running',
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
        content: msg.content,
        expertId: msg.expertId || null,
        createdAt: nowIso()
      };
      state.messages[taskId].push(message);
      var task = state.tasks.find(function (t) { return t.id === taskId; });
      if (task) task.updatedAt = nowIso();
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
      persist();
    },
    removeProjectMember: function (memberId) {
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
        createdAt: nowIso()
      };
      state.projectMessages[projectId].push(message);
      var p = state.projects.find(function (x) { return x.id === projectId; });
      if (p) p.updatedAt = nowIso();
      persist();
      return message;
    },

    getProjectOutputs: function (projectId) {
      return state.projectOutputs.filter(function (o) { return o.projectId === projectId; });
    },
    getProjectTasks: function (projectId) {
      return (state.projectTasks || [])
        .filter(function (t) { return t.projectId === projectId; })
        .sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); })
        .map(function (t) {
          var expert = t.expertId ? AppStore.getExpert(t.expertId) : null;
          return Object.assign({}, t, {
            expert: expert,
            assigneeLabel: expert ? expert.name : '待分配'
          });
        });
    },
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
    addWorkspaceFile: function (expertId, name) {
      if (!state.workspaceFiles[expertId]) state.workspaceFiles[expertId] = [];
      var f = { id: uid(), name: name, kind: 'material', createdAt: nowIso() };
      state.workspaceFiles[expertId].push(f);
      persist();
      return f;
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
