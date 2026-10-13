import { describe, expect, it } from "vitest";
import {
  abbreviatedImId,
  currentFirst,
  directSegmentsFor,
  filterImChats,
  groupImChats,
  imChatStats,
  sortedImMessages,
  scopesFor,
} from "./im-chat-model";
import { createImDemoChats, createImWorkspaceItems } from "./im-fixtures";

describe("消息渠道对话记录", () => {
  it("当前范围和当前会话段排在历史项之前且不改变原数据顺序", () => {
    const items = [
      { id: "history-1", current: false },
      { id: "current", current: true },
      { id: "history-2", current: false },
    ];
    expect(currentFirst(items).map((item) => item.id)).toEqual([
      "current",
      "history-1",
      "history-2",
    ]);
    expect(items[0].id).toBe("history-1");
  });

  it("长 ID 摘要保留能区分范围和段的末尾，完整 ID 仍可用于复制", () => {
    const id = "agent:exp_quality:wecom:group:wecom-chat81-exp_quality:shared";
    expect(abbreviatedImId(id)).toMatch(/^….*:shared$/);
    expect(abbreviatedImId(id).length).toBe(22);
    expect(abbreviatedImId("short-id")).toBe("short-id");
  });

  it("同聊天的共享和成员范围归一张卡，平台作用域不同则分开", () => {
    const base = {
      expertId: "exp_quality",
      platform: "企业微信",
      platformScope: "org-a",
      chatType: "group",
      chatId: "chat-1",
      title: "协作群",
      updatedAt: "2026-10-10T09:00:00+08:00",
      scopes: [{ sessionKey: "shared" }],
      runState: "ready",
    };
    const grouped = groupImChats([
      base,
      { ...base, scopes: [{ sessionKey: "member-1" }], runState: "running" },
      { ...base, platformScope: "org-b", scopes: [{ sessionKey: "other" }] },
    ]);
    expect(grouped).toHaveLength(2);
    expect(
      grouped.find((chat) => chat.platformScope === "org-a").scopes,
    ).toHaveLength(2);
    expect(
      grouped.find((chat) => chat.platformScope === "org-a").runState,
    ).toBe("running");
  });

  it("统计只针对筛选后的聊天，未知状态不算作运行中", () => {
    const chats = groupImChats(createImDemoChats());
    expect(imChatStats(chats)).toEqual({ total: 2, running: 0, unknown: 1 });
    expect(imChatStats(filterImChats(chats, { platform: "企业微信" }))).toEqual(
      {
        total: 1,
        running: 0,
        unknown: 0,
      },
    );
    expect(imChatStats(filterImChats(chats, { chatType: "single" }))).toEqual({
      total: 1,
      running: 0,
      unknown: 1,
    });
  });

  it("消息按数据库行 ID 排序，不按可能回退的时间排序", () => {
    const messages = sortedImMessages({
      messages: [
        { id: "later", dbId: 12, at: "2026-10-10T09:00:00+08:00" },
        { id: "earlier", dbId: 11, at: "2026-10-10T09:05:00+08:00" },
      ],
    });
    expect(messages.map((item) => item.id)).toEqual(["earlier", "later"]);
  });

  it("本期群聊样例只包含成员会话，不预演共享策略", () => {
    const chats = createImDemoChats();
    const group = chats.find((chat) => chat.chatType === "group");
    expect(group.currentPolicy).toBeUndefined();
    expect(group.scopes).toHaveLength(3);
    expect(group.scopes.every((scope) => scope.mode === "member")).toBe(true);
    expect(group.scopes.every((scope) => scope.segments.at(-1).current)).toBe(
      true,
    );
    expect(group.scopes[0].segments[0].sessionId).not.toBe("S1");
    const file = group.scopes[0].segments[1].messages.find(
      (item) => item.role === "file" && item.direction === "generated",
    );
    const workspaceItems = createImWorkspaceItems(chats);
    const fileItem = workspaceItems.find(
      (item) => item.id === `f_im_file_${file.id}`,
    );
    expect(fileItem).toBeTruthy();
    expect(
      workspaceItems.find((item) => item.id === fileItem.parentId).name,
    ).toBe("生成文件");
  });

  it("单聊没有会话范围与 session_key，直接展示会话段和段目录", () => {
    const dm = createImDemoChats().find((chat) => chat.chatType === "single");
    expect(dm.sessionKey).toBeNull();
    expect(scopesFor(dm)).toEqual([]);
    expect(directSegmentsFor(dm)).toHaveLength(2);
    expect(directSegmentsFor(dm)[0].cwd.startsWith(`${dm.cwd}/session-`)).toBe(
      true,
    );
    const folders = createImWorkspaceItems([dm]);
    expect(folders.some((item) => item.name === "scope-direct01")).toBe(false);
    expect(folders.some((item) => item.name === "session-s6")).toBe(true);
  });

  it("旧单聊范围数据归一为直接会话段，不丢失已有记录", () => {
    const legacy = {
      expertId: "exp_quality",
      platform: "钉钉",
      chatId: "dm-legacy",
      chatType: "single",
      sessionKey: "legacy-route",
      scopes: [
        {
          sessionKey: "legacy-route",
          segments: [{ sessionId: "old-segment", messages: [{ id: "m1" }] }],
        },
      ],
    };
    const chat = groupImChats([legacy])[0];
    expect(chat.sessionKey).toBeNull();
    expect(chat.scopes).toEqual([]);
    expect(chat.segments[0].messages[0].id).toBe("m1");
  });
});
