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
        <span
          v-if="conversation && conversation.status === 'running'"
          class="pc-running"
          >运行中</span
        >
      </div>
      <div class="pc-top-actions">
        <button class="pc-primary" @click="newTask">
          <i class="el-icon-plus" /> 新建任务</button
        ><button
          class="pc-outline"
          :class="{ active: workspaceOpen }"
          @click="toggleWorkspace"
        >
          <i class="el-icon-house" /> 工作空间
        </button>
      </div>
    </header>
    <div class="pc-body">
      <section v-if="conversation" class="pc-main">
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
                  <button @click="toggleProcess(message.id)">
                    {{
                      message.status === "streaming" ? "正在处理" : "处理完成"
                    }}
                    <span>{{
                      message.status === "streaming"
                        ? ""
                        : message.duration || "4.7 秒"
                    }}</span>
                    <span
                      v-if="message.status !== 'streaming'"
                      class="pc-process-check"
                      >✓</span
                    >
                    <i
                      v-if="message.steps && message.steps.length"
                      :class="
                        expandedProcess.includes(message.id)
                          ? 'el-icon-arrow-down'
                          : 'el-icon-arrow-right'
                      "
                    />
                  </button>
                  <div
                    v-if="message.steps && expandedProcess.includes(message.id)"
                    class="pc-process-steps"
                  >
                    <div
                      v-for="step in message.steps"
                      :key="step.title"
                      class="pc-process-step"
                    >
                      <span class="pc-process-step-mark">◉</span>
                      <span>{{ step.title }}</span>
                      <b :class="step.status">{{
                        step.status === "done"
                          ? "✓"
                          : step.status === "error"
                            ? "×"
                            : "…"
                      }}</b>
                    </div>
                  </div>
                </div>
                <div
                  v-if="message.error && message.status !== 'streaming'"
                  class="pc-error-line"
                >
                  <i class="el-icon-warning-outline" /> {{ message.error }}
                </div>
                <div class="pc-reply">
                  {{ message.content
                  }}<span
                    v-if="message.status === 'streaming'"
                    class="typing-cursor"
                    >▍</span
                  >
                </div>
              </template>
              <div v-else class="pc-user-bubble">{{ message.content }}</div>
            </div>
          </div>
          <el-popover
            v-if="questions.length"
            placement="left"
            trigger="hover"
            width="300"
            popper-class="pc-question-popover"
            ><button
              v-for="(message, index) in questions"
              :key="message.id"
              @click="jumpTo(message.id)"
            >
              {{ index + 1 }}. {{ message.content }}
            </button>
            <div
              slot="reference"
              class="pc-question-rail"
              aria-label="问题快速定位"
            >
              <button
                v-for="message in questions"
                :key="message.id"
                :title="message.content"
                @click="jumpTo(message.id)"
              /></div
          ></el-popover>
        </div>
        <div
          v-if="pendingInteraction"
          class="pc-hitl-pin"
          :class="{ danger: pendingInteraction.kind === 'approval' }"
        >
          <div class="pc-hitl-card">
            <div class="pc-hitl-header">
              <span class="pc-hitl-icon"
                ><i
                  :class="
                    pendingInteraction.kind === 'approval'
                      ? 'el-icon-lock'
                      : 'el-icon-question'
                  " /></span
              ><strong>{{
                pendingInteraction.kind === "approval"
                  ? "需要操作审批"
                  : "需要澄清信息"
              }}</strong
              ><span class="pc-hitl-badge">等待回应</span>
            </div>
            <div class="pc-hitl-body">
              <p>{{ pendingInteraction.content }}</p>
              <template v-if="pendingInteraction.kind === 'clarify'"
                ><el-input
                  v-model="clarifyDraft"
                  placeholder="请输入补充信息"
                />
                <div class="pc-hitl-actions">
                  <button @click="clarifyDraft = '分析最近一周的 1 号产线'">
                    最近一周 · 1 号产线</button
                  ><button
                    class="primary"
                    :disabled="!clarifyDraft.trim()"
                    @click="submitClarification"
                  >
                    提交回复
                  </button>
                </div></template
              >
              <div v-else class="pc-hitl-actions">
                <button @click="resolveApproval(pendingInteraction, false)">
                  拒绝</button
                ><button
                  class="primary"
                  @click="resolveApproval(pendingInteraction, true)"
                >
                  批准
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="pc-input-area">
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
              <button
                title="上传文件"
                :disabled="!!pendingInteraction"
                @click="$refs.attachment.click()"
              >
                <i class="el-icon-paperclip" /></button
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
            <input ref="attachment" type="file" hidden @change="attachFile" />
          </div>
        </div>
      </section>
      <aside
        class="pc-tasks"
        :class="{ 'is-action-reveal-paused': taskActionsPaused }"
        @mousemove="taskActionsPaused = false"
        @mouseleave="taskActionsPaused = false"
      >
        <div class="pc-panel-head">
          <span class="pc-panel-icon"><i class="el-icon-s-unfold" /></span
          ><strong>任务列表</strong
          ><small>{{ visibleConversations.length }}</small>
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
              <button class="pc-task-cwd" @click.stop="openWorkspace(item)">
                <i class="el-icon-folder" /> 工作目录：
                <span>{{ cwdLabel(item.cwd) }}</span
                ><i class="el-icon-arrow-right" />
              </button>
            </div>
            <div v-if="!visibleConversations.length" class="pc-task-empty">
              暂无任务<br /><small>点击上方「新建任务」开始</small>
            </div>
          </div>
        </div>
      </aside>
      <aside v-if="workspaceOpen" class="pc-workspace">
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
            <i class="el-icon-folder-add" /></button
          ><button title="关闭" @click="workspaceOpen = false">
            <i class="el-icon-close" />
          </button>
        </div>
        <div class="pc-workspace-tree">
          <button
            class="pc-workspace-root"
            :class="{
              selected: workspaceFolderId === null,
              cwd: conversation && conversation.cwd === '/',
            }"
            @click="workspaceFolderId = null"
          >
            <i class="el-icon-folder-opened" /> 工作空间
          </button>
          <div
            v-for="node in workspaceTreeRows"
            :key="node.item.id"
            class="pc-workspace-row"
            :class="{
              selected: workspaceFolderId === node.item.id,
              cwd:
                conversation && conversation.cwd === folderPath(node.item.id),
            }"
            :style="{ paddingLeft: 8 + node.depth * 16 + 'px' }"
          >
            <button
              class="pc-workspace-entry"
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
            ><button
              v-if="
                node.item.kind === 'folder' &&
                conversation &&
                conversation.cwd !== folderPath(node.item.id)
              "
              title="设为工作目录"
              @click="setCwd(folderPath(node.item.id))"
            >
              <i class="el-icon-position" /></button
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
      width="420px"
      custom-class="pc-task-dialog"
      append-to-body
      :close-on-click-modal="false"
      ><span slot="title" class="pc-task-dialog-title">{{
        taskDialogMode === "rename"
          ? "修改任务名称"
          : taskDialogMode === "archive"
            ? "归档任务"
            : "删除任务"
      }}</span>
      <div v-if="taskDialogMode === 'rename'" class="pc-dialog-body">
        <label>请输入新的任务名称</label
        ><el-input
          ref="renameInput"
          v-model="taskNameDraft"
          maxlength="100"
          @keyup.enter.native="confirmTaskDialog"
        />
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
              ? "确定"
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
  stopDemoStream,
  addWorkspaceItem,
} from "../state";
import { saveFile, readFile } from "../file-db";
import { avatarSrcFor } from "../avatar";
function emptyConversation() {
  return {
    id: null,
    title: "",
    status: "ready",
    archived: false,
    cwd: "/",
    messages: [],
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
  data() {
    return {
      state,
      draft: "",
      draftConversation: emptyConversation(),
      taskActionsPaused: false,
      workspaceOpen: false,
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
      pathPopoverDismissed: false,
      marqueeTaskId: null,
      marqueeDistance: 0,
      marqueeDuration: 6,
      expandedProcess: [],
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
            ?.name || "工作空间"
        : "工作空间";
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
      return (
        this.conversation?.messages
          .slice()
          .reverse()
          .find(
            (message) =>
              ["clarify", "approval"].includes(message.kind) &&
              message.status === "waiting",
          ) || null
      );
    },
    questions() {
      return this.conversation
        ? this.conversation.messages.filter(
            (message) => message.role === "user",
          )
        : [];
    },
  },
  mounted() {
    if (this.$route.query.conv && this.isDraftTask && this.expert) {
      const { conv, ...query } = this.$route.query;
      this.$router
        .replace({ name: "chat", params: { id: this.expert.id }, query })
        .catch(() => {});
    }
    this.$nextTick(this.scrollBottom);
  },
  beforeDestroy() {
    if (this.$route.query.conv) stopDemoStream(this.$route.query.conv);
    this.clearPreview();
  },
  watch: {
    "$route.query.conv"(next, prior) {
      if (prior && next !== prior) stopDemoStream(prior);
      this.draft = "";
      this.pendingFiles = [];
      this.clarifyDraft = "";
      this.$nextTick(this.scrollBottom);
    },
    "conversation.messages.length"() {
      this.$nextTick(this.scrollBottom);
    },
  },
  methods: {
    avatarSrcFor,
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
      this.$router
        .push({
          name: "chat",
          params: { id: this.expert.id },
          query: { ...this.$route.query, conv: item.id },
        })
        .catch(() => {});
    },
    newTask() {
      this.draftConversation = emptyConversation();
      this.draft = "";
      this.pendingFiles = [];
      this.clarifyDraft = "";
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
        this.conversation.status === "running"
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
      sendDemoMessage(conversationId, content);
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
    cwdLabel(cwd) {
      return !cwd || cwd === "/" ? "工作空间" : String(cwd).replace(/^\//, "");
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
      else this.showWorkspaceForCwd();
    },
    showWorkspaceForCwd() {
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
      this.expandedProcess = this.expandedProcess.includes(id)
        ? this.expandedProcess.filter((value) => value !== id)
        : [...this.expandedProcess, id];
    },
    jumpTo(id) {
      document
        .getElementById("message-" + id)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    resolveApproval(message, approved) {
      message.status = "done";
      message.content += approved
        ? "\n\n用户已批准，演示任务可以继续。"
        : "\n\n用户已拒绝，本次演示操作停止。";
      updateConversation(this.conversation.id, {});
    },
    submitClarification() {
      if (!this.pendingInteraction || !this.clarifyDraft.trim()) return;
      this.pendingInteraction.status = "done";
      updateConversation(this.conversation.id, {});
      sendDemoMessage(this.conversation.id, this.clarifyDraft.trim());
      this.clarifyDraft = "";
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
