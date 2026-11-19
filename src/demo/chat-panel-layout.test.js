import { describe, expect, it, vi } from "vitest";
import Vue from "vue";
import Chat from "./pages/Chat.vue";
import { createFileReader, READER_DEFAULT_WIDTH } from "./file-reader";
import {
  CONVERSATION_MIN_WIDTH,
  minimumPanelCanvasWidth,
  panelWidthLimits,
  resizePanelLayout,
  planPanelVisibility,
  fitPanelLayout,
} from "./chat-panel-layout";

const layout = (overrides = {}) => ({
  containerWidth: 1200,
  taskVisible: true,
  readerVisible: true,
  workspaceVisible: true,
  taskWidth: 200,
  readerWidth: 360,
  workspaceWidth: 200,
  ...overrides,
});
const conversationWidth = (value) =>
  value.containerWidth -
  ["task", "reader", "workspace"].reduce(
    (sum, panel) =>
      sum + (value[panel + "Visible"] ? value[panel + "Width"] : 0),
    0,
  );

function chatContext(width, overrides = {}) {
  const context = {
    expert: { id: "expert", files: [] },
    taskListCollapsed: false,
    workspaceOpen: true,
    taskPanelWidth: 200,
    workspacePanelWidth: 200,
    reader: createFileReader(),
    readerWidthCustomized: false,
    $refs: { chatBody: { clientWidth: width } },
    $nextTick: vi.fn(),
    $message: { info: vi.fn() },
    revealReaderWorkspaceFile: vi.fn(),
    closeKnowledgePreview: vi.fn(),
    loadReaderTab: vi.fn(),
    ...overrides,
  };
  for (const name of [
    "closeReader",
    "resizeReader",
    "resizeSidebar",
    "toggleTaskList",
    "showWorkspaceForCwd",
  ])
    context[name] = (...args) => Chat.methods[name].call(context, ...args);
  return context;
}
const file = {
  id: "report",
  name: "报告.md",
  snapshotContent: "# 报告",
};

