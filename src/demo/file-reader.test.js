import { describe, expect, it, vi } from "vitest";
import Chat from "./pages/Chat.vue";
import {
  READER_DEFAULT_WIDTH,
  createFileReader,
  readerFileKey,
  readerWorkspaceFileLocation,
  openReaderTab,
  activateReaderTab,
  closeReaderTab,
  closeFileReader,
  constrainReaderWidth,
  constrainSidebarWidth,
} from "./file-reader";

const makeTab = (key, origin = "conversation") => ({
  key,
  origin,
  item: { id: key, name: `${key}.txt` },
  status: "loading",
  format: "text",
  text: "",
  url: "",
  error: "",
  loadId: 0,
});

describe("文件阅读区与侧栏状态", () => {
  it("侧栏可收窄及拉宽，并约束在可用尺寸范围内", () => {
    expect(constrainSidebarWidth(80)).toBe(160);
    expect(constrainSidebarWidth(700)).toBe(480);
    expect(constrainSidebarWidth(285.7)).toBe(286);
  });

  it("阅读区边界按调整后的侧栏宽度计算，自动计算不覆盖手动标记", () => {
    const context = {
      $refs: { chatBody: { clientWidth: 1600 } },
      taskPanelWidth: 280,
      workspacePanelWidth: 300,
      taskListCollapsed: false,
      workspaceOpen: true,
      reader: createFileReader(),
      readerWidthCustomized: false,
      readerMaxWidth: READER_DEFAULT_WIDTH,
    };
    context.resizeReader = (...args) =>
      Chat.methods.resizeReader.call(context, ...args);
    Chat.methods.updateReaderBounds.call(context);
    expect(context.readerMaxWidth).toBe(700);
    context.taskListCollapsed = true;
    Chat.methods.updateReaderBounds.call(context);
    expect(context.readerMaxWidth).toBe(980);
    context.workspaceOpen = false;
    Chat.methods.updateReaderBounds.call(context);
    expect(context.readerMaxWidth).toBe(1280);
    expect(context.readerWidthCustomized).toBe(false);
  });

  it("阅读区默认固定为 440px，不随工作空间宽度变化，手动改过后保留选择", async () => {
    const context = {
      expert: { id: "expert", files: [] },
      reader: createFileReader(),
      readerMaxWidth: 1200,
      readerWidthCustomized: false,
      workspacePanelWidth: 300,
      workspaceOpen: true,
      taskListCollapsed: false,
      closeKnowledgePreview: vi.fn(),
      revealReaderWorkspaceFile: vi.fn(),
      loadReaderTab: vi.fn(),
      $nextTick: vi.fn(),
    };
    const item = {
      name: "临时报告.md",
      kind: "result_file",
      resultId: "first",
      snapshotContent: "# 本轮",
    };
    await Chat.methods.previewFile.call(context, item);
    expect(context.reader.width).toBe(440);
    closeFileReader(context.reader);
    Chat.methods.resizeReader.call(context, 520);
    expect(context.readerWidthCustomized).toBe(true);
    await Chat.methods.previewFile.call(context, {
      ...item,
      resultId: "second",
    });
    expect(context.reader.width).toBe(520);
  });

  it("关闭阅读区保持当前显隐状态及本页调整过的侧栏宽度", () => {
    const context = {
      reader: createFileReader(),
      taskListCollapsed: false,
      workspaceOpen: true,
      taskPanelWidth: 200,
      workspacePanelWidth: 200,
    };
    openReaderTab(context.reader, makeTab("file"), context);
    context.taskListCollapsed = true;
    context.workspaceOpen = false;
    Chat.methods.resizeSidebar.call(context, "task", 280);
    Chat.methods.resizeSidebar.call(context, "workspace", 320);
    Chat.methods.closeReader.call(context);
    expect(context).toMatchObject({
      taskListCollapsed: true,
      workspaceOpen: false,
      taskPanelWidth: 280,
      workspacePanelWidth: 320,
    });
  });

  it.each(
    [true, false].flatMap((workspaceOpen) =>
      [
        { id: "knowledge", knowledgeSource: { id: "doc" } },
        { resultId: "generated", snapshotContent: "# 本轮产物" },
        { id: "workspace-reference" },
      ].map((item) => [workspaceOpen, item]),
    ),
  )(
    "从对话打开文件时保持工作空间显隐=%s，文件=%o",
    async (workspaceOpen, item) => {
      const context = {
        expert: { id: "expert", files: [] },
        reader: createFileReader(),
        readerWidthCustomized: false,
        workspaceOpen,
        taskListCollapsed: false,
        taskPanelWidth: 160,
        workspacePanelWidth: 200,
        $refs: { chatBody: { clientWidth: 1600 } },
        $nextTick: vi.fn(),
        revealReaderWorkspaceFile: vi.fn(),
        loadReaderTab: vi.fn(),
      };
      await Chat.methods.previewFile.call(context, {
        name: "报告.md",
        ...item,
      });
      expect(context.workspaceOpen).toBe(workspaceOpen);
      expect(context.taskListCollapsed).toBe(false);
      expect(context.workspacePanelWidth).toBe(200);
      expect(context.reader.tabs).toHaveLength(1);
    },
  );

  it("初始宽度为 440px，拖动宽度受最小值和可用空间约束", () => {
    expect(createFileReader().width).toBe(440);
    expect(READER_DEFAULT_WIDTH).toBe(440);
    expect(constrainReaderWidth(100, 700)).toBe(260);
    expect(constrainReaderWidth(1000, 700)).toBe(700);
    expect(constrainReaderWidth(482.6, 700)).toBe(483);
  });

  it.each(
    [false, true].flatMap((taskListCollapsed) =>
      [false, true].flatMap((workspaceOpen) =>
        ["closeReader", "closeReaderFile"].map((method) => [
          taskListCollapsed,
          workspaceOpen,
          method,
        ]),
      ),
    ),
  )(
    "关闭后保持任务列表=%s、工作空间=%s，入口=%s",
    (taskListCollapsed, workspaceOpen, method) => {
      const context = {
        reader: createFileReader(),
        taskListCollapsed: !taskListCollapsed,
        workspaceOpen: !workspaceOpen,
        revealReaderWorkspaceFile: vi.fn(),
      };
      openReaderTab(context.reader, makeTab("generated"), context);
      context.taskListCollapsed = taskListCollapsed;
      context.workspaceOpen = workspaceOpen;
      if (method === "closeReaderFile")
        Chat.methods.closeReaderFile.call(context, "generated");
      else Chat.methods.closeReader.call(context);
      expect(context.taskListCollapsed).toBe(taskListCollapsed);
      expect(context.workspaceOpen).toBe(workspaceOpen);
      expect(context.reader.tabs).toEqual([]);
      expect(context.reader.activeKey).toBeNull();
    },
  );

  it("多个来源共用标签区，切换与关闭不产生侧栏变更", () => {
    const reader = createFileReader();
    const layout = { taskListCollapsed: false, workspaceOpen: true };
    openReaderTab(reader, makeTab("workspace", "workspace"), layout);
    expect(
      openReaderTab(reader, makeTab("knowledge", "knowledge"), {
        taskListCollapsed: true,
        workspaceOpen: true,
      }).workspaceOpen,
    ).toBe(true);
    openReaderTab(reader, makeTab("generated"), {
      taskListCollapsed: true,
      workspaceOpen: false,
    });
    expect(reader.tabs).toHaveLength(3);
    expect(activateReaderTab(reader, "workspace")).toEqual({});
    expect(activateReaderTab(reader, "knowledge")).toEqual({});
    closeFileReader(reader);
    expect(reader.tabs).toEqual([]);
    expect(reader.activeKey).toBeNull();
  });

  it("从对话重复打开同一文件只激活现有标签，保持当前工作空间显隐", () => {
    const reader = createFileReader();
    const tab = makeTab("shared", "workspace");
    openReaderTab(reader, tab, {
      taskListCollapsed: false,
      workspaceOpen: true,
    });
    const reopened = openReaderTab(reader, makeTab("shared"), {
      taskListCollapsed: true,
      workspaceOpen: false,
    });
    expect(reader.tabs).toHaveLength(1);
    expect(reopened.tab).toBe(tab);
    expect(reopened.workspaceOpen).toBe(false);
  });

  it("关闭非当前标签不改变当前文件，关闭当前标签后激活相邻文件", () => {
    const reader = createFileReader();
    const layout = { taskListCollapsed: false, workspaceOpen: true };
    openReaderTab(reader, makeTab("a", "workspace"), layout);
    openReaderTab(reader, makeTab("b"), layout);
    openReaderTab(reader, makeTab("c", "knowledge"), layout);
    expect(closeReaderTab(reader, "b")).toBeNull();
    expect(reader.activeKey).toBe("c");
    expect(closeReaderTab(reader, "c")).toEqual({});
    expect(reader.activeKey).toBe("a");
  });

  it("文件身份区分同名文件、知识文件、产物快照与工作空间当前版本", () => {
    const key = (item) => readerFileKey(item, "expert");
    expect(key({ id: "a", name: "报告.md" })).not.toBe(
      key({ id: "b", name: "报告.md" }),
    );
    const snapshot = {
      id: "a",
      name: "报告.md",
      resultId: "round-1",
      snapshotContent: "旧版",
    };
    expect(key(snapshot)).not.toBe(key({ id: "a", name: "报告.md" }));
    expect(key(snapshot)).not.toBe(
      key({ ...snapshot, snapshotContent: "新版" }),
    );
    expect(key({ ...snapshot, knowledgeSource: { id: "doc" } })).not.toBe(
      key(snapshot),
    );
    expect(key({ knowledgeSource: { id: "doc" } })).toBe(
      key({ name: "改名.md", knowledgeSource: { id: "doc" } }),
    );
  });
});

