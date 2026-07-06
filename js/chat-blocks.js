/**
 * 对话内容块组件集合
 * 包含：ActivityItem（思考 / 工具 / 子智能体 三合一）/ UserMessage / ReplyBlock / StatusLine / ErrorRow
 * 加载顺序：chat-blocks.js → chat-interactive.js
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
   * 活动项（合并了思考、工具调用、子智能体）
   * 视觉风格：扁平、纯文字行、可折叠、颜色仅用于状态字符
   *
   * props:
   *   - kind: 'thought' | 'tool' | 'subagent'
   *   - status: 'thinking' | 'running' | 'success' | 'error'
   *   - title: 主标题文字（不含前缀），例如工具名 / 子智能体名
   *   - duration: 耗时（秒）
   *   - goal: 子智能体的目标描述
   *   - summary: 结果摘要
   *   - params: 工具入参
   *   - result: 工具结果详情（与 summary 互补；如提供则显示完整内容）
   *   - live: 是否流式
   *   - open: 是否默认展开
   *   - content: 思考过程的展开内容（仅 thought 使用）
   */
  var ActivityItem = {
    props: {
      kind: { type: String, default: 'tool' },
      status: { type: String, default: 'success' },
      title: { type: String, default: '' },
      duration: { type: Number, default: null },
      goal: { type: String, default: '' },
      summary: { type: String, default: '' },
      params: { type: Object, default: null },
      result: { type: String, default: '' },
      content: { type: String, default: '' },
      live: { type: Boolean, default: false },
      open: { type: Boolean, default: false }
    },
    data: function () {
      return { isOpen: !!this.open };
    },
    watch: {
      open: function (val) {
        if (this.isOpen !== val) this.isOpen = val;
      }
    },
    methods: {
      onToggle: function (e) {
        this.isOpen = !!e.target.open;
      }
    },
    computed: {
      // 思考专用：是否流式中
      isThinkingLive: function () {
        return this.kind === 'thought' && this.status === 'thinking' && this.live;
      },
      // 是否有可展开内容
      hasExpandableContent: function () {
        if (this.kind === 'thought') return !!this.content;
        if (this.kind === 'subagent') return !!(this.goal || this.summary || this.result || this.content || (this.params && Object.keys(this.params).length));
        // tool：兼容旧字段 content（旧 mock 工具调用只有 content 没有 summary）
        return !!(this.summary || this.result || this.content || (this.params && Object.keys(this.params).length));
      },
      // 中文前缀
      prefixText: function () {
        if (this.kind === 'thought') {
          if (this.status === 'thinking') return '思考中';
          return '思考';
        }
        if (this.kind === 'subagent') {
          if (this.status === 'running') return '委派子智能体';
          if (this.status === 'error') return '子智能体失败';
          if (this.status === 'thinking') return '子智能体思考中';
          return '子智能体';
        }
        // tool
        if (this.status === 'running') return '调用工具';
        if (this.status === 'error') return '工具调用失败';
        if (this.status === 'thinking') return '准备调用工具';
        return '调用工具';
      },
      // 类型符号：单一灰色字符
      kindMark: function () {
        if (this.kind === 'thought') return '✦';
        if (this.kind === 'subagent') return '→';
        return '⚙';
      },
      // 状态字符（唯一的彩色字符）
      statusMark: function () {
        if (this.status === 'running' || this.status === 'thinking') return '…';
        if (this.status === 'error') return '✕';
        if (this.status === 'success') return '✓';
        return '';
      },
      // 耗时：仅 thought 显示「用时 N 秒」，其他场景不显示
      durationLabel: function () {
        if (this.kind !== 'thought') return '';
        if (this.status === 'thinking') return '';
        var n = Number(this.duration);
        if (!isFinite(n)) return '';
        return '用时 ' + n.toFixed(1) + ' 秒';
      },
      // 是否显示主标题（工具名 / 子智能体名）
      shouldShowTitle: function () {
        if (this.kind === 'thought') return false;
        return !!this.title;
      },
      // 是否显示状态字符
      shouldShowStatus: function () {
        return !!this.statusMark;
      },
      // 子智能体目标展示文本
      goalText: function () {
        if (this.kind !== 'subagent') return '';
        return this.goal ? ('目标：' + this.goal) : '';
      },
      // 参数条目
      paramEntries: function () {
        if (!this.params) return [];
        return Object.keys(this.params).map(function (k) {
          return { key: k, value: String(this.params[k]) };
        }, this);
      },
      // 工具结果显示文本（兼容旧 content 字段）
      resultText: function () {
        if (this.result) return this.result;
        if (this.summary) return this.summary;
        // 旧 mock 的 content 形如 '[数据查询] 执行完成 (1.8s)'，标题行已体现，跳过
        if (this.content && !/^\[[^\]]+\]\s*执行(完成|失败)/.test(this.content)) {
          return this.content;
        }
        return '';
      },
      // 思考展开内容
      thoughtContent: function () {
        return this.content || '';
      }
    },
    template: '\
      <details class="activity-item" :class="[\'kind-\' + kind, \'status-\' + status, { \'is-live\': isThinkingLive, \'is-open\': isOpen }]" :open="isOpen ? \'\' : null" @toggle="onToggle">\
        <summary class="activity-summary">\
          <span v-if="hasExpandableContent" class="activity-chevron">{{ isOpen ? "▾" : "▸" }}</span>\
          <span class="activity-kind-mark">{{ kindMark }}</span>\
          <span class="activity-prefix">{{ prefixText }}</span>\
          <span v-if="shouldShowTitle" class="activity-title">{{ title }}</span>\
          <span v-if="durationLabel" class="activity-duration">{{ durationLabel }}</span>\
          <span v-if="shouldShowStatus" class="activity-status" :class="\'is-\' + status">{{ statusMark }}</span>\
        </summary>\
        <div v-if="hasExpandableContent" class="activity-detail" :class="{ \'is-subagent\': kind === \'subagent\' }">\
          <div v-if="kind === \'subagent\' && goal" class="activity-goal">{{ goalText }}</div>\
          <div v-if="kind === \'thought\'" class="activity-thought">{{ thoughtContent }}<span v-if="isThinkingLive" class="stream-cursor">▍</span></div>\
          <div v-else-if="kind !== \'subagent\' && resultText" class="activity-result">{{ resultText }}</div>\
          <details v-if="paramEntries.length" class="activity-params-details">\
            <summary class="activity-params-toggle">参数（{{ paramEntries.length }}）</summary>\
            <div class="activity-params">\
              <div v-for="p in paramEntries" :key="p.key" class="activity-param-row">\
                <span class="activity-param-key">{{ p.key }}</span>\
                <span class="activity-param-val">{{ p.value }}</span>\
              </div>\
            </div>\
          </details>\
          <div v-if="kind === \'subagent\'" class="subagent-events"><slot /></div>\
          <slot v-else />\
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
    ActivityItem: ActivityItem,
    ReplyBlock: ReplyBlock,
    UserMessage: UserMessage,
    StatusLine: StatusLine,
    ErrorRow: ErrorRow,
    statusContent: statusContent
  };
})();