describe("面板调宽只使用对话区剩余空间", () => {
  it("保留四个模块的原最小宽度，侧栏上限仍为 480px", () => {
    expect(panelWidthLimits(layout())).toEqual({
      task: { min: 160, max: 320 },
      reader: { min: 260, max: 480 },
      workspace: { min: 160, max: 320 },
      conversation: { min: 320, max: 620 },
    });
    const roomy = panelWidthLimits(layout({ containerWidth: 1800 }));
    expect(roomy.task.max).toBe(480);
    expect(roomy.workspace.max).toBe(480);
    expect(roomy.reader.max).toBe(1080);
  });

  it.each(["task", "reader", "workspace"])(
    "拉宽 %s 到边界只缩小对话区，不修改其他面板",
    (panel) => {
      const original = layout();
      const next = resizePanelLayout(original, panel, 2000);
      expect(conversationWidth(next)).toBe(CONVERSATION_MIN_WIDTH);
      expect(next).toEqual({
        ...original,
        [panel + "Width"]: panelWidthLimits(original)[panel].max,
      });
      expect(original).toEqual(layout());
      expect(resizePanelLayout(next, panel, 3000)).toEqual(next);
    },
  );

  it("预览区上限小于默认宽度时也不能挤掉工作空间", () => {
    const original = layout({ containerWidth: 1000, readerWidth: 260 });
    const next = resizePanelLayout(original, "reader", READER_DEFAULT_WIDTH);
    expect(next.readerWidth).toBe(280);
    expect(next.workspaceWidth).toBe(200);
    expect(next.taskWidth).toBe(200);
    expect(conversationWidth(next)).toBe(320);
  });

  it("收窄其他面板后才允许继续拉宽，关闭面板只释放空间给对话区", () => {
    const full = resizePanelLayout(layout(), "reader", 2000);
    const smallerTask = resizePanelLayout(full, "task", 160);
    const widerReader = resizePanelLayout(smallerTask, "reader", 2000);
    expect(widerReader.readerWidth).toBe(full.readerWidth + 40);
    const hiddenWorkspace = planPanelVisibility(widerReader, {
      workspaceVisible: false,
    });
    expect(hiddenWorkspace).toEqual({
      ...widerReader,
      workspaceVisible: false,
    });
    expect(conversationWidth(hiddenWorkspace)).toBe(520);
    expect(resizePanelLayout(hiddenWorkspace, "reader", 2000).readerWidth).toBe(
      widerReader.readerWidth + 200,
    );
  });

  it.each([
    ["task", 160],
    ["reader", 260],
    ["workspace", 160],
  ])("收窄 %s 时固定使用现有最小宽度 %i", (panel, min) => {
    expect(resizePanelLayout(layout(), panel, 0)[panel + "Width"]).toBe(min);
  });

  it("展开区域仅使用对话区可借宽度，其他区域保持原宽度", () => {
    const original = layout({ taskVisible: false, readerWidth: 500 });
    const next = planPanelVisibility(original, { taskVisible: true });
    expect(next).toEqual({ ...original, taskVisible: true, taskWidth: 180 });
    expect(conversationWidth(next)).toBe(320);
  });

  it("连最小宽度都放不下时拒绝展开，收窄后可以展开", () => {
    const original = layout({ taskVisible: false, readerWidth: 540 });
    expect(planPanelVisibility(original, { taskVisible: true })).toBeNull();
    expect(original.taskVisible).toBe(false);
    const smaller = resizePanelLayout(original, "reader", 500);
    expect(planPanelVisibility(smaller, { taskVisible: true }).taskWidth).toBe(
      180,
    );
  });

  it("同时展开侧栏时预留各自最小宽度，不改动仍可见的区域", () => {
    const original = layout({
      containerWidth: 1000,
      taskVisible: false,
      workspaceVisible: false,
    });
    const next = planPanelVisibility(original, {
      taskVisible: true,
      workspaceVisible: true,
    });
    expect(next.taskWidth).toBe(160);
    expect(next.workspaceWidth).toBe(160);
    expect(next.readerWidth).toBe(360);
    expect(conversationWidth(next)).toBe(320);
  });

  it("只有宿主缩小时才回收各面板超出最小值的宽度", () => {
    const original = layout({ containerWidth: 950 });
    const next = fitPanelLayout(original);
    expect(next).toEqual({ ...original, readerWidth: 260, taskWidth: 170 });
    expect(conversationWidth(next)).toBe(320);
    const smallest = fitPanelLayout(layout({ containerWidth: 600 }));
    expect(minimumPanelCanvasWidth(smallest)).toBe(900);
    expect(smallest).toMatchObject({
      taskWidth: 160,
      readerWidth: 260,
      workspaceWidth: 160,
    });
  });

  it("各种显隐组合调宽后都保留对话区和全部可见面板", () => {
    for (let flags = 0; flags < 8; flags++) {
      const original = fitPanelLayout(
        layout({
          containerWidth: 1060,
          taskVisible: Boolean(flags & 1),
          readerVisible: Boolean(flags & 2),
          workspaceVisible: Boolean(flags & 4),
        }),
      );
      for (const panel of ["task", "reader", "workspace"]) {
        if (!original[panel + "Visible"]) continue;
        for (const width of [0, 165, 280, 440, 800, 2000]) {
          const next = resizePanelLayout(original, panel, width);
          expect(conversationWidth(next)).toBeGreaterThanOrEqual(320);
          for (const other of ["task", "reader", "workspace"])
            if (other !== panel)
              expect(next[other + "Width"]).toBe(original[other + "Width"]);
        }
      }
    }
  });
});

