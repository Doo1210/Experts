/**
 * 对话内容块组件集合
 * 包含：ProcessTrace / ActivityItem（思考 / 工具 / 子智能体 三合一）/ UserMessage / ReplyBlock / StatusLine / ErrorRow
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

  function isToolStatusLine(text) {
    return /^\[[^\]]+\]\s*执行(完成|失败)/.test(String(text || '').trim());
  }

  function isProcessItem(item) {
    if (!item) return false;
    var t = item.type;
    return t === 'thought' || t === 'action' || t === 'subagent' || t === 'status';
  }

  function itemDurationSeconds(item) {
    if (!item) return 0;
    var n = Number(item.duration);
    if (isFinite(n) && n > 0) return n;
    n = Number(item.subagentDuration);
    if (isFinite(n) && n > 0) return n;
    return 0;
  }

  function computeProcessDuration(items) {
    var sum = 0;
    var hasDur = false;
    (items || []).forEach(function (it) {
      var n = itemDurationSeconds(it);
      if (n > 0) {
        hasDur = true;
        sum += n;
      }
    });
    if (hasDur) return sum;
    var minTs = Infinity;
    var maxTs = -Infinity;
    var hasTs = false;
    (items || []).forEach(function (it) {
      var ts = Date.parse(it && it.createdAt);
      if (!isFinite(ts)) return;
      hasTs = true;
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
    });
    if (hasTs && maxTs > minTs) {
      var wall = (maxTs - minTs) / 1000;
      if (wall >= 0.5) return wall;
    }
    return null;
  }

  function formatDurationLabel(seconds) {
    var n = Number(seconds);
    if (!isFinite(n) || n < 0) return '';
    if (n < 1) return '';
    if (n < 60) {
      if (n < 10 && Math.abs(n - Math.round(n)) > 0.05) return n.toFixed(1) + ' 秒';
      return Math.round(n) + ' 秒';
    }
    var m = Math.floor(n / 60);
    var s = Math.round(n % 60);
    if (s === 60) {
      m += 1;
      s = 0;
    }
    return s ? (m + ' 分 ' + s + ' 秒') : (m + ' 分钟');
  }

  function actionItemStatus(item) {
    if (!item) return 'success';
    if (item.isError) return 'error';
    if (item.live) return 'running';
    if (item.progress != null && item.progress !== '') return 'running';
    return 'success';
  }

  function decorateProcessSegment(seg, live) {
    var items = seg.items || [];
    var errorCount = 0;
    items.forEach(function (it) {
      if (it && (it.isError || it.subagentStatus === 'error')) errorCount += 1;
    });
    seg.live = !!live;
    seg.errorCount = errorCount;
    seg.duration = live ? null : computeProcessDuration(items);
    return seg;
  }

  /**
   * 将专家回合拆成「过程段 + 可见内容段」
   * 连续的思考 / 工具 / 子智能体 / 进度提示收进一个过程段；回复、HITL、错误行保持在外。
   * liveExtras: { thought, steps, reply, pending }
   * pending: 仍在处理且尚未出现正式回复时，最后一段过程保持 live（展开）
   */
  function segmentExpertTurn(items, liveExtras) {
    liveExtras = liveExtras || {};
    var segs = [];
    var buf = [];

    function flushProcess(live) {
      if (!buf.length) return;
      var first = buf[0];
      segs.push(decorateProcessSegment({
        kind: 'process',
        id: 'process-' + (first && first.id ? first.id : segs.length),
        items: buf
      }, live));
      buf = [];
    }

    (items || []).forEach(function (item) {
      if (isProcessItem(item)) {
        buf.push(item);
        return;
      }
      flushProcess(false);
      segs.push({
        kind: 'content',
        id: item.id || ('content-' + segs.length),
        item: item
      });
    });

    var liveItems = [];
    var replyText = liveExtras.reply || '';
    var awaitingOutput = !!liveExtras.pending && !replyText;
    if (liveExtras.thought || liveExtras.thinking) {
      liveItems.push({
        id: 'live-thought',
        type: 'thought',
        content: liveExtras.thought || '',
        live: !replyText
      });
    }
    (liveExtras.steps || []).forEach(function (step) {
      liveItems.push(Object.assign({}, step, {
        live: !replyText && step.live !== false
      }));
    });
    if (liveItems.length) buf = buf.concat(liveItems);
    flushProcess(awaitingOutput);

    if (replyText) {
      segs.push({
        kind: 'content',
        id: 'live-reply',
        item: { id: 'live-reply', type: 'chat', content: replyText, live: true }
      });
    }
    return segs;
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
      return {
        isOpen: !!this.open,
        elapsedSec: 0,
        tickTimer: null
      };
    },
    mounted: function () {
      if (this.isThinkingLive) this.startTick();
    },
    beforeUnmount: function () {
      this.stopTick();
    },
    watch: {
      open: function (val) {
        if (val && !this.isOpen) this.isOpen = true;
      },
      isThinkingLive: function (val) {
        if (val) this.startTick();
        else this.stopTick();
      }
    },
    methods: {
      startTick: function () {
        var self = this;
        this.stopTick();
        this.elapsedSec = 0;
        this.tickTimer = setInterval(function () {
          self.elapsedSec += 1;
        }, 1000);
      },
      stopTick: function () {
        if (this.tickTimer) {
          clearInterval(this.tickTimer);
          this.tickTimer = null;
        }
      },
      onSummaryClick: function (e) {
        if (!this.hasExpandableContent) e.preventDefault();
      },
      onToggle: function (e) {
        if (!this.hasExpandableContent) {
          if (e.target && e.target.open) e.target.open = false;
          this.isOpen = false;
          return;
        }
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
        if (this.kind === 'thought') {
          return this.live || this.status === 'thinking' || !!String(this.content || '').trim();
        }
        if (this.kind === 'subagent') {
          return !!(this.goal || this.summary || this.result || this.content
            || (this.params && Object.keys(this.params).length));
        }
        // 工具进行中、以及仅有参数/状态行时不展开
        if (this.live || this.status === 'running' || this.status === 'thinking') return false;
        if (String(this.result || '').trim()) return true;
        var content = String(this.content || '').trim();
        return !!(content && !isToolStatusLine(content));
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
      // 耗时：仅 thought 显示「N 秒」，其他场景不显示
      durationLabel: function () {
        if (this.kind !== 'thought') return '';
        if (this.isThinkingLive) return Math.max(0, Math.round(this.elapsedSec)) + ' 秒';
        var n = Number(this.duration);
        if (!isFinite(n)) return '';
        return n.toFixed(1) + ' 秒';
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
        if (this.content && !isToolStatusLine(this.content)) {
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
      <details class="activity-item" :class="[\'kind-\' + kind, \'status-\' + status, { \'is-live\': isThinkingLive, \'is-open\': isOpen, \'is-expandable\': hasExpandableContent }]" :open="isOpen ? \'\' : null" @toggle="onToggle">\
        <summary class="activity-summary" @click="onSummaryClick">\
          <span class="activity-kind-mark">{{ kindMark }}</span>\
          <span class="activity-prefix">{{ prefixText }}</span>\
          <span v-if="shouldShowTitle" class="activity-title">{{ title }}</span>\
          <span v-if="durationLabel" class="activity-duration">{{ durationLabel }}</span>\
          <span v-if="shouldShowStatus" class="activity-status" :class="\'is-\' + status">{{ statusMark }}</span>\
          <span v-if="hasExpandableContent" class="fold-chevron"></span>\
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
   * 处理过程折叠轨：把一轮中连续的思考 / 工具 / 子智能体收进一行
   * 处理中强制展开；出现正式回复后收起。回复气泡始终在外侧。
   */
  var ProcessTrace = {
    props: {
      live: { type: Boolean, default: false },
      duration: { type: Number, default: null }
    },
    data: function () {
      return {
        isOpen: !!this.live,
        elapsedSec: 0,
        frozenDuration: null,
        tickTimer: null
      };
    },
    mounted: function () {
      this.syncOpen(this.live);
      if (this.live) this.startTick();
    },
    beforeUnmount: function () {
      this.stopTick();
    },
    watch: {
      live: function (val) {
        this.syncOpen(val);
        if (val) {
          this.startTick();
          return;
        }
        this.frozenDuration = this.elapsedSec || this.frozenDuration;
        this.stopTick();
      }
    },
    methods: {
      syncOpen: function (live) {
        this.isOpen = !!live;
      },
      onToggle: function (e) {
        var details = e.target;
        if (this.live) {
          this.isOpen = true;
          if (details && details.open === false) details.open = true;
          return;
        }
        this.isOpen = !!details.open;
      },
      startTick: function () {
        var self = this;
        this.stopTick();
        this.elapsedSec = 0;
        this.tickTimer = setInterval(function () {
          self.elapsedSec += 1;
        }, 1000);
      },
      stopTick: function () {
        if (this.tickTimer) {
          clearInterval(this.tickTimer);
          this.tickTimer = null;
        }
      }
    },
    computed: {
      durationLabel: function () {
        var n = this.duration;
        if (n == null && this.live) n = this.elapsedSec;
        if (n == null) n = this.frozenDuration;
        return formatDurationLabel(n);
      },
      statusMark: function () {
        if (this.live) return '…';
        return '✓';
      }
    },
    template: '\
      <details class="process-trace" :class="{ \'is-live\': live, \'is-open\': isOpen }" :open="isOpen" @toggle="onToggle">\
        <summary class="process-trace-summary">\
          <span v-if="live" class="process-trace-spinner"></span>\
          <span class="process-trace-label">{{ live ? "处理中" : "处理完成" }}</span>\
          <span v-if="durationLabel" class="process-trace-duration">{{ durationLabel }}</span>\
          <span class="process-trace-status" :class="live ? \'is-running\' : \'is-success\'">{{ statusMark }}</span>\
          <span class="fold-chevron"></span>\
        </summary>\
        <div class="process-trace-body">\
          <slot />\
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
    ProcessTrace: ProcessTrace,
    ReplyBlock: ReplyBlock,
    UserMessage: UserMessage,
    StatusLine: StatusLine,
    ErrorRow: ErrorRow,
    statusContent: statusContent,
    actionItemStatus: actionItemStatus,
    segmentExpertTurn: segmentExpertTurn
  };
})();
