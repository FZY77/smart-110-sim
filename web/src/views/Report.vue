<template>
  <div class="report">
    <h2>报警人端</h2>
    <AudioReport v-if="!caseId" @submitted="onSubmitted" />
    <div v-else class="progress">
      <h3>报警编号：{{ caseId }}</h3>
      <el-steps :active="step" finish-status="success">
        <el-step title="已受理" />
        <el-step title="已派警" />
        <el-step title="赶赴现场" />
        <el-step title="现场处置" />
        <el-step title="已结案" />
      </el-steps>
      <p v-if="caseData.officer" style="margin-top:20px">处置警员：{{ caseData.officer }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import AudioReport from '../components/AudioReport.vue'

const caseId = ref('')
const caseData = ref({})
const step = ref(0)
let timer = null

function onSubmitted(c) {
  caseId.value = c.id
  caseData.value = c
}

onMounted(() => {
  timer = setInterval(async () => {
    if (!caseId.value) return
    const { data } = await axios.get('/api/case/' + caseId.value)
    caseData.value = data
    step.value = { pending: 0, dispatched: 1, enroute: 2, onscene: 3, closed: 4 }[data.status] ?? 0
  }, 2000)
})

onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.report { max-width: 640px; margin: 0 auto; padding: 24px; }
.progress { margin-top: 40px; }
</style>
