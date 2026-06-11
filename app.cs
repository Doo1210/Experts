:root {
  --primary: #4080ff;
  --primary-light: #ecf3ff;
  --sidebar-bg: #fff;
  --page-bg: #f5f7fa;
  --border: #e4e7ed;
  --text-primary: #303133;
  --text-secondary: #606266;
  --text-muted: #909399;
  --sidebar-width: 220px;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: "PingFang SC", "Microsoft YaHei", "Inter", system-ui, sans-serif;
  background: var(--page-bg);
  color: var(--text-primary);
}
[v-cloak] { display: none; }

.app-shell { display: flex; height: 100vh; overflow: hidden; }

.platform-sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.sidebar-nav { flex: 1; overflow-y: auto; padding: 12px 8px 16px; }
.nav-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px; border-radius: 6px; font-size: 13px;
  color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
  text-decoration: none;
}
.nav-item:hover { background: #f5f7fa; color: var(--text-primary); }
.nav-item.active { background: var(--primary-light); color: var(--primary); font-weight: 600; }
.sidebar-user {
  padding: 12px 16px; border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary);
}
.sidebar-user-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #4080ff, #69b1ff);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 12px; font-weight: 700;
}

.main-area { flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100vh; overflow: hidden; }
.main-scroll { flex: 1; overflow-y: auto; padding: 20px 28px 32px; }
.main-scroll.flush { padding: 0; overflow: hidden; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 0 0 16px; }
.page-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.page-header-text { min-width: 0; }
.page-header-text .page-title { margin: 0 0 4px; }
.page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5; }

