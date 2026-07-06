/**
 * 对话交互块组件集合
 * 包含：SubagentCard（委派事件容器） / ClarifyCard / ApprovalCard
 * 依赖：window.ChatBlocks.ActivityItem
 * 加载顺序：必须在 chat-blocks.js 之后
 */
(function () {
  var ActivityItem = (window.ChatBlocks || {}).ActivityItem;
  var ReplyBlock = (window.ChatBlocks || {}).ReplyBlock;

  function normalizeSubagentEvent(ev) {
    if (!ev) return ev;
    var item = Object.assign({}, ev);
    if (item.type === 'thought') {
      if (item.content) {
        item.content = String(item.content)
          .replace(/^Thought:\s*/i, '')
          .replace(/^子智能体[：:]\s*/, '');
      }
      var n = Number(item.duration);
      item.duration = isFinite(n) ? n : 0.8;
    }
    return item;
  }

  function toolStatus(ev) {
    if (ev.isError) return 'error';
    if (ev.progress != null && ev.progress !== '') return 'running';
    return 'success';
  }

  /**
   * 委派子智能体（外层容器）
   * 内部用 ActivityItem / ReplyBlock 渲染，与主对话流一致
   *
   * props:
   *   - subagentName: 子智能体名
   *   - goal: 目标描述
   *   - status: 委派状态（success / running / error）
   *   - duration: 耗时（秒）
   *   - summary: 子智能体产出摘要
   *   - events: 子智能体内部事件数组
   *     元素结构：{ id, type: 'thought'|'action'|'chat', content, toolName, params, summary, duration, isError }
   *   - renderMarkdown: 与主对话流相同的 markdown 渲染函数
   */
  var SubagentCard = {
    props: {
      subagentName: { type: String, default: '' },
      goal: { type: String, default: '' },
      status: { type: String, default: 'success' },
      duration: { type: Number, default: null },
      summary: { type: String, default: '' },
      events: { type: Array, default: function () { return []; } },
      renderMarkdown: { type: Function, default: null }
    },
    components: {
      ActivityItem: ActivityItem,
      ReplyBlock: ReplyBlock
    },
    computed: {
      outerSummary: function () {
        return this.events && this.events.length ? '' : this.summary;
      },
      normalizedEvents: function () {
        return (this.events || []).map(normalizeSubagentEvent);
      }
    },
    methods: {
      eventToolStatus: toolStatus
    },
    template: '\
      <activity-item\
        kind="subagent"\
        :status="status"\
        :title="subagentName"\
        :duration="duration"\
        :goal="goal"\
        :summary="outerSummary"\
        :open="false">\
        <template v-for="ev in normalizedEvents" :key="ev.id">\
          <activity-item\
            v-if="ev.type === \'thought\'"\
            kind="thought"\
            :status="ev.live ? \'thinking\' : \'success\'"\
            :content="ev.content"\
            :duration="ev.duration"\
            :live="!!ev.live" />\
          <activity-item\
            v-else-if="ev.type === \'action\'"\
            kind="tool"\
            :status="eventToolStatus(ev)"\
            :title="ev.toolName"\
            :summary="ev.summary"\
            :result="ev.result"\
            :params="ev.params"\
            :content="ev.content"\
            :live="!!ev.live" />\
          <reply-block\
            v-else-if="ev.type === \'chat\'"\
            :content="ev.content"\
            :render-markdown="renderMarkdown"\
            :live="!!ev.live" />\
        </template>\
      </activity-item>'
  };

  /**
   * 澄清提问卡片（HITL）
   * props: { requestId, question, choices, answer }
   * - pending 态（answer 为空）：展示选项按钮
   * - resolved 态（answer 有值）：展示已选答案
   * emits: 'answer' ({ requestId, choice })
   */
  var ClarifyCard = {
    props: {
      requestId: { type: String, default: '' },
      question: { type: String, default: '' },
      choices: { type: Array, default: function () { return []; } },
      answer: { type: String, default: null }
    },
    computed: {
      isResolved: function () {
        return this.answer !== null && this.answer !== undefined && this.answer !== '';
      }
    },
    methods: {
      selectChoice: function (choice) {
        if (this.isResolved) return;
        this.$emit('answer', { requestId: this.requestId, choice: choice });
      }
    },
    template: '\
      <div class="clarify-card" :class="{ \'is-resolved\': isResolved }">\
        <div class="clarify-header">\
          <span class="clarify-icon">❓</span>\
          <span class="clarify-question">{{ question }}</span>\
        </div>\
        <div v-if="!isResolved" class="clarify-choices">\
          <button v-for="c in choices" :key="c" type="button" class="clarify-choice-btn" @click="selectChoice(c)">{{ c }}</button>\
        </div>\
        <div v-else class="clarify-answer">\
          <span class="clarify-answer-label">已选择：</span>\
          <span class="clarify-answer-value">{{ answer }}</span>\
        </div>\
      </div>'
  };

  /**
   * 危险操作审批卡片（HITL）
   * props: { requestId, command, description, allowPermanent, choice }
   * - pending 态（choice 为空）：展示允许 / 允许并记住 / 拒绝 按钮
   * - resolved 态（choice 有值）：展示已选决定
   * emits: 'resolve' ({ requestId, choice, permanent })
   */
  var ApprovalCard = {
    props: {
      requestId: { type: String, default: '' },
      command: { type: String, default: '' },
      description: { type: String, default: '' },
      allowPermanent: { type: Boolean, default: false },
      choice: { type: String, default: null }
    },
    computed: {
      isResolved: function () {
        return this.choice !== null && this.choice !== undefined && this.choice !== '';
      },
      choiceLabel: function () {
        if (this.choice === 'allow') return '已允许';
        if (this.choice === 'allow_permanent') return '已允许并记住';
        if (this.choice === 'deny') return '已拒绝';
        return this.choice;
      }
    },
    methods: {
      resolve: function (choice) {
        if (this.isResolved) return;
        var permanent = choice === 'allow_permanent';
        this.$emit('resolve', { requestId: this.requestId, choice: choice, permanent: permanent });
      }
    },
    template: '\
      <div class="approval-card" :class="{ \'is-resolved\': isResolved }">\
        <div class="approval-header">\
          <span class="approval-icon">🔐</span>\
          <span class="approval-title">操作审批</span>\
        </div>\
        <div class="approval-command" v-if="command">\
          <span class="approval-command-label">命令：</span>\
          <code class="approval-command-code">{{ command }}</code>\
        </div>\
        <div class="approval-desc" v-if="description">{{ description }}</div>\
        <div v-if="!isResolved" class="approval-actions">\
          <button type="button" class="approval-btn approval-btn-allow" @click="resolve(\'allow\')">允许</button>\
          <button v-if="allowPermanent" type="button" class="approval-btn approval-btn-allow-perm" @click="resolve(\'allow_permanent\')">允许并记住</button>\
          <button type="button" class="approval-btn approval-btn-deny" @click="resolve(\'deny\')">拒绝</button>\
        </div>\
        <div v-else class="approval-resolved" :class="\'resolved-\' + choice">{{ choiceLabel }}</div>\
      </div>'
  };

  /**
   * HITL 卡片（合并 ClarifyCard + ApprovalCard）
   * 用于两类场景：
   *   - pending：在输入区上方的固定区显示
   *   - resolved：作为历史消息沉到对话流
   *
   * props:
   *   variant: 'clarify' | 'approval'
   *   data:    { question?, choices?, answer?, command?, description?, allowPermanent?, choice? }
   *   mode:    'pending' | 'resolved'  （默认 'pending'）
   *
   * emits:
   *   answer  ({ requestId, choice })           // variant === 'clarify'
   *   resolve ({ requestId, choice, permanent }) // variant === 'approval'
   */
  var HitlCard = {
    props: {
      variant: { type: String, required: true },
      data:    { type: Object, required: true },
      mode:    { type: String, default: 'pending' }
    },
    emits: ['answer', 'resolve'],
    computed: {
      isPending:  function () { return this.mode === 'pending'; },
      isResolved: function () { return this.mode === 'resolved'; },
      isDanger:   function () { return this.variant === 'approval'; },
      isClarify:  function () { return this.variant === 'clarify'; },

      requestId: function () { return this.data.requestId || ''; },
      question:  function () { return this.data.question || ''; },
      choices:   function () { return this.data.choices || []; },
      command:   function () { return this.data.command || ''; },
      description: function () { return this.data.description || ''; },
      allowPermanent: function () { return !!this.data.allowPermanent; },

      headerTitle: function () {
        if (this.isClarify) return this.isPending ? '专家需要澄清' : '澄清提问';
        return this.isPending ? '危险操作待审批' : '操作审批';
      },
      headerBadge: function () {
        if (!this.isPending) return '';
        return this.isClarify ? '等待选择' : '等待确认';
      },
      headerIcon: function () {
        if (this.isClarify) return '❓';
        return this.isPending ? '⚠' : '🔐';
      },

      resolvedAnswer: function () {
        return this.data.answer != null ? this.data.answer : '';
      },
      resolvedChoiceLabel: function () {
        var c = this.data.choice;
        if (c === 'allow') return '已允许';
        if (c === 'allow_permanent') return '已允许并记住';
        if (c === 'deny') return '已拒绝';
        return c || '';
      }
    },
    methods: {
      onSelectChoice: function (choice) {
        if (!this.isPending) return;
        this.$emit('answer', { requestId: this.requestId, choice: choice });
      },
      onResolve: function (choice) {
        if (!this.isPending) return;
        var permanent = choice === 'allow_permanent';
        this.$emit('resolve', { requestId: this.requestId, choice: choice, permanent: permanent });
      }
    },
    template: '\
      <div class="hitl-card"\
           :class="[\'variant-\' + variant, \'mode-\' + mode, isDanger ? \'is-danger\' : \'\']">\
        <div class="hitl-card-header">\
          <span class="hitl-card-icon">{{ headerIcon }}</span>\
          <span class="hitl-card-title">{{ headerTitle }}</span>\
          <span v-if="isPending && headerBadge" class="hitl-card-badge">{{ headerBadge }}</span>\
          <span v-else-if="isPending" class="hitl-card-pulse"></span>\
        </div>\
        <div class="hitl-card-body">\
          <template v-if="isClarify">\
            <div v-if="question" class="hitl-card-question">{{ question }}</div>\
            <div v-if="isPending && choices.length" class="hitl-card-choices">\
              <button v-for="c in choices" :key="c"\
                      type="button"\
                      class="hitl-card-choice-btn"\
                      @click="onSelectChoice(c)">{{ c }}</button>\
            </div>\
            <div v-else-if="isPending && !choices.length" class="hitl-card-hint">\
              请在下方输入框回复（回答后输入区将自动启用）\
            </div>\
            <div v-else-if="isResolved" class="hitl-card-resolved">\
              <span class="hitl-card-resolved-label">已选择：</span>\
              <span class="hitl-card-resolved-value">{{ resolvedAnswer }}</span>\
            </div>\
          </template>\
          <template v-else>\
            <div v-if="command" class="hitl-card-command">\
              <span class="hitl-card-command-label">即将执行</span>\
              <code class="hitl-card-command-code">{{ command }}</code>\
            </div>\
            <div v-if="description" class="hitl-card-desc">{{ description }}</div>\
            <div v-if="isPending" class="hitl-card-actions">\
              <button type="button" class="hitl-card-btn hitl-card-btn-allow"\
                      @click="onResolve(\'allow\')">允许</button>\
              <button v-if="allowPermanent"\
                      type="button"\
                      class="hitl-card-btn hitl-card-btn-allow-perm"\
                      @click="onResolve(\'allow_permanent\')">允许并记住</button>\
              <button type="button" class="hitl-card-btn hitl-card-btn-deny"\
                      @click="onResolve(\'deny\')">拒绝</button>\
            </div>\
            <div v-else class="hitl-card-resolved"\
                 :class="\'resolved-\' + data.choice">{{ resolvedChoiceLabel }}</div>\
          </template>\
        </div>\
      </div>'
  };

  window.ChatInteractive = {
    SubagentCard: SubagentCard,
    HitlCard: HitlCard,
    ClarifyCard: ClarifyCard,
    ApprovalCard: ApprovalCard
  };
})();
