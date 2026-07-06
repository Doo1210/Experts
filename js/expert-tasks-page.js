/**
 * 专家任务页
 */
(function () {
  var store = window.AppStore;
  var catalog = window;
  var createChatFileUpload = window.AppShared.createChatFileUpload;
  var ChatBlocks = window.ChatBlocks;
  var ChatInteractive = window.ChatInteractive;

  var ExpertTasksPage = {
    components: {
      ChatTopBar: window.ChatTopBar,
      ChatTaskList: window.ChatTaskList,
      ChatArtifactsPanel: window.ChatArtifactsPanel,
      ChatWorkspace: window.ChatWorkspace,
      ChatComposer: window.ChatComposer,
      ThoughtBlock: ChatBlocks.ThoughtBlock,
      ToolCard: ChatBlocks.ToolCard,
      ReplyBlock: ChatBlocks.ReplyBlock,
      UserMessage: ChatBlocks.UserMessage,
      StatusLine: ChatBlocks.StatusLine,
      ErrorRow: ChatBlocks.ErrorRow,
      SubagentCard: ChatInteractive.SubagentCard,
      ClarifyCard: ChatInteractive.ClarifyCard,
      ApprovalCard: ChatInteractive.ApprovalCard
    },
    props: ['expertId', 'taskId'],
    emits: ['nav'],
    setup: function (props, ctx) {
      var expert = Vue.ref(null);
      var tasks = Vue.ref([]);
      var currentTaskId = Vue.ref(props.taskId);
      var messages = Vue.ref([]);
      var inputText = Vue.ref('');
      var sending = Vue.ref(false);
      var chatBox = Vue.ref(null);
      // T4.3 对话流滚动控制
      var userScrolledUp = Vue.ref(false);
      var hasNewMessage = Vue.ref(false);
      var chatFiles = createChatFileUpload();
      var panelArtifacts = Vue.ref([]);
      var artifactPanelTaskId = Vue.ref(null);
      var remoteError = Vue.ref('');
      var messagePollTimer = null;
      var titlePollTimer = null;
      var streamTitleWaitTimer = null;
      var streamEs = null;
      var streaming = Vue.ref(false);
      var liveThought = Vue.ref('');
      var liveReply = Vue.ref('');
      var liveSteps = Vue.ref([]);
      // === 阶段2 输入区相关状态（占位，后续 task 实现） ===
      var expertStatus = Vue.computed(function () {
        // T2.2 统一状态机：error > hitl > running > idle
        if (remoteError.value) return 'error';
        // HITL：存在未回应的 clarify / approval
        var list = messages.value || [];
        for (var i = 0; i < list.length; i++) {
          var m = list[i];
          if (m.type === 'clarify' && !m.answer) return 'hitl';
          if (m.type === 'approval' && !m.choice) return 'hitl';
        }
        if (streaming.value || sending.value) return 'running';
        return 'idle';
      });
      var expertStatusLabel = Vue.computed(function () {
        var map = { idle: '空闲', running: '执行中', hitl: '等待回应', error: '出错' };
        return map[expertStatus.value] || '空闲';
      });
      var sessionModelOverride = Vue.ref('');
      var tokenEstimate = Vue.computed(function () {
        var t = inputText.value || '';
        var n = Math.ceil(t.length / 4);
        var files = chatFiles.pendingFiles.value || [];
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          if (f.kind === 'image') {
            if (f.width && f.height) {
              n += Math.ceil(f.width / 512) * Math.ceil(f.height / 512) * 85;
            } else {
              n += 85;
            }
          } else {
            n += Math.ceil((f.size || 0) / 4);
          }
        }
        return n;
      });
      var workspaceFilesFlat = Vue.computed(function () {
        if (!store.getWorkspaceFiles) return [];
        var raw = store.getWorkspaceFiles(props.expertId) || [];
        // 若工作空间无数据，尝试预加载 demo 数据（幂等）
        if (!raw.length && store.ensureDemoWorkspace) {
          store.ensureDemoWorkspace(props.expertId);
          raw = store.getWorkspaceFiles(props.expertId) || [];
        }
        var idMap = {};
        raw.forEach(function (f) { idMap[String(f.id)] = f; });
        function buildPath(item) {
          var parts = [item.name];
          var cur = item;
          var guard = 0;
          while (cur && cur.parentId && guard < 20) {
            var p = idMap[String(cur.parentId)];
            if (!p) break;
            parts.unshift(p.name);
            cur = p;
            guard++;
          }
          return parts.join('/');
        }
        return raw.filter(function (f) { return f.kind !== 'folder' && f.type !== 'folder'; }).map(function (f) {
          return {
            id: f.id,
            name: f.name,
            path: buildPath(f),
            kind: f.kind
          };
        });
      });
      var modelList = Vue.ref([
        { id: 'gpt-4o', name: 'gpt-4o', reasoning: true },
        { id: 'gpt-4o-mini', name: 'gpt-4o-mini', reasoning: false },
        { id: 'claude-sonnet-4', name: 'claude-sonnet-4', reasoning: true },
        { id: 'qwen-max', name: 'qwen-max', reasoning: false }
      ]);
      var cwdOptions = Vue.ref(['工位8', '工位12', '产线A', '数据分析']);
      var showExpertPreviewDialog = Vue.ref(false);
      var previewStats = Vue.ref({ tasks: 0, projects: 0, skills: 0, tools: 0 });
      // 顶部状态栏状态（阶段0先用默认值，阶段2接 session.info）
      var sessionModel = Vue.ref('gpt-4o');
      var sessionCwd = Vue.ref('工位8');
      var workspaceOpen = Vue.ref(false);
      var workspaceTree = Vue.ref([]);
      var workspaceRootPath = Vue.ref('D:\\workspace');
      var previewFile = Vue.ref(null);

      function toggleWorkspace() {
        workspaceOpen.value = !workspaceOpen.value;
        if (workspaceOpen.value && !workspaceTree.value.length) {
          loadWorkspaceTree();
        }
      }

      function loadWorkspaceTree() {
        if (store.ensureDemoWorkspace) {
          store.ensureDemoWorkspace(props.expertId);
        }
        if (store.getWorkspaceTree) {
          workspaceTree.value = store.getWorkspaceTree(props.expertId) || [];
        }
      }

      function handleSetCwd(cwd) {
        if (!cwd) return;
        sessionCwd.value = cwd;
        ElementPlus.ElMessage.success('工作目录已切换为 ' + cwd);
      }

      function handlePreviewFile(file) {
        if (!file) { previewFile.value = null; return; }
        var enriched = file;
        if (store.getFileContent) {
          var content = store.getFileContent(props.expertId, file.id);
          if (content) enriched = Object.assign({}, file, content);
        }
        previewFile.value = enriched;
      }

      function handleOpenWorkspaceFromTask(task) {
        // 切换到该任务（如果尚未选中）
        if (task && task.id !== currentTaskId.value) {
          selectTask(task.id);
        }
        // 打开工作空间面板
        if (!workspaceOpen.value) {
          toggleWorkspace();
        }
      }

      function handleClarifyAnswer(payload) {
        if (!payload || !payload.requestId || !currentTaskId.value) return;
        var list = messages.value;
        var msg = list.find(function (m) { return m.requestId === payload.requestId; });
        if (!msg) return;
        msg.answer = payload.choice;
        var cap = store.getExpertDemoCapabilities ? store.getExpertDemoCapabilities(expert.value.id) : { tool: '数据查询' };
        store.addMessage(currentTaskId.value, {
          role: 'expert', type: 'action', expertId: expert.value.id,
          toolName: cap.tool,
          params: { dimension: payload.choice },
          summary: '按「' + payload.choice + '」维度完成分析',
          duration: 1.5,
          content: '[' + cap.tool + '] 执行完成 (1.5s)'
        });
        store.addMessage(currentTaskId.value, {
          role: 'expert', type: 'approval', expertId: expert.value.id,
          requestId: 'approval-' + Date.now(),
          command: 'export_report --format=xlsx',
          description: '将分析结果导出为 Excel 并写入工作空间',
          allowPermanent: true,
          choice: null
        });
        loadMessages();
        scrollChatToBottom();
      }

      function handleApprovalResolve(payload) {
        if (!payload || !payload.requestId || !currentTaskId.value) return;
        var list = messages.value;
        var msg = list.find(function (m) { return m.requestId === payload.requestId; });
        if (!msg) return;
        msg.choice = payload.choice;
        if (payload.choice === 'allow' || payload.choice === 'allow_permanent') {
          var reply = '已完成操作，结果已写入工作空间。\n\n（模拟回复 · 对接引擎后将替换为真实结果）';
          store.addMessage(currentTaskId.value, {
            role: 'expert', type: 'chat', expertId: expert.value.id, content: reply
          });
          store.mockTaskArtifact(expert.value, currentTaskId.value, '审批通过后的导出结果');
          store.updateTask(currentTaskId.value, { status: 'pending' });
          refreshTasks();
          if (artifactPanelTaskId.value === currentTaskId.value) loadPanelArtifacts(currentTaskId.value);
        } else {
          store.addMessage(currentTaskId.value, {
            role: 'expert', type: 'chat', expertId: expert.value.id,
            content: '操作已取消。如需其他帮助请告知。'
          });
        }
        loadMessages();
        scrollChatToBottom();
        sending.value = false;
      }

      function scrollChatToBottom(force) {
        Vue.nextTick(function () {
          if (!chatBox.value) return;
          if (!force && userScrolledUp.value) {
            hasNewMessage.value = true;
            return;
          }
          chatBox.value.scrollTop = chatBox.value.scrollHeight;
          hasNewMessage.value = false;
        });
      }

      function onChatScroll() {
        if (!chatBox.value) return;
        var el = chatBox.value;
        var nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        if (nearBottom) {
          userScrolledUp.value = false;
          hasNewMessage.value = false;
        } else {
          userScrolledUp.value = true;
        }
      }

      function backToLatest() {
        userScrolledUp.value = false;
        scrollChatToBottom(true);
      }

      function statusContent(content) {
        var text = String(content || '');
        if (/^正在(调用|准备工具调用|生成工具调用)/.test(text)) return '';
        return text;
      }

      function upsertLiveStep(toolName, patch) {
        var key = String(toolName || 'tool');
        var list = liveSteps.value.slice();
        var idx = -1;
        for (var i = 0; i < list.length; i++) {
          if (list[i].key === key) { idx = i; break; }
        }
        if (idx >= 0) {
          list[idx] = Object.assign({}, list[idx], patch);
        } else {
          list.push(Object.assign({ id: 'live-' + key, key: key }, patch));
        }
        liveSteps.value = list;
        scrollChatToBottom();
      }

      function hasCompletedTurn(remote) {
        if (!remote || !remote.length) return false;
        var users = 0;
        var expertChats = 0;
        remote.forEach(function (m) {
          if (m.role === 'user') users++;
          if (m.role === 'expert' && (!m.type || m.type === 'chat')) expertChats++;
        });
        return users > 0 && expertChats >= users;
      }

      function stopTitlePoll() {
        if (titlePollTimer) {
          clearInterval(titlePollTimer);
          titlePollTimer = null;
        }
        if (streamTitleWaitTimer) {
          clearTimeout(streamTitleWaitTimer);
          streamTitleWaitTimer = null;
        }
      }

      function applyTaskTitle(title) {
        if (!title || !currentTaskId.value) return;
        store.updateTask(currentTaskId.value, { title: title, titleSet: true });
        var list = tasks.value.slice();
        var idx = -1;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === currentTaskId.value) { idx = i; break; }
        }
        if (idx >= 0) {
          list[idx] = Object.assign({}, list[idx], { title: title, titleSet: true });
          tasks.value = list;
        }
      }

      function syncTasksFromRemote(remote) {
        if (!remote) return;
        remoteError.value = '';
        tasks.value = remote.filter(function (t) { return !t.archived; });
      }

      function startTitlePoll(taskId) {
        stopTitlePoll();
        if (!taskId || (store.isDevMock && store.isDevMock())) return;
        var attempts = 0;
        var maxAttempts = 24;
        titlePollTimer = setInterval(function () {
          attempts += 1;
          if (!currentTaskId.value || currentTaskId.value !== taskId || attempts > maxAttempts) {
            stopTitlePoll();
            stopStream();
            return;
          }
          if (!store.fetchTasksByExpertRemote) return;
          store.fetchTasksByExpertRemote(props.expertId).then(function (remote) {
            if (!remote) return;
            syncTasksFromRemote(remote);
            var t = remote.find(function (x) { return x.id === taskId; });
            if (t && t.title && t.title !== '新任务') {
              applyTaskTitle(t.title);
              stopTitlePoll();
              stopStream();
            }
          });
        }, 1500);
        streamTitleWaitTimer = setTimeout(function () {
          stopTitlePoll();
          stopStream();
        }, 45000);
      }

      function clearStreamPreview() {
        streaming.value = false;
        liveThought.value = '';
        liveReply.value = '';
        liveSteps.value = [];
        stopMessagePoll();
      }

      function stopStream() {
        if (streamEs) {
          streamEs.close();
          streamEs = null;
        }
        clearStreamPreview();
      }

      function finishStreamTurn(options) {
        options = options || {};
        if (options.waitForTitle) {
          clearStreamPreview();
        } else {
          stopStream();
        }
        loadMessages();
        refreshTasks();
        if (artifactPanelTaskId.value === currentTaskId.value) {
          loadPanelArtifacts(currentTaskId.value);
        }
        sending.value = false;
        if (options.waitForTitle) {
          startTitlePoll(currentTaskId.value);
          return;
        }
        var task = store.getTask && store.getTask(currentTaskId.value);
        if (task && task.title === '新任务' && !task.titleSet) {
          startTitlePoll(currentTaskId.value);
        }
      }

      function beginStreamTurn(turnId) {
        stopTitlePoll();
        stopStream();
        streaming.value = true;
        if (!window.SidecarApi || !window.SidecarApi.streamTaskEvents) {
          startMessagePoll();
          return;
        }
        window.SidecarApi.streamTaskEvents(
          props.expertId,
          currentTaskId.value,
          turnId,
          {
            onReasoningDelta: function (payload) {
              liveThought.value += payload.text || '';
              scrollChatToBottom();
            },
            onMessageDelta: function (payload) {
              liveReply.value += payload.text || '';
              scrollChatToBottom();
            },
            onToolGenerating: function (payload) {
              var name = payload.name || 'tool';
              upsertLiveStep(name, {
                type: 'action',
                toolName: name,
                content: ''
              });
            },
            onToolStarted: function (payload) {
              var name = payload.name || 'tool';
              upsertLiveStep(name, {
                type: 'action',
                toolName: name,
                content: ''
              });
            },
            onToolCompleted: function (payload) {
              var name = payload.name || 'tool';
              var suffix = payload.duration ? (' (' + Number(payload.duration).toFixed(1) + 's)') : '';
              var status = payload.isError ? '执行失败' : '执行完成';
              upsertLiveStep(name, {
                type: 'action',
                toolName: name,
                content: '[' + name + '] ' + status + suffix
              });
            },
            onTaskTitle: function (payload) {
              if (!payload || !payload.title) return;
              if (payload.taskId && payload.taskId !== currentTaskId.value) return;
              applyTaskTitle(payload.title);
              stopTitlePoll();
              stopStream();
            },
            onTurnComplete: function (payload) {
              finishStreamTurn({ waitForTitle: !!(payload && payload.titlePending) });
            },
            onTurnError: function (payload) {
              remoteError.value = (payload && payload.message) || '任务执行失败';
              finishStreamTurn();
            },
            onError: function () {
              startMessagePoll();
            }
          }
        ).then(function (es) {
          streamEs = es;
        }).catch(function () {
          startMessagePoll();
        });
      }

      function stopMessagePoll() {
        if (messagePollTimer) {
          clearInterval(messagePollTimer);
          messagePollTimer = null;
        }
      }

      function startMessagePoll() {
        stopMessagePoll();
        if (store.isDevMock && store.isDevMock()) return;
        messagePollTimer = setInterval(function () {
          if (!currentTaskId.value || !sending.value || !store.fetchTaskMessagesRemote) return;
          store.fetchTaskMessagesRemote(props.expertId, currentTaskId.value).then(function (remote) {
            if (remote) {
              messages.value = mergeChatMessages(store.getMessages(currentTaskId.value), remote);
              scrollChatToBottom();
              if (hasCompletedTurn(remote)) {
                finishStreamTurn();
              }
            }
          });
        }, 900);
      }

      function loadPanelArtifacts(taskId) {
        panelArtifacts.value = taskId ? store.getTaskArtifacts(taskId) : [];
        if (taskId && store.fetchTaskArtifactsRemote) {
          store.fetchTaskArtifactsRemote(props.expertId, taskId).then(function (remote) {
            if (!remote) {
              if (!store.isDevMock || !store.isDevMock()) {
                var e = window.SidecarApi && window.SidecarApi.getLastError && window.SidecarApi.getLastError();
                remoteError.value = (e && e.message) || '产物加载失败';
              }
              return;
            }
            remoteError.value = '';
            panelArtifacts.value = remote;
          });
        }
      }

      function toggleTaskArtifacts(task, ev) {
        ev.stopPropagation();
        if (artifactPanelTaskId.value === task.id) {
          artifactPanelTaskId.value = null;
          panelArtifacts.value = [];
        } else {
          artifactPanelTaskId.value = task.id;
          loadPanelArtifacts(task.id);
        }
      }

      function closeArtifactPanel() {
        artifactPanelTaskId.value = null;
        panelArtifacts.value = [];
      }

      function artifactPanelTaskTitle() {
        if (!artifactPanelTaskId.value) return '';
        var t = tasks.value.find(function (x) { return x.id === artifactPanelTaskId.value; });
        return t ? t.title : '任务产物';
      }

      function getTaskArtifactCount(taskId) {
        return store.getTaskArtifacts(taskId).length;
      }

      function artifactTypeClass(type) {
        return 'artifact-type-' + (type || 'file');
      }

      function refreshTasks() {
        var all = store.getTasksByExpert(props.expertId, 'dialogue', true);
        tasks.value = all.filter(function (t) { return !t.archived; });
        if (store.fetchTasksByExpertRemote) {
          store.fetchTasksByExpertRemote(props.expertId).then(function (remote) {
            if (!remote) {
              if (!store.isDevMock || !store.isDevMock()) {
                var e = window.SidecarApi && window.SidecarApi.getLastError && window.SidecarApi.getLastError();
                remoteError.value = (e && e.message) || '任务列表加载失败';
              }
              return;
            }
            remoteError.value = '';
            syncTasksFromRemote(remote);
          });
        }
      }

      function formatTaskCreatedAt(isoStr) {
        if (!isoStr) return '';
        var d = new Date(String(isoStr).replace(' ', 'T'));
        if (isNaN(d.getTime())) return isoStr;
        var month = d.getMonth() + 1;
        var day = d.getDate();
        var hours = String(d.getHours()).padStart(2, '0');
        var minutes = String(d.getMinutes()).padStart(2, '0');
        return month + '月' + day + '日 ' + hours + ':' + minutes;
      }

      function isTaskRunning(t) {
        if (t.archived) return false;
        if (t.status === 'running') return true;
        if (sending.value && currentTaskId.value === t.id) return true;
        return false;
      }

      function taskStatusTip(t) {
        return isTaskRunning(t) ? '运行中' : '已就绪';
      }

      function isExpertMessage(m) {
        return m && m.role === 'expert';
      }

      function pushExpertTurn(groups, buffer) {
        if (!buffer.items.length) return;
        groups.push({
          id: buffer.id || ('expert-turn-' + groups.length),
          kind: 'expert-turn',
          items: buffer.items.slice()
        });
        buffer.id = '';
        buffer.items = [];
      }

      var showExpertIntro = Vue.computed(function () {
        return !currentTaskId.value || !messages.value.length;
      });

      var chatGroups = Vue.computed(function () {
        var groups = [];
        var expertBuffer = { id: '', items: [] };
        messages.value.forEach(function (m) {
          if (isExpertMessage(m)) {
            if (!expertBuffer.id) expertBuffer.id = m.id || ('expert-turn-' + groups.length);
            expertBuffer.items.push(m);
            return;
          }
          pushExpertTurn(groups, expertBuffer);
          groups.push({ id: m.id || ('message-' + groups.length), kind: 'message', message: m });
        });
        pushExpertTurn(groups, expertBuffer);
        return groups;
      });

      var filteredTasks = Vue.computed(function () {
        return tasks.value;
      });

      var taskStats = Vue.computed(function () {
        var counts = { total: tasks.value.length, running: 0, ready: 0 };
        tasks.value.forEach(function (t) {
          if (t.status === 'running') counts.running++;
          else counts.ready++;
        });
        return counts;
      });

      var expertTags = Vue.computed(function () {
        return expert.value && expert.value.expertise ? expert.value.expertise : [];
      });

      function getExpertStats(expertId) {
        return {
          tasks: store.getTasksByExpert(expertId).length,
          projects: store.getProjectsByExpert(expertId).length,
          skills: store.getSkillIds(expertId).length,
          tools: store.getToolIds(expertId).length
        };
      }

      function openExpertPreview() {
        if (!expert.value) return;
        previewStats.value = getExpertStats(expert.value.id);
        showExpertPreviewDialog.value = true;
      }

      // ---- 产物面板增强 ----
      var artifactPreviewVisible = Vue.ref(false);
      var artifactPreviewItem = Vue.ref(null);

      function openArtifactPreview(item) {
        artifactPreviewItem.value = item;
        artifactPreviewVisible.value = true;
      }

      function downloadArtifact(item) {
        var blob = new Blob([item.content || item.title], { type: 'text/plain;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (item.title || '产物') + '.txt';
        a.click();
        URL.revokeObjectURL(url);
      }

      function goToArtifactTask(taskId) {
        if (!taskId) return;
        selectTask(taskId);
      }

      function handleTaskMenu(command, task) {
        var ev = { stopPropagation: function () {} };
        if (command === 'edit') editTask(task, ev);
        else if (command === 'delete') deleteTaskItem(task, ev);
      }

      function loadExpert() {
        expert.value = store.getExpert(props.expertId);
        refreshTasks();
        if (currentTaskId.value) {
          loadMessages();
        } else if (tasks.value.length) {
          selectTask(tasks.value[0].id);
        }
      }

      function sidecarErrorMessage(fallback) {
        var e = window.SidecarApi && window.SidecarApi.getLastError && window.SidecarApi.getLastError();
        if (!e) return fallback;
        if (e.code === 'NETWORK_ERROR') {
          return fallback + '（请确认 sidecar 已启动，并检查 SIDECAR_API_BASE）';
        }
        return e.message || fallback;
      }

      function mergeChatMessages(local, remote) {
        var localList = local || [];
        var remoteList = remote || [];
        if (!remoteList.length) return localList.slice();
        if (!localList.length) return remoteList.slice();
        var localUsers = localList.filter(function (m) { return m.role === 'user'; }).length;
        var remoteUsers = remoteList.filter(function (m) { return m.role === 'user'; }).length;
        if (localUsers > remoteUsers) return localList.slice();
        if (remoteList.length > localList.length) return remoteList.slice();
        return remoteList.slice();
      }

      function showLocalMessages() {
        if (!currentTaskId.value) {
          messages.value = [];
          return;
        }
        messages.value = store.getMessages(currentTaskId.value);
        scrollChatToBottom();
      }

      function loadMessages(options) {
        options = options || {};
        if (!currentTaskId.value) { messages.value = []; return; }
        var local = store.getMessages(currentTaskId.value);
        messages.value = local.slice();
        // 切换任务时重置滚动状态，强制滚到底（PRD 11.4：每个 session 独立维护滚动）
        userScrolledUp.value = false;
        hasNewMessage.value = false;
        if (options.localOnly) {
          scrollChatToBottom(true);
          return;
        }
        if (store.fetchTaskMessagesRemote) {
          store.fetchTaskMessagesRemote(props.expertId, currentTaskId.value).then(function (remote) {
            if (!remote) {
              if (!store.isDevMock || !store.isDevMock()) {
                var e = window.SidecarApi && window.SidecarApi.getLastError && window.SidecarApi.getLastError();
                remoteError.value = (e && e.message) || '消息加载失败';
              }
              return;
            }
            remoteError.value = '';
            messages.value = mergeChatMessages(store.getMessages(currentTaskId.value), remote);
            scrollChatToBottom();
          });
        } else {
          scrollChatToBottom();
        }
      }

      function selectTask(id) {
        currentTaskId.value = id;
        ctx.emit('nav', '/experts/' + props.expertId + '/tasks/' + id);
        loadMessages();
      }

      function createTaskForChat() {
        if (!store.isDevMock() && store.createTaskRemote) {
          return store.createTaskRemote(props.expertId, '新任务').then(function (remoteTask) {
            if (!remoteTask) {
              remoteError.value = sidecarErrorMessage('发起任务失败');
              return null;
            }
            remoteError.value = '';
            refreshTasks();
            selectTask(remoteTask.id);
            return remoteTask;
          });
        }
        var t = store.createTask({ expertId: props.expertId, title: '新任务', type: 'dialogue' });
        refreshTasks();
        selectTask(t.id);
        return Promise.resolve(t);
      }

      function newTask() {
        createTaskForChat();
      }

      function sendToTask(taskId, text, attachments) {
        if (!taskId) return;
        currentTaskId.value = taskId;
        sending.value = true;
        store.updateTask(taskId, { status: 'running' });
        store.addMessage(taskId, {
          role: 'user',
          content: text || (attachments.length ? '发送了 ' + attachments.length + ' 个文件' : ''),
          attachments: attachments.length ? attachments : null
        });
        inputText.value = '';
        showLocalMessages();
        refreshTasks();
        if (store.sendTaskMessageRemote) {
          store.sendTaskMessageRemote(props.expertId, taskId, text || '').then(function (resp) {
            if (!resp) {
              if (!store.isDevMock || !store.isDevMock()) {
                remoteError.value = sidecarErrorMessage('消息发送失败');
                sending.value = false;
              }
              return;
            }
            remoteError.value = '';
            if (resp.turnId) {
              beginStreamTurn(resp.turnId);
            } else if (resp.status === 'running') {
              startMessagePoll();
            } else {
              loadMessages();
              if (artifactPanelTaskId.value === currentTaskId.value) loadPanelArtifacts(currentTaskId.value);
              refreshTasks();
              sending.value = false;
            }
          }).catch(function () {
            stopStream();
            sending.value = false;
          });
          if (!store.isDevMock || !store.isDevMock()) return;
        }
        setTimeout(function () {
          var wfResult = store.mockExpertWorkflowSteps(expert.value, taskId, text);
          var wfKind = (wfResult && wfResult.kind) || 'normal';
          loadMessages();
          if (wfKind === 'hitl') {
            sending.value = false;
            return;
          }
          setTimeout(function () {
            var reply = store.mockExpertReply(expert.value, text);
            store.addMessage(taskId, {
              role: 'expert', type: 'chat', expertId: expert.value.id, content: reply
            });
            store.mockTaskArtifact(expert.value, taskId, text);
            store.updateTask(taskId, { status: 'pending' });
            loadMessages();
            refreshTasks();
            if (artifactPanelTaskId.value === taskId) loadPanelArtifacts(taskId);
            sending.value = false;
          }, 700);
        }, 500);
      }

      function send() {
        var text = inputText.value.trim();
        var hasAttachments = chatFiles.pendingFiles.value.length > 0;
        if ((!text && !hasAttachments) || sending.value) return;
        if (!currentTaskId.value) {
          sending.value = true;
          createTaskForChat().then(function (task) {
            sending.value = false;
            if (!task) return;
            sendToTask(task.id, text, chatFiles.takePendingFiles());
          }).catch(function () {
            sending.value = false;
            remoteError.value = sidecarErrorMessage('发起任务失败');
          });
          return;
        }
        sendToTask(currentTaskId.value, text, chatFiles.takePendingFiles());
      }

      // === 阶段2 输入区交互（占位，后续 task 实现） ===
      function handleInterrupt() {
        // T2.3 实现：中断当前流式回复
        if (streamEs) { try { streamEs.close(); } catch (e) {} streamEs = null; }
        streaming.value = false;
        sending.value = false;
      }

      function handleSelectModel(modelId) {
        if (!modelId) return;
        sessionModelOverride.value = modelId;
        sessionModel.value = modelId;
        ElementPlus.ElMessage.success('模型已切换为 ' + modelId + '，下一回合生效');
      }

      function handleSelectCwd(cwd) {
        if (cwd === '__workspace__') {
          workspaceOpen.value = true;
          return;
        }
        if (!cwd) return;
        sessionCwd.value = cwd;
        ElementPlus.ElMessage.success('工作目录已切换为 ' + cwd);
      }

      function editTask(task, ev) {
        ev.stopPropagation();
        ElementPlus.ElMessageBox.prompt('请输入任务名称', '编辑任务', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: task.title,
          inputPattern: /\S+/,
          inputErrorMessage: '名称不能为空',
          appendTo: document.body
        }).then(function (result) {
          var title = (result && result.value ? result.value : '').trim();
          if (!title) return;
          function afterUpdated() {
            refreshTasks();
            ElementPlus.ElMessage.success('任务名称已更新');
          }
          if (!store.isDevMock() && store.updateTaskRemote) {
            store.updateTaskRemote(props.expertId, task.id, { title: title, titleSet: true }).then(function (ok) {
              if (!ok) {
                remoteError.value = sidecarErrorMessage('任务名称更新失败');
                ElementPlus.ElMessage.error('任务名称更新失败');
                return;
              }
              afterUpdated();
            });
            return;
          }
          store.updateTask(task.id, { title: title, titleSet: true });
          afterUpdated();
        }).catch(function () {});
      }

      function deleteTaskItem(task, ev) {
        ev.stopPropagation();
        ElementPlus.ElMessageBox.confirm(
          '确定删除该任务？相关对话与产物将一并删除。',
          '删除任务',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          var wasCurrent = currentTaskId.value === task.id;
          function afterDeleted() {
            if (artifactPanelTaskId.value === task.id) closeArtifactPanel();
            refreshTasks();
            if (wasCurrent) {
              if (tasks.value.length) selectTask(tasks.value[0].id);
              else {
                currentTaskId.value = null;
                ctx.emit('nav', '/experts/' + props.expertId + '/tasks');
                messages.value = [];
              }
            }
            ElementPlus.ElMessage.success('任务已删除');
          }
          if (!store.isDevMock() && store.deleteTaskRemote) {
            store.deleteTaskRemote(props.expertId, task.id).then(function (ok) {
              if (!ok) {
                remoteError.value = sidecarErrorMessage('任务删除失败');
                ElementPlus.ElMessage.error('任务删除失败');
                return;
              }
              afterDeleted();
            });
            return;
          }
          store.deleteTask(task.id);
          afterDeleted();
        }).catch(function () {});
      }

      Vue.watch(function () { return props.expertId; }, function () {
        loadExpert();
      });
      Vue.watch(function () { return props.taskId; }, function (v) {
        currentTaskId.value = v;
        loadMessages();
      });
      Vue.onMounted(function () {
        loadExpert();
        window.addEventListener('app-store-updated', loadExpert);
      });
      Vue.onBeforeUnmount(function () {
        stopTitlePoll();
        stopStream();
        window.removeEventListener('app-store-updated', loadExpert);
      });

      return {
        expert: expert, tasks: tasks,
        remoteError: remoteError,
        currentTaskId: currentTaskId, messages: messages, showExpertIntro: showExpertIntro, chatGroups: chatGroups,
        expertTags: expertTags,
        tagColors: catalog.TAG_COLORS,
        showExpertPreviewDialog: showExpertPreviewDialog, previewStats: previewStats,
        openExpertPreview: openExpertPreview,
        inputText: inputText, sending: sending, streaming: streaming,
        liveThought: liveThought, liveReply: liveReply, liveSteps: liveSteps,
        // 阶段2 输入区状态
        expertStatus: expertStatus,
        expertStatusLabel: expertStatusLabel,
        sessionModelOverride: sessionModelOverride,
        sessionCwd: sessionCwd,
        tokenEstimate: tokenEstimate,
        modelList: modelList,
        cwdOptions: cwdOptions,
        workspaceFilesFlat: workspaceFilesFlat,
        handleSelectModel: handleSelectModel,
        handleSelectCwd: handleSelectCwd,
        handleInterrupt: handleInterrupt,
        statusContent: statusContent,
        chatBox: chatBox,
        userScrolledUp: userScrolledUp, hasNewMessage: hasNewMessage,
        onChatScroll: onChatScroll, backToLatest: backToLatest,
        panelArtifacts: panelArtifacts, artifactPanelTaskId: artifactPanelTaskId,
        pendingFiles: chatFiles.pendingFiles, fileInputRef: chatFiles.fileInputRef,
        triggerFileUpload: chatFiles.triggerFileUpload, handleFileSelect: chatFiles.handleFileSelect,
        removePendingFile: chatFiles.removePendingFile, formatFileSize: chatFiles.formatFileSize,
        statusLabel: catalog.TASK_STATUS_LABEL, artifactTypeLabel: catalog.ARTIFACT_TYPE_LABEL,
        formatTaskCreatedAt: formatTaskCreatedAt, isTaskRunning: isTaskRunning, taskStatusTip: taskStatusTip,
        getTaskArtifactCount: getTaskArtifactCount, artifactTypeClass: artifactTypeClass,
        artifactPanelTaskTitle: artifactPanelTaskTitle,
        selectTask: selectTask, newTask: newTask, send: send,
        editTask: editTask, deleteTaskItem: deleteTaskItem,
        toggleTaskArtifacts: toggleTaskArtifacts, closeArtifactPanel: closeArtifactPanel, handleTaskMenu: handleTaskMenu,
        filteredTasks: filteredTasks, taskStats: taskStats,
        // 产物面板增强
        artifactPreviewVisible: artifactPreviewVisible, artifactPreviewItem: artifactPreviewItem,
        openArtifactPreview: openArtifactPreview, downloadArtifact: downloadArtifact, goToArtifactTask: goToArtifactTask,
        // 顶部状态栏
        sessionModel: sessionModel, sessionCwd: sessionCwd, workspaceOpen: workspaceOpen,
        workspaceTree: workspaceTree, workspaceRootPath: workspaceRootPath, previewFile: previewFile,
        loadWorkspaceTree: loadWorkspaceTree, handleSetCwd: handleSetCwd, handlePreviewFile: handlePreviewFile,
        handleOpenWorkspaceFromTask: handleOpenWorkspaceFromTask,
        toggleWorkspace: toggleWorkspace,
        handleClarifyAnswer: handleClarifyAnswer,
        handleApprovalResolve: handleApprovalResolve,
        renderMarkdown: window.renderMarkdown
      };
    },
    template: '<template v-if="expert">\
      <div class="task-layout">\
        <chat-top-bar\
          :expert="expert"\
          :model="sessionModel"\
          :cwd="sessionCwd"\
          :running="sending || streaming"\
          :error-state="remoteError"\
          :expert-status="expertStatus"\
          :workspace-open="workspaceOpen"\
          @back="$emit(\'nav\', \'/experts\')"\
          @open-expert="openExpertPreview"\
          @new-task="newTask"\
          @toggle-workspace="toggleWorkspace" />\
        <div class="task-body">\
        <div class="chat-main">\
          <div class="chat-messages-wrap">\
            <div class="chat-messages" ref="chatBox" @scroll="onChatScroll">\
            <div v-if="showExpertIntro" class="chat-empty-expert-card">\
              <div class="chat-empty-expert-avatar-wrap">\
                <img class="chat-empty-expert-avatar" :src="expert.avatar" :alt="expert.name">\
              </div>\
              <div class="chat-empty-expert-name">{{ expert.name }}</div>\
              <p v-if="expert.description" class="chat-empty-expert-desc">{{ expert.description }}</p>\
              <div v-if="expertTags.length" class="chat-empty-section">\
                <div class="chat-empty-section-title">擅长领域</div>\
                <div class="chat-empty-tags">\
                  <span v-for="(tag, idx) in expertTags" :key="tag" class="expertise-tag" :class="\'tag-\' + [\'blue\', \'green\', \'orange\', \'purple\', \'teal\'][idx % 5]">{{ tag }}</span>\
                </div>\
              </div>\
              <div class="chat-empty-tip">在下方输入任务指令并发送，将自动新建任务并开始对话</div>\
            </div>\
            <template v-else>\
              <template v-for="group in chatGroups" :key="group.id">\
                <div v-if="group.kind === \'expert-turn\'" class="msg-row expert">\
                  <div class="msg-col">\
                    <div class="msg-header">\
                      <img class="msg-avatar" :src="expert.avatar" :alt="expert.name" />\
                      <span class="msg-sender">{{ expert.name }}</span>\
                    </div>\
                    <template v-for="item in group.items" :key="item.id">\
                      <thought-block v-if="item.type === \'thought\'" :content="item.content" />\
                      <tool-card v-else-if="item.type === \'action\'" :tool-name="item.toolName" :content="item.content" :params="item.params" :summary="item.summary" :duration="item.duration" :progress="item.progress" :is-error="item.isError" />\
                      <subagent-card v-else-if="item.type === \'subagent\'" :subagent-name="item.subagentName" :goal="item.goal" :events="item.subagentEvents" />\
                      <clarify-card v-else-if="item.type === \'clarify\'" :request-id="item.requestId" :question="item.question" :choices="item.choices" :answer="item.answer" @answer="handleClarifyAnswer" />\
                      <approval-card v-else-if="item.type === \'approval\'" :request-id="item.requestId" :command="item.command" :description="item.description" :allow-permanent="item.allowPermanent" :choice="item.choice" @resolve="handleApprovalResolve" />\
                      <status-line v-else-if="item.type === \'status\'" :kind="item.statusKind" :content="item.content" />\
                      <error-row v-else-if="item.type === \'error\'" :content="item.content" />\
                      <reply-block v-else :content="item.content" :render-markdown="renderMarkdown" :attachments="item.attachments" />\
                    </template>\
                  </div>\
                </div>\
                <user-message v-else :message="group.message" />\
              </template>\
              <div v-if="streaming" class="stream-live-block">\
                <div v-if="liveThought || liveReply || liveSteps.length" class="msg-row expert">\
                  <div class="msg-col">\
                    <div class="msg-header">\
                      <img class="msg-avatar" :src="expert.avatar" :alt="expert.name" />\
                      <span class="msg-sender">{{ expert.name }}</span>\
                    </div>\
                    <thought-block v-if="liveThought" :content="liveThought" :live="true" :open="true" />\
                    <template v-for="step in liveSteps" :key="step.id">\
                      <tool-card :tool-name="step.toolName" :content="step.content" />\
                    </template>\
                    <reply-block v-if="liveReply" :content="liveReply" :render-markdown="renderMarkdown" :live="true" />\
                  </div>\
                </div>\
                <div v-if="!liveThought && !liveReply && !liveSteps.length" class="stream-waiting">\
                  <span class="chat-send-spinner"></span>\
                  <span>{{ expert.name }} 正在处理…</span>\
                </div>\
              </div>\
            </template>\
          </div>\
            <button v-if="hasNewMessage" type="button" class="chat-back-to-latest" @click="backToLatest">\
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>\
              回到最新\
            </button>\
          </div>\
          <chat-composer\
            v-model:input-text="inputText"\
            :pending-files="pendingFiles"\
            :sending="sending"\
            :expert-status="expertStatus"\
            :remote-error="remoteError"\
            :format-file-size-fn="formatFileSize"\
            :model-override="sessionModelOverride"\
            :model-list="modelList"\
            :session-cwd="sessionCwd"\
            :cwd-list="cwdOptions"\
            :token-estimate="tokenEstimate"\
            :workspace-files="workspaceFilesFlat"\
            @submit="send"\
            @file-select="handleFileSelect"\
            @remove-file="removePendingFile"\
            @interrupt="handleInterrupt"\
            @select-model="handleSelectModel"\
            @select-cwd="handleSelectCwd"\
            @open-workspace="toggleWorkspace" />\
        </div>\
        <chat-task-list\
          :tasks="filteredTasks"\
          :current-task-id="currentTaskId"\
          :artifact-panel-task-id="artifactPanelTaskId"\
          :task-stats="taskStats"\
          :is-running-fn="isTaskRunning"\
          :task-status-tip-fn="taskStatusTip"\
          :created-at-label-fn="formatTaskCreatedAt"\
          :artifact-count-fn="getTaskArtifactCount"\
          @select="selectTask"\
          @toggle-artifacts="toggleTaskArtifacts"\
          @menu="handleTaskMenu"\
          @open-workspace="handleOpenWorkspaceFromTask" />\
        <chat-workspace\
          :open="workspaceOpen"\
          :root-path="workspaceRootPath"\
          :tree="workspaceTree"\
          :session-cwd="sessionCwd"\
          :preview-file="previewFile"\
          @close="toggleWorkspace"\
          @select-cwd="handleSetCwd"\
          @preview-file="handlePreviewFile" />\
        <chat-artifacts-panel\
          :panel-artifacts="panelArtifacts"\
          :panel-task-title="artifactPanelTaskTitle()"\
          :artifact-type-label="artifactTypeLabel"\
          :created-at-label-fn="formatTaskCreatedAt"\
          @close="closeArtifactPanel"\
          @preview="openArtifactPreview"\
          @download="downloadArtifact"\
          @goto-task="goToArtifactTask(artifactPanelTaskId)" />\
        </div>\
      </div>\
      <el-dialog v-model="showExpertPreviewDialog" width="460px" class="expert-preview-dialog expert-preview-dialog--task" append-to-body>\
        <div class="expert-preview" v-if="expert">\
          <div class="expert-preview-header">\
            <div class="expert-preview-avatar-wrap">\
              <div class="expert-preview-polaroid">\
                <img :src="expert.avatar" :alt="expert.name">\
              </div>\
            </div>\
            <div class="expert-preview-profile">\
              <h2 class="expert-preview-name">{{ expert.name }}</h2>\
              <div class="expert-preview-meta">\
                <span class="expert-preview-online"><i></i>在线</span>\
                <span v-if="expert.createdAt || expert.updatedAt" class="expert-preview-dot">·</span>\
                <span v-if="expert.createdAt || expert.updatedAt">创建时间 {{ expert.createdAt || expert.updatedAt }}</span>\
              </div>\
            </div>\
          </div>\
          <div class="expert-preview-stats">\
            <div class="expert-preview-stat">\
              <span class="expert-preview-stat-value">{{ previewStats.tasks }}</span>\
              <span class="expert-preview-stat-label">任务</span>\
            </div>\
            <div class="expert-preview-stat">\
              <span class="expert-preview-stat-value">{{ previewStats.projects }}</span>\
              <span class="expert-preview-stat-label">项目</span>\
            </div>\
            <div class="expert-preview-stat">\
              <span class="expert-preview-stat-value">{{ previewStats.skills }}</span>\
              <span class="expert-preview-stat-label">技能</span>\
            </div>\
            <div class="expert-preview-stat">\
              <span class="expert-preview-stat-value">{{ previewStats.tools }}</span>\
              <span class="expert-preview-stat-label">工具</span>\
            </div>\
          </div>\
          <div class="expert-preview-section">\
            <div class="expert-preview-section-title">能力介绍</div>\
            <p class="expert-preview-desc">{{ expert.description || \'暂无介绍\' }}</p>\
          </div>\
          <div v-if="expertTags.length" class="expert-preview-section">\
            <div class="expert-preview-section-title">擅长领域</div>\
            <div class="expert-preview-tags">\
              <span v-for="(tag, idx) in expertTags.slice(0, 6)" :key="tag" class="expert-preview-tag" :class="tagColors[idx % tagColors.length]">{{ tag }}</span>\
            </div>\
          </div>\
        </div>\
      </el-dialog>\
      <el-dialog v-model="artifactPreviewVisible" title="产物预览" width="600px" :close-on-click-modal="true">\
        <div v-if="artifactPreviewItem" class="artifact-preview-body">\
          <div class="artifact-preview-meta">\
            <el-tag size="small" type="info" effect="plain">{{ artifactTypeLabel[artifactPreviewItem.type] || artifactPreviewItem.type }}</el-tag>\
            <span class="artifact-preview-time">{{ formatTaskCreatedAt(artifactPreviewItem.createdAt) }}</span>\
          </div>\
          <h3 class="artifact-preview-title">{{ artifactPreviewItem.title }}</h3>\
          <div class="artifact-preview-content">{{ artifactPreviewItem.content }}</div>\
        </div>\
        <template #footer>\
          <el-button @click="artifactPreviewVisible = false">关闭</el-button>\
          <el-button type="primary" @click="downloadArtifact(artifactPreviewItem); artifactPreviewVisible = false">下载</el-button>\
        </template>\
      </el-dialog>\
      </template>\
      <div v-else class="main-scroll"><el-empty description="专家不存在"><back-link label="返回专家" @click="$emit(\'nav\', \'/experts\')" /></el-empty></div>'
  };

  window.ExpertTasksPage = ExpertTasksPage;
})();