.page-create-btn {
  display: inline-flex; align-items: center; gap: 8px;
  height: 38px; padding: 0 18px 0 12px; border: none; border-radius: 10px;
  font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
}
.page-create-btn:hover { transform: translateY(-1px); }
.page-create-btn:active { transform: translateY(0); }
.page-create-btn-icon-wrap {
  width: 22px; height: 22px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.page-create-btn-expert {
  background: linear-gradient(135deg, #4080ff 0%, #5b93ff 100%);
  color: #fff;
}
.page-create-btn-expert .page-create-btn-icon-wrap { background: rgba(255, 255, 255, 0.2); }
.page-create-btn-expert:hover { box-shadow: 0 6px 18px rgba(64, 128, 255, 0.35); }
.page-create-btn-project {
  background: linear-gradient(135deg, #59b259 0%, #85ce61 100%);
  color: #fff;
}
.page-create-btn-project .page-create-btn-icon-wrap { background: rgba(255, 255, 255, 0.22); }
.page-create-btn-project:hover { box-shadow: 0 6px 18px rgba(103, 194, 58, 0.32); }
.page-create-btn-soft {
  background: #fff; box-shadow: none; font-size: 13px; height: 34px; padding: 0 14px 0 10px;
}
.page-create-btn-soft.page-create-btn-expert {
  color: var(--primary); border: 1px dashed #b3ccff;
}
.page-create-btn-soft.page-create-btn-expert:hover {
  background: var(--primary-light); box-shadow: 0 2px 8px rgba(64, 128, 255, 0.12);
}
.page-create-btn-soft.page-create-btn-expert .page-create-btn-icon-wrap { background: var(--primary-light); color: var(--primary); }
.page-create-btn-soft.page-create-btn-project {
  color: #59b259; border: 1px dashed #b3e19d;
}
.page-create-btn-soft.page-create-btn-project:hover {
  background: #f0f9eb; box-shadow: 0 2px 8px rgba(103, 194, 58, 0.12);
}
.page-create-btn-soft.page-create-btn-project .page-create-btn-icon-wrap { background: #f0f9eb; color: #59b259; }
.empty-state .page-create-btn { margin-top: 4px; }

.list-page { max-width: 1200px; }

.expert-grid, .project-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
}
@media (max-width: 1280px) { .expert-grid, .project-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px) { .expert-grid, .project-grid { grid-template-columns: 1fr; } }

.expert-card, .project-card {
  position: relative; overflow: hidden;
  background: #fff; border: 1px solid var(--border); border-radius: 12px;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  display: flex; flex-direction: column; min-height: 200px;
}
.expert-card { cursor: default; }
.project-card { cursor: pointer; }
.expert-card:hover, .project-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(64, 128, 255, 0.12);
  border-color: #c6d8ff;
}
.project-card:hover .card-hover-bar { opacity: 1; }

.expert-card-accent {
  height: 4px;
  background: linear-gradient(90deg, #4080ff, #69b1ff, #a0cfff);
}
.project-card-accent {
  height: 4px;
  background: linear-gradient(90deg, #67c23a, #85ce61, #b3e19d);
}

.card-more-btn {
  position: absolute; top: 14px; right: 12px;
  width: 30px; height: 30px; border: none; background: rgba(255,255,255,0.9);
  border-radius: 8px; cursor: pointer; color: var(--text-muted); z-index: 2;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: background 0.15s, color 0.15s, transform 0.15s;
}
.card-more-btn:hover { background: #fff; color: var(--primary); transform: scale(1.05); }

.expert-card-body, .project-card-body {
  flex: 1; display: flex; flex-direction: column;
  padding: 18px 18px 14px; min-height: 0;
}
.expert-card-body { cursor: pointer; transition: background 0.15s; }
.expert-card-body:hover { background: rgba(64, 128, 255, 0.03); }

.card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
.card-avatar {
  width: 52px; height: 52px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
  border: 3px solid #fff; box-shadow: 0 2px 10px rgba(64, 128, 255, 0.15);
}
.card-header-text { flex: 1; min-width: 0; }
.card-name {
  font-size: 15px; font-weight: 600; color: var(--text-primary); line-height: 1.4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.card-category {
  display: inline-block; margin-top: 4px; padding: 1px 8px;
  font-size: 11px; color: var(--primary); background: var(--primary-light);
  border-radius: 10px; font-weight: 500;
}
.card-position { font-size: 12px; color: var(--text-muted); }
.card-star { flex-shrink: 0; width: 20px; height: 20px; cursor: pointer; color: #c0c4cc; }
.card-star.favorited { color: #f5a623; }
.card-desc {
  font-size: 13px; color: var(--text-secondary); line-height: 1.65; margin: 0 0 14px;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
  flex: 1;
}
.expert-card .card-desc { -webkit-line-clamp: 2; }
.card-footer { display: flex; align-items: flex-end; justify-content: space-between; margin-top: auto; gap: 8px; }
.card-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.expertise-tag { font-size: 11px; padding: 3px 9px; border-radius: 6px; border: 1px solid #e8edf4; }
.tag-blue { background: #f6f8fc; color: #7a94c4; }
.tag-green { background: #f6faf8; color: #6b9a82; }
.tag-orange { background: #fcfaf6; color: #b8956a; }
.tag-purple { background: #f9f7fc; color: #9585b0; }
.tag-teal { background: #f6fbfb; color: #6b9a9a; }
.card-time { font-size: 11px; color: #c0c4cc; white-space: nowrap; flex-shrink: 0; }

.card-hover-bar {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 16px; border-top: 1px solid #f0f2f5;
  background: linear-gradient(180deg, #fafbfc 0%, #f5f7fa 100%);
  font-size: 12px; font-weight: 500; color: var(--primary);
  opacity: 0; transition: opacity 0.2s;
}

.expert-card-actions {
  display: flex; align-items: stretch;
  border-top: 1px solid #f0f2f5;
  background: linear-gradient(180deg, #fafbfc 0%, #f5f7fa 100%);
}
.expert-card-action {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 11px 8px; border: none; background: transparent;
  font-size: 12px; font-weight: 500; color: var(--text-secondary);
  cursor: pointer; transition: background 0.15s, color 0.15s;
}
.expert-card-action:hover { background: var(--primary-light); color: var(--primary); }
.expert-card-action-primary { color: var(--primary); font-weight: 600; }
.expert-card-action-primary:hover { background: var(--primary-light); }
.expert-card-action-divider { width: 1px; background: #e8ecf0; flex-shrink: 0; }
.expert-card .card-more-btn { z-index: 3; }
.project-card .card-more-btn { z-index: 3; }

.project-hover-bar { opacity: 1; color: #67c23a; }
.project-card:hover .project-hover-bar { background: linear-gradient(180deg, #f0f9eb 0%, #f5faf2 100%); }
.card-hover-arrow { flex-shrink: 0; }

/* Project card specifics */
.project-card-head {
  display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px;
}
.project-card-icon {
  width: 40px; height: 40px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; background: #f0f9eb; border-radius: 10px;
}
.project-card-title-wrap { flex: 1; min-width: 0; }
.project-card-title-wrap .card-name { margin-bottom: 6px; white-space: normal; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.project-status-badge {
  display: inline-block; padding: 1px 8px; font-size: 11px; font-weight: 500;
  color: #67c23a; background: #f0f9eb; border-radius: 10px;
}

.project-card-progress { margin-bottom: 14px; }
.project-progress-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 6px; font-size: 11px;
}
.project-progress-label { color: var(--text-muted); }
.project-progress-count { color: var(--primary); font-weight: 600; }
.project-progress-track {
  height: 4px; border-radius: 2px; background: #eef1f5; overflow: hidden;
}
.project-progress-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, #4080ff, #69b1ff);
  transition: width 0.3s ease;
}

.project-card-footer {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: auto; padding-top: 12px; border-top: 1px solid #f5f7fa; gap: 8px;
}
.member-stack-wrap { display: flex; align-items: center; gap: 8px; min-width: 0; }
.member-stack { display: flex; align-items: center; }
.member-stack img {
  width: 28px; height: 28px; border-radius: 50%; border: 2px solid #fff;
  margin-left: -8px; object-fit: cover; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.member-stack img:first-child { margin-left: 0; }
.member-stack-more {
  width: 28px; height: 28px; margin-left: -8px; border-radius: 50%;
  background: #f0f2f5; border: 2px solid #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; color: var(--text-muted);
}
.member-count { font-size: 11px; color: var(--text-muted); white-space: nowrap; }

.project-card-compact { min-height: 120px; }
.project-card-compact:hover { transform: translateY(-2px); }
.project-card-compact .card-hover-bar { display: none; }

.empty-state {
  grid-column: 1 / -1; text-align: center; padding: 72px 24px;
  color: var(--text-muted); background: #fff; border: 1px dashed var(--border);
  border-radius: 12px;
}
.empty-state-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.6; }
.empty-state p { margin: 0 0 16px; font-size: 14px; }

.industry-tabs {
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--border); margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
}
.tab-list { display: flex; gap: 28px; }
.tab-item {
  padding: 10px 0; font-size: 14px; color: var(--text-secondary);
  cursor: pointer; position: relative;
}
.tab-item:hover { color: var(--primary); }
.tab-item.active { color: var(--primary); font-weight: 600; }
.tab-item.active::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: -1px;
  height: 2px; background: var(--primary);
}
.toolbar-right { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; flex-wrap: wrap; }

.fav-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border: 1px solid var(--border); border-radius: 6px;
  background: #fff; font-size: 13px; color: var(--text-secondary); cursor: pointer;
}
.fav-btn.active { border-color: #f5a623; color: #e6a23c; background: #fdf6ec; }

.scene-filter { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.scene-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
.scene-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.scene-tag {
  padding: 3px 9px; border-radius: 12px; font-size: 11px; cursor: pointer;
  background: #f0f2f5; color: var(--text-secondary);
}
.scene-tag.active { background: var(--primary); color: #fff; }

.task-layout { display: flex; flex-direction: column; height: 100vh; background: #fff; }
.task-top-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 12px 20px; border-bottom: 1px solid var(--border);
  background: #fff; flex-shrink: 0; z-index: 2;
}
.task-top-bar-left {
  display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;
}
.task-top-bar-avatar {
  width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0; align-self: flex-start;
  border: 2px solid #fff; box-shadow: 0 1px 4px rgba(64, 128, 255, 0.15);
}
.task-top-bar-info { min-width: 0; flex: 1; padding-top: 1px; }
.task-top-bar-name {
  font-size: 15px; font-weight: 600; color: var(--text-primary); line-height: 1.35;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.task-top-bar-desc {
  font-size: 12px; color: var(--text-muted); line-height: 1.55; margin-top: 3px;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
}
.task-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
.task-right-panel {
  width: 280px; min-width: 260px; flex-shrink: 0;
  border-left: 1px solid var(--border);
  display: flex; flex-direction: column; min-height: 0;
  background: #fafbfc;
}
.task-right-panel-inner {
  flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden;
}
.task-right-panel-title {
  font-size: 13px; margin: 0; padding: 14px 16px 10px;
  color: var(--text-secondary); font-weight: 600;
  border-bottom: 1px solid var(--border); background: #fff; flex-shrink: 0;
}
.task-right-panel-desc {
  font-size: 11px; color: #909399; margin: 0; padding: 0 16px 10px; flex-shrink: 0;
}
.task-right-panel-empty {
  font-size: 12px; color: #909399; padding: 16px;
}
.task-right-panel-scroll { flex: 1; overflow-y: auto; padding: 12px 16px 16px; min-height: 0; }
.task-right-panel-artifacts .task-right-panel-title { border-bottom: none; }
.task-list { flex: 1; overflow-y: auto; min-height: 0; }
.task-item { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.15s; }
.task-item:hover { background: #f5f7fa; }
.task-item.active { background: var(--primary-light); border-left: 3px solid var(--primary); }
.task-item-row { display: flex; align-items: flex-start; gap: 8px; }
.task-item-body { flex: 1; min-width: 0; }
.task-item-title { font-size: 13px; font-weight: 500; line-height: 1.4; word-break: break-word; }
.task-item-meta { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
.task-item-actions { display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity 0.15s; }
.task-item:hover .task-item-actions, .task-item.active .task-item-actions { opacity: 1; }
.task-action-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border: none; border-radius: 4px;
  background: transparent; color: var(--text-muted); cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.task-action-btn:hover { background: #e8ecf0; color: var(--primary); }
.task-action-btn-danger:hover { background: #fef0f0; color: #f56c6c; }

.task-archived-section { border-top: 1px solid var(--border); margin-top: 4px; }
.task-archived-toggle {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  padding: 10px 12px; border: none; background: transparent;
  font-size: 12px; color: var(--text-muted); cursor: pointer;
}
.task-archived-toggle:hover { background: #f5f7fa; color: var(--text-secondary); }
.task-item-archived { opacity: 0.85; }
.task-item-archived .task-item-title { color: var(--text-secondary); }

.chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.chat-header {
  padding: 12px 20px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.chat-header-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
.chat-expert-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chat-header-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border: 1px solid var(--border); border-radius: 6px;
  background: #fff; color: var(--text-secondary); cursor: pointer; flex-shrink: 0;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.chat-header-icon-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
.chat-header-icon-btn.active { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
.project-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.project-header-action-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 12px; border: 1px solid var(--border); border-radius: 6px;
  background: #fff; font-size: 12px; color: var(--text-secondary); cursor: pointer;
  flex-shrink: 0; transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.project-header-action-btn:hover {
  border-color: #c6d8ff; color: var(--primary); background: var(--primary-light);
}
.project-header-action-btn.active {
  border-color: var(--primary); color: var(--primary); background: var(--primary-light);
  font-weight: 600; box-shadow: 0 2px 6px rgba(64, 128, 255, 0.1);
}
.project-header-action-btn svg { flex-shrink: 0; }
.chat-messages { flex: 1; overflow-y: auto; padding: 20px; background: #f9fafb; }
.msg-row { display: flex; gap: 10px; margin-bottom: 16px; }
.msg-row.user { flex-direction: row-reverse; }
.msg-bubble { max-width: 70%; padding: 10px 14px; border-radius: 10px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
.msg-row.user .msg-bubble { background: var(--primary); color: #fff; }
.msg-row.expert .msg-bubble { background: #fff; border: 1px solid var(--border); }
.msg-row.system { justify-content: center; }
.msg-row.system .msg-bubble { background: transparent; border: none; color: var(--text-muted); font-size: 12px; }
.chat-input { padding: 16px 20px; border-top: 1px solid var(--border); }

.artifact-item {
  background: #fff; border: 1px solid var(--border); border-radius: 8px;
  padding: 12px; margin-bottom: 10px;
}
.artifact-item-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.artifact-title { font-size: 13px; font-weight: 600; line-height: 1.4; flex: 1; }
.artifact-content {
  font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin: 0;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden;
  white-space: pre-wrap;
}
.artifact-time { font-size: 11px; color: #c0c4cc; margin-top: 8px; }

.detail-layout { display: flex; gap: 20px; align-items: flex-start; }
.detail-aside { width: 240px; background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 20px; text-align: center; }
.detail-aside img { width: 72px; height: 72px; border-radius: 50%; margin-bottom: 12px; }
.detail-main { flex: 1; min-width: 0; background: #fff; border: 1px solid var(--border); border-radius: 8px; }

/* Expert detail page */
.expert-detail-page { max-width: 1200px; }

.expert-hero {
  position: relative; overflow: hidden;
  background: #fff; border: 1px solid var(--border); border-radius: 12px;
  margin-bottom: 16px; box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04);
}
.expert-hero-bg { display: none; }
.expert-hero-back {
  position: absolute; top: 8px; left: 10px; z-index: 3;
}
.expert-hero-back .back-link {
  width: 24px; height: 24px; margin-bottom: 0; border-radius: 6px;
  border: none; background: transparent; box-shadow: none;
  color: var(--text-muted); opacity: 0.45;
}
.expert-hero-back .back-link:hover {
  opacity: 1; color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.65); border: none;
  box-shadow: none;
}
.expert-hero-profile {
  position: relative; z-index: 2;
  display: flex; gap: 14px; align-items: flex-start;
  padding: 10px 20px 12px 38px;
}
.expert-hero-avatar-wrap { position: relative; flex-shrink: 0; }
.expert-hero-avatar {
  width: 56px; height: 56px; border-radius: 50%; object-fit: cover;
  border: 2px solid #fff; box-shadow: 0 3px 10px rgba(64, 128, 255, 0.14);
}
.expert-hero-status {
  position: absolute; right: 1px; bottom: 1px;
  width: 10px; height: 10px; border-radius: 50%;
  background: #67c23a; border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(103, 194, 58, 0.25);
}
.expert-hero-info { flex: 1; min-width: 0; }
.expert-hero-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 4px;
}
.expert-hero-name-row {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 0; flex: 1;
}
.expert-hero-name {
  font-size: 17px; font-weight: 700; color: #1a1a1a; margin: 0; line-height: 1.3;
}
.expert-hero-desc {
  font-size: 13px; color: var(--text-secondary); line-height: 1.5;
  margin: 0;
}
.expert-hero-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.expert-hero-tags .expertise-tag { font-size: 10px; padding: 2px 7px; border-radius: 5px; }
.expert-hero-stats-bar {
  padding: 4px 20px 10px;
}
.expert-hero-stats-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
  border-top: 1px solid #f0f2f5;
  padding-top: 8px;
}
.expert-stat-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  padding: 6px 8px; border: none; border-radius: 0;
  background: transparent; cursor: pointer; font-family: inherit;
  transition: background 0.15s, color 0.15s;
  box-shadow: none;
  border-right: 1px solid #f0f2f5;
}
.expert-stat-card:last-child { border-right: none; }
.expert-stat-card:hover {
  background: #f8fafc;
  box-shadow: none; transform: none;
}
.expert-stat-card.active {
  background: var(--primary-light);
  box-shadow: none;
}
.expert-stat-card-value { font-size: 17px; font-weight: 700; color: var(--primary); line-height: 1.1; }
.expert-stat-card-label { font-size: 11px; color: var(--text-muted); font-weight: 500; }

.expert-assign-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 14px 0 9px; border: none; border-radius: 8px;
  font-size: 12px; font-weight: 600; font-family: inherit; color: #fff; cursor: pointer;
  background: linear-gradient(135deg, #4080ff 0%, #5b93ff 100%);
  box-shadow: 0 2px 8px rgba(64, 128, 255, 0.2);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  flex-shrink: 0;
}
.expert-assign-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 128, 255, 0.28);
}
.expert-assign-btn:active { transform: translateY(0); }
.expert-assign-btn-icon {
  width: 20px; height: 20px; border-radius: 5px;
  background: rgba(255, 255, 255, 0.2);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.expert-detail-tabs.detail-main {
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
  border: 1px solid var(--border);
}
.expert-detail-tabs .el-tabs__header {
  margin: 0; padding: 0 16px; background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
  border-bottom: 1px solid var(--border);
}
.expert-detail-tabs .el-tabs__nav-wrap::after { display: none; }
.expert-detail-tabs .el-tabs__item {
  height: 50px; line-height: 50px; font-size: 13px; font-weight: 500;
  padding: 0 18px; transition: color 0.15s;
}
.expert-detail-tabs .el-tabs__item.is-active { font-weight: 600; }
.expert-detail-tabs .el-tabs__active-bar { height: 3px; border-radius: 2px 2px 0 0; }

.detail-tab-pane { padding: 24px 28px 28px; }
.detail-section-head { margin-bottom: 20px; }
.detail-section-title {
  font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px;
}
.detail-section-desc { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5; }
.detail-tab-footer {
  margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f2f5;
  display: flex; justify-content: flex-end;
}
.detail-form-hint { font-size: 12px; color: var(--text-muted); margin: 12px 0 0; line-height: 1.5; }
.detail-filter-bar { margin-bottom: 16px; }
.detail-action-bar {
  display: flex; gap: 10px; margin-bottom: 16px;
  padding: 14px 16px; background: #f8fafc; border: 1px solid #eef1f5; border-radius: 10px;
}
.detail-action-input { flex: 1; }
.detail-table-wrap {
  border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
  background: #fff;
}
.detail-table-wrap .el-table { --el-table-border-color: #f0f2f5; }
.detail-config-panel {
  padding: 20px; background: #fafbfc; border: 1px solid #eef1f5; border-radius: 12px;
}
.detail-tag-list {
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; padding-top: 16px;
  border-top: 1px dashed #e4e7ed;
}

.persona-editor { display: flex; flex-direction: column; gap: 14px; }
.persona-editor-card {
  border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
  background: #fff; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.persona-editor-head {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 16px; background: #fafbfc; border-bottom: 1px solid #f0f2f5;
  font-size: 13px; font-weight: 600; color: var(--text-primary);
}
.persona-editor-dot {
  width: 8px; height: 8px; border-radius: 50%; background: var(--primary); flex-shrink: 0;
}
.persona-editor-card .el-textarea__inner {
  border: none; box-shadow: none; border-radius: 0; padding: 14px 16px;
  font-family: ui-monospace, "Cascadia Code", monospace; font-size: 13px; line-height: 1.6;
}
.persona-editor-card .el-textarea__inner:focus { box-shadow: none; }

.im-channel-card {
  margin-bottom: 12px; padding: 16px;
  border: 1px solid var(--border); border-radius: 12px; background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.im-channel-card:hover { border-color: #c6d8ff; box-shadow: 0 2px 8px rgba(64, 128, 255, 0.06); }
.im-channel-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 10px;
}
.im-channel-head strong { font-size: 14px; }

@media (max-width: 768px) {
  .expert-hero-profile { flex-direction: column; align-items: center; text-align: center; padding: 10px 14px 12px; gap: 10px; }
  .expert-hero-back { top: 6px; left: 8px; }
  .expert-hero-head { flex-direction: column; align-items: center; width: 100%; }
  .expert-hero-name-row { justify-content: center; width: 100%; }
  .expert-hero-tags { justify-content: center; }
  .expert-assign-btn { width: 100%; justify-content: center; }
  .expert-hero-stats-bar { padding: 8px 14px 10px; }
  .expert-hero-stats-grid { grid-template-columns: repeat(2, 1fr); width: 100%; }
  .detail-tab-pane { padding: 16px; }
  .detail-action-bar { flex-direction: column; }
}

.progress-card { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; }
.progress-card img { width: 36px; height: 36px; border-radius: 50%; }
.progress-info { flex: 1; }
.progress-name { font-size: 13px; font-weight: 600; }
.progress-summary { font-size: 11px; color: var(--text-muted); }

.form-section { margin-bottom: 24px; }
.form-section-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }

/* Form dialogs (create expert / project, edit expert) */
.form-dialog {
  border-radius: 14px; overflow: hidden;
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.14) !important;
}
.form-dialog .el-dialog__header {
  margin: 0; padding: 0; border-bottom: none;
}
.form-dialog .el-dialog__body {
  padding: 0 24px 8px; max-height: calc(85vh - 140px); overflow-y: auto;
}
.form-dialog .el-dialog__footer {
  padding: 16px 24px 20px; border-top: 1px solid var(--border);
  background: #fafbfc;
}
.form-dialog .el-dialog__headerbtn { top: 18px; right: 18px; z-index: 3; }

.dialog-header-custom {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px 18px;
  background: linear-gradient(135deg, rgba(64,128,255,0.08) 0%, rgba(105,177,255,0.04) 100%);
  border-bottom: 1px solid var(--border);
}
.dialog-header-project {
  background: linear-gradient(135deg, rgba(103,194,58,0.1) 0%, rgba(133,206,97,0.04) 100%);
}
.dialog-header-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
  background: #fff; box-shadow: 0 2px 8px rgba(64, 128, 255, 0.12);
}
.dialog-header-icon-create { background: linear-gradient(135deg, #ecf3ff, #fff); }
.dialog-header-icon-project {
  background: linear-gradient(135deg, #f0f9eb, #fff);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.15);
}
.dialog-header-icon-edit { background: linear-gradient(135deg, #fdf6ec, #fff); font-size: 20px; }
.dialog-header-title { font-size: 17px; font-weight: 700; color: #1a1a1a; line-height: 1.3; }
.dialog-header-sub { font-size: 12px; color: var(--text-muted); margin-top: 3px; }

.form-dialog-body { padding-top: 4px; }
.form-dialog-section {
  margin-bottom: 16px; border: 1px solid var(--border); border-radius: 10px;
  overflow: hidden; background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.form-dialog-section:last-child { margin-bottom: 0; }
.form-dialog-section-head {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; background: #fafbfc; border-bottom: 1px solid #f0f2f5;
}
.form-dialog-section-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--primary); color: #fff;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.form-dialog-section-num-green { background: linear-gradient(135deg, #67c23a, #85ce61); }
.form-dialog-section-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.form-dialog-section-tag {
  margin-left: auto; font-size: 10px; padding: 2px 8px;
  background: #f0f2f5; color: var(--text-muted); border-radius: 10px;
}
.form-dialog-section-body { padding: 16px 16px 4px; }
.form-dialog-basic-row {
  display: flex; gap: 20px; align-items: flex-start;
}
.avatar-preview-wrap {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 12px; background: #f8fafc; border-radius: 10px; border: 1px dashed #dce3ed;
}
.avatar-preview-img {
  width: 72px; height: 72px; border-radius: 50%; object-fit: cover;
  border: 3px solid #fff; box-shadow: 0 2px 10px rgba(64, 128, 255, 0.15);
}
.avatar-preview-tip { font-size: 11px; color: var(--text-muted); }
.form-dialog-form { flex: 1; min-width: 0; }
.form-dialog-form .el-form-item { margin-bottom: 16px; }
.form-dialog-form .el-form-item:last-child { margin-bottom: 8px; }
.select-option-desc { color: #999; margin-left: 8px; font-size: 12px; }
.form-dialog-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 8px; line-height: 1.5; }
.dialog-footer-custom { display: flex; justify-content: flex-end; gap: 10px; }

.member-option {
  display: flex; align-items: center; gap: 8px; min-width: 0;
}
.member-option-avatar {
  width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
}
.member-option-category {
  margin-left: auto; font-size: 11px; color: var(--text-muted); padding-left: 8px;
}
.selected-members-preview {
  display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 8px;
}
.selected-member-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px 4px 4px; border-radius: 20px;
  background: #f0f9eb; border: 1px solid #d9f0c8;
  font-size: 12px; color: #529b2e;
}
.selected-member-chip img {
  width: 22px; height: 22px; border-radius: 50%; object-fit: cover;
}

.form-dialog-sm .el-dialog__body { padding: 8px 24px 4px; max-height: none; }

@media (max-width: 720px) {
  .form-dialog-basic-row { flex-direction: column; }
  .avatar-preview-wrap { flex-direction: row; width: 100%; justify-content: flex-start; }
}

.back-link {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; margin-bottom: 16px;
  border: 1px solid var(--border); border-radius: 8px;
  background: #fff; color: var(--text-secondary); text-decoration: none;
  cursor: pointer; flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s, background 0.15s, box-shadow 0.15s;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  user-select: none;
}
.back-link:hover {
  color: var(--primary); border-color: #c6d8ff; background: var(--primary-light);
  box-shadow: 0 2px 6px rgba(64, 128, 255, 0.1);
}
.back-link-inline { margin-bottom: 0; }
.el-empty .back-link { margin-bottom: 0; margin-top: 8px; }
.markdown-preview { background: #f9fafb; border: 1px solid var(--border); border-radius: 6px; padding: 12px; white-space: pre-wrap; font-size: 13px; min-height: 60px; }

.project-detail-layout { display: flex; flex-direction: column; height: 100vh; background: #fff; }
.project-detail-header { flex-shrink: 0; }
.project-detail-body {
  flex: 1; display: flex; flex-direction: row; gap: 0; min-width: 0; min-height: 0; overflow: hidden;
}
.project-panel-head {
  font-size: 13px; font-weight: 600; color: var(--text-primary);
  padding: 12px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
  background: #fafbfc;
}
.project-panel-sub { font-weight: 400; color: var(--text-muted); font-size: 12px; }

/* Left: task kanban */
.project-kanban-panel {
  width: 280px; min-width: 240px; flex-shrink: 0;
  display: flex; flex-direction: column; min-height: 0;
  border-right: 1px solid var(--border);
  background: linear-gradient(180deg, #f8fafc 0%, #fafbfc 100%);
}
.project-kanban-scroll { flex: 1; overflow-y: auto; padding: 8px 10px; min-height: 0; }
.project-kanban-scroll-todo { padding: 6px 10px 12px; flex: 1; }
.project-task-flow-empty { font-size: 12px; color: var(--text-muted); padding: 16px 8px; text-align: center; }

.task-todo-summary {
  padding: 10px 12px 12px; border-bottom: 1px solid #eef1f5; flex-shrink: 0;
  background: #fff;
}
.task-todo-summary-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px; font-size: 11px;
}
.task-todo-summary-label { color: var(--text-secondary); font-weight: 500; }
.task-todo-summary-count { color: var(--primary); font-weight: 600; }
.task-todo-progress-track {
  height: 4px; border-radius: 2px; background: #e8ecf0; overflow: hidden;
}
.task-todo-progress-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, #4080ff, #69b1ff);
  transition: width 0.3s ease;
}

.task-todo-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.task-todo-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 10px 10px 8px; border-radius: 8px;
  background: #fff; border: 1px solid #ebeef2;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  border-left: 3px solid #dcdfe6;
}
.task-todo-item.status-thinking,
.task-todo-item.status-running { border-left-color: #4080ff; }
.task-todo-item.status-tool { border-left-color: #e6a23c; }
.task-todo-item.status-waiting { border-left-color: #909399; }
.task-todo-item.status-done,
.task-todo-item.is-done { border-left-color: #67c23a; opacity: 0.92; }
.task-todo-item.status-error { border-left-color: #f56c6c; }
.task-todo-item.status-queued { border-left-color: #c0c4cc; }

.task-todo-check {
  width: 18px; height: 18px; margin-top: 1px; flex-shrink: 0;
  border: 1.5px solid #d0d5dd; border-radius: 5px; background: #fafbfc;
  display: flex; align-items: center; justify-content: center; color: #fff;
  transition: background 0.2s, border-color 0.2s;
}
.task-todo-check.checked {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  border-color: #67c23a;
  box-shadow: 0 1px 3px rgba(103, 194, 58, 0.35);
}
.task-todo-body { flex: 1; min-width: 0; }
.task-todo-title-row {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;
}
.task-todo-title {
  font-size: 12px; font-weight: 500; line-height: 1.5; color: var(--text-primary);
  word-break: break-word; flex: 1; min-width: 0;
}
.task-todo-item.is-done .task-todo-title {
  color: var(--text-muted); text-decoration: line-through; font-weight: 400;
}
.task-todo-badge {
  font-size: 10px; line-height: 1.3; padding: 2px 7px; border-radius: 10px;
  flex-shrink: 0; white-space: nowrap; font-weight: 500;
}
.task-todo-item.status-queued .task-todo-badge { background: #f4f4f5; color: #909399; }
.task-todo-item.status-thinking .task-todo-badge,
.task-todo-item.status-running .task-todo-badge { background: #ecf3ff; color: #4080ff; }
.task-todo-item.status-tool .task-todo-badge { background: #fdf6ec; color: #e6a23c; }
.task-todo-item.status-waiting .task-todo-badge { background: #f4f4f5; color: #606266; }
.task-todo-item.status-done .task-todo-badge,
.task-todo-item.is-done .task-todo-badge { background: #f0f9eb; color: #67c23a; }
.task-todo-item.status-error .task-todo-badge { background: #fef0f0; color: #f56c6c; }

.task-todo-expert-row {
  display: flex; align-items: center; gap: 6px;
  margin-top: 8px; font-size: 11px; color: var(--text-secondary);
}
.task-todo-expert-row.is-unassigned { color: #c0c4cc; font-style: italic; margin-top: 8px; font-size: 11px; }
.task-todo-avatar {
  width: 18px; height: 18px; border-radius: 50%; object-fit: cover;
  border: 1px solid #eef1f5; flex-shrink: 0;
}

/* Middle: log area */
.project-log-panel {
  flex: 1; min-width: 0; display: flex; flex-direction: column; min-height: 0;
}
.project-log-area {
  flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden;
}
.project-log-scroll { flex: 1; min-height: 0; }
.project-log-empty { text-align: center; color: var(--text-muted); font-size: 13px; padding: 40px 20px; }
.project-log-input { flex-shrink: 0; }

.chat-target-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--border);
}
.chat-target-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 12px 0 6px; border: 1px solid var(--border); border-radius: 20px;
  background: #fff; font-size: 12px; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s; max-width: 140px; box-sizing: border-box;
}
.chat-target-btn:hover { border-color: #c6d8ff; color: var(--primary); background: #f5f9ff; }
.chat-target-btn.active {
  border-color: var(--primary); background: var(--primary-light);
  color: var(--primary); font-weight: 600;
}
.chat-target-group-icon {
  width: 22px; height: 22px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; line-height: 1; border-radius: 50%; background: #f0f2f5;
}
.chat-target-avatar {
  width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
}
.chat-target-btn > span:last-child {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.log-thought-block {
  margin-bottom: 12px; border: 1px dashed #dcdfe6; border-radius: 8px;
  background: #f9fafb; font-size: 12px;
}
.log-thought-block summary {
  padding: 8px 12px; cursor: pointer; color: var(--text-muted); font-weight: 500;
  list-style: none; user-select: none;
}
.log-thought-block summary::-webkit-details-marker { display: none; }
.log-thought-block summary::before { content: '▸ '; }
.log-thought-block[open] summary::before { content: '▾ '; }
.log-thought-content {
  padding: 0 12px 10px; color: var(--text-secondary); line-height: 1.6;
  white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 11px;
}

.log-action-card {
  display: flex; gap: 12px; padding: 14px 16px; margin-bottom: 12px;
  background: linear-gradient(135deg, #fff7e6 0%, #fff 100%);
  border: 1px solid #f5dab1; border-radius: 10px;
}
.log-action-icon { font-size: 20px; flex-shrink: 0; line-height: 1; }
.log-action-title { font-size: 13px; font-weight: 600; color: #b88230; }
.log-action-tool {
  display: inline-block; margin-top: 4px; padding: 2px 8px;
  background: #fdf6ec; border: 1px solid #f5dab1; border-radius: 4px;
  font-size: 12px; font-weight: 600; color: #e6a23c;
}
.log-action-desc { font-size: 12px; color: var(--text-secondary); margin-top: 6px; line-height: 1.5; }

/* Right: workspace panel */
.project-workspace-panel {
  width: 280px; min-width: 240px; flex-shrink: 0;
  display: flex; flex-direction: column; min-height: 0;
  border-left: 1px solid var(--border);
  background: linear-gradient(180deg, #f8fafc 0%, #fafbfc 100%);
}
.project-workspace-area {
  flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden;
}
.project-workspace-tabs { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }
.project-workspace-tabs .el-tabs__header {
  margin: 0; padding: 0 10px; background: #fff;
  border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.project-workspace-tabs .el-tabs__nav-wrap::after { display: none; }
.project-workspace-tabs .el-tabs__item {
  height: 36px; line-height: 36px; font-size: 12px; font-weight: 500; padding: 0 12px;
}
.project-workspace-tabs .el-tabs__item.is-active { font-weight: 600; }
.project-workspace-tabs .el-tabs__active-bar { height: 2px; border-radius: 2px 2px 0 0; }
.project-workspace-tabs .el-tabs__content { flex: 1; min-height: 0; overflow: hidden; }
.project-workspace-tabs .el-tab-pane { height: 100%; }
.project-workspace-scroll { flex: 1; overflow-y: auto; padding: 6px 10px 12px; min-height: 0; }
.sidebar-add-row { display: flex; gap: 8px; margin-bottom: 8px; }
.sidebar-member-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 10px 10px 8px; border-radius: 8px;
  background: #fff; border: 1px solid #ebeef2;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  margin-bottom: 8px;
}
.sidebar-member-card img {
  width: 28px; height: 28px; border-radius: 50%; object-fit: cover;
  border: 1px solid #eef1f5; flex-shrink: 0;
}
.sidebar-member-info { flex: 1; min-width: 0; }
.sidebar-member-name { font-size: 12px; font-weight: 500; color: var(--text-primary); }
.sidebar-member-meta {
  font-size: 11px; color: var(--text-secondary); margin-top: 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sidebar-output-form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }

.workspace-file-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 10px 10px 8px; border-radius: 8px;
  background: #fff; border: 1px solid #ebeef2;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  margin-bottom: 8px; cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.workspace-file-item:hover {
  border-color: #c6d8ff; background: #f5f9ff;
  box-shadow: 0 2px 6px rgba(64, 128, 255, 0.08);
}
.workspace-file-icon { font-size: 16px; flex-shrink: 0; line-height: 1; }
.workspace-file-info { flex: 1; min-width: 0; }
.workspace-file-name {
  font-size: 12px; font-weight: 500; line-height: 1.5; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.workspace-file-meta { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
.workspace-file-badge {
  flex-shrink: 0; font-size: 10px; color: #e6a23c; white-space: nowrap;
  padding: 2px 7px; border-radius: 10px; background: #fdf6ec; font-weight: 500;
}

/* Expert preview dialog */
.expert-preview-dialog {
  border-radius: 16px !important; overflow: hidden;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18) !important;
}
.expert-preview-dialog .el-dialog__header {
  margin: 0; padding: 12px 12px 0; border: none;
}
.expert-preview-dialog .el-dialog__body { padding: 0 24px 24px; }
.expert-preview-dialog .el-dialog__headerbtn { top: 14px; right: 14px; width: 32px; height: 32px; }

.expert-preview-header {
  display: flex; gap: 18px; align-items: flex-start;
  padding-bottom: 18px; border-bottom: 1px dashed #e8ecf0;
}
.expert-preview-avatar-wrap { flex-shrink: 0; padding-top: 4px; }
.expert-preview-polaroid {
  width: 88px; padding: 8px 8px 20px; background: #fff;
  border: 1px solid #eee; border-radius: 4px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12);
  transform: rotate(-4deg);
}
.expert-preview-polaroid img {
  width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 2px; display: block;
}
.expert-preview-profile { flex: 1; min-width: 0; padding-top: 6px; }
.expert-preview-name {
  font-size: 22px; font-weight: 700; color: #1a1a1a; margin: 0 0 10px; line-height: 1.25;
}
.expert-preview-role {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; margin-bottom: 10px;
  background: #f5f7fa; border: 1px solid #eef1f5; border-radius: 8px;
  font-size: 12px; color: var(--text-secondary); font-weight: 500;
}
.expert-preview-meta {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
  font-size: 12px; color: var(--text-muted);
}
.expert-preview-online {
  display: inline-flex; align-items: center; gap: 6px; color: #52c41a; font-weight: 500;
}
.expert-preview-online i {
  width: 7px; height: 7px; border-radius: 50%; background: #52c41a;
  box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.2);
}
.expert-preview-dot { color: #dcdfe6; }

.expert-preview-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
  margin: 16px 0; padding: 14px 0;
  background: #f8fafc; border-radius: 12px; border: 1px solid #eef1f5;
}
.expert-preview-stat {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 4px 8px; position: relative;
}
.expert-preview-stat + .expert-preview-stat::before {
  content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 1px; height: 28px; background: #e4e7ed;
}
.expert-preview-stat-value {
  font-size: 20px; font-weight: 700; color: #1a1a1a; line-height: 1.1;
}
.expert-preview-stat-label { font-size: 11px; color: var(--text-muted); }

.expert-preview-section { margin-bottom: 18px; }
.expert-preview-section-title {
  font-size: 12px; color: var(--text-muted); margin-bottom: 10px; font-weight: 500;
}
.expert-preview-desc {
  font-size: 13px; color: var(--text-secondary); line-height: 1.7; margin: 0;
}
.expert-preview-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.expert-preview-tag {
  font-size: 12px; padding: 5px 12px; border-radius: 20px;
  border: 1px solid #e8edf4; background: #fff;
}

.expert-preview-detail-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; height: 44px; margin-top: 4px;
  border: none; border-radius: 12px; cursor: pointer;
  background: #1a1a1a; color: #fff;
  font-size: 14px; font-weight: 600; font-family: inherit;
  transition: background 0.15s, transform 0.15s;
}
.expert-preview-detail-btn:hover { background: #303133; transform: translateY(-1px); }
.expert-preview-detail-btn:active { transform: translateY(0); }

@media (max-width: 480px) {
  .expert-preview-header { flex-direction: column; align-items: center; text-align: center; }
  .expert-preview-profile { padding-top: 0; }
  .expert-preview-meta { justify-content: center; }
  .expert-preview-stats { grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 12px; }
  .expert-preview-stat + .expert-preview-stat::before { display: none; }
}
