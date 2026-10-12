<template>
  <div class="demo-app" :class="{ embedded }">
    <aside class="platform-sidebar" aria-label="主导航">
      <nav class="sidebar-nav">
        <router-link class="nav-item active" to="/">
          <i class="el-icon-user-solid" aria-hidden="true" />
          <span>专家</span>
        </router-link>
      </nav>
      <div class="sidebar-demo-controls">
        <span class="demo-badge">演示数据</span>
        <button type="button" @click="reset">重置演示数据</button>
      </div>
    </aside>
    <div class="main-area">
      <main><router-view /></main>
    </div>
  </div>
</template>

<script>
import { resetDemo } from "./demo/state";
export default {
  name: "App",
  computed: {
    embedded() {
      return ["1", "true"].includes(
        String(this.$route.query.embed || "").toLowerCase(),
      );
    },
  },
  methods: {
    reset() {
      this.$confirm("将所有演示修改恢复为初始数据？", "重置演示数据", {
        type: "warning",
      })
        .then(async () => {
          await resetDemo();
          this.$router.push("/").catch(() => {});
          this.$message.success("演示数据已重置");
        })
        .catch(() => {});
    },
  },
};
</script>