function workspaceContext(workspaceOpen = true) {
  const files = [
    { id: "a", name: "质量资料", kind: "folder", parentId: null },
    { id: "a-1", name: "本周", kind: "folder", parentId: "a" },
    { id: "a-2", name: "报告", kind: "folder", parentId: "a-1" },
    { id: "report-a", name: "核对报告.md", kind: "file", parentId: "a-2" },
    { id: "b", name: "设备资料", kind: "folder", parentId: null },
    { id: "report-b", name: "核对报告.md", kind: "file", parentId: "b" },
    { id: "root", name: "汇总.md", kind: "file", parentId: null },
  ];
  const context = {
    expert: { files },
    reader: createFileReader(),
    workspaceOpen,
    workspaceFolderId: "b",
    expandedFolderIds: ["b"],
    conversation: { cwd: "/设备资料" },
    $refs: {},
    $nextTick: vi.fn(),
  };
  context.reader.tabs = [
    { ...makeTab("a-tab", "workspace"), item: files[3] },
    { ...makeTab("b-tab", "workspace"), item: files[5] },
    { ...makeTab("root-tab", "workspace"), item: files[6] },
  ];
  context.reader.activeKey = "b-tab";
  Object.defineProperties(context, {
    activeReaderTab: {
      get: () => Chat.computed.activeReaderTab.call(context),
    },
    activeReaderWorkspaceLocation: {
      get: () => Chat.computed.activeReaderWorkspaceLocation.call(context),
    },
  });
  for (const method of [
    "revealReaderWorkspaceFile",
    "selectReaderTab",
    "closeReaderFile",
  ])
    context[method] = (...args) => Chat.methods[method].call(context, ...args);
  return context;
}

