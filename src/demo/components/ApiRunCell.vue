<template>
  <api-record-id v-if="field === 'id'" :value="run.id" label="run_id" />
  <el-tag
    v-else-if="field === 'status'"
    size="mini"
    effect="light"
    :type="status.type"
  >
    {{ status.label }}
  </el-tag>
  <time v-else-if="field === 'submittedAt'" :datetime="run.submittedAt">
    {{ time(run.submittedAt) }}
  </time>
  <span v-else-if="field === 'durationMs'">{{ duration(run.durationMs) }}</span>
  <el-button
    v-else-if="field === 'action'"
    type="text"
    :aria-label="`查看运行 ${run.id} 的详情`"
    @click="$emit('view', run)"
  >
    查看详情
  </el-button>
  <span v-else class="expert-api-ellipsis" :title="run[field]">{{
    run[field]
  }}</span>
</template>

<script>
import { API_RUN_STATUSES, apiDuration, apiTime } from "../external-api";
import ApiRecordId from "./ApiRecordId.vue";

export default {
  components: { ApiRecordId },
  props: {
    field: { type: String, required: true },
    run: { type: Object, required: true },
  },
  computed: {
    status() {
      return API_RUN_STATUSES[this.run.status];
    },
  },
  methods: { time: apiTime, duration: apiDuration },
};
</script>
