/**
 * 对话交互块组件集合
 * 包含：SubagentCard / ClarifyCard / ApprovalCard
 * 依赖：window.ChatBlocks (ThoughtBlock / ToolCard / ReplyBlock)
 * 加载顺序：必须在 chat-blocks.js 之后
 */
(function () {
  var Blocks = window.ChatBlocks || {};
  var ThoughtBlock = Blocks.ThoughtBlock;
  var ToolCard = Blocks.ToolCard;
  var ReplyBlock = Blocks.ReplyBlock;

  /**
   * 子代理卡片（单层嵌套，不递归）
   * props: { subagentName, goal, events }
   * - events: 子代理内部事件数组，元素结构同主消息
   *   { id, type: 'thought'|'action'|'chat', content, toolName, params, summary, duration, isError }
   */
  var SubagentCard = {
    props: {
      subagentName: { type: String, default: '' },
      goal: { type: String, default: '' },
      events: { type: Array, default: function () { return []; } }
    },
    components: {
      ThoughtBlock: ThoughtBlock,
      ToolCard: ToolCard,
      ReplyBlock: ReplyBlock
    },
    template: '\
      <div class="subagent-card">\
        <div class="subagent-summary">\
          <span class="subagent-icon">🤖</span>\
          <span class="subagent-body">\
            <span class="subagent-title">子代理</span>\
            <span class="subagent-name" v-if="subagentName">[{{ subagentName }}]</span>\
            <span class="subagent-goal" v-if="goal">{{ goal }}</span>\
          </span>\
        </div>\
        <details v-if="events && events.length" class="subagent-events-details">\
          <summary class="subagent-events-toggle">查看活动详情（{{ events.length }}）</summary>\
          <div class="subagent-events">\
            <template v-for="ev in events" :key="ev.id">\
              <thought-block v-if="ev.type === \'thought\'" :content="ev.content" />\
              <tool-card v-else-if="ev.type === \'action\'" :tool-name="ev.toolName" :content="ev.content" :params="ev.params" :summary="ev.summary" :duration="ev.duration" :is-error="ev.isError" />\
              <reply-block v-else-if="ev.type === \'chat\'" :content="ev.content" />\
            </template>\
          </div>\
        </details>\
      </div>'
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

  window.ChatInteractive = {
    SubagentCard: SubagentCard,
    ClarifyCard: ClarifyCard,
    ApprovalCard: ApprovalCard
  };
})();
