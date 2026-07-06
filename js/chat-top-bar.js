/**
 * 顶部状态栏组件
 * 展示：返回按钮、专家头像名称、运行状态、发起任务、工作空间按钮
 * 注：模型与工作目录与对话任务绑定，由对话输入区（ChatComposer）维护，不在顶部展示
 * PRD 6.1 对应
 */
(function () {
  var ChatTopBar = {
    props: {
      expert: { type: Object, default: null },
      running: { type: Boolean, default: false },
      errorState: { type: String, default: '' },
      // 阶段2 统一状态机：idle/running/hitl/error（优先于 running/errorState）
      expertStatus: { type: String, default: '' },
      workspaceOpen: { type: Boolean, default: false }
    },
    emits: ['back', 'open-expert', 'new-task', 'toggle-workspace'],
    computed: {
      statusLabel: function () {
        if (this.expertStatus) {
          var map = { idle: '', running: '', hitl: '等待回应', error: '出错' };
          return map[this.expertStatus] || '';
        }
        if (this.errorState) return '出错';
        return '';
      },
      statusClass: function () {
        if (this.expertStatus) {
          var map = { idle: '', running: '', hitl: 'task-status-hitl', error: 'task-status-error' };
          return map[this.expertStatus] || '';
        }
        if (this.errorState) return 'task-status-error';
        return '';
      }
    },
    template: '\
      <div class="task-top-bar">\
        <div class="task-top-bar-left">\
          <back-link label="返回专家" inline @click="$emit(\'back\')" />\
          <button type="button" class="task-top-bar-expert-trigger" title="查看专家信息" @click="$emit(\'open-expert\')">\
            <img class="task-top-bar-avatar" :src="expert.avatar" :alt="expert.name">\
            <span class="task-top-bar-info">\
              <span class="task-top-bar-name">{{ expert.name }}</span>\
            </span>\
          </button>\
          <span v-if="statusLabel" class="task-top-bar-status" :class="statusClass">\
            <span v-if="expertStatus === \'error\' || errorState" class="task-top-bar-status-dot"></span>\
            <span v-else-if="expertStatus === \'hitl\'" class="task-top-bar-status-dot task-status-hitl-dot"></span>\
            {{ statusLabel }}\
          </span>\
        </div>\
        <div class="project-header-actions">\
          <button\
            type="button"\
            class="project-header-action-btn"\
            title="发起任务"\
            @click="$emit(\'new-task\')">\
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">\
              <path d="M12 5v14M5 12h14"/>\
            </svg>\
            <span>发起任务</span>\
          </button>\
          <button\
            type="button"\
            class="project-header-action-btn task-top-bar-workspace-btn"\
            :class="{ active: workspaceOpen }"\
            title="工作空间"\
            @click="$emit(\'toggle-workspace\')">\
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>\
              <polyline points="9 22 9 12 15 12 15 22"/>\
            </svg>\
            <span>工作空间</span>\
          </button>\
        </div>\
      </div>'
  };

  window.ChatTopBar = ChatTopBar;
})();
