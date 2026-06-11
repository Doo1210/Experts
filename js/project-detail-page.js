/**
 * 项目详情页
 */
(function () {
  var store = window.AppStore;
  var catalog = window;
  var createChatFileUpload = window.AppShared.createChatFileUpload;
  var expertMatchesSearch = window.AppShared.expertMatchesSearch;
  var inferProjectFileType = window.AppShared.inferProjectFileType;
  var readUploadedFileContent = window.AppShared.readUploadedFileContent;

  var ProjectDetailPage = {
    props: ['projectId', 'initialTab'],
    emits: ['nav'],
    setup: function (props) {
      var project = Vue.ref(null);
      var sidebarPanel = Vue.ref(null);
      var workspaceTab = Vue.ref('materials');
      if (props.initialTab === 'members') sidebarPanel.value = 'members';
      else if (props.initialTab === 'materials' || props.initialTab === 'outputs') {
        sidebarPanel.value = 'workspace';
        workspaceTab.value = props.initialTab === 'outputs' ? 'outputs' : 'materials';
      }
      var chatTarget = Vue.ref(null);
      var members = Vue.ref([]);
      var projectTasks = Vue.ref([]);
      var projectFiles = Vue.ref([]);
      var messages = Vue.ref([]);
      var outputs = Vue.ref([]);
      var inputText = Vue.ref('');
      var allExperts = Vue.ref(store.getExperts());
      var chatBox = Vue.ref(null);
      var chatFiles = createChatFileUpload();
      var showAddMemberDialog = Vue.ref(false);
      var materialFileInput = Vue.ref(null);
      var MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;
      var addMemberExpertIds = Vue.ref([]);
      var addMemberSearchQuery = Vue.ref('');
      var previewItem = Vue.ref(null);
      var previewVisible = Vue.ref(false);
      var selectedProjectTaskId = Vue.ref(null);

      function normalizeTaskStatus(status) {
        if (store.normalizeProjectTaskStatus) return store.normalizeProjectTaskStatus(status);
        if (status === 'done' || status === 'queued' || status === 'running') return status;
        if (status === 'thinking' || status === 'tool' || status === 'waiting' || status === 'error') return 'running';
        return 'queued';
      }

      var PROJECT_TASK_STATUS_TEXT = {
        queued: '排队中',
        running: '运行中',
        done: '已完成'
      };

      var PROJECT_TASK_STATUS_TAG = {
        queued: 'info',
        running: 'primary',
        done: 'success'
      };

      function taskStatusLabel(status) {
        var key = normalizeTaskStatus(status);
        return PROJECT_TASK_STATUS_TEXT[key] || '排队中';
      }

      function taskStatusType(status) {
        var key = normalizeTaskStatus(status);
        return PROJECT_TASK_STATUS_TAG[key] || 'info';
      }

      function taskDisplayTitle(task) {
        var title = task.title || '';
        var names = [];
        if (task.expert && task.expert.name) names.push(task.expert.name);
        allExperts.value.forEach(function (e) {
          if (names.indexOf(e.name) < 0) names.push(e.name);
        });
        names.forEach(function (name) {
          if (title.indexOf(name + '：') === 0) title = title.slice(name.length + 1);
          else if (title.indexOf(name + ':') === 0) title = title.slice(name.length + 1);
        });
        return title;
      }

      function isTaskDone(task) {
        return normalizeTaskStatus(task.status) === 'done';
      }

      function taskStatusClass(task) {
        return 'status-' + normalizeTaskStatus(task.status);
      }

      function load() {
        project.value = store.getProject(props.projectId);
        if (!project.value) return;
        members.value = store.getProjectMembers(props.projectId).map(function (m) {
          return Object.assign({}, m, { expert: store.getExpert(m.expertId) });
        });
        messages.value = store.getProjectMessages(props.projectId);
        outputs.value = store.getProjectOutputs(props.projectId);
        projectTasks.value = store.getProjectTasks(props.projectId);
        projectFiles.value = store.getProjectFiles(props.projectId);
        if (!chatTarget.value) chatTarget.value = 'group';
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      var todoStats = Vue.computed(function () {
        var total = projectTasks.value.length;
        var done = projectTasks.value.filter(function (t) { return normalizeTaskStatus(t.status) === 'done'; }).length;
        return {
          total: total,
          done: done,
          percent: total ? Math.round((done / total) * 100) : 0
        };
      });

      var filteredMessages = Vue.computed(function () {
        if (chatTarget.value === 'group') return messages.value;
        if (chatTarget.value) {
          var expertId = chatTarget.value;
          return messages.value.filter(function (m) {
            if (m.expertId === expertId || m.targetExpertId === expertId) return true;
            if (!m.taskId) return false;
            var task = projectTasks.value.find(function (t) { return t.id === m.taskId; });
            return task && task.expertId === expertId;
          });
        }
        return messages.value;
      });

      var logViewLabel = Vue.computed(function () {
        if (chatTarget.value === 'group') return '项目组';
        if (chatTarget.value) return expertName(chatTarget.value);
        return '';
      });

      var chatPlaceholder = Vue.computed(function () {
        if (chatTarget.value === 'group') return '向项目组全体下发指令…';
        if (chatTarget.value) return '向「' + expertName(chatTarget.value) + '」下发指令…';
        return '请选择沟通对象后发送指令';
      });

      function selectChatTarget(target, keepTaskSelection) {
        chatTarget.value = target;
        if (!keepTaskSelection) selectedProjectTaskId.value = null;
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      function selectProjectTask(task) {
        if (!task.expertId) {
          ElementPlus.ElMessage.info('该任务尚未分配专家');
          return;
        }
        selectedProjectTaskId.value = task.id;
        selectChatTarget(task.expertId, true);
      }

      function isChatTargetActive(target) {
        return chatTarget.value === target;
      }

      function expertName(expertId) {
        var e = store.getExpert(expertId);
        return e ? e.name : '专家';
      }

      function expertAvatar(expertId) {
        var e = store.getExpert(expertId);
        return e ? e.avatar : '';
      }

      function send() {
        var text = inputText.value.trim();
        var attachments = chatFiles.takePendingFiles();
        if (!text && !attachments.length) return;
        if (!chatTarget.value) return;
        var content = text || (attachments.length ? '发送了 ' + attachments.length + ' 个文件' : '');
        var msgBase = { type: 'chat', taskId: null, attachments: attachments.length ? attachments : null };
        if (chatTarget.value === 'group') {
          store.addProjectMessage(props.projectId, Object.assign({}, msgBase, {
            role: 'user', content: content, expertId: null, scope: 'group'
          }));
          store.addProjectMessage(props.projectId, {
            role: 'system', type: 'chat', taskId: null,
            content: '指令已发送至项目组，各位专家将协同跟进。'
          });
        } else if (chatTarget.value) {
          var targetExpert = chatTarget.value;
          store.addProjectMessage(props.projectId, Object.assign({}, msgBase, {
            role: 'user', content: content, expertId: null, targetExpertId: targetExpert
          }));
          store.addProjectMessage(props.projectId, {
            role: 'expert', type: 'chat',
            content: '收到，我来处理：「' + (text || '附件') + '」',
            taskId: null, expertId: targetExpert
          });
        }
        inputText.value = '';
        messages.value = store.getProjectMessages(props.projectId);
        Vue.nextTick(function () {
          if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight;
        });
      }

      var addableExperts = Vue.computed(function () {
        var memberIds = members.value.map(function (m) { return m.expertId; });
        return allExperts.value.filter(function (e) { return memberIds.indexOf(e.id) === -1; });
      });

      var filteredAddableExperts = Vue.computed(function () {
        var query = addMemberSearchQuery.value.trim();
        if (!query) return addableExperts.value;
        return addableExperts.value.filter(function (e) { return expertMatchesSearch(e, query); });
      });

      function resetAddMemberDialog() {
        addMemberExpertIds.value = [];
        addMemberSearchQuery.value = '';
      }

      function openAddMemberDialog() {
        allExperts.value = store.getExperts();
        resetAddMemberDialog();
        showAddMemberDialog.value = true;
      }

      function closeAddMemberDialog() {
        showAddMemberDialog.value = false;
        resetAddMemberDialog();
      }

      function isAddMemberSelected(expertId) {
        return addMemberExpertIds.value.indexOf(expertId) !== -1;
      }

      function toggleAddMember(expertId) {
        var ids = addMemberExpertIds.value.slice();
        var idx = ids.indexOf(expertId);
        if (idx === -1) ids.push(expertId);
        else ids.splice(idx, 1);
        addMemberExpertIds.value = ids;
      }

      function submitAddMembers() {
        if (!addMemberExpertIds.value.length) {
          ElementPlus.ElMessage.warning('请至少选择一位专家');
          return;
        }
        var count = addMemberExpertIds.value.length;
        addMemberExpertIds.value.forEach(function (eid) {
          store.addProjectMember(props.projectId, eid);
        });
        closeAddMemberDialog();
        load();
        ElementPlus.ElMessage.success('已添加 ' + count + ' 位专家');
      }

      function removeMember(memberId) {
        store.removeProjectMember(memberId);
        load();
      }

      function openMaterialUpload() {
        if (materialFileInput.value) materialFileInput.value.click();
      }

      function handleMaterialFileSelect(e) {
        var fileList = e.target.files;
        if (!fileList || !fileList.length) return;
        var queue = [];
        for (var i = 0; i < fileList.length; i++) {
          var file = fileList[i];
          if (file.size > MAX_UPLOAD_FILE_SIZE) {
            ElementPlus.ElMessage.warning('「' + file.name + '」超过 10MB，已跳过');
            continue;
          }
          queue.push(file);
        }
        e.target.value = '';
        if (!queue.length) return;
        var done = 0;
        queue.forEach(function (file) {
          readUploadedFileContent(file, function (content) {
            store.addProjectFile({
              projectId: props.projectId,
              name: file.name,
              type: inferProjectFileType(file.name),
              content: content
            });
            done += 1;
            if (done === queue.length) {
              load();
              ElementPlus.ElMessage.success('已上传 ' + queue.length + ' 个文件');
            }
          });
        });
      }

      function openPreview(item) {
        previewItem.value = item;
        previewVisible.value = true;
      }

      function fileTypeIcon(type) {
        if (type === 'spreadsheet') return '📊';
        if (type === 'data') return '📁';
        return '📄';
      }

      function getMemberTaskStats(expertId) {
        var tasks = projectTasks.value.filter(function (t) { return t.expertId === expertId; });
        return {
          done: tasks.filter(function (t) { return t.status === 'done'; }).length,
          total: tasks.length
        };
      }

      function toggleSidebarPanel(panel) {
        sidebarPanel.value = sidebarPanel.value === panel ? null : panel;
      }

      Vue.watch(function () { return props.projectId; }, function () {
        chatTarget.value = null;
        load();
      });
      Vue.onMounted(load);

      return {
        project: project, sidebarPanel: sidebarPanel, workspaceTab: workspaceTab,
        chatTarget: chatTarget, todoStats: todoStats,
        filteredMessages: filteredMessages, logViewLabel: logViewLabel, chatPlaceholder: chatPlaceholder,
        members: members, projectTasks: projectTasks, projectFiles: projectFiles,
        messages: messages, outputs: outputs, inputText: inputText, allExperts: allExperts,
        chatBox: chatBox,
        showAddMemberDialog: showAddMemberDialog,
        materialFileInput: materialFileInput,
        addMemberExpertIds: addMemberExpertIds,
        addMemberSearchQuery: addMemberSearchQuery,
        filteredAddableExperts: filteredAddableExperts,
        addableExperts: addableExperts,
        pendingFiles: chatFiles.pendingFiles, fileInputRef: chatFiles.fileInputRef,
        triggerFileUpload: chatFiles.triggerFileUpload, handleFileSelect: chatFiles.handleFileSelect,
        removePendingFile: chatFiles.removePendingFile, formatFileSize: chatFiles.formatFileSize,
        previewItem: previewItem, previewVisible: previewVisible,
        taskStatusLabel: taskStatusLabel, taskStatusType: taskStatusType, taskStatusClass: taskStatusClass,
        taskDisplayTitle: taskDisplayTitle, isTaskDone: isTaskDone,
        selectChatTarget: selectChatTarget,
        selectProjectTask: selectProjectTask,
        selectedProjectTaskId: selectedProjectTaskId,
        isChatTargetActive: isChatTargetActive, expertName: expertName, expertAvatar: expertAvatar,
        send: send, openAddMemberDialog: openAddMemberDialog, closeAddMemberDialog: closeAddMemberDialog,
        isAddMemberSelected: isAddMemberSelected, toggleAddMember: toggleAddMember,
        submitAddMembers: submitAddMembers, resetAddMemberDialog: resetAddMemberDialog,
        openMaterialUpload: openMaterialUpload,
        handleMaterialFileSelect: handleMaterialFileSelect,
        removeMember: removeMember,
        openPreview: openPreview, fileTypeIcon: fileTypeIcon, getMemberTaskStats: getMemberTaskStats,
        toggleSidebarPanel: toggleSidebarPanel
      };
    },
    template: '\
      <div class="project-detail-layout" v-if="project">\
        <div class="chat-header project-detail-header">\
          <div class="chat-header-left">\
            <back-link label="返回项目" inline @click="$emit(\'nav\', \'/projects\')" />\
            <div style="min-width:0">\
              <div class="chat-expert-name">{{ project.name }}</div>\
              <div style="font-size:12px;color:#909399;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ project.description }}</div>\
            </div>\
          </div>\
          <div class="project-header-actions">\
            <button\
              type="button"\
              class="project-header-action-btn"\
              :class="{ active: sidebarPanel === \'members\' }"\
              title="项目成员"\
              @click="toggleSidebarPanel(\'members\')">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>\
                <circle cx="9" cy="7" r="4"/>\
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>\
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>\
              </svg>\
              <span>项目成员</span>\
            </button>\
            <button\
              type="button"\
              class="project-header-action-btn"\
              :class="{ active: sidebarPanel === \'workspace\' }"\
              title="工作空间"\
              @click="toggleSidebarPanel(\'workspace\')">\
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">\
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>\
              </svg>\
              <span>工作空间</span>\
            </button>\
          </div>\
        </div>\
        <div class="project-detail-body">\
            <aside class="project-kanban-panel">\
              <div class="project-panel-head">项目看板</div>\
              <div class="task-todo-summary" v-if="projectTasks.length">\
                <div class="task-todo-summary-row">\
                  <span class="task-todo-summary-label">任务清单</span>\
                  <span class="task-todo-summary-count">{{ todoStats.done }}/{{ todoStats.total }} 已完成</span>\
                </div>\
                <div class="task-todo-progress-track">\
                  <div class="task-todo-progress-fill" :style="{ width: todoStats.percent + \'%\' }"></div>\
                </div>\
              </div>\
              <div class="project-kanban-scroll project-kanban-scroll-todo">\
                <div v-if="projectTasks.length === 0" class="project-task-flow-empty">暂无任务</div>\
                <ul v-else class="task-todo-list">\
                  <li\
                    v-for="t in projectTasks"\
                    :key="\'todo-\' + t.id"\
                    class="task-todo-item"\
                    :class="{ \'is-done\': isTaskDone(t), \'is-active\': selectedProjectTaskId === t.id, [taskStatusClass(t)]: true }"\
                    @click="selectProjectTask(t)">\
                    <span class="task-todo-check" :class="{ checked: isTaskDone(t) }">\
                      <svg v-if="isTaskDone(t)" viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2">\
                        <polyline points="2 6 5 9 10 3"/>\
                      </svg>\
                    </span>\
                    <div class="task-todo-body">\
                      <div class="task-todo-title-row">\
                        <span class="task-todo-title">{{ taskDisplayTitle(t) }}</span>\
                        <el-tag class="task-todo-badge" size="small" :type="taskStatusType(t.status)" effect="plain">{{ taskStatusLabel(t.status) }}</el-tag>\
                      </div>\
                      <div class="task-todo-expert-row" v-if="t.expert">\
                        <img class="task-todo-avatar" :src="t.expert.avatar" :alt="t.expert.name">\
                        <span>{{ t.expert.name }}</span>\
                      </div>\
                      <div class="task-todo-expert-row is-unassigned" v-else>待分配专家</div>\
                    </div>\
                  </li>\
                </ul>\
              </div>\
            </aside>\
            <section class="project-log-panel">\
              <div class="project-panel-head">\
                沟通与日志\
                <span v-if="logViewLabel" class="project-panel-sub">· {{ logViewLabel }}</span>\
              </div>\
              <div class="project-log-area">\
                <div class="chat-messages project-log-scroll" ref="chatBox">\
                  <div v-if="filteredMessages.length === 0" class="project-log-empty">暂无日志，请选择沟通对象</div>\
                  <template v-for="msg in filteredMessages" :key="msg.id">\
                    <details v-if="msg.type === \'thought\'" class="log-thought-block">\
                      <summary>思考过程 · {{ expertName(msg.expertId) }}</summary>\
                      <div class="log-thought-content">{{ msg.content }}</div>\
                    </details>\
                    <div v-else-if="msg.type === \'action\'" class="log-action-card">\
                      <div class="log-action-icon">⚡</div>\
                      <div class="log-action-body">\
                        <div class="log-action-title">{{ expertName(msg.expertId) }} 正在调用工具</div>\
                        <div class="log-action-tool" v-if="msg.toolName">[{{ msg.toolName }}]</div>\
                        <div class="log-action-desc">{{ msg.content }}</div>\
                      </div>\
                    </div>\
                    <div v-else class="msg-row" :class="msg.role">\
                      <template v-if="msg.role === \'expert\'">\
                        <div class="msg-col">\
                          <div class="msg-header">\
                            <img class="msg-avatar" :src="expertAvatar(msg.expertId)" :alt="expertName(msg.expertId)" />\
                            <span class="msg-sender">{{ expertName(msg.expertId) }}</span>\
                          </div>\
                          <div class="msg-bubble">\
                            <div v-if="msg.content" class="msg-text">{{ msg.content }}</div>\
                            <div v-if="msg.attachments && msg.attachments.length" class="msg-attachments">\
                              <div v-for="att in msg.attachments" :key="att.id" class="msg-attachment-chip">\
                                <span class="msg-attachment-icon">📎</span>\
                                <span class="msg-attachment-name">{{ att.name }}</span>\
                              </div>\
                            </div>\
                          </div>\
                        </div>\
                      </template>\
                      <div v-else class="msg-bubble">\
                        <div v-if="msg.content" class="msg-text">{{ msg.content }}</div>\
                        <div v-if="msg.attachments && msg.attachments.length" class="msg-attachments">\
                          <div v-for="att in msg.attachments" :key="att.id" class="msg-attachment-chip">\
                            <span class="msg-attachment-icon">📎</span>\
                            <span class="msg-attachment-name">{{ att.name }}</span>\
                          </div>\
                        </div>\
                      </div>\
                    </div>\
                  </template>\
                </div>\
                <div class="chat-input project-log-input">\
                  <div class="chat-target-bar">\
                    <button\
                      type="button"\
                      class="chat-target-btn chat-target-group"\
                      :class="{ active: isChatTargetActive(\'group\') }"\
                      @click="selectChatTarget(\'group\')">\
                      <span class="chat-target-group-icon">👥</span>\
                      <span>项目组</span>\
                    </button>\
                    <button\
                      v-for="m in members"\
                      :key="m.expertId"\
                      type="button"\
                      class="chat-target-btn"\
                      :class="{ active: isChatTargetActive(m.expertId) }"\
                      :title="m.expert.name"\
                      @click="selectChatTarget(m.expertId)">\
                      <img :src="m.expert.avatar" :alt="m.expert.name" class="chat-target-avatar">\
                      <span>{{ m.expert.name }}</span>\
                    </button>\
                  </div>\
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
                        :placeholder="chatPlaceholder"\
                        class="chat-composer-textarea"\
                        @keydown.ctrl.enter="send" />\
                      <div class="chat-composer-actions">\
                        <input ref="fileInputRef" type="file" multiple class="chat-file-input-hidden" @change="handleFileSelect" />\
                        <button type="button" class="chat-upload-btn" :disabled="!chatTarget" @click="triggerFileUpload" title="上传文件">\
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>\
                        </button>\
                        <button type="button" class="chat-send-btn" :disabled="!chatTarget" @click="send" title="发送 (Ctrl+Enter)">\
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>\
                        </button>\
                      </div>\
                    </div>\
                    <div class="chat-composer-hint">Ctrl + Enter 发送</div>\
                  </div>\
                </div>\
              </div>\
            </section>\
            <aside class="project-workspace-panel project-sidebar-panel" v-show="sidebarPanel" :class="sidebarPanel === \'members\' ? \'project-sidebar-members\' : \'project-sidebar-workspace\'">\
              <div class="project-sidebar-head project-panel-head">\
                <div v-if="sidebarPanel === \'members\'" class="project-sidebar-head-inner">\
                  <span class="project-sidebar-head-icon project-sidebar-head-icon-members">\
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>\
                  </span>\
                  <span class="project-sidebar-head-title">项目成员</span>\
                  <span class="project-panel-sub">· {{ members.length }} 位专家</span>\
                </div>\
                <div v-else class="project-sidebar-head-inner">\
                  <span class="project-sidebar-head-icon project-sidebar-head-icon-workspace">\
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>\
                  </span>\
                  <span class="project-sidebar-head-title">工作空间</span>\
                  <span class="project-panel-sub">· {{ projectFiles.length }} 份资料 · {{ outputs.length }} 个产物</span>\
                </div>\
              </div>\
              <div v-if="sidebarPanel === \'members\'" class="project-workspace-area project-members-area">\
                <div class="project-workspace-scroll">\
                  <button type="button" class="sidebar-add-member-btn" @click="openAddMemberDialog">\
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>\
                    添加成员\
                  </button>\
                  <div v-for="row in members" :key="row.id" class="sidebar-member-card">\
                    <div class="sidebar-member-avatar-wrap">\
                      <img :src="row.expert.avatar" :alt="row.expert.name">\
                    </div>\
                    <div class="sidebar-member-info">\
                      <div class="sidebar-member-name-row">\
                        <span class="sidebar-member-name">{{ row.expert.name }}</span>\
                        <span class="sidebar-member-task-stat">{{ getMemberTaskStats(row.expertId).done }}/{{ getMemberTaskStats(row.expertId).total }}</span>\
                      </div>\
                      <p class="sidebar-member-desc">{{ row.expert.description || \'暂无介绍\' }}</p>\
                    </div>\
                    <button type="button" class="sidebar-member-remove" title="移除成员" @click="removeMember(row.id)">\
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>\
                    </button>\
                  </div>\
                  <div v-if="members.length === 0" class="sidebar-empty-state">\
                    <div class="sidebar-empty-icon">👥</div>\
                    <p>暂无项目成员</p>\
                    <span>点击上方按钮邀请专家加入</span>\
                  </div>\
                </div>\
              </div>\
              <div v-else-if="sidebarPanel === \'workspace\'" class="project-workspace-area project-workspace-main">\
                <el-tabs v-model="workspaceTab" class="project-workspace-tabs">\
                  <el-tab-pane name="materials">\
                    <template #label>\
                      <span class="project-workspace-tab-label">\
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>\
                        项目资料\
                        <em v-if="projectFiles.length" class="project-workspace-tab-count">{{ projectFiles.length }}</em>\
                      </span>\
                    </template>\
                    <div class="project-workspace-scroll">\
                      <input ref="materialFileInput" type="file" multiple class="material-file-input-hidden" @change="handleMaterialFileSelect">\
                      <button type="button" class="sidebar-add-material-btn" @click="openMaterialUpload">\
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>\
                        上传资料\
                      </button>\
                      <div\
                        v-for="f in projectFiles"\
                        :key="f.id"\
                        class="workspace-file-item"\
                        @click="openPreview(f)">\
                        <div class="workspace-file-icon-wrap" :class="\'type-\' + (f.type || \'document\')">\
                          <span class="workspace-file-icon">{{ fileTypeIcon(f.type) }}</span>\
                        </div>\
                        <div class="workspace-file-info">\
                          <div class="workspace-file-name">{{ f.name }}</div>\
                          <div class="workspace-file-meta">{{ f.updatedAt }}</div>\
                        </div>\
                        <span v-if="f.status === \'updating\'" class="workspace-file-badge">更新中</span>\
                        <svg class="workspace-file-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>\
                      </div>\
                      <div v-if="projectFiles.length === 0" class="sidebar-empty-state sidebar-empty-state-compact">\
                        <div class="sidebar-empty-icon">📄</div>\
                        <p>暂无项目资料</p>\
                        <span>点击上方按钮上传本地文件</span>\
                      </div>\
                    </div>\
                  </el-tab-pane>\
                  <el-tab-pane name="outputs">\
                    <template #label>\
                      <span class="project-workspace-tab-label">\
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>\
                        项目产物\
                        <em v-if="outputs.length" class="project-workspace-tab-count">{{ outputs.length }}</em>\
                      </span>\
                    </template>\
                    <div class="project-workspace-scroll">\
                      <div class="sidebar-output-list-head" v-if="outputs.length">已产出 {{ outputs.length }} 项</div>\
                      <div\
                        v-for="o in outputs"\
                        :key="o.id"\
                        class="workspace-file-item artifact-output-item"\
                        @click="openPreview(o)">\
                        <div class="workspace-file-icon-wrap type-output">\
                          <span class="workspace-file-icon">📦</span>\
                        </div>\
                        <div class="workspace-file-info">\
                          <div class="workspace-file-name">{{ o.title }}</div>\
                          <div class="workspace-file-meta">{{ o.createdAt }}</div>\
                        </div>\
                        <svg class="workspace-file-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>\
                      </div>\
                      <div v-if="outputs.length === 0" class="sidebar-empty-state sidebar-empty-state-compact">\
                        <div class="sidebar-empty-icon">📦</div>\
                        <p>暂无项目产物</p>\
                        <span>产物将由专家任务产出后展示</span>\
                      </div>\
                    </div>\
                  </el-tab-pane>\
                </el-tabs>\
              </div>\
            </aside>\
        </div>\
        <el-dialog v-model="showAddMemberDialog" width="640px" class="form-dialog form-dialog-project form-dialog-add-member" :close-on-click-modal="false" append-to-body @closed="resetAddMemberDialog">\
          <template #header>\
            <div class="dialog-header-custom dialog-header-project">\
              <div class="dialog-header-icon dialog-header-icon-project">👥</div>\
              <div class="dialog-header-text">\
                <div class="dialog-header-title">添加项目成员</div>\
                <div class="dialog-header-sub">搜索并选择专家加入项目</div>\
              </div>\
            </div>\
          </template>\
          <div class="form-dialog-body">\
            <div class="wizard-step-content wizard-step-members">\
              <div class="member-picker-head">\
                <div class="member-picker-search">\
                  <svg class="member-picker-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>\
                  <el-input v-model="addMemberSearchQuery" placeholder="搜索专家名称、介绍或擅长领域" clearable />\
                </div>\
                <span class="member-picker-count">{{ addMemberExpertIds.length }} 人已选</span>\
              </div>\
              <div v-if="filteredAddableExperts.length" class="member-picker-grid member-picker-grid-dialog">\
                <button\
                  v-for="e in filteredAddableExperts"\
                  :key="e.id"\
                  type="button"\
                  class="member-picker-card"\
                  :class="{ \'member-picker-card-selected\': isAddMemberSelected(e.id) }"\
                  @click="toggleAddMember(e.id)">\
                  <img :src="e.avatar" :alt="e.name" class="member-picker-avatar">\
                  <div class="member-picker-info">\
                    <span class="member-picker-name">{{ e.name }}</span>\
                    <span class="member-picker-desc-text">{{ e.description || \'暂无介绍\' }}</span>\
                    <div v-if="e.expertise && e.expertise.length" class="member-picker-tags">\
                      <span v-for="(tag, idx) in e.expertise.slice(0, 2)" :key="tag" class="member-picker-tag">{{ tag }}</span>\
                    </div>\
                  </div>\
                  <span class="member-picker-check" :class="{ \'member-picker-check-on\': isAddMemberSelected(e.id) }">\
                    <svg v-if="isAddMemberSelected(e.id)" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>\
                  </span>\
                </button>\
              </div>\
              <div v-else class="member-picker-empty">\
                <div class="member-picker-empty-icon">{{ addableExperts.length ? \'🔍\' : \'👤\' }}</div>\
                <p>{{ addableExperts.length ? \'未找到匹配的专家\' : \'所有专家已加入项目\' }}</p>\
                <span>{{ addableExperts.length ? \'试试其他关键词\' : \'暂无可添加的专家\' }}</span>\
              </div>\
            </div>\
          </div>\
          <template #footer>\
            <div class="dialog-footer-custom dialog-footer-wizard">\
              <div class="dialog-footer-actions">\
                <el-button class="wizard-btn wizard-btn-cancel" @click="closeAddMemberDialog">取消</el-button>\
                <el-button class="wizard-btn wizard-btn-submit wizard-btn-submit-project" @click="submitAddMembers">确认添加</el-button>\
              </div>\
            </div>\
          </template>\
        </el-dialog>\
        <el-dialog v-model="previewVisible" :title="previewItem && (previewItem.name || previewItem.title)" width="720px" class="project-preview-dialog">\
          <div class="markdown-preview" style="max-height:60vh;overflow-y:auto">{{ previewItem && (previewItem.content || previewItem.title) }}</div>\
        </el-dialog>\
      </div>\
      <div v-else class="main-scroll"><el-empty description="项目不存在"><back-link label="返回项目" @click="$emit(\'nav\', \'/projects\')" /></el-empty></div>'
  };

  window.ProjectDetailPage = ProjectDetailPage;
})();