describe("打开文件与收起展开也遵守布局边界", () => {
  it("工作空间文件无法容纳预览最小宽度时不创建标签或改变布局", async () => {
    const context = chatContext(960);
    await Chat.methods.previewFile.call(context, file, "workspace");
    expect(context.reader.tabs).toEqual([]);
    expect(context.workspaceOpen).toBe(true);
    expect(context.loadReaderTab).not.toHaveBeenCalled();
    expect(context.$message.info).toHaveBeenCalledOnce();
    context.resizeSidebar("task", 160);
    await Chat.methods.previewFile.call(context, file, "workspace");
    expect(context.reader.tabs).toHaveLength(1);
    expect(context.reader.width).toBe(280);
    expect(context.workspacePanelWidth).toBe(200);
  });

  it("对话文件空间不足时保留工作空间；空间足够时按剩余宽度打开预览", async () => {
    const context = chatContext(960);
    await Chat.methods.previewFile.call(context, file);
    expect(context.workspaceOpen).toBe(true);
    expect(context.reader.tabs).toEqual([]);
    expect(context.$message.info).toHaveBeenCalledOnce();
    context.$refs.chatBody.clientWidth = 1000;
    await Chat.methods.previewFile.call(context, file);
    expect(context.workspaceOpen).toBe(true);
    expect(context.reader.width).toBe(280);
    expect(context.taskPanelWidth).toBe(200);
    context.closeReader();
    expect(context.workspaceOpen).toBe(true);
    expect(context.taskPanelWidth).toBe(200);
    expect(context.workspacePanelWidth).toBe(200);
  });

  it("空间不足时展开任务列表或工作空间均保持原布局并提示", () => {
    const context = chatContext(1000, {
      taskListCollapsed: true,
      workspaceOpen: false,
      reader: { ...createFileReader(), width: 580, tabs: [{}] },
    });
    context.toggleTaskList();
    expect(context.taskListCollapsed).toBe(true);
    expect(context.showWorkspaceForCwd()).toBe(false);
    expect(context.workspaceOpen).toBe(false);
    expect(context.reader.width).toBe(580);
    expect(context.$message.info).toHaveBeenCalledTimes(2);
    context.resizeReader(460);
    context.toggleTaskList();
    expect(context.taskListCollapsed).toBe(false);
    expect(context.taskPanelWidth).toBe(200);
    expect(context.reader.width).toBe(460);
  });

  it("宿主缩小后仍能关闭预览，保持侧栏显隐且不挤掉对话区", async () => {
    const context = chatContext(1200);
    await Chat.methods.previewFile.call(context, file);
    context.$refs.chatBody.clientWidth = 680;
    Chat.methods.updateReaderBounds.call(context);
    context.closeReader();
    expect(context.reader.tabs).toHaveLength(0);
    expect(context.workspaceOpen).toBe(true);
    expect(context.taskPanelWidth).toBe(160);
    expect(context.workspacePanelWidth).toBe(160);
  });
});

describe("关闭预览后释放的空间全部交给对话区", () => {
  it.each([
    ["关闭整个预览区", false, true, false],
    ["关闭最后一个文件标签", false, true, true],
    ["任务列表已收起", true, true, false],
    ["工作空间已隐藏", false, false, true],
  ])(
    "%s后重新计算宽度，不在面板右侧留空",
    async (_, collapsed, workspaceOpen, closeTabs) => {
      const vm = new Vue({
        data: () => ({
          reader: createFileReader(),
          taskListCollapsed: collapsed,
          workspaceOpen,
          taskPanelWidth: 200,
          workspacePanelWidth: 200,
          panelContainerWidth: 1400,
          conversationMaxWidth: Infinity,
          taskMaxWidth: 480,
          workspaceMaxWidth: 480,
          readerMaxWidth: 440,
        }),
        methods: {
          closeReader: Chat.methods.closeReader,
          closeReaderFile: Chat.methods.closeReaderFile,
          updateReaderBounds: Chat.methods.updateReaderBounds,
          revealReaderWorkspaceFile: vi.fn(),
        },
        watch: Object.fromEntries(
          Object.entries(Chat.watch).filter(
            ([name]) => name === "reader.tabs.length",
          ),
        ),
      });
      try {
        vm.$refs.chatBody = { clientWidth: 1400 };
        vm.reader.tabs = [{ key: "first" }, { key: "last" }];
        vm.reader.activeKey = "first";
        vm.updateReaderBounds();
        await vm.$nextTick();
        await vm.$nextTick();
        const before = vm.conversationMaxWidth;
        if (closeTabs) {
          vm.closeReaderFile("first");
          await vm.$nextTick();
          await vm.$nextTick();
          expect(vm.conversationMaxWidth).toBe(before);
          vm.closeReaderFile("last");
        } else vm.closeReader();
        await vm.$nextTick();
        await vm.$nextTick();
        const remaining =
          1400 - (collapsed ? 0 : 200) - (workspaceOpen ? 200 : 0);
        expect(vm.reader.tabs).toHaveLength(0);
        expect(vm.conversationMaxWidth).toBeGreaterThanOrEqual(remaining);
        expect(vm.workspaceOpen).toBe(workspaceOpen);
        expect(vm.taskListCollapsed).toBe(collapsed);
        expect(vm.workspacePanelWidth).toBe(200);
        expect(vm.taskPanelWidth).toBe(200);
      } finally {
        vm.$destroy();
      }
    },
  );
});
