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
        :class="{
          'is-task-list-collapsed': taskListCollapsed,
          'has-workspace': workspaceOpen,
        }"
      >
        <div v-if="conversation.archived" class="pc-archived">
          此任务已归档，不会出现在右侧任务列表。可在专家管理页「任务」的「归档任务」弹窗中恢复。
        </div>
        <div class="pc-messages-wrap">
          <div
            ref="scroller"
            class="pc-messages"
            @scroll.capture="hideResultPathTooltip"
          >
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
                <div
                  class="pc-process"
                  :class="{
                    'has-expanded-content':
                      hasProcessContent(message) && processExpanded(message),
                  }"
                >
                  <button
                    v-if="hasProcessContent(message)"
                    type="button"
                    :aria-expanded="processExpanded(message)"
                    :disabled="processLocked(message)"
                    @click="toggleProcess(message.id)"
                  >
                    {{ turnStatusLabel(message) }}
                    <span v-if="turnDurationLabel(message)">{{
                      turnDurationLabel(message)
                    }}</span>
                    <i
                      :class="
                        processExpanded(message)
                          ? 'el-icon-arrow-down'
                          : 'el-icon-arrow-right'
                      "
                    />
                  </button>
                  <div v-else class="pc-process-summary">
                    {{ turnStatusLabel(message) }}
                    <span v-if="turnDurationLabel(message)">{{
                      turnDurationLabel(message)
                    }}</span>
                  </div>
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
                          :class="{
                            'is-running': activityGroupRunning(
                              block.activities,
                              message,
                            ),
                          }"
                          :aria-expanded="expandedActivities.includes(block.id)"
                          @click="
                            toggleActivityGroup(
                              block.id,
                              block.activities,
                              message,
                            )
                          "
                        >
                          <span class="pc-activity-title-text">{{
                            activityGroupLabel(block.activities, message)
                          }}</span>
                          <i
                            :class="
                              expandedActivities.includes(block.id)
                                ? 'el-icon-arrow-down'
                                : 'el-icon-arrow-right'
                            "
                          />
                        </button>
                        <div
                          v-if="expandedActivities.includes(block.id)"
                          ref="activityLists"
                          class="pc-activity-list"
                          :data-group-id="block.id"
                          tabindex="0"
                          aria-label="活动行及详情"
                          @scroll="trackActivityListScroll(block.id, $event)"
                        >
                          <div
                            v-for="step in block.activities"
                            :key="step.id"
                            class="pc-process-activity"
                          >
                            <button
                              type="button"
                              class="pc-process-step"
                              :class="{
                                'is-running': step.status === 'running',
                              }"
                              :disabled="!hasActivityDetail(step)"
                              :aria-expanded="
                                hasActivityDetail(step)
                                  ? expandedActivityIds.includes(step.id)
                                  : null
                              "
                              @click="
                                hasActivityDetail(step) &&
                                toggleActivityDetail(step.id, block.id)
                              "
                            >
                              <span
                                class="pc-process-step-mark"
                                aria-hidden="true"
                              />
                              <span
                                v-if="step.kind === 'tool'"
                                class="pc-process-step-content"
                              >
                                <span class="pc-process-step-action">{{
                                  step.title
                                }}</span>
                                <span
                                  v-if="step.argumentSummary && !isRoutineProcessCheck(step)"
                                  class="pc-process-step-target"
                                  >{{ step.argumentSummary }}</span
                                >
                                <span
                                  v-if="toolActivityValue(step)"
                                  class="pc-process-step-value"
                                  >{{ toolActivityValue(step) }}</span
                                >
                              </span>
                              <span v-else class="pc-process-step-content">
                                <span class="pc-process-step-text">{{
                                  activityItemTitle(step)
                                }}</span>
                              </span>
                              <i
                                v-if="hasActivityDetail(step)"
                                :class="
                                  expandedActivityIds.includes(step.id)
                                    ? 'el-icon-arrow-down'
                                    : 'el-icon-arrow-right'
                                "
                              />
                            </button>
                            <div
                              v-if="
                                hasActivityDetail(step) &&
                                expandedActivityIds.includes(step.id)
                              "
                              class="pc-process-detail"
                              :class="{ 'is-process-manage': step.name === 'process_manage' }"
                            >
                              <template v-if="step.kind === 'subagent'">
                                <div v-if="step.argumentSummary">
                                  任务目标：{{ step.argumentSummary }}
                                </div>
                                <div>
                                  当前状态：{{
                                    activityStatusLabel(step.status)
                                  }}
                                </div>
                                <div
                                  v-if="
                                    step.status === 'running' &&
                                    step.progressText
                                  "
                                >
                                  当前进展：{{ step.progressText }}
                                </div>
                                <div v-if="step.outputDetail">
                                  结果摘要：{{ step.outputDetail }}
                                </div>
                                <button
                                  v-if="childConversationFor(step)"
                                  type="button"
                                  class="pc-child-session-link"
                                  @click="
                                    selectTask(childConversationFor(step))
                                  "
                                >
                                  查看子会话
                                </button>
                              </template>
                              <template v-else>
                                <div
                                  v-if="
                                    step.inputDetail &&
                                    (['terminal', 'execute_code'].includes(
                                      step.name,
                                    ) || isMcpTool(step))
                                  "
                                  class="pc-tool-output-label"
                                >
                                  {{ isMcpTool(step) ? '请求参数' : '运行参数' }}
                                </div>
                                <pre
                                  v-if="
                                    step.inputDetail &&
                                    (['terminal', 'execute_code'].includes(
                                      step.name,
                                    ) || isMcpTool(step))
                                  "
                                  class="pc-tool-code"
                                  >{{ step.inputDetail }}</pre>
                                <div v-else-if="step.inputDetail">
                                  {{ step.inputDetail }}
                                </div>
                                <div
                                  v-if="
                                    step.kind === 'tool' &&
                                    !isMcpTool(step) &&
                                    step.status === 'running' &&
                                    step.progressText
                                  "
                                >
                                  当前进展：{{ step.progressText }}
                                </div>
                                <div v-if="step.detail && !isMcpTool(step)">
                                  {{ step.detail }}
                                </div>
                                <template
                                  v-if="
                                    step.outputSections &&
                                    step.outputSections.length
                                  "
                                >
                                  <div
                                    v-for="(
                                      section, index
                                    ) in step.outputSections"
                                    :key="index"
                                    class="pc-tool-output-section"
                                  >
                                    <div
                                      v-if="section.label"
                                      class="pc-tool-output-label"
                                    >
                                      {{ section.label }}
                                    </div>
                                    <pre
                                      v-if="section.kind === 'code'"
                                      class="pc-tool-code"
                                      >{{ section.text }}</pre>
                                    <ConversationDiff
                                      v-else-if="section.kind === 'diff'"
                                      class="pc-activity-file-diff"
                                      :text="section.text"
                                      :path="step.argumentSummary"
                                      title="本次改动"
                                    />
                                    <div
                                      v-else-if="section.kind === 'read'"
                                      class="pc-tool-read-detail"
                                    >
                                      <div v-if="section.range">
                                        {{
                                          section.extractedDocument
                                            ? "提取文本范围"
                                            : "读取范围"
                                        }}：{{ section.range }}
                                      </div>
                                      <div v-if="section.partial">
                                        本次仅返回部分内容
                                      </div>
                                      <div
                                        v-if="section.preview"
                                        class="pc-tool-read-preview"
                                      >
                                        内容预览：{{ section.preview }}
                                      </div>
                                    </div>
                                    <div
                                      v-else-if="section.kind === 'web'"
                                      class="pc-tool-web-detail"
                                    >
                                      <div class="pc-tool-web-summary">{{ section.summary }}</div>
                                      <ul class="pc-tool-web-list">
                                        <li
                                          v-for="(item, itemIndex) in section.items"
                                          :key="itemIndex"
                                        >
                                          <el-popover
                                            v-if="item.preview"
                                            trigger="hover"
                                            placement="top"
                                            popper-class="pc-web-preview-popper"
                                            :open-delay="80"
                                          >
                                            <div class="pc-web-preview-text">
                                              {{ item.preview }}
                                            </div>
                                            <a
                                              v-if="item.href"
                                              slot="reference"
                                              class="pc-tool-web-link"
                                              :href="item.href"
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              >{{ item.title }}</a
                                            >
                                            <span v-else slot="reference">{{
                                              item.title
                                            }}</span>
                                          </el-popover>
                                          <a
                                            v-else-if="item.href"
                                            class="pc-tool-web-link"
                                            :href="item.href"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            >{{ item.title }}</a
                                          >
                                          <span v-else>{{ item.title }}</span>
                                          <small
                                            v-if="item.error"
                                            class="pc-tool-web-error"
                                            >{{ item.error }}</small
                                          >
                                        </li>
                                      </ul>
                                    </div>
                                    <ul
                                      v-else-if="section.kind === 'list'"
                                      class="pc-tool-result-list"
                                    >
                                      <li
                                        v-for="(
                                          item, itemIndex
                                        ) in section.items"
                                        :key="itemIndex"
                                      >
                                        <button
                                          v-if="
                                            step.name === 'session_search' &&
                                            sessionSearchTask(item)
                                          "
                                          type="button"
                                          class="pc-tool-session-link"
                                          @click="selectTask(sessionSearchTask(item))"
                                        >
                                          {{ item.title }}
                                        </button>
                                        <template v-else>{{ item.title }}</template>
                                        <span v-if="item.source">{{
                                          item.source
                                        }}</span>
                                      </li>
                                    </ul>
                                    <div v-else>{{ section.text }}</div>
                                  </div>
                                </template>
                                <ConversationDiff
                                  v-else-if="
                                    step.outputDetail &&
                                    step.outputKind === 'diff'
                                  "
                                  class="pc-activity-file-diff"
                                  :text="step.outputDetail"
                                  :path="step.argumentSummary"
                                  title="本次改动"
                                />
                                <div v-else-if="step.outputDetail">
                                  <div
                                    v-if="isMcpTool(step)"
                                    class="pc-tool-output-label"
                                  >
                                    返回结果
                                  </div>
                                  {{ step.outputDetail }}
                                </div>
                                <div
                                  v-if="
                                    step.kind !== 'tool' &&
                                    !activityDetail(step)
                                  "
                                >
                                  {{ activityStatusLabel(step.status) }}
                                </div>
                              </template>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        v-else-if="block.type === 'stage'"
                        :key="block.id"
                        class="pc-stage-line"
                        :class="`is-${block.state}`"
                      >
                        {{ block.text }}
                      </div>
                      <div
                        v-else-if="
                          block.type === 'request' &&
                          block.request.status === 'expired'
                        "
                        :key="block.id"
                        class="pc-expired-request"
                        :class="{ 'is-approval': block.request.kind === 'approval' }"
                      >
                        <span class="pc-expired-request-icon" aria-hidden="true"
                          ><i
                            v-if="block.request.kind === 'approval'"
                            class="el-icon-lock"
                          /><template v-else>?</template></span
                        >
                        <div class="pc-expired-request-content">
                          <div
                            class="pc-expired-request-question"
                            :title="
                              block.request.kind === 'approval'
                                ? block.request.actionTitle || block.request.prompt
                                : block.request.prompt
                            "
                          >
                            {{
                              block.request.kind === "approval"
                                ? block.request.actionTitle ||
                                  block.request.prompt
                                : block.request.prompt
                            }}
                          </div>
                          <div class="pc-expired-request-footer">
                            <span class="pc-expired-request-status">已超时</span>
                            <span
                              v-if="block.request.lateAnswer"
                              class="pc-expired-request-result"
                            >
                              {{
                                block.request.lateAnswerMode === "current"
                                  ? "已在本回合补答"
                                  : "已在后续回合补答"
                              }}
                            </span>
                            <button
                              v-else-if="
                                block.request.kind === 'clarify' &&
                                !pendingInteraction
                              "
                              type="button"
                              class="pc-expired-request-action"
                              @click="openLateClarification(block.request.id)"
                            >
                              补充回答 <i class="el-icon-arrow-right" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div
                        v-else-if="
                          block.type === 'request' &&
                          block.request.status === 'resolved'
                        "
                        :key="block.id"
                        class="pc-human-record"
                      >
                        <span class="pc-human-question"
                          >{{ requestKindLabel(block.request.kind) }}：{{
                            requestPromptLabel(block.request)
                          }}</span
                        >
                        <span
                          v-for="question in block.request.questions || []"
                          :key="question.qid"
                          class="pc-human-question"
                        >
                          {{ question.question }}
                          <strong
                            v-if="
                              acceptedAnswerLabel(block.request, question.qid)
                            "
                            class="pc-human-answer"
                          >{{ acceptedAnswerLabel(block.request, question.qid) }}</strong>
                        </span>
                        <strong
                          v-if="
                            block.request.skipped &&
                            (block.request.questions || []).length
                          "
                          class="pc-human-answer"
                          >跳过</strong
                        >
                        <strong
                          v-if="
                            block.request.status === 'resolved' &&
                            !(block.request.questions || []).length
                          "
                          class="pc-human-answer"
                        >{{ requestResponseLabel(block.request) }}</strong>
                      </div>
                      <div
                        v-else-if="block.type === 'correction'"
                        :key="block.id"
                        class="pc-human-record is-late-answer"
                      >
                        <span class="pc-human-question"
                          >针对先前澄清的超时补答：{{
                            requestPromptById(block.requestId)
                          }}</span
                        >
                        <strong class="pc-human-answer">{{ block.text }}</strong>
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
                  <div
                    v-if="turnResultFiles(message).length"
                    class="pc-result-file-list"
                    role="list"
                    aria-label="本轮产出文件"
                    tabindex="0"
                    @scroll="hideResultPathTooltip"
                  >
                    <el-popover
                      v-for="item in turnResultFiles(message)"
                      :key="item.resultId"
                      trigger="hover"
                      placement="top"
                      popper-class="pc-result-diff-popover"
                      :open-delay="80"
                      :disabled="!item.roundDiff"
                    >
                      <ConversationDiff
                        v-if="item.roundDiff"
                        :text="item.roundDiff"
                        :path="item.path || item.name"
                        title="本轮改动"
                      />
                      <div
                        slot="reference"
                        class="pc-result-file-card"
                        :class="`is-${item.operation}`"
                        role="listitem"
                      >
                      <span class="pc-result-file-icon" aria-hidden="true"
                        ><i
                          :class="
                            item.operation === 'modified'
                              ? 'el-icon-edit-outline'
                              : 'el-icon-document'
                          "
                      /></span>
                      <span class="pc-result-file-copy">
                        <span class="pc-result-file-heading">
                          <strong :title="item.name">{{ item.name }}</strong>
                          <span class="pc-result-file-kind">{{
                            resultOperationLabel(item.operation)
                          }}</span>
                        </span>
                        <small
                          class="pc-result-file-path"
                          @mouseenter="showResultPathTooltip(item, $event)"
                          @mousemove="moveResultPathTooltip($event)"
                          @mouseleave="hideResultPathTooltip"
                          >{{ workspaceResultPath(item) }}</small
                        >
                        <small v-if="!item.canDownload">文件已不可用</small>
                        <small v-else-if="!item.canPreview">暂不支持预览</small>
                        <small v-else-if="item.versionScope === 'current'"
                          >当前文件版本</small
                        >
                      </span>
                      <span class="pc-result-file-actions">
                        <el-tooltip
                          content="预览"
                          placement="top"
                          effect="light"
                          :open-delay="0"
                          :enterable="false"
                        >
                          <button
                            type="button"
                            :aria-label="`预览 ${item.name}`"
                            :disabled="!item.canPreview"
                            @click="previewFile(item)"
                          >
                            <i class="el-icon-view" aria-hidden="true" />
                          </button>
                        </el-tooltip>
                        <el-tooltip
                          content="下载"
                          placement="top"
                          effect="light"
                          :open-delay="0"
                          :enterable="false"
                        >
                          <button
                            type="button"
                            :aria-label="`下载 ${item.name}`"
                            :disabled="!item.canDownload"
                            @click="downloadFile(item)"
                          >
                            <i class="el-icon-download" aria-hidden="true" />
                          </button>
                        </el-tooltip>
                      </span>
                    </div>
                    </el-popover>
                  </div>
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
                <div
                  v-for="risk in turnToolRisks(message)"
                  :key="risk.id"
                  class="pc-tool-risk"
                >
                  <i class="el-icon-warning-outline" />
                  <span>{{ risk.source }}：{{ risk.text }}</span>
                </div>
                <div v-if="message.error" class="pc-error-line">
                  <i class="el-icon-warning-outline" /> {{ message.error }}
                </div>
              </template>
              <template v-else>
                <div v-if="hasUserResources(message)" class="pc-user-resources">
                  <button
                    v-if="sentResourceCanScroll(message.id, 'left')"
                    type="button"
                    class="pc-resource-nav is-left"
                    aria-label="向左查看已发送资料"
                    @click="scrollSentResources(message.id, -1)"
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M12.5 4.5 7 10l5.5 5.5" />
                    </svg>
                  </button>
                  <div
                    ref="sentResourceStrips"
                    :data-message-id="message.id"
                    class="pc-user-resources-list"
                    role="list"
                    aria-label="已发送资料"
                    tabindex="0"
                    @scroll="updateSentResourceOverflow(message.id)"
                    @keydown.left.prevent="scrollSentResources(message.id, -1)"
                    @keydown.right.prevent="scrollSentResources(message.id, 1)"
                  >
                    <el-tooltip
                      v-for="attachment in message.attachments || []"
                      :key="attachment.id"
                      :content="attachment.name"
                      placement="top"
                      effect="light"
                      :open-delay="120"
                      :enterable="false"
                      popper-class="pc-resource-name-tooltip"
                    >
                      <div
                        class="pc-resource-chip pc-user-resource-chip is-upload"
                        role="listitem"
                      >
                        <span
                          class="pc-resource-format"
                          :class="`is-${resourceFormat(attachment.name).tone}`"
                          aria-hidden="true"
                          >{{ resourceFormat(attachment.name).label }}</span
                        >
                        <span class="pc-resource-copy">
                          <strong>{{ attachment.name }}</strong>
                          <small
                            >本地上传{{
                              attachmentItem(attachment) ? "" : " · 已不可用"
                            }}</small
                          >
                        </span>
                        <button
                          v-if="attachmentItem(attachment)"
                          type="button"
                          class="pc-user-resource-open"
                          :aria-label="`查看本地附件 ${attachment.name}`"
                          @click="previewFile(attachmentItem(attachment))"
                        />
                      </div>
                    </el-tooltip>
                    <el-tooltip
                      v-for="reference in message.references || []"
                      :key="`${reference.kind}:${reference.id}`"
                      :content="resourceReferenceTooltip(reference)"
                      placement="top"
                      effect="light"
                      :open-delay="120"
                      :enterable="false"
                      popper-class="pc-resource-name-tooltip"
                    >
                      <div
                        class="pc-resource-chip pc-user-resource-chip"
                        :class="`is-${reference.kind}`"
                        role="listitem"
                      >
                        <span
                          v-if="reference.kind === 'knowledge_library'"
                          class="pc-resource-icon is-library"
                          aria-hidden="true"
                          ><i class="el-icon-folder-opened"
                        /></span>
                        <span
                          v-else-if="reference.kind === 'knowledge_document'"
                          class="pc-resource-icon is-knowledge-document"
                          aria-hidden="true"
                          ><i class="el-icon-document"
                        /></span>
                        <span
                          v-else
                          class="pc-resource-format"
                          :class="`is-${resourceFormat(reference.name).tone}`"
                          aria-hidden="true"
                          >{{ resourceFormat(reference.name).label }}</span
                        >
                        <span class="pc-resource-copy">
                          <strong>{{ reference.name }}</strong>
                          <small
                            >{{ resourceSourceLabel(reference.kind)
                            }}{{
                              reference.kind === "workspace_file" &&
                              !fileItemById(reference.id)
                                ? " · 已不可用"
                                : ""
                            }}</small
                          >
                        </span>
                        <button
                          v-if="
                            reference.kind === 'workspace_file' &&
                            fileItemById(reference.id)
                          "
                          type="button"
                          class="pc-user-resource-open"
                          :aria-label="`查看工作空间文件 ${reference.name}`"
                          @click="previewFile(fileItemById(reference.id))"
                        />
                      </div>
                    </el-tooltip>
                  </div>
                  <button
                    v-if="sentResourceCanScroll(message.id, 'right')"
                    type="button"
                    class="pc-resource-nav is-right"
                    aria-label="向右查看已发送资料"
                    @click="scrollSentResources(message.id, 1)"
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M7.5 4.5 13 10l-5.5 5.5" />
                    </svg>
                  </button>
                </div>
                <div
                  v-if="message.replyToRequestId && message.content"
                  class="pc-human-record is-late-answer"
                >
                  <span class="pc-human-question"
                    >针对先前澄清的超时补答：{{
                      requestPromptById(message.replyToRequestId)
                    }}</span
                  >
                  <strong class="pc-human-answer">{{ lateClarificationText(message.content) }}</strong>
                </div>
                <div v-else-if="message.content" class="pc-user-bubble">
                  {{ message.content }}
                </div>
              </template>
            </div>
          </div>
          <div
            v-if="questionPreviews.length"
            ref="questionRail"
            class="pc-question-rail"
            :class="{
              'is-dense': questionRailDense,
              'can-scroll-up': questionRailCanScrollUp,
              'can-scroll-down': questionRailCanScrollDown,
            }"
            aria-label="问题快速定位"
            @scroll.passive="updateQuestionRailEdges"
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
        <div v-if="activeInteraction" class="pc-hitl-pin">
          <div class="pc-hitl-card">
            <div class="pc-hitl-header">
              <span
                class="pc-hitl-icon"
                :class="{
                  'is-approval': ['approval', 'mcp_setup'].includes(
                    activeInteraction.kind,
                  ),
                }"
                ><i
                  :class="
                    ['approval', 'mcp_setup'].includes(activeInteraction.kind)
                      ? 'el-icon-lock'
                      : 'el-icon-question'
                  " /></span
              ><strong>{{ requestKindLabel(activeInteraction.kind) }}</strong>
              <div
                v-if="pendingInteractions.length > 1"
                class="pc-hitl-request-nav"
              >
                <button
                  type="button"
                  aria-label="上一项待处理请求"
                  @click="selectPendingInteraction(-1)"
                >
                  <i class="el-icon-arrow-left" />
                </button>
                <span
                  >{{ pendingInteractionIndex + 1 }}/{{
                    pendingInteractions.length
                  }}
                  项</span
                >
                <button
                  type="button"
                  aria-label="下一项待处理请求"
                  @click="selectPendingInteraction(1)"
                >
                  <i class="el-icon-arrow-right" />
                </button>
              </div>
              <span
                v-if="activeInteraction.kind === 'clarify'"
                class="pc-hitl-badge"
                >{{ clarifyQuestionIndex + 1 }}/{{
                  clarifyQuestions.length
                }}</span
              ><span v-else-if="approvalSubmitting" class="pc-hitl-badge"
                >提交中</span
              >
            </div>
            <div class="pc-hitl-body">
              <template v-if="activeInteraction.kind === 'clarify'">
                <div v-if="currentClarifyQuestion" class="pc-hitl-question">
                  <div class="pc-hitl-question-heading">
                    <p>{{ currentClarifyQuestion.question }}</p>
                    <span
                      v-if="currentClarifyQuestion.choices.length"
                      class="pc-hitl-question-type"
                      >{{
                        currentClarifyQuestion.multiSelect ? "多选" : "单选"
                      }}</span
                    >
                  </div>
                  <el-checkbox-group
                    v-if="currentClarifyQuestion.multiSelect"
                    :value="clarifyQuestionValue(currentClarifyQuestion)"
                    :disabled="
                      clarifySubmitting ||
                      hasAcceptedClarifyAnswer(currentClarifyQuestion.qid)
                    "
                    @input="
                      setClarifyAnswer(currentClarifyQuestion.qid, $event)
                    "
                  >
                    <el-checkbox
                      v-for="choice in currentClarifyQuestion.choices"
                      :key="choice"
                      :label="choice"
                    />
                    <div
                      v-if="
                        currentClarifyQuestion.choices.length &&
                        !hasAcceptedClarifyAnswer(currentClarifyQuestion.qid)
                      "
                      class="pc-hitl-custom-row"
                      :class="{
                        'is-selected': clarifyOtherSelected(
                          currentClarifyQuestion,
                        ),
                      }"
                    >
                      <el-checkbox label="__other__" aria-label="自定义回答"
                        >自定义回答</el-checkbox
                      >
                      <el-input
                        class="pc-hitl-custom-answer"
                        :value="
                          clarifyOtherAnswers[currentClarifyQuestion.qid] || ''
                        "
                        :disabled="clarifySubmitting"
                        placeholder="输入自定义回答"
                        @focus="
                          selectClarifyCustomAnswer(currentClarifyQuestion.qid)
                        "
                        @input="
                          setClarifyCustomAnswer(
                            currentClarifyQuestion.qid,
                            $event,
                          )
                        "
                      />
                    </div>
                  </el-checkbox-group>
                  <el-radio-group
                    v-else-if="currentClarifyQuestion.choices.length"
                    :value="clarifyQuestionValue(currentClarifyQuestion)"
                    :disabled="
                      clarifySubmitting ||
                      hasAcceptedClarifyAnswer(currentClarifyQuestion.qid)
                    "
                    @input="
                      setClarifyAnswer(currentClarifyQuestion.qid, $event)
                    "
                  >
                    <el-radio
                      v-for="choice in currentClarifyQuestion.choices"
                      :key="choice"
                      :label="choice"
                    />
                    <div
                      v-if="
                        !hasAcceptedClarifyAnswer(currentClarifyQuestion.qid)
                      "
                      class="pc-hitl-custom-row"
                      :class="{
                        'is-selected': clarifyOtherSelected(
                          currentClarifyQuestion,
                        ),
                      }"
                    >
                      <el-radio label="__other__" aria-label="自定义回答"
                        >自定义回答</el-radio
                      >
                      <el-input
                        class="pc-hitl-custom-answer"
                        :value="
                          clarifyOtherAnswers[currentClarifyQuestion.qid] || ''
                        "
                        :disabled="clarifySubmitting"
                        placeholder="输入自定义回答"
                        @focus="
                          selectClarifyCustomAnswer(currentClarifyQuestion.qid)
                        "
                        @input="
                          setClarifyCustomAnswer(
                            currentClarifyQuestion.qid,
                            $event,
                          )
                        "
                      />
                    </div>
                  </el-radio-group>
                  <el-input
                    v-if="!currentClarifyQuestion.choices.length"
                    class="pc-hitl-free-text"
                    type="textarea"
                    :autosize="{ minRows: 1, maxRows: 4 }"
                    :value="clarifyQuestionValue(currentClarifyQuestion)"
                    :disabled="
                      clarifySubmitting ||
                      hasAcceptedClarifyAnswer(currentClarifyQuestion.qid)
                    "
                    placeholder="请输入补充信息"
                    @input="
                      setClarifyAnswer(currentClarifyQuestion.qid, $event)
                    "
                  />
                  <small
                    v-if="hasAcceptedClarifyAnswer(currentClarifyQuestion.qid)"
                    class="pc-hitl-accepted"
                    >已接收：{{
                      acceptedAnswerLabel(
                        activeInteraction,
                        currentClarifyQuestion.qid,
                      ) || "已跳过"
                    }}</small
                  >
                </div>
                <div class="pc-hitl-actions">
                  <button
                    v-if="activeInteraction.late"
                    type="button"
                    :disabled="clarifySubmitting"
                    @click="closeLateClarification"
                  >
                    取消</button
                  ><button
                    v-else
                    type="button"
                    :disabled="clarifySubmitting"
                    @click="skipClarification"
                  >
                    跳过</button
                  ><button
                    v-if="clarifyQuestionIndex > 0"
                    type="button"
                    :disabled="clarifySubmitting"
                    @click="clarifyQuestionIndex--"
                  >
                    上一题</button
                  ><button
                    v-if="clarifyQuestionIndex < clarifyQuestions.length - 1"
                    type="button"
                    :disabled="clarifySubmitting"
                    @click="clarifyQuestionIndex++"
                  >
                    下一题</button
                  ><button
                    v-else
                    class="primary"
                    :disabled="!canSubmitClarification || clarifySubmitting"
                    @click="
                      activeInteraction.late
                        ? submitLateClarification()
                        : submitClarification()
                    "
                  >
                    {{ clarifySubmitting ? "提交中…" : "提交回复" }}
                  </button>
                </div>
              </template>
              <template v-else>
                <div
                  v-if="activeInteraction.kind === 'approval'"
                  class="pc-approval-context"
                >
                  <strong v-if="!activeInteraction.safeCommand">{{
                    activeInteraction.actionTitle || "待授权操作"
                  }}</strong>
                  <el-popover
                    v-if="activeInteraction.safeCommand"
                    trigger="hover"
                    placement="top-start"
                    popper-class="pc-approval-command-popper"
                    :open-delay="100"
                  >
                    <pre class="pc-approval-command-full">{{
                      activeInteraction.safeCommand
                    }}</pre>
                    <code slot="reference" tabindex="0">{{
                      activeInteraction.safeCommand
                    }}</code>
                  </el-popover>
                </div>
                <p v-else>{{ activeInteraction.content }}</p>
                <div
                  v-if="['secret', 'sudo'].includes(activeInteraction.kind)"
                  class="pc-hitl-actions"
                >
                  <span>纯演示模式不收集真实凭据</span>
                  <button @click="resolveDecision('rejected')">取消</button>
                  <button class="primary" @click="resolveDecision('submitted')">
                    模拟安全提交
                  </button>
                </div>
                <div
                  v-else-if="activeInteraction.kind === 'approval'"
                  class="pc-hitl-actions is-approval"
                >
                  <div
                    v-if="selectedApprovalChoice"
                    class="pc-approval-scope-note"
                    :title="selectedApprovalHint"
                    aria-live="polite"
                  >
                    <i class="el-icon-info" aria-hidden="true" />
                    <span>{{ selectedApprovalHint }}</span>
                  </div>
                  <button
                    v-if="approvalDenyChoice"
                    type="button"
                    class="reject"
                    :disabled="approvalSubmitting"
                    @click="resolveDecision(approvalDenyChoice.value)"
                  >
                    {{ approvalDenyChoice.label }}
                  </button>
                  <div
                    v-if="selectedApprovalChoice"
                    class="pc-approval-split"
                    :class="{
                      'has-options': approvalAllowedChoices.length > 1,
                    }"
                  >
                    <button
                      type="button"
                      class="primary pc-approval-main"
                      :disabled="approvalSubmitting"
                      @click="resolveDecision(selectedApprovalChoice.value)"
                    >
                      {{ selectedApprovalChoice.label }}
                    </button>
                    <el-dropdown
                      v-if="approvalAllowedChoices.length > 1"
                      trigger="click"
                      placement="top-end"
                      @command="selectApprovalChoice"
                    >
                      <button
                        type="button"
                        class="primary pc-approval-toggle"
                        :disabled="approvalSubmitting"
                        aria-label="选择允许范围"
                        title="选择允许范围"
                      >
                        <i class="el-icon-arrow-up" />
                      </button>
                      <el-dropdown-menu
                        slot="dropdown"
                        class="pc-approval-options"
                      >
                        <el-dropdown-item
                          v-for="choice in approvalAllowedChoices"
                          :key="choice.value"
                          :command="choice.value"
                        >
                          <i
                            :class="
                              selectedApprovalChoice.value === choice.value
                                ? 'el-icon-check'
                                : 'pc-approval-choice-spacer'
                            "
                          />
                          {{ choice.label }}
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </el-dropdown>
                  </div>
                </div>
                <div v-else class="pc-hitl-actions">
                  <button
                    v-for="choice in activeInteraction.choices"
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
              </template>
            </div>
          </div>
        </div>
        <div
          v-if="sessionStatusCards.length"
          class="pc-status-pin"
          :class="{ 'is-secondary': !!activeInteraction }"
        >
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
          <div class="pc-composer">
            <div
              v-if="pendingFiles.length || pendingReferences.length"
              class="pc-selected-resources"
            >
              <button
                v-if="resourceCanScrollLeft"
                type="button"
                class="pc-resource-nav is-left"
                aria-label="向左查看资料"
                @click="scrollResourceStrip(-1)"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M12.5 4.5 7 10l5.5 5.5" />
                </svg>
              </button>
              <div
                ref="resourceStrip"
                class="pc-selected-resources-list"
                role="list"
                aria-label="待发送资料"
                tabindex="0"
                @scroll="updateResourceOverflow"
                @keydown.left.prevent="scrollResourceStrip(-1)"
                @keydown.right.prevent="scrollResourceStrip(1)"
              >
                <el-tooltip
                  v-for="file in pendingFiles"
                  :key="file.id"
                  :content="file.name"
                  placement="top"
                  effect="light"
                  :open-delay="120"
                  :enterable="false"
                  popper-class="pc-resource-name-tooltip"
                >
                  <div
                    class="pc-resource-chip pc-pending-resource-chip is-upload"
                    role="listitem"
                  >
                    <img
                      v-if="file.previewUrl"
                      :src="file.previewUrl"
                      :alt="file.name"
                      class="pc-resource-thumbnail"
                    />
                    <span
                      v-else
                      class="pc-resource-format"
                      :class="`is-${resourceFormat(file.name).tone}`"
                      aria-hidden="true"
                      >{{ resourceFormat(file.name).label }}</span
                    >
                    <span class="pc-resource-copy">
                      <strong>{{ file.name }}</strong>
                      <small>本地上传</small>
                    </span>
                    <button
                      type="button"
                      :aria-label="`移除本轮文件 ${file.name}`"
                      @click="removePendingFile(file)"
                    >
                      <i class="el-icon-close" />
                    </button>
                  </div>
                </el-tooltip>
                <el-tooltip
                  v-for="reference in pendingReferences"
                  :key="`${reference.kind}:${reference.id}`"
                  :content="resourceReferenceTooltip(reference)"
                  placement="top"
                  effect="light"
                  :open-delay="120"
                  :enterable="false"
                  popper-class="pc-resource-name-tooltip"
                >
                  <div
                    class="pc-resource-chip pc-pending-resource-chip"
                    :class="`is-${reference.kind}`"
                    role="listitem"
                  >
                    <span
                      v-if="reference.kind === 'knowledge_library'"
                      class="pc-resource-icon is-library"
                      aria-hidden="true"
                      ><i class="el-icon-folder-opened"
                    /></span>
                    <span
                      v-else-if="reference.kind === 'knowledge_document'"
                      class="pc-resource-icon is-knowledge-document"
                      aria-hidden="true"
                      ><i class="el-icon-document"
                    /></span>
                    <span
                      v-else
                      class="pc-resource-format"
                      :class="`is-${resourceFormat(reference.name).tone}`"
                      aria-hidden="true"
                      >{{ resourceFormat(reference.name).label }}</span
                    >
                    <span class="pc-resource-copy">
                      <strong>{{ reference.name }}</strong>
                      <small>{{ resourceSourceLabel(reference.kind) }}</small>
                    </span>
                    <button
                      type="button"
                      :aria-label="`移除本轮引用 ${reference.name}`"
                      @click="removePendingReference(reference)"
                    >
                      <i class="el-icon-close" />
                    </button>
                  </div>
                </el-tooltip>
              </div>
              <button
                v-if="resourceCanScrollRight"
                type="button"
                class="pc-resource-nav is-right"
                aria-label="向右查看资料"
                @click="scrollResourceStrip(1)"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M7.5 4.5 13 10l-5.5 5.5" />
                </svg>
              </button>
            </div>
            <textarea
              ref="composer"
              v-model="draft"
              :disabled="!!pendingInteraction"
              rows="2"
              :placeholder="
                pendingFiles.length || pendingReferences.length
                  ? '请输入任务指令后发送'
                  : '向专家输入任务指令...'
              "
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
            <div class="pc-composer-toolbar">
              <div class="pc-composer-leading">
                <el-popover
                  v-if="expert.presetEnabled && expert.presetQuestions.length"
                  placement="top-start"
                  trigger="click"
                  width="340"
                  popper-class="pc-preset-popover"
                  :disabled="!!pendingInteraction"
                >
                  <strong>预置问题</strong>
                  <button
                    v-for="(question, index) in expert.presetQuestions"
                    :key="question"
                    type="button"
                    @click="selectPresetQuestion(question)"
                  >
                    <b>{{ index + 1 }}</b
                    >{{ question }}
                  </button>
                  <button
                    slot="reference"
                    type="button"
                    class="pc-composer-tool"
                    title="预置问题"
                    aria-label="预置问题"
                    :disabled="!!pendingInteraction"
                  >
                    <svg
                      class="pc-preset-question-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path
                        d="M9.6 9a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2.1-2.4 3.8"
                      />
                      <circle
                        cx="12"
                        cy="17"
                        r="0.8"
                        fill="currentColor"
                        stroke="none"
                      />
                    </svg>
                  </button>
                </el-popover>
                <button
                  type="button"
                  class="pc-composer-tool"
                  title="上传本地文件"
                  aria-label="上传本地文件"
                  :disabled="!!pendingInteraction || uploadingFiles"
                  @click="$refs.composerUpload.click()"
                >
                  <i class="el-icon-paperclip" />
                </button>
                <input
                  ref="composerUpload"
                  type="file"
                  hidden
                  multiple
                  @change="attachFile"
                />
                <el-popover
                  v-model="referencePickerVisible"
                  placement="top-start"
                  trigger="click"
                  width="440"
                  popper-class="pc-reference-popper"
                  :disabled="!!pendingInteraction"
                  @show="beginReferenceSelection"
                >
                  <div class="pc-reference-picker">
                    <div
                      class="pc-reference-tabs"
                      role="tablist"
                      aria-label="引用来源"
                    >
                      <button
                        type="button"
                        role="tab"
                        :aria-selected="referenceTab === 'knowledge'"
                        :class="{ active: referenceTab === 'knowledge' }"
                        @click="referenceTab = 'knowledge'"
                      >
                        知识中心
                      </button>
                      <button
                        type="button"
                        role="tab"
                        :aria-selected="referenceTab === 'workspace'"
                        :class="{ active: referenceTab === 'workspace' }"
                        @click="referenceTab = 'workspace'"
                      >
                        工作空间
                      </button>
                    </div>
                    <template v-if="referenceTab === 'knowledge'">
                      <p
                        v-if="!knowledgeReferenceEnabled"
                        class="pc-reference-notice"
                      >
                        当前专家未启用知识库，请先在专家管理中开启。
                      </p>
                      <div
                        v-if="activeKnowledgeLibrary"
                        class="pc-reference-breadcrumb"
                      >
                        <button type="button" @click="backToKnowledgeLibraries">
                          <i class="el-icon-arrow-left" /> 知识库
                        </button>
                        <span>{{ activeKnowledgeLibrary.name }}</span>
                      </div>
                      <div class="pc-reference-search">
                        <i class="el-icon-search" />
                        <input
                          v-model="knowledgeSearch"
                          type="search"
                          :placeholder="
                            activeKnowledgeLibrary
                              ? '搜索当前知识库的文档'
                              : '搜索知识库'
                          "
                        />
                      </div>
                      <div class="pc-reference-list">
                        <template v-if="!activeKnowledgeLibrary">
                          <div
                            v-for="library in filteredKnowledgeLibraries"
                            :key="library.id"
                            class="pc-reference-row"
                            :class="{
                              disabled:
                                library.status !== 'ready' ||
                                !knowledgeReferenceEnabled,
                            }"
                          >
                            <button
                              type="button"
                              class="pc-reference-entry"
                              :disabled="
                                library.status !== 'ready' ||
                                !knowledgeReferenceEnabled
                              "
                              @click="enterKnowledgeLibrary(library)"
                            >
                              <i class="el-icon-folder-opened" />
                              <span
                                ><strong>{{ library.name }}</strong
                                ><small>{{
                                  library.status === "ready"
                                    ? `${demoDocumentCount(library.id)} 个演示文档 · ${library.source}`
                                    : library.statusReason
                                }}</small></span
                              >
                            </button>
                            <el-tooltip
                              :content="
                                knowledgeLibraryActionHint(library, 'open')
                              "
                              placement="top"
                              effect="light"
                              :open-delay="0"
                              :enterable="false"
                            >
                              <span class="pc-reference-action-wrap">
                                <button
                                  type="button"
                                  class="pc-reference-open"
                                  :aria-label="`打开知识库 ${library.name}`"
                                  :disabled="
                                    library.status !== 'ready' ||
                                    !knowledgeReferenceEnabled
                                  "
                                  @click="enterKnowledgeLibrary(library)"
                                >
                                  <i class="el-icon-arrow-right" />
                                </button>
                              </span>
                            </el-tooltip>
                            <el-tooltip
                              :content="
                                knowledgeLibraryActionHint(library, 'reference')
                              "
                              placement="top"
                              effect="light"
                              :open-delay="0"
                              :enterable="false"
                            >
                              <span class="pc-reference-action-wrap">
                                <button
                                  type="button"
                                  class="pc-reference-select"
                                  :class="{
                                    selected: isReferenceSelected(
                                      'knowledge_library',
                                      library.id,
                                    ),
                                  }"
                                  :aria-label="`${isReferenceSelected('knowledge_library', library.id) ? '取消引用' : '引用'}知识库 ${library.name}`"
                                  :disabled="
                                    library.status !== 'ready' ||
                                    !knowledgeReferenceEnabled
                                  "
                                  @click="
                                    toggleReference(libraryReference(library))
                                  "
                                >
                                  <i
                                    v-if="
                                      isReferenceSelected(
                                        'knowledge_library',
                                        library.id,
                                      )
                                    "
                                    class="el-icon-check"
                                  /><i v-else class="pc-reference-at-icon">@</i>
                                </button>
                              </span>
                            </el-tooltip>
                          </div>
                          <p
                            v-if="!filteredKnowledgeLibraries.length"
                            class="pc-reference-empty"
                          >
                            没有匹配的知识库
                          </p>
                        </template>
                        <template v-else>
                          <button
                            v-for="document in filteredKnowledgeDocuments"
                            :key="document.id"
                            type="button"
                            class="pc-reference-document"
                            :class="{
                              selected: isReferenceSelected(
                                'knowledge_document',
                                document.id,
                              ),
                            }"
                            @click="
                              toggleReference(documentReference(document))
                            "
                          >
                            <i class="el-icon-document" />
                            <span
                              ><strong>{{ document.name }}</strong
                              ><small
                                >{{ document.type }} ·
                                {{ activeKnowledgeLibrary.name }}</small
                              ></span
                            >
                            <i
                              v-if="
                                isReferenceSelected(
                                  'knowledge_document',
                                  document.id,
                                )
                              "
                              class="el-icon-check"
                            /><i v-else class="pc-reference-at-icon">@</i>
                          </button>
                          <p
                            v-if="!filteredKnowledgeDocuments.length"
                            class="pc-reference-empty"
                          >
                            当前知识库没有匹配的文档
                          </p>
                        </template>
                      </div>
                    </template>
                    <template v-else>
                      <div class="pc-reference-search">
                        <i class="el-icon-search" />
                        <input
                          v-model="workspaceSearch"
                          type="search"
                          placeholder="搜索工作空间文件"
                        />
                      </div>
                      <div class="pc-reference-list">
                        <div
                          v-for="node in referenceWorkspaceRows"
                          :key="node.item.id"
                          class="pc-reference-tree-row"
                          :style="{ paddingLeft: `${8 + node.depth * 16}px` }"
                        >
                          <button
                            v-if="node.item.kind === 'folder'"
                            type="button"
                            class="pc-reference-tree-entry"
                            @click="toggleReferenceFolder(node.item.id)"
                          >
                            <i
                              :class="
                                referenceExpandedFolderIds.includes(
                                  node.item.id,
                                )
                                  ? 'el-icon-arrow-down'
                                  : 'el-icon-arrow-right'
                              "
                            />
                            <i class="el-icon-folder" />
                            <span>{{ node.item.name }}</span>
                          </button>
                          <button
                            v-else
                            type="button"
                            class="pc-reference-tree-entry"
                            :class="{
                              selected: isReferenceSelected(
                                'workspace_file',
                                node.item.id,
                              ),
                            }"
                            :title="filePath(node.item)"
                            @click="
                              toggleReference(workspaceReference(node.item))
                            "
                          >
                            <span class="pc-reference-tree-spacer" />
                            <i class="el-icon-document" />
                            <span>{{ node.item.name }}</span>
                            <i
                              v-if="
                                isReferenceSelected(
                                  'workspace_file',
                                  node.item.id,
                                )
                              "
                              class="el-icon-check"
                            /><i v-else class="pc-reference-at-icon">@</i>
                          </button>
                        </div>
                        <p
                          v-if="!referenceWorkspaceRows.length"
                          class="pc-reference-empty"
                        >
                          没有匹配的工作空间文件
                        </p>
                      </div>
                    </template>
                  </div>
                  <button
                    slot="reference"
                    type="button"
                    class="pc-composer-tool pc-reference-trigger"
                    title="引用知识中心或工作空间资料"
                    aria-label="引用知识中心或工作空间资料"
                    :disabled="!!pendingInteraction"
                  >
                    @
                  </button>
                </el-popover>
              </div>
              <div class="pc-composer-trailing">
                <div class="pc-composer-settings">
                  <el-popover
                    v-model="modelPickerVisible"
                    placement="top"
                    trigger="click"
                    width="380"
                    popper-class="pc-model-picker-popper"
                  >
                    <div class="pc-model-picker">
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
                        <button
                          v-else
                          class="pc-model-option"
                          :class="{ active: model === '通用大模型' }"
                          @click="selectModel('通用大模型')"
                        >
                          <strong>通用大模型</strong
                          ><span class="pc-model-tag manual">手动</span
                          ><small>演示模型</small>
                        </button>
                      </div>
                    </div>
                    <button
                      slot="reference"
                      type="button"
                      class="pc-config-trigger"
                    >
                      模型：{{ model }} <i class="el-icon-caret-bottom" />
                    </button>
                  </el-popover>
                  <el-popover
                    v-model="cwdPickerVisible"
                    placement="top"
                    trigger="click"
                    width="270"
                    popper-class="pc-cwd-picker-popper"
                    :disabled="
                      !!pendingInteraction || conversation.status === 'running'
                    "
                    @show="beginCwdSelection"
                  >
                    <div class="pc-cwd-picker">
                      <div class="pc-cwd-picker-title">选择工作目录</div>
                      <button
                        type="button"
                        class="pc-cwd-picker-root"
                        :class="{ selected: conversation.cwd === '/' }"
                        @click="chooseCwd('/')"
                      >
                        <i class="el-icon-folder-opened" /> workspace
                        <i
                          v-if="conversation.cwd === '/'"
                          class="el-icon-check"
                        />
                      </button>
                      <div class="pc-cwd-picker-list">
                        <div
                          v-for="node in cwdFolderRows"
                          :key="node.item.id"
                          class="pc-cwd-picker-row"
                          :style="{ paddingLeft: `${8 + node.depth * 16}px` }"
                        >
                          <button
                            v-if="node.hasChildren"
                            type="button"
                            class="pc-cwd-expand"
                            :aria-label="`展开或收起 ${node.item.name}`"
                            @click="toggleCwdFolder(node.item.id)"
                          >
                            <i
                              :class="
                                cwdExpandedFolderIds.includes(node.item.id)
                                  ? 'el-icon-arrow-down'
                                  : 'el-icon-arrow-right'
                              "
                            />
                          </button>
                          <span v-else class="pc-cwd-expand-spacer" />
                          <button
                            type="button"
                            class="pc-cwd-folder"
                            :class="{
                              selected:
                                conversation.cwd === folderPath(node.item.id),
                            }"
                            :title="folderPath(node.item.id)"
                            @click="chooseCwd(folderPath(node.item.id))"
                          >
                            <i class="el-icon-folder" /> {{ node.item.name }}
                            <i
                              v-if="
                                conversation.cwd === folderPath(node.item.id)
                              "
                              class="el-icon-check"
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      slot="reference"
                      type="button"
                      class="pc-config-trigger"
                      :title="`工作目录：${cwdLabel(conversation.cwd, 'workspace')}`"
                      :disabled="
                        !!pendingInteraction ||
                        conversation.status === 'running'
                      "
                    >
                      工作目录：{{ taskCwdName(conversation.cwd) }}
                      <i class="el-icon-caret-bottom" />
                    </button>
                  </el-popover>
                </div>
                <button
                  type="button"
                  class="pc-send"
                  :class="{ 'pc-send-stop': conversation.status === 'running' }"
                  :disabled="
                    !!pendingInteraction ||
                    uploadingFiles ||
                    (conversation.status !== 'running' && !draft.trim())
                  "
                  :title="
                    conversation.status === 'running'
                      ? '停止生成'
                      : !draft.trim() &&
                          (pendingFiles.length || pendingReferences.length)
                        ? '请输入任务指令后发送'
                        : '发送 (Enter)'
                  "
                  :aria-label="
                    conversation.status === 'running'
                      ? '停止生成'
                      : !draft.trim() &&
                          (pendingFiles.length || pendingReferences.length)
                        ? '请输入任务指令后发送'
                        : '发送'
                  "
                  @click="conversation.status === 'running' ? stop() : send()"
                >
                  <span
                    v-if="conversation.status === 'running'"
                    class="pc-stop-square"
                  />
                  <i v-else class="el-icon-position" />
                </button>
              </div>
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
            ><el-tooltip
              v-if="node.item.kind === 'file'"
              content="引用文件"
              placement="top"
              effect="light"
              :open-delay="320"
              :enterable="false"
            >
              <button
                class="pc-workspace-file-action"
                aria-label="引用文件"
                :disabled="!!pendingInteraction"
                @click.stop="referenceWorkspaceFile(node.item)"
              >
                <span class="pc-workspace-reference-at" aria-hidden="true"
                  >@</span
                >
              </button> </el-tooltip
            ><button
              v-if="node.item.kind === 'file'"
              class="pc-workspace-file-action"
              title="下载文件"
              aria-label="下载文件"
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
              : "确定删除该任务？对话记录和本任务上传的附件将被删除，工作空间文件保留"
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
    <div
      v-show="resultPathTooltip.text"
      ref="resultPathTooltip"
      class="pc-result-path-tooltip"
      :class="{ 'is-visible': resultPathTooltip.visible }"
      :style="{
        left: `${resultPathTooltip.left}px`,
        top: `${resultPathTooltip.top}px`,
      }"
      role="tooltip"
    >
      {{ resultPathTooltip.text }}
    </div>
    <el-dialog
      :visible.sync="previewVisible"
      width="720px"
      custom-class="pc-dialog pc-preview-dialog"
      append-to-body
      @closed="clearPreview"
      ><div slot="title" class="pc-dialog-head">
        <div
          class="pc-dialog-icon"
          :class="{
            'is-modified': previewItem && previewItem.operation === 'modified',
          }"
        >
          <i
            :class="
              previewItem && previewItem.operation === 'modified'
                ? 'el-icon-edit-outline'
                : 'el-icon-document'
            "
          />
        </div>
        <div>
          <strong>{{ previewItem && previewItem.name }}</strong>
          <small v-if="previewItem && previewItem.operation">
            {{ resultOperationLabel(previewItem.operation) }} ·
            {{
              previewItem.versionScope === "round" ? "本轮版本" : "当前文件版本"
            }}
          </small>
          <small v-if="previewItem && previewItem.operation">{{
            workspaceResultPath(previewItem)
          }}</small>
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
  submitDemoLateClarification,
  stopDemoStream,
  addWorkspaceItem,
  removeWorkspaceItems,
  persist,
} from "../state";
import { KNOWLEDGE_CATALOG, KNOWLEDGE_DOCUMENTS } from "../knowledge-demo";
import { saveFile, readFile, deleteFile } from "../file-db";
import { avatarSrcFor } from "../avatar";
import {
  conversationProcessBlocks,
  formatTurnDuration,
  turnResultsVisible,
} from "../conversation-turns";
import { hasToolDetail } from "../conversation-tools";
import {
  emptySessionPresentation,
  todoProgress,
} from "../conversation-session-state";
import ConversationMarkdown from "../components/ConversationMarkdown.vue";
import ConversationDiff from "../components/ConversationDiff.vue";
function approvalDisplayRequest(request) {
  if (request?.kind !== "approval") return request;
  const legacyTitle = {
    执行演示核对命令: "执行核对命令",
    读取演示核对资料: "读取核对资料",
  };
  return {
    ...request,
    prompt:
      request.prompt === "此步骤需要确认是否允许继续执行演示操作。"
        ? "请确认是否允许执行当前操作。"
        : request.prompt,
    actionTitle: legacyTitle[request.actionTitle] || request.actionTitle,
    actionDetail:
      [
        "此操作需要授权；允许后仅尝试执行，实际结果另行显示。",
        "该命令需要授权，结果将单独呈现。",
      ].includes(request.actionDetail)
        ? ""
        : request.actionDetail === "读取示例文件，允许后仅尝试执行。"
          ? "该文件需要读取授权。"
          : request.actionDetail,
    safeCommand:
      request.safeCommand === "echo 演示核对完成"
        ? "echo 核对完成"
        : request.safeCommand,
  };
}
function emptyConversation() {
  return {
    id: null,
    title: "",
    status: "ready",
    archived: false,
    cwd: "/",
    model: "gpt-4o",
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
  components: { ConversationMarkdown, ConversationDiff },
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
      questionRailDense: false,
      questionRailCanScrollUp: false,
      questionRailCanScrollDown: false,
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
      uploadingFiles: false,
      uploadGeneration: 0,
      pendingReferences: [],
      resourceCanScrollLeft: false,
      resourceCanScrollRight: false,
      sentResourceScroll: {},
      referencePickerVisible: false,
      referenceTab: "knowledge",
      activeKnowledgeLibraryId: null,
      knowledgeSearch: "",
      workspaceSearch: "",
      referenceExpandedFolderIds: [],
      cwdExpandedFolderIds: [],
      clarifyAnswers: {},
      clarifyOtherAnswers: {},
      clarifyQuestionIndex: 0,
      clarifySubmitting: false,
      approvalSubmitting: false,
      selectedRequestId: null,
      interactionDrafts: {},
      approvalSelection: { requestId: null, value: null },
      lateClarifyRequestId: null,
      lateClarifyOpen: false,
      pathPopoverDismissed: false,
      marqueeTaskId: null,
      marqueeDistance: 0,
      marqueeDuration: 6,
      expandedProcess: [],
      expandedActivities: [],
      expandedActivityIds: [],
      activityListFollowBottom: {},
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
      resultPathTooltip: { text: "", visible: false, left: 0, top: 0 },
    };
  },
  computed: {
    knowledgeReferenceEnabled() {
      return this.expert?.knowledge?.scope !== "none";
    },
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
    activeKnowledgeLibrary() {
      return (
        KNOWLEDGE_CATALOG.find(
          (item) => item.id === this.activeKnowledgeLibraryId,
        ) || null
      );
    },
    filteredKnowledgeLibraries() {
      const search = this.knowledgeSearch.trim().toLowerCase();
      return KNOWLEDGE_CATALOG.filter(
        (item) =>
          !search ||
          `${item.name} ${item.description}`.toLowerCase().includes(search),
      );
    },
    filteredKnowledgeDocuments() {
      const search = this.knowledgeSearch.trim().toLowerCase();
      return KNOWLEDGE_DOCUMENTS.filter(
        (item) =>
          item.libraryId === this.activeKnowledgeLibraryId &&
          (!search || item.name.toLowerCase().includes(search)),
      );
    },
    referenceWorkspaceRows() {
      if (!this.expert) return [];
      const search = this.workspaceSearch.trim().toLowerCase();
      const seenFiles = new Set();
      if (search)
        return this.expert.files
          .filter(
            (item) =>
              item.kind === "file" &&
              this.filePath(item).toLowerCase().includes(search),
          )
          .filter((item) => {
            const path = this.filePath(item);
            if (seenFiles.has(path)) return false;
            seenFiles.add(path);
            return true;
          })
          .map((item) => ({ item, depth: 0 }));
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
          if (item.kind === "file") {
            const path = this.filePath(item);
            if (seenFiles.has(path)) continue;
            seenFiles.add(path);
          }
          rows.push({ item, depth });
          if (
            item.kind === "folder" &&
            this.referenceExpandedFolderIds.includes(item.id)
          )
            visit(item.id, depth + 1);
        }
      };
      visit(null, 0);
      return rows;
    },
    cwdFolderRows() {
      if (!this.expert) return [];
      const rows = [];
      const visit = (parentId, depth) => {
        const folders = this.expert.files
          .filter(
            (item) => item.kind === "folder" && item.parentId === parentId,
          )
          .sort((a, b) => a.name.localeCompare(b.name));
        for (const item of folders) {
          rows.push({
            item,
            depth,
            hasChildren: this.expert.files.some(
              (child) => child.kind === "folder" && child.parentId === item.id,
            ),
          });
          if (this.cwdExpandedFolderIds.includes(item.id))
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
    pendingInteractions() {
      return (this.conversation?.turns || [])
        .flatMap((turn) => turn.requests || [])
        .filter((request) => request.status === "waiting");
    },
    pendingInteraction() {
      const request =
        this.pendingInteractions.find(
          (item) => item.id === this.selectedRequestId,
        ) || this.pendingInteractions[0];
      if (!request) return null;
      const display = approvalDisplayRequest(request);
      return {
        ...display,
        content: display.prompt,
        choices: display.choices || [],
      };
    },
    pendingInteractionIndex() {
      return Math.max(
        0,
        this.pendingInteractions.findIndex(
          (item) => item.id === this.pendingInteraction?.id,
        ),
      );
    },
    lateClarifyRequest() {
      for (const turn of this.conversation?.turns || []) {
        const request = (turn.requests || []).find(
          (item) =>
            item.id === this.lateClarifyRequestId &&
            item.kind === "clarify" &&
            item.status === "expired" &&
            !item.lateAnswer,
        );
        if (request) return request;
      }
      return null;
    },
    activeInteraction() {
      if (this.pendingInteraction) return this.pendingInteraction;
      if (!this.lateClarifyOpen || !this.lateClarifyRequest) return null;
      return {
        ...this.lateClarifyRequest,
        content: this.lateClarifyRequest.prompt,
        late: true,
      };
    },
    activeInteractionKey() {
      const request = this.activeInteraction;
      return request ? `${request.id}:${request.late ? "late" : "live"}` : "";
    },
    clarifyQuestions() {
      const request = this.activeInteraction;
      if (request?.kind !== "clarify") return [];
      if (request.questions?.length) return request.questions;
      return [
        {
          qid: "single",
          question: request.content,
          choices: (request.choices || []).map(
            (choice) => choice.label || choice.value,
          ),
          multiSelect: Boolean(request.multiSelect),
        },
      ];
    },
    currentClarifyQuestion() {
      return this.clarifyQuestions[
        Math.min(this.clarifyQuestionIndex, this.clarifyQuestions.length - 1)
      ];
    },
    approvalAllowedChoices() {
      if (this.pendingInteraction?.kind !== "approval") return [];
      return this.pendingInteraction.choices.filter((choice) =>
        ["once", "session", "always", "approved"].includes(choice.value),
      );
    },
    approvalDenyChoice() {
      if (this.pendingInteraction?.kind !== "approval") return null;
      return (
        this.pendingInteraction.choices.find((choice) =>
          ["deny", "rejected"].includes(choice.value),
        ) || null
      );
    },
    selectedApprovalChoice() {
      const choices = this.approvalAllowedChoices;
      if (this.approvalSelection.requestId === this.pendingInteraction?.id) {
        const selected = choices.find(
          (choice) => choice.value === this.approvalSelection.value,
        );
        if (selected) return selected;
      }
      return choices[0] || null;
    },
    selectedApprovalHint() {
      return (
        {
          once: "仅授权当前操作，后续同类操作仍需确认。",
          approved: "仅授权当前操作，后续同类操作仍需确认。",
          session: "本会话内匹配的操作无需再次确认。",
          always: "后续会话中匹配的操作将持续允许，提交前需再次确认。",
        }[this.selectedApprovalChoice?.value] || ""
      );
    },
    canSubmitClarification() {
      const request = this.activeInteraction;
      if (!request || request.kind !== "clarify") return false;
      if (
        request.late &&
        this.clarifyQuestions.every((question) =>
          this.hasAcceptedClarifyAnswer(question.qid),
        )
      )
        return false;
      return this.clarifyQuestions.every((question) => {
        if (this.hasAcceptedClarifyAnswer(question.qid)) return true;
        const answer = this.clarifyAnswerForSubmit(question);
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
    activityListContentSignature() {
      return (this.conversation?.turns || [])
        .flatMap((turn) =>
          (turn.activities || []).map(
            (activity) =>
              `${activity.id}:${activity.status}:${activity.progressText?.length || 0}:${activity.detail?.length || 0}:${activity.outputDetail?.length || 0}:${(activity.outputSections || []).length}`,
          ),
        )
        .join("|");
    },
  },
  mounted() {
    this.model = this.conversation?.model || "gpt-4o";
    window.addEventListener("resize", this.handleViewportResize);
    if (typeof ResizeObserver !== "undefined") {
      this._resourceResizeObserver = new ResizeObserver(
        this.updateResourceOverflow,
      );
      this._sentResourceResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries)
          this.updateSentResourceOverflow(entry.target.dataset.messageId);
      });
      this._questionRailResizeObserver = new ResizeObserver(
        this.updateQuestionRail,
      );
    }
    this.turnClock = setInterval(() => {
      if (
        this.conversation?.turns?.some((turn) =>
          ["running", "recovering", "waiting"].includes(turn.status),
        )
      )
        this.clockNow = Date.now();
    }, 1000);
    if (this.$route.query.conv && this.isDraftTask && this.expert) {
      const { conv, ...query } = this.$route.query;
      this.$router
        .replace({ name: "chat", params: { id: this.expert.id }, query })
        .catch(() => {});
    }
    this.$nextTick(() => {
      this.resizeComposer();
      this.updateResourceOverflow();
      this.syncSentResourceStrips();
      this.observeQuestionRail();
      this.scrollBottom();
    });
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.handleViewportResize);
    this._resourceResizeObserver?.disconnect();
    this._sentResourceResizeObserver?.disconnect();
    this._questionRailResizeObserver?.disconnect();
    clearInterval(this.turnClock);
    if (this.$route.query.conv) stopDemoStream(this.$route.query.conv);
    this.discardPendingUploads();
    this.clearPreview();
  },
  watch: {
    activeInteractionKey(next, prior) {
      if (prior)
        this.$set(this.interactionDrafts, prior, {
          answers: { ...this.clarifyAnswers },
          otherAnswers: { ...this.clarifyOtherAnswers },
          questionIndex: this.clarifyQuestionIndex,
        });
      const saved = this.interactionDrafts[next];
      this.clarifyAnswers = { ...(saved?.answers || {}) };
      this.clarifyOtherAnswers = { ...(saved?.otherAnswers || {}) };
      this.clarifyQuestionIndex = saved?.questionIndex || 0;
      this.clarifySubmitting = false;
    },
    draft() {
      this.$nextTick(this.resizeComposer);
    },
    pendingFiles() {
      this.$nextTick(this.updateResourceOverflow);
    },
    pendingReferences() {
      this.$nextTick(this.updateResourceOverflow);
    },
    "$route.query.conv"(next, prior) {
      if (prior && next !== prior) stopDemoStream(prior);
      Object.keys(this.statusExpanded).forEach((key) => {
        this.statusExpanded[key] = false;
      });
      this.expandedQueueItemId = null;
      this.hoveredQuestionIndex = null;
      this.draft = "";
      this.discardPendingUploads();
      this.pendingFiles = [];
      this.pendingReferences = [];
      this.sentResourceScroll = {};
      this.expandedProcess = [];
      this.expandedActivities = [];
      this.expandedActivityIds = [];
      this.activityListFollowBottom = {};
      this.referencePickerVisible = false;
      this.cwdPickerVisible = false;
      this.modelPickerVisible = false;
      this.model = this.conversation?.model || "gpt-4o";
      this.clarifyAnswers = {};
      this.clarifyOtherAnswers = {};
      this.clarifyQuestionIndex = 0;
      this.clarifySubmitting = false;
      this.approvalSubmitting = false;
      this.selectedRequestId = null;
      this.interactionDrafts = {};
      this.approvalSelection = { requestId: null, value: null };
      this.lateClarifyRequestId = null;
      this.lateClarifyOpen = false;
      this.$nextTick(() => {
        this.syncSentResourceStrips();
        this.observeQuestionRail();
        this.scrollBottom();
      });
    },
    "questionPreviews.length"() {
      this.$nextTick(this.observeQuestionRail);
    },
    "conversation.messages.length"() {
      this.$nextTick(() => {
        this.syncSentResourceStrips();
        this.scrollBottom();
      });
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
    activityListContentSignature() {
      this.$nextTick(this.followActivityLists);
    },
  },
  methods: {
    hasUserResources(message) {
      return Boolean(message.attachments?.length || message.references?.length);
    },
    sentResourceElement(messageId) {
      const strips = this.$refs.sentResourceStrips || [];
      return (Array.isArray(strips) ? strips : [strips]).find(
        (strip) => strip.dataset.messageId === messageId,
      );
    },
    updateSentResourceOverflow(messageId) {
      const strip = this.sentResourceElement(messageId);
      if (!strip) return;
      const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
      this.$set(this.sentResourceScroll, messageId, {
        left: strip.scrollLeft > 1,
        right: strip.scrollLeft < maxScrollLeft - 1,
      });
    },
    syncSentResourceStrips() {
      this._sentResourceResizeObserver?.disconnect();
      const strips = this.$refs.sentResourceStrips || [];
      for (const strip of Array.isArray(strips) ? strips : [strips]) {
        this._sentResourceResizeObserver?.observe(strip);
        this.updateSentResourceOverflow(strip.dataset.messageId);
      }
    },
    sentResourceCanScroll(messageId, direction) {
      return Boolean(this.sentResourceScroll[messageId]?.[direction]);
    },
    scrollSentResources(messageId, direction) {
      const strip = this.sentResourceElement(messageId);
      if (!strip) return;
      strip.scrollBy({
        left: direction * Math.max(160, Math.floor(strip.clientWidth * 0.75)),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
    updateResourceOverflow() {
      const strip = this.$refs.resourceStrip;
      if (strip !== this._resourceObservedElement) {
        this._resourceResizeObserver?.disconnect();
        if (strip) this._resourceResizeObserver?.observe(strip);
        this._resourceObservedElement = strip;
      }
      if (!strip) {
        this.resourceCanScrollLeft = false;
        this.resourceCanScrollRight = false;
        return;
      }
      const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
      this.resourceCanScrollLeft = strip.scrollLeft > 1;
      this.resourceCanScrollRight = strip.scrollLeft < maxScrollLeft - 1;
    },
    scrollResourceStrip(direction) {
      const strip = this.$refs.resourceStrip;
      if (!strip) return;
      strip.scrollBy({
        left: direction * Math.max(200, Math.floor(strip.clientWidth * 0.75)),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
    resizeComposer() {
      const composer = this.$refs.composer;
      if (!composer) return;
      const style = window.getComputedStyle(composer);
      const lineHeight = Number.parseFloat(style.lineHeight) || 21;
      const padding =
        (Number.parseFloat(style.paddingTop) || 0) +
        (Number.parseFloat(style.paddingBottom) || 0);
      const minHeight = Math.ceil(lineHeight * 2 + padding);
      const maxHeight = Math.ceil(lineHeight * 10 + padding);
      composer.style.height = `${minHeight}px`;
      const contentHeight = composer.scrollHeight;
      composer.style.height = `${Math.min(maxHeight, Math.max(minHeight, contentHeight))}px`;
      composer.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
    },
    avatarSrcFor,
    demoDocumentCount(libraryId) {
      return KNOWLEDGE_DOCUMENTS.filter((item) => item.libraryId === libraryId)
        .length;
    },
    knowledgeLibraryActionHint(library, action) {
      if (!this.knowledgeReferenceEnabled) return "当前专家未启用知识库";
      if (library.status !== "ready") return library.statusReason;
      if (action === "open") return "打开知识库";
      return this.isReferenceSelected("knowledge_library", library.id)
        ? "取消引用知识库"
        : "引用知识库";
    },
    resourceSourceLabel(kind) {
      return (
        {
          knowledge_library: "知识库",
          knowledge_document: "知识库文档",
          workspace_file: "工作空间",
        }[kind] || "引用资料"
      );
    },
    resourceReferenceTooltip(reference) {
      if (reference.kind === "knowledge_library") return reference.name;
      if (reference.kind === "knowledge_document") {
        return `${reference.libraryName || "知识库"} · ${reference.name}`;
      }
      if (reference.kind === "workspace_file") {
        return String(reference.path || reference.name).replace(/^[\\/]+/, "");
      }
      return reference.name;
    },
    resourceFormat(name) {
      const extension = String(name || "")
        .split(".")
        .pop()
        .toLowerCase();
      return (
        {
          doc: { label: "DOC", tone: "word" },
          docx: { label: "DOC", tone: "word" },
          pdf: { label: "PDF", tone: "pdf" },
          xls: { label: "XLS", tone: "sheet" },
          xlsx: { label: "XLS", tone: "sheet" },
          csv: { label: "CSV", tone: "sheet" },
          png: { label: "IMG", tone: "image" },
          jpg: { label: "IMG", tone: "image" },
          jpeg: { label: "IMG", tone: "image" },
          webp: { label: "IMG", tone: "image" },
          gif: { label: "IMG", tone: "image" },
          ppt: { label: "PPT", tone: "slides" },
          pptx: { label: "PPT", tone: "slides" },
          md: { label: "MD", tone: "text" },
          txt: { label: "TXT", tone: "text" },
          json: { label: "JSON", tone: "text" },
          zip: { label: "ZIP", tone: "archive" },
        }[extension] || { label: "FILE", tone: "file" }
      );
    },
    libraryReference(library) {
      return { kind: "knowledge_library", id: library.id, name: library.name };
    },
    documentReference(document) {
      return {
        kind: "knowledge_document",
        id: document.id,
        name: document.name,
        libraryName: this.activeKnowledgeLibrary?.name || "知识中心",
      };
    },
    workspaceReference(file) {
      return {
        kind: "workspace_file",
        id: file.id,
        name: file.name,
        path: this.filePath(file),
      };
    },
    referenceWorkspaceFile(file) {
      if (this.pendingInteraction || file.kind !== "file") return;
      if (
        this.pendingReferences.some(
          (item) => item.kind === "workspace_file" && item.id === file.id,
        )
      ) {
        this.$message.info("文件已在本轮引用中");
        return;
      }
      const reference = this.workspaceReference(file);
      this.pendingReferences = [...this.pendingReferences, reference];
      this.$message.success("已添加到本轮引用");
    },
    isReferenceSelected(kind, id) {
      return this.pendingReferences.some(
        (item) => item.kind === kind && item.id === id,
      );
    },
    toggleReference(reference) {
      const selected = this.isReferenceSelected(reference.kind, reference.id);
      this.pendingReferences = selected
        ? this.pendingReferences.filter(
            (item) => item.kind !== reference.kind || item.id !== reference.id,
          )
        : [...this.pendingReferences, reference];
    },
    removePendingReference(reference) {
      this.pendingReferences = this.pendingReferences.filter(
        (item) => item.kind !== reference.kind || item.id !== reference.id,
      );
    },
    beginReferenceSelection() {
      this.referenceTab = "knowledge";
      this.activeKnowledgeLibraryId = null;
      this.knowledgeSearch = "";
      this.workspaceSearch = "";
      this.referenceExpandedFolderIds = [];
    },
    enterKnowledgeLibrary(library) {
      if (library.status !== "ready") return;
      this.activeKnowledgeLibraryId = library.id;
      this.knowledgeSearch = "";
    },
    backToKnowledgeLibraries() {
      this.activeKnowledgeLibraryId = null;
      this.knowledgeSearch = "";
    },
    toggleReferenceFolder(id) {
      this.referenceExpandedFolderIds =
        this.referenceExpandedFolderIds.includes(id)
          ? this.referenceExpandedFolderIds.filter((item) => item !== id)
          : [...this.referenceExpandedFolderIds, id];
    },
    beginCwdSelection() {
      const cwd = this.conversation?.cwd;
      const folder = this.expert?.files.find(
        (item) => item.kind === "folder" && this.folderPath(item.id) === cwd,
      );
      const ids = [];
      let current = folder;
      while (current) {
        ids.unshift(current.id);
        current = this.expert.files.find(
          (item) => item.id === current.parentId,
        );
      }
      this.cwdExpandedFolderIds = ids;
    },
    toggleCwdFolder(id) {
      this.cwdExpandedFolderIds = this.cwdExpandedFolderIds.includes(id)
        ? this.cwdExpandedFolderIds.filter((item) => item !== id)
        : [...this.cwdExpandedFolderIds, id];
    },
    chooseCwd(path) {
      this.setCwd(path);
      this.cwdPickerVisible = false;
    },
    selectPresetQuestion(question) {
      const apply = () => {
        this.draft = question;
        this.focusComposer();
      };
      if (!this.draft.trim()) return apply();
      this.$confirm("当前输入尚未发送，是否用预置问题替换？", "替换输入", {
        confirmButtonText: "替换",
        cancelButtonText: "取消",
        type: "warning",
      })
        .then(apply)
        .catch(() => {});
    },
    handleViewportResize() {
      const narrow = window.innerWidth <= 900;
      if (narrow !== this.isNarrowViewport) this.taskListOpen = false;
      this.isNarrowViewport = narrow;
      this.$nextTick(() => {
        this.updateResourceOverflow();
        this.updateQuestionRail();
      });
    },
    observeQuestionRail() {
      this._questionRailResizeObserver?.disconnect();
      const rail = this.$refs.questionRail;
      if (rail?.parentElement)
        this._questionRailResizeObserver?.observe(rail.parentElement);
      this.updateQuestionRail();
    },
    updateQuestionRail() {
      const rail = this.$refs.questionRail;
      if (!rail) {
        this.questionRailDense = false;
        this.questionRailCanScrollUp = false;
        this.questionRailCanScrollDown = false;
        return;
      }
      const wrapHeight = rail.parentElement?.clientHeight || 0;
      const normalHeight = wrapHeight - Math.min(123, wrapHeight * 0.45);
      const contentHeight = Array.from(rail.children).reduce(
        (height, item) => height + item.offsetHeight,
        0,
      );
      const dense = contentHeight > normalHeight + 1;
      if (this.questionRailDense !== dense) {
        this.questionRailDense = dense;
        this.$nextTick(this.updateQuestionRailEdges);
      } else this.updateQuestionRailEdges();
    },
    updateQuestionRailEdges() {
      const rail = this.$refs.questionRail;
      if (!rail) return;
      const remaining = rail.scrollHeight - rail.clientHeight;
      this.questionRailCanScrollUp = remaining > 1 && rail.scrollTop > 1;
      this.questionRailCanScrollDown =
        remaining > 1 && rail.scrollTop < remaining - 1;
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
    requestPromptLabel(request) {
      if (request.kind !== "approval") return request.prompt;
      const display = approvalDisplayRequest(request);
      return [display.actionTitle || display.prompt, display.safeCommand]
        .filter(Boolean)
        .join(" · ");
    },
    requestResponseLabel(request) {
      if (request.kind === "clarify" && request.skipped) return "跳过";
      if (request.kind === "clarify") return request.response;
      if (request.kind === "approval")
        return (
          {
            once: "允许本次",
            approved: "允许本次",
            session: "允许本会话",
            always: "始终允许",
            deny: "拒绝",
            rejected: "拒绝",
          }[request.response] || "决定待核对"
        );
      if (request.kind === "mcp_setup")
        return request.response === "approved" ? "已允许本次尝试" : "已拒绝";
      if (["secret", "sudo"].includes(request.kind)) return request.response;
      return `用户回复：${request.response}`;
    },
    setClarifyAnswer(qid, value) {
      if (this.clarifySubmitting || this.hasAcceptedClarifyAnswer(qid)) return;
      const question = this.clarifyQuestions.find((item) => item.qid === qid);
      if (question?.multiSelect) {
        const wasCustomSelected =
          Array.isArray(this.clarifyAnswers[qid]) &&
          this.clarifyAnswers[qid].includes("__other__");
        if (wasCustomSelected && !value.includes("__other__"))
          this.$set(this.clarifyOtherAnswers, qid, "");
      } else if (question?.choices.length && value !== "__other__")
        this.$set(this.clarifyOtherAnswers, qid, "");
      this.$set(this.clarifyAnswers, qid, value);
    },
    selectClarifyCustomAnswer(qid) {
      if (this.clarifySubmitting || this.hasAcceptedClarifyAnswer(qid)) return;
      const question = this.clarifyQuestions.find((item) => item.qid === qid);
      if (!question?.choices.length) return;
      if (question.multiSelect) {
        const selected = Array.isArray(this.clarifyAnswers[qid])
          ? this.clarifyAnswers[qid]
          : [];
        if (!selected.includes("__other__"))
          this.$set(this.clarifyAnswers, qid, [...selected, "__other__"]);
      } else this.$set(this.clarifyAnswers, qid, "__other__");
    },
    setClarifyCustomAnswer(qid, text) {
      if (this.clarifySubmitting || this.hasAcceptedClarifyAnswer(qid)) return;
      const question = this.clarifyQuestions.find((item) => item.qid === qid);
      if (!question?.choices.length) return;
      this.$set(this.clarifyOtherAnswers, qid, text);
      if (text.trim()) this.selectClarifyCustomAnswer(qid);
    },
    hasAcceptedClarifyAnswer(qid) {
      return Object.prototype.hasOwnProperty.call(
        this.activeInteraction?.answers || {},
        qid,
      );
    },
    clarifyQuestionValue(question) {
      if (this.hasAcceptedClarifyAnswer(question.qid))
        return this.acceptedAnswerValue(this.activeInteraction, question.qid);
      return (
        this.clarifyAnswers[question.qid] || (question.multiSelect ? [] : "")
      );
    },
    clarifyOtherSelected(question) {
      if (this.hasAcceptedClarifyAnswer(question.qid)) return false;
      const value = this.clarifyAnswers[question.qid];
      return question.multiSelect
        ? Array.isArray(value) && value.includes("__other__")
        : value === "__other__";
    },
    clarifyAnswerForSubmit(question) {
      const value = this.clarifyAnswers[question.qid];
      if (!this.clarifyOtherSelected(question))
        return question.multiSelect
          ? (Array.isArray(value) ? value : [])
              .map((item) => String(item).trim())
              .filter(Boolean)
          : String(value || "").trim();
      const other = String(this.clarifyOtherAnswers[question.qid] || "").trim();
      if (!other) return question.multiSelect ? [] : "";
      return question.multiSelect
        ? value.map((item) => (item === "__other__" ? other : item))
        : other;
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
          recovering: "正在恢复",
          unknown: "运行异常",
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
      const duration = ["running", "recovering", "waiting"].includes(
        turn.status,
      )
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
    requestPromptById(requestId) {
      return (
        (this.conversation?.turns || [])
          .flatMap((turn) => turn.requests || [])
          .find((request) => request.id === requestId)?.prompt || "原澄清问题"
      );
    },
    lateClarificationText(content) {
      return String(content || "").replace(/^超时补答：/, "");
    },
    turnResultFiles(message) {
      const turn = this.turnFor(message);
      if (!turnResultsVisible(turn)) return [];
      return (turn?.results || [])
        .filter((result) => result.kind === "file")
        .map((result) => {
          const file = this.expert?.files?.find(
            (candidate) => candidate.id === result.fileId,
          );
          const source = turn.activities.find(
            (activity) => activity.id === result.sourceToolId,
          );
          const name = result.name || file?.name || "文件已不可用";
          const hasSnapshot = typeof result.snapshotContent === "string";
          const available = hasSnapshot || file?.content != null;
          return {
            ...file,
            ...result,
            id: result.fileId,
            resultId: result.id,
            kind: "result_file",
            name,
            path: result.path || this.workspacePathForFile(file),
            operation: result.operation || "created",
            sourceToolName: source?.title || "",
            versionScope: hasSnapshot ? "round" : "current",
            canDownload: available,
            canPreview:
              available &&
              /\.(?:png|jpe?g|gif|webp|svg|txt|md|csv|json|log)$/i.test(name),
          };
        });
    },
    workspacePathForFile(file) {
      if (!file) return "";
      const names = [];
      const seen = new Set();
      let current = file;
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        names.unshift(current.name);
        if (!current.parentId) return names.join("/");
        current = this.expert?.files?.find(
          (candidate) => candidate.id === current.parentId,
        );
      }
      return "";
    },
    workspaceResultPath(item) {
      const raw = String(item.path || "")
        .trim()
        .replace(/\\/g, "/");
      if (!raw) return "位置未确认";
      const parts = raw.split("/").filter(Boolean);
      const root = parts.findIndex(
        (part) => part.toLowerCase() === "workspace",
      );
      if (root >= 0) return parts.slice(root).join("/");
      if (/^(?:[a-z]:\/|\/|https?:\/\/)/i.test(raw)) return "位置未确认";
      const relative = raw.replace(/^\.\//, "");
      return relative ? `workspace/${relative}` : "位置未确认";
    },
    showResultPathTooltip(item, event) {
      const text = this.workspaceResultPath(item);
      this.resultPathTooltip.text = text;
      this.resultPathTooltip.visible = false;
      this.$nextTick(() => {
        if (this.resultPathTooltip.text === text)
          this.moveResultPathTooltip(event);
      });
    },
    moveResultPathTooltip(event) {
      if (!this.resultPathTooltip.text) return;
      const tooltip = this.$refs.resultPathTooltip;
      if (!tooltip) return;
      const gap = 12;
      const edge = 10;
      const width = tooltip.offsetWidth;
      const height = tooltip.offsetHeight;
      let left = event.clientX + gap;
      let top = event.clientY + gap;
      if (left + width + edge > window.innerWidth)
        left = event.clientX - width - gap;
      if (top + height + edge > window.innerHeight)
        top = event.clientY - height - gap;
      this.resultPathTooltip.left = Math.max(
        edge,
        Math.min(left, window.innerWidth - width - edge),
      );
      this.resultPathTooltip.top = Math.max(
        edge,
        Math.min(top, window.innerHeight - height - edge),
      );
      this.resultPathTooltip.visible = true;
    },
    hideResultPathTooltip() {
      this.resultPathTooltip.text = "";
      this.resultPathTooltip.visible = false;
    },
    resultOperationLabel(operation) {
      return (
        {
          created: "新建",
          modified: "已修改",
          created_modified: "新建并修改",
        }[operation] || "文件"
      );
    },
    turnToolRisks(message) {
      return this.turnFor(message)?.risks || [];
    },
    turnTodoResults(message) {
      const turn = this.turnFor(message);
      if (!turnResultsVisible(turn)) return [];
      return (turn.results || []).filter(
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
    attachmentItem(attachment) {
      return attachment.kind === "local_upload"
        ? attachment
        : this.fileItemById(attachment.id);
    },
    userQuestionLabel(message) {
      return (
        message.content ||
        [...(message.attachments || []), ...(message.references || [])]
          .map((item) => item.name)
          .join("、") ||
        "资料消息"
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
    runningActivitiesLabel(activities) {
      const running = activities.filter((activity) =>
        ["running", "requested"].includes(activity.status),
      );
      const visible = running.slice(0, 2).map((activity) => {
        const progressOrStatus =
          activity.kind === "tool" && activity.argumentSummary
            ? ""
            : activity.progressText ||
              activity.statusText ||
              (activity.status === "requested" ? "等待启动" : "");
        return progressOrStatus
          ? `${this.activityGroupName(activity)} · ${progressOrStatus}`
          : this.activityGroupName(activity);
      });
      return running.length > 2
        ? `${visible.join("、")}等${running.length}项`
        : visible.join("、");
    },
    activityGroupName(activity) {
      if (activity.kind === "subagent" && activity.argumentSummary)
        return `子代理（${activity.argumentSummary}）`;
      if (
        activity.kind === "tool" &&
        ["terminal", "execute_code", "process_manage"].includes(activity.name)
      )
        return activity.title;
      if (activity.kind === "tool" && activity.argumentSummary)
        return `${activity.title} · ${activity.argumentSummary}`;
      return activity.title;
    },
    isMcpTool(activity) {
      return String(activity?.name || "").startsWith("mcp__");
    },
    activityGroupLabel(activities, message) {
      const turnStatus = this.turnFor(message)?.status;
      const running = ["running", "recovering", "waiting"].includes(turnStatus)
        ? this.runningActivitiesLabel(activities)
        : "";
      if (running) return `正在推进：${running}`;
      const names = [
        ...new Set(activities.map((item) => item.title).filter(Boolean)),
      ];
      const summary =
        activities.length > 3
          ? `${names.slice(0, 2).join("、")}等${activities.length}项`
          : names.join("、");
      return `处理经过：${summary}`;
    },
    activityGroupRunning(activities, message) {
      return (
        ["running", "recovering"].includes(this.turnFor(message)?.status) &&
        activities.some((activity) => activity.status === "running")
      );
    },
    toolActivityValue(activity) {
      return (
        activity.progressText ||
        activity.statusText ||
        (["error", "rejected", "interrupted", "unknown"].includes(
          activity.status,
        )
          ? this.activityStatusLabel(activity.status)
          : "")
      );
    },
    activityItemTitle(activity) {
      if (activity.kind === "subagent") {
        const status =
          activity.progressText ||
          (activity.status === "running"
            ? ""
            : this.activityStatusLabel(activity.status));
        return `${this.activityGroupName(activity)}${status ? ` · ${status}` : ""}`;
      }
      if (activity.kind === "tool") {
        const currentValue = this.toolActivityValue(activity);
        return [activity.title, activity.argumentSummary, currentValue]
          .filter(Boolean)
          .join("，");
      }
      return (
        activity.title +
        (activity.progressText
          ? ` · ${activity.progressText}`
          : activity.argumentSummary
            ? ` ${activity.argumentSummary}`
            : "")
      );
    },
    activityStatusLabel(status) {
      return (
        {
          requested: "等待启动",
          running: "正在执行",
          complete: "已完成",
          error: "未完成",
          rejected: "未获授权",
          interrupted: "已中断",
          unknown: "状态待核对",
        }[status] || "状态待核对"
      );
    },
    activityDetail(activity) {
      return [activity.inputDetail, activity.detail, activity.outputDetail]
        .filter(Boolean)
        .join("\n\n");
    },
    isRoutineProcessCheck(activity) {
      return (
        activity.name === "process_manage" &&
        ["查询后台进程", "等待后台进程"].includes(activity.title)
      );
    },
    hasActivityDetail(activity) {
      if (activity.kind === "tool") {
        if (this.isRoutineProcessCheck(activity)) {
          if (["running", "requested"].includes(activity.status)) return false;
          const sections = activity.outputSections || [];
          const result = sections[0]?.text;
          const extra = sections.slice(1);
          if (
            activity.status === "complete" &&
            ["进程状态：运行中", "本次等待结束，后台进程仍在运行"].includes(result) &&
            extra.length <= 1 &&
            extra.every(
              (section) =>
                section.kind === "text" &&
                /^(近期输出|进程输出)：/.test(section.text || ""),
            )
          )
            return false;
        }
        return hasToolDetail(activity);
      }
      return true;
    },
    childConversationFor(activity) {
      if (activity.kind !== "subagent" || !activity.childSessionId) return null;
      const child = conversationById(activity.childSessionId);
      return child?.expertId === this.expert?.id ? child : null;
    },
    sessionSearchTask(item) {
      const task = item?.sessionId ? conversationById(item.sessionId) : null;
      return task?.expertId === this.expert?.id && !task.archived ? task : null;
    },
    processExpanded(message) {
      return (
        this.processLocked(message) ||
        this.expandedProcess.includes(this.processExpansionKey(message))
      );
    },
    processLocked(message) {
      return ["running", "recovering"].includes(this.turnFor(message)?.status);
    },
    processExpansionKey(message) {
      return `${message.id}:${this.turnFor(message)?.status || message.status}`;
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
    activityListElement(groupId) {
      const lists = this.$refs.activityLists || [];
      return (Array.isArray(lists) ? lists : [lists]).find(
        (list) => list.dataset.groupId === groupId,
      );
    },
    trackActivityListScroll(groupId, event) {
      const list = event.target;
      this.$set(
        this.activityListFollowBottom,
        groupId,
        list.scrollHeight - list.scrollTop - list.clientHeight <= 24,
      );
    },
    followActivityLists() {
      for (const [groupId, follow] of Object.entries(
        this.activityListFollowBottom,
      )) {
        if (!follow) continue;
        const list = this.activityListElement(groupId);
        if (list) list.scrollTop = list.scrollHeight;
      }
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
      this.model = this.draftConversation.model;
      this.draft = "";
      this.discardPendingUploads();
      this.pendingFiles = [];
      this.pendingReferences = [];
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
        this.uploadingFiles ||
        !this.draft.trim() ||
        ["running", "recovering"].includes(this.conversation.status)
      )
        return;
      const content = this.draft.trim();
      let conversationId = this.conversation.id;
      if (this.isDraftTask) {
        const created = createConversation(
          this.expert.id,
          conversationTitleFromFirstMessage(content),
        );
        conversationId = created.id;
        if (this.model !== "gpt-4o")
          updateConversation(conversationId, { model: this.model });
        if (this.draftConversation.cwd !== "/")
          updateConversation(conversationId, {
            cwd: this.draftConversation.cwd,
          });
      }
      sendDemoMessage(
        conversationId,
        this.draft.trim(),
        this.pendingFiles,
        this.pendingReferences,
      );
      this.clockNow = Date.now();
      this.draft = "";
      this.clearPendingFilePreviews();
      this.pendingFiles = [];
      this.pendingReferences = [];
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
      if (this.isDraftTask) this.draftConversation.model = name;
      else if (this.conversation?.id)
        updateConversation(this.conversation.id, { model: name });
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
        !message ||
        !this.hasProcessContent(message) ||
        this.processLocked(message)
      )
        return;
      const key = this.processExpansionKey(message);
      this.expandedProcess = this.expandedProcess.includes(key)
        ? this.expandedProcess.filter((value) => value !== key)
        : [...this.expandedProcess, key];
    },
    toggleActivityGroup(id, activities, message) {
      if (this.expandedActivities.includes(id)) {
        this.expandedActivities = this.expandedActivities.filter(
          (value) => value !== id,
        );
        this.$delete(this.activityListFollowBottom, id);
        return;
      }
      const running =
        ["running", "recovering"].includes(this.turnFor(message)?.status) &&
        activities.some((activity) =>
          ["running", "requested"].includes(activity.status),
        );
      this.$set(this.activityListFollowBottom, id, running);
      this.expandedActivities = [...this.expandedActivities, id];
      if (running) this.$nextTick(this.followActivityLists);
    },
    toggleActivityDetail(id, groupId) {
      const opening = !this.expandedActivityIds.includes(id);
      if (opening) this.$set(this.activityListFollowBottom, groupId, false);
      this.expandedActivityIds = opening
        ? [...this.expandedActivityIds, id]
        : this.expandedActivityIds.filter((value) => value !== id);
    },
    jumpTo(id) {
      document
        .getElementById("message-" + id)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    selectPendingInteraction(offset) {
      if (this.pendingInteractions.length < 2) return;
      const next =
        (this.pendingInteractionIndex +
          offset +
          this.pendingInteractions.length) %
        this.pendingInteractions.length;
      this.selectedRequestId = this.pendingInteractions[next].id;
    },
    async resolveDecision(value) {
      const request = this.pendingInteraction;
      if (!request || this.approvalSubmitting) return;
      if (value === "always") {
        try {
          await this.$confirm(
            `将持续允许与“${request.actionTitle || "该操作"}”匹配的后续操作。`,
            "确认始终允许",
            {
              confirmButtonText: "始终允许",
              cancelButtonText: "取消",
              type: "warning",
            },
          );
        } catch {
          return;
        }
      }
      if (this.pendingInteraction?.id !== request.id) return;
      this.approvalSubmitting = true;
      await this.$nextTick();
      const accepted = resolveDemoRequest(
        this.conversation.id,
        request.id,
        value,
      );
      this.approvalSubmitting = false;
      if (accepted) this.approvalSelection = { requestId: null, value: null };
      else this.$message.warning("请求已失效或提交未被接收，请核对当前状态");
    },
    selectApprovalChoice(value) {
      if (!this.approvalAllowedChoices.some((choice) => choice.value === value))
        return;
      this.approvalSelection = {
        requestId: this.pendingInteraction.id,
        value,
      };
    },
    async submitClarification() {
      if (!this.canSubmitClarification) return;
      const request = this.pendingInteraction;
      if (!request) return;
      const answers = Object.fromEntries(
        this.clarifyQuestions.map((question) => [
          question.qid,
          this.hasAcceptedClarifyAnswer(question.qid)
            ? this.acceptedAnswerValue(request, question.qid)
            : this.clarifyAnswerForSubmit(question),
        ]),
      );
      this.clarifySubmitting = true;
      await this.$nextTick();
      const accepted = resolveDemoRequest(
        this.conversation.id,
        request.id,
        request.questions?.length ? { answers } : answers.single,
      );
      this.clarifySubmitting = false;
      if (!accepted)
        return this.$message.warning(
          "请求已失效或提交未被接收，已保留填写内容",
        );
      this.clarifyAnswers = {};
      this.clarifyOtherAnswers = {};
      this.$nextTick(this.scrollBottom);
    },
    async skipClarification() {
      const request = this.pendingInteraction;
      if (!request || request.kind !== "clarify" || this.clarifySubmitting)
        return;
      this.clarifySubmitting = true;
      await this.$nextTick();
      const accepted = resolveDemoRequest(this.conversation.id, request.id, {
        skip: true,
      });
      this.clarifySubmitting = false;
      if (!accepted) return this.$message.warning("请求已失效，未记录跳过决定");
      this.clarifyAnswers = {};
      this.clarifyOtherAnswers = {};
    },
    openLateClarification(requestId) {
      this.lateClarifyRequestId = requestId;
      this.clarifyAnswers = {};
      this.clarifyOtherAnswers = {};
      this.clarifyQuestionIndex = 0;
      this.lateClarifyOpen = true;
      this.$nextTick(this.scrollBottom);
    },
    closeLateClarification() {
      this.lateClarifyOpen = false;
      this.lateClarifyRequestId = null;
      this.clarifyAnswers = {};
      this.clarifyOtherAnswers = {};
    },
    async submitLateClarification() {
      if (!this.canSubmitClarification || this.clarifySubmitting) return;
      const request = this.lateClarifyRequest;
      const text = request?.questions?.length
        ? this.clarifyQuestions
            .filter(
              (question) =>
                !Object.prototype.hasOwnProperty.call(
                  request.answers || {},
                  question.qid,
                ),
            )
            .map((question) => {
              const answer = this.clarifyAnswerForSubmit(question);
              return `${question.question}：${
                Array.isArray(answer) ? answer.join("、") : String(answer || "")
              }`;
            })
            .join("；")
        : this.clarifyAnswerForSubmit(this.clarifyQuestions[0]);
      if (!request || !text || !this.conversation?.id) return;
      this.clarifySubmitting = true;
      await this.$nextTick();
      const result = submitDemoLateClarification(
        this.conversation.id,
        request.id,
        text,
      );
      this.clarifySubmitting = false;
      if (!result) return this.$message.warning("回复暂未提交，请稍后重试");
      this.closeLateClarification();
      this.clockNow = Date.now();
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
    clearPendingFilePreviews() {
      for (const file of this.pendingFiles)
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
    },
    discardPendingUploads() {
      this.uploadGeneration++;
      this.clearPendingFilePreviews();
      for (const file of this.pendingFiles)
        if (file.kind === "local_upload")
          void deleteFile(file.id).catch(() => {});
    },
    removePendingFile(file) {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      if (file.kind === "local_upload")
        void deleteFile(file.id).catch(() => {});
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
      try {
        await saveFile(entry.id, file);
      } catch (error) {
        removeWorkspaceItems(this.expert.id, [entry.id]);
        throw error;
      }
      return entry;
    },
    async attachFile(event) {
      const files = [...(event.target.files || [])];
      event.target.value = "";
      if (!files.length || this.uploadingFiles) return;
      const generation = this.uploadGeneration;
      this.uploadingFiles = true;
      let added = 0;
      try {
        for (const file of files) {
          try {
            const id = `upload_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
            await saveFile(id, file);
            if (generation !== this.uploadGeneration) {
              await deleteFile(id).catch(() => {});
              continue;
            }
            this.pendingFiles.push({
              kind: "local_upload",
              id,
              name: file.name,
              size: file.size,
              previewUrl: file.type.startsWith("image/")
                ? URL.createObjectURL(file)
                : "",
            });
            added++;
          } catch {
            if (generation === this.uploadGeneration)
              this.$message.error(`无法添加 ${file.name}`);
          }
        }
      } finally {
        this.uploadingFiles = false;
      }
      if (added && generation === this.uploadGeneration)
        this.$message.success(`已添加 ${added} 个本地文件`);
    },
    async uploadWorkspaceFiles(event) {
      const files = [...event.target.files];
      event.target.value = "";
      let added = 0;
      for (const file of files) {
        try {
          await this.storeFile(file, this.workspaceFolderId);
          added++;
        } catch {
          this.$message.error(`无法保存 ${file.name}`);
        }
      }
      if (added) this.$message.success("文件已保存到浏览器演示数据");
    },
    async fileBlob(item) {
      if (typeof item.snapshotContent === "string")
        return new Blob([item.snapshotContent], {
          type: item.name.endsWith(".csv") ? "text/csv" : "text/plain",
        });
      const stored = await readFile(item.id);
      if (stored) return stored;
      if (item.kind === "local_upload" || item.content == null)
        throw new Error("文件已不可用");
      return new Blob([item.content], {
        type: item.name.endsWith(".csv") ? "text/csv" : "text/plain",
      });
    },
    async previewFile(item) {
      if (!item) return;
      if (item.canPreview === false)
        return this.$message.warning("此文件暂不支持预览或已不可用");
      this.clearPreview();
      this.previewItem = item;
      try {
        const blob = await this.fileBlob(item);
        if (blob.type.startsWith("image/"))
          this.previewUrl = URL.createObjectURL(blob);
        else this.previewText = await blob.text();
        this.previewVisible = true;
      } catch {
        this.$message.error("文件已不可用");
      }
    },
    async downloadFile(item) {
      if (!item) return;
      if (item.canDownload === false)
        return this.$message.warning("此文件已不可用");
      try {
        saveBlob(await this.fileBlob(item), item.name);
      } catch {
        this.$message.error("文件已不可用");
      }
    },
    clearPreview() {
      if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = "";
      this.previewText = "";
    },
  },
};
</script>
