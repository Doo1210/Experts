import { describe, expect, it } from "vitest";
import {
  abbreviatedImId,
  chatIdentifier,
  compactImId,
  currentFirst,
  directSegmentsFor,
  filterImChats,
  groupImChats,
  imChatActivity,
  imHistoryEntries,
  imHistoryRounds,
  imMemberHistories,
  imQuestionPreviews,
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

  it("聊天显示名称可独立于渠道原名称，原名称仍可搜索", () => {
    const original = createImDemoChats()[0];
    const renamed = groupImChats([{ ...original, displayName: "早班协作" }])[0];
    expect(renamed.title).toBe("早班协作");
    expect(renamed.sourceTitle).toBe(original.title);
    expect(filterImChats([renamed], { keyword: original.title })).toHaveLength(
      1,
    );
    expect(filterImChats([renamed], { keyword: "早班协作" })).toHaveLength(1);
  });

  it("统计只针对筛选后的聊天，未知状态不算作运行中", () => {
    const chats = groupImChats(createImDemoChats());
    expect(imChatStats(chats)).toEqual({ total: 6, running: 3, unknown: 1 });
    expect(imChatStats(filterImChats(chats, { platform: "企业微信" }))).toEqual(
      {
        total: 2,
        running: 1,
        unknown: 0,
      },
    );
    expect(imChatStats(filterImChats(chats, { chatType: "single" }))).toEqual({
      total: 3,
      running: 1,
      unknown: 1,
    });
  });

  it("卡片使用数据来源提供的标识名称和原值，不按单聊类型猜测", () => {
    const chats = createImDemoChats();
    expect(
      chats.map((chat) => [
        chat.platform,
        chat.chatType,
        chatIdentifier(chat).name,
      ]),
    ).toEqual([
      ["企业微信", "group", "chatid"],
      ["钉钉", "single", "conversationId"],
      ["钉钉", "group", "conversationId"],
      ["飞书", "group", "chat_id"],
      ["飞书", "single", "chat_id"],
      ["企业微信", "single", "userid"],
    ]);
    expect(chatIdentifier(chats[1]).value).toBe(chats[1].chatId);
    expect(chatIdentifier({ platform: "钉钉", chatId: "sender-42" })).toEqual({
      name: "聊天标识",
      value: "sender-42",
    });
    expect(
      chatIdentifier({
        identifierName: "senderId",
        identifierValue: "sender-42",
      }),
    ).toEqual({ name: "senderId", value: "sender-42" });
  });

  it("最近活跃取最后记录的消息，群成员取最后一条已接收用户消息", () => {
    const group = createImDemoChats()[0];
    expect(imChatActivity(group)).toEqual({
      at: "2026-10-10T10:25:00+08:00",
      member: "张三",
    });
    expect(imChatActivity({ chatType: "single", segments: [] })).toEqual({
      at: null,
      member: "",
    });
  });

  it("长渠道标识保留首尾，成员按最近记录排列且同名仍独立", () => {
    expect(compactImId("conversation-abcdefgh-12345678", 16)).toBe(
      "conversa…2345678",
    );
    const group = createImDemoChats()[0];
    expect(imMemberHistories(group).map((member) => member.memberName)).toEqual(
      ["张三", "李四", "王五"],
    );
    expect(imMemberHistories(group).map((member) => member.memberKey)).toEqual([
      "zhang42",
      "li73",
      "wang55",
    ]);
  });

  it("同名成员按标识隔离，旧共享和线程记录不归入成员历史", () => {
    const makeScope = (id, mode, messageId) => ({
      id,
      memberName: "张工",
      mode,
      segments: [
        {
          id: messageId,
          messages: [
            {
              id: messageId,
              role: "user",
              at: "2026-10-10T09:00:00+08:00",
            },
          ],
        },
      ],
    });
    const members = imMemberHistories({
      chatType: "group",
      scopes: [
        makeScope("user-a", "member", "a-1"),
        makeScope("user-a", "member", "a-2"),
        makeScope("user-b", "member", "b-1"),
        makeScope("shared", "shared", "shared-1"),
        makeScope("thread", "thread", "thread-1"),
      ],
    });
    expect(members.map((member) => member.memberKey)).toEqual([
      "user-a",
      "user-b",
    ]);
    expect(members[0].segments).toHaveLength(2);
  });

  it("连续历史只在真实重置时插入边界并去重，不显示原始重置命令", () => {
    const dm = createImDemoChats().find(
      (chat) => chat.id === "im_exp_quality_dm",
    );
    const entries = imHistoryEntries(dm.segments);
    expect(entries.filter((item) => item.kind === "boundary")).toHaveLength(1);
    expect(entries.filter((item) => item.kind === "boundary")[0].at).toBe(
      "2026-10-09T16:06:00+08:00",
    );
    expect(entries.some((item) => item.entry?.content === "/reset")).toBe(
      false,
    );
    const first = dm.segments[0].messages[0];
    expect(
      imHistoryEntries([
        dm.segments[0],
        { ...dm.segments[1], messages: [first, ...dm.segments[1].messages] },
      ]).filter((item) => item.entry?.id === first.id),
    ).toHaveLength(1);
    expect(
      imHistoryEntries([{ ...dm.segments[1], resetCommand: null }]).some(
        (item) => item.kind === "boundary",
      ),
    ).toBe(false);
  });

  it("跨段历史保持持久化顺序，不按回退的时钟重排", () => {
    const entries = imHistoryEntries([
      {
        id: "one",
        startedAt: "2026-10-10T10:00:00+08:00",
        messages: [
          {
            id: "first",
            dbId: 10,
            role: "user",
            at: "2026-10-10T10:00:00+08:00",
          },
        ],
      },
      {
        id: "two",
        startedAt: "2026-10-10T09:59:00+08:00",
        messages: [
          {
            id: "second",
            dbId: 11,
            role: "assistant",
            at: "2026-10-10T09:59:00+08:00",
          },
        ],
      },
    ]);
    expect(entries.map((item) => item.entry?.id)).toEqual(["first", "second"]);
  });

  it("长单聊可生成问题定位预览，并保留跳转所需的消息键", () => {
    const chat = createImDemoChats().find(
      (item) => item.id === "im_exp_quality_feishu-single",
    );
    const entries = imHistoryEntries(chat.segments);
    const previews = imQuestionPreviews(entries);
    expect(entries.length).toBeGreaterThan(20);
    expect(previews).toHaveLength(13);
    expect(previews[0]).toMatchObject({
      key: "db:9000",
      finalReply: "本周良率整体稳定，周三夜班有一次短时下降。",
    });
    expect(previews.at(-1).message.content).toBe("请查看最新情况。");
  });

  it("历史按回合归入输入、过程、最终回复和产出", () => {
    const group = createImDemoChats()[0];
    const rounds = imHistoryRounds(imHistoryEntries(group.scopes[0].segments));
    const fileRound = rounds.find(
      (item) => item.kind === "round" && item.user.id === "g-z-3",
    );
    expect(fileRound.inputs.map((item) => item.fileName)).toEqual([
      "设备表格.xlsx",
    ]);
    expect(fileRound.process.map((item) => item.title)).toEqual(["读取表格"]);
    expect(fileRound.assistant.content).toContain("工位 8");
    expect(fileRound.outputs.map((item) => item.fileName)).toEqual([
      "检查结果.md",
    ]);
    expect(rounds.filter((item) => item.kind === "boundary")).toHaveLength(2);
  });

  it("各渠道最近回合都有可展开的模拟处理经过", () => {
    const chats = createImDemoChats();
    for (const chat of chats) {
      const segments =
        chat.chatType === "single" ? chat.segments : chat.scopes[0].segments;
      const rounds = imHistoryRounds(imHistoryEntries(segments)).filter(
        (item) => item.kind === "round",
      );
      expect(rounds.at(-1).process.length).toBeGreaterThan(0);
      expect(rounds.at(-1).assistant.turnStatus).toBe(
        chat.runState === "running" ? "running" : "completed",
      );
    }
    const long = chats.find(
      (chat) => chat.id === "im_exp_quality_feishu-single",
    );
    const rounds = imHistoryRounds(imHistoryEntries(long.segments)).filter(
      (item) => item.kind === "round",
    );
    expect(rounds.filter((round) => round.process.length)).toHaveLength(5);
    expect(rounds.at(-1).process.some((item) => item.role === "interim")).toBe(
      true,
    );
  });

  it("同回合多段专家文字只保留最后一段在主线，孤立历史不丢失", () => {
    const entries = [
      {
        kind: "message",
        key: "user",
        entry: { id: "u", role: "user", content: "问题" },
      },
      {
        kind: "message",
        key: "a1",
        entry: { id: "a1", role: "assistant", content: "中途说明" },
      },
      {
        kind: "message",
        key: "a2",
        entry: { id: "a2", role: "assistant", content: "最终回复" },
      },
      { kind: "boundary", key: "boundary", at: "2026-10-10T10:00:00+08:00" },
      {
        kind: "message",
        key: "orphan",
        entry: { id: "o", role: "assistant", content: "已保存的孤立记录" },
      },
    ];
    const rounds = imHistoryRounds(entries);
    expect(rounds[0].process[0]).toMatchObject({
      role: "interim",
      content: "中途说明",
    });
    expect(rounds[0].assistant.content).toBe("最终回复");
    expect(rounds[2].user).toBeNull();
    expect(rounds[2].assistant.content).toBe("已保存的孤立记录");
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