describe("预览标签与工作空间目录联动", () => {
  it("按文件标识找到完整祖先目录，同名文件各自归属正确目录", () => {
    const { expert } = workspaceContext();
    expect(
      readerWorkspaceFileLocation(expert.files, { fileId: "report-a" }),
    ).toMatchObject({
      file: { id: "report-a" },
      ancestorIds: ["a", "a-1", "a-2"],
    });
    expect(
      readerWorkspaceFileLocation(expert.files, { id: "report-b" }),
    ).toMatchObject({ file: { id: "report-b" }, ancestorIds: ["b"] });
  });

  it("临时文件和知识文件不因同名或路径相同而关联到工作空间", () => {
    const { expert } = workspaceContext();
    expect(
      readerWorkspaceFileLocation(expert.files, {
        name: "核对报告.md",
        path: "质量资料/本周/报告/核对报告.md",
        snapshotContent: "本轮内容",
      }),
    ).toBeNull();
    expect(
      readerWorkspaceFileLocation(expert.files, {
        id: "report-a",
        knowledgeSource: { id: "knowledge-a" },
      }),
    ).toBeNull();
  });

  it("父目录缺失或存在循环时不产生错误定位", () => {
    expect(
      readerWorkspaceFileLocation(
        [{ id: "file", kind: "file", parentId: "missing" }],
        { id: "file" },
      ),
    ).toBeNull();
    expect(
      readerWorkspaceFileLocation(
        [
          { id: "file", kind: "file", parentId: "loop" },
          { id: "loop", kind: "folder", parentId: "loop" },
        ],
        { id: "file" },
      ),
    ).toBeNull();
  });

  it("工作空间展开时切换标签会展开全部父目录，保留其他展开目录和工作目录", () => {
    const context = workspaceContext();
    context.selectReaderTab("a-tab");
    expect(context.workspaceOpen).toBe(true);
    expect(context.workspaceFolderId).toBe("a-2");
    expect(context.expandedFolderIds).toEqual(["b", "a", "a-1", "a-2"]);
    expect(context.activeReaderWorkspaceLocation.file.id).toBe("report-a");
    expect(context.conversation.cwd).toBe("/设备资料");
    // Re-selecting the same tab also reveals a manually collapsed directory.
    context.expandedFolderIds = ["b"];
    context.selectReaderTab("a-tab");
    expect(context.expandedFolderIds).toContain("a-2");
  });

  it("工作空间收起时切换工作空间文件标签不强制打开或改变目录", () => {
    const context = workspaceContext(false);
    context.selectReaderTab("a-tab");
    expect(context.workspaceOpen).toBe(false);
    expect(context.workspaceFolderId).toBe("b");
    expect(context.expandedFolderIds).toEqual(["b"]);
  });

  it.each([true, false])(
    "切换知识或产物标签及关闭当前标签时保持工作空间显隐=%s",
    (workspaceOpen) => {
      const context = workspaceContext(workspaceOpen);
      context.reader.tabs.push(
        makeTab("knowledge", "knowledge"),
        makeTab("generated"),
      );
      context.selectReaderTab("knowledge");
      expect(context.workspaceOpen).toBe(workspaceOpen);
      context.selectReaderTab("generated");
      expect(context.workspaceOpen).toBe(workspaceOpen);
      context.closeReaderFile("generated");
      expect(context.reader.activeKey).toBe("knowledge");
      expect(context.workspaceOpen).toBe(workspaceOpen);
      context.closeReaderFile("knowledge");
      expect(context.reader.activeKey).toBe("root-tab");
      expect(context.workspaceOpen).toBe(workspaceOpen);
    },
  );

  it("已保存的对话产物按工作空间归属联动，仍保留本轮快照", () => {
    const context = workspaceContext();
    const tab = context.reader.tabs[0];
    tab.origin = "conversation";
    tab.item = {
      fileId: "report-a",
      kind: "result_file",
      snapshotContent: "本轮旧版本",
    };
    context.selectReaderTab(tab.key);
    expect(context.workspaceOpen).toBe(true);
    expect(context.workspaceFolderId).toBe("a-2");
    expect(tab.item.snapshotContent).toBe("本轮旧版本");
  });

  it("根目录文件不展开无关目录，关闭当前标签后定位相邻文件", () => {
    const context = workspaceContext();
    context.selectReaderTab("root-tab");
    expect(context.workspaceFolderId).toBeNull();
    expect(context.expandedFolderIds).toEqual(["b"]);
    context.closeReaderFile("root-tab");
    expect(context.reader.activeKey).toBe("b-tab");
    expect(context.workspaceFolderId).toBe("b");
  });

  it("关闭非当前标签不重置用户正在浏览的目录", () => {
    const context = workspaceContext();
    context.workspaceFolderId = "a-1";
    context.closeReaderFile("a-tab");
    expect(context.reader.activeKey).toBe("b-tab");
    expect(context.workspaceFolderId).toBe("a-1");
  });

  it("快速连续切换时仅滚动到最终文件，滚动范围限定在工作空间内", () => {
    const context = workspaceContext();
    const callbacks = [];
    context.$nextTick = vi.fn((callback) => callbacks.push(callback));
    const tree = {
      scrollTop: 0,
      getBoundingClientRect: () => ({ top: 0, bottom: 100 }),
      querySelectorAll: () => [
        {
          dataset: { workspaceFileId: "report-a" },
          getBoundingClientRect: () => ({ top: 300, bottom: 329 }),
        },
        {
          dataset: { workspaceFileId: "report-b" },
          getBoundingClientRect: () => ({ top: 500, bottom: 529 }),
        },
      ],
    };
    context.$refs.workspaceTree = tree;
    context.selectReaderTab("a-tab");
    context.selectReaderTab("b-tab");
    callbacks.forEach((callback) => callback());
    expect(tree.scrollTop).toBe(429);
    expect(context.workspaceFolderId).toBe("b");
  });
});

