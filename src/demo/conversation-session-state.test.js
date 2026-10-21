import { describe, expect, it } from "vitest";
import {
  applySessionPresentationEvent,
  normalizeSessionPresentation,
  todoProgress,
} from "./conversation-session-state";

describe("会话结构化状态快照", () => {
  it("Todo 只接受更新的数字版本，完整快照可清空且取消项不计分母", () => {
    const session = { id: "session1" };
    normalizeSessionPresentation(session);
    const send = (revision, todos) =>
      applySessionPresentationEvent(session, {
        type: "todo.updated",
        sessionId: session.id,
        revision,
        todos,
      });
    expect(
      send(3, [
        { id: "a", content: "核对", status: "completed" },
        { id: "b", content: "分析", status: "in_progress" },
        { id: "c", content: "跳过", status: "cancelled" },
      ]),
    ).toBe(true);
    expect(todoProgress(session.sessionPresentation.todos)).toEqual({
      done: 1,
      total: 2,
    });
    expect(send(2, [{ id: "a", content: "旧快照", status: "pending" }])).toBe(
      false,
    );
    expect(session.sessionPresentation.todos).toHaveLength(3);
    expect(send(4, [])).toBe(true);
    expect(session.sessionPresentation.todos).toEqual([]);
  });

  it("目标、循环和心跳保持独立，控制指纹不和 Todo 数字版本比较", () => {
    const session = { id: "session1" };
    normalizeSessionPresentation(session);
    const control = {
      goal: {
        title: "分析质量",
        status: "active",
        turns_used: 2,
        max_turns: 5,
      },
      loop: { status: "active", ticks_fired: 3 },
      heartbeat: { status: "paused", fire_count: 1 },
    };
    expect(
      applySessionPresentationEvent(session, {
        type: "session.control.update",
        sessionId: "session1",
        revision: "hash-a",
        control,
      }),
    ).toBe(true);
    expect(
      applySessionPresentationEvent(session, {
        type: "session.control.update",
        sessionId: "session1",
        revision: "hash-a",
        control: {},
      }),
    ).toBe(false);
    expect(session.sessionPresentation.control).toEqual(control);
    expect(session.sessionPresentation.todoRevision).toBe(-1);
  });

  it("排队任务接受更新的快照，保留顺序且可清空", () => {
    const session = { id: "session1" };
    normalizeSessionPresentation(session);
    const send = (revision, tasks) =>
      applySessionPresentationEvent(session, {
        type: "queue.updated",
        sessionId: session.id,
        revision,
        tasks,
      });
    expect(
      send(1, [
        { id: "a", title: "先核对资料", content: "核对 A 批次" },
        { id: "b", title: "再整理报告", content: "整理日报" },
      ]),
    ).toBe(true);
    expect(
      session.sessionPresentation.queuedTasks.map((item) => item.id),
    ).toEqual(["a", "b"]);
    expect(send(1, [])).toBe(false);
    expect(send(2, [])).toBe(true);
    expect(session.sessionPresentation.queuedTasks).toEqual([]);
  });

  it("旧会话补齐队列字段而不覆盖现有待办", () => {
    const session = {
      id: "session1",
      sessionPresentation: {
        todoRevision: 1,
        todos: [{ id: "a", content: "核对", status: "pending" }],
        controlRevision: null,
        control: { goal: null, loop: null, heartbeat: null },
        notifications: [],
      },
    };
    expect(normalizeSessionPresentation(session)).toBe(true);
    expect(normalizeSessionPresentation(session)).toBe(false);
    expect(session.sessionPresentation.todos).toHaveLength(1);
    expect(session.sessionPresentation.queuedTasks).toEqual([]);
  });

  it("旧演示待办状态迁移一次，不覆盖后续快照", () => {
    const session = {
      id: "session1",
      currentStatus: {
        kind: "todo",
        items: [{ id: "a", text: "核对资料", done: true }],
      },
    };
    expect(normalizeSessionPresentation(session)).toBe(true);
    expect(normalizeSessionPresentation(session)).toBe(false);
    expect(session.sessionPresentation.todos).toMatchObject([
      { id: "a", content: "核对资料", status: "completed" },
    ]);
  });
  it("账户通知按 key 原位替换和清除，不创建对话回合", () => {
    const session = { id: "session1", messages: [] };
    normalizeSessionPresentation(session);
    const send = (type, text) =>
      applySessionPresentationEvent(session, {
        type,
        sessionId: session.id,
        key: "credits.low",
        text,
      });
    expect(send("notification.show", "演示额度提醒")).toBe(true);
    expect(send("notification.show", "提醒内容已更新")).toBe(true);
    expect(session.sessionPresentation.notifications).toEqual([
      { key: "credits.low", text: "提醒内容已更新", level: "info" },
    ]);
    expect(session.messages).toHaveLength(0);
    expect(send("notification.clear")).toBe(true);
    expect(session.sessionPresentation.notifications).toEqual([]);
  });
});
