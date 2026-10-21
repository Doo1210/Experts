export function emptySessionPresentation() {
  return {
    todoRevision: -1,
    todos: [],
    queueRevision: -1,
    queuedTasks: [],
    controlRevision: null,
    control: { goal: null, loop: null, heartbeat: null },
    notifications: [],
  };
}

export function normalizeSessionPresentation(conversation) {
  if (conversation.sessionPresentation) {
    const state = conversation.sessionPresentation;
    let changed = false;
    if (!Array.isArray(state.notifications)) {
      state.notifications = [];
      changed = true;
    }
    if (!Number.isInteger(state.queueRevision)) {
      state.queueRevision = -1;
      changed = true;
    }
    if (!Array.isArray(state.queuedTasks)) {
      state.queuedTasks = [];
      changed = true;
    }
    return changed;
  }
  const presentation = emptySessionPresentation();
  const legacy = conversation.currentStatus;
  if (legacy?.kind === "todo") {
    presentation.todoRevision = 0;
    presentation.todos = (legacy.items || []).map((item) => ({
      id: item.id,
      content: item.text,
      status: item.done ? "completed" : "pending",
      parent: null,
    }));
  } else if (legacy?.kind === "goal") {
    presentation.controlRevision = "legacy";
    presentation.control.goal = {
      title: legacy.text || legacy.title,
      status: "active",
    };
  }
  conversation.sessionPresentation = presentation;
  return true;
}

export function applySessionPresentationEvent(conversation, event) {
  if (event.sessionId !== conversation.id) return false;
  const state = conversation.sessionPresentation;
  if (!state) return false;
  if (event.type === "notification.show") {
    const key = String(event.key || event.id || "");
    const text = String(event.text || "")
      .split(/\r?\n/)[0]
      .trim()
      .slice(0, 180);
    if (!key || !text) return false;
    const notice = { key, text, level: event.level || "info" };
    const index = state.notifications.findIndex((item) => item.key === key);
    if (index < 0) state.notifications.push(notice);
    else state.notifications.splice(index, 1, notice);
    return true;
  }
  if (event.type === "notification.clear") {
    const key = String(event.key || event.id || "");
    const index = state.notifications.findIndex((item) => item.key === key);
    if (index < 0) return false;
    state.notifications.splice(index, 1);
    return true;
  }
  if (event.type === "todo.updated") {
    if (
      !Number.isInteger(event.revision) ||
      event.revision <= state.todoRevision ||
      !Array.isArray(event.todos)
    )
      return false;
    state.todoRevision = event.revision;
    state.todos = event.todos.map((item) => ({
      id: String(item.id),
      content: String(item.content || ""),
      status: ["pending", "in_progress", "completed", "cancelled"].includes(
        item.status,
      )
        ? item.status
        : "pending",
      parent: item.parent == null ? null : String(item.parent),
    }));
    return true;
  }
  if (event.type === "queue.updated") {
    if (
      !Number.isInteger(event.revision) ||
      event.revision <= state.queueRevision ||
      !Array.isArray(event.tasks)
    )
      return false;
    state.queueRevision = event.revision;
    state.queuedTasks = event.tasks.map((task, index) => ({
      id: String(task.id || `queued_${index}`),
      title: String(task.title || task.content || "待执行任务").trim(),
      content: String(task.content || task.title || "").trim(),
      status: task.status === "running" ? "running" : "waiting",
    }));
    return true;
  }
  if (event.type === "session.control.update") {
    if (
      !event.control ||
      typeof event.control !== "object" ||
      typeof event.revision !== "string" ||
      event.revision === state.controlRevision
    )
      return false;
    state.controlRevision = event.revision;
    state.control = {
      goal: event.control.goal || null,
      loop: event.control.loop || null,
      heartbeat: event.control.heartbeat || null,
    };
    return true;
  }
  return false;
}

export function todoProgress(todos) {
  const relevant = todos.filter((item) => item.status !== "cancelled");
  return {
    done: relevant.filter((item) => item.status === "completed").length,
    total: relevant.length,
  };
}
