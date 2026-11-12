<template>
  <div class="track">
    <div class="header">
      <h2>警情通报</h2>
      <el-input v-model="caseIdInput" placeholder="输入案件编号查询" style="width:260px;margin-right:10px" @keyup.enter="search" />
      <el-button type="primary" @click="search">查询</el-button>
    </div>

    <div v-if="case" class="content">
      <div class="case-bar">
        <div>
          <div class="lbl">案件编号</div>
          <div class="no">{{ case.id }}</div>
        </div>
        <div class="right">
          <el-tag :type="statusType">{{ statusLabel }}</el-tag>
          <div v-if="case.triage" class="cat">{{ case.triage.category }} · {{ case.triage.severity }}</div>
        </div>
      </div>

      <el-card class="block">
        <template #header>警员位置与预计到达</template>
        <div class="mapbox">
          <div class="road-h"></div>
          <div class="road-v"></div>
          <div class="cop" :style="{left: copPos.x + '%', top: copPos.y + '%'}"></div>
          <div class="dest"></div>
          <div class="eta">巡逻车组 · <b>{{ eta }}</b></div>
        </div>
      </el-card>

      <el-card class="block">
        <template #header>处置进度</template>
        <el-timeline>
          <el-timeline-item v-for="(it, i) in case.timeline" :key="i" :timestamp="it.time" placement="top">
            <b>{{ it.event }}</b>
            <div class="detail">{{ it.detail }}</div>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <el-card v-if="case.triage" class="block">
        <template #header>AI 安全指引（给您）</template>
        <ul class="advice">
          <li v-for="(a, i) in case.triage.adviceToReporter" :key="i">{{ a }}</li>
        </ul>
      </el-card>

      <el-alert v-if="case.status === 'closed'" type="success" :closable="false" style="margin-top:16px"
        :title="'本起警情已办结：' + (case.archive?.summary || '')" />
    </div>

    <div v-else class="empty">
      <el-empty description="请输入案件编号查询警情进度" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute(), router = useRouter()
const caseIdInput = ref(route.query.id || '')
const case = ref(null)
let timer = null

const STATUS = {
  pending: '已受理', dispatched: '已派警', enroute: '出警途中',
  onscene: '已到达现场', handling: '现场处置中', closed: '已结案'
}
const statusLabel = computed(() => STATUS[case.value?.status] || '—')
const statusType = computed(() => {
  const s = case.value?.status
  if (s === 'closed') return 'info'
  if (s === 'pending') return 'warning'
  return 'success'
})
const copPos = computed(() => {
  const m = { pending: [20, 70], dispatched: [35, 60], enroute: [55, 48], onscene: [78, 65], handling: [78, 65], closed: [78, 65] }
  const [x, y] = m[case.value?.status] || [20, 70]
  return { x, y }
})
const eta = computed(() => {
  const s = case.value?.status
  if (s === 'pending') return '--'
  if (s === 'dispatched') return '约 8 分钟'
  if (s === 'enroute') return '约 4 分钟'
  if (s === 'onscene' || s === 'handling') return '警员已在现场'
  return '已结束'
})

async function search() {
  if (!caseIdInput.value) return
  router.replace({ query: { id: caseIdInput.value } })
  await load()
}
async function load() {
  if (!caseIdInput.value) return
  try {
    const { data } = await axios.get('/api/case/' + caseIdInput.value)
    case.value = data
  } catch (e) {
    case.value = null
  }
}

onMounted(() => {
  if (caseIdInput.value) load()
  timer = setInterval(load, 3000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.track { max-width: 800px; margin: 0 auto; padding: 20px; }
.header { display: flex; align-items: center; margin-bottom: 20px; }
.header h2 { margin: 0 20px 0 0; }
.case-bar { background: linear-gradient(135deg, #0d2b52, #1d5aa8); color: #fff; padding: 16px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.case-bar .lbl { font-size: 12px; opacity: .8; }
.case-bar .no { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
.case-bar .right { text-align: right; }
.case-bar .cat { font-size: 13px; margin-top: 6px; opacity: .9; }
.block { margin-bottom: 16px; }
.mapbox { height: 220px; background: #e8eef7; position: relative; border-radius: 6px; overflow: hidden; }
.road-h { position: absolute; left: 0; right: 0; top: 30%; height: 14px; background: #fff; border: 1px solid #d5dfe9; }
.road-v { position: absolute; top: 0; bottom: 0; left: 40%; width: 14px; background: #fff; border: 1px solid #d5dfe9; }
.cop { position: absolute; width: 14px; height: 14px; background: #1d5aa8; border: 2px solid #fff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 0 0 4px rgba(29,90,168,.25); transition: all 1.5s; }
.dest { position: absolute; left: 78%; top: 65%; width: 16px; height: 16px; background: #c0392b; border: 2px solid #fff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); }
.eta { position: absolute; left: 8px; bottom: 8px; background: #fff; padding: 6px 10px; border-radius: 4px; font-size: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
.detail { font-size: 13px; color: #666; margin-top: 2px; }
.advice { padding-left: 20px; line-height: 2; }
.empty { padding: 60px 0; }
</style>
