/**
 * 专家任务页
 */
(function () {
  var store = window.AppStore;
  var catalog = window;
  var createChatFileUpload = window.AppShared.createChatFileUpload;

  var TaskListItem = {
    props: ['task', 'active', 'artifactOpen', 'isRunning', 'statusTip', 'createdAtLabel', 'artifactCount'],
    emits: ['select', 'toggle-artifacts', 'menu'],
    template: '\
      <div class="task-item" :class="{ active: active }" @click="$emit(\'select\')">\
        <div class="task-item-accent"></div>\
        <div class="task-item-row">\
          <div class="task-status-indicator" :title="statusTip">\
            <span v-if="isRunning" class="task-status-spinner-wrap">\
              <span class="task-status-spinner"></span>\
            </span>\
            <span v-else class="task-status-dot-wrap">\
              <span class="task-status-dot"></span>\
            </span>\
          </div>\
          <div class="task-item-content">\
            <div class="task-item-title">{{ task.title }}</div>\
            <div class="task-item-meta">\
              <svg class="task-item-meta-icon" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">\
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>\
              </svg>\
              <span>{{ createdAtLabel }}</span>\
            </div>\
          </div>\
          <div class="task-item-toolbar">\
            <div class="task-item-toolbar-top">\
              <el-dropdown trigger="click" @command="$emit(\'menu\', $event)">\
                <button type="button" class="task-more-btn" title="更多" @click.stop>\
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">\
                    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>\
                  </svg>\
                </button>\
                <template #dropdown>\
                  <el-dropdown-menu>\
                    <el-dropdown-item command="edit">编辑</el-dropdown-item>\
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>\
                  </el-dropdown-menu>\
                </template>\
              </el-dropdown>\
            </div>\
            <div class="task-item-toolbar-bottom">\
              <button type="button" class="task-artifact-link" :class="{ active: artifactOpen }" title="产物" @click.stop="$emit(\'toggle-artifacts\', $event)">\
                <span class="task-artifact-link-icon">\
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">\
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>\
                    <polyline points="14 2 14 8 20 8"/>\
                  </svg>\
                </span>\
                <span class="task-artifact-link-text">产物</span>\
                <span v-if="artifactCount > 0" class="task-artifact-badge">{{ artifactCount }}</span>\
              </button>\
            </div>\
          </div>\
        </div>\
      </div>'
  };

  var ExpertTasksPage = {
    components: { TaskListItem: TaskListItem },
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
      var showExpertPreviewDialog = Vue.ref(false);
      var previewStats = Vue.ref({ tasks: 0, projects: 0, skills: 0, tools: 0 });

      function scrollChatToBottom() {
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      function isSkillTool(name) {
        var n = String(name || '').toLowerCase();
        return n.indexOf('skill') >= 0;
      }

      function statusContent(content) {
        var text = String(content || '');
        if (/^正在(运用|使用技能|调用|准备技能调用|生成工具调用)/.test(text)) return '';
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
              var skill = isSkillTool(name);
              upsertLiveStep(name, {
                type: skill ? 'skill' : 'action',
                toolName: skill ? null : name,
                skillName: skill ? name : null,
                content: ''
              });
            },
            onToolStarted: function (payload) {
              var name = payload.name || 'tool';
              if (isSkillTool(name)) return;
              upsertLiveStep(name, {
                type: 'action',
                toolName: name,
                content: ''
              });
            },
            onToolCompleted: function (payload) {
              var name = payload.name || 'tool';
              if (isSkillTool(name)) return;
              var suffix = payload.duration ? (' (' + Number(payload.duration).toFixed(1) + 's)') : '';
              var status = payload.isError ? '执行失败' : '执行完成';
              upsertLiveStep(name, {
                type: 'action',
                toolName: name,
                content: '[' + name + '] ' + status + suffix
              });
            },
            onSkillStarted: function (payload) {
              var name = payload.name || 'skill';
              upsertLiveStep(name, {
                type: 'skill',
                skillName: name,
                content: ''
              });
            },
            onSkillCompleted: function (payload) {
              var name = payload.name || 'skill';
              var suffix = payload.duration ? (' (' + Number(payload.duration).toFixed(1) + 's)') : '';
              var status = payload.isError ? '执行失败' : '执行完成';
              upsertLiveStep(name, {
                type: 'skill',
                skillName: name,
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
        messages.value = local;
        if (options.localOnly) {
          scrollChatToBottom();
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
          store.mockExpertWorkflowSteps(expert.value, taskId, text);
          loadMessages();
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
        statusContent: statusContent,
        chatBox: chatBox,
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
        renderMarkdown: window.renderMarkdown
      };
    },
    template: '\
      <template v-if="expert">\
      <div class="task-layout">\
        <div class="task-top-bar">\
          <div class="task-top-bar-left">\
            <back-link label="返回专家" inline @click="$emit(\'nav\', \'/experts\')" />\
            <button type="button" class="task-top-bar-expert-trigger" title="查看专家信息" @click="openExpertPreview">\
              <img class="task-top-bar-avatar" :src="expert.avatar" :alt="expert.name">\
              <span class="task-top-bar-info">\
                <span class="task-top-bar-name">{{ expert.name }}</span>\
              </span>\
            </button>\
          </div>\
          <div class="project-header-actions">\
            <button\
              type="button"\
              class="project-header-action-btn"\
              title="发起任务"\
              @click="newTask">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">\
                <path d="M12 5v14M5 12h14"/>\
              </svg>\
              <span>发起任务</span>\
            </button>\
          </div>\
        </div>\
        <div class="task-body">\
        <div class="chat-main">\
          <div class="chat-messages" ref="chatBox">\
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
                      <details v-if="item.type === \'thought\'" class="log-thought-block">\
                        <summary>思考过程</summary>\
                        <div class="log-thought-content">{{ item.content }}</div>\
                      </details>\
                      <details v-else-if="item.type === \'skill\'" class="log-skill-card">\
                        <summary class="log-skill-summary">\
                          <span class="log-skill-icon">🧩</span>\
                          <span class="log-skill-body">\
                            <span class="log-skill-title">使用技能</span>\
                            <span class="log-skill-name" v-if="item.skillName">{{ item.skillName }}</span>\
                            <span class="log-skill-desc" v-if="statusContent(item.content)">{{ statusContent(item.content) }}</span>\
                          </span>\
                        </summary>\
                        <div class="log-skill-result" v-if="statusContent(item.content)">{{ statusContent(item.content) }}</div>\
                      </details>\
                      <details v-else-if="item.type === \'action\'" class="log-action-card">\
                        <summary class="log-action-summary">\
                          <span class="log-action-icon">⚡</span>\
                          <span class="log-action-body">\
                            <span class="log-action-title">调用工具</span>\
                            <span class="log-action-tool" v-if="item.toolName">[{{ item.toolName }}]</span>\
                            <span class="log-action-desc" v-if="statusContent(item.content)">{{ statusContent(item.content) }}</span>\
                          </span>\
                        </summary>\
                        <div class="log-action-result" v-if="statusContent(item.content)">{{ statusContent(item.content) }}</div>\
                      </details>\
                      <div v-else class="msg-bubble">\
                        <div v-if="item.content" class="msg-text markdown-body" v-html="renderMarkdown(item.content)"></div>\
                        <div v-if="item.attachments && item.attachments.length" class="msg-attachments">\
                          <div v-for="att in item.attachments" :key="att.id" class="msg-attachment-chip">\
                            <span class="msg-attachment-icon">📎</span>\
                            <span class="msg-attachment-name">{{ att.name }}</span>\
                          </div>\
                        </div>\
                      </div>\
                    </template>\
                  </div>\
                </div>\
                <div v-else class="msg-row" :class="group.message.role">\
                  <div class="msg-bubble">\
                    <div v-if="group.message.content" class="msg-text">{{ group.message.content }}</div>\
                    <div v-if="group.message.attachments && group.message.attachments.length" class="msg-attachments">\
                      <div v-for="att in group.message.attachments" :key="att.id" class="msg-attachment-chip">\
                        <span class="msg-attachment-icon">📎</span>\
                        <span class="msg-attachment-name">{{ att.name }}</span>\
                      </div>\
                    </div>\
                  </div>\
                </div>\
              </template>\
              <div v-if="streaming" class="stream-live-block">\
                <div v-if="liveThought || liveReply || liveSteps.length" class="msg-row expert">\
                  <div class="msg-col">\
                    <div class="msg-header">\
                      <img class="msg-avatar" :src="expert.avatar" :alt="expert.name" />\
                      <span class="msg-sender">{{ expert.name }}</span>\
                    </div>\
                    <details v-if="liveThought" class="log-thought-block stream-thought-live" open>\
                      <summary>思考过程</summary>\
                      <div class="log-thought-content">{{ liveThought }}<span class="stream-cursor">▍</span></div>\
                    </details>\
                    <template v-for="step in liveSteps" :key="step.id">\
                      <details v-if="step.type === \'skill\'" class="log-skill-card">\
                        <summary class="log-skill-summary">\
                          <span class="log-skill-icon">🧩</span>\
                          <span class="log-skill-body">\
                            <span class="log-skill-title">使用技能</span>\
                            <span class="log-skill-name" v-if="step.skillName">{{ step.skillName }}</span>\
                            <span class="log-skill-desc" v-if="statusContent(step.content)">{{ statusContent(step.content) }}</span>\
                          </span>\
                        </summary>\
                        <div class="log-skill-result" v-if="statusContent(step.content)">{{ statusContent(step.content) }}</div>\
                      </details>\
                      <details v-else class="log-action-card">\
                        <summary class="log-action-summary">\
                          <span class="log-action-icon">⚡</span>\
                          <span class="log-action-body">\
                            <span class="log-action-title">调用工具</span>\
                            <span class="log-action-tool" v-if="step.toolName">[{{ step.toolName }}]</span>\
                            <span class="log-action-desc" v-if="statusContent(step.content)">{{ statusContent(step.content) }}</span>\
                          </span>\
                        </summary>\
                        <div class="log-action-result" v-if="statusContent(step.content)">{{ statusContent(step.content) }}</div>\
                      </details>\
                    </template>\
                    <div v-if="liveReply" class="msg-bubble">\
                      <div class="msg-text markdown-body">\
                        <span v-html="renderMarkdown(liveReply)"></span><span class="stream-cursor">▍</span>\
                      </div>\
                    </div>\
                  </div>\
                </div>\
                <div v-if="!liveThought && !liveReply && !liveSteps.length" class="stream-waiting">\
                  <span class="chat-send-spinner"></span>\
                  <span>{{ expert.name }} 正在处理…</span>\
                </div>\
              </div>\
            </template>\
          </div>\
          <div class="chat-input">\
            <div class="chat-composer">\
              <div v-if="pendingFiles.length" class="chat-pending-files">\
                <div v-for="f in pendingFiles" :key="f.id" class="chat-pending-file">\
                  <span class="chat-pending-file-icon">📄</span>\
                  <span class="chat-pending-file-name">{{ f.name }}</span>\
                  <span class="chat-pending-file-size">{{ formatFileSize(f.size) }}</span>\
                  <button type="button" class="chat-pending-file-remove" @click="removePendingFile(f.id)" title="移除">×</button>\
                </div>\
              </div>\
              <div class="chat-composer-main">\
                <el-input\
                  v-model="inputText"\
                  type="textarea"\
                  :rows="2"\
                  :autosize="{ minRows: 2, maxRows: 5 }"\
                  placeholder="向专家发起任务指令…"\
                  class="chat-composer-textarea"\
                  @keydown.ctrl.enter="send" />\
                <div class="chat-composer-actions">\
                  <input ref="fileInputRef" type="file" multiple class="chat-file-input-hidden" @change="handleFileSelect" />\
                  <button type="button" class="chat-upload-btn" :disabled="sending" @click="triggerFileUpload" title="上传文件">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>\
                  </button>\
                  <button type="button" class="chat-send-btn" :class="{ loading: sending }" :disabled="sending" @click="send" title="发送 (Ctrl+Enter)">\
                    <svg v-if="!sending" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>\
                    <span v-else class="chat-send-spinner"></span>\
                  </button>\
                </div>\
              </div>\
              <div class="chat-composer-hint">Ctrl + Enter 发送</div>\
              <div v-if="remoteError" class="task-remote-error">{{ remoteError }}</div>\
            </div>\
          </div>\
        </div>\
        <aside class="task-right-panel">\
          <div class="task-right-panel-inner">\
            <div class="task-right-panel-head">\
              <h4 class="task-right-panel-title">\
                <span class="task-panel-title-icon">\
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>\
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>\
                  </svg>\
                </span>\
                任务列表\
              </h4>\
            </div>\
            <div class="task-list-stats">\
              <span class="task-stat-item" title="任务总数">\
                <span class="task-stat-total-icon">\
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>\
                </span>\
                {{ taskStats.total }}\
              </span>\
              <span class="task-stat-item" title="运行中">\
                <span class="task-stat-running-icon"></span>\
                {{ taskStats.running }}\
              </span>\
              <span class="task-stat-item" title="已就绪">\
                <span class="task-status-dot-wrap task-stat-status-icon"><span class="task-status-dot"></span></span>\
                {{ taskStats.ready }}\
              </span>\
            </div>\
            <div class="task-list-scroll">\
              <div class="task-list">\
              <task-list-item\
                v-for="t in filteredTasks"\
                :key="t.id"\
                :task="t"\
                :active="currentTaskId === t.id"\
                :artifact-open="artifactPanelTaskId === t.id"\
                :is-running="isTaskRunning(t)"\
                :status-tip="taskStatusTip(t)"\
                :created-at-label="formatTaskCreatedAt(t.createdAt)"\
                :artifact-count="getTaskArtifactCount(t.id)"\
                @select="selectTask(t.id)"\
                @toggle-artifacts="toggleTaskArtifacts(t, $event)"\
                @menu="handleTaskMenu($event, t)" />\
              <div v-if="filteredTasks.length === 0" class="task-list-empty">\
                <div class="task-list-empty-icon">📋</div>\
                <p>暂无任务</p>\
                <span>点击上方「发起任务」开始</span>\
              </div>\
              </div>\
            </div>\
          </div>\
        </aside>\
        <aside v-show="artifactPanelTaskId" class="task-artifacts-panel">\
          <div class="task-artifacts-panel-inner">\
            <div class="task-artifacts-panel-head task-right-panel-head task-artifacts-panel-head--stacked">\
              <div class="task-artifacts-panel-head-inner">\
                <span class="task-panel-title-icon">\
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>\
                    <polyline points="14 2 14 8 20 8"/>\
                  </svg>\
                </span>\
                <div class="task-artifacts-panel-head-body">\
                  <div class="task-artifacts-panel-title-line">任务产物</div>\
                  <div class="task-artifacts-panel-subline">\
                    <span class="task-artifacts-panel-subtitle">{{ artifactPanelTaskTitle() }}</span>\
                    <span class="task-artifacts-panel-meta-item">共 {{ panelArtifacts.length }} 项</span>\
                  </div>\
                </div>\
                <button type="button" class="task-artifacts-panel-close" title="关闭" @click="closeArtifactPanel">\
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">\
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>\
                  </svg>\
                </button>\
              </div>\
            </div>\
            <div class="task-artifacts-panel-scroll">\
              <div v-for="a in panelArtifacts" :key="a.id" class="artifact-item" :class="artifactTypeClass(a.type)">\
                <div class="artifact-item-top">\
                  <span class="artifact-type-icon">\
                    <svg v-if="a.type === \'report\'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>\
                    </svg>\
                    <svg v-else-if="a.type === \'data\'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>\
                    </svg>\
                    <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>\
                    </svg>\
                  </span>\
                  <div class="artifact-item-head">\
                    <span class="artifact-title">{{ a.title }}</span>\
                    <el-tag size="small" type="info" effect="plain">{{ artifactTypeLabel[a.type] || a.type }}</el-tag>\
                  </div>\
                </div>\
                <p class="artifact-content">{{ a.content }}</p>\
                <div class="artifact-time">\
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">\
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>\
                  </svg>\
                  {{ formatTaskCreatedAt(a.createdAt) }}\
                </div>\
                <div class="artifact-actions">\
                  <button type="button" class="artifact-action-btn" title="预览" @click="openArtifactPreview(a)">\
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>\
                    预览\
                  </button>\
                  <button type="button" class="artifact-action-btn" title="下载" @click="downloadArtifact(a)">\
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\
                    下载\
                  </button>\
                  <button type="button" class="artifact-action-btn" title="跳转到任务" @click="goToArtifactTask(artifactPanelTaskId)">\
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>\
                    跳转\
                  </button>\
                </div>\
              </div>\
              <div v-if="panelArtifacts.length === 0" class="task-artifacts-empty">\
                <div class="task-artifacts-empty-icon">📄</div>\
                <p>暂无任务产物</p>\
                <span>完成任务对话后将自动生成</span>\
              </div>\
            </div>\
          </div>\
        </aside>\
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

  window.TaskListItem = TaskListItem;
  window.ExpertTasksPage = ExpertTasksPage;
})();
