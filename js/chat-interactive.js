/**
 * 对话交互块组件集合
 * 包含：SubagentCard / ClarifyCard / ApprovalCard / ExpertTurnFlow
 * 依赖：window.ChatBlocks.ActivityItem / ProcessTrace
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
   * 澄清提问卡片（HITL）—— 新原型
   *
   * 支持两种模式（自动推断，亦可显式指定 mode）：
   *   - 'choice'（多选）：最多 4 个预设选项 + "其他（输入你的答案）" 内联输入
   *   - 'open'（开放）：单一自由输入框
   *
   * 交互规则（按需求文档）：
   *   - 点击预设选项：选中它，并清空 Other
   *   - 在 Other 输入：取消预设选中
   *   - Enter：提交当前答案（IME 组词态不触发）
   *   - Shift+Enter：换行（仅 Other / 开放模式输入框）
   *   - A/B/C/D：快速选中对应预设；E：聚焦 Other
   *   - 跳过：发送空字符串 ""
   *   - 提交中：Continue 按钮显示 loading，所有输入禁用
   *
   * props: { requestId, question, choices, answer, mode }
   * emits: 'answer' ({ requestId, choice })
   *   - choice 为预设文本 / Other 文本 / ""（跳过）
   */
  var ClarifyCard = {
    props: {
      requestId: { type: String, default: '' },
      question:  { type: String, default: '' },
      choices:   { type: Array,  default: function () { return []; } },
      answer:    { type: String, default: null },
      mode:      { type: String, default: null }
    },
    data: function () {
      return {
        // -2 = 尚未选择；-1 = Other；>=0 = 预设下标
        selectedIndex: -2,
        otherValue: '',
        submitting: false,
        isComposing: false,
        resolvedInit: false
      };
    },
    computed: {
      isResolved: function () {
        return this.answer !== null && this.answer !== undefined;
      },
      effectiveMode: function () {
        if (this.mode === 'choice' || this.mode === 'open') return this.mode;
        return (this.choices && this.choices.length) ? 'choice' : 'open';
      },
      choiceKeys: function () { return ['A', 'B', 'C', 'D']; },
      currentAnswer: function () {
        if (this.selectedIndex >= 0 && this.selectedIndex < (this.choices || []).length) {
          return this.choices[this.selectedIndex];
        }
        if (this.selectedIndex === -1) return (this.otherValue || '').trim();
        return '';
      },
      hasSelection: function () {
        if (this.submitting || this.isResolved) return false;
        if (this.effectiveMode === 'choice') {
          if (this.selectedIndex >= 0) return true;
          if (this.selectedIndex === -1) return (this.otherValue || '').trim().length > 0;
          return false;
        }
        return (this.otherValue || '').trim().length > 0;
      },
      resolvedDisplay: function () {
        if (this.answer === '' || this.answer == null) {
          return { kind: 'skip', label: '已跳过' };
        }
        var idx = (this.choices || []).indexOf(this.answer);
        if (idx >= 0) return { kind: 'preset', label: this.answer, index: idx };
        return { kind: 'other', label: this.answer };
      }
    },
    watch: {
      answer: {
        immediate: true,
        handler: function (val) {
          if (val != null && !this.resolvedInit) {
            this.initFromAnswer(val);
          } else if (val == null) {
            this.selectedIndex = -2;
            this.otherValue = '';
            this.submitting = false;
            this.isComposing = false;
            this.resolvedInit = false;
          }
        }
      }
    },
    methods: {
      initFromAnswer: function (val) {
        if (val === '' || val == null) {
          this.selectedIndex = -2;
        } else {
          var idx = (this.choices || []).indexOf(val);
          if (idx >= 0) {
            this.selectedIndex = idx;
            this.otherValue = '';
          } else {
            this.selectedIndex = -1;
            this.otherValue = val;
          }
        }
        this.resolvedInit = true;
      },
      selectOption: function (idx) {
        if (this.isResolved || this.submitting) return;
        if (idx === -1) {
          this.selectedIndex = -1;
          this.$nextTick(this.focusOther);
        } else {
          this.selectedIndex = idx;
          this.otherValue = '';
        }
      },
      focusOther: function () {
        var el = this.$refs.otherInput || this.$refs.openTextarea;
        if (el && typeof el.focus === 'function') {
          el.focus();
          try {
            var len = (el.value || '').length;
            if (typeof el.setSelectionRange === 'function') el.setSelectionRange(len, len);
          } catch (e) { /* ignore */ }
        }
      },
      onOtherInput: function () {
        if (this.selectedIndex !== -1) this.selectedIndex = -1;
      },
      onOtherKeydown: function (e) {
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.submit();
        }
      },
      onOpenKeydown: function (e) {
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.submit();
        }
      },
      onCompositionStart: function () { this.isComposing = true; },
      onCompositionEnd: function () { this.isComposing = false; },
      submit: function () {
        if (this.submitting || this.isResolved) return;
        if (!this.hasSelection) return;
        var answer = this.currentAnswer;
        var self = this;
        this.submitting = true;
        setTimeout(function () {
          self.$emit('answer', { requestId: self.requestId, choice: answer });
        }, 260);
      },
      skip: function () {
        if (this.submitting || this.isResolved) return;
        var self = this;
        this.submitting = true;
        setTimeout(function () {
          self.$emit('answer', { requestId: self.requestId, choice: '' });
        }, 200);
      },
      onDocumentKeydown: function (e) {
        if (this.isResolved || this.submitting) return;
        if (e.isComposing || e.keyCode === 229) return;
        var t = e.target;
        var isOurInput = t === this.$refs.otherInput || t === this.$refs.openTextarea;
        var tag = (t && t.tagName) || '';
        var isInputLike = tag === 'INPUT' || tag === 'TEXTAREA';
        var key = (e.key || '').toUpperCase();
        if (this.effectiveMode === 'choice') {
          if (!isInputLike && key >= 'A' && key <= 'D') {
            var idx = key.charCodeAt(0) - 65;
            if (idx < (this.choices || []).length) {
              e.preventDefault();
              this.selectOption(idx);
              return;
            }
          }
          if (!isInputLike && key === 'E') {
            e.preventDefault();
            this.selectOption(-1);
            return;
          }
          if (key === 'ENTER' && !isOurInput) {
            e.preventDefault();
            this.submit();
          }
        } else {
          if (key === 'ENTER' && !isOurInput) {
            e.preventDefault();
            this.submit();
          }
        }
      }
    },
    mounted: function () {
      document.addEventListener('keydown', this.onDocumentKeydown);
    },
    beforeUnmount: function () {
      document.removeEventListener('keydown', this.onDocumentKeydown);
    },
    template: '\
      <div class="clarify-card"\
           :class="{\
             \'is-resolved\': isResolved,\
             \'is-submitting\': submitting,\
             \'mode-choice\': effectiveMode === \'choice\',\
             \'mode-open\': effectiveMode === \'open\'\
           }">\
        <div class="clarify-header">\
          <span class="clarify-icon" aria-hidden="true">❓</span>\
          <span class="clarify-question">{{ question }}</span>\
        </div>\
        <div v-if="!isResolved" class="clarify-body">\
          <template v-if="effectiveMode === \'choice\'">\
            <div class="clarify-options" role="listbox" aria-label="澄清选项">\
              <button v-for="(c, idx) in choices" :key="idx"\
                      type="button"\
                      role="option"\
                      class="clarify-option"\
                      :class="{ \'is-selected\': selectedIndex === idx }"\
                      :aria-selected="selectedIndex === idx"\
                      :disabled="submitting"\
                      @click="selectOption(idx)">\
                <span class="clarify-option-kbd">{{ choiceKeys[idx] }}</span>\
                <span class="clarify-option-text">{{ c }}</span>\
                <span class="clarify-option-check" aria-hidden="true">✓</span>\
              </button>\
              <div class="clarify-option is-other"\
                   :class="{ \'is-selected\': selectedIndex === -1 }">\
                <div class="clarify-option-other-row">\
                  <span class="clarify-option-kbd">E</span>\
                  <span class="clarify-option-text">其他（输入你的答案）</span>\
                </div>\
                <input ref="otherInput"\
                       type="text"\
                       class="clarify-option-other-input"\
                       :value="otherValue"\
                       @input="onOtherInput; otherValue = $event.target.value"\
                       @keydown="onOtherKeydown"\
                       @compositionstart="onCompositionStart"\
                       @compositionend="onCompositionEnd"\
                       :disabled="submitting"\
                       placeholder="在此输入..." />\
              </div>\
            </div>\
          </template>\
          <template v-else>\
            <textarea ref="openTextarea"\
                      class="clarify-textarea"\
                      :value="otherValue"\
                      @input="otherValue = $event.target.value"\
                      @keydown="onOpenKeydown"\
                      @compositionstart="onCompositionStart"\
                      @compositionend="onCompositionEnd"\
                      :disabled="submitting"\
                      placeholder="请输入..."\
                      rows="3"></textarea>\
          </template>\
          <div class="clarify-actions">\
            <button type="button"\
                    class="clarify-skip-btn"\
                    @click="skip"\
                    :disabled="submitting">跳过</button>\
            <button type="button"\
                    class="clarify-continue-btn"\
                    @click="submit"\
                    :disabled="submitting || !hasSelection">\
              <span v-if="submitting" class="clarify-spinner" aria-hidden="true"></span>\
              <span v-else class="clarify-continue-label">继续</span>\
              <span v-if="!submitting" class="clarify-kbd-hint" aria-hidden="true">⏎</span>\
            </button>\
          </div>\
        </div>\
        <div v-else class="clarify-resolved">\
          <template v-if="resolvedDisplay.kind === \'skip\'">\
            <span class="clarify-resolved-label">已跳过</span>\
          </template>\
          <template v-else-if="resolvedDisplay.kind === \'preset\'">\
            <span class="clarify-resolved-label">已选择：</span>\
            <span class="clarify-resolved-value">\
              <span class="clarify-resolved-kbd">{{ choiceKeys[resolvedDisplay.index] }}</span>\
              {{ resolvedDisplay.label }}\
            </span>\
          </template>\
          <template v-else>\
            <span class="clarify-resolved-label">已选择：</span>\
            <span class="clarify-resolved-value">{{ resolvedDisplay.label }}</span>\
          </template>\
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
    data: function () {
      return {
        selectedChoiceIndex: -1,
        otherValue: '',
        otherExpanded: false,
        otherFocused: false,
        submitting: false,
        isComposing: false
      };
    },
    computed: {
      isPending:  function () { return this.mode === 'pending'; },
      isResolved: function () { return this.mode === 'resolved'; },
      isDanger:   function () { return this.variant === 'approval'; },
      isClarify:  function () { return this.variant === 'clarify'; },

      requestId: function () { return this.data.requestId || ''; },
      question:  function () { return this.data.question || ''; },
      choices:   function () { return (this.data.choices || []).slice(0, 4); },
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
      otherKey: function () {
        return String.fromCharCode(65 + this.choices.length);
      },
      clarifyAnswer: function () {
        if (this.selectedChoiceIndex >= 0 && this.selectedChoiceIndex < this.choices.length) {
          return this.choices[this.selectedChoiceIndex];
        }
        return (this.otherValue || '').trim();
      },
      hasClarifyAnswer: function () {
        return this.isClarify && this.isPending && !this.submitting && this.clarifyAnswer.length > 0;
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
        if (!this.isClarify || !this.isPending || this.submitting) return;
        this.selectedChoiceIndex = this.choices.indexOf(choice);
        this.otherValue = '';
        this.otherExpanded = false;
        this.otherFocused = false;
      },
      activateOther: function () {
        if (!this.isClarify || !this.isPending || this.submitting) return;
        this.selectedChoiceIndex = -1;
        this.otherExpanded = true;
        var self = this;
        this.$nextTick(function () {
          var el = self.$refs.otherInput;
          if (el && typeof el.focus === 'function') el.focus();
        });
      },
      onOtherInput: function (event) {
        this.otherValue = event.target.value;
        this.selectedChoiceIndex = -1;
      },
      onClarifyKeydown: function (event) {
        if (event.isComposing || event.keyCode === 229) return;
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          this.submitClarify();
        }
      },
      submitClarify: function () {
        if (!this.hasClarifyAnswer) return;
        var self = this;
        this.submitting = true;
        setTimeout(function () {
          self.$emit('answer', { requestId: self.requestId, choice: self.clarifyAnswer });
        }, 220);
      },
      skipClarify: function () {
        if (!this.isClarify || !this.isPending || this.submitting) return;
        var self = this;
        this.submitting = true;
        setTimeout(function () {
          self.$emit('answer', { requestId: self.requestId, choice: '' });
        }, 180);
      },
      onClarifyDocumentKeydown: function (event) {
        if (!this.isClarify || !this.isPending || this.submitting || event.isComposing || event.keyCode === 229) return;
        if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
        var target = event.target;
        var tag = (target && target.tagName) || '';
        var isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable);
        var key = (event.key || '').toUpperCase();

        if (!isInput && key >= 'A' && key <= 'D') {
          var index = key.charCodeAt(0) - 65;
          if (index < this.choices.length) {
            event.preventDefault();
            this.onSelectChoice(this.choices[index]);
            return;
          }
        }
        if (!isInput && key === this.otherKey) {
          event.preventDefault();
          this.activateOther();
          return;
        }
        if (!isInput && key === 'ENTER' && this.hasClarifyAnswer) {
          event.preventDefault();
          this.submitClarify();
        }
      },
      onResolve: function (choice) {
        if (!this.isPending) return;
        var permanent = choice === 'allow_permanent';
        this.$emit('resolve', { requestId: this.requestId, choice: choice, permanent: permanent });
      }
    },
    mounted: function () {
      document.addEventListener('keydown', this.onClarifyDocumentKeydown);
    },
    beforeUnmount: function () {
      document.removeEventListener('keydown', this.onClarifyDocumentKeydown);
    },
    template: '\
      <div class="hitl-card"\
           :class="[\'variant-\' + variant, \'mode-\' + mode, isDanger ? \'is-danger\' : \'\']">\
        <div class="hitl-card-header" :class="{ \'is-clarify\': isClarify }">\
          <template v-if="isClarify">\
            <span class="hitl-card-icon">{{ headerIcon }}</span>\
            <span class="hitl-card-title">{{ question }}</span>\
          </template>\
          <template v-else>\
            <span class="hitl-card-icon">{{ headerIcon }}</span>\
            <span class="hitl-card-title">{{ headerTitle }}</span>\
            <span v-if="isPending && headerBadge" class="hitl-card-badge">{{ headerBadge }}</span>\
            <span v-else-if="isPending" class="hitl-card-pulse"></span>\
          </template>\
        </div>\
        <div class="hitl-card-body">\
          <template v-if="isClarify">\
            <div v-if="isPending && choices.length" class="hitl-clarify-options" role="group" aria-label="澄清选项">\
              <button v-for="(choice, index) in choices" :key="choice + index"\
                      type="button"\
                      class="hitl-clarify-option"\
                      :class="{ \'is-selected\': selectedChoiceIndex === index }"\
                      :aria-pressed="selectedChoiceIndex === index"\
                      :disabled="submitting"\
                      @click="onSelectChoice(choice)">\
                <span class="hitl-clarify-key">{{ String.fromCharCode(65 + index) }}</span>\
                <span class="hitl-clarify-option-text">{{ choice }}</span>\
              </button>\
              <button v-if="!otherExpanded && !otherValue"\
                      type="button"\
                      class="hitl-clarify-option hitl-clarify-other-trigger"\
                      :disabled="submitting"\
                      @click="activateOther">\
                <span class="hitl-clarify-key">{{ otherKey }}</span>\
                <span class="hitl-clarify-option-text">其他（输入你的答案）</span>\
              </button>\
              <label v-else class="hitl-clarify-other" :class="{ \'is-focused\': otherFocused, \'is-filled\': otherValue.trim() }">\
                <span class="hitl-clarify-key">{{ otherKey }}</span>\
                <textarea ref="otherInput"\
                          class="hitl-clarify-other-input"\
                          :disabled="submitting"\
                          :value="otherValue"\
                          @blur="otherFocused = false"\
                          @compositionend="isComposing = false"\
                          @compositionstart="isComposing = true"\
                          @focus="otherFocused = true"\
                          @input="onOtherInput"\
                          @keydown="onClarifyKeydown"\
                          placeholder="其他（输入你的答案）"\
                          rows="1"></textarea>\
              </label>\
            </div>\
            <div v-else-if="isPending" class="hitl-clarify-open">\
              <textarea ref="otherInput"\
                        class="hitl-clarify-open-input"\
                        :disabled="submitting"\
                        :value="otherValue"\
                        @compositionend="isComposing = false"\
                        @compositionstart="isComposing = true"\
                        @input="onOtherInput"\
                        @keydown="onClarifyKeydown"\
                        placeholder="请输入你的答案"\
                        rows="3"></textarea>\
            </div>\
            <div v-if="isPending" class="hitl-clarify-actions">\
              <button type="button" class="hitl-clarify-skip" :disabled="submitting" @click="skipClarify">跳过</button>\
              <button type="button" class="hitl-clarify-continue" :disabled="submitting || !hasClarifyAnswer" @click="submitClarify">\
                <span v-if="submitting" class="hitl-clarify-spinner" aria-hidden="true"></span>\
                <template v-else>继续 <span class="hitl-clarify-enter" aria-hidden="true">⏎</span></template>\
              </button>\
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

  /**
   * 专家在对话中生成文件后的轻量展示条。
   * 父级负责把 preview / download 接到工作空间的既有能力上。
   */
  var GeneratedFileCard = {
    props: {
      file: { type: Object, required: true }
    },
    emits: ['preview', 'download'],
    computed: {
      name: function () { return this.file.name || this.file.fileName || '未命名文件'; },
      sizeLabel: function () {
        var bytes = Number(this.file.size || 0);
        if (!isFinite(bytes) || bytes <= 0) return '文件已生成';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      },
      extension: function () {
        var match = this.name.match(/\.([a-z0-9]{1,5})$/i);
        return match ? match[1].toUpperCase() : 'FILE';
      },
      kind: function () {
        var ext = this.extension.toLowerCase();
        if (/^(xlsx|xls|csv)$/.test(ext)) return 'sheet';
        if (ext === 'pdf') return 'pdf';
        if (/^(doc|docx|md|txt)$/.test(ext)) return 'document';
        if (/^(png|jpe?g|gif|webp|svg)$/.test(ext)) return 'image';
        return 'file';
      }
    },
    template: '\
      <section class="generated-file-card" :class="\'file-kind-\' + kind" :aria-label="\'已生成文件：\' + name">\
        <span class="generated-file-icon" aria-hidden="true">\
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">\
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>\
            <polyline points="14 2 14 8 20 8"/>\
          </svg>\
          <span>{{ extension }}</span>\
        </span>\
        <div class="generated-file-meta">\
          <span class="generated-file-name" :title="name">{{ name }}</span>\
          <span class="generated-file-size">{{ sizeLabel }}</span>\
        </div>\
        <div class="generated-file-actions">\
          <button type="button" class="generated-file-action" title="预览文件" @click="$emit(\'preview\', file)">\
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></svg>\
            <span>预览</span>\
          </button>\
          <button type="button" class="generated-file-action" title="下载文件" @click="$emit(\'download\', file)">\
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>\
            <span>下载</span>\
          </button>\
        </div>\
      </section>'
  };

  /**
   * 专家回合内容流：过程折叠轨 + 回复 / HITL / 错误行
   * segments 来自 ChatBlocks.segmentExpertTurn
   */
  var ExpertTurnFlow = {
    props: {
      segments: { type: Array, default: function () { return []; } },
      renderMarkdown: { type: Function, default: null }
    },
    components: {
      ProcessTrace: (window.ChatBlocks || {}).ProcessTrace,
      ActivityItem: ActivityItem,
      ReplyBlock: ReplyBlock,
      StatusLine: (window.ChatBlocks || {}).StatusLine,
      ErrorRow: (window.ChatBlocks || {}).ErrorRow,
      SubagentCard: SubagentCard,
      HitlCard: HitlCard,
      GeneratedFileCard: GeneratedFileCard
    },
    emits: ['preview-file', 'download-file'],
    methods: {
      actionStatus: (window.ChatBlocks || {}).actionItemStatus || function () { return 'success'; }
    },
    template: '\
      <div class="expert-turn-flow">\
      <template v-for="seg in segments" :key="seg.id">\
        <process-trace\
          v-if="seg.kind === \'process\'"\
          :live="!!seg.live"\
          :duration="seg.duration">\
          <template v-for="item in seg.items" :key="item.id">\
            <activity-item v-if="item.type === \'thought\'" kind="thought" :status="item.live ? \'thinking\' : \'success\'" :content="item.content" :duration="item.duration" :live="!!item.live" :open="false" />\
            <activity-item v-else-if="item.type === \'action\'" kind="tool" :status="actionStatus(item)" :title="item.toolName" :summary="item.summary" :result="item.result" :params="item.params" :content="item.content" :duration="item.duration" :live="!!item.live" />\
            <subagent-card v-else-if="item.type === \'subagent\'" :subagent-name="item.subagentName" :goal="item.goal" :status="item.subagentStatus || \'success\'" :duration="item.subagentDuration" :summary="item.subagentSummary" :events="item.subagentEvents" :render-markdown="renderMarkdown" />\
            <status-line v-else-if="item.type === \'status\'" :kind="item.statusKind" :content="item.content" />\
          </template>\
        </process-trace>\
        <template v-else-if="seg.item">\
          <hitl-card v-if="seg.item.type === \'clarify\' && seg.item.answer != null" variant="clarify" :data="seg.item" mode="resolved" />\
          <hitl-card v-else-if="seg.item.type === \'approval\' && seg.item.choice != null" variant="approval" :data="seg.item" mode="resolved" />\
          <generated-file-card v-else-if="seg.item.type === \'generated_file\'" :file="seg.item" @preview="$emit(\'preview-file\', $event)" @download="$emit(\'download-file\', $event)" />\
          <error-row v-else-if="seg.item.type === \'error\'" :content="seg.item.content" />\
          <reply-block v-else-if="seg.item.type !== \'clarify\' && seg.item.type !== \'approval\' && seg.item.type !== \'generated_file\'" :content="seg.item.content" :render-markdown="renderMarkdown" :attachments="seg.item.attachments" :live="!!seg.item.live" />\
        </template>\
      </template>\
      </div>'
  };

  window.ChatInteractive = {
    SubagentCard: SubagentCard,
    HitlCard: HitlCard,
    ClarifyCard: ClarifyCard,
    ApprovalCard: ApprovalCard,
    GeneratedFileCard: GeneratedFileCard,
    ExpertTurnFlow: ExpertTurnFlow
  };
})();
