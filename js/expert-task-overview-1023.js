/* 1023 mock-only expert tasks: dialogue, IM sessions, event-center actions. */
(function () {
  var store = window.AppStore;
  window.ExpertTaskOverview1023 = {
    props: ['expertId'],
    emits: ['nav', 'workspace'],
    setup: function (props, ctx) {
      var segment = Vue.ref('dialogue');
      var archivedDialog = Vue.ref(false);
      var archivedQuery = Vue.ref('');
      var statusFilter = Vue.ref('all');
      var query = Vue.ref('');
      var tasks = Vue.ref([]), imSessions = Vue.ref([]), actions = Vue.ref([]), runs = Vue.ref([]);
      var imDetail = Vue.ref(null), actionDetail = Vue.ref(null), runDetail = Vue.ref(null);
      var actionDialog = Vue.ref(false);
      var actionForm = Vue.reactive({ id: '', title: '', eventId: '', branchName: '默认分支', prompt: '', delivery: '仅产品内', enabled: true });
      var sources = store.getMockEventSources();
      function refresh() {
        tasks.value = store.getTasksByExpert(String(props.expertId), null, true).filter(function (item) { return !item.type || item.type === 'dialogue'; });
        imSessions.value = store.getImSessions(props.expertId);
        actions.value = store.getAutonomousActions(props.expertId);
        runs.value = store.getAutonomousRuns(props.expertId);
        if (actionDetail.value) actionDetail.value = actions.value.find(function (item) { return item.id === actionDetail.value.id; }) || null;
      }
      Vue.watch(function () { return props.expertId; }, function () { segment.value = 'dialogue'; refresh(); }, { immediate: true });
      Vue.onMounted(function () { window.addEventListener('app-store-updated', refresh); });
      Vue.onUnmounted(function () { window.removeEventListener('app-store-updated', refresh); });
      var archivedCount = Vue.computed(function () { return tasks.value.filter(function (item) { return item.archived; }).length; });
      var dialogueStats = Vue.computed(function () {
        var visible = tasks.value.filter(function (item) { return !item.archived; });
        return { total: visible.length, running: visible.filter(function (item) { return item.status === 'running'; }).length };
      });
      var filteredDialogue = Vue.computed(function () {
        return tasks.value.filter(function (item) {
          if (item.archived) return false;
          if (statusFilter.value === 'running' && item.status !== 'running') return false;
          if (statusFilter.value === 'ready' && item.status === 'running') return false;
          return !query.value || (item.title + ' ' + item.id).toLowerCase().indexOf(query.value.trim().toLowerCase()) >= 0;
        });
      });
      var filteredArchivedDialogue = Vue.computed(function () {
        var q = archivedQuery.value.trim().toLowerCase();
        return tasks.value.filter(function (item) {
          if (!item.archived) return false;
          return !q || (item.title + ' ' + item.id).toLowerCase().indexOf(q) >= 0;
        });
      });
      var filteredIm = Vue.computed(function () {
        return imSessions.value.filter(function (item) { return !query.value || (item.chatName + ' ' + item.platform).toLowerCase().indexOf(query.value.trim().toLowerCase()) >= 0; });
      });
      var filteredActions = Vue.computed(function () {
        return actions.value.filter(function (item) { return !query.value || (item.title + ' ' + item.eventName).toLowerCase().indexOf(query.value.trim().toLowerCase()) >= 0; });
      });
      var actionRuns = Vue.computed(function () {
        if (!actionDetail.value) return [];
        return runs.value.filter(function (item) { return item.actionId === actionDetail.value.id; });
      });
      function switchSegment(value) { segment.value = value; query.value = ''; statusFilter.value = 'all'; }
      function openArchivedDialog() { archivedQuery.value = ''; archivedDialog.value = true; }
      function newDialogue() { var task = store.createTask({ expertId: String(props.expertId), type: 'dialogue', title: '新任务' }); ctx.emit('nav', '/experts/' + props.expertId + '/tasks/' + task.id); }
      function openDialogue(item) { ctx.emit('nav', '/experts/' + props.expertId + '/tasks/' + item.id); }
      function openWorkspace(cwd) {
        ctx.emit('workspace', { cwd: String(cwd || '.').trim() || '.' });
      }
      function actionCwd(item) {
        return item && item.cwd ? item.cwd : (item ? '自主任务/' + item.id : '');
      }
      function editDialogue(item) {
        ElementPlus.ElMessageBox.prompt('请输入任务名称', '编辑名称', { inputValue: item.title, inputPattern: /\S+/, inputErrorMessage: '名称不能为空' })
          .then(function (res) { store.updateTask(item.id, { title: res.value.trim() }); refresh(); }).catch(function () {});
      }
      function archiveDialogue(item, value) { store.archiveTask(item.id, value); refresh(); ElementPlus.ElMessage.success(value ? '已归档，可在「已归档」中恢复' : '任务已恢复'); }
      function deleteDialogue(item) {
        ElementPlus.ElMessageBox.confirm('删除后对话记录无法恢复，工作目录文件不会删除。', '删除任务', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' })
          .then(function () { store.deleteTask(item.id); refresh(); }).catch(function () {});
      }
      function openActionForm(item) {
        Object.assign(actionForm, item ? { id: item.id, title: item.title, eventId: item.eventId, branchName: item.branchName,
          prompt: item.prompt, delivery: item.delivery, enabled: item.enabled } :
          { id: '', title: '', eventId: sources[0].id, branchName: '默认分支', prompt: '', delivery: '仅产品内', enabled: true });
        actionDialog.value = true;
      }
      function saveAction() {
        if (!actionForm.title.trim() || !actionForm.prompt.trim() || !actionForm.eventId) return ElementPlus.ElMessage.warning('请填写任务名称、事件和指令');
        var item = store.saveAutonomousAction(props.expertId, actionForm);
        if (!item) return ElementPlus.ElMessage.error('保存失败');
        actionDialog.value = false; refresh(); actionDetail.value = item;
        ElementPlus.ElMessage.success('自主任务配置已保存');
      }
      function triggerAction(item) {
        var run = store.triggerAutonomousAction(props.expertId, item.id);
        if (!run) return ElementPlus.ElMessage.warning('任务已停用，启用后才能模拟触发');
        refresh(); runDetail.value = run; ElementPlus.ElMessage.success('已生成一次模拟执行记录');
      }
      function toggleAction(item, enabled) { store.saveAutonomousAction(props.expertId, Object.assign({}, item, { enabled: enabled })); refresh(); }
      function deleteAction(item) {
        ElementPlus.ElMessageBox.confirm('删除动作配置后不再触发该专家，既有运行记录仍保留。', '删除自主任务', { type: 'warning', confirmButtonText: '删除' })
          .then(function () { store.deleteAutonomousAction(props.expertId, item.id); actionDetail.value = null; refresh(); }).catch(function () {});
      }
      function platformLabel(value) { return ({ wecom: '企业微信', dingtalk: '钉钉', feishu: '飞书' })[value] || value; }
      function statusLabel(value) { return ({ running: '运行中', ready: '已就绪', success: '成功', failed: '失败' })[value] || value; }
      function formatTime(value) { return String(value || '').replace('T', ' ').slice(0, 16) || '-'; }
      return { segment: segment, archivedDialog: archivedDialog, archivedQuery: archivedQuery, statusFilter: statusFilter, query: query,
        tasks: tasks, imSessions: imSessions, actions: actions, runs: runs, sources: sources,
        imDetail: imDetail, actionDetail: actionDetail, runDetail: runDetail, actionDialog: actionDialog, actionForm: actionForm,
        archivedCount: archivedCount, dialogueStats: dialogueStats, filteredDialogue: filteredDialogue,
        filteredArchivedDialogue: filteredArchivedDialogue, openArchivedDialog: openArchivedDialog,
        filteredIm: filteredIm, filteredActions: filteredActions, actionRuns: actionRuns,
        switchSegment: switchSegment, newDialogue: newDialogue, openDialogue: openDialogue,
        editDialogue: editDialogue, archiveDialogue: archiveDialogue, deleteDialogue: deleteDialogue,
        openActionForm: openActionForm, saveAction: saveAction, triggerAction: triggerAction,
        toggleAction: toggleAction, deleteAction: deleteAction, platformLabel: platformLabel,
        actionCwd: actionCwd, openWorkspace: openWorkspace,
        statusLabel: statusLabel, formatTime: formatTime };
    },
    template: `
      <div class="detail-tab-pane task-1023">
        <div class="detail-section-head"><h3 class="detail-section-title">任务</h3><p class="detail-section-desc">按来源查看人工对话、消息渠道和事件中心的自主执行。</p></div>
        <div class="task-1023-segments" role="tablist" aria-label="任务类型">
          <button v-for="tab in [{ id:'dialogue', label:'对话' },{ id:'im', label:'消息渠道' },{ id:'autonomous', label:'自主任务（事件中心）' }]" :key="tab.id" type="button" role="tab" :aria-selected="segment === tab.id" :class="{ active: segment === tab.id }" @click="switchSegment(tab.id)">{{ tab.label }}</button>
        </div>
        <div class="task-1023-toolbar">
          <div v-if="segment === 'dialogue'" class="task-1023-counts">{{ dialogueStats.total }} 个任务 · {{ dialogueStats.running }} 运行中 · {{ dialogueStats.total - dialogueStats.running }} 已就绪</div>
          <div v-else-if="segment === 'im'" class="task-1023-counts">{{ imSessions.length }} 条消息会话</div>
          <div v-else class="task-1023-counts">{{ actions.length }} 个专家执行动作</div>
          <div class="task-1023-tools">
            <el-input v-model="query" clearable size="small" placeholder="搜索名称或 ID" />
            <el-select v-if="segment === 'dialogue'" v-model="statusFilter" size="small" style="width:108px"><el-option label="全部" value="all"/><el-option label="进行中" value="running"/><el-option label="已就绪" value="ready"/></el-select>
            <el-button v-if="segment === 'dialogue'" size="small" plain @click="openArchivedDialog">归档任务 {{ archivedCount }}</el-button>
            <el-button v-if="segment === 'dialogue'" type="primary" size="small" @click="newDialogue">+ 新建任务</el-button>
            <el-button v-if="segment === 'autonomous'" type="primary" size="small" @click="openActionForm(null)">+ 配置专家动作</el-button>
          </div>
        </div>
        <el-empty v-if="segment === 'dialogue' && !filteredDialogue.length" description="还没有对话任务" />
        <div v-if="segment === 'dialogue' && filteredDialogue.length" class="task-1023-list">
          <div v-for="item in filteredDialogue" :key="item.id" class="task-1023-row">
            <div><strong>{{ item.title }}</strong><small>{{ item.id }} · 工作目录：{{ item.cwd || '.' }}</small></div>
            <span class="task-1023-status">{{ item.archived ? '已归档' : item.status === 'running' ? '进行中' : '已就绪' }}</span>
            <span class="task-1023-time">{{ formatTime(item.lastActivityAt || item.updatedAt) }}</span>
            <el-button link type="primary" @click="openDialogue(item)">打开</el-button>
            <el-dropdown trigger="click" @command="(cmd) => cmd === 'edit' ? editDialogue(item) : cmd === 'delete' ? deleteDialogue(item) : archiveDialogue(item, !item.archived)"><button class="task-1023-more" aria-label="更多操作">⋯</button><template #dropdown><el-dropdown-menu><el-dropdown-item command="edit">编辑名称</el-dropdown-item><el-dropdown-item command="archive">{{ item.archived ? '恢复' : '归档' }}</el-dropdown-item><el-dropdown-item command="delete" divided>删除</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
          </div>
        </div>
        <el-empty v-if="segment === 'im' && !filteredIm.length" description="还没有消息渠道任务；收到消息后会在这里显示" />
        <div v-if="segment === 'im'" class="task-1023-list">
          <div v-for="item in filteredIm" :key="item.id" class="task-1023-row task-1023-clickable"><div class="task-1023-row-main"><strong>{{ item.chatName }}</strong><small>{{ platformLabel(item.platform) }} · {{ item.chatType === 'group' ? '群聊' : '单聊' }}</small><button type="button" class="task-1023-cwd-link task-1023-cwd-link--compact" @click="openWorkspace(item.cwd)"><span>工作目录</span><code>{{ item.cwd || '工作空间' }}</code><span class="task-1023-cwd-open">打开 ↗</span></button></div><span class="task-1023-status">{{ statusLabel(item.status) }}</span><span class="task-1023-time">{{ formatTime(item.lastActivityAt) }}</span><el-button link type="primary" @click="imDetail = item">查看详情 →</el-button></div>
        </div>
        <el-empty v-if="segment === 'autonomous' && !filteredActions.length" description="还没有自主任务；可配置一个事件中心的专家动作" />
        <div v-if="segment === 'autonomous'" class="task-1023-list">
          <div v-for="item in filteredActions" :key="item.id" class="task-1023-row"><div class="task-1023-row-main"><strong>{{ item.title }}</strong><small>{{ item.eventName }} · {{ item.sourceType }} · {{ item.branchName }}</small><button type="button" class="task-1023-cwd-link task-1023-cwd-link--compact" @click="openWorkspace(actionCwd(item))"><span>工作目录</span><code>{{ actionCwd(item) }}</code><span class="task-1023-cwd-open">打开 ↗</span></button></div><el-tag size="small" :type="item.enabled ? 'success' : 'info'">{{ item.enabled ? '已启用' : '已停用' }}</el-tag><span class="task-1023-time">{{ formatTime(item.updatedAt) }}</span><el-button link type="primary" @click="actionDetail = item">详情</el-button><el-dropdown trigger="click" @command="(cmd) => cmd === 'edit' ? openActionForm(item) : cmd === 'trigger' ? triggerAction(item) : deleteAction(item)"><button class="task-1023-more" aria-label="更多操作">⋯</button><template #dropdown><el-dropdown-menu><el-dropdown-item command="edit">编辑配置</el-dropdown-item><el-dropdown-item command="trigger">模拟触发</el-dropdown-item><el-dropdown-item command="delete" divided>删除</el-dropdown-item></el-dropdown-menu></template></el-dropdown></div>
        </div>
        <el-dialog v-model="archivedDialog" :title="'归档任务 ' + archivedCount" width="760px" class="task-1023-archived-dialog" append-to-body>
          <p class="task-1023-archived-intro">已归档的对话任务可以恢复，或查看历史记录。</p>
          <el-input v-model="archivedQuery" clearable size="small" placeholder="搜索归档任务名称或 ID" class="task-1023-archived-search" />
          <el-empty v-if="!filteredArchivedDialogue.length" description="没有匹配的归档任务" />
          <div v-else class="task-1023-archived-list">
            <div v-for="item in filteredArchivedDialogue" :key="item.id" class="task-1023-archived-row">
              <div class="task-1023-archived-main"><strong>{{ item.title }}</strong><small>{{ item.id }} · 工作目录：{{ item.cwd || '.' }}</small></div>
              <span class="task-1023-status">已归档</span>
              <span class="task-1023-time">{{ formatTime(item.lastActivityAt || item.updatedAt) }}</span>
              <el-button link type="primary" @click="openDialogue(item)">打开</el-button>
              <el-dropdown trigger="click" @command="(cmd) => cmd === 'edit' ? editDialogue(item) : cmd === 'delete' ? deleteDialogue(item) : archiveDialogue(item, false)">
                <button type="button" class="task-1023-more" aria-label="归档任务更多操作">⋯</button>
                <template #dropdown><el-dropdown-menu><el-dropdown-item command="edit">编辑名称</el-dropdown-item><el-dropdown-item command="restore">恢复</el-dropdown-item><el-dropdown-item command="delete" divided>删除</el-dropdown-item></el-dropdown-menu></template>
              </el-dropdown>
            </div>
          </div>
          <template #footer><el-button @click="archivedDialog = false">关闭</el-button></template>
        </el-dialog>
        <el-dialog v-model="imDetail" title="消息渠道会话" width="760px" class="task-1023-session-dialog" append-to-body>
          <template v-if="imDetail">
            <div class="task-1023-dialog-content">
              <section class="expert-config-card task-1023-session-hero">
                <div class="task-1023-session-identity">
                  <span class="task-1023-platform-mark">{{ platformLabel(imDetail.platform) }}</span>
                  <div><h3>{{ imDetail.chatName }}</h3><p>{{ imDetail.chatType === 'group' ? '群聊' : '单聊' }} · {{ imDetail.id }}</p></div>
                </div>
                <el-tag size="small" :type="imDetail.status === 'running' ? 'warning' : 'success'">{{ statusLabel(imDetail.status) }}</el-tag>
              </section>
              <section class="expert-config-card">
                <div class="task-1023-card-heading"><h4>会话信息</h4><span>最近活动 {{ formatTime(imDetail.lastActivityAt) }}</span></div>
                <div class="task-1023-info-grid">
                  <div class="task-1023-info-field"><span>消息渠道</span><strong>{{ platformLabel(imDetail.platform) }}</strong></div>
                  <div class="task-1023-info-field"><span>会话类型</span><strong>{{ imDetail.chatType === 'group' ? '群聊' : '单聊' }}</strong></div>
                  <div class="task-1023-info-field task-1023-info-field--wide">
                    <span>工作目录</span>
                    <button type="button" class="task-1023-cwd-link" :aria-label="'session.cwd：' + (imDetail.cwd || '工作空间')" @click="openWorkspace(imDetail.cwd)"><code>{{ imDetail.cwd || '工作空间' }}</code><span class="task-1023-cwd-open">在工作空间中打开 ↗</span></button>
                  </div>
                </div>
              </section>
              <section class="expert-config-card task-1023-conversation-card">
                <div class="task-1023-card-heading"><h4>消息记录</h4><span>{{ (imDetail.messages || []).length }} 条</span></div>
                <div v-if="imDetail.messages && imDetail.messages.length" class="task-1023-transcript">
                  <div v-for="(msg,index) in imDetail.messages" :key="index" :class="['task-1023-message',msg.role]">
                    <b>{{ msg.role === 'user' ? '对方' : '专家' }}</b><p>{{ msg.content }}</p>
                  </div>
                </div>
                <el-empty v-else description="暂无消息记录" :image-size="64" />
              </section>
              <p class="task-1023-hint">此处只读查看会话；回复请在原消息渠道完成。</p>
            </div>
          </template>
          <template #footer><el-button @click="imDetail = null">关闭</el-button></template>
        </el-dialog>
        <el-dialog v-model="actionDialog" :title="actionForm.id ? '编辑专家动作' : '配置专家动作'" width="600px" append-to-body><el-form label-position="top"><el-form-item label="任务名称" required><el-input v-model="actionForm.title" /></el-form-item><el-form-item label="已有事件源" required><el-select v-model="actionForm.eventId" style="width:100%"><el-option v-for="source in sources" :key="source.id" :label="source.name + ' · ' + source.type + ' · ' + source.schedule" :value="source.id" /></el-select></el-form-item><el-form-item label="分支"><el-input v-model="actionForm.branchName" /></el-form-item><el-form-item label="运行指令" required><el-input v-model="actionForm.prompt" type="textarea" :rows="5" placeholder="可插入事件字段，例如 {{device_id}}" /></el-form-item><el-form-item label="结果投递"><el-select v-model="actionForm.delivery"><el-option label="仅产品内" value="仅产品内"/><el-option label="钉钉 Home" value="钉钉 Home"/><el-option label="飞书 Home" value="飞书 Home"/></el-select></el-form-item><el-form-item label="启用"><el-switch v-model="actionForm.enabled" /></el-form-item></el-form><template #footer><el-button @click="actionDialog = false">取消</el-button><el-button type="primary" @click="saveAction">保存</el-button></template></el-dialog>
        <el-dialog v-model="actionDetail" title="自主任务详情" width="800px" class="task-1023-action-dialog" append-to-body>
          <template v-if="actionDetail">
            <div class="task-1023-dialog-content">
              <section class="expert-config-card task-1023-action-hero">
                <div><h3>{{ actionDetail.title }}</h3><p>{{ actionDetail.eventName }} · {{ actionDetail.sourceType }} · {{ actionDetail.branchName }}</p></div>
                <div class="task-1023-action-state"><span>{{ actionDetail.enabled ? '已启用' : '已停用' }}</span><el-switch :model-value="actionDetail.enabled" @change="(v) => toggleAction(actionDetail,v)" /></div>
              </section>
              <section class="expert-config-card">
                <div class="task-1023-card-heading"><h4>触发与执行</h4><span>{{ actionDetail.version }} · 更新于 {{ formatTime(actionDetail.updatedAt) }}</span></div>
                <div class="task-1023-info-grid">
                  <div class="task-1023-info-field"><span>事件来源</span><strong>{{ actionDetail.eventName }}</strong></div>
                  <div class="task-1023-info-field"><span>触发类型</span><strong>{{ actionDetail.sourceType }}</strong></div>
                  <div class="task-1023-info-field"><span>执行分支</span><strong>{{ actionDetail.branchName }}</strong></div>
                  <div class="task-1023-info-field"><span>结果投递</span><strong>{{ actionDetail.delivery || '仅产品内' }}</strong></div>
                  <div class="task-1023-info-field task-1023-info-field--wide">
                    <span>任务工作目录</span>
                    <button type="button" class="task-1023-cwd-link" :aria-label="'工作目录：' + actionCwd(actionDetail)" @click="openWorkspace(actionCwd(actionDetail))"><code>{{ actionCwd(actionDetail) }}</code><span class="task-1023-cwd-open">在工作空间中打开 ↗</span></button>
                  </div>
                </div>
              </section>
              <section class="expert-config-card">
                <div class="task-1023-card-heading"><h4>运行指令</h4></div>
                <div class="task-1023-prompt">{{ actionDetail.prompt }}</div>
              </section>
              <section class="expert-config-card task-1023-runs-card">
                <div class="task-1023-card-heading"><h4>运行记录</h4><span>{{ actionRuns.length }} 次</span></div>
                <el-empty v-if="!actionRuns.length" description="暂无运行记录" :image-size="64" />
                <div v-else class="task-1023-run-list">
                  <article v-for="run in actionRuns" :key="run.id" class="task-1023-run-card">
                    <div class="task-1023-run-card-head"><strong>{{ formatTime(run.startedAt) }}</strong><el-tag size="small" :type="run.status === 'success' ? 'success' : 'danger'">{{ statusLabel(run.status) }}</el-tag></div>
                    <p>{{ run.response }}</p>
                    <div class="task-1023-run-card-foot">
                      <button type="button" class="task-1023-cwd-link task-1023-cwd-link--run" @click="openWorkspace(run.cwd || actionCwd(actionDetail))"><span>本次工作目录</span><code>{{ run.cwd || actionCwd(actionDetail) }}</code><span class="task-1023-cwd-open">打开 ↗</span></button>
                      <el-button link type="primary" @click="runDetail = run">执行详情 →</el-button>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          </template>
          <template #footer><el-button @click="actionDetail = null">关闭</el-button><el-button @click="openActionForm(actionDetail)">编辑配置</el-button><el-button type="primary" @click="triggerAction(actionDetail)">模拟触发一次</el-button></template>
        </el-dialog>
        <el-dialog v-model="runDetail" title="本次执行记录" width="720px" class="task-1023-run-dialog" append-to-body>
          <template v-if="runDetail">
            <div class="task-1023-dialog-content">
              <section class="expert-config-card task-1023-run-summary">
                <div><strong>{{ formatTime(runDetail.startedAt) }}</strong><span>{{ runDetail.finishedAt ? '结束于 ' + formatTime(runDetail.finishedAt) : '执行中' }}</span></div>
                <el-tag size="small" :type="runDetail.status === 'success' ? 'success' : 'danger'">{{ statusLabel(runDetail.status) }}</el-tag>
              </section>
              <section class="expert-config-card">
                <div class="task-1023-card-heading"><h4>session.cwd 工作目录</h4></div>
                <button type="button" class="task-1023-cwd-link" :aria-label="'session.cwd：' + (runDetail.cwd || '工作空间')" @click="openWorkspace(runDetail.cwd)"><code>{{ runDetail.cwd || '工作空间' }}</code><span class="task-1023-cwd-open">在工作空间中打开 ↗</span></button>
              </section>
              <section class="expert-config-card"><div class="task-1023-card-heading"><h4>本次输入</h4></div><div class="task-1023-prompt">{{ runDetail.input || '无输入内容' }}</div></section>
              <section class="expert-config-card"><div class="task-1023-card-heading"><h4>执行结果</h4></div><div class="task-1023-prompt">{{ runDetail.response || '暂无执行结果' }}</div></section>
              <section class="expert-config-card"><div class="task-1023-card-heading"><h4>文件产物</h4></div><div v-if="runDetail.files && runDetail.files.length" class="task-1023-file-list"><el-tag v-for="file in runDetail.files" :key="file" effect="plain">{{ file }}</el-tag></div><p v-else class="task-1023-empty-copy">本次执行没有生成文件。</p></section>
            </div>
          </template>
          <template #footer><el-button @click="runDetail = null">关闭</el-button></template>
        </el-dialog>
      </div>`
  };
})();
