/**
 * 项目详情页
 */
(function () {
  var store = window.AppStore;
  var expertMatchesSearch = window.AppShared.expertMatchesSearch;

  var STATUS_TEXT = {
    triage: '待拆解',
    todo: '待开始',
    scheduled: '已排期',
    ready: '排队中',
    queued: '排队中',
    running: '进行中',
    blocked: '阻塞',
    review: '评审中',
    done: '已完成',
    archived: '已归档'
  };

  var STATUS_TAG = {
    triage: 'warning',
    todo: 'info',
    scheduled: 'warning',
    ready: 'primary',
    queued: 'primary',
    running: 'primary',
    blocked: 'danger',
    review: 'warning',
    done: 'success',
    archived: 'info'
  };

  var STATUS_COLUMNS = [
    { key: 'triage', title: '待拆解', statuses: ['triage'] },
    { key: 'todo', title: '待开始', statuses: ['todo', 'scheduled'] },
    { key: 'ready', title: '排队中', statuses: ['ready', 'queued'] },
    { key: 'running', title: '进行中', statuses: ['running', 'review'] },
    { key: 'blocked', title: '阻塞', statuses: ['blocked'] },
    { key: 'done', title: '已完成', statuses: ['done', 'archived'] }
  ];

  var EVENT_FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'task', label: '任务' },
    { key: 'comment', label: '评论' },
    { key: 'execution', label: '执行' },
    { key: 'exception', label: '异常' }
  ];

  var PRIORITY_OPTIONS = [
    { key: 'low', label: '低' },
    { key: 'medium', label: '中' },
    { key: 'high', label: '高' },
    { key: 'urgent', label: '紧急' }
  ];

  var DRAWER_MODES = {
    taskDetail: '任务详情',
    members: '项目成员'
  };

  var TASK_STATUS_MOVES = {
    triage: [{ key: 'todo', label: '待开始' }],
    todo: [{ key: 'ready', label: '排队中' }, { key: 'blocked', label: '阻塞' }],
    ready: [{ key: 'todo', label: '待开始' }, { key: 'blocked', label: '阻塞' }],
    blocked: [{ key: 'ready', label: '排队中' }, { key: 'todo', label: '待开始' }]
  };

  function normalizeTaskStatus(status) {
    if (store.normalizeProjectTaskStatus) return store.normalizeProjectTaskStatus(status);
    return status || 'todo';
  }

  function trimText(value) {
    return String(value || '').trim();
  }

  function expertNameById(expertId) {
    var expert = store.getExpert(expertId);
    return expert ? expert.name : '未指派';
  }

  var ProjectDetailPage = {
    props: ['projectId', 'initialTab'],
    emits: ['nav'],
    setup: function (props) {
      var project = Vue.ref(null);
      var members = Vue.ref([]);
      var projectTasks = Vue.ref([]);
      var events = Vue.ref([]);
      var allExperts = Vue.ref(store.getExperts());
      var activeTab = Vue.ref(props.initialTab === 'workspace' ? 'workspace' : props.initialTab === 'timeline' ? 'timeline' : 'kanban');
      var kanbanView = Vue.ref('status');
      var highlightExpertId = Vue.ref(null);
      var drawerMode = Vue.ref('taskDetail');
      var drawerVisible = Vue.ref(false);
      var membersSidebarVisible = Vue.ref(false);
      var eventFilter = Vue.ref('all');
      var selectedProjectTaskId = Vue.ref(null);
      var drawerTaskId = Vue.ref(null);
      var workdirDraft = Vue.ref('');
      var workspaceCurrentFolderId = Vue.ref(null);
      var workspaceFolderDialogVisible = Vue.ref(false);
      var workspaceFolderName = Vue.ref('');
      var workspaceFileInput = Vue.ref(null);
      var projectWorkspaceMaterials = Vue.ref([]);
      var showAddMemberDialog = Vue.ref(false);
      var addMemberExpertIds = Vue.ref([]);
      var addMemberSearchQuery = Vue.ref('');
      var showOrchestrationDialog = Vue.ref(false);
      var orchestrationDraft = Vue.ref({ orchestratorProfileId: null, defaultAssignee: null, autoDecomposeEnabled: true });
      var goalForm = Vue.ref({ title: '', description: '', priority: 'medium' });
      var goalSubmitting = Vue.ref(false);
      var historyItems = Vue.ref([]);
      var historyExpandedId = Vue.ref(null);
      var showHistoryCommentDialog = Vue.ref(false);
      var historyCommentDraft = Vue.ref({ taskId: null, text: '' });
      var showManualCreateDialog = Vue.ref(false);
      var manualAdvancedVisible = Vue.ref(false);
      var manualForm = Vue.ref({ title: '', body: '', assignee: '', status: 'todo', parentTaskId: '', priority: 'medium', workdir: '' });
      var cardMenuTaskId = Vue.ref(null);
      var taskAction = Vue.ref({ type: '', taskId: null });
      var taskActionForm = Vue.ref({ comment: '', assignee: '', result: '', blockedReason: '', unblockReason: '', reassignReason: '', editTitle: '', editBody: '', editPriority: '', moveTarget: '', blockKind: 'dependency' });

      function isProjectIconImage(icon) {
        return typeof icon === 'string' && /^(data:image|https?:\/\/|blob:)/.test(icon);
      }

      function projectWorkspaceKey() {
        return 'project:' + props.projectId;
      }

      function fileTypeIcon(type) {
        if (type === 'folder') return '📁';
        if (type === 'spreadsheet') return '📊';
        if (type === 'data') return '🗂️';
        return '📄';
      }

      function formatFileSize(bytes) {
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      }

      function refreshProjectWorkspace() {
        projectWorkspaceMaterials.value = store.getWorkspaceFiles ? store.getWorkspaceFiles(projectWorkspaceKey()) : [];
      }

      function resetProjectView() {
        project.value = null;
        members.value = [];
        projectTasks.value = [];
        events.value = [];
        selectedProjectTaskId.value = null;
        workdirDraft.value = '';
        workspaceCurrentFolderId.value = null;
        projectWorkspaceMaterials.value = [];
      }

      function loadHistory() {
        if (!store.getRootProjectTasks) { historyItems.value = []; return; }
        historyItems.value = store.getRootProjectTasks(props.projectId).map(function (t) {
          var children = store.getChildProjectTasks ? store.getChildProjectTasks(props.projectId, t.id) : [];
          var doneCount = children.filter(function (c) { return normalizeTaskStatus(c.status) === 'done'; }).length;
          var statusLabel = '草拟';
          var ns = normalizeTaskStatus(t.status);
          if (ns === 'running' || ns === 'review') statusLabel = '拆解中';
          else if (ns === 'done') statusLabel = '已完成';
          else if (children.length > 0) statusLabel = doneCount === children.length ? '已完成' : '进行中';
          return {
            id: t.id,
            title: t.title,
            body: t.body || '',
            createdAt: t.createdAt,
            statusLabel: statusLabel,
            childCount: children.length,
            doneCount: doneCount,
            children: children
          };
        });
      }

      function load() {
        var currentProject = store.getProject(props.projectId);
        if (!currentProject) {
          resetProjectView();
          return;
        }
        project.value = currentProject;
        allExperts.value = store.getExperts();
        members.value = store.getProjectMembers(props.projectId).map(function (m) {
          return Object.assign({}, m, { expert: store.getExpert(m.expertId) });
        }).filter(function (m) { return !!m.expert; });
        projectTasks.value = store.getProjectTasks(props.projectId);
        events.value = store.getProjectEvents ? store.getProjectEvents(props.projectId, eventFilter.value) : [];
        workdirDraft.value = currentProject.defaultWorkdir || '';
        orchestrationDraft.value = {
          orchestratorProfileId: currentProject.orchestratorProfileId || null,
          defaultAssignee: currentProject.defaultAssignee || null,
          autoDecomposeEnabled: currentProject.autoDecomposeEnabled !== false
        };
        refreshProjectWorkspace();
        loadHistory();
        if (selectedProjectTaskId.value && !projectTasks.value.some(function (t) { return t.id === selectedProjectTaskId.value; })) {
          selectedProjectTaskId.value = null;
        }
      }

      var todoStats = Vue.computed(function () {
        var total = projectTasks.value.length;
        var done = projectTasks.value.filter(function (t) { return normalizeTaskStatus(t.status) === 'done' || normalizeTaskStatus(t.status) === 'archived'; }).length;
        var blocked = projectTasks.value.filter(function (t) { return normalizeTaskStatus(t.status) === 'blocked'; }).length;
        var running = projectTasks.value.filter(function (t) { return normalizeTaskStatus(t.status) === 'running' || normalizeTaskStatus(t.status) === 'review'; }).length;
        return {
          total: total,
          done: done,
          blocked: blocked,
          running: running,
          percent: total ? Math.round((done / total) * 100) : 0
        };
      });

      var statusColumns = Vue.computed(function () {
        return STATUS_COLUMNS.map(function (col) {
          return Object.assign({}, col, {
            tasks: projectTasks.value.filter(function (task) {
              return col.statuses.indexOf(normalizeTaskStatus(task.status)) !== -1;
            })
          });
        });
      });

      var expertGroups = Vue.computed(function () {
        var groups = members.value.map(function (member) {
          return {
            id: member.expertId,
            title: member.expert.name,
            expert: member.expert,
            tasks: projectTasks.value.filter(function (task) { return task.expertId === member.expertId || task.assignee === member.expertId; })
          };
        });
        var memberIds = members.value.map(function (m) { return m.expertId; });
        groups.push({
          id: 'unassigned',
          title: '未指派',
          expert: null,
          tasks: projectTasks.value.filter(function (task) {
            return !task.expertId || memberIds.indexOf(task.expertId) === -1;
          })
        });
        return groups;
      });

      var filteredEvents = Vue.computed(function () {
        if (eventFilter.value === 'all') return events.value;
        return events.value.filter(function (e) { return e.category === eventFilter.value; });
      });

      var addableExperts = Vue.computed(function () {
        var memberIds = members.value.map(function (m) { return m.expertId; });
        return allExperts.value.filter(function (e) { return memberIds.indexOf(e.id) === -1; });
      });

      var filteredAddableExperts = Vue.computed(function () {
        var query = trimText(addMemberSearchQuery.value);
        if (!query) return addableExperts.value;
        return addableExperts.value.filter(function (e) { return expertMatchesSearch(e, query); });
      });

      var workspaceFolders = Vue.computed(function () {
        return projectWorkspaceMaterials.value.filter(function (f) { return f.kind === 'folder'; });
      });

      var workspaceCurrentFolder = Vue.computed(function () {
        if (!workspaceCurrentFolderId.value) return null;
        return workspaceFolders.value.find(function (f) { return String(f.id) === String(workspaceCurrentFolderId.value); }) || null;
      });

      var workspaceBreadcrumbs = Vue.computed(function () {
        var crumbs = [{ id: null, name: 'workspace' }];
        var map = {};
        workspaceFolders.value.forEach(function (f) { map[String(f.id)] = f; });
        var stack = [];
        var cursor = workspaceCurrentFolder.value;
        var guard = 0;
        while (cursor && guard < 20) {
          stack.unshift(cursor);
          cursor = cursor.parentId ? map[String(cursor.parentId)] : null;
          guard += 1;
        }
        stack.forEach(function (f) { crumbs.push({ id: f.id, name: f.name }); });
        return crumbs;
      });

      var workspaceFiles = Vue.computed(function () {
        var currentParent = workspaceCurrentFolderId.value ? String(workspaceCurrentFolderId.value) : null;
        return projectWorkspaceMaterials.value.filter(function (f) {
          var parentId = f.parentId ? String(f.parentId) : null;
          return parentId === currentParent;
        }).map(function (f) {
          return Object.assign({ source: 'upload', raw: f }, f);
        }).sort(function (a, b) {
          if ((a.kind === 'folder') !== (b.kind === 'folder')) return a.kind === 'folder' ? -1 : 1;
          if (a.kind === 'folder') return (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN');
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
      });

      var workspaceStats = Vue.computed(function () {
        var folders = workspaceFiles.value.filter(function (f) { return f.kind === 'folder'; }).length;
        var files = workspaceFiles.value.length - folders;
        return folders + ' 个文件夹 · ' + files + ' 个文件';
      });

      var drawerTask = Vue.computed(function () {
        if (!drawerTaskId.value) return null;
        return projectTasks.value.find(function (t) { return t.id === drawerTaskId.value; }) || null;
      });

      var drawerTitle = Vue.computed(function () {
        return DRAWER_MODES[drawerMode.value] || '任务详情';
      });

      var orchestratorExpert = Vue.computed(function () {
        var oid = project.value && project.value.orchestratorProfileId;
        if (oid) return store.getExpert(oid) || null;
        var lead = members.value.find(function (m) { return m.role === 'lead'; });
        return lead ? lead.expert : (members.value[0] ? members.value[0].expert : null);
      });

      var taskActionTask = Vue.computed(function () {
        if (!taskAction.value.taskId) return null;
        return projectTasks.value.find(function (t) { return t.id === taskAction.value.taskId; }) || null;
      });

      var taskActionTitle = Vue.computed(function () {
        var map = {
          comment: '添加评论',
          assign: '指派任务',
          complete: '完成任务',
          block: '标记阻塞',
          unblock: '重启任务',
          edit: '编辑任务',
          reassign: '转交任务',
          moveStatus: '移动状态',
          archive: '归档任务',
          delete: '永久删除',
          decompose: '下发拆解'
        };
        return map[taskAction.value.type] || '任务操作';
      });

      var taskActionConfirmLabel = Vue.computed(function () {
        var map = {
          comment: '提交评论',
          assign: '指派',
          complete: '完成',
          block: '阻塞',
          unblock: '重启',
          edit: '保存',
          reassign: '转交',
          moveStatus: '移动',
          archive: '归档',
          delete: '永久删除',
          decompose: '拆解'
        };
        return map[taskAction.value.type] || '确定';
      });

      function expertById(expertId) {
        if (!expertId) return null;
        return store.getExpert(expertId) || null;
      }

      function expertName(expertId) {
        var expert = expertById(expertId);
        return expert ? expert.name : '未指派';
      }

      function taskDisplayTitle(task) {
        return task && task.title ? task.title : '未命名任务';
      }

      function taskBody(task) {
        return task && (task.body || task.latestSummary || task.result || task.blockedReason) || '暂无任务说明';
      }

      function taskStatusLabel(status) {
        return STATUS_TEXT[normalizeTaskStatus(status)] || '待开始';
      }

      function taskStatusType(status) {
        return STATUS_TAG[normalizeTaskStatus(status)] || 'info';
      }

      function taskStatusClass(task) {
        return 'status-' + normalizeTaskStatus(task && task.status);
      }

      function priorityLabel(priority) {
        var p = String(priority || 'medium');
        var map = { low: '低', medium: '中', high: '高', urgent: '紧急' };
        return map[p] || '中';
      }

      function priorityType(priority) {
        var p = String(priority || 'medium');
        var map = { low: 'info', medium: '', high: 'warning', urgent: 'danger' };
        return map[p] || '';
      }

      function formatTaskTime(value) {
        if (!value) return '—';
        var s = String(value);
        if (s.length >= 16) return s.replace('T', ' ').slice(0, 16);
        return s;
      }

      function taskParentTask(parentTaskId) {
        if (!parentTaskId) return null;
        return projectTasks.value.find(function (t) { return t.id === parentTaskId; }) || null;
      }

      function selectProjectTask(task) {
        if (!task) return;
        selectedProjectTaskId.value = task.id;
      }

      function openTaskDetail(task) {
        if (!task) return;
        selectedProjectTaskId.value = task.id;
        drawerTaskId.value = task.id;
        drawerMode.value = 'taskDetail';
        drawerVisible.value = true;
      }

      function openTaskFromEvent(event) {
        if (event && event.taskId) {
          selectedProjectTaskId.value = event.taskId;
          drawerTaskId.value = event.taskId;
          drawerMode.value = 'taskDetail';
          drawerVisible.value = true;
        }
        activeTab.value = 'kanban';
      }

      function openMemberDrawer() {
        membersSidebarVisible.value = !membersSidebarVisible.value;
      }

      function closeMembersSidebar() {
        membersSidebarVisible.value = false;
      }

      function closeDrawer() {
        drawerVisible.value = false;
      }

      function getCardQuickActions(task) {
        var s = normalizeTaskStatus(task && task.status);
        if (s === 'triage') return [{ key: 'decompose', label: '拆解' }];
        if (s === 'todo') return [{ key: 'promote', label: '开始' }];
        if (s === 'ready') return [{ key: 'start', label: '开始' }];
        if (s === 'running') return [{ key: 'complete', label: '完成' }];
        if (s === 'blocked') return [{ key: 'unblock', label: '重启' }];
        if (s === 'done' || s === 'archived') return [{ key: 'detail', label: '查看' }];
        return [];
      }

      function getCardMenuActions(task) {
        var s = normalizeTaskStatus(task && task.status);
        var common = [
          { key: 'detail', label: '查看详情' },
          { key: 'comment', label: '添加评论' }
        ];
        if (s === 'triage') return common.concat([
          { key: 'edit', label: '编辑' },
          { key: 'decompose', label: '下发拆解' },
          { key: 'assign', label: '分配协调专家' },
          { key: 'archive', label: '归档' }
        ]);
        if (s === 'todo') return common.concat([
          { key: 'edit', label: '编辑' },
          { key: 'assign', label: '分配专家' },
          { key: 'promote', label: '开始任务' },
          { key: 'moveStatus', label: '移动状态' },
          { key: 'archive', label: '归档' }
        ]);
        if (s === 'ready') return common.concat([
          { key: 'edit', label: '编辑' },
          { key: 'start', label: '开始任务' },
          { key: 'moveStatus', label: '移动状态' },
          { key: 'reassign', label: '转交专家' },
          { key: 'block', label: '标记阻塞' },
          { key: 'archive', label: '归档' }
        ]);
        if (s === 'running') return common.concat([
          { key: 'complete', label: '完成任务' },
          { key: 'block', label: '标记阻塞' },
          { key: 'reassign', label: '转交专家' },
          { key: 'archive', label: '归档' }
        ]);
        if (s === 'blocked') return common.concat([
          { key: 'unblock', label: '重启任务' },
          { key: 'reassign', label: '转交专家' },
          { key: 'edit', label: '更新阻塞说明', patch: { editField: 'blockedReason' } },
          { key: 'archive', label: '关闭任务' }
        ]);
        if (s === 'done') return common.concat([
          { key: 'edit', label: '补录结果', patch: { editField: 'result' } },
          { key: 'followup', label: '创建后续任务' },
          { key: 'archive', label: '归档' }
        ]);
        if (s === 'archived') return [
          { key: 'detail', label: '查看详情' },
          { key: 'delete', label: '永久删除' }
        ];
        return common;
      }

      function getTaskStatusMoves(task) {
        var s = normalizeTaskStatus(task && task.status);
        return TASK_STATUS_MOVES[s] || [];
      }

      function resetGoalForm() {
        goalForm.value = { title: '', description: '', priority: 'medium' };
      }

      function resetManualForm(preset) {
        preset = preset || {};
        manualForm.value = {
          title: preset.title || '',
          body: preset.body || '',
          assignee: preset.assignee || '',
          status: preset.status || 'todo',
          parentTaskId: preset.parentTaskId || '',
          priority: preset.priority || 'medium',
          workdir: preset.workdir || (project.value && project.value.defaultWorkdir) || '',
          skill: '',
          goalMode: '',
          maxRuntime: '',
          maxRetries: ''
        };
        manualAdvancedVisible.value = false;
      }

      function resetTaskActionForm() {
        taskActionForm.value = {
          comment: '', assignee: '', result: '', blockedReason: '', unblockReason: '',
          reassignReason: '', editTitle: '', editBody: '', editPriority: '', moveTarget: '', blockKind: 'dependency'
        };
      }

      function submitGoal() {
        var f = goalForm.value;
        if (!trimText(f.title)) return ElementPlus.ElMessage.warning('请填写目标标题');
        if (!trimText(f.description)) return ElementPlus.ElMessage.warning('请填写目标描述');
        var oid = (project.value && project.value.orchestratorProfileId) || (orchestratorExpert.value && orchestratorExpert.value.id);
        if (!oid) return ElementPlus.ElMessage.warning('请先在编排配置中选择协调专家');
        goalSubmitting.value = true;
        var root = store.createProjectTask(props.projectId, {
          title: trimText(f.title),
          body: trimText(f.description),
          assignee: oid,
          priority: f.priority,
          status: 'triage',
          isTriage: true
        });
        selectedProjectTaskId.value = root.id;
        ElementPlus.ElMessage.success('已提交目标，协调专家开始拆解并派发');
        if (project.value.autoDecomposeEnabled !== false) {
          try { store.decomposeProjectTask(props.projectId, root.id, { children: [] }); } catch (e) { /* noop */ }
        }
        goalSubmitting.value = false;
        load();
        resetGoalForm();
      }

      function openManualCreateDialog(preset) {
        preset = preset || {};
        resetManualForm(preset);
        showManualCreateDialog.value = true;
      }

      function closeManualCreateDialog() {
        showManualCreateDialog.value = false;
      }

      function submitManualCreate() {
        var m = manualForm.value;
        if (!trimText(m.title)) return ElementPlus.ElMessage.warning('请填写任务标题');
        if (!m.assignee) return ElementPlus.ElMessage.warning('请选择负责人');
        var created = store.createProjectTask(props.projectId, {
          title: trimText(m.title),
          body: trimText(m.body),
          assignee: m.assignee || null,
          priority: m.priority,
          parentTaskId: m.parentTaskId || null,
          status: m.status || 'todo'
        });
        selectedProjectTaskId.value = created.id;
        ElementPlus.ElMessage.success('任务已创建并派发');
        load();
        closeManualCreateDialog();
      }

      function openTaskAction(type, task) {
        if (!task) return;
        resetTaskActionForm();
        taskAction.value = { type: type, taskId: task.id };
        if (type === 'edit') {
          taskActionForm.value.editTitle = task.title || '';
          taskActionForm.value.editBody = task.body || '';
          taskActionForm.value.editPriority = task.priority || 'medium';
        }
        if (type === 'reassign' || type === 'assign') {
          taskActionForm.value.assignee = task.expertId || '';
        }
      }

      function closeTaskAction() {
        taskAction.value = { type: '', taskId: null };
        resetTaskActionForm();
      }

      function submitTaskAction() {
        var t = taskActionForm.value;
        var pid = props.projectId;
        var tid = taskAction.value.taskId;
        if (!tid) return;
        var type = taskAction.value.type;
        if (type === 'comment') {
          if (!trimText(t.comment)) return ElementPlus.ElMessage.warning('请填写评论内容');
          store.commentProjectTask(pid, tid, trimText(t.comment));
          ElementPlus.ElMessage.success('评论已添加');
        } else if (type === 'assign') {
          if (!t.assignee) return ElementPlus.ElMessage.warning('请选择负责人');
          store.assignProjectTask(pid, tid, t.assignee);
          ElementPlus.ElMessage.success('任务已指派');
        } else if (type === 'complete') {
          store.completeProjectTask(pid, tid, trimText(t.result));
          ElementPlus.ElMessage.success('任务已完成');
        } else if (type === 'block') {
          if (!trimText(t.blockedReason)) return ElementPlus.ElMessage.warning('请填写阻塞原因');
          store.blockProjectTask(pid, tid, trimText(t.blockedReason));
          ElementPlus.ElMessage.success('任务已标记为阻塞');
        } else if (type === 'unblock') {
          store.unblockProjectTask(pid, tid, trimText(t.unblockReason));
          ElementPlus.ElMessage.success('任务已重启');
        } else if (type === 'edit') {
          store.editProjectTask(pid, tid, { title: trimText(t.editTitle), body: trimText(t.editBody), priority: t.editPriority });
          ElementPlus.ElMessage.success('任务已更新');
        } else if (type === 'reassign') {
          if (!t.assignee) return ElementPlus.ElMessage.warning('请选择转交目标');
          store.reassignProjectTask(pid, tid, t.assignee, trimText(t.reassignReason));
          ElementPlus.ElMessage.success('任务已转交');
        } else if (type === 'moveStatus') {
          if (!t.moveTarget) return ElementPlus.ElMessage.warning('请选择目标状态');
          store.moveProjectTaskStatus(pid, tid, t.moveTarget);
          ElementPlus.ElMessage.success('任务状态已变更');
        } else if (type === 'archive') {
          store.archiveProjectTask(pid, tid);
          ElementPlus.ElMessage.success('任务已归档');
        } else if (type === 'delete') {
          store.deleteProjectTaskPermanently(pid, tid);
          ElementPlus.ElMessage.success('任务已永久删除');
          if (drawerTaskId.value === tid) closeDrawer();
        } else if (type === 'decompose') {
          try { store.decomposeProjectTask(pid, tid, { children: [] }); } catch (e) { /* noop */ }
          ElementPlus.ElMessage.success('已下发拆解');
        } else if (type === 'followup') {
          closeTaskAction();
          openManualCreateDialog({ parentTaskId: tid });
          return;
        } else if (type === 'promote') {
          store.promoteProjectTask(pid, tid);
          ElementPlus.ElMessage.success('任务已晋升为排队中');
        } else if (type === 'start') {
          store.moveProjectTaskStatus(pid, tid, 'running');
          ElementPlus.ElMessage.success('任务已开始');
        }
        load();
        closeTaskAction();
      }

      function handleCardMenuToggle(task) {
        if (!task) { cardMenuTaskId.value = null; return; }
        cardMenuTaskId.value = cardMenuTaskId.value === task.id ? null : task.id;
      }

      function handleCardMenuAction(action, task) {
        cardMenuTaskId.value = null;
        if (action.key === 'detail') { openTaskDetail(task); return; }
        if (action.key === 'followup') { openManualCreateDialog({ parentTaskId: task.id }); return; }
        if (action.key === 'promote') {
          store.promoteProjectTask(props.projectId, task.id);
          ElementPlus.ElMessage.success('任务已晋升为排队中');
          load();
          return;
        }
        if (action.key === 'start') {
          store.moveProjectTaskStatus(props.projectId, task.id, 'running');
          ElementPlus.ElMessage.success('任务已开始');
          load();
          return;
        }
        if (action.key === 'archive') {
          ElementPlus.ElMessageBox.confirm('确定归档任务「' + taskDisplayTitle(task) + '」？归档后将从看板隐藏。', '归档任务', { confirmButtonText: '归档', cancelButtonText: '取消', type: 'warning' }).then(function () {
            store.archiveProjectTask(props.projectId, task.id);
            ElementPlus.ElMessage.success('任务已归档');
            load();
          }).catch(function () {});
          return;
        }
        if (action.key === 'delete') {
          ElementPlus.ElMessageBox.confirm('永久删除不可恢复，任务将从此项目中彻底移除。确定继续？', '永久删除', { confirmButtonText: '永久删除', cancelButtonText: '取消', type: 'error' }).then(function () {
            store.deleteProjectTaskPermanently(props.projectId, task.id);
            ElementPlus.ElMessage.success('任务已永久删除');
            if (drawerTaskId.value === task.id) closeDrawer();
            load();
          }).catch(function () {});
          return;
        }
        if (action.key === 'decompose') {
          try { store.decomposeProjectTask(props.projectId, task.id, { children: [] }); } catch (e) { /* noop */ }
          ElementPlus.ElMessage.success('已下发拆解');
          load();
          return;
        }
        openTaskAction(action.key, task);
      }

      function handleQuickAction(action, task) {
        if (action.key === 'detail') { openTaskDetail(task); return; }
        if (action.key === 'decompose') {
          try { store.decomposeProjectTask(props.projectId, task.id, { children: [] }); } catch (e) { /* noop */ }
          ElementPlus.ElMessage.success('已下发拆解');
          load();
          return;
        }
        if (action.key === 'promote') {
          store.promoteProjectTask(props.projectId, task.id);
          ElementPlus.ElMessage.success('任务已晋升为排队中');
          load();
          return;
        }
        if (action.key === 'start') {
          store.moveProjectTaskStatus(props.projectId, task.id, 'running');
          ElementPlus.ElMessage.success('任务已开始');
          load();
          return;
        }
        openTaskAction(action.key, task);
      }

      function toggleHistoryExpand(item) {
        historyExpandedId.value = historyExpandedId.value === item.id ? null : item.id;
      }

      function openHistoryComment(taskId) {
        historyCommentDraft.value = { taskId: taskId, text: '' };
        showHistoryCommentDialog.value = true;
      }

      function submitHistoryComment() {
        var d = historyCommentDraft.value;
        if (!trimText(d.text)) return ElementPlus.ElMessage.warning('请填写补充说明');
        store.commentProjectTask(props.projectId, d.taskId, trimText(d.text));
        ElementPlus.ElMessage.success('补充说明已添加');
        showHistoryCommentDialog.value = false;
        loadHistory();
      }

      function saveOrchestration() {
        var p = Object.assign({}, project.value, {
          orchestratorProfileId: orchestrationDraft.value.orchestratorProfileId || null,
          defaultAssignee: orchestrationDraft.value.defaultAssignee || null,
          autoDecomposeEnabled: orchestrationDraft.value.autoDecomposeEnabled
        });
        store.saveProject(p);
        load();
        showOrchestrationDialog.value = false;
        ElementPlus.ElMessage.success('编排配置已保存');
      }

      function openOrchestrationDialog() {
        showOrchestrationDialog.value = true;
      }

      function saveWorkdir() {
        store.saveProjectWorkdir(props.projectId, workdirDraft.value);
        load();
        ElementPlus.ElMessage.success('工作目录已保存');
      }

      function copyWorkdir() {
        var path = trimText(workdirDraft.value || (project.value && project.value.defaultWorkdir));
        if (!path) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(path).then(function () {
            ElementPlus.ElMessage.success('路径已复制');
          }).catch(function () { ElementPlus.ElMessage.info(path); });
        } else { ElementPlus.ElMessage.info(path); }
      }

      function workspaceFileTypeClass(file) { return 'type-' + ((file && file.type) || 'document'); }
      function workspaceFileIcon(file) {
        if (file && file.kind === 'folder') return fileTypeIcon('folder');
        return fileTypeIcon(file && file.type);
      }
      function workspaceTypeLabel(file) {
        if (!file) return '—';
        if (file.kind === 'folder') return '文件夹';
        var name = String(file.name || '');
        var match = name.match(/\.([a-z0-9]+)$/i);
        if (match && match[1]) return match[1].toLowerCase();
        var typeMap = { spreadsheet: 'xlsx', document: 'docx', data: 'json' };
        return typeMap[file.type] || '文件';
      }
      function workspaceUpdatedAt(file) { return (file && (file.updatedAt || file.createdAt)) || '—'; }
      function workspaceSizeLabel(file) {
        if (!file) return '—';
        if (file.kind === 'folder') return '-';
        if (file.size) return formatFileSize(file.size);
        if (file.content) return formatFileSize(new Blob([file.content]).size);
        return '—';
      }
      function workspaceFolderChildCount(folder) {
        if (!folder) return 0;
        return projectWorkspaceMaterials.value.filter(function (f) { return String(f.parentId || '') === String(folder.id); }).length;
      }
      function workspaceFileMeta(file) {
        if (!file) return '';
        if (file.kind === 'folder') return workspaceFolderChildCount(file.raw || file) + ' 项 · ' + (file.createdAt || '');
        var parts = [];
        if (file.size) parts.push(formatFileSize(file.size));
        if (file.createdAt) parts.push(file.createdAt);
        return parts.join(' · ');
      }
      function openWorkspaceFolder(file) {
        if (!file || file.kind !== 'folder') return;
        workspaceCurrentFolderId.value = file.raw ? file.raw.id : file.id;
      }
      function openWorkspaceBreadcrumb(crumb) {
        workspaceCurrentFolderId.value = crumb && crumb.id ? crumb.id : null;
      }
      function openWorkspaceFile(file) {
        if (!file) return;
        if (file.kind === 'folder') return openWorkspaceFolder(file);
        ElementPlus.ElMessage.info(file.name || '文件');
      }
      function openMaterialUpload() { if (workspaceFileInput.value) workspaceFileInput.value.click(); }
      function handleMaterialFileSelect(e) {
        var fileList = e.target.files;
        if (!fileList || !fileList.length) return;
        var queue = [];
        var maxSize = 10 * 1024 * 1024;
        for (var i = 0; i < fileList.length; i++) {
          var file = fileList[i];
          if (file.size > maxSize) { ElementPlus.ElMessage.warning('「' + file.name + '」超过 10MB，已跳过'); continue; }
          queue.push(file);
        }
        e.target.value = '';
        if (!queue.length) return;
        var done = 0;
        var AppShared = window.AppShared;
        queue.forEach(function (file) {
          AppShared.readUploadedFileContent(file, function (content) {
            store.addWorkspaceFile(projectWorkspaceKey(), {
              name: file.name,
              type: AppShared.inferProjectFileType(file.name),
              size: file.size,
              content: content,
              parentId: workspaceCurrentFolderId.value || null
            });
            done += 1;
            if (done === queue.length) { refreshProjectWorkspace(); ElementPlus.ElMessage.success('已上传 ' + queue.length + ' 个文件'); }
          });
        });
      }
      function openCreateWorkspaceFolderDialog() {
        workspaceFolderName.value = '';
        workspaceFolderDialogVisible.value = true;
      }
      function submitWorkspaceFolderDialog() {
        var name = trimText(workspaceFolderName.value);
        if (!name) return ElementPlus.ElMessage.warning('请输入文件夹名称');
        if (/[\\/:*?"<>|]/.test(name)) return ElementPlus.ElMessage.warning('名称不能包含特殊字符');
        var parentId = workspaceCurrentFolderId.value || null;
        var duplicate = projectWorkspaceMaterials.value.some(function (f) {
          return String(f.parentId || '') === String(parentId || '') && trimText(f.name) === name;
        });
        if (duplicate) return ElementPlus.ElMessage.warning('当前目录下已存在同名项目');
        store.addWorkspaceFolder(projectWorkspaceKey(), { name: name, parentId: parentId });
        workspaceFolderDialogVisible.value = false;
        refreshProjectWorkspace();
        ElementPlus.ElMessage.success('文件夹已创建');
      }
      function downloadWorkspaceFile(file) {
        if (!file || file.kind === 'folder') return;
        var raw = file.raw || file;
        var blob = new Blob([raw.content || ''], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = raw.name || '文件.txt'; a.click();
        URL.revokeObjectURL(url);
      }
      function deleteWorkspaceItem(file) {
        if (!file) return;
        var raw = file.raw || file;
        var title = file.kind === 'folder' ? '删除文件夹' : '删除文件';
        var text = file.kind === 'folder' ? '确定删除文件夹「' + file.name + '」？仅空文件夹可删除。' : '确定删除文件「' + file.name + '」？';
        ElementPlus.ElMessageBox.confirm(text, title, { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }).then(function () {
          var ok = file.kind === 'folder' ? store.deleteWorkspaceFolder(projectWorkspaceKey(), raw.id) : (store.deleteWorkspaceFile(projectWorkspaceKey(), raw.id), true);
          if (!ok) return ElementPlus.ElMessage.warning('请先移除文件夹内的内容');
          refreshProjectWorkspace();
          ElementPlus.ElMessage.success('已删除');
        }).catch(function () {});
      }
      function openAddMemberDialog() {
        allExperts.value = store.getExperts();
        addMemberExpertIds.value = [];
        addMemberSearchQuery.value = '';
        showAddMemberDialog.value = true;
      }
      function closeAddMemberDialog() {
        showAddMemberDialog.value = false;
        addMemberExpertIds.value = [];
        addMemberSearchQuery.value = '';
      }
      function isAddMemberSelected(expertId) { return addMemberExpertIds.value.indexOf(expertId) !== -1; }
      function toggleAddMember(expertId) {
        var ids = addMemberExpertIds.value.slice();
        var idx = ids.indexOf(expertId);
        if (idx === -1) ids.push(expertId); else ids.splice(idx, 1);
        addMemberExpertIds.value = ids;
      }
      function submitAddMembers() {
        if (!addMemberExpertIds.value.length) return ElementPlus.ElMessage.warning('请至少选择一位专家');
        addMemberExpertIds.value.forEach(function (eid) { store.addProjectMember(props.projectId, eid); });
        closeAddMemberDialog();
        load();
        ElementPlus.ElMessage.success('项目成员已更新');
      }
      function removeMember(memberId) { store.removeProjectMember(memberId); load(); }
      function getMemberTaskStats(expertId) {
        var tasks = projectTasks.value.filter(function (task) { return task.expertId === expertId || task.assignee === expertId; });
        return {
          total: tasks.length,
          done: tasks.filter(function (task) { return normalizeTaskStatus(task.status) === 'done'; }).length,
          blocked: tasks.filter(function (task) { return normalizeTaskStatus(task.status) === 'blocked'; }).length
        };
      }
      function createTaskForMember(member) {
        openManualCreateDialog({ assignee: member.expertId });
      }
      function highlightExpertTasks(expertId) {
        if (!membersSidebarVisible.value) membersSidebarVisible.value = true;
        highlightExpertId.value = expertId;
      }
      function clearHighlightExpertTasks() {
        highlightExpertId.value = null;
      }
      function handleStoreUpdated() { load(); }

      Vue.watch(function () { return props.projectId; }, function () {
        selectedProjectTaskId.value = null;
        workspaceCurrentFolderId.value = null;
        activeTab.value = 'kanban';
        load();
      });
      Vue.watch(eventFilter, function () {
        if (project.value) events.value = store.getProjectEvents ? store.getProjectEvents(props.projectId, eventFilter.value) : [];
      });
      Vue.onMounted(function () {
        load();
        window.addEventListener('app-store-updated', handleStoreUpdated);
      });
      Vue.onBeforeUnmount(function () {
        window.removeEventListener('app-store-updated', handleStoreUpdated);
      });
      // PLACEHOLDER_RETURN
      return {
        project: project,
        members: members,
        projectTasks: projectTasks,
        events: events,
        activeTab: activeTab,
        kanbanView: kanbanView,
        highlightExpertId: highlightExpertId,
        drawerMode: drawerMode,
        drawerVisible: drawerVisible,
        membersSidebarVisible: membersSidebarVisible,
        drawerTitle: drawerTitle,
        drawerTask: drawerTask,
        orchestratorExpert: orchestratorExpert,
        orchestratorForm: goalForm,
        goalForm: goalForm,
        goalSubmitting: goalSubmitting,
        manualForm: manualForm,
        manualAdvancedVisible: manualAdvancedVisible,
        showManualCreateDialog: showManualCreateDialog,
        historyItems: historyItems,
        historyExpandedId: historyExpandedId,
        showHistoryCommentDialog: showHistoryCommentDialog,
        historyCommentDraft: historyCommentDraft,
        taskAction: taskAction,
        taskActionForm: taskActionForm,
        taskActionTask: taskActionTask,
        taskActionTitle: taskActionTitle,
        taskActionConfirmLabel: taskActionConfirmLabel,
        cardMenuTaskId: cardMenuTaskId,
        priorityOptions: PRIORITY_OPTIONS,
        eventFilter: eventFilter,
        eventFilters: EVENT_FILTERS,
        selectedProjectTaskId: selectedProjectTaskId,
        workdirDraft: workdirDraft,
        workspaceCurrentFolderId: workspaceCurrentFolderId,
        workspaceFolderDialogVisible: workspaceFolderDialogVisible,
        workspaceFolderName: workspaceFolderName,
        workspaceFileInput: workspaceFileInput,
        workspaceFiles: workspaceFiles,
        workspaceStats: workspaceStats,
        workspaceBreadcrumbs: workspaceBreadcrumbs,
        showAddMemberDialog: showAddMemberDialog,
        showOrchestrationDialog: showOrchestrationDialog,
        orchestrationDraft: orchestrationDraft,
        addMemberExpertIds: addMemberExpertIds,
        addMemberSearchQuery: addMemberSearchQuery,
        filteredAddableExperts: filteredAddableExperts,
        addableExperts: addableExperts,
        todoStats: todoStats,
        statusColumns: statusColumns,
        expertGroups: expertGroups,
        filteredEvents: filteredEvents,
        isProjectIconImage: isProjectIconImage,
        taskDisplayTitle: taskDisplayTitle,
        taskBody: taskBody,
        taskStatusLabel: taskStatusLabel,
        taskStatusType: taskStatusType,
        taskStatusClass: taskStatusClass,
        priorityLabel: priorityLabel,
        priorityType: priorityType,
        formatTaskTime: formatTaskTime,
        taskParentTask: taskParentTask,
        selectProjectTask: selectProjectTask,
        openTaskDetail: openTaskDetail,
        openTaskFromEvent: openTaskFromEvent,
        openMemberDrawer: openMemberDrawer,
        closeMembersSidebar: closeMembersSidebar,
        closeDrawer: closeDrawer,
        getCardQuickActions: getCardQuickActions,
        getCardMenuActions: getCardMenuActions,
        getTaskStatusMoves: getTaskStatusMoves,
        handleCardMenuToggle: handleCardMenuToggle,
        handleCardMenuAction: handleCardMenuAction,
        handleQuickAction: handleQuickAction,
        submitGoal: submitGoal,
        openManualCreateDialog: openManualCreateDialog,
        closeManualCreateDialog: closeManualCreateDialog,
        submitManualCreate: submitManualCreate,
        openTaskAction: openTaskAction,
        closeTaskAction: closeTaskAction,
        submitTaskAction: submitTaskAction,
        toggleHistoryExpand: toggleHistoryExpand,
        openHistoryComment: openHistoryComment,
        submitHistoryComment: submitHistoryComment,
        saveOrchestration: saveOrchestration,
        openOrchestrationDialog: openOrchestrationDialog,
        saveWorkdir: saveWorkdir,
        copyWorkdir: copyWorkdir,
        workspaceFileTypeClass: workspaceFileTypeClass,
        workspaceFileIcon: workspaceFileIcon,
        workspaceFileMeta: workspaceFileMeta,
        workspaceTypeLabel: workspaceTypeLabel,
        workspaceUpdatedAt: workspaceUpdatedAt,
        workspaceSizeLabel: workspaceSizeLabel,
        openWorkspaceFolder: openWorkspaceFolder,
        openWorkspaceBreadcrumb: openWorkspaceBreadcrumb,
        openWorkspaceFile: openWorkspaceFile,
        openMaterialUpload: openMaterialUpload,
        handleMaterialFileSelect: handleMaterialFileSelect,
        openCreateWorkspaceFolderDialog: openCreateWorkspaceFolderDialog,
        submitWorkspaceFolderDialog: submitWorkspaceFolderDialog,
        downloadWorkspaceFile: downloadWorkspaceFile,
        deleteWorkspaceItem: deleteWorkspaceItem,
        expertName: expertName,
        expertById: expertById,
        openAddMemberDialog: openAddMemberDialog,
        closeAddMemberDialog: closeAddMemberDialog,
        isAddMemberSelected: isAddMemberSelected,
        toggleAddMember: toggleAddMember,
        submitAddMembers: submitAddMembers,
        removeMember: removeMember,
        getMemberTaskStats: getMemberTaskStats,
        createTaskForMember: createTaskForMember,
        highlightExpertTasks: highlightExpertTasks,
        clearHighlightExpertTasks: clearHighlightExpertTasks
      };
    },
    template: getProjectDetailTemplate()
  };

  function getProjectDetailTemplate() {
    return [
      '<div class="project-detail-shell" v-if="project">',
      headerTemplate(),
      tabsTemplate(),
      '<div class="project-detail-content" :class="{ \'with-members-sidebar\': membersSidebarVisible }">',
        '<div class="project-detail-main-wrapper">',
          mainTemplate(),
          bottomGoalFormTemplate(),
        '</div>',
        membersSidebarTemplate(),
      '</div>',
      drawerTemplate(),
      manualCreateDialogTemplate(),
      taskActionDialogTemplate(),
      historyCommentDialogTemplate(),
      orchestrationDialogTemplate(),
      workspaceFolderDialogTemplate(),
      addMemberDialogTemplate(),
      '</div>',
      '<div v-else class="main-scroll"><el-empty description="项目不存在"><back-link label="返回项目" @click="$emit(\'nav\', \'/projects\')" /></el-empty></div>'
    ].join('');
  }

  function headerTemplate() {
    return [
      '<header class="project-detail-topbar">',
        '<div class="project-title-block">',
          '<back-link label="返回项目" inline @click="$emit(\'nav\', \'/projects\')" />',
          '<div class="project-title-card">',
            '<div class="project-title-icon">',
              '<img v-if="isProjectIconImage(project.icon)" :src="project.icon" :alt="project.name">',
              '<span v-else>{{ project.icon || \'📁\' }}</span>',
            '</div>',
            '<div class="project-title-text">',
              '<div class="project-title-row">',
                '<h1>{{ project.name }}</h1>',
                '<span class="project-status-pill">进行中</span>',
              '</div>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="project-header-summary project-header-summary-compact">',
          '<span class="project-progress-pill">{{ todoStats.done }}/{{ todoStats.total }} 已完成</span>',
          '<button type="button" class="project-header-action-btn" :class="{ active: membersSidebarVisible }" @click="openMemberDrawer">',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">',
              '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>',
              '<circle cx="9" cy="7" r="4"/>',
              '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
              '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
            '</svg>',
            '<span>项目成员 · {{ members.length }}</span>',
          '</button>',
        '</div>',
      '</header>'
    ].join('');
  }

  function tabsTemplate() {
    return [
      '<nav class="project-tabs" aria-label="项目详情导航">',
        '<button type="button" :class="{ active: activeTab === \'kanban\' }" @click="activeTab = \'kanban\'">看板</button>',
        '<button type="button" :class="{ active: activeTab === \'timeline\' }" @click="activeTab = \'timeline\'">动态</button>',
        '<button type="button" :class="{ active: activeTab === \'workspace\' }" @click="activeTab = \'workspace\'">工作空间</button>',
      '</nav>'
    ].join('');
  }

  function mainTemplate() {
    return [
      '<main class="project-detail-main project-detail-main-with-bottom-form">',
        kanbanTabTemplate(),
        timelineTabTemplate(),
        workspaceTabTemplate(),
      '</main>'
    ].join('');
  }

  function kanbanTabTemplate() {
    return [
      '<section v-show="activeTab === \'kanban\'" class="project-tab-panel project-kanban-tab">',
        '<div class="project-tab-content project-tab-content-full">',
          kanbanStatusViewTemplate(),
        '</div>',
      '</section>'
    ].join('');
  }

  function kanbanStatusViewTemplate() {
    return [
      '<div class="project-kanban-board" :class="{ \'has-highlight\': highlightExpertId }">',
        '<section v-for="col in statusColumns" :key="col.key" class="project-kanban-column" :class="\'column-\' + col.key">',
          '<header>',
            '<span>{{ col.title }}</span><em>{{ col.tasks.length }}</em>',
            '<button type="button" class="project-kanban-column-add" :title="col.key === \'triage\' ? \'交给协调专家\' : \'手动创建任务\'" @click="openManualCreateDialog({ status: col.statuses[0] })">+</button>',
          '</header>',
          '<div class="project-kanban-column-body">',
            taskCardTemplate(true, 'col.tasks'),
            '<div v-if="!col.tasks.length" class="project-kanban-empty">暂无任务</div>',
          '</div>',
        '</section>',
      '</div>'
    ].join('');
  }

  function taskCardTemplate(showMeta, vForSource) {
    var source = vForSource || 'col.tasks';
    var meta = showMeta ? '<div class="project-task-card-meta"><span>{{ task.assigneeLabel || expertName(task.expertId) }}</span><span>{{ task.commentCount || 0 }} 条评论</span></div>' : '';
    return [
      '<article v-for="task in ' + source + '" :key="task.id" class="project-task-card" :class="[{ active: selectedProjectTaskId === task.id, \'highlight-by-expert\': highlightExpertId && (task.expertId === highlightExpertId || task.assignee === highlightExpertId) }, taskStatusClass(task)]" :data-assignee="task.expertId || task.assignee || \'\'" @click="openTaskDetail(task)">',
        '<div class="project-task-card-head"><h3 @click.stop>{{ taskDisplayTitle(task) }}</h3><el-tag size="small" :type="taskStatusType(task.status)" effect="plain">{{ taskStatusLabel(task.status) }}</el-tag></div>',
        '<p>{{ taskBody(task) }}</p>',
        meta,
        '<div class="project-task-card-footer" @click.stop>',
          '<div class="project-task-card-quick">',
            '<button v-for="qa in getCardQuickActions(task)" :key="qa.key" type="button" class="project-task-quick-btn" @click="handleQuickAction(qa, task)">{{ qa.label }}</button>',
          '</div>',
          '<el-dropdown trigger="click" placement="top-end" @command="(cmd) => handleCardMenuAction(cmd, task)">',
            '<button type="button" class="project-task-menu-btn" @click.stop>⋯</button>',
            '<template #dropdown>',
              '<el-dropdown-menu>',
                '<el-dropdown-item v-for="ma in getCardMenuActions(task)" :key="ma.key" :command="ma">{{ ma.label }}</el-dropdown-item>',
              '</el-dropdown-menu>',
            '</template>',
          '</el-dropdown>',
        '</div>',
      '</article>'
    ].join('');
  }

  function timelineTabTemplate() {
    return [
      '<section v-show="activeTab === \'timeline\'" class="project-tab-panel project-timeline-tab project-tab-with-rail">',
        '<aside class="project-secondary-rail project-event-filter">',
          '<button v-for="filter in eventFilters" :key="filter.key" type="button" :class="{ active: eventFilter === filter.key }" @click="eventFilter = filter.key">{{ filter.label }}</button>',
        '</aside>',
        '<div class="project-tab-content">',
          '<div class="project-timeline">',
            '<article v-for="event in filteredEvents" :key="event.id" class="project-timeline-item" @click="openTaskFromEvent(event)">',
              '<div class="project-timeline-dot" :class="\'event-\' + event.category"></div>',
              '<div class="project-timeline-card">',
                '<div class="project-timeline-head"><strong>{{ event.title }}</strong><span>{{ event.createdAt }}</span></div>',
                '<p>{{ event.content }}</p>',
                '<div v-if="event.taskId" class="project-timeline-link">关联任务：{{ event.taskId }}</div>',
              '</div>',
            '</article>',
            '<div v-if="filteredEvents.length === 0" class="project-empty-panel">暂无项目动态</div>',
          '</div>',
        '</div>',
      '</section>'
    ].join('');
  }

  function workspaceTabTemplate() {
    return [
      '<section v-show="activeTab === \'workspace\'" class="project-tab-panel project-workspace-tab project-workspace-directory-tab">',
        '<input ref="workspaceFileInput" type="file" multiple class="material-file-input-hidden" @change="handleMaterialFileSelect">',
        '<div class="detail-action-bar detail-action-bar--split workspace-action-bar project-workspace-action-bar">',
          '<div class="detail-action-left workspace-breadcrumbs">',
            '<template v-for="(crumb, index) in workspaceBreadcrumbs" :key="crumb.id || \'root\'">',
              '<button type="button" class="workspace-breadcrumb" :class="{ active: index === workspaceBreadcrumbs.length - 1 }" @click="openWorkspaceBreadcrumb(crumb)">{{ crumb.name }}</button>',
              '<span v-if="index < workspaceBreadcrumbs.length - 1" class="workspace-breadcrumb-sep">/</span>',
            '</template>',
            '<span class="workspace-stat-pill">{{ workspaceStats }}</span>',
          '</div>',
          '<div class="detail-action-right project-workspace-actions">',
            '<el-button size="small" @click="openCreateWorkspaceFolderDialog">新建文件夹</el-button>',
            '<el-button type="primary" size="small" @click="openMaterialUpload">上传文件</el-button>',
          '</div>',
        '</div>',
        '<div class="project-workdir-inline-card">',
          '<span class="project-workdir-inline-label">默认目录</span>',
          '<el-input v-model="workdirDraft" placeholder="如：D:\\projects\\yield-improvement" clearable />',
          '<el-button type="success" @click="saveWorkdir">保存</el-button>',
          '<el-button :disabled="!workdirDraft" @click="copyWorkdir">复制</el-button>',
        '</div>',
        '<div class="workspace-list-panel project-workspace-list-panel">',
          workspaceEmptyTemplate(),
          workspaceListTemplate(),
        '</div>',
      '</section>'
    ].join('');
  }

  function workspaceEmptyTemplate() {
    return [
      '<div v-if="workspaceFiles.length === 0" class="profile-empty-state workspace-directory-empty">',
        '<p class="profile-empty-title">工作目录暂无内容</p>',
        '<p class="profile-empty-desc">你可以新建文件夹整理项目资料，或上传文件作为任务输入。</p>',
        '<div class="workspace-empty-actions">',
          '<el-button size="small" @click="openCreateWorkspaceFolderDialog">新建文件夹</el-button>',
          '<el-button type="primary" size="small" @click="openMaterialUpload">上传文件</el-button>',
        '</div>',
      '</div>'
    ].join('');
  }

  function workspaceListTemplate() {
    return [
      '<div v-else class="workspace-list-table">',
        '<div class="workspace-list-row workspace-list-head project-workspace-list-row">',
          '<div class="workspace-list-cell workspace-list-name-cell">名称</div>',
          '<div class="workspace-list-cell workspace-list-type-cell">类型</div>',
          '<div class="workspace-list-cell workspace-list-time-cell">更新时间</div>',
          '<div class="workspace-list-cell workspace-list-size-cell">大小</div>',
          '<div class="workspace-list-cell workspace-list-action-cell">操作</div>',
        '</div>',
        '<div v-for="file in workspaceFiles" :key="file.id" class="workspace-list-row workspace-list-item project-workspace-list-row" :class="{ \'is-folder\': file.kind === \'folder\' }">',
          '<div class="workspace-list-cell workspace-list-name-cell" @click="file.kind === \'folder\' && openWorkspaceFolder(file)" @dblclick="openWorkspaceFile(file)">',
            '<span class="workspace-file-icon-wrap" :class="workspaceFileTypeClass(file)"><span class="workspace-file-icon">{{ workspaceFileIcon(file) }}</span></span>',
            '<span class="workspace-list-name-text">{{ file.name }}</span>',
          '</div>',
          '<div class="workspace-list-cell workspace-list-type-cell">{{ workspaceTypeLabel(file) }}</div>',
          '<div class="workspace-list-cell workspace-list-time-cell">{{ workspaceUpdatedAt(file) }}</div>',
          '<div class="workspace-list-cell workspace-list-size-cell">{{ workspaceSizeLabel(file) }}</div>',
          '<div class="workspace-list-cell workspace-list-action-cell">',
            '<el-button v-if="file.kind !== \'folder\'" link type="primary" size="small" @click="downloadWorkspaceFile(file)">下载</el-button>',
            '<el-button link type="danger" size="small" @click="deleteWorkspaceItem(file)">删除</el-button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function bottomGoalFormTemplate() {
    return [
      '<section class="project-bottom-goal-form" v-if="project">',
        '<div class="project-bottom-goal-layout">',
          '<div class="project-bottom-goal-left">',
            '<div class="project-goal-form-head">',
              '<div class="project-goal-form-tip">💡 描述你的项目目标，系统会自动拆解为具体任务并分配给相关专家。</div>',
              '<div class="project-goal-form-head-right">',
                '<span v-if="orchestratorExpert" class="project-goal-orchestrator-hint">协调专家：<strong>{{ orchestratorExpert.name }}</strong></span>',
                '<span v-else class="project-goal-orchestrator-hint project-goal-orchestrator-warn">未配置协调专家</span>',
                '<button type="button" class="project-goal-history-btn" @click="openOrchestrationDialog" title="项目设置">',
                  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">',
                    '<circle cx="12" cy="12" r="3"/>',
                    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
                  '</svg>',
                  '<span>设置</span>',
                '</button>',
                '<el-button type="primary" :loading="goalSubmitting" @click="submitGoal">发起</el-button>',
              '</div>',
            '</div>',
            '<div class="project-goal-form-body">',
              '<div class="project-goal-form-row">',
                '<el-input v-model="goalForm.title" placeholder="目标标题" class="project-goal-title-input" />',
                '<el-select v-model="goalForm.priority" class="project-goal-priority-select">',
                  '<el-option v-for="p in priorityOptions" :key="p.key" :label="p.label" :value="p.key" />',
                '</el-select>',
              '</div>',
              '<el-input v-model="goalForm.description" type="textarea" :rows="5" placeholder="目标描述（必填）：描述项目目标的背景、范围和期望结果" />',
            '</div>',
          '</div>',
          '<div class="project-bottom-goal-right">',
            '<div class="project-history-inline-head">',
              '<span class="project-history-inline-title">历史记录</span>',
            '</div>',
            '<div class="project-history-inline-list">',
              '<div v-if="historyItems.length === 0" class="project-history-inline-empty">暂无已发起的目标</div>',
              '<article v-for="item in historyItems" :key="item.id" class="project-history-inline-card" :class="{ expanded: historyExpandedId === item.id }">',
                '<div class="project-history-inline-card-head" @click="toggleHistoryExpand(item)">',
                  '<strong>{{ item.title }}</strong>',
                  '<span class="project-history-inline-card-meta">{{ item.statusLabel }} · {{ item.doneCount }}/{{ item.childCount }} 子任务</span>',
                '</div>',
                '<div v-if="historyExpandedId === item.id" class="project-history-inline-card-body">',
                  '<p class="project-history-inline-card-desc">{{ item.body || \'暂无描述\' }}</p>',
                  '<div v-if="item.children.length" class="project-history-inline-children">',
                    '<div v-for="child in item.children" :key="child.id" class="project-history-inline-child">',
                      '<span class="project-history-inline-child-title">{{ child.title }}</span>',
                      '<el-tag size="small" :type="taskStatusType(child.status)" effect="plain">{{ taskStatusLabel(child.status) }}</el-tag>',
                    '</div>',
                  '</div>',
                  '<div class="project-history-inline-card-actions">',
                    '<el-button size="small" @click="openHistoryComment(item.id)">补充说明</el-button>',
                  '</div>',
                '</div>',
              '</article>',
            '</div>',
          '</div>',
        '</div>',
      '</section>'
    ].join('');
  }

  function drawerTemplate() {
    return [
      '<el-drawer v-model="drawerVisible" :title="drawerTitle" direction="rtl" size="480px" class="project-unified-drawer">',
        '<div class="project-drawer-body">',
          drawerTaskDetailTemplate(),
        '</div>',
      '</el-drawer>'
    ].join('');
  }

  function membersSidebarTemplate() {
    return [
      '<aside v-if="membersSidebarVisible" class="project-members-sidebar">',
        '<div class="project-members-sidebar-head">',
          '<div class="project-members-sidebar-title">',
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
            '<span>项目成员</span>',
            '<em>{{ members.length }}</em>',
          '</div>',
          '<button type="button" class="project-members-sidebar-close" @click="closeMembersSidebar" title="收起">',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
          '</button>',
        '</div>',
        '<div class="project-members-sidebar-summary"><strong>{{ members.length }}</strong><span>位专家参与 · {{ todoStats.total }} 个任务</span></div>',
        '<button type="button" class="sidebar-add-member-btn" @click="openAddMemberDialog">+ 添加成员</button>',
        '<div class="project-members-sidebar-list">',
          '<article v-for="row in members" :key="row.id" class="project-drawer-member-card" :class="{ \'highlighting-expert\': highlightExpertId === row.expertId }">',
            '<span class="project-member-task-counter" :class="{ active: highlightExpertId === row.expertId }" @click.stop="highlightExpertId === row.expertId ? clearHighlightExpertTasks() : highlightExpertTasks(row.expertId)" @mouseenter="highlightExpertTasks(row.expertId)" @mouseleave="clearHighlightExpertTasks" :title="\'点击或悬停高亮 \' + row.expert.name + \' 的任务\'">{{ getMemberTaskStats(row.expertId).done }}/{{ getMemberTaskStats(row.expertId).total }}</span>',
            '<img :src="row.expert.avatar" :alt="row.expert.name">',
            '<div class="project-drawer-member-main">',
              '<div class="project-drawer-member-head"><strong>{{ row.expert.name }}</strong></div>',
              '<p class="project-drawer-member-desc">{{ row.expert.description || \'暂无能力介绍\' }}</p>',
              '<div class="project-drawer-member-stats">',
                '<span class="member-stat-item">任务 {{ getMemberTaskStats(row.expertId).total }}</span>',
                '<span class="member-stat-item member-stat-done">完成 {{ getMemberTaskStats(row.expertId).done }}</span>',
                '<span v-if="getMemberTaskStats(row.expertId).blocked" class="member-stat-item member-stat-blocked">阻塞 {{ getMemberTaskStats(row.expertId).blocked }}</span>',
              '</div>',
              '<div class="project-drawer-member-actions">',
                '<button type="button" @click="createTaskForMember(row)">给 TA 创建任务</button>',
                '<button type="button" class="danger" @click="removeMember(row.id)">移除</button>',
              '</div>',
            '</div>',
          '</article>',
          '<div v-if="members.length === 0" class="project-empty-panel">暂无项目成员</div>',
        '</div>',
      '</aside>'
    ].join('');
  }

  function drawerTaskDetailTemplate() {
    return [
      '<template v-if="drawerMode === \'taskDetail\'">',
        '<div v-if="drawerTask" class="project-task-detail" :class="taskStatusClass(drawerTask)">',
          '<div class="project-task-detail-header">',
            '<div class="project-task-detail-status-bar"></div>',
            '<div class="project-task-detail-header-main">',
              '<div class="project-task-detail-title-row">',
                '<h3>{{ taskDisplayTitle(drawerTask) }}</h3>',
                '<el-tag :type="taskStatusType(drawerTask.status)" effect="dark" round>{{ taskStatusLabel(drawerTask.status) }}</el-tag>',
              '</div>',
              '<div class="project-task-detail-sub">',
                '<span class="project-task-detail-priority" :class="\'priority-\' + (drawerTask.priority || \'medium\')">',
                  '<span class="priority-dot"></span>{{ priorityLabel(drawerTask.priority) }}优先级',
                '</span>',
                '<span class="project-task-detail-sub-sep">·</span>',
                '<span class="project-task-detail-time">创建于 {{ formatTaskTime(drawerTask.createdAt) }}</span>',
                '<template v-if="drawerTask.completedAt">',
                  '<span class="project-task-detail-sub-sep">·</span>',
                  '<span class="project-task-detail-time">完成于 {{ formatTaskTime(drawerTask.completedAt) }}</span>',
                '</template>',
              '</div>',
            '</div>',
          '</div>',
          '<div class="project-task-detail-assignee">',
            '<div class="project-task-detail-assignee-avatar">',
              '<img v-if="drawerTask.expertId" :src="(expertById(drawerTask.expertId) || {}).avatar" :alt="expertName(drawerTask.expertId)">',
              '<span v-else class="project-task-detail-assignee-placeholder">未</span>',
            '</div>',
            '<div class="project-task-detail-assignee-info">',
              '<span class="project-task-detail-assignee-label">负责人</span>',
              '<span class="project-task-detail-assignee-name">{{ drawerTask.assigneeLabel || expertName(drawerTask.expertId) }}</span>',
            '</div>',
          '</div>',
          '<div class="project-task-detail-section">',
            '<div class="project-task-detail-section-title"><span class="section-icon">📋</span>任务说明</div>',
            '<div class="project-task-detail-section-body">{{ taskBody(drawerTask) }}</div>',
          '</div>',
          '<div v-if="drawerTask.result" class="project-task-detail-section project-task-detail-section-result">',
            '<div class="project-task-detail-section-title"><span class="section-icon">✅</span>完成结果</div>',
            '<div class="project-task-detail-section-body">{{ drawerTask.result }}</div>',
          '</div>',
          '<div v-if="drawerTask.blockedReason" class="project-task-detail-section project-task-detail-section-warn">',
            '<div class="project-task-detail-section-title"><span class="section-icon">⚠️</span>阻塞原因</div>',
            '<div class="project-task-detail-section-body">{{ drawerTask.blockedReason }}</div>',
          '</div>',
          '<div v-if="taskParentTask(drawerTask.parentTaskId)" class="project-task-detail-section project-task-detail-section-link">',
            '<div class="project-task-detail-section-title"><span class="section-icon">🔗</span>父任务</div>',
            '<button type="button" class="project-task-detail-parent-link" @click="openTaskDetail(taskParentTask(drawerTask.parentTaskId))">{{ taskDisplayTitle(taskParentTask(drawerTask.parentTaskId)) }}</button>',
          '</div>',
          '<div class="project-task-detail-actions">',
            '<el-button type="primary" size="small" @click="openManualCreateDialog({ parentTaskId: drawerTask.id })">创建后续任务</el-button>',
            '<el-dropdown trigger="click" placement="top-end" @command="(cmd) => handleCardMenuAction(cmd, drawerTask)">',
              '<el-button size="small">更多操作 ⋯</el-button>',
              '<template #dropdown>',
                '<el-dropdown-menu>',
                  '<el-dropdown-item v-for="ma in getCardMenuActions(drawerTask)" :key="ma.key" :command="ma">{{ ma.label }}</el-dropdown-item>',
                '</el-dropdown-menu>',
              '</template>',
            '</el-dropdown>',
          '</div>',
        '</div>',
        '<div v-else class="project-empty-panel">未选择任务</div>',
      '</template>'
    ].join('');
  }

  function drawerMembersTemplate() {
    // Deprecated: members now live in the persistent sidebar (membersSidebarTemplate).
    return '';
  }

  function manualCreateDialogTemplate() {
    return [
      '<el-dialog v-model="showManualCreateDialog" title="手动创建任务" width="520px" :close-on-click-modal="false" append-to-body>',
        '<el-form label-position="top">',
          '<el-form-item label="任务标题" required>',
            '<el-input v-model="manualForm.title" placeholder="新任务标题" />',
          '</el-form-item>',
          '<el-form-item label="任务说明">',
            '<el-input v-model="manualForm.body" type="textarea" :rows="2" placeholder="任务背景、要求和验收标准" />',
          '</el-form-item>',
          '<el-form-item label="负责人" required>',
            '<el-select v-model="manualForm.assignee" placeholder="从项目成员中选择" filterable clearable>',
              '<el-option v-for="m in members" :key="m.expertId" :label="m.expert.name" :value="m.expertId" />',
            '</el-select>',
          '</el-form-item>',
          '<div class="project-manual-form-row">',
            '<el-form-item label="任务状态" class="project-manual-form-col">',
              '<el-select v-model="manualForm.status">',
                '<el-option label="待开始" value="todo" />',
                '<el-option label="排队中" value="ready" />',
                '<el-option label="进行中" value="running" />',
                '<el-option label="阻塞" value="blocked" />',
              '</el-select>',
            '</el-form-item>',
            '<el-form-item label="优先级" class="project-manual-form-col">',
              '<el-select v-model="manualForm.priority">',
                '<el-option v-for="p in priorityOptions" :key="p.key" :label="p.label" :value="p.key" />',
              '</el-select>',
            '</el-form-item>',
          '</div>',
          '<el-form-item label="父任务">',
            '<el-select v-model="manualForm.parentTaskId" placeholder="可选，选择已有任务作为依赖" filterable clearable>',
              '<el-option v-for="task in projectTasks" :key="task.id" :label="taskDisplayTitle(task)" :value="task.id" />',
            '</el-select>',
          '</el-form-item>',
          '<el-form-item label="工作目录">',
            '<el-input v-model="manualForm.workdir" placeholder="默认继承项目工作目录" />',
          '</el-form-item>',
          '<div class="project-manual-advanced">',
            '<button type="button" class="project-manual-advanced-toggle" @click="manualAdvancedVisible = !manualAdvancedVisible">▾ 高级设置</button>',
            '<div v-show="manualAdvancedVisible" class="project-manual-advanced-body">',
              '<el-form-item label="额外 Skill"><el-input v-model="manualForm.skill" placeholder="后续扩展" disabled /></el-form-item>',
              '<el-form-item label="Goal Mode"><el-input v-model="manualForm.goalMode" placeholder="后续扩展" disabled /></el-form-item>',
              '<el-form-item label="最大运行时长"><el-input v-model="manualForm.maxRuntime" placeholder="如 90s / 30m / 2h" disabled /></el-form-item>',
              '<el-form-item label="失败重试上限"><el-input v-model="manualForm.maxRetries" placeholder="数字" disabled /></el-form-item>',
            '</div>',
          '</div>',
        '</el-form>',
        '<template #footer>',
          '<el-button @click="closeManualCreateDialog">取消</el-button>',
          '<el-button type="primary" @click="submitManualCreate">创建并派发</el-button>',
        '</template>',
      '</el-dialog>'
    ].join('');
  }

  function taskActionDialogTemplate() {
    return [
      '<el-dialog :model-value="!!taskAction.type" :title="taskActionTitle" width="460px" :close-on-click-modal="false" append-to-body @update:model-value="closeTaskAction">',
        '<div v-if="taskActionTask" class="project-task-action-target">目标任务：<strong>{{ taskDisplayTitle(taskActionTask) }}</strong></div>',
        '<el-form label-position="top">',
          commentActionTemplate(),
          assignActionTemplate(),
          completeActionTemplate(),
          blockActionTemplate(),
          unblockActionTemplate(),
          editActionTemplate(),
          reassignActionTemplate(),
          moveStatusActionTemplate(),
          archiveActionTemplate(),
          deleteActionTemplate(),
          decomposeActionTemplate(),
        '</el-form>',
        '<template #footer>',
          '<el-button @click="closeTaskAction">取消</el-button>',
          '<el-button type="primary" @click="submitTaskAction">{{ taskActionConfirmLabel }}</el-button>',
        '</template>',
      '</el-dialog>'
    ].join('');
  }

  function commentActionTemplate() {
    return '<el-form-item v-if="taskAction.type === \'comment\'" label="评论内容" required><el-input v-model="taskActionForm.comment" type="textarea" :rows="3" placeholder="评论正文" /></el-form-item>';
  }
  function assignActionTemplate() {
    return '<el-form-item v-if="taskAction.type === \'assign\'" label="负责人" required><el-select v-model="taskActionForm.assignee" placeholder="从项目成员中选择" filterable clearable><el-option v-for="m in members" :key="m.expertId" :label="m.expert.name" :value="m.expertId" /></el-select></el-form-item>';
  }
  function completeActionTemplate() {
    return '<el-form-item v-if="taskAction.type === \'complete\'" label="完成说明"><el-input v-model="taskActionForm.result" type="textarea" :rows="2" placeholder="完成结果摘要" /></el-form-item>';
  }
  function blockActionTemplate() {
    return [
      '<div v-if="taskAction.type === \'block\'">',
        '<el-form-item label="阻塞原因" required><el-input v-model="taskActionForm.blockedReason" type="textarea" :rows="2" placeholder="为什么无法继续" /></el-form-item>',
        '<el-form-item label="阻塞类型"><el-select v-model="taskActionForm.blockKind"><el-option label="依赖未清" value="dependency" /><el-option label="需要输入" value="needs_input" /><el-option label="能力不足" value="capability" /><el-option label="临时问题" value="transient" /></el-select></el-form-item>',
      '</div>'
    ].join('');
  }
  function unblockActionTemplate() {
    return '<el-form-item v-if="taskAction.type === \'unblock\'" label="重启说明"><el-input v-model="taskActionForm.unblockReason" type="textarea" :rows="2" placeholder="重启说明（可选）" /></el-form-item>';
  }
  function editActionTemplate() {
    return [
      '<div v-if="taskAction.type === \'edit\'">',
        '<el-form-item label="任务标题" required><el-input v-model="taskActionForm.editTitle" /></el-form-item>',
        '<el-form-item label="任务说明"><el-input v-model="taskActionForm.editBody" type="textarea" :rows="3" /></el-form-item>',
        '<el-form-item label="优先级"><el-select v-model="taskActionForm.editPriority"><el-option v-for="p in priorityOptions" :key="p.key" :label="p.label" :value="p.key" /></el-select></el-form-item>',
      '</div>'
    ].join('');
  }
  function reassignActionTemplate() {
    return [
      '<div v-if="taskAction.type === \'reassign\'">',
        '<el-form-item label="转交给" required><el-select v-model="taskActionForm.assignee" placeholder="从项目成员中选择" filterable clearable><el-option v-for="m in members" :key="m.expertId" :label="m.expert.name" :value="m.expertId" /></el-select></el-form-item>',
        '<el-form-item label="转交原因"><el-input v-model="taskActionForm.reassignReason" type="textarea" :rows="2" placeholder="转交原因（可选）" /></el-form-item>',
      '</div>'
    ].join('');
  }
  function moveStatusActionTemplate() {
    return '<el-form-item v-if="taskAction.type === \'moveStatus\'" label="目标状态" required><el-select v-model="taskActionForm.moveTarget" placeholder="选择目标状态"><el-option v-for="m in getTaskStatusMoves(taskActionTask)" :key="m.key" :label="m.label" :value="m.key" /></el-select></el-form-item>';
  }
  function archiveActionTemplate() {
    return '<div v-if="taskAction.type === \'archive\'" class="project-task-action-tip">归档后任务将移至「已归档」列，默认隐藏。可在卡片菜单中查看。</div>';
  }
  function deleteActionTemplate() {
    return '<div v-if="taskAction.type === \'delete\'" class="project-task-action-tip project-task-action-warn">永久删除不可恢复，任务将从此项目中彻底移除。确定继续？</div>';
  }
  function decomposeActionTemplate() {
    return '<div v-if="taskAction.type === \'decompose\'" class="project-task-action-tip">提交后协调专家将自动拆解目标任务为子任务并派发给项目成员。</div>';
  }

  function historyCommentDialogTemplate() {
    return [
      '<el-dialog v-model="showHistoryCommentDialog" title="补充说明" width="440px" :close-on-click-modal="false" append-to-body>',
        '<el-form label-position="top">',
          '<el-form-item label="补充说明" required>',
            '<el-input v-model="historyCommentDraft.text" type="textarea" :rows="4" placeholder="对已发起的目标追加说明，协调专家在后续拆解/调度时会读取" />',
          '</el-form-item>',
        '</el-form>',
        '<template #footer>',
          '<el-button @click="showHistoryCommentDialog = false">取消</el-button>',
          '<el-button type="primary" @click="submitHistoryComment">提交</el-button>',
        '</template>',
      '</el-dialog>'
    ].join('');
  }

  function orchestrationDialogTemplate() {
    return [
      '<el-dialog v-model="showOrchestrationDialog" title="项目编排配置" width="480px" :close-on-click-modal="false" append-to-body>',
        '<el-form label-position="top">',
          '<el-form-item label="协调专家（用于目标式下发）">',
            '<el-select v-model="orchestrationDraft.orchestratorProfileId" placeholder="选择协调专家" filterable clearable>',
              '<el-option v-for="m in members" :key="m.expertId" :label="m.expert.name" :value="m.expertId" />',
            '</el-select>',
          '</el-form-item>',
          '<el-form-item label="默认负责人">',
            '<el-select v-model="orchestrationDraft.defaultAssignee" placeholder="可选" filterable clearable>',
              '<el-option v-for="m in members" :key="m.expertId" :label="m.expert.name" :value="m.expertId" />',
            '</el-select>',
          '</el-form-item>',
          '<el-form-item label="自动拆解">',
            '<el-switch v-model="orchestrationDraft.autoDecomposeEnabled" />',
            '<span class="orchestration-hint">开启后，目标式下发提交即自动拆解并派发</span>',
          '</el-form-item>',
        '</el-form>',
        '<template #footer>',
          '<el-button @click="showOrchestrationDialog = false">取消</el-button>',
          '<el-button type="primary" @click="saveOrchestration">保存</el-button>',
        '</template>',
      '</el-dialog>'
    ].join('');
  }

  function workspaceFolderDialogTemplate() {
    return [
      '<el-dialog v-model="workspaceFolderDialogVisible" title="新建文件夹" width="420px" :close-on-click-modal="false" append-to-body>',
        '<el-form label-position="top">',
          '<el-form-item label="文件夹名称" required>',
            '<el-input v-model="workspaceFolderName" placeholder="请输入文件夹名称" maxlength="60" show-word-limit @keyup.enter="submitWorkspaceFolderDialog" />',
          '</el-form-item>',
        '</el-form>',
        '<template #footer>',
          '<el-button @click="workspaceFolderDialogVisible = false">取消</el-button>',
          '<el-button type="primary" @click="submitWorkspaceFolderDialog">创建</el-button>',
        '</template>',
      '</el-dialog>'
    ].join('');
  }

  function addMemberDialogTemplate() {
    return [
      '<el-dialog v-model="showAddMemberDialog" width="640px" class="form-dialog form-dialog-project form-dialog-add-member" :close-on-click-modal="false" append-to-body>',
        '<template #header>',
          '<div class="dialog-header-custom dialog-header-project">',
            '<div class="dialog-header-icon dialog-header-icon-project">👥</div>',
            '<div class="dialog-header-text"><div class="dialog-header-title">添加项目成员</div><div class="dialog-header-sub">搜索并选择专家加入项目</div></div>',
          '</div>',
        '</template>',
        '<div class="form-dialog-body">',
          '<div class="wizard-step-content wizard-step-members">',
            '<div class="member-picker-head">',
              '<div class="member-picker-search"><svg class="member-picker-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><el-input v-model="addMemberSearchQuery" placeholder="搜索专家名称、介绍或擅长领域" clearable /></div>',
              '<span class="member-picker-count">{{ addMemberExpertIds.length }} 人已选</span>',
            '</div>',
            '<div v-if="filteredAddableExperts.length" class="member-picker-grid member-picker-grid-dialog">',
              '<button v-for="e in filteredAddableExperts" :key="e.id" type="button" class="member-picker-card" :class="{ \'member-picker-card-selected\': isAddMemberSelected(e.id) }" @click="toggleAddMember(e.id)">',
                '<img :src="e.avatar" :alt="e.name" class="member-picker-avatar">',
                '<div class="member-picker-info"><span class="member-picker-name">{{ e.name }}</span><span class="member-picker-desc-text">{{ e.description || \'暂无介绍\' }}</span><div v-if="e.expertise && e.expertise.length" class="member-picker-tags"><span v-for="tag in e.expertise.slice(0, 3)" :key="tag" class="member-picker-tag">{{ tag }}</span></div></div>',
                '<span class="member-picker-check" :class="{ \'member-picker-check-on\': isAddMemberSelected(e.id) }"><svg v-if="isAddMemberSelected(e.id)" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span>',
              '</button>',
            '</div>',
            '<div v-else class="member-picker-empty"><div class="member-picker-empty-icon">{{ addableExperts.length ? \'🔍\' : \'👤\' }}</div><p>{{ addableExperts.length ? \'未找到匹配的专家\' : \'所有专家已加入项目\' }}</p><span>{{ addableExperts.length ? \'试试其他关键词\' : \'暂无可添加的专家\' }}</span></div>',
          '</div>',
        '</div>',
        '<template #footer>',
          '<div class="dialog-footer-custom dialog-footer-wizard"><div class="dialog-footer-actions"><el-button class="wizard-btn wizard-btn-cancel" @click="closeAddMemberDialog">取消</el-button><el-button class="wizard-btn wizard-btn-submit wizard-btn-submit-project" @click="submitAddMembers">确认添加</el-button></div></div>',
        '</template>',
      '</el-dialog>'
    ].join('');
  }

  window.ProjectDetailPage = ProjectDetailPage;
})();