describe("阅读内容的异步加载", () => {
  it("读取完成顺序与点击顺序不同时，不覆盖当前标签或其他文件的内容", async () => {
    const first = makeTab("first");
    const second = makeTab("second");
    let resolveFirst;
    const context = {
      reader: { tabs: [first, second], activeKey: "second" },
      fileBlob: vi.fn((item) =>
        item.id === "first"
          ? new Promise((resolve) => {
              resolveFirst = resolve;
            })
          : Promise.resolve(new Blob(["第二份"], { type: "text/plain" })),
      ),
    };
    const loading = Chat.methods.loadReaderTab.call(context, first);
    await Chat.methods.loadReaderTab.call(context, second);
    resolveFirst(new Blob(["第一份"], { type: "text/plain" }));
    await loading;
    expect(first.text).toBe("第一份");
    expect(second.text).toBe("第二份");
    expect(context.reader.activeKey).toBe("second");
  });

  it("读取期间关闭标签后，不再创建图片 URL 或恢复已关闭的标签", async () => {
    const tab = makeTab("image");
    let resolveBlob;
    const context = {
      reader: { tabs: [tab] },
      fileBlob: () =>
        new Promise((resolve) => {
          resolveBlob = resolve;
        }),
    };
    const createUrl = vi.spyOn(URL, "createObjectURL");
    try {
      const loading = Chat.methods.loadReaderTab.call(context, tab);
      context.reader.tabs = [];
      resolveBlob(new Blob(["image"], { type: "image/png" }));
      await loading;
      expect(createUrl).not.toHaveBeenCalled();
      expect(context.reader.tabs).toEqual([]);
    } finally {
      createUrl.mockRestore();
    }
  });

  it("不把二进制 Office 文件当作文字展示", async () => {
    const tab = makeTab("binary");
    tab.item.name = "报告.docx";
    await Chat.methods.loadReaderTab.call(
      {
        reader: { tabs: [tab] },
        fileBlob: async () =>
          new Blob([new Uint8Array([80, 75, 3, 4])], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }),
      },
      tab,
    );
    expect(tab.status).toBe("error");
    expect(tab.error).toContain("下载文件");
    expect(tab.text).toBe("");
  });

  it("读取失败后仍可重试同一个标签", async () => {
    const tab = makeTab("retry");
    const context = {
      reader: { tabs: [tab] },
      fileBlob: vi
        .fn()
        .mockRejectedValueOnce(new Error("missing"))
        .mockResolvedValueOnce(new Blob(["已恢复"], { type: "text/plain" })),
    };
    await Chat.methods.loadReaderTab.call(context, tab);
    expect(tab.status).toBe("error");
    await Chat.methods.loadReaderTab.call(context, tab);
    expect(tab.status).toBe("ready");
    expect(tab.text).toBe("已恢复");
  });
});
