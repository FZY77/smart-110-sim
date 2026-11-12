<template>
  <div class="officer">
    <h2>警员工作台</h2>
    <el-table :data="cases" stripe>
      <el-table-column prop="id" label="警号" width="110" />
      <el-table-column prop="location" label="案发地" />
      <el-table-column prop="conflictType" label="类型" width="90" />
      <el-table-column prop="injuryLevel" label="伤情" width="90" />
      <el-table-column prop="need120" label="120" width="60">
        <template #default="{ row }">{{ row.need120 ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="dispatch(row)">派警</el-button>
          <el-button size="small" @click="advance(row)">推进</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const cases = ref([])
async function load() { const { data } = await axios.get('/api/case'); cases.value = data }
async function dispatch(row) {
  await axios.patch('/api/case/' + row.id, { status: 'dispatched', officer: '张警官 138xxxx' })
  load()
}
async function advance(row) {
  const next = { pending: 'dispatched', dispatched: 'enroute', enroute: 'onscene', onscene: 'closed' }[row.status]
  await axios.patch('/api/case/' + row.id, { status: next })
  load()
}
onMounted(load)
</script>

<style scoped>.officer { padding: 24px; }</style>
