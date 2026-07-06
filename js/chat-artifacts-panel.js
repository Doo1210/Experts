/**
 * 产物面板组件
 * PRD 中保留的原有功能，从 expert-tasks-page.js 抽出
 */
(function () {
  var ChatArtifactsPanel = {
    props: {
      panelArtifacts: { type: Array, default: function () { return []; } },
      panelTaskTitle: { type: String, default: '' },
      artifactTypeLabel: { type: Object, default: function () { return {}; } },
      createdAtLabelFn: { type: Function, required: true }
    },
    emits: ['close', 'preview', 'download', 'goto-task'],
    methods: {
      artifactTypeClass: function (type) {
        return 'artifact-type-' + (type || 'file');
      }
    },
    template: '\
      <aside v-show="panelTaskTitle" class="task-artifacts-panel">\
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
                  <span class="task-artifacts-panel-subtitle">{{ panelTaskTitle }}</span>\
                  <span class="task-artifacts-panel-meta-item">共 {{ panelArtifacts.length }} 项</span>\
                </div>\
              </div>\
              <button type="button" class="task-artifacts-panel-close" title="关闭" @click="$emit(\'close\')">\
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
                {{ createdAtLabelFn(a.createdAt) }}\
              </div>\
              <div class="artifact-actions">\
                <button type="button" class="artifact-action-btn" title="预览" @click="$emit(\'preview\', a)">\
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>\
                  预览\
                </button>\
                <button type="button" class="artifact-action-btn" title="下载" @click="$emit(\'download\', a)">\
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\
                  下载\
                </button>\
                <button type="button" class="artifact-action-btn" title="跳转到任务" @click="$emit(\'goto-task\')">\
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
      </aside>'
  };

  window.ChatArtifactsPanel = ChatArtifactsPanel;
})();
