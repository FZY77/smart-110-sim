<template>
  <div class="report">
    <h2>报警人端</h2>
    <AudioReport v-if="!caseId" @submitted="onSubmitted" />
    <div v-else class="progress">
      <el-result icon="success" title="报警已提交" :sub-title="'案件编号：' + caseId">
        <template #extra>
          <el-button type="primary" @click="goTrack">查看处置进度</el-button>
          <el-button @click="goHome">返回首页</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AudioReport from '../components/AudioReport.vue'

const router = useRouter()
const caseId = ref('')

function onSubmitted(c) {
  caseId.value = c.id
}
function goTrack() { router.push('/track?id=' + caseId.value) }
function goHome() { router.push('/') }
</script>

<style scoped>
.report { max-width: 640px; margin: 0 auto; padding: 24px; }
.progress { margin-top: 40px; text-align: center; }
</style>
