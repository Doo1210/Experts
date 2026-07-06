/**
 * 对话内容块组件集合
 * 包含：ThoughtBlock / ToolCard / UserMessage / ReplyBlock
 * 阶段1将在此文件追加 SubagentCard / ClarifyCard / ApprovalCard / StatusLine / ErrorRow
 */
(function () {
  /**
   * 过滤工具状态文本，隐藏工具调用过程中的内部提示
   */
  function statusContent(content) {
    var text = String(content || '');
    if (/^正在(调用|准备工具调用|生成工具调用)/.test(text)) return '';
    return text;
  }

  /**
   * 思考过程折叠区
   * props: { content, live, open }
   * - live: 是否为流式实时态（显示光标）
   * - open: 是否默认展开
   */
  var ThoughtBlock = {
    props: {
      content: { type: String, default: '' },
      live: { type: Boolean, default: false },
      open: { type: Boolean, default: false }
    },
    template: '\
      <details class="log-thought-block" :class="{ \'stream-thought-live\': live }" :open="open ? \'\' : null">\
        <summary>思考过程</summary>\
        <div class="log-thought-content">{{ content }}<span v-if="live" class="stream-cursor">▍</span></div>\
      </details>'
  };

  /**
   * 工具调用卡片（重做版）
   * props: { toolName, content, params, summary, duration, progress, isError }
   * - params: 工具入参对象，渲染为 key-value 表格
   * - summary: 工具结果摘要
   * - duration: 执行时长（秒）
   * - progress: 执行进度（字符串或数字，存在即表示执行中）
   * - isError: 是否执行失败
   * - content: 兼容旧字段，作为兜底状态文本
   */
  var ToolCard = {
    props: {
      toolName: { type: String, default: '' },
      content: { type: String, default: '' },
      params: { type: Object, default: null },
      summary: { type: String, default: '' },
      duration: { type: Number, default: null },
      progress: { type: [String, Number], default: null },
      isError: { type: Boolean, default: false }
    },
    computed: {
      desc: function () {
        return statusContent(this.content);
      },
      statusLabel: function () {
        if (this.isError) return '执行失败';
        if (this.progress !== null && this.progress !== undefined && this.progress !== '') return '执行中';
        return '执行完成';
      },
      durationLabel: function () {
        if (!this.duration) return '';
        return '(' + Number(this.duration).toFixed(1) + 's)';
      },
      paramEntries: function () {
        if (!this.params) return [];
        return Object.keys(this.params).map(function (k) {
          return { key: k, value: String(this.params[k]) };
        }, this);
      }
    },
    template: '\
      <details class="log-action-card" :class="{ \'is-error\': isError, \'is-running\': statusLabel === \'执行中\' }" open>\
        <summary class="log-action-summary">\
          <span class="log-action-icon">{{ isError ? \'⚠\' : \'⚡\' }}</span>\
          <span class="log-action-body">\
            <span class="log-action-title">调用工具</span>\
            <span class="log-action-tool" v-if="toolName">[{{ toolName }}]</span>\
            <span class="log-action-status" :class="{ \'is-error\': isError }">{{ statusLabel }}</span>\
            <span class="log-action-duration" v-if="durationLabel">{{ durationLabel }}</span>\
          </span>\
        </summary>\
        <div class="log-action-detail">\
          <div v-if="summary" class="log-action-summary-text">{{ summary }}</div>\
          <div v-else-if="desc" class="log-action-result">{{ desc }}</div>\
          <details v-if="paramEntries.length" class="log-action-params-details">\
            <summary class="log-action-params-title">参数（{{ paramEntries.length }}）</summary>\
            <div class="log-action-params">\
              <div v-for="p in paramEntries" :key="p.key" class="log-action-param-row">\
                <span class="log-action-param-key">{{ p.key }}</span>\
                <span class="log-action-param-val">{{ p.value }}</span>\
              </div>\
            </div>\
          </details>\
        </div>\
      </details>'
  };

  /**
   * 专家回复气泡（支持 markdown 渲染 + 附件）
   * props: { content, renderMarkdown, live, attachments }
   * - live: 是否为流式实时态（显示光标）
   * - attachments: 附件列表
   */
  var ReplyBlock = {
    props: {
      content: { type: String, default: '' },
      renderMarkdown: { type: Function, default: null },
      live: { type: Boolean, default: false },
      attachments: { type: Array, default: null }
    },
    computed: {
      html: function () {
        if (!this.content) return '';
        return this.renderMarkdown ? this.renderMarkdown(this.content) : this.content;
      }
    },
    template: '\
      <div class="msg-bubble">\
        <div v-if="content" class="msg-text markdown-body">\
          <span v-html="html"></span><span v-if="live" class="stream-cursor">▍</span>\
        </div>\
        <div v-if="attachments && attachments.length" class="msg-attachments">\
          <div v-for="att in attachments" :key="att.id" class="msg-attachment-chip">\
            <span class="msg-attachment-icon">📎</span>\
            <span class="msg-attachment-name">{{ att.name }}</span>\
          </div>\
        </div>\
      </div>'
  };

  /**
   * 用户消息气泡
   * props: { message }
   * - message: { content, attachments, role }
   */
  var UserMessage = {
    props: {
      message: { type: Object, required: true }
    },
    template: '\
      <div class="msg-row" :class="message.role">\
        <div class="msg-bubble">\
          <div v-if="message.content" class="msg-text">{{ message.content }}</div>\
          <div v-if="message.attachments && message.attachments.length" class="msg-attachments">\
            <div v-for="att in message.attachments" :key="att.id" class="msg-attachment-chip">\
              <span class="msg-attachment-icon">📎</span>\
              <span class="msg-attachment-name">{{ att.name }}</span>\
            </div>\
          </div>\
        </div>\
      </div>'
  };

  /**
   * 状态变更行
   * props: { kind, content }
   * - kind: model / cwd / info，决定 icon 与配色
   * - content: 状态文案
   */
  var StatusLine = {
    props: {
      kind: { type: String, default: 'info' },
      content: { type: String, default: '' }
    },
    computed: {
      icon: function () {
        if (this.kind === 'model') return '🔧';
        if (this.kind === 'cwd') return '📁';
        return 'ℹ';
      }
    },
    template: '\
      <div class="status-line" :class="\'kind-\' + kind">\
        <span class="status-line-icon">{{ icon }}</span>\
        <span class="status-line-text">{{ content }}</span>\
      </div>'
  };

  /**
   * 错误行（对话流内的错误展示）
   * props: { content }
   */
  var ErrorRow = {
    props: {
      content: { type: String, default: '' }
    },
    template: '\
      <div class="error-row">\
        <span class="error-row-icon">⚠</span>\
        <span class="error-row-text">{{ content }}</span>\
      </div>'
  };

  window.ChatBlocks = {
    ThoughtBlock: ThoughtBlock,
    ToolCard: ToolCard,
    ReplyBlock: ReplyBlock,
    UserMessage: UserMessage,
    StatusLine: StatusLine,
    ErrorRow: ErrorRow,
    statusContent: statusContent
  };
})();
