import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Workspace from "./components/Workspace.vue";
import { saveReaderWindow } from "./reader-window";
vi.mock("./reader-window", () => ({ saveReaderWindow: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const popup = {
    opener: {},
    closed: false,
    close: vi.fn(),
    location: { replace: vi.fn() },
  };
  const open = vi.fn(() => popup);
  vi.stubGlobal("window", { open });
  const item = { id: "report", parentId: null, kind: "file", name: "报告.png" };
  const blob = new File(["original"], item.name, { type: "image/png" });
  const vm = {
    expert: { id: "quality", files: [item] },
    getBlob: vi.fn(async () => blob),
    $router: {
      resolve: vi.fn(({ params }) => ({
        href: `/experts/reader/${params.id}`,
      })),
    },
    $message: { info: vi.fn(), error: vi.fn() },
  };
  return { popup, open, item, blob, vm };
}
describe("专家管理文件在新网页预览", () => {
  it("点击时先打开标签页，保存独立二进制快照与工作空间路径", async () => {
    const { vm, popup, item, blob, open } = setup();
    vm.getBlob.mockImplementation(async () => {
      expect(open).toHaveBeenCalledWith("about:blank", "_blank");
      return blob;
    });
    await Workspace.methods.preview.call(vm, item);
    expect(popup.opener).toBeNull();
    expect(saveReaderWindow).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ format: "image", item }),
      expect.objectContaining({ path: "workspace/报告.png" }),
      blob,
    );
    expect(popup.location.replace).toHaveBeenCalledWith(
      expect.stringMatching(/^\/experts\/reader\//),
    );
  });
  it("Office 独立页保存纯前端模拟快照，不依赖服务元数据", async () => {
    const { vm, item } = setup();
    item.name = "报告.docx";
    vm.getBlob.mockResolvedValue(new Blob(["Office bytes"]));
    await Workspace.methods.preview.call(vm, item);
    expect(saveReaderWindow.mock.calls[0][1]).toMatchObject({
      format: "demo",
      demo: { kind: "document" },
    });
    expect(saveReaderWindow.mock.calls[0][3]).toBeNull();
  });
  it("弹窗被拦截时给出提示，不进行读取或同步", async () => {
    const { vm, item, open } = setup();
    open.mockReturnValue(null);
    await Workspace.methods.preview.call(vm, item);
    expect(vm.$message.info).toHaveBeenCalled();
    expect(vm.getBlob).not.toHaveBeenCalled();
  });
  it("读取失败关闭空白标签页；用户已关闭标签时不再写入快照", async () => {
    const { vm, item, popup } = setup();
    vm.getBlob.mockRejectedValueOnce(new Error("文件不可用"));
    await Workspace.methods.preview.call(vm, item);
    expect(popup.close).toHaveBeenCalled();
    expect(vm.$message.error).toHaveBeenCalledWith("文件不可用");
    popup.closed = true;
    await Workspace.methods.preview.call(vm, item);
    expect(saveReaderWindow).not.toHaveBeenCalled();
  });
});
