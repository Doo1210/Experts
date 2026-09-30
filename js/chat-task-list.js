/** 专家对话页右侧任务列表：任务名称与工作目录两行。 */
(function () {
  var TaskListItem = {
    props: ['task', 'active', 'isRunning', 'mockMode', 'workspaceRoot'],
    emits: ['select', 'edit', 'pin', 'archive', 'open-workspace'],
    data: function () { return { titleClickTimer: null }; },
    beforeUnmount: function () { if (this.titleClickTimer) clearTimeout(this.titleClickTimer); },
    computed: {
      cwdLabel: function () {
        var cwd = String((this.task && this.task.cwd) || '').replace(/\\/g, '/').replace(/\/+$/, '');
        var root = String(this.workspaceRoot || '').replace(/\\/g, '/').replace(/\/+$/, '');
        if (!cwd || cwd === '.' || (root && cwd.toLowerCase() === root.toLowerCase())) return '工作空间根目录';
        if (root && cwd.toLowerCase().indexOf(root.toLowerCase() + '/') === 0) cwd = cwd.slice(root.length + 1);
        return cwd || '工作空间根目录';
      },
      cwdTitle: function () { return '工作目录：' + this.cwdLabel + '（点击打开工作空间）'; }
    },
    methods: {
      onTitleClick: function () {
        if (this.titleClickTimer) clearTimeout(this.titleClickTimer);
        var self = this;
        this.titleClickTimer = setTimeout(function () { self.titleClickTimer = null; self.$emit('select'); }, 220);
      },
      onTitleDblclick: function () {
        if (this.titleClickTimer) clearTimeout(this.titleClickTimer);
        this.titleClickTimer = null;
        this.$emit('edit');
      }
    },
    template: '\
      <div class="task-item" :class="{ active: active, \'is-pinned\': !!task.pinned }" @click="$emit(\'select\')">\
        <div class="task-item-accent"></div>\
        <div class="task-item-title-row">\
          <button type="button" class="task-item-title" :title="task.title + \'（双击修改名称）\'" @click.stop="onTitleClick" @dblclick.stop="onTitleDblclick">{{ task.title }}</button>\
          <span v-if="isRunning" class="task-status-spinner" role="status" aria-label="运行中" title="运行中"></span>\
          <div class="task-item-title-actions">\
            <button type="button" class="task-title-action task-pin-btn" :class="{ active: !!task.pinned }" :title="task.pinned ? \'取消置顶\' : \'置顶\'" :aria-label="task.pinned ? \'取消置顶\' : \'置顶\'" @click.stop="$emit(\'pin\')">\
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l-1 5 3 3v2H7v-2l3-3-1-5Z"/><path d="M12 13v8"/></svg>\
            </button>\
            <button v-if="mockMode" type="button" class="task-title-action task-archive-btn" title="归档任务" aria-label="归档任务" @click.stop="$emit(\'archive\')">\
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v12h14V8M10 12h4"/></svg>\
            </button>\
          </div>\
        </div>\
        <button type="button" class="task-item-cwd" :title="cwdTitle" @click.stop="$emit(\'open-workspace\')">\
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/></svg>\
          <span class="task-item-cwd-label">工作目录</span>\
          <span class="task-item-cwd-path">{{ cwdLabel }}</span>\
          <svg class="task-item-cwd-arrow" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 5 7 7-7 7"/></svg>\
        </button>\
      </div>'
  };

  var ChatTaskList = {
    components: { TaskListItem: TaskListItem },
    props: {
      tasks: { type: Array, default: function () { return []; } },
      currentTaskId: { type: [String, Number], default: null },
      isRunningFn: { type: Function, required: true },
      workspaceRoot: { type: String, default: '' },
      mockMode: { type: Boolean, default: false }
    },
    emits: ['select', 'edit', 'pin', 'archive', 'open-workspace'],
    template: '\
      <aside class="task-right-panel">\
        <div class="task-right-panel-inner">\
          <div class="task-right-panel-head">\
            <h4 class="task-right-panel-title">\
              <span class="task-panel-title-icon"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></span>\
              任务列表<span class="task-list-count">{{ tasks.length }}</span>\
            </h4>\
          </div>\
          <div class="task-list-scroll">\
            <div class="task-list">\
              <task-list-item v-for="t in tasks" :key="t.id" :task="t" :active="currentTaskId === t.id" :is-running="isRunningFn(t)" :mock-mode="mockMode" :workspace-root="workspaceRoot"\
                @select="$emit(\'select\', t.id)" @edit="$emit(\'edit\', t)" @pin="$emit(\'pin\', t)" @archive="$emit(\'archive\', t)" @open-workspace="$emit(\'open-workspace\', t)" />\
              <div v-if="tasks.length === 0" class="task-list-empty"><div class="task-list-empty-icon">📋</div><p>暂无任务</p><span>点击上方「新建任务」开始</span></div>\
            </div>\
          </div>\
        </div>\
      </aside>'
  };

  window.TaskListItem = TaskListItem;
  window.ChatTaskList = ChatTaskList;
})();
