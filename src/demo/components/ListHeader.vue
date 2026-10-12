<template>
  <div class="expert-list-tabs">
    <div
      class="expert-list-tab-list"
      role="tablist"
      aria-label="智能体中心内容"
    >
      <button
        type="button"
        role="tab"
        class="expert-list-tab"
        :class="{ 'is-active': active === 'mine' }"
        :aria-selected="active === 'mine'"
        @click="navigate('mine')"
      >
        <svg
          class="expert-list-tab-icon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19.2c.8-3.2 3.3-5.2 6.5-5.2s5.7 2 6.5 5.2" />
        </svg>
        我的专家
      </button>
      <button
        type="button"
        role="tab"
        class="expert-list-tab"
        :class="{ 'is-active': active === 'project' }"
        :aria-selected="active === 'project'"
        @click="navigate('project')"
      >
        <svg
          class="expert-list-tab-icon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M3 7.5h7l2 2h9v9.5a2 2 0 0 1 2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2"
          />
        </svg>
        项目
      </button>
      <button
        type="button"
        role="tab"
        class="expert-list-tab"
        :class="{ 'is-active': active === 'template' }"
        :aria-selected="active === 'template'"
        @click="navigate('template')"
      >
        <svg
          class="expert-list-tab-icon"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.2" />
          <rect x="14" y="3" width="7" height="7" rx="1.2" />
          <rect x="3" y="14" width="7" height="7" rx="1.2" />
          <rect x="14" y="14" width="7" height="7" rx="1.2" />
        </svg>
        专家模板
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "ListHeader",
  props: { active: { type: String, required: true } },
  methods: {
    navigate(target) {
      if (target === "project")
        this.$router
          .push({ name: "projects", query: { embed: this.$route.query.embed } })
          .catch(() => {});
      else
        this.$router
          .push({
            name: "experts",
            query: { tab: target, embed: this.$route.query.embed },
          })
          .catch(() => {});
    },
  },
};
</script>
