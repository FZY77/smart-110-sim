<template>
  <div class="officer">
    <div class="topbar">
      <h2 style="margin:0">指挥调度台</h2>
      <div class="stats">今日接警 <b>{{ todayCount }}</b> 起 · 处置中 <b>{{ busyCount }}</b> 起</div>
    </div>

    <div class="layout">
      <div class="queue">
        <el-card>
          <template #header>待 / 在处警队列</template>
          <div v-if="!cases.length" class="empty">暂无警情</div>
          <div v-for="c in cases" :key="c.id" class="q-item" :class="{sel: selected?.id === c.id}" @click="selected = c">
            <div class="q-row1">
              <span class="q-id">{{ c.id }}</span>
              <el-tag size="small" :type="c.status === 'closed' ? 'info' : statusColor(c)">{{ statusLabel(c.status) }}</el-tag>
            </div>
            <div class="q-row2">{{ c.reporter?.conflictType }} · {{ c.reporter?.location }}</div>
            <div class="q-row3">{{ c.reporter?.name }} · {{ c.reporter?.peopleCount }}人</div>
          </div>
        </el-card>
      </div>

      <div class="detail">
        <el-card v-if="selected">
          <template #header>警情详情 <span class="meta">{{ selected.id }} · {{ selected.createdAt?.slice(0,19) }}</span></template>

          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="报警人">{{ selected.reporter?.name }}（{{ selected.reporter?.phone?.slice(0,3) }}****{{ selected.reporter?.phone?.slice(-4) }}）</el-descriptions-item>
            <el-descriptions-item label="案发地点">{{ selected.reporter?.location }}</el-descriptions-item>
            <el-descriptions-item label="事件类型">{{ selected.reporter?.conflictType }}</el-descriptions-item>
            <el-descriptions-item label="情况描述">{{ selected.reporter?.desc }}</el-descriptions-item>
            <el-descriptions-item label="涉及人数">{{ selected.reporter?.peopleCount }}
              <el-tag v-if="selected.reporter?.weapon" size="small" type="danger" style="margin-left:6px">持械</el-tag>
              <el-tag v-if="selected.reporter?.hasInjury" size="small" type="danger" style="margin-left:6px">有伤情</el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="selected.triage" class="triage">
            <div class="ai-head">◆ AI 智能研判结果</div>
            <div class="tags">
              <el-tag>{{ selected.triage.category }}</el-tag>
              <el-tag :type="sevType(selected.triage.sevColor)">严重度：{{ selected.triage.severity }}</el-tag>
              <el-tag :type="sevType(selected.triage.urgColor)">紧急度：{{ selected.triage.urgency }}</el-tag>
            </div>
            <div v-if="selected.triage.flags?.length" class="flags">
              <el-tag v-for="f in selected.triage.flags" :key="f" type="danger" size="small" style="margin-right:6px">{{ f }}</el-tag>
            </div>
            <div class="lbl">建议处警单位：</div>
            <div>
              <el-tag v-for="u in selected.triage.units" :key="u" style="margin:2px">{{ u }}</el-tag>
            </div>
            <div class="lbl" style="margin-top:8px">联动支援：</div>
            <div>
              <el-tag v-for="l in selected.triage.links" :key="l.name" :type="l.cls === 'ambulance' ? 'danger' : l.cls === 'fire' ? 'warning' : ''" style="margin:2px">{{ l.name }}</el-tag>
              <span v-if="!selected.triage.links?.length" style="color:#999;font-size:13px">无联动</span>
            </div>
            <div class="lbl" style="margin-top:8px">处警要点：</div>
            <ul class="advice">
              <li v-for="(a, i) in selected.triage.adviceToOfficer" :key="i">{{ a }}</li>
            </ul>
          </div>

          <div class="actions">
            <el-button v-if="selected.status === 'pending'" type="primary" @click="doDispatch">AI 研判并派警</el-button>
            <template v-else-if="selected.status === 'dispatched'">
              <el-button type="primary" @click="doAdvance">出动出发</el-button>
              <el-button @click="doCancel">撤销警情</el-button>
            </template>
            <el-button v-else-if="selected.status === 'enroute'" type="primary" @click="doAdvance">到达现场</el-button>
            <el-button v-else-if="selected.status === 'onscene'" type="primary" @click="doAdvance">开始现场处置</el-button>
            <el-button v-else-if="selected.status === 'handling'" type="success" @click="openClose">结案并生成卷宗</el-button>
            <el-button v-else-if="selected.status === 'closed'" @click="goArchive">查看卷宗</el-button>
          </div>

          <el-divider>处置时间线</el-divider>
          <el-timeline>
            <el-timeline-item v-for="(it, i) in selected.timeline" :key="i" :timestamp="it.time" placement="top">
              <b>{{ it.event }}</b>
              <div class="detail">{{ it.detail }}</div>
            </el-timeline-item>
          </el-timeline>
        </el-card>

        <el-empty v-else description="从左侧选择一起警情" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const cases = ref([])
