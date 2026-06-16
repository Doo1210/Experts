/**
 * 专家任务页
 */
(function () {
  var store = window.AppStore;
  var catalog = window;
  var createChatFileUpload = window.AppShared.createChatFileUpload;

  var TaskListItem = {
    props: ['task', 'active', 'artifactOpen', 'archived', 'isRunning', 'statusTip', 'createdAtLabel', 'artifactCount'],
    emits: ['select', 'toggle-artifacts', 'menu'],
    setup: function (props) {
      var isArchived = Vue.computed(function () {
        return !!props.archived || !!(props.task && props.task.archived);
      });
      return { isArchived: isArchived };
    },
    template: '\
      <div class="task-item" :class="{ active: active, \'task-item-archived\': isArchived }" @click="$emit(\'select\')">\
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
                    <el-dropdown-item v-if="isArchived" command="unarchive">取消归档</el-dropdown-item>\
                    <el-dropdown-item v-if="!isArchived && !isRunning" command="archive">归档</el-dropdown-item>\
                    <el-dropdown-item v-if="!isArchived" command="edit">编辑</el-dropdown-item>\
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
      var archivedTasks = Vue.ref([]);
      var showArchived = Vue.ref(false);
      var remoteError = Vue.ref('');

      // ---- 任务列表增强 ----
      var taskSearchQuery = Vue.ref('');
      var taskStatusFilter = Vue.ref('all');

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
        var all = tasks.value.concat(archivedTasks.value);
        var t = all.find(function (x) { return x.id === artifactPanelTaskId.value; });
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
        archivedTasks.value = all.filter(function (t) { return t.archived; });
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
            tasks.value = remote;
            archivedTasks.value = [];
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

      // ---- 任务列表增强 ----
      var filteredTasks = Vue.computed(function () {
        var list = tasks.value;
        if (taskSearchQuery.value.trim()) {
          var q = taskSearchQuery.value.trim().toLowerCase();
          list = list.filter(function (t) { return (t.title || '').toLowerCase().indexOf(q) >= 0; });
        }
        if (taskStatusFilter.value !== 'all') {
          list = list.filter(function (t) { return t.status === taskStatusFilter.value; });
        }
        return list;
      });

      var taskStats = Vue.computed(function () {
        var all = tasks.value.concat(archivedTasks.value);
        var counts = { total: all.length, active: tasks.value.length, pending: 0, running: 0, completed: 0, archived: archivedTasks.value.length };
        all.forEach(function (t) {
          if (t.archived) return;
          if (t.status === 'pending') counts.pending++;
          else if (t.status === 'running') counts.running++;
          else if (t.status === 'completed') counts.completed++;
        });
        return counts;
      });

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
        else if (command === 'archive') archiveTaskItem(task, ev);
        else if (command === 'unarchive') unarchiveTaskItem(task, ev);
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

      function loadMessages() {
        if (!currentTaskId.value) { messages.value = []; return; }
        messages.value = store.getMessages(currentTaskId.value);
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
            messages.value = remote;
          });
        }
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      function selectTask(id) {
        currentTaskId.value = id;
        ctx.emit('nav', '/experts/' + props.expertId + '/tasks/' + id);
        loadMessages();
      }

      function newTask() {
        var t = store.createTask({ expertId: props.expertId, title: '新任务', type: 'dialogue' });
        refreshTasks();
        selectTask(t.id);
      }

      function send() {
        var text = inputText.value.trim();
        var attachments = chatFiles.takePendingFiles();
        if ((!text && !attachments.length) || !currentTaskId.value) return;
        sending.value = true;
        store.updateTask(currentTaskId.value, { status: 'running' });
        store.addMessage(currentTaskId.value, {
          role: 'user',
          content: text || (attachments.length ? '发送了 ' + attachments.length + ' 个文件' : ''),
          attachments: attachments.length ? attachments : null
        });
        inputText.value = '';
        loadMessages();
        refreshTasks();
        if (store.sendTaskMessageRemote) {
          store.sendTaskMessageRemote(props.expertId, currentTaskId.value, text || '').then(function (resp) {
            if (!resp) {
              if (!store.isDevMock || !store.isDevMock()) {
                var e = window.SidecarApi && window.SidecarApi.getLastError && window.SidecarApi.getLastError();
                remoteError.value = (e && e.message) || '消息发送失败';
                sending.value = false;
              }
              return;
            }
            remoteError.value = '';
            loadMessages();
            if (artifactPanelTaskId.value === currentTaskId.value) loadPanelArtifacts(currentTaskId.value);
            refreshTasks();
            sending.value = false;
          });
          if (!store.isDevMock || !store.isDevMock()) return;
        }
        setTimeout(function () {
          store.mockExpertWorkflowSteps(expert.value, currentTaskId.value, text);
          loadMessages();
          setTimeout(function () {
            var reply = store.mockExpertReply(expert.value, text);
            store.addMessage(currentTaskId.value, {
              role: 'expert', type: 'chat', expertId: expert.value.id, content: reply
            });
            store.mockTaskArtifact(expert.value, currentTaskId.value, text);
            store.updateTask(currentTaskId.value, { status: 'pending' });
            loadMessages();
            refreshTasks();
            if (artifactPanelTaskId.value === currentTaskId.value) loadPanelArtifacts(currentTaskId.value);
            sending.value = false;
          }, 700);
        }, 500);
      }

      function editTask(task, ev) {
        ev.stopPropagation();
        ElementPlus.ElMessageBox.prompt('请输入任务名称', '编辑任务', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: task.title,
          inputPattern: /\S+/,
          inputErrorMessage: '名称不能为空'
        }).then(function (result) {
          store.updateTask(task.id, { title: result.value.trim(), titleSet: true });
          refreshTasks();
          ElementPlus.ElMessage.success('任务名称已更新');
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
          if (artifactPanelTaskId.value === task.id) closeArtifactPanel();
          store.deleteTask(task.id);
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
        }).catch(function () {});
      }

      function archiveTaskItem(task, ev) {
        ev.stopPropagation();
        store.archiveTask(task.id, true);
        refreshTasks();
        if (artifactPanelTaskId.value === task.id) closeArtifactPanel();
        if (currentTaskId.value === task.id) {
          if (tasks.value.length) selectTask(tasks.value[0].id);
          else {
            currentTaskId.value = null;
            ctx.emit('nav', '/experts/' + props.expertId + '/tasks');
            messages.value = [];
          }
        }
        ElementPlus.ElMessage.success('任务已归档');
      }

      function unarchiveTaskItem(task, ev) {
        ev.stopPropagation();
        store.archiveTask(task.id, false);
        refreshTasks();
        ElementPlus.ElMessage.success('已取消归档');
      }


      Vue.watch(function () { return props.taskId; }, function (v) {
        currentTaskId.value = v;
        loadMessages();
      });
      Vue.onMounted(loadExpert);

      return {
        expert: expert, tasks: tasks, archivedTasks: archivedTasks, showArchived: showArchived,
        remoteError: remoteError,
        currentTaskId: currentTaskId, messages: messages,
        inputText: inputText, sending: sending, chatBox: chatBox,
        panelArtifacts: panelArtifacts, artifactPanelTaskId: artifactPanelTaskId,
        pendingFiles: chatFiles.pendingFiles, fileInputRef: chatFiles.fileInputRef,
        triggerFileUpload: chatFiles.triggerFileUpload, handleFileSelect: chatFiles.handleFileSelect,
        removePendingFile: chatFiles.removePendingFile, formatFileSize: chatFiles.formatFileSize,
        statusLabel: catalog.TASK_STATUS_LABEL, artifactTypeLabel: catalog.ARTIFACT_TYPE_LABEL,
        formatTaskCreatedAt: formatTaskCreatedAt, isTaskRunning: isTaskRunning, taskStatusTip: taskStatusTip,
        getTaskArtifactCount: getTaskArtifactCount, artifactTypeClass: artifactTypeClass,
        artifactPanelTaskTitle: artifactPanelTaskTitle,
        selectTask: selectTask, newTask: newTask, send: send,
        editTask: editTask, deleteTaskItem: deleteTaskItem, archiveTaskItem: archiveTaskItem, unarchiveTaskItem: unarchiveTaskItem,
        toggleTaskArtifacts: toggleTaskArtifacts, closeArtifactPanel: closeArtifactPanel, handleTaskMenu: handleTaskMenu,
        // 任务列表增强
        taskSearchQuery: taskSearchQuery, taskStatusFilter: taskStatusFilter,
        filteredTasks: filteredTasks, taskStats: taskStats,
        // 产物面板增强
        artifactPreviewVisible: artifactPreviewVisible, artifactPreviewItem: artifactPreviewItem,
        openArtifactPreview: openArtifactPreview, downloadArtifact: downloadArtifact, goToArtifactTask: goToArtifactTask
      };
    },
    template: '\
      <div class="task-layout" v-if="expert">\
        <div class="task-top-bar">\
          <div class="task-top-bar-left">\
            <back-link label="返回专家" inline @click="$emit(\'nav\', \'/experts\')" />\
            <img class="task-top-bar-avatar" :src="expert.avatar" :alt="expert.name">\
            <div class="task-top-bar-info">\
              <div class="task-top-bar-name">{{ expert.name }}</div>\
              <div v-if="expert.description" class="task-top-bar-desc">{{ expert.description }}</div>\
            </div>\
          </div>\
          <div class="project-header-actions">\
            <button\
              type="button"\
              class="project-header-action-btn"\
              title="新建任务"\
              @click="newTask">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">\
                <path d="M12 5v14M5 12h14"/>\
              </svg>\
              <span>新建任务</span>\
            </button>\
          </div>\
        </div>\
        <div class="task-body">\
        <div class="chat-main">\
          <div class="chat-messages" ref="chatBox">\
            <div v-if="!currentTaskId" style="text-align:center;color:#999;padding:40px">请选择任务</div>\
            <template v-else>\
              <template v-for="m in messages" :key="m.id">\
                <details v-if="m.type === \'thought\'" class="log-thought-block">\
                  <summary>思考过程 · {{ expert.name }}</summary>\
                  <div class="log-thought-content">{{ m.content }}</div>\
                </details>\
                <div v-else-if="m.type === \'skill\'" class="log-skill-card">\
                  <div class="log-skill-icon">🧩</div>\
                  <div class="log-action-body">\
                    <div class="log-skill-title">{{ expert.name }} 正在使用技能</div>\
                    <div class="log-skill-name" v-if="m.skillName">[{{ m.skillName }}]</div>\
                    <div class="log-action-desc">{{ m.content }}</div>\
                  </div>\
                </div>\
                <div v-else-if="m.type === \'action\'" class="log-action-card">\
                  <div class="log-action-icon">⚡</div>\
                  <div class="log-action-body">\
                    <div class="log-action-title">{{ expert.name }} 正在调用工具</div>\
                    <div class="log-action-tool" v-if="m.toolName">[{{ m.toolName }}]</div>\
                    <div class="log-action-desc">{{ m.content }}</div>\
                  </div>\
                </div>\
                <div v-else class="msg-row" :class="m.role">\
                  <template v-if="m.role === \'expert\'">\
                    <div class="msg-col">\
                      <div class="msg-header">\
                        <img class="msg-avatar" :src="expert.avatar" :alt="expert.name" />\
                        <span class="msg-sender">{{ expert.name }}</span>\
                      </div>\
                      <div class="msg-bubble">\
                        <div v-if="m.content" class="msg-text">{{ m.content }}</div>\
                        <div v-if="m.attachments && m.attachments.length" class="msg-attachments">\
                          <div v-for="att in m.attachments" :key="att.id" class="msg-attachment-chip">\
                            <span class="msg-attachment-icon">📎</span>\
                            <span class="msg-attachment-name">{{ att.name }}</span>\
                          </div>\
                        </div>\
                      </div>\
                    </div>\
                  </template>\
                  <div v-else class="msg-bubble">\
                    <div v-if="m.content" class="msg-text">{{ m.content }}</div>\
                    <div v-if="m.attachments && m.attachments.length" class="msg-attachments">\
                      <div v-for="att in m.attachments" :key="att.id" class="msg-attachment-chip">\
                        <span class="msg-attachment-icon">📎</span>\
                        <span class="msg-attachment-name">{{ att.name }}</span>\
                      </div>\
                    </div>\
                  </div>\
                </div>\
              </template>\
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
                  <button type="button" class="chat-upload-btn" :disabled="!currentTaskId" @click="triggerFileUpload" title="上传文件">\
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>\
                  </button>\
                  <button type="button" class="chat-send-btn" :class="{ loading: sending }" :disabled="!currentTaskId || sending" @click="send" title="发送 (Ctrl+Enter)">\
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
            <div class="task-list-toolbar">\
              <el-input v-model="taskSearchQuery" placeholder="搜索任务..." size="small" clearable class="task-list-search">\
                <template #prefix>\
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>\
                </template>\
              </el-input>\
              <el-select v-model="taskStatusFilter" size="small" class="task-list-filter">\
                <el-option label="全部状态" value="all" />\
                <el-option label="待开始" value="pending" />\
                <el-option label="执行中" value="running" />\
                <el-option label="已完成" value="completed" />\
              </el-select>\
            </div>\
            <div class="task-list-stats">\
              <span class="task-stat-item" title="全部">📋 {{ taskStats.total }}</span>\
              <span class="task-stat-item" title="进行中">▶ {{ taskStats.running }}</span>\
              <span class="task-stat-item" title="已完成">✅ {{ taskStats.completed }}</span>\
              <span class="task-stat-item" title="已归档">📦 {{ taskStats.archived }}</span>\
            </div>\
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
              <div v-if="filteredTasks.length === 0 && archivedTasks.length === 0" class="task-list-empty">\
                <div class="task-list-empty-icon">📋</div>\
                <p>暂无任务</p>\
                <span>点击上方「新建任务」开始</span>\
              </div>\
              <div v-if="archivedTasks.length" class="task-archived-section">\
                <button type="button" class="task-archived-toggle" @click="showArchived = !showArchived">\
                  <span class="task-archived-toggle-label">\
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">\
                      <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/>\
                    </svg>\
                    已归档\
                  </span>\
                  <span class="task-archived-count">{{ archivedTasks.length }}</span>\
                  <span class="task-archived-chevron">{{ showArchived ? \'▾\' : \'▸\' }}</span>\
                </button>\
                <div v-if="showArchived" class="task-archived-list">\
                  <task-list-item\
                    v-for="t in archivedTasks"\
                    :key="t.id"\
                    :task="t"\
                    :archived="true"\
                    :active="currentTaskId === t.id"\
                    :artifact-open="artifactPanelTaskId === t.id"\
                    :is-running="isTaskRunning(t)"\
                    :status-tip="taskStatusTip(t)"\
                    :created-at-label="formatTaskCreatedAt(t.createdAt)"\
                    :artifact-count="getTaskArtifactCount(t.id)"\
                    @select="selectTask(t.id)"\
                    @toggle-artifacts="toggleTaskArtifacts(t, $event)"\
                    @menu="handleTaskMenu($event, t)" />\
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
      <div v-else class="main-scroll"><el-empty description="专家不存在"><back-link label="返回专家" @click="$emit(\'nav\', \'/experts\')" /></el-empty></div>'
  };

  window.TaskListItem = TaskListItem;
  window.ExpertTasksPage = ExpertTasksPage;
})();
