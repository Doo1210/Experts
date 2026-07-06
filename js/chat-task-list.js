/**
 * 右侧任务列表组件
 * 包含：TaskListItem 子组件 + ChatTaskList 容器
 * PRD 第 8 节对应
 */
(function () {
  /**
   * 任务列表项
   * props: { task, active, artifactOpen, isRunning, statusTip, createdAtLabel, artifactCount }
   * emits: { select, toggle-artifacts, menu }
   */
  var TaskListItem = {
    props: ['task', 'active', 'artifactOpen', 'isRunning', 'statusTip', 'createdAtLabel', 'artifactCount'],
    emits: ['select', 'toggle-artifacts', 'menu', 'open-workspace'],
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
              <button type="button" class="task-workspace-link" title="工作目录" @click.stop="$emit(\'open-workspace\', $event)">\
                <span class="task-workspace-link-icon">\
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">\
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>\
                  </svg>\
                </span>\
                <span class="task-workspace-link-text">工作目录</span>\
              </button>\
            </div>\
          </div>\
        </div>\
      </div>'
  };

  /**
   * 任务列表容器
   * props: { tasks, currentTaskId, artifactPanelTaskId, taskStats, isRunning, taskStatusTip, createdAtLabel, artifactCount }
   * emits: { select, toggle-artifacts, menu }
   */
  var ChatTaskList = {
    components: { TaskListItem: TaskListItem },
    props: {
      tasks: { type: Array, default: function () { return []; } },
      currentTaskId: { type: [String, Number], default: null },
      artifactPanelTaskId: { type: [String, Number], default: null },
      taskStats: { type: Object, default: function () { return { total: 0, running: 0, ready: 0 }; } },
      isRunningFn: { type: Function, required: true },
      taskStatusTipFn: { type: Function, required: true },
      createdAtLabelFn: { type: Function, required: true },
      artifactCountFn: { type: Function, required: true }
    },
    emits: ['select', 'toggle-artifacts', 'menu', 'open-workspace'],
    template: '\
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
                v-for="t in tasks"\
                :key="t.id"\
                :task="t"\
                :active="currentTaskId === t.id"\
                :artifact-open="artifactPanelTaskId === t.id"\
                :is-running="isRunningFn(t)"\
                :status-tip="taskStatusTipFn(t)"\
                :created-at-label="createdAtLabelFn(t.createdAt)"\
                :artifact-count="artifactCountFn(t.id)"\
                @select="$emit(\'select\', t.id)"\
                @toggle-artifacts="$emit(\'toggle-artifacts\', t, $event)"\
                @menu="$emit(\'menu\', $event, t)"\
                @open-workspace="$emit(\'open-workspace\', t)" />\
              <div v-if="tasks.length === 0" class="task-list-empty">\
                <div class="task-list-empty-icon">📋</div>\
                <p>暂无任务</p>\
                <span>点击上方「发起任务」开始</span>\
              </div>\
            </div>\
          </div>\
        </div>\
      </aside>'
  };

  window.TaskListItem = TaskListItem;
  window.ChatTaskList = ChatTaskList;
})();
