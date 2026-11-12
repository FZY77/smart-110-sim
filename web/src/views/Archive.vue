<template>
  <div class="archive">
    <h2>后台 · 案件卷宗与复盘</h2>

    <el-card style="margin-bottom:16px">
      <el-table :data="cases" stripe @row-click="showDoc">
        <el-table-column prop="id" label="案号" width="160" />
        <el-table-column prop="reporter.conflictType" label="类型" width="100">
          <template #default="{ row }">{{ row.reporter?.conflictType }}</template>
        </el-table-column>
        <el-table-column prop="reporter.location" label="地点">
          <template #default="{ row }">{{ row.reporter?.location }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'closed' ? 'info' : 'success'">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button v-if="row.archive" size="small" @click.stop="showDoc(row)">查看卷宗</el-button>
            <span v-else style="color:#999">未结案</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <div v-if="doc" class="doc-wrap">
      <div class="doc">
        <h2>处 警 情 况 报 告</h2>
        <div class="sub">编号：{{ doc.id }}　立卷时间：{{ doc.closedAt?.slice(0,19) }}</div>
        <p><b>一、接警情况：</b>{{ doc.createdAt?.slice(0,19) }} 接报警人 {{ doc.reporter.name }}（电话 {{ doc.reporter.phone }}）报警，称在 {{ doc.reporter.location }} 发生 {{ doc.reporter.conflictType }} 事件。简要情况：{{ doc.reporter.desc }}</p>
        <p><b>二、AI 研判：</b>本案初判为{{ doc.triage?.category }}，严重度{{ doc.triage?.severity }}，紧急度{{ doc.triage?.urgency }}；建议处警单位为{{ doc.triage?.units?.join('、') }}。</p>
        <p><b>三、处警经过：</b>接警后{{ doc.triage?.units?.[0] }}立即出动，{{ doc.timeline.map(x=>x.event).join(' → ') }}。经现场工作，{{ doc.archive.result }}</p>
        <p><b>四、处理依据：</b>{{ doc.archive.legal }}</p>
        <p><b>五、处理结果：</b>本案作办结处理。{{ doc.archive.result }}</p>
        <div class="sign">
          处警民警：{{ doc.assignedOfficer || '值班民警' }}<br>
          所属单位：{{ doc.assignedUnit || '辖区派出所' }}<br>
          {{ doc.closedAt?.slice(0,19) }}
        </div>
      </div>
      <el-card class="review">
        <h4>◆ 案情复盘</h4>
        <p>{{ doc.archive.review }}</p>
        <h4 style="margin-top:12px">◆ 出警经验总结</h4>
        <p>{{ doc.archive.lessons }}</p>
      </el-card>
      <el-button style="margin-top:12px" @click="print">打印卷宗</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const cases = ref([])
const doc = ref(null)

const STATUS = {
  pending: '已受理', dispatched: '已派警', enroute: '出警途中',
  onscene: '已到达现场', handling: '现场处置中', closed: '已结案'
}
function statusLabel(s) { return STATUS[s] || s }

async function load() { const { data } = await axios.get('/api/case'); cases.value = data }
function showDoc(row) { if (row.archive) doc.value = row }
function print() { window.print() }

onMounted(load)
</script>

<style scoped>
.archive { padding: 20px; max-width: 1000px; margin: 0 auto; }
.archive h2 { margin-top: 0; }
.doc-wrap { margin-top: 16px; }
.doc { background: #fffdf5; border: 1px solid #e8dcb8; padding: 28px; border-radius: 6px; font-family: "SimSun", serif; line-height: 1.9; }
.doc h2 { text-align: center; font-family: "SimHei", sans-serif; letter-spacing: 4px; margin: 0 0 6px; }
.doc .sub { text-align: center; color: #666; font-size: 13px; margin-bottom: 18px; font-family: "Microsoft YaHei", sans-serif; }
.doc p { text-indent: 2em; margin: 0 0 6px; font-size: 15px; }
.doc .sign { text-align: right; margin-top: 24px; font-family: "Microsoft YaHei", sans-serif; font-size: 14px; text-indent: 0; }
.review { background: #f4f9f4; border-left: 4px solid #1e8449; margin-top: 12px; }
.review h4 { color: #1e8449; margin: 0 0 6px; }
</style>
