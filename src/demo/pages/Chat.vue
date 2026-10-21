<template>
  <div v-if="expert" class="pc-chat">
    <header class="pc-top">
      <div class="pc-top-left">
        <button class="pc-back" aria-label="返回专家列表" @click="back">
          <i class="el-icon-arrow-left" />
        </button>
        <button
          class="pc-expert"
          type="button"
          title="打开专家管理页"
          :aria-label="'打开' + expert.name + '的管理页'"
          @click="openManage"
        >
          <img :src="avatarSrcFor(expert)" :alt="expert.name" /><strong>{{
            expert.name
          }}</strong>
        </button>
      </div>
      <div class="pc-top-actions">
        <button
          class="pc-primary"
          title="新建任务"
          aria-label="新建任务"
          @click="newTask"
        >
          <i class="el-icon-plus" /> 新建任务</button
        ><button
          type="button"
          class="pc-outline pc-panel-toggle"
          :class="{ active: taskListVisible }"
          :title="taskListVisible ? '收起任务列表' : '展开任务列表'"
          :aria-label="taskListVisible ? '收起任务列表' : '展开任务列表'"
          :aria-expanded="taskListVisible ? 'true' : 'false'"
          aria-controls="pc-task-panel"
          @click="toggleTaskList"
        >
          <i class="el-icon-tickets" /> 任务列表
        </button>
        <button
          type="button"
          class="pc-outline pc-panel-toggle"
          :class="{ active: workspaceOpen }"
          :title="workspaceOpen ? '收起工作空间' : '展开工作空间'"
          :aria-label="workspaceOpen ? '收起工作空间' : '展开工作空间'"
          :aria-expanded="workspaceOpen ? 'true' : 'false'"
          aria-controls="pc-workspace-panel"
          @click="toggleWorkspace"
        >
          <i class="el-icon-folder-opened" /> 工作空间
        </button>
      </div>
    </header>
    <div v-if="pageNotifications.length" class="pc-page-notices">
      <span v-for="notice in pageNotifications" :key="notice.key">{{
        notice.text
      }}</span>
    </div>
    <div class="pc-body">
      <section
        v-if="conversation"
        class="pc-main"
        :class="{ 'is-task-list-collapsed': taskListCollapsed }"
      >
        <div v-if="conversation.archived" class="pc-archived">
          此任务已归档，不会出现在右侧任务列表。可在专家管理页「任务」的「归档任务」弹窗中恢复。
        </div>
        <div class="pc-messages-wrap">
          <div ref="scroller" class="pc-messages">
            <div v-if="!conversation.messages.length" class="pc-intro">
              <div class="pc-intro-avatar">
                <img :src="avatarSrcFor(expert)" :alt="expert.name" />
              </div>
              <h1>{{ expert.name }}</h1>
              <p>{{ expert.description }}</p>
              <div class="pc-intro-tip">
                在下方输入任务指令并发送，将自动新建任务并开始对话
              </div>
            </div>
            <div
              v-for="message in conversation.messages"
              :id="'message-' + message.id"
              :key="message.id"
              class="pc-message"
              :class="message.role"
            >
              <template v-if="message.role === 'assistant'">
                <div class="pc-sender">
                  <img :src="avatarSrcFor(expert)" :alt="expert.name" /><span>{{
                    expert.name
                  }}</span>
                </div>
                <div class="pc-process">
                  <button
                    type="button"
                    :aria-expanded="processExpanded(message)"
                    @click="toggleProcess(message.id)"
                  >
                    {{ turnStatusLabel(message) }}
                    <span v-if="turnDurationLabel(message)">{{
                      turnDurationLabel(message)
                    }}</span>
                    <i
                      v-if="hasProcessContent(message)"
                      :class="
                        processExpanded(message)
                          ? 'el-icon-arrow-down'
                          : 'el-icon-arrow-right'
                      "
                    />
                  </button>
                  <div
                    v-if="
                      hasProcessContent(message) && processExpanded(message)
                    "
                    class="pc-process-steps"
                  >
                    <template v-for="block in turnProcessBlocks(message)">
                      <div
                        v-if="block.type === 'group'"
                        :key="block.id"
                        class="pc-activity-group"
                      >
                        <button
                          type="button"
                          class="pc-activity-title"
                          :aria-expanded="expandedActivities.includes(block.id)"
                          @click="toggleActivityGroup(block.id)"
                        >
                          {{ activityGroupLabel(block.activities) }}
                          <i
                            :class="
                              expandedActivities.includes(block.id)
                                ? 'el-icon-arrow-down'
                                : 'el-icon-arrow-right'
                            "
                          />
                        </button>
                        <div
                          v-for="step in expandedActivities.includes(block.id)
                            ? block.activities
                            : []"
                          :key="step.id"
                          class="pc-process-activity"
                        >
                          <button
                            type="button"
                            class="pc-process-step"
                            :disabled="!activityHasDetail(step)"
                            :aria-expanded="
                              activityHasDetail(step)
                                ? expandedActivityIds.includes(step.id)
                                : undefined
                            "
                            @click="toggleActivityDetail(step.id)"
                          >
                            <span class="pc-process-step-mark">◉</span>
                            <span>{{ activityItemTitle(step) }}</span>
                            <i
                              v-if="activityHasDetail(step)"
                              :class="
                                expandedActivityIds.includes(step.id)
                                  ? 'el-icon-arrow-down'
                                  : 'el-icon-arrow-right'
                              "
                            />
                          </button>
                          <div
                            v-if="
                              activityHasDetail(step) &&
                              expandedActivityIds.includes(step.id)
                            "
                            class="pc-process-detail"
                          >
                            <pre
                              v-if="
                                step.inputDetail &&
                                ['terminal', 'execute_code'].includes(step.name)
                              "
                              class="pc-tool-code"
                              >{{ step.inputDetail }}</pre>
                            <div v-else-if="step.inputDetail">
                              {{ step.inputDetail }}
                            </div>
                            <div v-if="step.detail">{{ step.detail }}</div>
                            <pre
                              v-if="
                                step.outputDetail && step.outputKind === 'diff'
                              "
                              class="pc-tool-diff"
                              >{{ step.outputDetail }}</pre>
                            <div v-else-if="step.outputDetail">
                              {{ step.outputDetail }}
                            </div>
                            <button
                              v-if="childConversationFor(step)"
                              type="button"
                              class="pc-child-session-link"
                              @click="selectTask(childConversationFor(step))"
                            >
                              查看子会话
                            </button>
                          </div>
                        </div>
                      </div>
                      <div
                        v-else
                        :key="block.id"
                        class="pc-reply pc-process-interim"
                      >
                        <ConversationMarkdown :text="block.text" />
                      </div>
                    </template>
                  </div>
                </div>
                <div v-if="turnTemporary(message)" class="pc-temporary">
                  {{ turnTemporary(message) }}
                </div>
                <div
                  v-for="request in turnRequests(message)"
                  :key="request.id"
                  class="pc-human-record"
                >
                  <span class="pc-human-question"
                    >{{ requestKindLabel(request.kind) }}：{{
                      request.prompt
                    }}</span
                  >
                  <span
                    v-for="question in request.questions || []"
                    :key="question.qid"
                    class="pc-human-question"
                  >
                    {{ question.question }}
                    <strong
                      v-if="acceptedAnswerLabel(request, question.qid)"
                      class="pc-human-answer"
                    >
                      已接收：{{ acceptedAnswerLabel(request, question.qid) }}
                    </strong>
                  </span>
                  <strong
                    v-if="
                      request.status === 'resolved' &&
                      !(request.questions || []).length
                    "
                    class="pc-human-answer"
                  >
                    {{ requestResponseLabel(request) }}
                  </strong>
                  <span
                    v-if="request.status !== 'resolved'"
                    class="pc-human-waiting"
                    >{{
                      request.status === "expired" ? "请求已失效" : "等待回应"
                    }}</span
                  >
                </div>
                <div v-if="message.content" class="pc-reply">
                  <ConversationMarkdown :text="message.content" /><span
                    v-if="message.status === 'streaming'"
                    class="typing-cursor"
                    >▍</span
                  >
                </div>
                <div
                  v-if="
                    turnResultFiles(message).length ||
                    turnTodoResults(message).length
                  "
                  class="pc-results"
                >
                  <div class="pc-results-label">本轮结果</div>
                  <button
                    v-for="item in turnResultFiles(message)"
                    :key="item.id"
                    type="button"
                    @click="previewFile(item)"
                  >
                    <i class="el-icon-document" /> {{ item.name }}
                  </button>
                  <div
                    v-for="result in turnTodoResults(message)"
                    :key="result.id"
                    class="pc-result-todo"
                  >
                    <strong>{{ result.label }}</strong>
                    <div v-for="item in result.items" :key="item.id">
                      {{ todoStatusLabel(item.status) }} · {{ item.content }}
                    </div>
                  </div>
                </div>
                <div v-if="message.error" class="pc-error-line">
                  <i class="el-icon-warning-outline" /> {{ message.error }}
                </div>
              </template>
              <div v-else class="pc-user-bubble">
                <div v-if="message.content">{{ message.content }}</div>
                <div
                  v-if="message.attachments && message.attachments.length"
                  class="pc-user-attachments"
                >
                  <button
                    v-for="attachment in message.attachments"
                    :key="attachment.id"
                    type="button"
                    :disabled="!fileItemById(attachment.id)"
                    @click="previewFile(fileItemById(attachment.id))"
                  >
                    <i class="el-icon-document" /> {{ attachment.name }}
                    <span v-if="!fileItemById(attachment.id)"
                      >（文件已不可用）</span
                    >
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="questionPreviews.length"
            class="pc-question-rail"
            aria-label="问题快速定位"
          >
            <el-popover
              v-for="(item, index) in questionPreviews"
              :key="item.message.id"
              placement="right"
              trigger="hover"
              :open-delay="120"
              width="360"
              popper-class="pc-question-popover"
            >
              <div class="pc-question-preview">
                <div class="pc-question-preview-head">
                  <strong>{{ userQuestionLabel(item.message) }}</strong>
                  <button
                    type="button"
                    class="pc-question-mark"
                    :class="{ 'is-marked': isQuestionMarked(item.message.id) }"
                    :title="
                      isQuestionMarked(item.message.id)
                        ? '取消标记'
                        : '标记问题'
                    "
                    :aria-label="
                      isQuestionMarked(item.message.id)
                        ? '取消标记'
                        : '标记问题'
                    "
                    :aria-pressed="isQuestionMarked(item.message.id)"
                    @click.stop="toggleQuestionMark(item.message.id)"
                  >
                    <svg viewBox="0 0 20 22" aria-hidden="true">
                      <path
                        d="M4 2.5h12a1 1 0 0 1 1 1v16l-7-4.5-7 4.5v-16a1 1 0 0 1 1-1Z"
                      />
                    </svg>
                  </button>
                </div>
                <p>
                  {{ item.finalReply || "尚无最终回复" }}
                </p>
              </div>
              <button
                slot="reference"
                type="button"
                class="pc-question-bar"
                :class="{
                  'is-marked': isQuestionMarked(item.message.id),
                  'is-hovered': hoveredQuestionIndex === index,
                  'is-neighbor':
                    hoveredQuestionIndex !== null &&
                    Math.abs(hoveredQuestionIndex - index) === 1,
                  'is-nearby':
                    hoveredQuestionIndex !== null &&
                    Math.abs(hoveredQuestionIndex - index) === 2,
                }"
                :aria-label="userQuestionLabel(item.message)"
                :aria-pressed="isQuestionMarked(item.message.id)"
                @mouseenter="hoveredQuestionIndex = index"
                @mouseleave="hoveredQuestionIndex = null"
                @focus="hoveredQuestionIndex = index"
                @blur="hoveredQuestionIndex = null"
                @click="jumpTo(item.message.id)"
              />
            </el-popover>
          </div>
        </div>
        <div
          v-if="pendingInteraction"
          class="pc-hitl-pin"
          :class="{
            attention: ['approval', 'mcp_setup'].includes(
              pendingInteraction.kind,
            ),
          }"
        >
          <div class="pc-hitl-card">
            <div class="pc-hitl-header">
              <span class="pc-hitl-icon"
                ><i
                  :class="
                    ['approval', 'mcp_setup'].includes(pendingInteraction.kind)
                      ? 'el-icon-lock'
                      : 'el-icon-question'
                  " /></span
              ><strong>{{ requestKindLabel(pendingInteraction.kind) }}</strong
              ><span class="pc-hitl-badge">等待回应</span>
            </div>
            <div class="pc-hitl-body">
              <p>{{ pendingInteraction.content }}</p>
              <template v-if="pendingInteraction.kind === 'clarify'"
                ><div
                  v-if="
                    pendingInteraction.questions &&
                    pendingInteraction.questions.length
                  "
                  class="pc-hitl-questions"
                >
                  <div
                    v-for="question in pendingInteraction.questions"
                    :key="question.qid"
                    class="pc-hitl-question"
                  >
                    <p>{{ question.question }}</p>
                    <el-checkbox-group
                      v-if="question.multiSelect"
                      :value="
                        acceptedAnswerValue(pendingInteraction, question.qid) ||
                        clarifyAnswers[question.qid] ||
                        []
                      "
                      :disabled="
                        !!acceptedAnswerLabel(pendingInteraction, question.qid)
                      "
                      @input="setClarifyAnswer(question.qid, $event)"
                    >
                      <el-checkbox
                        v-for="choice in question.choices"
                        :key="choice"
                        :label="choice"
                      />
                    </el-checkbox-group>
                    <el-radio-group
                      v-else-if="question.choices.length"
                      :value="
                        acceptedAnswerValue(pendingInteraction, question.qid) ||
                        clarifyAnswers[question.qid] ||
                        ''
                      "
                      :disabled="
                        !!acceptedAnswerLabel(pendingInteraction, question.qid)
                      "
                      @input="setClarifyAnswer(question.qid, $event)"
                    >
                      <el-radio
                        v-for="choice in question.choices"
                        :key="choice"
                        :label="choice"
                      />
                    </el-radio-group>
                    <el-input
                      v-else
                      :value="
                        acceptedAnswerValue(pendingInteraction, question.qid) ||
                        clarifyAnswers[question.qid] ||
                        ''
                      "
                      :disabled="
                        !!acceptedAnswerLabel(pendingInteraction, question.qid)
                      "
                      placeholder="请输入补充信息"
                      @input="setClarifyAnswer(question.qid, $event)"
                    />
                  </div>
                </div>
                <el-input
                  v-else
                  v-model="clarifyDraft"
                  placeholder="请输入补充信息"
                />
                <div class="pc-hitl-actions">
                  <button
                    v-if="
                      !pendingInteraction.questions ||
                      !pendingInteraction.questions.length
                    "
                    class="pc-hitl-suggestion"
                    @click="clarifyDraft = '分析最近一周的 1 号产线'"
                  >
                    最近一周 · 1 号产线</button
                  ><button
                    class="primary"
                    :disabled="!canSubmitClarification"
                    @click="submitClarification"
                  >
                    提交回复
                  </button>
                </div></template
              >
              <div
                v-else-if="['secret', 'sudo'].includes(pendingInteraction.kind)"
                class="pc-hitl-actions"
              >
                <span>纯演示模式不收集真实凭据</span>
                <button @click="resolveDecision('rejected')">取消</button>
                <button class="primary" @click="resolveDecision('submitted')">
                  模拟安全提交
                </button>
              </div>
              <div v-else class="pc-hitl-actions">
                <button
                  v-for="choice in pendingInteraction.choices"
                  :key="choice.value"
                  :class="{
                    primary: choice.value !== 'rejected',
                    reject: choice.value === 'rejected',
                  }"
                  @click="resolveDecision(choice.value)"
                >
                  {{ choice.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="sessionStatusCards.length" class="pc-status-pin">
          <div
            v-for="card in sessionStatusCards"
            :key="card.key"
            class="pc-status-card"
            :class="`is-${card.key}`"
          >
            <button
              type="button"
              class="pc-status-header"
              :aria-expanded="statusExpanded[card.key]"
              :aria-controls="`pc-status-body-${card.key}`"
              @click="toggleStatus(card.key)"
            >
              <span class="pc-status-icon"
                ><i :class="controlCardIcon(card.key)"
              /></span>
              <strong>{{ card.title }}</strong>
              <span class="pc-status-summary" :title="card.summary">{{
                card.summary
              }}</span>
              <span class="pc-status-meta">{{ card.meta }}</span>
              <i
                class="pc-status-chevron"
                :class="
                  statusExpanded[card.key]
                    ? 'el-icon-arrow-up'
                    : 'el-icon-arrow-down'
                "
              />
            </button>
            <div
              v-if="card.key === 'todo'"
              class="pc-todo-progress"
              role="progressbar"
              :aria-valuenow="card.progress.done"
              aria-valuemin="0"
              :aria-valuemax="card.progress.total"
              :aria-label="card.meta"
            >
              <span :style="{ width: `${card.progress.percent}%` }" />
            </div>
            <div
              v-show="statusExpanded[card.key]"
              :id="`pc-status-body-${card.key}`"
              class="pc-status-body"
            >
              <div v-if="card.key === 'todo'" class="pc-todo-body">
                <div
                  v-for="item in card.items"
                  :key="item.id"
                  class="pc-todo-item"
                  :class="`is-${item.state}`"
                  :style="{ paddingLeft: `${item.depth * 20 + 14}px` }"
                >
                  <span class="pc-todo-item-icon"
                    ><i :class="todoStatusIcon(item.state)"
                  /></span>
                  <span class="pc-todo-item-text">{{ item.text }}</span>
                  <span class="pc-todo-item-status">{{ item.status }}</span>
                </div>
              </div>
              <div v-else-if="card.key === 'queue'" class="pc-queue-body">
                <div
                  v-for="(item, index) in card.items"
                  :key="item.id"
                  class="pc-queue-item"
                >
                  <button
                    type="button"
                    class="pc-queue-row"
                    :aria-expanded="expandedQueueItemId === item.id"
                    @click="
                      expandedQueueItemId =
                        expandedQueueItemId === item.id ? null : item.id
                    "
                  >
                    <span class="pc-queue-order">{{ index + 1 }}</span>
                    <span class="pc-queue-title">{{ item.title }}</span>
                    <span class="pc-queue-state">{{ item.status }}</span>
                    <i
                      :class="
                        expandedQueueItemId === item.id
                          ? 'el-icon-arrow-up'
                          : 'el-icon-arrow-down'
                      "
                    />
                  </button>
                  <p
                    v-if="expandedQueueItemId === item.id"
                    class="pc-queue-detail"
                  >
                    {{ item.content }}
                  </p>
                </div>
              </div>
              <div v-else-if="card.items.length" class="pc-control-items">
                <div
                  v-for="item in card.items"
                  :key="item.id"
                  class="pc-control-item"
                  :style="{ paddingLeft: `${item.depth * 16}px` }"
                >
                  <span>{{ item.status }}</span>
                  <span>{{ item.text }}</span>
                </div>
              </div>
              <div v-else class="pc-status-empty">暂无更多详情</div>
            </div>
          </div>
        </div>
        <div
          class="pc-input-area"
          :class="{ 'has-session-status': sessionStatusCards.length }"
        >
          <div
            v-if="
              !pendingInteraction &&
              expert.presetEnabled &&
              expert.presetQuestions.length
            "
            class="pc-preset"
          >
            <el-popover
              placement="top-start"
              trigger="click"
              width="420"
              popper-class="pc-preset-popover"
              ><strong>预置问题</strong
              ><button
                v-for="(question, index) in expert.presetQuestions"
                :key="question"
                @click="
                  draft = question;
                  focusComposer();
                "
              >
                <b>{{ index + 1 }}</b
                >{{ question }}</button
              ><button slot="reference" class="pc-preset-trigger">
                <i class="el-icon-chat-line-round" /> 预置问题
                <i class="el-icon-arrow-up" /></button
            ></el-popover>
          </div>
          <div class="pc-composer">
            <div v-if="pendingFiles.length" class="pc-pending-files">
              <div
                v-for="file in pendingFiles"
                :key="file.id"
                class="pc-pending-file"
              >
                <span class="pc-pending-icon"
                  ><i class="el-icon-document"
                /></span>
                <span class="pc-pending-meta"
                  ><strong :title="file.name">{{ file.name }}</strong
                  ><small>{{ fileSizeLabel(file.size) }}</small></span
                >
                <button title="移除" @click="removePendingFile(file)">×</button>
              </div>
            </div>
            <textarea
              ref="composer"
              v-model="draft"
              :disabled="!!pendingInteraction"
              rows="2"
              placeholder="向专家输入任务指令..."
              @input="pathPopoverDismissed = false"
              @keydown.esc="pathPopoverDismissed = true"
              @keydown.enter.exact.prevent="handleEnter"
            />
            <div
              v-if="fileMatches.length && !pathPopoverDismissed"
              class="pc-path-popover"
            >
              <div class="pc-path-popover-head">文件路径补全</div>
              <button
                v-for="file in fileMatches"
                :key="file.id"
                @mousedown.prevent="selectPathFile(file)"
              >
                <i class="el-icon-document" /><strong>{{ file.name }}</strong
                ><small>{{ filePath(file) }}</small>
              </button>
            </div>
            <div class="pc-composer-actions">
              <label class="pc-attachment-control" title="上传文件">
                <input
                  type="file"
                  aria-label="上传文件"
                  :disabled="!!pendingInteraction"
                  @change="attachFile"
                />
                <i class="el-icon-paperclip" /> </label
              ><button
                class="pc-send"
                :class="{ 'pc-send-stop': conversation.status === 'running' }"
                :disabled="
                  !!pendingInteraction ||
                  (!draft.trim() &&
                    !pendingFiles.length &&
                    conversation.status !== 'running')
                "
                :title="
                  conversation.status === 'running'
                    ? '停止生成'
                    : '发送 (Enter)'
                "
                @click="conversation.status === 'running' ? stop() : send()"
              >
                <i
                  :class="
                    conversation.status === 'running'
                      ? 'el-icon-video-pause'
                      : 'el-icon-position'
                  "
                />
              </button>
            </div>
            <div class="pc-composer-hint">
              {{
                pendingInteraction
                  ? "请先处理上方确认"
                  : "Enter 发送 · Shift + Enter 换行 · @file: 引用文件"
              }}
            </div>
            <div class="pc-config">
              <el-popover
                v-model="modelPickerVisible"
                placement="top-start"
                trigger="click"
                width="560"
                popper-class="pc-model-picker-popper"
                ><div class="pc-model-picker">
                  <div class="pc-model-tabs">
                    <button
                      :class="{ active: modelTab === 'platform' }"
                      @click="modelTab = 'platform'"
                    >
                      平台模型
                    </button>
                    <button
                      :class="{ active: modelTab === 'manual' }"
                      @click="modelTab = 'manual'"
                    >
                      手动填写的模型
                    </button>
                  </div>
                  <div class="pc-model-list">
                    <template v-if="modelTab === 'platform'">
                      <button
                        v-for="option in platformModels"
                        :key="option.name"
                        class="pc-model-option"
                        :class="{ active: model === option.name }"
                        @click="selectModel(option.name)"
                      >
                        <strong>{{ option.name }}</strong
                        ><span class="pc-model-tag">{{ option.tag }}</span
                        ><small>{{ option.context }}</small>
                      </button>
                    </template>
                    <template v-else
                      ><button
                        class="pc-model-option"
                        :class="{ active: model === '通用大模型' }"
                        @click="selectModel('通用大模型')"
                      >
                        <strong>通用大模型</strong
                        ><span class="pc-model-tag manual">手动</span
                        ><small>演示模型</small>
                      </button></template
                    >
                  </div>
                </div>
                <button slot="reference" class="pc-config-trigger">
                  模型: {{ model }} <i class="el-icon-caret-bottom" /></button
              ></el-popover>
              <el-popover
                v-model="cwdPickerVisible"
                placement="top-start"
                trigger="click"
                width="230"
                popper-class="pc-config-popover"
                ><button
                  @click="
                    setCwd('/');
                    cwdPickerVisible = false;
                  "
                >
                  工作空间
                </button>
                <button
                  class="pc-cwd-workspace"
                  @click="
                    cwdPickerVisible = false;
                    showWorkspaceForCwd();
                  "
                >
                  在工作空间中选择…</button
                ><button slot="reference" class="pc-config-trigger">
                  工作目录: {{ cwdLabel(conversation.cwd) }}
                  <i class="el-icon-caret-bottom" /></button
              ></el-popover>
            </div>
          </div>
        </div>
      </section>
      <aside
        id="pc-task-panel"
        class="pc-tasks"
        :class="{
          'is-action-reveal-paused': taskActionsPaused,
          'mobile-open': taskListOpen,
          'is-collapsed': taskListCollapsed,
        }"
        @mousemove="taskActionsPaused = false"
        @mouseleave="taskActionsPaused = false"
      >
        <div class="pc-panel-head">
          <span class="pc-panel-icon"><i class="el-icon-tickets" /></span
          ><strong>任务列表</strong>
        </div>
        <div class="pc-task-scroll">
          <div class="pc-task-list">
            <div
              v-for="item in visibleConversations"
              :key="item.id"
              class="pc-task"
              :class="{
                active: conversation && item.id === conversation.id,
                pinned: !!item.pinned,
              }"
              @mouseenter="startTaskMarquee(item, $event)"
              @mouseleave="stopTaskMarquee($event)"
              @focusin="startTaskMarquee(item, $event)"
              @focusout="stopTaskMarquee($event)"
              @click="selectTask(item)"
            >
              <span
                v-if="item.pinned"
                class="pc-task-pinned-marker"
                role="img"
                aria-label="已置顶"
                title="已置顶"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 3h6l-1 5 3 3v2H7v-2l3-3-1-5Z" />
                  <path d="M12 13v8" />
                </svg>
              </span>
              <div class="pc-task-line">
                <button
                  class="pc-task-title"
                  :title="item.title"
                  @click.stop="selectTask(item)"
                >
                  <span
                    class="pc-task-title-text"
                    :class="{ marquee: marqueeTaskId === item.id }"
                    :style="
                      marqueeTaskId === item.id
                        ? {
                            '--pc-task-marquee-distance': `${marqueeDistance}px`,
                            '--pc-task-marquee-duration': `${marqueeDuration}s`,
                          }
                        : null
                    "
                    >{{ item.title }}</span
                  ></button
                ><span v-if="item.status === 'running'" class="pc-spinner" />
                <div class="pc-task-actions">
                  <button
                    type="button"
                    title="编辑名称"
                    aria-label="编辑名称"
                    @click.stop="openTaskDialog('rename', item)"
                  >
                    <i class="el-icon-edit-outline" />
                  </button>
                  <button
                    class="pc-task-pin-action"
                    :title="item.pinned ? '取消置顶' : '置顶'"
                    @click.stop="togglePin(item)"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M9 3h6l-1 5 3 3v2H7v-2l3-3-1-5Z" />
                      <path d="M12 13v8" />
                    </svg></button
                  ><button
                    title="归档任务"
                    @click.stop="openTaskDialog('archive', item)"
                  >
                    <i class="el-icon-receiving" /></button
                  ><button
                    title="删除任务"
                    @click.stop="openTaskDialog('delete', item)"
                  >
                    <i class="el-icon-delete" />
                  </button>
                </div>
              </div>
              <button
                class="pc-task-cwd"
                :title="'打开工作目录：' + cwdLabel(item.cwd, 'workspace')"
                :aria-label="'打开工作目录：' + cwdLabel(item.cwd, 'workspace')"
                @click.stop="openWorkspace(item)"
              >
                <i class="el-icon-folder pc-task-cwd-icon" />
                <span class="pc-task-cwd-label">工作目录：</span>
                <span class="pc-task-cwd-name">{{
                  taskCwdName(item.cwd)
                }}</span>
                <i class="el-icon-arrow-right pc-task-cwd-arrow" />
              </button>
            </div>
            <div v-if="!visibleConversations.length" class="pc-task-empty">
              暂无任务
            </div>
          </div>
        </div>
      </aside>
      <aside
        v-show="workspaceOpen"
        id="pc-workspace-panel"
        class="pc-workspace"
      >
        <div class="pc-panel-head">
          <span class="pc-panel-icon"><i class="el-icon-folder-opened" /></span
          ><strong>工作空间</strong
          ><button
            :title="'上传文件到' + workspaceFolderName"
            @click="$refs.workspaceUpload.click()"
          >
            <i class="el-icon-upload2" /></button
          ><button
            :title="'在' + workspaceFolderName + '下新建文件夹'"
            @click="openFolderDialog"
          >
            <i class="el-icon-folder-add" />
          </button>
        </div>
        <div class="pc-workspace-tree">
          <div
            class="pc-workspace-root-row"
            :class="{
              selected: workspaceFolderId === null,
              cwd: conversation && conversation.cwd === '/',
            }"
          >
            <button class="pc-workspace-root" @click="workspaceFolderId = null">
              <i class="el-icon-folder-opened" /> workspace
            </button>
            <el-tooltip
              content="设为工作目录"
              placement="top"
              effect="light"
              :open-delay="320"
              :enterable="false"
            >
              <button
                class="pc-workspace-set-cwd"
                aria-label="将 workspace 设为工作目录"
                @click.stop="setCwd('/')"
              >
                <span class="pc-folder-settings-icon" aria-hidden="true">
                  <i class="el-icon-folder" /><i class="el-icon-setting" />
                </span>
              </button>
            </el-tooltip>
          </div>
          <div
            v-for="node in workspaceTreeRows"
            :key="node.item.id"
            class="pc-workspace-row"
            :class="{
              selected: workspaceFolderId === node.item.id,
              cwd:
                conversation && conversation.cwd === folderPath(node.item.id),
            }"
            :style="{ paddingLeft: 8 + node.depth * 8 + 'px' }"
          >
            <button
              class="pc-workspace-entry"
              :title="node.item.name"
              @click="
                node.item.kind === 'folder'
                  ? toggleFolder(node.item)
                  : previewFile(node.item)
              "
            >
              <i
                v-if="node.item.kind === 'folder'"
                :class="
                  expandedFolderIds.includes(node.item.id)
                    ? 'el-icon-arrow-down'
                    : 'el-icon-arrow-right'
                "
                class="pc-tree-arrow"
              />
              <span v-else class="pc-tree-arrow" />
              <span class="pc-tree-icon">{{ workspaceIcon(node.item) }}</span>
              <span class="pc-tree-name">{{ node.item.name }}</span></button
            ><el-tooltip
              v-if="
                node.item.kind === 'folder' &&
                conversation &&
                conversation.cwd !== folderPath(node.item.id)
              "
              content="设为工作目录"
              placement="top"
              effect="light"
              :open-delay="320"
              :enterable="false"
            >
              <button
                class="pc-workspace-set-cwd"
                :aria-label="'将' + node.item.name + '设为工作目录'"
                @click="setCwd(folderPath(node.item.id))"
              >
                <span class="pc-folder-settings-icon" aria-hidden="true">
                  <i class="el-icon-folder" /><i class="el-icon-setting" />
                </span></button></el-tooltip
            ><button
              v-if="node.item.kind === 'file'"
              title="下载文件"
              @click="downloadFile(node.item)"
            >
              <i class="el-icon-download" />
            </button>
          </div>
          <p v-if="!workspaceTreeRows.length">当前目录暂无文件</p>
        </div>
        <input
          ref="workspaceUpload"
          type="file"
          hidden
          multiple
          @change="uploadWorkspaceFiles"
        />
      </aside>
    </div>
    <el-dialog
      :visible.sync="taskDialogVisible"
      :width="taskDialogMode === 'rename' ? '460px' : '420px'"
      :custom-class="
        taskDialogMode === 'rename'
          ? 'pc-dialog pc-task-rename-dialog'
          : 'pc-task-dialog'
      "
      append-to-body
      :close-on-click-modal="false"
      ><div
        v-if="taskDialogMode === 'rename'"
        slot="title"
        class="pc-dialog-head"
      >
        <div class="pc-dialog-icon"><i class="el-icon-edit-outline" /></div>
        <div>
          <strong>编辑任务名称</strong
          ><span>为这项任务设置一个易于识别的名称</span>
        </div>
      </div>
      <span v-else slot="title" class="pc-task-dialog-title">{{
        taskDialogMode === "archive" ? "归档任务" : "删除任务"
      }}</span>
      <div
        v-if="taskDialogMode === 'rename'"
        class="pc-dialog-body pc-task-rename-body"
      >
        <label><em>*</em> 任务名称</label>
        <el-input
          ref="renameInput"
          v-model="taskNameDraft"
          maxlength="100"
          show-word-limit
          clearable
          placeholder="请输入任务名称"
          @keyup.enter.native="confirmTaskDialog"
        />
        <p class="pc-task-rename-hint">
          修改名称不会影响任务的对话记录和工作目录。
        </p>
      </div>
      <div v-else class="pc-dialog-body">
        <p>
          {{
            taskDialogMode === "archive"
              ? "归档当前任务将放弃未发送的输入，确定继续？"
              : "确定删除该任务？对话记录将被删除，相关产物不会删除"
          }}
        </p>
      </div>
      <div slot="footer" class="pc-dialog-footer">
        <el-button @click="taskDialogVisible = false">取消</el-button
        ><el-button
          :type="taskDialogMode === 'delete' ? 'danger' : 'primary'"
          @click="confirmTaskDialog"
          >{{
            taskDialogMode === "rename"
              ? "保存名称"
              : taskDialogMode === "archive"
                ? "归档"
                : "删除"
          }}</el-button
        >
      </div></el-dialog
    >
    <el-dialog
      :visible.sync="folderDialogVisible"
      width="420px"
      custom-class="pc-dialog"
      append-to-body
      :close-on-click-modal="false"
      ><div slot="title" class="pc-dialog-head">
        <div class="pc-dialog-icon"><i class="el-icon-folder-add" /></div>
        <div>
          <strong>新建文件夹</strong><span>整理工作空间中的文件与任务产物</span>
        </div>
      </div>
      <div class="pc-dialog-body">
        <div class="pc-folder-target">
          <span>目标位置</span><i class="el-icon-folder-opened" />
          <strong>{{ workspaceFolderName }}</strong>
        </div>
        <label><em>*</em> 文件夹名称</label
        ><el-input
          ref="folderNameInput"
          v-model="folderNameDraft"
          maxlength="60"
          show-word-limit
          placeholder="例如：分析报告、原始数据"
          @keyup.enter.native="createFolder"
        />
      </div>
      <div slot="footer" class="pc-dialog-footer">
        <el-button @click="folderDialogVisible = false">取消</el-button
        ><el-button
          type="primary"
          :disabled="!folderNameDraft.trim()"
          @click="createFolder"
          >创建</el-button
        >
      </div></el-dialog
    >
    <el-dialog
      :visible.sync="previewVisible"
      width="720px"
      custom-class="pc-dialog pc-preview-dialog"
      append-to-body
      @closed="clearPreview"
      ><div slot="title" class="pc-dialog-head">
        <div class="pc-dialog-icon"><i class="el-icon-document" /></div>
        <div>
          <strong>{{ previewItem && previewItem.name }}</strong
          ><span>工作空间文件 · 只读预览</span>
        </div>
      </div>
      <div class="pc-preview-body">
        <img
          v-if="previewUrl"
          :src="previewUrl"
          :alt="previewItem && previewItem.name"
        />
        <pre v-else>{{ previewText }}</pre>
      </div>
      <div slot="footer" class="pc-dialog-footer">
        <el-button @click="previewVisible = false">关闭</el-button
        ><el-button type="primary" @click="downloadFile(previewItem)"
          >下载文件</el-button
        >
      </div></el-dialog
    >
  </div>
  <el-empty v-else description="专家不存在" />
