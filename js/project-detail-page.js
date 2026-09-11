/**
 * 项目详情页
 */
(function () {
  var store = window.AppStore;
  var expertMatchesSearch = window.AppShared.expertMatchesSearch;

  var STATUS_TEXT = {
    triage: '反复阻塞',
    todo: '待开始',
    scheduled: '已排期',
    ready: '可执行',
    queued: '可执行',
    running: '执行中',
    blocked: '待介入',
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
    { key: 'todo', title: '待办', statuses: ['todo', 'scheduled', 'ready'] },
    { key: 'running', title: '进行中', statuses: ['running', 'review'] },
    { key: 'blocked', title: '暂停', statuses: ['blocked'] },
    { key: 'done', title: '已完成', statuses: ['done', 'archived'] }
  ];

  var EVENT_FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'task', label: '任务协作' },
    { key: 'project', label: '项目与成员' }
  ];

  var PRIORITY_OPTIONS = [
    { key: 'low', label: '低' },
    { key: 'medium', label: '中' },
    { key: 'high', label: '高' }
  ];

  var DRAWER_MODES = {
    taskDetail: '任务详情',
    members: '项目成员'
  };

  var TASK_STATUS_MOVES = {
    triage: [{ key: 'todo', label: '待开始' }],
    todo: [{ key: 'ready', label: '可执行' }, { key: 'blocked', label: '阻塞' }],
    scheduled: [{ key: 'ready', label: '可执行' }, { key: 'todo', label: '待开始' }],
    ready: [{ key: 'todo', label: '待开始' }, { key: 'blocked', label: '阻塞' }],
    blocked: [{ key: 'ready', label: '可执行' }, { key: 'todo', label: '待开始' }]
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
    components: {},
    setup: function (props) {
      var project = Vue.ref(null);
      var members = Vue.ref([]);
      var projectTasks = Vue.ref([]);
      var events = Vue.ref([]);
      var allExperts = Vue.ref(store.getExperts());
      var activeTab = Vue.ref(props.initialTab === 'workspace' ? 'workspace' : props.initialTab === 'timeline' ? 'timeline' : 'kanban');
      var highlightExpertId = Vue.ref(null);
      var drawerMode = Vue.ref('taskDetail');
      var drawerVisible = Vue.ref(false);
      var membersSidebarVisible = Vue.ref(false);
      var eventFilter = Vue.ref('all');
      var selectedProjectTaskId = Vue.ref(null);
      var drawerTaskId = Vue.ref(null);
      var workspaceCurrentFolderId = Vue.ref(null);
      var workspaceFolderDialogVisible = Vue.ref(false);
      var workspaceFolderName = Vue.ref('');
      var workspaceFileInput = Vue.ref(null);
      var projectWorkspaceMaterials = Vue.ref([]);
      var showAddMemberDialog = Vue.ref(false);
      var addMemberExpertIds = Vue.ref([]);
      var addMemberSearchQuery = Vue.ref('');
      var showProjectSettingsDialog = Vue.ref(false);
      var projectSettingsDraft = Vue.ref({ name: '', description: '' });
      var showGoalDialog = Vue.ref(false);
      var goalForm = Vue.ref({ title: '', description: '', model: '' });
      var goalSubmitting = Vue.ref(false);
      var decompositionModelOptions = (window.MODELS_CATALOG || []).slice();
      var historyItems = Vue.ref([]);
      var historyDetailId = Vue.ref(null);
      var showHistoryDialog = Vue.ref(false);
      var historySpecifyDraft = Vue.ref('');
      var historyRetrying = Vue.ref(false);
      var showManualCreateDialog = Vue.ref(false);
      var manualForm = Vue.ref({ title: '', body: '', assignee: '', status: 'todo', parentTaskId: '', priority: 'medium' });
      var cardMenuTaskId = Vue.ref(null);
      var drawerCommentDraft = Vue.ref('');
      var taskAction = Vue.ref({ type: '', taskId: null });
      var taskActionVisible = Vue.ref(false);
      var taskActionForm = Vue.ref({ comment: '', assignee: '', result: '', blockedReason: '', unblockReason: '', reassignReason: '', editTitle: '', editBody: '', editPriority: '', moveTarget: '', blockKind: 'dependency', resumeSupplement: '' });
      var expandedRunIds = Vue.ref({});
      var execDetailExpanded = Vue.ref({});
      var contextSectionExpanded = Vue.ref(true);
      var logPanelVisible = Vue.ref({});
      var logTailContent = Vue.ref({});
      var detailPane = Vue.ref('task');
      var processEventsExpanded = Vue.ref(false);
      var outputPreviewVisible = Vue.ref(false);
      var outputPreviewFile = Vue.ref(null);
      var showArchivedInDone = Vue.ref(false);
      var advancedOpen = Vue.ref(false);

      function toggleRunExpanded(runId) {
        var map = Object.assign({}, expandedRunIds.value);
        map[runId] = !map[runId];
        expandedRunIds.value = map;
      }

      function toggleExecDetail(key) {
        var map = Object.assign({}, execDetailExpanded.value);
        map[key] = !map[key];
        execDetailExpanded.value = map;
      }

      function toggleContextSection() {
        contextSectionExpanded.value = !contextSectionExpanded.value;
      }

      function toggleLogPanel(taskId) {
        var map = Object.assign({}, logPanelVisible.value);
        map[taskId] = !map[taskId];
        logPanelVisible.value = map;
        if (map[taskId] && !logTailContent.value[taskId]) {
          var tailMap = Object.assign({}, logTailContent.value);
          tailMap[taskId] = generateDemoLogTail(taskId);
          logTailContent.value = tailMap;
        }
      }

      function generateDemoLogTail(taskId) {
        var lines = [
          '[2026-07-09 15:45:02] INFO  worker started, pid=28471, task=' + (taskId || 'unknown'),
          '[2026-07-09 15:45:03] INFO  loading skills: data-query, correlation-analysis',
          '[2026-07-09 15:45:05] INFO  connecting to EMS API endpoint https://ems.internal/api/v2/pm',
          '[2026-07-09 15:45:08] INFO  auth token acquired, starting data fetch',
          '[2026-07-09 15:45:12] INFO  fetching PM records for chamber-3 (range: 90 days)',
          '[2026-07-09 15:45:18] INFO  received 1,247 PM records, parsing...',
          '[2026-07-09 15:45:22] INFO  cross-referencing with yield data (etch-3)',
          '[2026-07-09 15:45:30] WARN  3 records have missing timestamp, skipping',
          '[2026-07-09 15:45:35] INFO  correlation analysis: r=0.78 between PM_interval and yield_drop',
          '[2026-07-09 15:45:38] INFO  generating scatter plot: pm_interval_vs_yield.png',
          '[2026-07-09 15:45:42] INFO  writing summary report...',
          '[2026-07-09 15:45:45] INFO  heartbeat sent, run_id=run-2, progress=65%',
          '[2026-07-09 15:45:50] INFO  fetching extended PM records (chamber-1, chamber-2 for baseline)',
          '[2026-07-09 15:45:55] INFO  baseline correlation: r=0.12 (within normal range)',
          '[2026-07-09 15:46:00] INFO  preparing output artifacts...',
          '[2026-07-09 15:46:02] INFO  heartbeat sent, run_id=run-2, progress=72%'
        ];
        return lines.join('\n');
      }

      function isGoalRoot(task) {
        if (store.isProjectGoalRoot) return store.isProjectGoalRoot(task);
        return !!(task && task.isTriage === true);
      }

      function isKickbackTriage(task) {
        if (store.isKickbackTriageTask) return store.isKickbackTriageTask(task);
        return !!(task && task.isTriage !== true && normalizeTaskStatus(task.status) === 'triage');
      }

      function goalRequestStatusOf(task) {
        if (store.inferGoalRequestStatus) return store.inferGoalRequestStatus(task);
        return String((task && task.goalRequestStatus) || '');
      }

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
        workspaceCurrentFolderId.value = null;
        projectWorkspaceMaterials.value = [];
      }

      function loadHistory() {
        if (!store.getRootProjectTasks) { historyItems.value = []; return; }
        historyItems.value = store.getRootProjectTasks(props.projectId).map(function (t) {
          var children = store.getChildProjectTasks ? store.getChildProjectTasks(props.projectId, t.id) : [];
          var doneCount = children.filter(function (c) { return normalizeTaskStatus(c.status) === 'done'; }).length;
          var rawRequestStatus = goalRequestStatusOf(t);
          var rootStatus = normalizeTaskStatus(t.status);
          var requestStatus = 'running';
          if (rawRequestStatus === 'decompose_failed') requestStatus = 'decompose_failed';
          else if (rawRequestStatus === 'decomposing' || rawRequestStatus === 'submitted') requestStatus = 'decomposing';
          else if (rootStatus === 'done' || rootStatus === 'archived') requestStatus = 'completed';
          var statusLabel = requestStatus === 'decompose_failed'
            ? '拆解失败'
            : requestStatus === 'decomposing'
              ? '拆解中'
              : requestStatus === 'completed'
                ? '已完成'
                : '进行中';
          var iconKind = 'done';
          if (requestStatus === 'decompose_failed') iconKind = 'failed';
          else if (requestStatus === 'decomposing') iconKind = 'loading';
          return {
            id: t.id,
            title: t.title,
            body: t.body || '',
            createdAt: t.createdAt,
            completedAt: t.completedAt || t.updatedAt || '',
            requestStatus: requestStatus,
            statusLabel: statusLabel,
            iconKind: iconKind,
            decomposeError: t.decomposeError || '',
            result: t.latestSummary || t.result || '',
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
        projectSettingsDraft.value = {
          name: currentProject.name || '',
          description: currentProject.description || ''
        };
        refreshProjectWorkspace();
        loadHistory();
        if (selectedProjectTaskId.value && !projectTasks.value.some(function (t) { return t.id === selectedProjectTaskId.value; })) {
          selectedProjectTaskId.value = null;
        }
      }

      var todoStats = Vue.computed(function () {
        var executable = projectTasks.value.filter(function (t) {
          if (isGoalRoot(t)) return false;
          return normalizeTaskStatus(t.status) !== 'archived';
        });
        var total = executable.length;
        var done = executable.filter(function (t) { return normalizeTaskStatus(t.status) === 'done'; }).length;
        var blocked = executable.filter(function (t) {
          return normalizeTaskStatus(t.status) === 'blocked' || isKickbackTriage(t);
        }).length;
        var running = executable.filter(function (t) {
          var s = normalizeTaskStatus(t.status);
          return s === 'running' || s === 'review';
        }).length;
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
          var tasks = projectTasks.value.filter(function (task) {
            if (isGoalRoot(task)) return false;
            var s = normalizeTaskStatus(task.status);
            if (col.key === 'blocked') return s === 'blocked' || isKickbackTriage(task);
            if (s === 'triage' || s === 'archived') return false;
            return col.statuses.indexOf(s) !== -1;
          });
          var archivedTasks = [];
          var archivedCount = 0;
          if (col.key === 'done') {
            archivedTasks = projectTasks.value.filter(function (task) {
              if (isGoalRoot(task)) return false;
              return normalizeTaskStatus(task.status) === 'archived';
            });
            archivedCount = archivedTasks.length;
            if (!showArchivedInDone.value) archivedTasks = [];
          }
          return Object.assign({}, col, {
            tasks: tasks,
            archivedTasks: archivedTasks,
            archivedCount: archivedCount
          });
        });
      });

      var historyBadgeKind = Vue.computed(function () {
        var items = historyItems.value || [];
        if (items.some(function (item) { return item.requestStatus === 'decompose_failed'; })) return 'failed';
        if (items.some(function (item) { return item.requestStatus === 'decomposing'; })) return 'loading';
        return 'idle';
      });

      var historyDetail = Vue.computed(function () {
        if (!historyDetailId.value) return null;
        return historyItems.value.find(function (item) { return item.id === historyDetailId.value; }) || null;
      });

      var historyDetailCanSpecify = Vue.computed(function () {
        var item = historyDetail.value;
        if (!item) return false;
        return item.requestStatus === 'decompose_failed';
      });

      var formParentTasks = Vue.computed(function () {
        return projectTasks.value.filter(function (task) {
          if (isGoalRoot(task)) return false;
          return normalizeTaskStatus(task.status) !== 'archived';
        });
      });

      var filteredEvents = Vue.computed(function () {
        return events.value;
      });

      var eventDayGroups = Vue.computed(function () {
        var groups = [];
        var map = {};
        (filteredEvents.value || []).forEach(function (event) {
          var label = eventDayLabel(event && event.createdAt);
          if (!map[label]) {
            map[label] = { label: label, items: [] };
            groups.push(map[label]);
          }
          map[label].items.push(event);
        });
        return groups;
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
          updateBlock: '更新阻塞说明',
          editResult: '补录结果',
          resumeFromLoop: '完善后继续',
          edit: '编辑任务',
          reassign: '转交任务',
          moveStatus: '移动状态',
          archive: '归档任务',
          delete: '永久删除'
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
          updateBlock: '保存',
          editResult: '保存',
          resumeFromLoop: '提交并继续',
          edit: '保存',
          reassign: '转交',
          moveStatus: '移动',
          archive: '归档',
          delete: '永久删除'
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

      function taskDescriptionText(task) {
        var body = trimText(task && task.body);
        return body || '暂无任务说明';
      }

      function taskHasBody(task) {
        return !!trimText(task && task.body);
      }

      function toggleAdvanced() {
        advancedOpen.value = !advancedOpen.value;
      }

      function isStatusEchoSummary(task, summary) {
        var s = trimText(summary);
        if (!s) return true;
        if (task) {
          if (s === trimText(task.body) || s === trimText(task.blockedReason) || s === trimText(task.result)) return true;
        }
        if (/^已指派给/.test(s) || /^已转交给/.test(s) || /^状态从「/.test(s) || /^已重启：/.test(s) || /^已拆解为/.test(s) || /^已根据补充说明/.test(s)) return true;
        return /反复 block\/unblock|任务已归档|任务已完成|任务被阻塞|任务已重启|任务已晋升为排队中|系统正在拆解|系统正在自动评审中/.test(s);
      }

      function shouldShowTaskSummary(task) {
        if (!task) return false;
        return !isStatusEchoSummary(task, task.latestSummary);
      }

      function taskOutputFiles(task) {
        if (!task || !Array.isArray(task.attachments)) return [];
        return task.attachments;
      }

      function taskStructuredFacts(task) {
        if (!task) return null;
        var facts = task.outputFacts || null;
        if (!facts && Array.isArray(task.runs)) {
          var i;
          for (i = 0; i < task.runs.length; i++) {
            var md = task.runs[i] && task.runs[i].metadata;
            if (md && (md.published_pr || (md.changed_files && md.changed_files.length) || (md.findings && md.findings.length))) {
              facts = md;
              break;
            }
          }
        }
        if (!facts) return null;
        var files = Array.isArray(facts.changed_files) ? facts.changed_files : [];
        var findings = Array.isArray(facts.findings) ? facts.findings : [];
        if (!facts.published_pr && !files.length && !findings.length) return null;
        return {
          publishedPr: facts.published_pr || '',
          changedFiles: files,
          findings: findings
        };
      }

      function taskChildOutputs(task) {
        return drawerChildTasks(task).filter(function (child) {
          return shouldShowTaskSummary(child) || !!trimText(child.result);
        });
      }

      function shouldShowOutputSummary(task) {
        if (!task) return false;
        var s = normalizeTaskStatus(task.status);
        if (s === 'todo' || s === 'scheduled') return false;
        if (s === 'running') {
          return drawerTaskRuns(task).some(function (run) {
            return run && run.outcome !== 'running' && run.status !== 'running' && !!trimText(run.summary);
          });
        }
        return shouldShowTaskSummary(task);
      }

      function hasOutputPane(task) {
        if (!task) return false;
        if (taskOutputFiles(task).length) return true;
        if (taskStructuredFacts(task)) return true;
        if (trimText(task.result)) return true;
        if (taskChildOutputs(task).length) return true;
        return shouldShowOutputSummary(task);
      }

      function defaultDetailPane() {
        return 'task';
      }

      function detailPaneTabs(task) {
        var count = drawerTaskComments(task).length;
        return [
          { key: 'task', label: '任务详情' },
          { key: 'process', label: '执行过程' },
          { key: 'comments', label: '评论', count: count }
        ];
      }

      function setDetailPane(key) {
        detailPane.value = key;
      }

      function hasProcessHistory(task) {
        return drawerTaskRuns(task).length > 0;
      }

      function showProcessLog(task) {
        if (!task) return false;
        var s = normalizeTaskStatus(task.status);
        if (s === 'todo' || s === 'scheduled') return false;
        if (s === 'ready' && !hasProcessHistory(task)) return false;
        if (!hasProcessHistory(task) && s !== 'running' && s !== 'blocked' && s !== 'review' && s !== 'done') return false;
        return hasProcessHistory(task) || s === 'running' || s === 'blocked' || s === 'review' || s === 'done';
      }

      function isDetailRunning(task) {
        return normalizeTaskStatus(task && task.status) === 'running';
      }

      function isDetailArchived(task) {
        return normalizeTaskStatus(task && task.status) === 'archived';
      }

      function leadTaskPaneWithDeps(task) {
        if (isKickbackTriage(task)) return false;
        return hasUnfinishedParentDependency(task);
      }

      function copyTaskId(task) {
        var id = task && task.id;
        if (!id) return;
        var text = String(id);
        function succeed() {
          ElementPlus.ElMessage.success('已复制任务 ID');
        }
        function fallback() {
          try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', 'readonly');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok) succeed();
            else ElementPlus.ElMessage.info(text);
          } catch (err) {
            ElementPlus.ElMessage.info(text);
          }
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(succeed).catch(fallback);
          return;
        }
        fallback();
      }

      function previewTaskOutputFile(file) {
        if (!file) return;
        outputPreviewFile.value = {
          id: file.id,
          name: file.name || file.fileName || file.title || '未命名文件',
          size: file.size || 0,
          mime: file.mime || '',
          content: file.content || ''
        };
        outputPreviewVisible.value = true;
      }

      function closeOutputPreview() {
        outputPreviewVisible.value = false;
        outputPreviewFile.value = null;
      }

      function outputPreviewMeta(file) {
        if (!file) return '';
        var bytes = Number(file.size || 0);
        var sizeLabel = '--';
        if (isFinite(bytes) && bytes > 0) {
          if (bytes < 1024) sizeLabel = bytes + ' B';
          else if (bytes < 1024 * 1024) sizeLabel = (bytes / 1024).toFixed(1) + ' KB';
          else sizeLabel = (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
        return sizeLabel + ' · ' + (file.mime || '未知类型') + ' · 只读预览';
      }

      function outputPreviewIsText(file) {
        if (!file || file.content === undefined || file.content === null || file.content === '') return false;
        var mime = String(file.mime || '').toLowerCase();
        var name = String(file.name || '').toLowerCase();
        if (/^image\//.test(mime)) return false;
        if (/\.(png|jpe?g|gif|webp|svg)$/.test(name)) return false;
        return true;
      }

      function downloadTaskOutputFile(file) {
        if (window.AppShared && window.AppShared.downloadWorkspaceFile) {
          window.AppShared.downloadWorkspaceFile(file);
        }
      }

      function previousRunSummary(task) {
        var runs = drawerTaskRuns(task);
        var i;
        for (i = 0; i < runs.length; i++) {
          if (runs[i] && runs[i].outcome !== 'running' && runs[i].status !== 'running' && trimText(runs[i].summary)) {
            return runs[i].summary;
          }
        }
        return '';
      }

      function ensureProcessLogOpen(task) {
        if (!task || !shouldDrawProcessLog(task)) return;
        if (!isImplRunning(task) && !isReviewRun(task)) return;
        var map = Object.assign({}, logPanelVisible.value);
        if (map[task.id]) return;
        map[task.id] = true;
        logPanelVisible.value = map;
        if (!logTailContent.value[task.id]) {
          var tailMap = Object.assign({}, logTailContent.value);
          tailMap[task.id] = generateDemoLogTail(task.id);
          logTailContent.value = tailMap;
        }
      }

      function taskDetailSubStatusLabel(task) {
        if (isKickbackTriage(task)) return '';
        var sub = taskSubStatusLabel(task);
        if (!sub) return '';
        if (sub === taskStatusLabel(task.status)) return '';
        return sub;
      }

      var BLOCK_KIND_LABELS = {
        block_loop_detected: '反复阻塞',
        needs_input: '需人工决策',
        capability: '能力/权限不足',
        transient: '临时故障',
        dependency: '等待依赖'
      };

      var OUTCOME_LABELS = {
        completed: '完成',
        blocked: '阻塞',
        crashed: '崩溃',
        timed_out: '超时',
        spawn_failed: '启动失败',
        gave_up: '已放弃',
        reclaimed: '已回收',
        scheduled: '已排期',
        running: '执行中'
      };

      var EVENT_KIND_LABELS = {
        created: '创建',
        claimed: '领取',
        spawned: '启动',
        promoted: '晋升',
        assigned: '分配负责人',
        completed: '完成',
        blocked: '阻塞',
        unblocked: '解除阻塞',
        crashed: '崩溃',
        timed_out: '超时',
        gave_up: '已放弃',
        decomposed: '拆解',
        commented: '添加评论',
        archived: '归档',
        specified: '完善后继续',
        reclaimed: '收回执行',
        review_requested: '请求评审',
        heartbeat: '心跳',
        block_loop_detected: '反复阻塞'
      };

      function blockKindLabel(kind) {
        return BLOCK_KIND_LABELS[kind] || '需人工介入';
      }

      function runOutcomeLabel(outcome) {
        return OUTCOME_LABELS[outcome] || outcome || '-';
      }

      function eventKindLabel(kind) {
        if (kind === 'heartbeat') return '心跳';
        return EVENT_KIND_LABELS[kind] || kind || '事件';
      }

      function eventPayloadSummary(ev) {
        if (!ev || !ev.payload) return '';
        if (ev.kind === 'heartbeat' && ev.payload.n) return ev.payload.n + ' 次';
        var parts = [];
        if (ev.payload.reason) parts.push(ev.payload.reason);
        if (ev.payload.assignee) parts.push('-> ' + ev.payload.assignee);
        if (ev.payload.exit_code !== undefined && ev.payload.exit_code !== null) parts.push('exit: ' + ev.payload.exit_code);
        if (ev.payload.block_kind) parts.push(blockKindLabel(ev.payload.block_kind));
        if (ev.payload.failures) parts.push(ev.payload.failures + '/' + (ev.payload.effective_limit || ev.payload.failures) + ' 次');
        return parts.join(' · ');
      }

      function runDuration(run) {
        if (!run) return '-';
        var start = run.startedAt;
        var end = run.endedAt || nowIsoStatic();
        if (!start) return '-';
        var ms = new Date(String(end).replace(/([+-]\d{2}):?(\d{2})$/, '$1:$2')).getTime() - new Date(String(start).replace(/([+-]\d{2}):?(\d{2})$/, '$1:$2')).getTime();
        if (isNaN(ms) || ms < 0) return '-';
        var sec = Math.floor(ms / 1000);
        if (sec < 60) return sec + 's';
        var min = Math.floor(sec / 60);
        var rem = sec % 60;
        if (min < 60) return min + 'm' + (rem > 0 ? rem + 's' : '');
        var hr = Math.floor(min / 60);
        var minRem = min % 60;
        return hr + 'h' + (minRem > 0 ? minRem + 'm' : '');
      }

      function nowIsoStatic() {
        return new Date().toISOString();
      }

      function taskElapsedLabel(task) {
        if (!task) return '';
        var start = task.startedAt || task.createdAt;
        if (!start) return '';
        var end = task.completedAt || nowIsoStatic();
        var ms = new Date(String(end).replace(/([+-]\d{2}):?(\d{2})$/, '$1:$2')).getTime() - new Date(String(start).replace(/([+-]\d{2}):?(\d{2})$/, '$1:$2')).getTime();
        if (isNaN(ms) || ms < 0) return '';
        var sec = Math.floor(ms / 1000);
        if (sec < 60) return sec + ' 秒';
        var min = Math.floor(sec / 60);
        if (min < 60) return min + ' 分钟';
        var hr = Math.floor(min / 60);
        return hr + ' 小时 ' + (min % 60) + ' 分';
      }

      function heartbeatAgoLabel(task) {
        if (!task || !task.lastHeartbeatAt) return '';
        var ms = Date.now() - new Date(String(task.lastHeartbeatAt).replace(/([+-]\d{2}):?(\d{2})$/, '$1:$2')).getTime();
        if (isNaN(ms) || ms < 0) return '';
        var sec = Math.floor(ms / 1000);
        if (sec < 60) return sec + ' 秒前';
        var min = Math.floor(sec / 60);
        return min + ' 分钟前';
      }

      function drawerTaskRuns(task) {
        if (!task || !Array.isArray(task.runs)) return [];
        return task.runs;
      }

      function drawerTaskEvents(task) {
        if (!task || !Array.isArray(task.taskEvents)) return [];
        return task.taskEvents.slice().sort(function (a, b) {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
      }

      function drawerTaskDiagnostics(task) {
        if (!task || !Array.isArray(task.diagnostics)) return [];
        return task.diagnostics;
      }

      function drawerTaskComments(task) {
        if (!task || !Array.isArray(task.comments)) return [];
        return task.comments.slice().sort(function (a, b) {
          return String((a && a.createdAt) || '').localeCompare(String((b && b.createdAt) || ''));
        });
      }

      function drawerChildTasks(task) {
        if (!task) return [];
        return projectTasks.value.filter(function (t) {
          return sameTaskId(t.parentTaskId, task.id);
        });
      }

      function childTaskProgress(task) {
        var children = drawerChildTasks(task);
        if (!children.length) return '';
        var done = children.filter(function (c) {
          var s = normalizeTaskStatus(c.status);
          return s === 'done' || s === 'archived';
        }).length;
        return done + '/' + children.length + ' 已完成';
      }

      function hasChildren(task) {
        return drawerChildTasks(task).length > 0;
      }

      function workspacePathLabel(task) {
        if (!task) return '';
        var kind = task.workspaceKind || '';
        var path = task.workspacePath || '';
        if (!path) return '';
        if (kind === 'git') return path;
        return path;
      }

      function taskSkillsLabel(task) {
        if (!task || !Array.isArray(task.skills) || !task.skills.length) return '';
        return task.skills.join(' · ');
      }

      function isTaskActive(task) {
        if (!task) return false;
        if (isKickbackTriage(task)) return true;
        var s = normalizeTaskStatus(task.status);
        return s === 'running' || s === 'blocked';
      }

      function runExpandedDefault(task, run) {
        if (!run) return false;
        if ((isImplRunning(task) || isReviewRun(task)) && run && (run.outcome === 'running' || run.status === 'running')) return true;
        return false;
      }

      function runErrorDisplay(run) {
        if (!run || !run.error) return '';
        return run.error;
      }

      function runMetadataDisplay(run) {
        if (!run || !run.metadata) return '';
        try {
          return typeof run.metadata === 'string' ? run.metadata : JSON.stringify(run.metadata, null, 2);
        } catch (e) {
          return '';
        }
      }

      function runHasDetails(run) {
        if (!run) return false;
        return !!(run.error || run.metadata || run.startedAt || run.endedAt || run.summary);
      }

      function statusBannerType(task) {
        if (!task) return '';
        if (isKickbackTriage(task)) return 'kickback';
        var s = normalizeTaskStatus(task.status);
        if (s === 'archived') return 'archived';
        if (s === 'blocked') return 'blocked';
        if (s === 'running') return 'running';
        if (s === 'review') return 'review';
        if (s === 'done') return 'done';
        if (s === 'scheduled') return 'scheduled';
        if (s === 'ready') return 'ready';
        if (s === 'todo') return hasUnfinishedParentDependency(task) ? 'waiting' : 'enqueue';
        return '';
      }

      function statusBannerBlockedText(task) {
        if (!task) return '';
        var parts = [];
        if (task.blockedReason) parts.push(task.blockedReason);
        var kindLabel = task.blockKind ? blockKindLabel(task.blockKind) : '需人工介入';
        parts.push('类型：' + kindLabel);
        if (task.consecutiveFailures > 0) parts.push('已重试 ' + task.consecutiveFailures + ' 次');
        return parts.join(' · ');
      }

      function statusBannerRunningText(task) {
        if (!task) return '';
        var parts = [];
        parts.push('已运行 ' + (taskElapsedLabel(task) || '...'));
        if (task.currentRunId) parts.push(task.currentRunId);
        var hb = heartbeatAgoLabel(task);
        if (hb) parts.push('heartbeat ' + hb);
        return parts.join(' · ');
      }

      function statusBannerWaitingText(task) {
        var unfinished = unfinishedParentLabels(task);
        if (!unfinished.length) return '等待父任务完成后才能加入执行队列';
        return '等待父任务：' + unfinished.join(', ');
      }

      function statusBannerEnqueueText() {
        return '父依赖已满足，可加入执行队列';
      }

      function statusBannerScheduledText(task) {
        var reason = (task && (task.blockedReason || task.scheduleReason || task.latestSummary)) || '';
        return reason ? ('已排期 · ' + reason) : '已排期，等待激活';
      }

      function statusBannerReadyText(task) {
        if (!taskHasAssignee(task)) return '可执行，等待调度。请先指派负责人，否则调度会跳过此任务。';
        return '可执行，等待调度领取';
      }

      function statusBannerKickbackText(task) {
        var times = (task && task.consecutiveFailures) || 2;
        var kindLabel = task && task.blockKind ? blockKindLabel(task.blockKind) : '反复阻塞';
        var reason = (task && task.blockedReason) || '同一类问题反复出现，再重启会空转';
        return '类型：' + kindLabel + ' · 已出现 ' + times + ' 次 · ' + reason;
      }

      function statusBannerArchivedText() {
        return '已归档 · 只读';
      }

      function taskHasAssignee(task) {
        return !!(task && (task.expertId || task.assignee));
      }

      function statusBannerDoneText(task) {
        if (!task) return '';
        var parts = [];
        if (task.completedAt) parts.push('完成于 ' + formatTaskTime(task.completedAt));
        if (task.latestSummary) parts.push(task.latestSummary.split('\n')[0]);
        return parts.join(' · ');
      }

      function statusBannerReviewText(task) {
        return '系统自动评审中';
      }

      function getTaskFooterActions(task) {
        if (!task) return [];
        if (isReviewUi(task)) return [];
        if (isKickbackTriage(task)) {
          return [
            { key: 'resumeFromLoop', label: '完善后继续', type: 'primary' },
            { key: 'reassign', label: '转交', type: 'default' },
            { key: 'archive', label: '归档', type: 'default' }
          ];
        }
        var s = normalizeTaskStatus(task.status);
        var assignAct = taskHasAssignee(task)
          ? { key: 'reassign', label: '转交', type: 'default' }
          : { key: 'assign', label: '分配负责人', type: 'default' };
        if (s === 'todo') {
          var waiting = hasUnfinishedParentDependency(task);
          return [
            { key: 'enqueue', label: '加入执行队列', type: 'primary', disabled: waiting, tooltip: waiting ? ('等待父任务: ' + unfinishedParentLabels(task).join(', ')) : '' },
            assignAct,
            { key: 'archive', label: '归档', type: 'default' }
          ];
        }
        if (s === 'scheduled') {
          return [
            { key: 'activate', label: '激活', type: 'primary' },
            assignAct,
            { key: 'archive', label: '归档', type: 'default' }
          ];
        }
        if (s === 'ready') {
          if (!taskHasAssignee(task)) {
            return [
              { key: 'assign', label: '分配负责人', type: 'primary' },
              { key: 'archive', label: '归档', type: 'default' }
            ];
          }
          return [
            { key: 'enqueue', label: '催促执行', type: 'primary' },
            { key: 'reassign', label: '转交', type: 'default' },
            { key: 'block', label: '标记阻塞', type: 'default' },
            { key: 'archive', label: '归档', type: 'default' }
          ];
        }
        if (s === 'running' && isImplRunning(task)) {
          return [
            { key: 'complete', label: '完成', type: 'primary' },
            { key: 'block', label: '标记阻塞', type: 'default' },
            { key: 'reassign', label: '转交', type: 'default' },
            { key: 'archive', label: '归档', type: 'default' }
          ];
        }
        if (s === 'review') return [];
        if (s === 'blocked') {
          return [
            { key: 'unblock', label: '重启', type: 'primary' },
            { key: 'reassign', label: '转交', type: 'default' },
            { key: 'archive', label: '归档', type: 'default' }
          ];
        }
        if (s === 'done') {
          return [
            { key: 'followup', label: '创建后续任务', type: 'primary' },
            { key: 'editResult', label: '补录结果', type: 'default' },
            { key: 'archive', label: '归档', type: 'default' }
          ];
        }
        if (s === 'archived') {
          return [{ key: 'delete', label: '永久删除', type: 'danger' }];
        }
        return [];
      }

      function getTaskFooterPrimary(task) {
        var actions = getTaskFooterActions(task);
        var i;
        for (i = 0; i < actions.length; i++) {
          if (actions[i].type === 'primary') return actions[i];
        }
        return null;
      }

      function getTaskFooterSecondary(task) {
        return getTaskFooterActions(task).filter(function (act) { return act.type !== 'primary'; });
      }

      function getTaskFooterMore(task) {
        if (isImplRunning(task) && !isKickbackTriage(task)) {
          return [{ key: 'reclaim', label: '收回执行' }];
        }
        return [];
      }

      function taskStatusLabel(status) {
        return STATUS_TEXT[normalizeTaskStatus(status)] || '待开始';
      }

      function taskCardStatusLabel(task) {
        if (!task) return '待开始';
        if (isKickbackTriage(task)) return '反复阻塞';
        if (isReviewUi(task)) return '评审中';
        return taskStatusLabel(task.status);
      }

      function taskSubStatusLabel(task) {
        return taskCardStatusLabel(task);
      }

      function taskStatusType(status) {
        return STATUS_TAG[normalizeTaskStatus(status)] || 'info';
      }

      function taskStatusClass(task) {
        if (isKickbackTriage(task)) return 'status-blocked status-kickback';
        return 'status-' + normalizeTaskStatus(task && task.status);
      }

      function normalizePriority(priority) {
        var raw = priority;
        if (raw === undefined || raw === null || raw === '') return 'medium';
        if (typeof raw === 'number' || /^-?\d+$/.test(String(raw))) {
          var n = Number(raw);
          if (n >= 3) return 'high';
          if (n === 2 || n === 0) return 'medium';
          return 'low';
        }
        var p = String(raw);
        if (p === 'urgent' || p === 'high') return 'high';
        if (p === 'low') return 'low';
        return 'medium';
      }

      function priorityLabel(priority) {
        var map = { low: '低', medium: '中', high: '高' };
        return map[normalizePriority(priority)] || '中';
      }

      function priorityTone(priority) {
        return normalizePriority(priority);
      }

      function priorityType(priority) {
        var map = { low: 'info', medium: '', high: 'warning' };
        return map[normalizePriority(priority)] || '';
      }

      function taskCardAssigneeLabel(task) {
        if (!taskHasAssignee(task)) return '未指派';
        var name = (task && (task.assigneeLabel || expertName(task.expertId || task.assignee))) || '';
        if (!name || name === '未指派') return '未指派';
        return '@' + name;
      }

      function truncateCardSummary(text) {
        var s = String(text || '').replace(/\s+/g, ' ').trim();
        if (!s) return '';
        if (s.length <= 22) return s;
        return s.slice(0, 21) + '…';
      }

      function firstSummarySentence(text) {
        var s = String(text || '').trim();
        if (!s) return '';
        return s.split(/\n/)[0];
      }

      function blockKindShortLabel(kind) {
        var map = {
          needs_input: '缺信息',
          capability: '缺能力',
          transient: '临时故障',
          dependency: '等待依赖'
        };
        return map[kind] || '需处理';
      }

      function lastStatusReasonOf(task, kinds) {
        if (task && task.lastStatusReason) return String(task.lastStatusReason).trim();
        var events = Array.isArray(task && task.taskEvents) ? task.taskEvents.slice() : [];
        events.sort(function (a, b) {
          return String((b && b.createdAt) || '').localeCompare(String((a && a.createdAt) || ''));
        });
        var i;
        var ev;
        for (i = 0; i < events.length; i++) {
          ev = events[i];
          if (!ev || kinds.indexOf(ev.kind) === -1) continue;
          if (ev.payload && ev.payload.reason) return String(ev.payload.reason).trim();
        }
        return '';
      }

      function cardHasStrandedReady(task) {
        var diags = Array.isArray(task && task.diagnostics) ? task.diagnostics : [];
        return diags.some(function (d) { return d && d.kind === 'stranded_in_ready'; });
      }

      function cardRunningElapsed(task) {
        var run = currentRunOf(task);
        var start = (run && run.startedAt) || (task && task.startedAt);
        if (!start) return '';
        var ms = Date.now() - new Date(String(start).replace(/([+-]\d{2}):?(\d{2})$/, '$1:$2')).getTime();
        if (isNaN(ms) || ms < 0) return '';
        var sec = Math.floor(ms / 1000);
        if (sec < 60) return '已运行 ' + sec + ' 秒';
        var min = Math.floor(sec / 60);
        if (min < 60) return '已运行 ' + min + ' 分';
        var hr = Math.floor(min / 60);
        var minRem = min % 60;
        return '已运行 ' + hr + ' 小时' + (minRem ? ' ' + minRem + ' 分' : '');
      }

      function taskCardSummary(task) {
        if (!task) return '';
        var s = normalizeTaskStatus(task.status);
        var reason;
        var kind;
        var n;
        var parents;
        if (s === 'todo') {
          parents = unfinishedParents(task);
          if (parents.length === 1) return truncateCardSummary('等待「' + taskDisplayTitle(parents[0]) + '」');
          if (parents.length === 2) {
            return truncateCardSummary('等待「' + taskDisplayTitle(parents[0]) + '」「' + taskDisplayTitle(parents[1]) + '」');
          }
          if (parents.length >= 3) return truncateCardSummary('等待 ' + parents.length + ' 个父任务');
          return '';
        }
        if (s === 'ready') {
          if (!taskHasAssignee(task)) return '需先指派负责人';
          if (cardHasStrandedReady(task)) return '调度未领取，请检查执行器';
          return '等待调度领取';
        }
        if (s === 'scheduled') {
          reason = lastStatusReasonOf(task, ['scheduled']);
          if (!reason) return '等待时间窗口';
          reason = reason.replace(/^等[:：]?/, '');
          return truncateCardSummary('等：' + reason);
        }
        if (s === 'running') {
          if (isReviewUi(task)) return '通过后将自动完成';
          return cardRunningElapsed(task) || '已运行';
        }
        if (s === 'review') return '通过后将自动完成';
        if (isKickbackTriage(task)) {
          n = Number(task.blockRecurrences || task.consecutiveFailures || 0) || 0;
          reason = lastStatusReasonOf(task, ['block_loop_detected', 'blocked']) || String(task.blockedReason || '').trim();
          kind = n > 0 ? ('同一原因已反复 ' + n + ' 次') : '同一原因已反复多次';
          return truncateCardSummary(reason ? (kind + '：' + reason) : kind);
        }
        if (s === 'blocked') {
          if (hasGaveUp(task)) return '连续失败已停止';
          kind = blockKindShortLabel(task.blockKind);
          reason = lastStatusReasonOf(task, ['blocked']) || String(task.blockedReason || '').trim();
          if (!reason && task.blockKind === 'transient') reason = String(task.lastFailureError || '').trim();
          return truncateCardSummary(reason ? (kind + '：' + reason) : kind);
        }
        if (s === 'done') return truncateCardSummary(firstSummarySentence(task.latestSummary));
        return '';
      }

      function formatTaskTime(value) {
        if (!value) return '—';
        var s = String(value);
        if (s.length >= 16) return s.replace('T', ' ').slice(0, 16);
        return s;
      }

      function eventDayLabel(value) {
        if (!value) return '更早';
        var d = new Date(String(value).replace(/([+-]\d{2}):?(\d{2})$/, '$1:$2'));
        if (isNaN(d.getTime())) return '更早';
        var now = new Date();
        var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var diff = (today - day) / 86400000;
        if (diff === 0) return '今天';
        if (diff === 1) return '昨天';
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var dd = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + mm + '-' + dd;
      }

      function eventTimeLabel(value) {
        if (!value) return '';
        var s = String(value).replace('T', ' ');
        if (s.length >= 16) return s.slice(11, 16);
        return formatTaskTime(value);
      }

      function currentRunOf(task) {
        if (!task) return null;
        var runs = Array.isArray(task.runs) ? task.runs : [];
        var i;
        if (task.currentRunId) {
          for (i = 0; i < runs.length; i++) {
            if (runs[i] && String(runs[i].id) === String(task.currentRunId)) return runs[i];
          }
        }
        for (i = 0; i < runs.length; i++) {
          if (runs[i] && (runs[i].outcome === 'running' || runs[i].status === 'running')) return runs[i];
        }
        return null;
      }

      function latestEndedRun(task) {
        var runs = (Array.isArray(task && task.runs) ? task.runs.slice() : []).filter(function (run) {
          return run && run.outcome !== 'running' && run.status !== 'running';
        });
        if (!runs.length) return null;
        runs.sort(function (a, b) {
          return String((b && (b.endedAt || b.startedAt)) || '').localeCompare(String((a && (a.endedAt || a.startedAt)) || ''));
        });
        return runs[0];
      }

      function claimedEventForCurrentRun(task) {
        var run = currentRunOf(task);
        var events = Array.isArray(task && task.taskEvents) ? task.taskEvents : [];
        var i;
        var ev;
        for (i = 0; i < events.length; i++) {
          ev = events[i];
          if (!ev || ev.kind !== 'claimed') continue;
          if (run && ev.run_id && String(ev.run_id) !== String(run.id)) continue;
          return ev;
        }
        return null;
      }

      function isReviewRun(task) {
        var ev = claimedEventForCurrentRun(task);
        return !!(ev && ev.payload && ev.payload.source_status === 'review');
      }

      function isReviewUi(task) {
        if (!task) return false;
        if (normalizeTaskStatus(task.status) === 'review') return true;
        return isReviewRun(task);
      }

      function isImplRunning(task) {
        return normalizeTaskStatus(task && task.status) === 'running' && !isReviewRun(task);
      }

      function hasGaveUp(task) {
        if (!task) return false;
        var runs = Array.isArray(task.runs) ? task.runs : [];
        if (runs.some(function (run) { return run && run.outcome === 'gave_up'; })) return true;
        var events = Array.isArray(task.taskEvents) ? task.taskEvents : [];
        return events.some(function (ev) { return ev && ev.kind === 'gave_up'; });
      }

      function taskDetailSummary(task) {
        if (!task) return '';
        var s = String(taskCardSummary(task) || '').replace(/\s+/g, ' ').trim();
        if (!s) return '';
        if (s.length <= 36) return s;
        return s.slice(0, 35) + '…';
      }

      function diagnosticLabel(diag) {
        if (!diag) return '';
        var kindMap = {
          stranded_in_ready: '调度较久未领取',
          stuck_in_blocked: '阻塞后一直未处理',
          repeated_failures: '连续失败已停止重试',
          block_unblock_cycling: '反复阻塞与重启'
        };
        if (diag.kind && kindMap[diag.kind]) return kindMap[diag.kind];
        return diag.title || '';
      }

      function processCurrentHeadline(task) {
        if (!task) return '尚未执行';
        if (isImplRunning(task)) return '';
        if (isReviewRun(task)) return '';
        if (isReviewUi(task)) return '等待评审领取';
        var s = normalizeTaskStatus(task.status);
        if (s === 'blocked') return '已暂停，等待重启';
        if (s === 'done') return '已完成';
        if (s === 'archived') return '已归档，只读';
        if (!hasProcessHistory(task)) return '尚未执行';
        return '当前未在执行';
      }

      function processHighlightRun(task) {
        if (isImplRunning(task) || isReviewRun(task)) return currentRunOf(task);
        var s = normalizeTaskStatus(task && task.status);
        if (s === 'blocked' || s === 'done' || s === 'archived') return latestEndedRun(task);
        return null;
      }

      function processHistoryRuns(task) {
        var highlight = processHighlightRun(task);
        var current = currentRunOf(task);
        return drawerTaskRuns(task).filter(function (run) {
          if (!run) return false;
          if (highlight && run.id === highlight.id) return false;
          if (current && run.id === current.id && (isImplRunning(task) || isReviewRun(task))) return false;
          return true;
        });
      }

      function processLogTitle(task) {
        var s = normalizeTaskStatus(task && task.status);
        if (isReviewRun(task)) return '评审日志';
        if (s === 'blocked') return '最近一次执行日志';
        if (s === 'done' || s === 'archived') return '完成前的执行日志';
        return '运行日志';
      }

      function shouldDrawProcessLog(task) {
        if (!task) return false;
        if (isImplRunning(task) || isReviewRun(task)) return true;
        return hasProcessHistory(task);
      }

      function eventPersonName(value) {
        if (!value) return '';
        var name = expertName(value);
        if (name && name !== '未指派') return name;
        if (typeof value === 'string' && value.indexOf('-') < 0) return value;
        return '';
      }

      function processEventView(ev) {
        var kind = (ev && ev.kind) || '';
        var payload = (ev && ev.payload) || {};
        var person = eventPersonName(payload.assignee);
        var reason = trimText(payload.reason || payload.error || '');
        var filename = trimText(payload.filename || payload.name);
        var author = eventPersonName(payload.author || (ev && ev.author));
        var title = '';
        var detail = '';
        if (kind === 'created') {
          title = '任务已创建';
          if (person) detail = '已指派给' + person;
        } else if (kind === 'assigned') {
          title = person ? ('已指派给' + person) : '已分配负责人';
        } else if (kind === 'linked') {
          title = '已添加前置关系';
        } else if (kind === 'unlinked') {
          title = '已移除前置关系';
        } else if (kind === 'promoted' || kind === 'promoted_manual') {
          title = '进入执行队列';
          if (reason) detail = reason;
        } else if (kind === 'scheduled') {
          title = '已排期';
          if (reason) detail = reason;
        } else if (kind === 'claimed') {
          title = '执行器已领取任务';
        } else if (kind === 'spawned') {
          title = '开始执行';
        } else if (kind === 'blocked') {
          title = '已阻塞';
          detail = reason || (payload.kind ? blockKindShortLabel(payload.kind) : '');
        } else if (kind === 'block_loop_detected') {
          title = '反复阻塞';
          if (reason) detail = reason;
        } else if (kind === 'gave_up') {
          title = '已放弃执行';
          if (reason) detail = reason;
        } else if (kind === 'unblocked') {
          title = '已重启';
          if (reason) detail = reason;
        } else if (kind === 'reclaimed') {
          title = '已收回执行';
          if (reason) detail = reason;
        } else if (kind === 'completed') {
          title = '任务已完成';
        } else if (kind === 'review_requested') {
          title = '已提交评审';
          if (reason) detail = reason;
        } else if (kind === 'changes_requested') {
          title = '评审要求修改';
          if (reason) detail = reason;
        } else if (kind === 'crashed') {
          title = '执行异常';
          if (reason) detail = reason;
        } else if (kind === 'timed_out') {
          title = '执行超时';
          if (reason) detail = reason;
        } else if (kind === 'commented') {
          title = author ? (author + '发表评论') : '有人发表评论';
        } else if (kind === 'attached') {
          title = filename ? ('已添加关联文件 ' + filename) : '已添加关联文件';
        } else if (kind === 'attachment_removed') {
          title = filename ? ('已移除关联文件 ' + filename) : '已移除关联文件';
        } else if (kind === 'archived') {
          title = '已归档';
        } else if (kind === 'specified') {
          title = '已补充说明';
        } else if (kind === 'edited') {
          title = '已更新任务';
        } else if (kind === 'heartbeat') {
          title = '执行器仍在运行';
        } else {
          title = '发生了 ' + (kind || '未知') + ' 事件';
        }
        return {
          id: ev && ev.id,
          kind: kind,
          createdAt: ev && ev.createdAt,
          title: title,
          detail: detail
        };
      }

      function processEventsAll(task) {
        var list = (task && Array.isArray(task.taskEvents) ? task.taskEvents.slice() : []).filter(function (ev) {
          return !!ev;
        });
        list.sort(function (a, b) {
          return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
        });
        var heartbeats = [];
        var others = [];
        var i;
        for (i = 0; i < list.length; i++) {
          if (list[i].kind === 'heartbeat') heartbeats.push(list[i]);
          else others.push(list[i]);
        }
        var views = others.map(processEventView);
        if (heartbeats.length) {
          var last = heartbeats[heartbeats.length - 1];
          var beatCount = 0;
          var i;
          for (i = 0; i < heartbeats.length; i++) {
            var n = heartbeats[i] && heartbeats[i].payload && heartbeats[i].payload.n;
            beatCount += (n > 0 ? Number(n) : 1);
          }
          views.push({
            id: 'heartbeat-summary',
            kind: 'heartbeat',
            createdAt: last.createdAt,
            title: beatCount > 1
              ? ('执行器仍在运行（心跳 ' + beatCount + ' 次）')
              : '执行器仍在运行',
            detail: ''
          });
          views.sort(function (a, b) {
            return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
          });
        }
        return views;
      }

      function processEventsForDisplay(task) {
        var all = processEventsAll(task);
        if (processEventsExpanded.value || all.length <= 30) return all;
        return all.slice(all.length - 30);
      }

      function processEventsHiddenCount(task) {
        var n = processEventsAll(task).length;
        if (processEventsExpanded.value || n <= 30) return 0;
        return n - 30;
      }

      function expandProcessEvents() {
        processEventsExpanded.value = true;
      }

      function parentTaskNames(task) {
        var rows = parentTasksOf(task);
        if (rows.length) return rows.map(taskDisplayTitle);
        if (task && task.parentTaskId) return [String(task.parentTaskId)];
        return [];
      }

      function childTaskNames(task) {
        return drawerChildTasks(task).map(taskDisplayTitle);
      }

      function taskContextChips(task) {
        var chips = [];
        var parents = parentTaskNames(task);
        var children = childTaskNames(task);
        var path = workspacePathLabel(task);
        if (parents.length) chips.push({ key: 'parents', label: '前置任务 ' + parents.length });
        if (children.length) chips.push({ key: 'children', label: '子任务 ' + children.length });
        if (path) chips.push({ key: 'path', label: path });
        return chips;
      }

      function taskResultSummary(task) {
        if (!task) return '';
        var s = trimText(task.latestSummary);
        if (s && !isStatusEchoSummary(task, s)) return s;
        return '';
      }

      function taskHasResultBlock(task) {
        return !!(taskResultSummary(task) || trimText(task && task.result));
      }

      function relatedFileName(file) {
        return (file && (file.filename || file.name || file.title)) || '未命名文件';
      }

      function relatedFileSizeLabel(file) {
        return formatFileSize(file && file.size);
      }

      function parentTasksOf(task) {
        if (!task) return [];
        var parent = taskParentTask(task.parentTaskId);
        return parent ? [parent] : [];
      }

      function taskCreatedByLabel(task) {
        if (!task) return '';
        if (task.createdBy) return String(task.createdBy);
        var events = Array.isArray(task.taskEvents) ? task.taskEvents : [];
        var created = events.find(function (ev) { return ev && ev.kind === 'created'; });
        if (created && created.author) {
          if (typeof created.author === 'string' && created.author.indexOf('-') < 0) return created.author;
          return expertName(created.author);
        }
        return '';
      }

      function hasTaskDependencyBlock(task) {
        return parentTaskNames(task).length > 0 || childTaskNames(task).length > 0;
      }

      function toggleShowArchived() {
        showArchivedInDone.value = !showArchivedInDone.value;
      }

      function statusTimeLabel(task) {
        var raw = task && (task.statusChangedAt || task.updatedAt || task.createdAt);
        if (!raw) return '';
        var d = new Date(String(raw).replace(/([+-]\d{2}):?(\d{2})$/, '$1:$2'));
        if (isNaN(d.getTime())) return '';
        var mm = String(d.getMonth() + 1).padStart(2, '0');
        var dd = String(d.getDate()).padStart(2, '0');
        var hh = String(d.getHours()).padStart(2, '0');
        var mi = String(d.getMinutes()).padStart(2, '0');
        return mm + '月' + dd + '日 ' + hh + ':' + mi;
      }

      function sameTaskId(a, b) {
        return a != null && b != null && String(a) === String(b);
      }

      function taskParentTask(parentTaskId) {
        if (!parentTaskId) return null;
        return projectTasks.value.find(function (t) { return sameTaskId(t.id, parentTaskId); }) || null;
      }

      function selectProjectTask(task) {
        if (!task) return;
        selectedProjectTaskId.value = task.id;
      }

      function closeTaskOverlays(keep) {
        keep = keep || {};
        if (!keep.goal) {
          showGoalDialog.value = false;
          resetGoalForm();
        }
        if (!keep.history) closeHistoryDialog(true);
        if (!keep.manual) showManualCreateDialog.value = false;
        if (!keep.detail) {
          drawerVisible.value = false;
        }
        if (!keep.action) closeTaskAction();
        if (!keep.members) membersSidebarVisible.value = false;
      }

      function openTaskDetail(task) {
        if (!task) return;
        closeTaskOverlays({ detail: true });
        selectedProjectTaskId.value = task.id;
        drawerTaskId.value = task.id;
        drawerMode.value = 'taskDetail';
        drawerVisible.value = true;
        detailPane.value = defaultDetailPane(task);
        drawerCommentDraft.value = '';
        processEventsExpanded.value = false;
        advancedOpen.value = false;
      }

      function openTaskFromEvent(event) {
        if (!event) return;
        if (event.type === 'member_added' || event.type === 'member_removed') {
          membersSidebarVisible.value = true;
          return;
        }
        if (event.type === 'goal_submitted' || event.type === 'goal_created') {
          openHistoryDialog();
          if (event.taskId) historyDetailId.value = event.taskId;
          return;
        }
        if (event.type === 'project_created') return;
        if (event.taskId) {
          var found = projectTasks.value.find(function (t) { return sameTaskId(t.id, event.taskId); });
          if (found) {
            openTaskDetail(found);
            if (event.type === 'task_commented' || event.type === 'comment_added') detailPane.value = 'comments';
          }
        }
      }

      function openMemberDrawer() {
        var next = !membersSidebarVisible.value;
        if (next) {
          closeTaskOverlays({ members: true });
          membersSidebarVisible.value = true;
        } else {
          membersSidebarVisible.value = false;
        }
      }

      function closeMembersSidebar() {
        membersSidebarVisible.value = false;
      }

      function closeDrawer() {
        drawerVisible.value = false;
        closeOutputPreview();
      }

      function unfinishedParents(task) {
        if (!task || !task.parentTaskId) return [];
        var parent = taskParentTask(task.parentTaskId);
        if (!parent || isGoalRoot(parent)) return [];
        var s = normalizeTaskStatus(parent.status);
        if (s !== 'done' && s !== 'archived') return [parent];
        return [];
      }

      function unfinishedParentLabels(task) {
        return unfinishedParents(task).map(function (p) { return taskDisplayTitle(p); });
      }

      function hasUnfinishedParentDependency(task) {
        return unfinishedParents(task).length > 0;
      }

      function getTaskStatusMoves(task) {
        var s = normalizeTaskStatus(task && task.status);
        return TASK_STATUS_MOVES[s] || [];
      }

      function resetGoalForm() {
        goalForm.value = { title: '', description: '', model: '' };
      }

      function goalFormDirty() {
        var f = goalForm.value;
        return !!(trimText(f.title) || trimText(f.description) || f.model);
      }

      function openGoalDialog() {
        closeTaskOverlays({ goal: true });
        showGoalDialog.value = true;
      }

      function closeGoalDialog() {
        if (goalSubmitting.value) return;
        if (!goalFormDirty()) {
          showGoalDialog.value = false;
          resetGoalForm();
          return;
        }
        ElementPlus.ElMessageBox.confirm(
          '当前目标尚未提交，关闭后已填写的内容将丢失。',
          '放弃本次编辑？',
          { confirmButtonText: '放弃', cancelButtonText: '继续编辑', type: 'warning' }
        ).then(function () {
          showGoalDialog.value = false;
          resetGoalForm();
        }).catch(function () {});
      }

      function handleGoalDialogBeforeClose(done) {
        if (goalSubmitting.value) return;
        if (!goalFormDirty()) {
          done();
          resetGoalForm();
          return;
        }
        ElementPlus.ElMessageBox.confirm(
          '当前目标尚未提交，关闭后已填写的内容将丢失。',
          '放弃本次编辑？',
          { confirmButtonText: '放弃', cancelButtonText: '继续编辑', type: 'warning' }
        ).then(function () {
          done();
          resetGoalForm();
        }).catch(function () {});
      }

      function openHistoryDialog() {
        if (showHistoryDialog.value) {
          closeHistoryDialog();
          return;
        }
        function openHistory() {
          closeTaskOverlays({ history: true });
          loadHistory();
          selectDefaultHistoryItem();
          showHistoryDialog.value = true;
        }
        if (!showGoalDialog.value || !goalFormDirty()) {
          openHistory();
          return;
        }
        ElementPlus.ElMessageBox.confirm(
          '打开发起记录将关闭当前弹窗，已填写的内容不会保留。',
          '查看发起记录？',
          { confirmButtonText: '查看记录', cancelButtonText: '继续编辑', type: 'warning' }
        ).then(openHistory).catch(function () {});
      }

      function selectDefaultHistoryItem() {
        var items = historyItems.value || [];
        var current = historyDetailId.value;
        if (current && items.some(function (item) { return item.id === current; })) return;
        var preferred = items.find(function (item) { return item.requestStatus === 'decompose_failed'; })
          || items.find(function (item) { return item.requestStatus === 'decomposing'; })
          || items[0];
        historyDetailId.value = preferred ? preferred.id : null;
        historySpecifyDraft.value = '';
      }

      function historyStatusChipClass(item) {
        if (!item) return 'chip-muted';
        if (item.requestStatus === 'decompose_failed') return 'chip-failed';
        if (item.requestStatus === 'decomposing') return 'chip-loading';
        if (item.requestStatus === 'completed' || item.statusLabel === '已完成') return 'chip-done';
        return 'chip-running';
      }

      function closeHistoryDialog(silent) {
        showHistoryDialog.value = false;
        historyDetailId.value = null;
        historySpecifyDraft.value = '';
        historyRetrying.value = false;
      }

      function openHistoryDetail(item) {
        if (!item) return;
        historyDetailId.value = item.id;
        historySpecifyDraft.value = '';
      }

      function backHistoryList() {
        historyDetailId.value = null;
        historySpecifyDraft.value = '';
      }

      function retryHistoryDecompose() {
        var item = historyDetail.value;
        if (!item) return;
        historyRetrying.value = true;
        try {
          if (store.retryDecomposeProjectGoal) {
            store.retryDecomposeProjectGoal(props.projectId, item.id, historySpecifyDraft.value);
          } else {
            store.decomposeProjectTask(props.projectId, item.id, { children: [] });
          }
          ElementPlus.ElMessage.success('已重新提交拆解');
          historySpecifyDraft.value = '';
          load();
        } catch (e) {
          ElementPlus.ElMessage.error('重试拆解失败');
        }
        historyRetrying.value = false;
      }

      function openHistoryChild(child) {
        if (!child) return;
        closeHistoryDialog();
        openTaskDetail(child);
      }

      function resetManualForm(preset) {
        preset = preset || {};
        manualForm.value = {
          title: preset.title || '',
          body: preset.body || '',
          assignee: preset.assignee || '',
          status: preset.status || 'todo',
          parentTaskId: preset.parentTaskId || '',
          priority: preset.priority || 'medium'
        };
      }

      function resetTaskActionForm() {
        taskActionForm.value = {
          comment: '', assignee: '', result: '', blockedReason: '', unblockReason: '',
          reassignReason: '', editTitle: '', editBody: '', editPriority: '', moveTarget: '', blockKind: 'dependency',
          resumeSupplement: ''
        };
      }

      function submitGoal() {
        var f = goalForm.value;
        if (!trimText(f.title)) return ElementPlus.ElMessage.warning('请填写目标标题');
        if (!trimText(f.description)) return ElementPlus.ElMessage.warning('请填写目标描述');
        var oid = (project.value && project.value.orchestratorProfileId) ||
          (orchestratorExpert.value && orchestratorExpert.value.id) ||
          (members.value[0] && members.value[0].expertId);
        if (!oid) return ElementPlus.ElMessage.warning('请先添加项目成员');
        goalSubmitting.value = true;
        var root = store.createProjectTask(props.projectId, {
          title: trimText(f.title),
          body: trimText(f.description),
          assignee: oid,
          priority: 'medium',
          status: 'triage',
          isTriage: true,
          goalRequestStatus: 'decomposing',
          decompositionModel: f.model || ''
        });
        selectedProjectTaskId.value = root.id;
        ElementPlus.ElMessage.success('目标已提交，可在 Header「发起记录」中查看进度');
        if (project.value.autoDecomposeEnabled !== false) {
          try { store.decomposeProjectTask(props.projectId, root.id, { children: [], model: f.model || '' }); } catch (e) { /* noop */ }
        }
        goalSubmitting.value = false;
        load();
        resetGoalForm();
        showGoalDialog.value = false;
      }

      function openManualCreateDialog(preset) {
        preset = preset || {};
        closeTaskOverlays({ manual: true });
        resetManualForm(preset);
        showManualCreateDialog.value = true;
      }

      function closeManualCreateDialog() {
        showManualCreateDialog.value = false;
      }

      function submitManualCreateAndDispatch() {
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
        try {
          store.promoteProjectTask(props.projectId, created.id);
        } catch (e) { /* noop */ }
        ElementPlus.ElMessage.success('任务已创建并加入执行队列');
        load();
        closeManualCreateDialog();
      }

      function openTaskAction(type, task) {
        if (!task) return;
        resetTaskActionForm();
        taskAction.value = { type: type, taskId: task.id };
        taskActionVisible.value = true;
        if (type === 'edit') {
          taskActionForm.value.editTitle = task.title || '';
          taskActionForm.value.editBody = task.body || '';
          taskActionForm.value.editPriority = normalizePriority(task.priority);
        }
        if (type === 'updateBlock') {
          taskActionForm.value.blockedReason = task.blockedReason || '';
          taskActionForm.value.blockKind = task.blockKind || 'needs_input';
        }
        if (type === 'editResult') {
          taskActionForm.value.result = task.result || '';
        }
        if (type === 'reassign' || type === 'assign') {
          taskActionForm.value.assignee = task.expertId || '';
        }
      }

      function closeTaskAction() {
        taskActionVisible.value = false;
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
          store.blockProjectTask(pid, tid, trimText(t.blockedReason), t.blockKind);
          ElementPlus.ElMessage.success('任务已标记为阻塞');
        } else if (type === 'unblock') {
          try {
            store.unblockProjectTask(pid, tid, trimText(t.unblockReason));
          } catch (e) {
            return ElementPlus.ElMessage.error('该任务不能重启，请使用「完善后继续」');
          }
          ElementPlus.ElMessage.success('任务已重启');
        } else if (type === 'updateBlock') {
          if (!trimText(t.blockedReason)) return ElementPlus.ElMessage.warning('请填写阻塞说明');
          store.editProjectTask(pid, tid, { blockedReason: trimText(t.blockedReason) });
          ElementPlus.ElMessage.success('阻塞说明已更新');
        } else if (type === 'editResult') {
          if (!trimText(t.result)) return ElementPlus.ElMessage.warning('请填写完成结果');
          store.editProjectTask(pid, tid, { result: trimText(t.result) });
          ElementPlus.ElMessage.success('结果已补录');
        } else if (type === 'resumeFromLoop') {
          if (!trimText(t.resumeSupplement)) return ElementPlus.ElMessage.warning('请补充任务该怎么继续');
          try {
            store.resumeFromLoopProjectTask(pid, tid, trimText(t.resumeSupplement));
          } catch (e) {
            return ElementPlus.ElMessage.error('完善后继续失败');
          }
          ElementPlus.ElMessage.success('已提交补充说明，任务离开反复阻塞');
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
        } else if (type === 'followup') {
          closeTaskAction();
          openManualCreateDialog({ parentTaskId: tid });
          return;
        }
        load();
        closeTaskAction();
      }

      function enqueueOrNudgeTask(task) {
        if (!task) return;
        if (actionDisabledHint(task, 'enqueue')) {
          ElementPlus.ElMessage.info(actionDisabledHint(task, 'enqueue'));
          return;
        }
        var s = normalizeTaskStatus(task.status);
        if (s === 'todo') {
          try { store.promoteProjectTask(props.projectId, task.id); } catch (e) { /* noop */ }
          ElementPlus.ElMessage.success('已加入执行队列');
        } else if (s === 'ready') {
          ElementPlus.ElMessage.success('已催促执行，任务仍在等待调度');
        }
        load();
      }

      function actionDisabledHint(task, key) {
        if (key === 'enqueue' && normalizeTaskStatus(task.status) === 'todo' && hasUnfinishedParentDependency(task)) {
          return '等待父任务完成后才能加入执行队列';
        }
        if (key === 'enqueue' && normalizeTaskStatus(task.status) === 'ready' && !taskHasAssignee(task)) {
          return '请先指派负责人';
        }
        return '';
      }

      function handleDrawerAction(action, task) {
        if (!task || !action) return;
        if (action.disabled) {
          ElementPlus.ElMessage.info(action.tooltip || actionDisabledHint(task, action.key) || '当前不可执行');
          return;
        }
        if (action.key === 'enqueue') {
          enqueueOrNudgeTask(task);
          return;
        }
        if (action.key === 'activate') {
          try {
            store.unblockProjectTask(props.projectId, task.id, '');
          } catch (e) {
            ElementPlus.ElMessage.error('激活失败');
            return;
          }
          ElementPlus.ElMessage.success('任务已激活');
          load();
          return;
        }
        if (action.key === 'followup') {
          openManualCreateDialog({ parentTaskId: task.id });
          return;
        }
        if (action.key === 'reclaim') {
          if (store.reclaimProjectTask) store.reclaimProjectTask(props.projectId, task.id);
          ElementPlus.ElMessage.success('已收回执行，任务回到可执行');
          load();
          return;
        }
        if (action.key === 'archive') {
          ElementPlus.ElMessageBox.confirm('确定归档任务「' + taskDisplayTitle(task) + '」？归档后会进入已完成列的已归档区，默认隐藏。', '归档任务', { confirmButtonText: '归档', cancelButtonText: '取消', type: 'warning' }).then(function () {
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
        openTaskAction(action.key, task);
      }

      function submitDrawerComment() {
        if (!drawerTaskId.value) return;
        var text = trimText(drawerCommentDraft.value);
        if (!text) return ElementPlus.ElMessage.warning('请填写评论内容');
        store.commentProjectTask(props.projectId, drawerTaskId.value, text);
        drawerCommentDraft.value = '';
        ElementPlus.ElMessage.success('评论已添加');
        load();
      }

      function historyItemProgress(item) {
        if (!item) return '';
        if (item.requestStatus === 'decompose_failed') return '需补充说明';
        if (item.requestStatus === 'decomposing') return '正在拆解';
        if (!item.childCount) return item.statusLabel;
        return item.doneCount + '/' + item.childCount + ' 子任务完成';
      }

      function historyItemMetaLine(item) {
        if (!item) return '';
        return formatTaskTime(item.createdAt) + ' · ' + item.statusLabel + ' · ' + historyItemProgress(item);
      }

      function toggleHistoryExpand(item) {
        openHistoryDetail(item);
      }

      function saveProjectSettings() {
        var name = trimText(projectSettingsDraft.value.name);
        if (!name) return ElementPlus.ElMessage.warning('请填写项目名称');
        var p = Object.assign({}, project.value, {
          name: name,
          description: trimText(projectSettingsDraft.value.description)
        });
        store.saveProject(p);
        load();
        showProjectSettingsDialog.value = false;
        ElementPlus.ElMessage.success('项目设置已保存');
      }

      function openProjectSettingsDialog() {
        projectSettingsDraft.value = {
          name: project.value ? (project.value.name || '') : '',
          description: project.value ? (project.value.description || '') : ''
        };
        showProjectSettingsDialog.value = true;
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
        var tasks = projectTasks.value.filter(function (task) {
          if (isGoalRoot(task)) return false;
          return task.expertId === expertId || task.assignee === expertId;
        });
        return {
          total: tasks.length,
          done: tasks.filter(function (task) { return normalizeTaskStatus(task.status) === 'done'; }).length,
          blocked: tasks.filter(function (task) { return normalizeTaskStatus(task.status) === 'blocked' || isKickbackTriage(task); }).length
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
        showArchivedInDone.value = false;
        advancedOpen.value = false;
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
        highlightExpertId: highlightExpertId,
        drawerMode: drawerMode,
        drawerVisible: drawerVisible,
        membersSidebarVisible: membersSidebarVisible,
        drawerTitle: drawerTitle,
        drawerTask: drawerTask,
        orchestratorExpert: orchestratorExpert,
        orchestratorForm: goalForm,
        showGoalDialog: showGoalDialog,
        goalForm: goalForm,
        goalSubmitting: goalSubmitting,
        decompositionModelOptions: decompositionModelOptions,
        manualForm: manualForm,
        showManualCreateDialog: showManualCreateDialog,
        historyItems: historyItems,
        historyDetail: historyDetail,
        historyDetailId: historyDetailId,
        showHistoryDialog: showHistoryDialog,
        historySpecifyDraft: historySpecifyDraft,
        historyRetrying: historyRetrying,
        historyBadgeKind: historyBadgeKind,
        historyDetailCanSpecify: historyDetailCanSpecify,
        formParentTasks: formParentTasks,
        taskAction: taskAction,
        taskActionVisible: taskActionVisible,
        taskActionForm: taskActionForm,
        taskActionTask: taskActionTask,
        taskActionTitle: taskActionTitle,
        taskActionConfirmLabel: taskActionConfirmLabel,
        cardMenuTaskId: cardMenuTaskId,
        priorityOptions: PRIORITY_OPTIONS,
        eventFilter: eventFilter,
        eventFilters: EVENT_FILTERS,
        selectedProjectTaskId: selectedProjectTaskId,
        workspaceCurrentFolderId: workspaceCurrentFolderId,
        workspaceFolderDialogVisible: workspaceFolderDialogVisible,
        workspaceFolderName: workspaceFolderName,
        workspaceFileInput: workspaceFileInput,
        workspaceFiles: workspaceFiles,
        workspaceStats: workspaceStats,
        workspaceBreadcrumbs: workspaceBreadcrumbs,
        showAddMemberDialog: showAddMemberDialog,
        showProjectSettingsDialog: showProjectSettingsDialog,
        projectSettingsDraft: projectSettingsDraft,
        addMemberExpertIds: addMemberExpertIds,
        addMemberSearchQuery: addMemberSearchQuery,
        filteredAddableExperts: filteredAddableExperts,
        addableExperts: addableExperts,
        todoStats: todoStats,
        statusColumns: statusColumns,
        filteredEvents: filteredEvents,
        isProjectIconImage: isProjectIconImage,
        taskDisplayTitle: taskDisplayTitle,
        taskBody: taskBody,
        taskDescriptionText: taskDescriptionText,
        taskHasBody: taskHasBody,
        toggleAdvanced: toggleAdvanced,
        shouldShowTaskSummary: shouldShowTaskSummary,
        shouldShowOutputSummary: shouldShowOutputSummary,
        taskOutputFiles: taskOutputFiles,
        taskStructuredFacts: taskStructuredFacts,
        taskChildOutputs: taskChildOutputs,
        hasOutputPane: hasOutputPane,
        detailPane: detailPane,
        detailPaneTabs: detailPaneTabs,
        setDetailPane: setDetailPane,
        hasProcessHistory: hasProcessHistory,
        showProcessLog: showProcessLog,
        isDetailRunning: isDetailRunning,
        isDetailArchived: isDetailArchived,
        leadTaskPaneWithDeps: leadTaskPaneWithDeps,
        copyTaskId: copyTaskId,
        previewTaskOutputFile: previewTaskOutputFile,
        downloadTaskOutputFile: downloadTaskOutputFile,
        previousRunSummary: previousRunSummary,
        outputPreviewVisible: outputPreviewVisible,
        outputPreviewFile: outputPreviewFile,
        closeOutputPreview: closeOutputPreview,
        outputPreviewMeta: outputPreviewMeta,
        outputPreviewIsText: outputPreviewIsText,
        taskStatusLabel: taskStatusLabel,
        taskCardStatusLabel: taskCardStatusLabel,
        taskCardSummary: taskCardSummary,
        taskCardAssigneeLabel: taskCardAssigneeLabel,
        taskSubStatusLabel: taskSubStatusLabel,
        taskDetailSubStatusLabel: taskDetailSubStatusLabel,
        getTaskFooterPrimary: getTaskFooterPrimary,
        getTaskFooterSecondary: getTaskFooterSecondary,
        getTaskFooterMore: getTaskFooterMore,
        showArchivedInDone: showArchivedInDone,
        toggleShowArchived: toggleShowArchived,
        eventDayGroups: eventDayGroups,
        eventTimeLabel: eventTimeLabel,
        taskDetailSummary: taskDetailSummary,
        diagnosticLabel: diagnosticLabel,
        processCurrentHeadline: processCurrentHeadline,
        processHighlightRun: processHighlightRun,
        processHistoryRuns: processHistoryRuns,
        processLogTitle: processLogTitle,
        shouldDrawProcessLog: shouldDrawProcessLog,
        processEventsForDisplay: processEventsForDisplay,
        processEventsHiddenCount: processEventsHiddenCount,
        expandProcessEvents: expandProcessEvents,
        parentTaskNames: parentTaskNames,
        childTaskNames: childTaskNames,
        taskContextChips: taskContextChips,
        taskResultSummary: taskResultSummary,
        taskHasResultBlock: taskHasResultBlock,
        relatedFileName: relatedFileName,
        relatedFileSizeLabel: relatedFileSizeLabel,
        parentTasksOf: parentTasksOf,
        taskCreatedByLabel: taskCreatedByLabel,
        hasTaskDependencyBlock: hasTaskDependencyBlock,
        advancedOpen: advancedOpen,
        currentRunOf: currentRunOf,
        latestEndedRun: latestEndedRun,
        isReviewUi: isReviewUi,
        isImplRunning: isImplRunning,
        hasGaveUp: hasGaveUp,
        hasOutputContent: hasOutputPane,
        isKickbackTriage: isKickbackTriage,
        taskHasAssignee: taskHasAssignee,
        unfinishedParents: unfinishedParents,
        statusTimeLabel: statusTimeLabel,
        hasUnfinishedParentDependency: hasUnfinishedParentDependency,
        taskStatusType: taskStatusType,
        taskStatusClass: taskStatusClass,
        priorityLabel: priorityLabel,
        priorityTone: priorityTone,
        priorityType: priorityType,
        formatTaskTime: formatTaskTime,
        taskParentTask: taskParentTask,
        selectProjectTask: selectProjectTask,
        openTaskDetail: openTaskDetail,
        openTaskFromEvent: openTaskFromEvent,
        openMemberDrawer: openMemberDrawer,
        closeMembersSidebar: closeMembersSidebar,
        closeDrawer: closeDrawer,
        getTaskStatusMoves: getTaskStatusMoves,
        handleDrawerAction: handleDrawerAction,
        handleFooterMore: function (key) {
          if (!drawerTask.value) return;
          handleDrawerAction({ key: key }, drawerTask.value);
        },
        submitDrawerComment: submitDrawerComment,
        drawerCommentDraft: drawerCommentDraft,
        openGoalDialog: openGoalDialog,
        closeGoalDialog: closeGoalDialog,
        handleGoalDialogBeforeClose: handleGoalDialogBeforeClose,
        submitGoal: submitGoal,
        openManualCreateDialog: openManualCreateDialog,
        closeManualCreateDialog: closeManualCreateDialog,
        submitManualCreateAndDispatch: submitManualCreateAndDispatch,
        openTaskAction: openTaskAction,
        closeTaskAction: closeTaskAction,
        submitTaskAction: submitTaskAction,
        openHistoryDialog: openHistoryDialog,
        closeHistoryDialog: closeHistoryDialog,
        openHistoryDetail: openHistoryDetail,
        backHistoryList: backHistoryList,
        retryHistoryDecompose: retryHistoryDecompose,
        openHistoryChild: openHistoryChild,
        historyItemProgress: historyItemProgress,
        historyItemMetaLine: historyItemMetaLine,
        historyStatusChipClass: historyStatusChipClass,
        toggleHistoryExpand: toggleHistoryExpand,
        saveProjectSettings: saveProjectSettings,
        openProjectSettingsDialog: openProjectSettingsDialog,
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
        clearHighlightExpertTasks: clearHighlightExpertTasks,
        blockKindLabel: blockKindLabel,
        runOutcomeLabel: runOutcomeLabel,
        eventKindLabel: eventKindLabel,
        runDuration: runDuration,
        taskElapsedLabel: taskElapsedLabel,
        heartbeatAgoLabel: heartbeatAgoLabel,
        drawerTaskRuns: drawerTaskRuns,
        drawerTaskEvents: drawerTaskEvents,
        drawerTaskDiagnostics: drawerTaskDiagnostics,
        drawerTaskComments: drawerTaskComments,
        drawerChildTasks: drawerChildTasks,
        childTaskProgress: childTaskProgress,
        hasChildren: hasChildren,
        workspacePathLabel: workspacePathLabel,
        taskSkillsLabel: taskSkillsLabel,
        isTaskActive: isTaskActive,
        runExpandedDefault: runExpandedDefault,
        eventPayloadSummary: eventPayloadSummary,
        runErrorDisplay: runErrorDisplay,
        runMetadataDisplay: runMetadataDisplay,
        runHasDetails: runHasDetails,
        statusBannerType: statusBannerType,
        statusBannerBlockedText: statusBannerBlockedText,
        statusBannerRunningText: statusBannerRunningText,
        statusBannerWaitingText: statusBannerWaitingText,
        statusBannerDoneText: statusBannerDoneText,
        statusBannerReviewText: statusBannerReviewText,
        statusBannerEnqueueText: statusBannerEnqueueText,
        statusBannerScheduledText: statusBannerScheduledText,
        statusBannerReadyText: statusBannerReadyText,
        statusBannerKickbackText: statusBannerKickbackText,
        statusBannerArchivedText: statusBannerArchivedText,
        expandedRunIds: expandedRunIds,
        toggleRunExpanded: toggleRunExpanded,
        execDetailExpanded: execDetailExpanded,
        toggleExecDetail: toggleExecDetail,
        contextSectionExpanded: contextSectionExpanded,
        toggleContextSection: toggleContextSection,
        logPanelVisible: logPanelVisible,
        toggleLogPanel: toggleLogPanel,
        logTailContent: logTailContent
      };
    },
    template: getProjectDetailTemplate()
  };

  function getProjectDetailTemplate() {
    return [
      '<div class="project-detail-shell" v-if="project">',
      headerTemplate(),
      '<div class="project-detail-body" :class="{ \'with-members-sidebar\': membersSidebarVisible }">',
        '<div class="project-detail-primary">',
          tabsTemplate(),
          '<div class="project-detail-content">',
            '<div class="project-detail-main-wrapper">',
              mainTemplate(),
            '</div>',
          '</div>',
        '</div>',
        membersSidebarTemplate(),
      '</div>',
      drawerTemplate(),
      goalDialogTemplate(),
      historyDialogTemplate(),
      manualCreateDialogTemplate(),
      taskActionDialogTemplate(),
      projectSettingsDialogTemplate(),
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
              '<span class="project-progress-pill">{{ todoStats.done }}/{{ todoStats.total }} 已完成</span>',
              '</div>',
            '<p v-if="project.description" class="project-title-description">{{ project.description }}</p>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="project-header-summary project-header-summary-compact">',
          '<button type="button" class="project-header-action-btn project-header-goal-btn" @click="openGoalDialog">',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
            '<span>发起目标</span>',
          '</button>',
          '<button type="button" class="project-header-action-btn project-header-records-btn" :class="{ \'is-failed\': historyBadgeKind === \'failed\', \'is-loading\': historyBadgeKind === \'loading\', active: showHistoryDialog }" title="发起记录" aria-label="发起记录" @click="openHistoryDialog">',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
            '<span>发起记录</span>',
          '</button>',
          '<button type="button" class="project-header-action-btn" :class="{ active: membersSidebarVisible }" @click="openMemberDrawer">',
            '<svg v-if="members.length > 0" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">',
              '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>',
              '<circle cx="9" cy="7" r="4"/>',
              '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>',
              '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
            '</svg>',
            '<svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
            '<span v-if="members.length > 0">项目成员 {{ members.length }}</span>',
            '<span v-else>添加成员</span>',
          '</button>',
          '<button type="button" class="project-header-action-btn project-header-settings-btn" title="项目设置" aria-label="项目设置" @click="openProjectSettingsDialog">',
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.12 2.12-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-3v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.12-2.12.06-.06A1.65 1.65 0 0 0 7 15a1.65 1.65 0 0 0-1.51-1H5v-3h.09A1.65 1.65 0 0 0 6.6 10a1.65 1.65 0 0 0-.33-1.82l-.06-.06L8.33 6l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V5h3v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06 2.12 2.12-.06.06A1.65 1.65 0 0 0 18.6 10v.01a1.65 1.65 0 0 0 1.51 1H20v3h-.09A1.65 1.65 0 0 0 18.4 15z"/></svg>',
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
      '<main class="project-detail-main">',
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
            '<div class="project-kanban-column-title"><span>{{ col.title }}</span><em>{{ col.tasks.length }}</em></div>',
            '<button v-if="col.key === \'todo\'" type="button" class="project-kanban-column-add" title="创建任务" @click="openManualCreateDialog({ status: \'todo\' })">+</button>',
            '<button v-if="col.key === \'done\'" type="button" class="project-kanban-archived-toggle" :class="{ active: showArchivedInDone }" @click="toggleShowArchived">已归档 {{ col.archivedCount }}</button>',
          '</header>',
          '<div class="project-kanban-column-body">',
            taskCardTemplate(true, 'col.tasks'),
            '<template v-if="col.key === \'done\' && showArchivedInDone">',
              '<div class="project-kanban-archived-divider">已归档</div>',
              taskCardTemplate(true, 'col.archivedTasks'),
              '<div v-if="!col.archivedTasks.length" class="project-kanban-empty">没有已归档任务</div>',
            '</template>',
            '<div v-if="!col.tasks.length && !(col.key === \'done\' && showArchivedInDone && col.archivedTasks.length)" class="project-kanban-empty">暂无任务</div>',
          '</div>',
        '</section>',
      '</div>'
    ].join('');
  }

  function taskCardTemplate(showMeta, vForSource) {
    var source = vForSource || 'col.tasks';
    return [
      '<article v-for="task in ' + source + '" :key="task.id" class="project-task-card" :class="[{ active: selectedProjectTaskId === task.id, \'highlight-by-expert\': highlightExpertId && (task.expertId === highlightExpertId || task.assignee === highlightExpertId) }, taskStatusClass(task), \'priority-\' + priorityTone(task.priority)]" :data-assignee="task.expertId || task.assignee || \'\'" @click="openTaskDetail(task)">',
        '<div class="project-task-card-row project-task-card-row-title">',
          '<h3 class="project-task-card-title">{{ taskDisplayTitle(task) }}</h3>',
          '<span class="project-task-card-status" :class="taskStatusClass(task)">{{ taskCardStatusLabel(task) }}</span>',
        '</div>',
        '<div v-if="' + (showMeta ? 'true' : 'false') + '" class="project-task-card-row project-task-card-row-meta">',
          '<span class="project-task-card-assignee" :class="{ \'is-unassigned\': !taskHasAssignee(task) }">{{ taskCardAssigneeLabel(task) }}</span>',
          '<span class="project-task-card-priority" :class="\'priority-\' + priorityTone(task.priority)" :title="priorityLabel(task.priority) + \'优先级\'">{{ priorityLabel(task.priority) }}</span>',
        '</div>',
        '<p v-if="' + (showMeta ? 'true' : 'false') + '" class="project-task-card-row project-task-card-row-summary">{{ taskCardSummary(task) }}</p>',
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
            '<div v-for="group in eventDayGroups" :key="group.label" class="project-timeline-day">',
              '<div class="project-timeline-day-label">{{ group.label }}</div>',
              '<article v-for="event in group.items" :key="event.id" class="project-timeline-item" :class="{ \'is-clickable\': event.taskId || event.type === \'member_added\' || event.type === \'member_removed\' || event.type === \'goal_submitted\' || event.type === \'goal_created\' }" @click="openTaskFromEvent(event)">',
                '<div class="project-timeline-dot" :class="\'event-\' + (event.category || \'task\')"></div>',
                '<div class="project-timeline-card">',
                  '<div class="project-timeline-head"><strong>{{ event.title }}</strong><span>{{ eventTimeLabel(event.createdAt) }}</span></div>',
                '</div>',
              '</article>',
            '</div>',
            '<div v-if="eventDayGroups.length === 0" class="project-empty-panel">暂无项目动态</div>',
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

  function goalDialogTemplate() {
    return [
      '<el-dialog v-model="showGoalDialog" title="发起目标" width="640px" class="project-goal-dialog" :close-on-click-modal="false" :before-close="handleGoalDialogBeforeClose" append-to-body>',
        '<div class="project-goal-dialog-tip">💡 描述你的项目目标，系统会自动拆解为具体任务并分配给相关专家。</div>',
        '<el-form label-position="top" class="project-goal-dialog-form">',
          '<el-form-item label="目标标题" required>',
            '<el-input v-model="goalForm.title" maxlength="100" show-word-limit placeholder="一句话概括要达成的目标" />',
          '</el-form-item>',
          '<el-form-item label="目标描述" required>',
            '<el-input v-model="goalForm.description" type="textarea" :rows="6" resize="vertical" placeholder="描述目标背景、范围和期望结果" />',
          '</el-form-item>',
          '<el-form-item label="拆解模型">',
            '<el-select v-model="goalForm.model" class="project-goal-model-select" placeholder="系统默认" filterable>',
              '<el-option label="系统默认" value="" />',
              '<el-option v-for="model in decompositionModelOptions" :key="model.id" :label="model.name" :value="model.id" />',
            '</el-select>',
            '<div class="project-goal-model-help">默认使用当前服务配置的拆解模型，仅影响本次目标拆解。</div>',
          '</el-form-item>',
        '</el-form>',
        '<template #footer>',
          '<el-button :disabled="goalSubmitting" @click="closeGoalDialog">取消</el-button>',
          '<el-button type="primary" :loading="goalSubmitting" @click="submitGoal">发起目标</el-button>',
        '</template>',
      '</el-dialog>'
    ].join('');
  }

  function drawerTemplate() {
    return [
      '<el-dialog v-model="drawerVisible" width="840px" top="5vh" class="project-task-detail-dialog" :show-close="false" append-to-body @closed="closeDrawer">',
        '<div class="project-drawer-body">',
          drawerTaskDetailTemplate(),
        '</div>',
      '</el-dialog>'
    ].join('');
  }

  function historyDialogTemplate() {
    return [
      '<el-dialog v-model="showHistoryDialog" width="960px" top="8vh" class="project-history-dialog" :close-on-click-modal="false" append-to-body @closed="closeHistoryDialog(true)">',
        '<template #header>',
          '<div class="project-history-dialog-header">',
            '<div class="project-history-dialog-header-title">',
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
              '<strong>发起记录</strong>',
            '</div>',
            '<em v-if="historyItems.length">{{ historyItems.length }} 条</em>',
          '</div>',
        '</template>',
        '<div class="project-history-split">',
          '<aside class="project-history-pane-list">',
            '<div class="project-history-pane-list-head">全部记录</div>',
            '<div v-if="!historyItems.length" class="project-history-inline-empty">暂无发起记录</div>',
            '<div v-else class="project-history-dialog-list">',
              '<button v-for="item in historyItems" :key="item.id" type="button" class="project-history-dialog-item" :class="[\'kind-\' + item.iconKind, { selected: historyDetailId === item.id }]" @click="openHistoryDetail(item)">',
                '<span class="project-history-dialog-icon" :class="item.iconKind">',
                  '<span v-if="item.iconKind === \'failed\'">!</span>',
                  '<span v-else-if="item.iconKind === \'loading\'" class="project-records-spin-dot"></span>',
                  '<span v-else>✓</span>',
                '</span>',
                '<div class="project-history-dialog-item-body">',
                  '<div class="project-history-dialog-item-top">',
                    '<strong>{{ item.title }}</strong>',
                    '<span class="project-history-status-chip" :class="historyStatusChipClass(item)">{{ item.statusLabel }}</span>',
                  '</div>',
                  '<span class="project-history-dialog-item-time">{{ formatTaskTime(item.createdAt) }} · {{ historyItemProgress(item) }}</span>',
                '</div>',
              '</button>',
            '</div>',
          '</aside>',
          '<section class="project-history-pane-detail">',
            '<div v-if="!historyDetail" class="project-history-detail-blank">',
              '<div class="project-history-detail-blank-icon">📄</div>',
              '<p>选择左侧记录，查看拆解结果或补充说明</p>',
            '</div>',
            '<div v-else class="project-history-detail">',
              '<div class="project-history-detail-head">',
                '<h3>{{ historyDetail.title }}</h3>',
                '<div class="project-history-detail-head-meta">',
                  '<span class="project-history-status-chip" :class="historyStatusChipClass(historyDetail)">{{ historyDetail.statusLabel }}</span>',
                  '<span>{{ formatTaskTime(historyDetail.createdAt) }}</span>',
                  '<span v-if="historyDetail.childCount">{{ historyItemProgress(historyDetail) }}</span>',
                '</div>',
              '</div>',
              '<div class="project-history-detail-section">',
                '<div class="project-history-detail-section-title">目标描述</div>',
                '<div class="project-history-detail-section-body">{{ historyDetail.body || \'暂无描述\' }}</div>',
              '</div>',
              '<div v-if="historyDetail.requestStatus === \'decomposing\'" class="project-history-detail-pending">',
                '<span class="project-records-spin-dot"></span>',
                '<span>系统正在拆解，完成后会在这里列出生成的任务。</span>',
              '</div>',
              '<div v-if="historyDetailCanSpecify" class="project-history-specify">',
                '<div class="project-history-specify-title">拆解失败，请补充说明后重试</div>',
                '<div v-if="historyDetail.decomposeError" class="project-history-specify-error">{{ historyDetail.decomposeError }}</div>',
                '<el-input v-model="historySpecifyDraft" type="textarea" :rows="4" placeholder="用自然语言补充目标范围、约束或验收标准" />',
                '<div class="project-history-specify-actions">',
                  '<el-button type="primary" :loading="historyRetrying" @click="retryHistoryDecompose">补充说明并重试拆解</el-button>',
                '</div>',
              '</div>',
              '<div v-if="historyDetail.requestStatus === \'completed\' && historyDetail.result" class="project-history-detail-section project-history-detail-result">',
                '<div class="project-history-detail-section-title">目标结果</div>',
                '<div class="project-history-detail-section-body">{{ historyDetail.result }}</div>',
              '</div>',
              '<div v-if="historyDetail.requestStatus === \'completed\' && historyDetail.completedAt" class="project-history-completed-at">完成于 {{ formatTaskTime(historyDetail.completedAt) }}</div>',
              '<div v-if="historyDetail.requestStatus === \'running\' || historyDetail.requestStatus === \'completed\'" class="project-history-detail-section">',
                '<div class="project-history-detail-section-title">拆解出的任务</div>',
                '<div v-if="historyDetail.children && historyDetail.children.length" class="project-history-detail-children">',
                  '<button v-for="child in historyDetail.children" :key="child.id" type="button" class="project-history-detail-child" @click="openHistoryChild(child)">',
                    '<span class="project-history-detail-child-title">{{ taskDisplayTitle(child) }}</span>',
                    '<span class="project-history-detail-child-assignee">@{{ expertName(child.expertId) }}</span>',
                    '<span class="project-history-detail-child-status" :class="taskStatusClass(child)">{{ taskCardStatusLabel(child) }}</span>',
                  '</button>',
                '</div>',
                '<div v-else class="project-history-detail-empty">暂无子任务</div>',
              '</div>',
            '</div>',
          '</section>',
        '</div>',
      '</el-dialog>'
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
        '<div class="project-members-sidebar-summary">',
          '<div class="project-members-sidebar-summary-text"><strong>{{ members.length }}</strong><span>位专家参与 · {{ todoStats.total }} 个任务</span></div>',
          '<button type="button" class="sidebar-add-member-btn" @click="openAddMemberDialog">+ 添加成员</button>',
        '</div>',
        '<div class="project-members-sidebar-list">',
          '<article v-for="row in members" :key="row.id" class="project-drawer-member-card project-members-sidebar-card" :class="{ \'highlighting-expert\': highlightExpertId === row.expertId }">',
            '<span class="project-member-task-counter" :class="{ active: highlightExpertId === row.expertId }" @click.stop="highlightExpertId === row.expertId ? clearHighlightExpertTasks() : highlightExpertTasks(row.expertId)" @mouseenter="highlightExpertTasks(row.expertId)" @mouseleave="clearHighlightExpertTasks" :title="\'点击或悬停高亮 \' + row.expert.name + \' 的任务\'">{{ getMemberTaskStats(row.expertId).done }}/{{ getMemberTaskStats(row.expertId).total }}</span>',
            '<div class="project-members-sidebar-card-top">',
              '<img :src="row.expert.avatar" :alt="row.expert.name">',
              '<strong class="project-members-sidebar-card-name">{{ row.expert.name }}</strong>',
            '</div>',
            '<p class="project-drawer-member-desc">{{ row.expert.description || \'暂无能力介绍\' }}</p>',
            '<div class="project-drawer-member-actions">',
              '<button type="button" @click="createTaskForMember(row)">给 TA 创建任务</button>',
              '<button type="button" class="danger" @click="removeMember(row.id)">移除</button>',
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
          '<button type="button" class="project-task-detail-close" title="关闭" @click.stop="closeDrawer">',
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
          '</button>',
          '<div class="project-task-detail-identity">',
            '<div class="project-task-card-row project-task-card-row-title project-task-detail-title-row">',
              '<h3 class="project-task-card-title" :title="taskDisplayTitle(drawerTask)">{{ taskDisplayTitle(drawerTask) }}</h3>',
            '</div>',
            '<div class="project-task-card-row project-task-card-row-meta">',
              '<span class="project-task-card-assignee" :class="{ \'is-unassigned\': !taskHasAssignee(drawerTask) }">{{ taskCardAssigneeLabel(drawerTask) }}</span>',
              '<span class="project-task-card-status" :class="taskStatusClass(drawerTask)">{{ taskCardStatusLabel(drawerTask) }}</span>',
              '<span class="project-task-card-priority" :class="\'priority-\' + priorityTone(drawerTask.priority)" :title="priorityLabel(drawerTask.priority) + \'优先级\'">{{ priorityLabel(drawerTask.priority) }}</span>',
            '</div>',
            '<p class="project-task-card-row project-task-card-row-summary project-task-detail-summary-row">{{ taskCardSummary(drawerTask) }}</p>',
          '</div>',
          '<div class="project-task-detail-tabs" role="tablist">',
            '<button v-for="tab in detailPaneTabs(drawerTask)" :key="tab.key" type="button" class="project-task-detail-tab" :class="{ active: detailPane === tab.key }" role="tab" @click="setDetailPane(tab.key)">',
              '<span>{{ tab.label }}</span>',
              '<em v-if="tab.key === \'comments\' && tab.count">{{ tab.count }}</em>',
            '</button>',
          '</div>',
          '<div class="project-task-detail-scroll">',
            '<div v-show="detailPane === \'task\'" class="project-task-detail-pane">',
              '<div v-if="taskContextChips(drawerTask).length" class="project-task-detail-context">',
                '<span v-for="chip in taskContextChips(drawerTask)" :key="chip.key" class="project-task-detail-context-chip" :class="\'context-chip-\' + chip.key">{{ chip.label }}</span>',
              '</div>',
              '<div v-if="taskHasBody(drawerTask)" class="project-task-detail-section">',
                '<div class="project-task-detail-section-title">任务说明</div>',
                '<div class="project-task-detail-section-body">{{ drawerTask.body }}</div>',
              '</div>',
              '<div v-if="taskHasResultBlock(drawerTask)" class="project-task-detail-section project-task-detail-section-result">',
                '<div class="project-task-detail-section-title">执行结果</div>',
                '<div v-if="taskResultSummary(drawerTask)" class="project-task-detail-section-body">{{ taskResultSummary(drawerTask) }}</div>',
                '<div v-if="drawerTask.result && drawerTask.result !== taskResultSummary(drawerTask)" class="project-task-detail-section-body">{{ drawerTask.result }}</div>',
              '</div>',
              '<div v-if="taskOutputFiles(drawerTask).length" class="project-task-detail-section">',
                '<div class="project-task-detail-section-title">关联文件</div>',
                '<div class="project-task-detail-files">',
                  '<div v-for="file in taskOutputFiles(drawerTask)" :key="file.id || relatedFileName(file)" class="project-task-detail-file-row">',
                    '<span class="project-task-detail-file-name">{{ relatedFileName(file) }}</span>',
                    '<span class="project-task-detail-file-size">{{ relatedFileSizeLabel(file) }}</span>',
                    '<button type="button" class="project-task-detail-file-download" @click.stop="downloadTaskOutputFile(file)">下载</button>',
                  '</div>',
                '</div>',
              '</div>',
              '<div v-if="hasTaskDependencyBlock(drawerTask)" class="project-task-detail-section">',
                '<div class="project-task-detail-section-title">依赖关系</div>',
                '<div class="project-task-detail-deps">',
                  '<div v-if="parentTaskNames(drawerTask).length" class="project-task-detail-dep-line"><span class="project-task-detail-dep-label">前置</span><span>{{ parentTaskNames(drawerTask).join(\'、\') }}</span></div>',
                  '<div v-if="childTaskNames(drawerTask).length" class="project-task-detail-dep-line"><span class="project-task-detail-dep-label">子任务</span><span>{{ childTaskNames(drawerTask).join(\'、\') }}</span></div>',
                '</div>',
              '</div>',
            '</div>',
            '<div v-show="detailPane === \'process\'" class="project-task-detail-pane">',
              '<button v-if="processEventsHiddenCount(drawerTask)" type="button" class="project-task-process-more" @click="expandProcessEvents">查看更早记录（{{ processEventsHiddenCount(drawerTask) }}）</button>',
              '<div v-if="processEventsForDisplay(drawerTask).length" class="project-task-process-timeline">',
                '<div v-for="ev in processEventsForDisplay(drawerTask)" :key="ev.id" class="project-task-process-item">',
                  '<span class="project-task-process-dot" :class="\'ev-\' + ev.kind"></span>',
                  '<div class="project-task-process-body">',
                    '<div class="project-task-process-head"><span class="project-task-process-time">{{ eventTimeLabel(ev.createdAt) }}</span><span class="project-task-process-title">{{ ev.title }}</span></div>',
                    '<div v-if="ev.detail" class="project-task-process-detail">{{ ev.detail }}</div>',
                  '</div>',
                '</div>',
              '</div>',
            '</div>',
            '<div v-show="detailPane === \'comments\'" class="project-task-detail-pane project-task-detail-pane-comments">',
              '<div v-if="drawerTaskComments(drawerTask).length" class="project-task-detail-comments">',
                '<div class="comment-list">',
                  '<div v-for="cm in drawerTaskComments(drawerTask)" :key="cm.id" class="comment-item">',
                    '<div class="comment-time">{{ formatTaskTime(cm.createdAt) }}</div>',
                    '<div class="comment-body">{{ cm.body }}</div>',
                  '</div>',
                '</div>',
              '</div>',
              '<div v-if="!isDetailArchived(drawerTask)" class="project-task-detail-comment-row">',
                '<el-input v-model="drawerCommentDraft" type="textarea" :rows="2" placeholder="添加评论…" />',
                '<el-button type="primary" plain size="small" @click="submitDrawerComment">发表评论</el-button>',
              '</div>',
            '</div>',
          '</div>',
          '<div class="project-task-detail-actions-fixed">',
            '<div class="project-task-detail-action-buttons">',
              '<div class="project-task-detail-action-secondary">',
                '<el-dropdown v-if="getTaskFooterMore(drawerTask).length" trigger="click" @command="handleFooterMore">',
                  '<el-button size="small">更多</el-button>',
                  '<template #dropdown>',
                    '<el-dropdown-menu>',
                      '<el-dropdown-item v-for="act in getTaskFooterMore(drawerTask)" :key="act.key" :command="act.key">{{ act.label }}</el-dropdown-item>',
                    '</el-dropdown-menu>',
                  '</template>',
                '</el-dropdown>',
                '<el-tooltip v-for="act in getTaskFooterSecondary(drawerTask)" :key="act.key" :disabled="!act.disabled || !act.tooltip" :content="act.tooltip || \'\'" placement="top">',
                  '<span>',
                    '<el-button :type="act.type || \'default\'" size="small" :disabled="act.disabled" @click="handleDrawerAction(act, drawerTask)">{{ act.label }}</el-button>',
                  '</span>',
                '</el-tooltip>',
              '</div>',
              '<div v-if="getTaskFooterPrimary(drawerTask)" class="project-task-detail-action-primary">',
                '<el-tooltip :disabled="!getTaskFooterPrimary(drawerTask).disabled || !getTaskFooterPrimary(drawerTask).tooltip" :content="(getTaskFooterPrimary(drawerTask) && getTaskFooterPrimary(drawerTask).tooltip) || \'\'" placement="top">',
                  '<span>',
                    '<el-button type="primary" size="small" :disabled="getTaskFooterPrimary(drawerTask).disabled" @click="handleDrawerAction(getTaskFooterPrimary(drawerTask), drawerTask)">{{ getTaskFooterPrimary(drawerTask).label }}</el-button>',
                  '</span>',
                '</el-tooltip>',
              '</div>',
            '</div>',
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
      '<el-dialog v-model="showManualCreateDialog" title="创建任务" width="520px" :close-on-click-modal="false" append-to-body>',
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
          '<el-form-item label="优先级">',
            '<el-select v-model="manualForm.priority">',
              '<el-option v-for="p in priorityOptions" :key="p.key" :label="p.label" :value="p.key" />',
            '</el-select>',
          '</el-form-item>',
          '<el-form-item label="父任务">',
            '<el-select v-model="manualForm.parentTaskId" placeholder="可选，选择已有任务作为依赖" filterable clearable>',
              '<el-option v-for="task in formParentTasks" :key="task.id" :label="taskDisplayTitle(task)" :value="task.id" />',
            '</el-select>',
          '</el-form-item>',
        '</el-form>',
        '<template #footer>',
          '<el-button @click="closeManualCreateDialog">取消</el-button>',
          '<el-button type="primary" @click="submitManualCreateAndDispatch">创建并加入执行队列</el-button>',
        '</template>',
      '</el-dialog>'
    ].join('');
  }

  function taskActionDialogTemplate() {
    return [
      '<el-dialog v-model="taskActionVisible" :title="taskActionTitle" width="460px" :close-on-click-modal="false" destroy-on-close append-to-body @closed="closeTaskAction">',
        '<div v-if="taskActionTask" class="project-task-action-target">目标任务：<strong>{{ taskDisplayTitle(taskActionTask) }}</strong></div>',
        '<el-form label-position="top">',
          commentActionTemplate(),
          assignActionTemplate(),
          completeActionTemplate(),
          blockActionTemplate(),
          unblockActionTemplate(),
          updateBlockActionTemplate(),
          editResultActionTemplate(),
          resumeFromLoopActionTemplate(),
          editActionTemplate(),
          reassignActionTemplate(),
          moveStatusActionTemplate(),
          archiveActionTemplate(),
          deleteActionTemplate(),
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
  function updateBlockActionTemplate() {
    return '<el-form-item v-if="taskAction.type === \'updateBlock\'" label="阻塞说明" required><el-input v-model="taskActionForm.blockedReason" type="textarea" :rows="3" placeholder="更新阻塞原因" /></el-form-item>';
  }
  function editResultActionTemplate() {
    return '<el-form-item v-if="taskAction.type === \'editResult\'" label="完成结果" required><el-input v-model="taskActionForm.result" type="textarea" :rows="3" placeholder="补录完成说明" /></el-form-item>';
  }
  function resumeFromLoopActionTemplate() {
    return '<el-form-item v-if="taskAction.type === \'resumeFromLoop\'" label="补充说明" required><el-input v-model="taskActionForm.resumeSupplement" type="textarea" :rows="4" placeholder="用自然语言补充任务该怎么继续（不必指派专家）" /></el-form-item>';
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
    return '<div v-if="taskAction.type === \'archive\'" class="project-task-action-tip">归档后任务会进入已完成列的已归档区，默认隐藏。</div>';
  }
  function deleteActionTemplate() {
    return '<div v-if="taskAction.type === \'delete\'" class="project-task-action-tip project-task-action-warn">永久删除不可恢复，任务将从此项目中彻底移除。确定继续？</div>';
  }

  function projectSettingsDialogTemplate() {
    return [
      '<el-dialog v-model="showProjectSettingsDialog" title="项目设置" width="520px" class="project-settings-dialog" :close-on-click-modal="false" append-to-body>',
        '<el-form label-position="top" class="project-settings-form">',
          '<el-form-item label="项目名称" required>',
            '<el-input v-model="projectSettingsDraft.name" maxlength="60" show-word-limit placeholder="请输入项目名称" />',
          '</el-form-item>',
          '<el-form-item label="项目描述">',
            '<el-input v-model="projectSettingsDraft.description" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="简要说明项目目标和范围" />',
          '</el-form-item>',
          '<el-form-item label="工作目录">',
            '<el-input :model-value="project.defaultWorkdir || \'系统自动生成\'" disabled />',
            '<div class="project-settings-hint">工作目录由项目创建时自动生成并绑定。</div>',
          '</el-form-item>',
        '</el-form>',
        '<template #footer>',
          '<el-button @click="showProjectSettingsDialog = false">取消</el-button>',
          '<el-button type="primary" @click="saveProjectSettings">保存设置</el-button>',
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