const selected = ref(null)

const STATUS = {
  pending: '已受理', dispatched: '已派警', enroute: '出警途中',
  onscene: '已到达现场', handling: '现场处置中', closed: '已结案'
}
function statusLabel(s) { return STATUS[s] || s }
function statusColor(c) {
  if (!c.triage) return 'warning'
  if (c.triage.urgColor === 'red') return 'danger'
  if (c.triage.urgColor === 'orange') return 'warning'
  return 'success'
}
function sevType(c) { return c === 'red' ? 'danger' : c === 'orange' ? 'warning' : 'success' }

const todayCount = computed(() => cases.value.filter(c => c.createdAt?.startsWith(new Date().toISOString().slice(0,10))).length)
const busyCount = computed(() => cases.value.filter(c => ['dispatched','enroute','onscene','handling'].includes(c.status)).length)

async function load() {
  const { data } = await axios.get('/api/case')
  cases.value = data
  if (!selected.value && data.length) selected.value = data[0]
  if (selected.value) {
    const fresh = data.find(c => c.id === selected.value.id)
    if (fresh) selected.value = fresh
  }
}

async function doDispatch() {
  await axios.patch(`/api/case/${selected.value.id}/dispatch`, { officer: '张警官' })
  ElMessage.success('AI 研判完成，已派警')
  load()
}
async function doAdvance() {
  await axios.patch(`/api/case/${selected.value.id}/advance`)
  load()
}
async function doCancel() {
  await ElMessageBox.confirm('确认撤销该警情？', '提示', { type: 'warning' })
  await axios.patch(`/api/case/${selected.value.id}/close`, { result: '报警人自行撤回警情，未造成实际后果。' })
  ElMessage.info('警情已撤销')
  load()
}
async function openClose() {
  const { value } = await ElMessageBox.prompt('请输入本次处置结果', '结案', {
    inputValue: selected.value.triage?.category?.includes('刑事') ? '嫌疑人已控制，带回派出所进一步审查。' :
                selected.value.triage?.category?.includes('交通') ? '现场已疏导，伤员送医，事故移交交警处理。' :
                '现场已调解，双方达成一致，矛盾化解。'
  })
  await axios.patch(`/api/case/${selected.value.id}/close`, { result: value })
  ElMessage.success('已结案，卷宗已生成')
  load()
}
function goArchive() { router.push('/archive') }

onMounted(load)
</script>

<style scoped>
.officer { padding: 16px; }
.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.stats { font-size: 13px; color: #666; }
.stats b { color: #1d5aa8; }
.layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; }
.q-item { padding: 10px 12px; border: 1px solid #e4e7ed; border-radius: 6px; margin-bottom: 8px; cursor: pointer; }
.q-item:hover { border-color: #1d5aa8; }
.q-item.sel { border-color: #1d5aa8; background: #f0f6ff; box-shadow: inset 3px 0 0 #1d5aa8; }
.q-row1 { display: flex; justify-content: space-between; font-size: 12px; color: #666; }
.q-row2 { font-weight: 600; margin: 4px 0; font-size: 14px; }
.q-row3 { font-size: 12px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { padding: 20px; text-align: center; color: #999; }
.meta { font-weight: 400; font-size: 12px; color: #999; margin-left: 8px; }
.triage { background: linear-gradient(135deg, #f0f6ff, #fff); border: 1px solid #c9dcf5; border-radius: 8px; padding: 14px; margin: 12px 0; }
.ai-head { color: #1d5aa8; font-weight: 700; margin-bottom: 8px; }
.tags { margin-bottom: 8px; }
.tags .el-tag { margin-right: 6px; }
.flags { margin: 6px 0; }
.lbl { font-size: 13px; color: #666; margin: 6px 0 2px; }
.advice { padding-left: 20px; font-size: 13px; line-height: 1.9; }
.actions { margin-top: 14px; }
.detail { font-size: 13px; color: #666; margin-top: 2px; }
</style>