</template>

<script>
import {
  state,
  expertById,
  conversationById,
  createConversation,
  conversationTitleFromFirstMessage,
  updateConversation,
  deleteConversation,
  sendDemoMessage,
  resolveDemoRequest,
  stopDemoStream,
  addWorkspaceItem,
  persist,
} from "../state";
import { saveFile, readFile } from "../file-db";
import { avatarSrcFor } from "../avatar";
import {
  conversationProcessBlocks,
  formatTurnDuration,
} from "../conversation-turns";
import {
  emptySessionPresentation,
  todoProgress,
} from "../conversation-session-state";
import ConversationMarkdown from "../components/ConversationMarkdown.vue";
function emptyConversation() {
  return {
    id: null,
    title: "",
    status: "ready",
    archived: false,
    cwd: "/",
    messages: [],
    turns: [],
    sessionPresentation: emptySessionPresentation(),
  };
}
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default {
  name: "DemoChatPage",
  components: { ConversationMarkdown },
  data() {
    return {
      state,
      draft: "",
      draftConversation: emptyConversation(),
      taskActionsPaused: false,
      workspaceOpen: false,
      taskListOpen: false,
      taskListCollapsed: false,
      isNarrowViewport:
        typeof window !== "undefined" && window.innerWidth <= 900,
      statusExpanded: {
        goal: false,
        todo: false,
        queue: false,
        loop: false,
        heartbeat: false,
      },
      expandedQueueItemId: null,
      hoveredQuestionIndex: null,
      workspaceFolderId: null,
      expandedFolderIds: [],
      model: "gpt-4o",
      modelTab: "platform",
      modelPickerVisible: false,
      cwdPickerVisible: false,
      platformModels: [
        { name: "gpt-4o", tag: "平台", context: "128K" },
        { name: "通用大模型", tag: "平台", context: "演示配置" },
      ],
      pendingFiles: [],
      clarifyDraft: "",
      clarifyAnswers: {},
      pathPopoverDismissed: false,
      marqueeTaskId: null,
      marqueeDistance: 0,
      marqueeDuration: 6,
      expandedProcess: [],
      expandedActivities: [],
      expandedActivityIds: [],
      clockNow: Date.now(),
      taskDialogVisible: false,
      taskDialogMode: "rename",
      taskDialogTarget: null,
      taskNameDraft: "",
      folderDialogVisible: false,
      folderNameDraft: "",
      previewVisible: false,
      previewItem: null,
      previewText: "",
      previewUrl: "",
    };
  },
  computed: {
    taskListVisible() {
      return this.isNarrowViewport
        ? this.taskListOpen
        : !this.taskListCollapsed;
    },
    expert() {
      return expertById(this.$route.params.id);
    },
    conversation() {
      const existing = this.$route.query.conv
        ? conversationById(this.$route.query.conv)
        : null;
      return existing?.expertId === this.$route.params.id
        ? existing
        : this.draftConversation;
    },
    isDraftTask() {
      return this.conversation === this.draftConversation;
    },
    visibleConversations() {
      return state.conversations
        .filter(
          (item) => item.expertId === this.$route.params.id && !item.archived,
        )
        .sort(
          (a, b) =>
            Number(!!b.pinned) - Number(!!a.pinned) ||
            String(b.updatedAt).localeCompare(String(a.updatedAt)),
        );
    },
    expertFolders() {
      return this.expert
        ? this.expert.files.filter(
            (item) => item.kind === "folder" && !item.parentId,
          )
        : [];
    },
    workspaceItems() {
      return this.expert
        ? this.expert.files
            .filter((item) => item.parentId === this.workspaceFolderId)
            .sort((a, b) =>
              a.kind === b.kind
                ? a.name.localeCompare(b.name)
                : a.kind === "folder"
                  ? -1
                  : 1,
            )
        : [];
    },
    workspaceFolderName() {
      return this.workspaceFolderId
        ? this.expert.files.find((item) => item.id === this.workspaceFolderId)
            ?.name || "workspace"
        : "workspace";
    },
    workspaceTreeRows() {
      if (!this.expert) return [];
      const rows = [];
      const visit = (parentId, depth) => {
        const children = this.expert.files
          .filter((item) => item.parentId === parentId)
          .sort((a, b) =>
            a.kind === b.kind
              ? a.name.localeCompare(b.name)
              : a.kind === "folder"
                ? -1
                : 1,
          );
        for (const item of children) {
          rows.push({ item, depth });
          if (
            item.kind === "folder" &&
            this.expandedFolderIds.includes(item.id)
          )
            visit(item.id, depth + 1);
        }
      };
      visit(null, 0);
      return rows;
    },
    fileMatches() {
      const match = this.draft.match(/@file:([^\s]*)$/);
      if (!match || !this.expert) return [];
      const search = match[1].toLowerCase();
      return this.expert.files
        .filter(
          (item) =>
            item.kind === "file" &&
            (!search || this.filePath(item).toLowerCase().includes(search)),
        )
        .slice(0, 8);
    },
    pendingInteraction() {
      for (const turn of [...(this.conversation?.turns || [])].reverse()) {
        const request = turn.requests?.find(
          (item) => item.status === "waiting",
        );
        if (request)
          return {
            ...request,
            content: request.prompt,
            choices: request.choices?.length
              ? request.choices
              : ["approval", "mcp_setup"].includes(request.kind)
                ? [
                    { value: "rejected", label: "拒绝" },
                    { value: "approved", label: "允许本次" },
                  ]
                : [],
          };
      }
      return null;
    },
    canSubmitClarification() {
      const request = this.pendingInteraction;
      if (!request || request.kind !== "clarify") return false;
      if (!request.questions?.length) return Boolean(this.clarifyDraft.trim());
      return request.questions.every((question) => {
        const answer =
          request.answers?.[question.qid] || this.clarifyAnswers[question.qid];
        return question.multiSelect
          ? Array.isArray(answer) && answer.length > 0
          : Boolean(String(answer || "").trim());
      });
    },
    sessionStatusCards() {
      const presentation = this.conversation?.sessionPresentation;
      if (!presentation) return [];
      const cards = [];
      const control = presentation.control || {};
      if (control.goal) {
        const goal = control.goal;
        const turns =
          Number.isInteger(goal.turns_used) && Number.isInteger(goal.max_turns)
            ? ` · 已用 ${goal.turns_used}/${goal.max_turns} 轮`
            : "";
        cards.push({
          key: "goal",
          title: "大目标",
          summary: goal.title || "当前目标",
          meta: `${this.controlStatusLabel(goal.status)}${turns}`,
          items: [
            ...(typeof goal.contract === "string" && goal.contract.trim()
              ? [
                  {
                    id: "contract",
                    status: "说明",
                    text: goal.contract,
                    depth: 0,
                  },
                ]
              : []),
            ...(Array.isArray(goal.subgoals)
              ? goal.subgoals.map((item, index) => ({
                  id: `subgoal_${index}`,
                  status: "阶段",
                  text: String(item?.title || item),
                  depth: 0,
                }))
              : []),
            ...(goal.status === "active" &&
            goal.wait_barrier?.type === "until" &&
            this.validDateLabel(goal.wait_barrier.until_at, true)
              ? [
                  {
                    id: "wait",
                    status: "等待",
                    text: `至 ${this.validDateLabel(goal.wait_barrier.until_at, true)}`,
                    depth: 0,
                  },
                ]
              : []),
          ],
        });
      }
      const todos = presentation.todos || [];
      if (todos.length) {
        const progress = todoProgress(todos);
        const active =
          todos.find((item) => item.status === "in_progress") ||
          todos.find((item) => item.status === "pending");
        cards.push({
          key: "todo",
          title: "执行计划",
          summary: active
            ? `${active.status === "in_progress" ? "正在执行" : "下一步"}：${active.content}`
            : "所有步骤已处理",
          meta: `已完成 ${progress.done}/${progress.total}`,
          progress: {
            ...progress,
            percent: progress.total
              ? Math.round((progress.done / progress.total) * 100)
              : 0,
          },
          items: todos.map((item) => ({
            id: item.id,
            text: item.content,
            state: item.status,
            status: {
              pending: "待处理",
              in_progress: "进行中",
              completed: "已完成",
              cancelled: "已取消",
            }[item.status],
            depth: this.todoDepth(item, todos),
          })),
        });
      }
      const queuedTasks = presentation.queuedTasks || [];
      if (queuedTasks.length)
        cards.push({
          key: "queue",
          title: "排队任务",
          summary: `下一项：${queuedTasks[0].title}`,
          meta: `${queuedTasks.length} 条等待执行`,
          items: queuedTasks.map((item) => ({
            ...item,
            status: item.status === "running" ? "执行中" : "等待执行",
          })),
        });
      if (control.loop) {
        const loop = control.loop;
        cards.push({
          key: "loop",
          title: "循环任务",
          summary: "按设定间隔执行",
          meta: [
            this.controlStatusLabel(loop.status),
            Number.isFinite(loop.interval_seconds)
              ? `间隔 ${loop.interval_seconds} 秒`
              : "",
            Number.isInteger(loop.ticks_fired)
              ? `已触发 ${loop.ticks_fired} 次`
              : "",
            this.validDateLabel(loop.next_due_at)
              ? `下次 ${this.validDateLabel(loop.next_due_at)}`
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
          items: [],
        });
      }
      if (control.heartbeat) {
        const heartbeat = control.heartbeat;
        cards.push({
          key: "heartbeat",
          title: "定时检查",
          summary: "按设定间隔检查",
          meta: [
            this.controlStatusLabel(heartbeat.status),
            Number.isFinite(heartbeat.interval_seconds)
              ? `间隔 ${heartbeat.interval_seconds} 秒`
              : "",
            Number.isInteger(heartbeat.fire_count)
              ? `已检查 ${heartbeat.fire_count} 次`
              : "",
            this.validDateLabel(heartbeat.last_fired_at)
              ? `最近 ${this.validDateLabel(heartbeat.last_fired_at)}`
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
          items: [],
        });
      }
      return cards;
    },
    pageNotifications() {
      return this.conversation?.sessionPresentation?.notifications || [];
    },
    questionPreviews() {
      const previews = [];
      let current = null;
      for (const message of this.conversation?.messages || []) {
        if (message.role === "user") {
          current = { message, finalReply: "" };
          previews.push(current);
        } else if (
          current &&
          message.role === "assistant" &&
          (!message.status || message.status === "done") &&
          String(message.content || "").trim()
        ) {
          current.finalReply = message.content.trim();
        }
      }
      return previews;
    },
    lastAssistantContentLength() {
      const messages = this.conversation?.messages || [];
      const last = messages[messages.length - 1];
      return last?.role === "assistant" ? last.content.length : 0;
    },
  },
  mounted() {
    window.addEventListener("resize", this.handleViewportResize);
    this.turnClock = setInterval(() => {
      if (["running", "recovering"].includes(this.conversation?.status))
        this.clockNow = Date.now();
    }, 1000);
    if (this.$route.query.conv && this.isDraftTask && this.expert) {
      const { conv, ...query } = this.$route.query;
      this.$router
        .replace({ name: "chat", params: { id: this.expert.id }, query })
        .catch(() => {});
    }
    this.$nextTick(this.scrollBottom);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.handleViewportResize);
    clearInterval(this.turnClock);
    if (this.$route.query.conv) stopDemoStream(this.$route.query.conv);
    this.clearPreview();
  },
  watch: {
    "$route.query.conv"(next, prior) {
      if (prior && next !== prior) stopDemoStream(prior);
      Object.keys(this.statusExpanded).forEach((key) => {
        this.statusExpanded[key] = false;
      });
      this.expandedQueueItemId = null;
      this.hoveredQuestionIndex = null;
      this.draft = "";
      this.pendingFiles = [];
      this.clarifyDraft = "";
      this.clarifyAnswers = {};
      this.$nextTick(this.scrollBottom);
    },
    "conversation.messages.length"() {
      this.$nextTick(this.scrollBottom);
    },
    lastAssistantContentLength() {
      const scroller = this.$refs.scroller;
      if (
        !scroller ||
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight > 120
      )
        return;
      this.$nextTick(this.scrollBottom);
    },
  },
  methods: {
    avatarSrcFor,
    handleViewportResize() {
      const narrow = window.innerWidth <= 900;
      if (narrow !== this.isNarrowViewport) this.taskListOpen = false;
      this.isNarrowViewport = narrow;
    },
    toggleStatus(key) {
      this.statusExpanded[key] = !this.statusExpanded[key];
      if (key === "queue" && !this.statusExpanded.queue)
        this.expandedQueueItemId = null;
    },
    requestKindLabel(kind) {
      return (
        {
          clarify: "需要澄清信息",
          approval: "需要操作审批",
          mcp_setup: "需要确认 MCP 设置",
          secret: "凭据操作演示",
          sudo: "管理员权限演示",
        }[kind] || "需要确认"
      );
    },
    requestResponseLabel(request) {
      if (["approval", "mcp_setup"].includes(request.kind))
        return request.response === "approved" ? "已允许本次尝试" : "已拒绝";
      if (["secret", "sudo"].includes(request.kind)) return request.response;
      return `用户回复：${request.response}`;
    },
    setClarifyAnswer(qid, value) {
      if (this.acceptedAnswerLabel(this.pendingInteraction, qid)) return;
      this.$set(this.clarifyAnswers, qid, value);
    },
    acceptedAnswerLabel(request, qid) {
      const answer = this.acceptedAnswerValue(request, qid);
      return Array.isArray(answer) ? answer.join("、") : String(answer || "");
    },
    acceptedAnswerValue(request, qid) {
      return request?.answers?.[qid];
    },
    controlStatusLabel(status) {
      return (
        { active: "进行中", paused: "已暂停", done: "已完成" }[status] ||
        "状态待核对"
      );
    },
    todoStatusIcon(status) {
      return (
        {
          pending: "el-icon-time",
          in_progress: "el-icon-loading",
          completed: "el-icon-check",
          cancelled: "el-icon-close",
        }[status] || "el-icon-more"
      );
    },
    controlCardIcon(key) {
      return (
        {
          goal: "el-icon-aim",
          todo: "el-icon-tickets",
          queue: "el-icon-time",
          loop: "el-icon-refresh",
          heartbeat: "el-icon-time",
        }[key] || "el-icon-info"
      );
    },
    validDateLabel(value, futureOnly = false) {
      if (!value) return "";
      const time = new Date(value).getTime();
      if (!Number.isFinite(time) || (futureOnly && time <= Date.now()))
        return "";
      return new Date(time).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    todoDepth(item, todos) {
      let depth = 0;
      let parent = item.parent;
      const visited = new Set([item.id]);
      while (parent && !visited.has(parent)) {
        visited.add(parent);
        const next = todos.find((candidate) => candidate.id === parent);
        if (!next) break;
        depth++;
        parent = next.parent;
      }
      return Math.min(depth, 3);
    },
    turnFor(message) {
      return this.conversation?.turns?.find(
        (turn) => turn.assistantMessageId === message.id,
      );
    },
    turnStatusLabel(message) {
      const status = this.turnFor(message)?.status;
      return (
        {
          running: "处理中",
          recovering: "正在恢复 · 核对回合状态",
          unknown: "运行异常 · 未能确认本轮结束状态",
          waiting: "等待回应",
          complete: "已完成",
          interrupted: "已中断",
          error: "处理失败",
        }[status] || (message.status === "streaming" ? "处理中" : "状态待核对")
      );
    },
    turnDurationLabel(message) {
      const turn = this.turnFor(message);
      if (!turn) return "";
      const duration = ["running", "recovering"].includes(turn.status)
        ? this.clockNow - new Date(turn.startedAt).getTime()
        : turn.durationMs;
      const label = formatTurnDuration(duration);
      return label ? `用时 ${label}` : "";
    },
    turnActivities(message) {
      return this.turnFor(message)?.activities || [];
    },
    hasProcessContent(message) {
      return this.turnProcessBlocks(message).length > 0;
    },
    turnInterims(message) {
      return this.turnFor(message)?.interims || [];
    },
    turnProcessBlocks(message) {
      return conversationProcessBlocks(this.turnFor(message));
    },
    turnRequests(message) {
      return this.turnFor(message)?.requests || [];
    },
    turnResultFiles(message) {
      return (this.turnFor(message)?.results || [])
        .map((result) =>
          this.expert?.files?.find((file) => file.id === result.fileId),
        )
        .filter(Boolean);
    },
    turnTodoResults(message) {
      return (this.turnFor(message)?.results || []).filter(
        (result) => result.kind === "todo" && result.items?.length,
      );
    },
    todoStatusLabel(status) {
      return (
        {
          pending: "待处理",
          in_progress: "进行中",
          completed: "已完成",
          cancelled: "已取消",
        }[status] || "待核对"
      );
    },
    fileItemById(id) {
      return (
        this.expert?.files?.find(
          (file) => file.id === id && file.kind === "file",
        ) || null
      );
    },
    userQuestionLabel(message) {
      return (
        message.content ||
        (message.attachments || []).map((file) => file.name).join("、") ||
        "文件消息"
      );
    },
    isQuestionMarked(id) {
      return (this.conversation?.bookmarkedQuestionIds || []).includes(id);
    },
    toggleQuestionMark(id) {
      if (!this.conversation?.id) return;
      const marked = new Set(this.conversation.bookmarkedQuestionIds || []);
      if (marked.has(id)) marked.delete(id);
      else marked.add(id);
      this.$set(this.conversation, "bookmarkedQuestionIds", [...marked]);
      persist();
    },
    turnTemporary(message) {
      return this.turnFor(message)?.temporary || "";
    },
    runningActivitiesLabel(activities) {
      return activities
        .filter((activity) => activity.status === "running")
        .map((activity) => activity.title)
        .join("、");
    },
    activityGroupLabel(activities) {
      const running = this.runningActivitiesLabel(activities);
      if (running) return `正在推进 · ${running}`;
      return `处理经过 · ${activities.map((item) => item.title).join("、")}`;
    },
    activityItemTitle(activity) {
      return (
        activity.title +
        (activity.progressText
          ? ` · ${activity.progressText}`
          : activity.argumentSummary
            ? ` ${activity.argumentSummary}`
            : "")
      );
    },
    activityDetail(activity) {
      return [activity.inputDetail, activity.detail, activity.outputDetail]
        .filter(Boolean)
        .join("\n\n");
    },
    childConversationFor(activity) {
      if (activity.kind !== "subagent" || !activity.childSessionId) return null;
      const child = conversationById(activity.childSessionId);
      return child?.expertId === this.expert?.id ? child : null;
    },
    activityHasDetail(activity) {
      return Boolean(
        this.activityDetail(activity) || this.childConversationFor(activity),
      );
    },
    processExpanded(message) {
      return (
        ["running", "recovering"].includes(this.turnFor(message)?.status) ||
        this.expandedProcess.includes(message.id)
      );
    },
    back() {
      this.$router
        .push({
          name: "experts",
          query: { embed: this.$route.query.embed },
        })
        .catch(() => {});
    },
    openManage() {
      this.$router
        .push({
          name: "expert",
          params: { id: this.expert.id },
          query: { tab: "persona", embed: this.$route.query.embed },
        })
        .catch(() => {});
    },
    scrollBottom() {
      const el = this.$refs.scroller;
      if (el) el.scrollTop = el.scrollHeight;
    },
    focusComposer() {
      this.$nextTick(() => this.$refs.composer?.focus());
    },
    selectTask(item) {
      this.taskListOpen = false;
      this.$router
        .push({
          name: "chat",
          params: { id: this.expert.id },
          query: { ...this.$route.query, conv: item.id },
        })
        .catch(() => {});
    },
    newTask() {
      this.taskListOpen = false;
      this.draftConversation = emptyConversation();
      this.draft = "";
      this.pendingFiles = [];
      this.clarifyDraft = "";
      this.clarifyAnswers = {};
      this.workspaceOpen = false;
      const { conv, ...query } = this.$route.query;
      this.$router
        .push({ name: "chat", params: { id: this.expert.id }, query })
        .catch(() => {});
    },
    send() {
      if (
        !this.conversation ||
        this.pendingInteraction ||
        (!this.draft.trim() && !this.pendingFiles.length) ||
        ["running", "recovering"].includes(this.conversation.status)
      )
        return;
      const content =
        this.draft.trim() ||
        this.pendingFiles.map((file) => file.name).join("、");
      let conversationId = this.conversation.id;
      if (this.isDraftTask) {
        const created = createConversation(
          this.expert.id,
          conversationTitleFromFirstMessage(content),
        );
        conversationId = created.id;
        if (this.draftConversation.cwd !== "/")
          updateConversation(conversationId, {
            cwd: this.draftConversation.cwd,
          });
      }
      sendDemoMessage(conversationId, this.draft.trim(), this.pendingFiles);
      this.draft = "";
      this.pendingFiles = [];
      if (this.isDraftTask)
        this.$router
          .replace({
            name: "chat",
            params: { id: this.expert.id },
            query: { ...this.$route.query, conv: conversationId },
          })
          .catch(() => {});
      this.$nextTick(this.scrollBottom);
    },
    handleEnter() {
      if (this.fileMatches.length && !this.pathPopoverDismissed)
        this.selectPathFile(this.fileMatches[0]);
      else this.send();
    },
    selectModel(name) {
      this.model = name;
      this.modelPickerVisible = false;
    },
    stop() {
      if (this.conversation?.id) stopDemoStream(this.conversation.id);
    },
    cwdLabel(cwd, rootName = "工作空间") {
      return !cwd || cwd === "/" ? rootName : String(cwd).replace(/^\//, "");
    },
    taskCwdName(cwd) {
      return (
        String(cwd || "")
          .split(/[\\/]+/)
          .filter(Boolean)
          .pop() || "workspace"
      );
    },
    setCwd(cwd) {
      if (this.isDraftTask) this.draftConversation.cwd = cwd;
      else if (this.conversation)
        updateConversation(this.conversation.id, { cwd });
    },
    folderPath(id) {
      const parts = [];
      let current = this.expert?.files.find((item) => item.id === id);
      while (current) {
        parts.unshift(current.name);
        current = this.expert.files.find(
          (item) => item.id === current.parentId,
        );
      }
      return "/" + parts.join("/");
    },
    filePath(file) {
      return (
        (file.parentId ? this.folderPath(file.parentId) : "") + "/" + file.name
      );
    },
    selectPathFile(file) {
      this.draft = this.draft.replace(
        /@file:[^\s]*$/,
        "@file:" + this.filePath(file),
      );
      this.pathPopoverDismissed = true;
      this.focusComposer();
    },
    workspaceIcon(item) {
      if (item.kind === "folder") return "📁";
      if (/\.(png|jpe?g|gif|webp)$/i.test(item.name)) return "🖼️";
      if (/\.(csv|xlsx?|tsv)$/i.test(item.name)) return "📊";
      return "📝";
    },
    toggleFolder(item) {
      this.workspaceFolderId = item.id;
      this.expandedFolderIds = this.expandedFolderIds.includes(item.id)
        ? this.expandedFolderIds.filter((id) => id !== item.id)
        : [...this.expandedFolderIds, item.id];
    },
    openFolderDialog() {
      this.folderNameDraft = "";
      this.folderDialogVisible = true;
      this.$nextTick(() => this.$refs.folderNameInput?.focus());
    },
    openWorkspace(item) {
      this.selectTask(item);
      if (this.isNarrowViewport) this.taskListOpen = false;
      this.workspaceOpen = true;
      this.workspaceFolderId =
        this.expert.files.find(
          (folder) =>
            folder.kind === "folder" && this.folderPath(folder.id) === item.cwd,
        )?.id || null;
      const ids = [];
      let current = this.expert.files.find(
        (folder) => folder.id === this.workspaceFolderId,
      );
      while (current) {
        ids.unshift(current.id);
        current = this.expert.files.find(
          (folder) => folder.id === current.parentId,
        );
      }
      this.expandedFolderIds = ids;
    },
    toggleWorkspace() {
      if (this.workspaceOpen) this.workspaceOpen = false;
      else {
        if (this.isNarrowViewport) this.taskListOpen = false;
        this.showWorkspaceForCwd();
      }
    },
    toggleTaskList() {
      if (this.isNarrowViewport) {
        this.taskListOpen = !this.taskListOpen;
        if (this.taskListOpen) this.workspaceOpen = false;
      } else this.taskListCollapsed = !this.taskListCollapsed;
    },
    showWorkspaceForCwd() {
      if (this.isNarrowViewport) this.taskListOpen = false;
      this.workspaceOpen = true;
      const cwd = this.conversation?.cwd;
      const folder = this.expert?.files.find(
        (item) => item.kind === "folder" && this.folderPath(item.id) === cwd,
      );
      this.workspaceFolderId = folder?.id || null;
      const ids = [];
      let current = folder;
      while (current) {
        ids.unshift(current.id);
        current = this.expert.files.find(
          (item) => item.id === current.parentId,
        );
      }
      this.expandedFolderIds = ids;
    },
    togglePin(item) {
      this.taskActionsPaused = true;
      updateConversation(item.id, { pinned: !item.pinned });
    },
    startTaskMarquee(item, event) {
      const card = event.currentTarget;
      requestAnimationFrame(() => {
        if (
          !card.isConnected ||
          (!card.matches(":hover") && !card.matches(":focus-within"))
        )
          return;
        const title = card.querySelector(".pc-task-title");
        const text = card.querySelector(".pc-task-title-text");
        if (!title || !text) return;
        const distance = text.scrollWidth - title.clientWidth;
        this.marqueeTaskId = distance > 1 ? item.id : null;
        this.marqueeDistance = Math.max(0, distance);
        this.marqueeDuration = Math.max(3.6, Math.min(10, distance / 25 + 3));
      });
    },
    stopTaskMarquee(event) {
      const card = event.currentTarget;
      requestAnimationFrame(() => {
        if (
          !card.isConnected ||
          (!card.matches(":hover") && !card.matches(":focus-within"))
        )
          this.marqueeTaskId = null;
      });
    },
    openTaskDialog(mode, item) {
      if (
        mode === "archive" &&
        (this.conversation?.id !== item.id || !this.draft.trim())
      ) {
        this.archiveTask(item);
        return;
      }
      this.taskDialogMode = mode;
      this.taskDialogTarget = item;
      this.taskNameDraft = item.title;
      this.taskDialogVisible = true;
      if (mode === "rename")
        this.$nextTick(() => this.$refs.renameInput?.focus());
    },
    confirmTaskDialog() {
      const item = this.taskDialogTarget;
      if (!item) return;
      if (this.taskDialogMode === "rename") {
        if (!this.taskNameDraft.trim())
          return this.$message.warning("请输入任务名称");
        updateConversation(item.id, { title: this.taskNameDraft.trim() });
      } else if (this.taskDialogMode === "archive") {
        this.archiveTask(item);
      } else {
        const deletingCurrent = this.$route.query.conv === item.id;
        stopDemoStream(item.id);
        deleteConversation(item.id);
        if (deletingCurrent) this.newTask();
      }
      this.taskDialogVisible = false;
    },
    archiveTask(item) {
      if (item.status === "running") stopDemoStream(item.id);
      updateConversation(item.id, { archived: true });
      if (this.conversation?.id === item.id) {
        this.draft = "";
        const next = this.visibleConversations.find(
          (other) => other.id !== item.id,
        );
        if (next) this.selectTask(next);
        else this.newTask();
      }
      this.$message.success("已归档，可在专家管理的「已归档」中恢复");
    },
    toggleProcess(id) {
      const message = this.conversation?.messages.find(
        (item) => item.id === id,
      );
      if (
        message &&
        ["running", "recovering"].includes(this.turnFor(message)?.status)
      )
        return;
      this.expandedProcess = this.expandedProcess.includes(id)
        ? this.expandedProcess.filter((value) => value !== id)
        : [...this.expandedProcess, id];
    },
    toggleActivityGroup(id) {
      this.expandedActivities = this.expandedActivities.includes(id)
        ? this.expandedActivities.filter((value) => value !== id)
        : [...this.expandedActivities, id];
    },
    toggleActivityDetail(id) {
      this.expandedActivityIds = this.expandedActivityIds.includes(id)
        ? this.expandedActivityIds.filter((value) => value !== id)
        : [...this.expandedActivityIds, id];
    },
    jumpTo(id) {
      document
        .getElementById("message-" + id)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    resolveDecision(value) {
      if (!this.pendingInteraction) return;
      resolveDemoRequest(
        this.conversation.id,
        this.pendingInteraction.id,
        value,
      );
    },
    submitClarification() {
      if (!this.canSubmitClarification) return;
      resolveDemoRequest(
        this.conversation.id,
        this.pendingInteraction.id,
        this.pendingInteraction.questions?.length
          ? {
              answers: {
                ...this.pendingInteraction.answers,
                ...this.clarifyAnswers,
              },
            }
          : this.clarifyDraft.trim(),
      );
      this.clarifyDraft = "";
      this.clarifyAnswers = {};
      this.$nextTick(this.scrollBottom);
    },
    createFolder() {
      const name = this.folderNameDraft.trim();
      if (!name || /[\\/:*?"<>|]/.test(name))
        return this.$message.warning("请输入有效的文件夹名称");
      if (this.workspaceItems.some((item) => item.name === name))
        return this.$message.warning("名称已存在");
      addWorkspaceItem(this.expert.id, {
        name,
        parentId: this.workspaceFolderId,
        kind: "folder",
      });
      this.folderDialogVisible = false;
    },
    fileSizeLabel(size) {
      return size < 1024 ? size + " B" : (size / 1024).toFixed(1) + " KB";
    },
    removePendingFile(file) {
      this.pendingFiles = this.pendingFiles.filter(
        (item) => item.id !== file.id,
      );
    },
    async storeFile(file, parentId) {
      const entry = addWorkspaceItem(this.expert.id, {
        name: file.name,
        parentId,
        kind: "file",
      });
      await saveFile(entry.id, file);
      return entry;
    },
    async attachFile(event) {
      const file = event.target.files[0];
      if (!file) return;
      const entry = await this.storeFile(file, this.workspaceFolderId);
      this.pendingFiles.push({
        id: entry.id,
        name: file.name,
        size: file.size,
      });
      event.target.value = "";
      this.$message.success("文件已添加到演示工作空间");
    },
    async uploadWorkspaceFiles(event) {
      const files = [...event.target.files];
      for (const file of files)
        await this.storeFile(file, this.workspaceFolderId);
      event.target.value = "";
      if (files.length) this.$message.success("文件已保存到浏览器演示数据");
    },
    async fileBlob(item) {
      return (
        (await readFile(item.id)) ||
        new Blob([item.content || ""], {
          type: item.name.endsWith(".csv") ? "text/csv" : "text/plain",
        })
      );
    },
    async previewFile(item) {
      this.clearPreview();
      this.previewItem = item;
      const blob = await this.fileBlob(item);
      if (blob.type.startsWith("image/"))
        this.previewUrl = URL.createObjectURL(blob);
      else this.previewText = await blob.text();
      this.previewVisible = true;
    },
    async downloadFile(item) {
      if (item) saveBlob(await this.fileBlob(item), item.name);
    },
    clearPreview() {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = "";
      this.previewText = "";
    },
  },
};
</script>
