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
      ChatWorkspace: window.ChatWorkspace,
      ChatComposer: window.ChatComposer,
      ActivityItem: ChatBlocks.ActivityItem,
      ProcessTrace: ChatBlocks.ProcessTrace,
      ReplyBlock: ChatBlocks.ReplyBlock,
      UserMessage: ChatBlocks.UserMessage,
      StatusLine: ChatBlocks.StatusLine,
      ErrorRow: ChatBlocks.ErrorRow,
      SubagentCard: ChatInteractive.SubagentCard,
      HitlCard: ChatInteractive.HitlCard,
      ClarifyCard: ChatInteractive.ClarifyCard,
      ApprovalCard: ChatInteractive.ApprovalCard,
      ExpertTurnFlow: ChatInteractive.ExpertTurnFlow
    },
    props: ['expertId', 'taskId', 'startup'],
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
      var remoteError = Vue.ref('');
      var expertStarting = Vue.ref(props.startup === true || props.startup === '1');
      var expertStartupTimer = null;
      var messagePollTimer = null;
      var titlePollTimer = null;
      var streamTitleWaitTimer = null;
      var streamEs = null;
      var streaming = Vue.ref(false);
      var liveThought = Vue.ref('');
      var liveThinking = Vue.ref(false);
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
      /**
       * 当前任务的"等待回应"卡片
       * 规则：
       *  - 倒序找最近一个 pending HITL（clarify/approval 任一）
       *  - 同时返回 pending 总数，用于"还有 N 个"提示
       */
      var activeHitl = Vue.computed(function () {
        var list = messages.value || [];
        var pending = [];
        for (var i = 0; i < list.length; i++) {
          var m = list[i];
          if (m.type === 'clarify' && m.answer == null) {
            pending.push({ kind: 'clarify', data: m });
          } else if (m.type === 'approval' && m.choice == null) {
            pending.push({ kind: 'approval', data: m });
          }
        }
        if (!pending.length) return { current: null, count: 0, overflow: 0 };
        var last = pending[pending.length - 1];
        return {
          current: { kind: last.kind, data: last.data },
          count: pending.length,
          overflow: pending.length - 1
        };
      });
      var sessionModelOverride = Vue.ref('');
      var sessionModelConfigOverride = Vue.ref(null);
      var sessionModelDisplayName = Vue.ref('');
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
      // 模型选择列表：平台模型 + 各专家手动填写过的模型（去重汇总）
      function manualModelId(baseUrl, model) {
        return 'manual::' + String(baseUrl || '').trim() + '::' + String(model || '').trim();
      }
      var modelList = Vue.computed(function () {
        var list = [];
        (window.MODELS_CATALOG || []).forEach(function (m) {
          list.push({
            id: m.id || m.name,
            name: m.name || m.id,
            source: 'platform',
            visibility: m.visibility || 'public',
            capabilities: m.capabilities || (m.reasoning ? ['文本生成', '工具调用'] : ['文本生成']),
            contextLabel: m.contextLabel || '—',
            reasoning: !!m.reasoning,
            config: null
          });
        });
        var seen = {};
        (store.getExperts ? store.getExperts() : []).forEach(function (ex) {
          var mc = ex && ex.modelConfig;
          if (!mc) return;
          var mode = window.inferModelInputMode
            ? window.inferModelInputMode(mc, mc.model)
            : 'platform';
          if (mode !== 'manual') return;
          var baseUrl = String(mc.baseUrl || '').trim();
          var model = String(mc.model || '').trim();
          if (!baseUrl || !model) return;
          var id = manualModelId(baseUrl, model);
          if (seen[id]) return;
          seen[id] = true;
          list.push({
            id: id,
            name: model,
            source: 'manual',
            visibility: 'manual',
            capabilities: [],
            contextLabel: (mc.providerName || '').trim() || '手动',
            reasoning: false,
            config: {
              providerSlug: mc.providerSlug || 'custom',
              providerName: mc.providerName || '',
              baseUrl: baseUrl,
              apiKey: mc.apiKey || '',
              model: model
            },
            subTitle: (mc.providerName || '').trim() + ' · ' + baseUrl
          });
        });
        return list;
      });
      var showExpertPreviewDialog = Vue.ref(false);
      var previewStats = Vue.ref({ tasks: 0, projects: 0, skills: 0, tools: 0 });
      // 顶部状态栏状态（阶段0先用默认值，阶段2接 session.info）
      var sessionModel = Vue.ref('gpt-4o');
      // 工作目录按任务隔离：每个对话任务独立绑定 cwd（PRD 2.2 一任务一 session / 10.7）
      // 读取当前任务的 cwd；写入时更新该任务的 cwd 并刷新任务列表以触发响应式更新
      var sessionCwd = Vue.computed({
        get: function () {
          var tid = currentTaskId.value;
          if (!tid) return '';
          var list = tasks.value || [];
          for (var i = 0; i < list.length; i++) {
            if (list[i].id === tid) return list[i].cwd || '';
          }
          return '';
        },
        set: function (cwd) {
          applyTaskCwd(cwd);
        }
      });
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
        if (cwd === undefined || cwd === null) return;
        sessionCwd.value = cwd;
        ElementPlus.ElMessage.success('工作目录已切换为 ' + (cwd || '工作空间'));
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

      function handleDownloadFile(file) {
        if (!file) return;
        var enriched = file;
        if (store.getFileContent) {
          var content = store.getFileContent(props.expertId, file.id);
          if (content) enriched = Object.assign({}, file, content);
        }
        if (window.AppShared && window.AppShared.downloadWorkspaceFile) {
          window.AppShared.downloadWorkspaceFile(enriched);
        }
      }

      function handleCreateFolder(payload) {
        if (!payload || !payload.name) return;
        if (!store.addWorkspaceFolder) return;
        store.addWorkspaceFolder(props.expertId, { name: payload.name, parentId: payload.parentId });
        loadWorkspaceTree();
        ElementPlus.ElMessage.success('已创建文件夹「' + payload.name + '」');
      }

      function handleUploadFile(payload) {
        if (!payload || !payload.files || !payload.files.length) return;
        if (!store.addWorkspaceFile) return;
        for (var i = 0; i < payload.files.length; i++) {
          var f = payload.files[i];
          store.addWorkspaceFile(props.expertId, {
            name: f.name,
            parentId: payload.parentId,
            size: f.size || 0
          });
        }
        loadWorkspaceTree();
        ElementPlus.ElMessage.success('已上传 ' + payload.files.length + ' 个文件');
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
        // 触发 chatGroups / activeHitl 重算（数组项 property 变更不会自动触发 ref 重新计算）
        messages.value = messages.value.slice();
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
          role: 'expert', type: 'chat', expertId: expert.value.id,
          content: '已按「' + payload.choice + '」维度完成分析。\n\n（模拟回复 · 对接引擎后将替换为真实推理结果）'
        });
        store.mockTaskArtifact(expert.value, currentTaskId.value, payload.choice);
        store.updateTask(currentTaskId.value, { status: 'pending' });
        loadMessages();
        refreshTasks();
        scrollChatToBottom();
      }

      function handleApprovalResolve(payload) {
        if (!payload || !payload.requestId || !currentTaskId.value) return;
        var list = messages.value;
        var msg = list.find(function (m) { return m.requestId === payload.requestId; });
        if (!msg) return;
        msg.choice = payload.choice;
        // 触发 chatGroups / activeHitl 重算
        messages.value = messages.value.slice();
        if (payload.choice === 'allow' || payload.choice === 'allow_permanent') {
          var reply = '已完成操作，结果已写入工作空间。\n\n（模拟回复 · 对接引擎后将替换为真实结果）';
          store.addMessage(currentTaskId.value, {
            role: 'expert', type: 'chat', expertId: expert.value.id, content: reply
          });
          store.mockTaskArtifact(expert.value, currentTaskId.value, '审批通过后的导出结果');
          store.updateTask(currentTaskId.value, { status: 'pending' });
          refreshTasks();
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

      /** 对话流仅展示 process/goal 进度提示（PRD 7.2.3），model/cwd/委派说明等不在此展示 */
      function shouldShowConversationStatus(item) {
        if (!item || item.type !== 'status') return false;
        var kind = item.statusKind || '';
        return kind === 'process' || kind === 'goal';
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

      function applyTaskCwd(cwd) {
        if (!currentTaskId.value) return;
        if (cwd === undefined || cwd === null) return;
        store.updateTask(currentTaskId.value, { cwd: cwd });
        var list = tasks.value.slice();
        var idx = -1;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === currentTaskId.value) { idx = i; break; }
        }
        if (idx >= 0) {
          list[idx] = Object.assign({}, list[idx], { cwd: cwd });
          tasks.value = list;
        }
      }

      function syncTasksFromRemote(remote) {
        if (!remote) return;
        remoteError.value = '';
        var list = remote.filter(function (t) { return !t.archived; });
        list.sort(function (a, b) {
          return store.resolveTaskLastActivityAt(b).localeCompare(store.resolveTaskLastActivityAt(a));
        });
        tasks.value = list;
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
        liveThinking.value = false;
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
              liveThinking.value = true;
              liveThought.value += payload.text || '';
              scrollChatToBottom();
            },
            onMessageDelta: function (payload) {
              liveThinking.value = false;
              liveReply.value += payload.text || '';
              scrollChatToBottom();
            },
            onToolGenerating: function (payload) {
              liveThinking.value = false;
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

      function formatTaskLastActivity(task) {
        if (!task) return '';
        return formatTaskCreatedAt(store.resolveTaskLastActivityAt(task));
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
            if (m.type === 'status' && !shouldShowConversationStatus(m)) return;
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

      /** 流式进行中内容是否续接在最后一个专家回合内（避免重复头像/名称） */
      var liveAppendsToLastExpertTurn = Vue.computed(function () {
        if (!streaming.value) return false;
        var groups = chatGroups.value;
        if (!groups.length) return false;
        return groups[groups.length - 1].kind === 'expert-turn';
      });

      function liveExtras() {
        if (!streaming.value) return null;
        return {
          thought: liveThought.value,
          thinking: !!liveThinking.value,
          steps: liveSteps.value,
          reply: liveReply.value,
          pending: !liveReply.value
        };
      }

      function hasLiveProcessContent(extras) {
        return !!(extras && (extras.thought || extras.thinking || extras.reply || (extras.steps && extras.steps.length)));
      }

      function turnSegmentsFor(group, groupIndex) {
        var extras = {};
        if (streaming.value && liveAppendsToLastExpertTurn.value && groupIndex === chatGroups.value.length - 1) {
          extras = liveExtras() || { pending: true };
        }
        return ChatBlocks.segmentExpertTurn(group.items, extras);
      }

      var liveOnlySegments = Vue.computed(function () {
        if (!streaming.value || liveAppendsToLastExpertTurn.value) return [];
        var extras = liveExtras();
        if (!hasLiveProcessContent(extras)) return [];
        return ChatBlocks.segmentExpertTurn([], extras);
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
          skills: store.getEnabledSkillCount
            ? store.getEnabledSkillCount(expertId)
            : store.getSkillIds(expertId).length,
          tools: store.getToolIds(expertId).length
        };
      }

      function openExpertPreview() {
        if (!expert.value) return;
        previewStats.value = getExpertStats(expert.value.id);
        showExpertPreviewDialog.value = true;
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

      function beginExpertStartup() {
        if (!(props.startup === true || props.startup === '1')) return;
        expertStarting.value = true;
        if (expertStartupTimer) clearTimeout(expertStartupTimer);
        expertStartupTimer = setTimeout(function () {
          expertStarting.value = false;
          expertStartupTimer = null;
          var path = '/experts/' + props.expertId + '/tasks';
          if (currentTaskId.value) path += '/' + currentTaskId.value;
          ctx.emit('nav', path);
        }, 2600);
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
          var sendOpts = {};
          if (sessionModelConfigOverride.value) {
            sendOpts.modelConfig = sessionModelConfigOverride.value;
          }
          store.sendTaskMessageRemote(props.expertId, taskId, text || '', sendOpts).then(function (resp) {
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
          var pendingTimers = [];
          var currentTextTarget = 'thought';
          // 阶段化剧本：把每一步映射到 liveThought / liveSteps，最终落库
          store.playMockScript(expert.value, taskId, text, function (step) {
            if (step.type === 'thought.start') {
              liveThought.value = '';
              liveThinking.value = true;
              liveSteps.value = [];
              streaming.value = true;
              currentTextTarget = 'thought';
            } else if (step.type === 'text.delta') {
              // 流式文本：思考时写入 liveThought；其他阶段（工具进行中、最终回复）分别处理
              if (currentTextTarget === 'thought') liveThought.value += step.text;
              else if (currentTextTarget === 'reply') liveReply.value += step.text;
            } else if (step.type === 'thought.commit') {
              var tContent = liveThought.value;
              var tDuration = step.duration || 0;
              liveThought.value = '';
              liveThinking.value = false;
              currentTextTarget = null;
              store.addMessage(taskId, {
                role: 'expert', type: 'thought', expertId: expert.value.id,
                content: tContent, duration: tDuration
              });
              loadMessages();
              scrollChatToBottom();
            } else if (step.type === 'tool.start') {
              var tname = step.toolName || 'tool';
              var idx = liveSteps.value.findIndex(function (s) { return s.key === tname; });
              var newStep = { id: 'live-' + tname, key: tname, type: 'action', toolName: tname, content: '准备调用 ' + tname, progress: '准备中' };
              if (idx >= 0) liveSteps.value[idx] = newStep; else liveSteps.value.push(newStep);
              Vue.nextTick(function () { scrollChatToBottom(); });
            } else if (step.type === 'tool.running') {
              var rname = step.toolName || 'tool';
              var ridx = liveSteps.value.findIndex(function (s) { return s.key === rname; });
              if (ridx >= 0) {
                var list = liveSteps.value.slice();
                list[ridx] = Object.assign({}, list[ridx], { content: step.progress || '执行中...', progress: step.progress || '执行中' });
                liveSteps.value = list;
              }
              Vue.nextTick(function () { scrollChatToBottom(); });
            } else if (step.type === 'tool.commit') {
              var cname = step.toolName || 'tool';
              var summary = step.summary || '';
              var isErr = !!step.isError;
              // 先把 liveSteps 里对应卡片清掉，再 addMessage 落库
              liveSteps.value = liveSteps.value.filter(function (s) { return s.key !== cname; });
              store.addMessage(taskId, {
                role: 'expert', type: 'action', expertId: expert.value.id,
                toolName: cname,
                params: step.params || null,
                summary: summary,
                duration: step.duration || 0,
                isError: isErr,
                content: '[' + cname + '] ' + (isErr ? '执行失败' : '执行完成') + (step.duration ? ' (' + step.duration.toFixed(1) + 's)' : '')
              });
              loadMessages();
              Vue.nextTick(function () { scrollChatToBottom(); });
            } else if (step.type === 'subagent.commit') {
              store.addMessage(taskId, {
                role: 'expert', type: 'subagent', expertId: expert.value.id,
                subagentName: step.subagentName,
                goal: step.goal,
                subagentStatus: 'success',
                subagentDuration: step.duration,
                subagentSummary: step.summary,
                subagentEvents: step.events || []
              });
              loadMessages();
              Vue.nextTick(function () { scrollChatToBottom(); });
            } else if (step.type === 'clarify.commit') {
              store.addMessage(taskId, {
                role: 'expert', type: 'clarify', expertId: expert.value.id,
                requestId: step.requestId,
                question: step.question,
                choices: step.choices,
                answer: null
              });
              loadMessages();
              Vue.nextTick(function () { scrollChatToBottom(); });
            } else if (step.type === 'approval.commit') {
              store.addMessage(taskId, {
                role: 'expert', type: 'approval', expertId: expert.value.id,
                requestId: step.requestId,
                command: step.command,
                description: step.description,
                allowPermanent: !!step.allowPermanent,
                choice: null
              });
              loadMessages();
              Vue.nextTick(function () { scrollChatToBottom(); });
            } else if (step.type === 'error.commit') {
              store.addMessage(taskId, {
                role: 'expert', type: 'error', expertId: expert.value.id,
                content: step.content
              });
              loadMessages();
              Vue.nextTick(function () { scrollChatToBottom(); });
            } else if (step.type === 'reply.start') {
              // 切到回复流式：之后的 text.delta 写入 liveReply
              liveReply.value = '';
              currentTextTarget = 'reply';
            } else if (step.type === 'reply.commit') {
              var replyContent = step.content;
              store.addMessage(taskId, {
                role: 'expert', type: 'chat', expertId: expert.value.id, content: replyContent
              });
              liveReply.value = '';
              currentTextTarget = null;
              loadMessages();
              if (step.interim) {
                Vue.nextTick(function () { scrollChatToBottom(); });
                return;
              }
              store.mockTaskArtifact(expert.value, taskId, text);
              store.updateTask(taskId, { status: 'pending' });
              streaming.value = false;
              refreshTasks();
            } else if (step.type === 'done') {
              liveThought.value = '';
              liveThinking.value = false;
              liveReply.value = '';
              liveSteps.value = [];
              currentTextTarget = null;
              streaming.value = false;
              sending.value = false;
              scrollChatToBottom(true);
              pendingTimers.forEach(function (t) { clearTimeout(t); });
              pendingTimers = [];
            }
          });
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
        var found = null;
        var list = modelList.value || [];
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === modelId) { found = list[i]; break; }
        }
        sessionModelOverride.value = modelId;
        sessionModel.value = found ? found.name : modelId;
        sessionModelDisplayName.value = found ? found.name : modelId;
        if (found && found.source === 'manual' && found.config) {
          sessionModelConfigOverride.value = Object.assign({}, found.config);
        } else {
          sessionModelConfigOverride.value = null;
        }
        ElementPlus.ElMessage.success('模型已切换为 ' + (found ? found.name : modelId) + '，下一回合生效');
      }

      function handleSelectCwd(cwd) {
        if (cwd === '__workspace__') {
          workspaceOpen.value = true;
          return;
        }
        if (cwd === undefined || cwd === null) return;
        sessionCwd.value = cwd === '__root__' ? '' : cwd;
        ElementPlus.ElMessage.success('工作目录已切换为 ' + (cwd === '__root__' || !cwd ? '工作空间' : cwd));
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
          '确定删除该任务？对话记录将被删除，相关产物不会删除',
          '删除任务',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        ).then(function () {
          var wasCurrent = currentTaskId.value === task.id;
          function afterDeleted() {
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
        beginExpertStartup();
        window.addEventListener('app-store-updated', loadExpert);
      });
      Vue.onBeforeUnmount(function () {
        if (expertStartupTimer) clearTimeout(expertStartupTimer);
        stopTitlePoll();
        stopStream();
        window.removeEventListener('app-store-updated', loadExpert);
      });

      return {
        expert: expert, tasks: tasks,
        expertStarting: expertStarting,
        remoteError: remoteError,
        currentTaskId: currentTaskId, messages: messages, showExpertIntro: showExpertIntro, chatGroups: chatGroups,
        liveAppendsToLastExpertTurn: liveAppendsToLastExpertTurn,
        turnSegmentsFor: turnSegmentsFor,
        liveOnlySegments: liveOnlySegments,
        expertTags: expertTags,
        tagColors: catalog.TAG_COLORS,
        showExpertPreviewDialog: showExpertPreviewDialog, previewStats: previewStats,
        openExpertPreview: openExpertPreview,
        inputText: inputText, sending: sending, streaming: streaming,
        liveThought: liveThought, liveReply: liveReply, liveSteps: liveSteps,
        // 阶段2 输入区状态
        expertStatus: expertStatus,
        expertStatusLabel: expertStatusLabel,
        activeHitl: activeHitl,
        sessionModelOverride: sessionModelOverride,
        sessionModelConfigOverride: sessionModelConfigOverride,
        sessionModelDisplayName: sessionModelDisplayName,
        sessionCwd: sessionCwd,
        tokenEstimate: tokenEstimate,
        modelList: modelList,
        workspaceFilesFlat: workspaceFilesFlat,
        handleSelectModel: handleSelectModel,
        handleSelectCwd: handleSelectCwd,
        handleInterrupt: handleInterrupt,
        statusContent: statusContent,
        shouldShowConversationStatus: shouldShowConversationStatus,
        chatBox: chatBox,
        userScrolledUp: userScrolledUp, hasNewMessage: hasNewMessage,
        onChatScroll: onChatScroll, backToLatest: backToLatest,
        pendingFiles: chatFiles.pendingFiles, fileInputRef: chatFiles.fileInputRef,
        triggerFileUpload: chatFiles.triggerFileUpload, handleFileSelect: chatFiles.handleFileSelect,
        removePendingFile: chatFiles.removePendingFile, formatFileSize: chatFiles.formatFileSize,
        formatTaskCreatedAt: formatTaskCreatedAt, formatTaskLastActivity: formatTaskLastActivity,
        isTaskRunning: isTaskRunning, taskStatusTip: taskStatusTip,
        selectTask: selectTask, newTask: newTask, send: send,
        editTask: editTask, deleteTaskItem: deleteTaskItem,
        handleTaskMenu: handleTaskMenu,
        filteredTasks: filteredTasks, taskStats: taskStats,
        // 顶部状态栏
        sessionModel: sessionModel, sessionCwd: sessionCwd, workspaceOpen: workspaceOpen,
        workspaceTree: workspaceTree, workspaceRootPath: workspaceRootPath, previewFile: previewFile,
        loadWorkspaceTree: loadWorkspaceTree, handleSetCwd: handleSetCwd, handlePreviewFile: handlePreviewFile,
        handleDownloadFile: handleDownloadFile,
        handleCreateFolder: handleCreateFolder, handleUploadFile: handleUploadFile,
        handleOpenWorkspaceFromTask: handleOpenWorkspaceFromTask,
        toggleWorkspace: toggleWorkspace,
        handleClarifyAnswer: handleClarifyAnswer,
        handleApprovalResolve: handleApprovalResolve,
        renderMarkdown: window.renderMarkdown
      };
    },
    template: '<template v-if="expert">\
      <div class="task-layout" :class="{ \'is-expert-starting\': expertStarting }">\
        <div v-if="expertStarting" class="expert-startup-mask" role="status" aria-live="polite">\
          <div class="expert-startup-dialog">\
            <span class="expert-startup-text">正在启动{{ expert.name }}…</span>\
          </div>\
        </div>\
        <chat-top-bar\
          :expert="expert"\
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
              <template v-for="(group, groupIndex) in chatGroups" :key="group.id">\
                <div v-if="group.kind === \'expert-turn\'" class="msg-row expert">\
                  <div class="msg-col">\
                    <div class="msg-header">\
                      <img class="msg-avatar" :src="expert.avatar" :alt="expert.name" />\
                      <span class="msg-sender">{{ expert.name }}</span>\
                    </div>\
                    <expert-turn-flow :segments="turnSegmentsFor(group, groupIndex)" :render-markdown="renderMarkdown" />\
                  </div>\
                </div>\
                <user-message v-else :message="group.message" />\
              </template>\
              <div v-if="streaming && !liveAppendsToLastExpertTurn && liveOnlySegments.length" class="stream-live-block">\
                <div class="msg-row expert">\
                  <div class="msg-col">\
                    <div class="msg-header">\
                      <img class="msg-avatar" :src="expert.avatar" :alt="expert.name" />\
                      <span class="msg-sender">{{ expert.name }}</span>\
                    </div>\
                    <expert-turn-flow :segments="liveOnlySegments" :render-markdown="renderMarkdown" />\
                  </div>\
                </div>\
              </div>\
            </template>\
          </div>\
            <button v-if="hasNewMessage" type="button" class="chat-back-to-latest" @click="backToLatest">\
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>\
              回到最新\
            </button>\
          </div>\
          <div v-if="activeHitl.current"\
               class="hitl-pin-wrap"\
               :class="{ \'is-danger\': activeHitl.current.kind === \'approval\' }">\
            <hitl-card\
              :variant="activeHitl.current.kind"\
              :data="activeHitl.current.data"\
              mode="pending"\
              @answer="handleClarifyAnswer"\
              @resolve="handleApprovalResolve" />\
            <div v-if="activeHitl.overflow > 0" class="hitl-pin-overflow">\
              还有 {{ activeHitl.overflow }} 个待回应请求已折叠到对话历史中\
            </div>\
          </div>\
          <chat-composer\
            v-model:input-text="inputText"\
            :pending-files="pendingFiles"\
            :sending="sending"\
            :expert-status="expertStatus"\
            :remote-error="remoteError"\
            :format-file-size-fn="formatFileSize"\
            :model-override="sessionModelOverride"\
            :model-display-name="sessionModelDisplayName"\
            :model-list="modelList"\
            :session-cwd="sessionCwd"\
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
          :task-stats="taskStats"\
          :is-running-fn="isTaskRunning"\
          :task-status-tip-fn="taskStatusTip"\
          :last-activity-label-fn="formatTaskLastActivity"\
          @select="selectTask"\
          @menu="handleTaskMenu"\
          @open-workspace="handleOpenWorkspaceFromTask" />\
        <chat-workspace\
          :open="workspaceOpen"\
          :tree="workspaceTree"\
          :session-cwd="sessionCwd"\
          :preview-file="previewFile"\
          @close="toggleWorkspace"\
          @select-cwd="handleSetCwd"\
          @preview-file="handlePreviewFile"\
          @download-file="handleDownloadFile"\
          @create-folder="handleCreateFolder"\
          @upload-file="handleUploadFile" />\
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
      </template>\
      <div v-else class="main-scroll"><el-empty description="专家不存在"><back-link label="返回专家" @click="$emit(\'nav\', \'/experts\')" /></el-empty></div>'
  };

  window.ExpertTasksPage = ExpertTasksPage;
})();
