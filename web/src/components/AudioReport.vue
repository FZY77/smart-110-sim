<template>
  <div class="audio-report">
    <div v-if="!transcript">
      <button class="rec-btn" :class="{ recording }" @click="toggle">
        {{ recording ? '■ 停止录音' : '🎤 开始录音' }}
      </button>
      <p class="hint">最长 60 秒，说完后点停止</p>
      <p v-if="loading" class="loading">AI 接警员正在记录...</p>
    </div>

    <div v-else class="result">
      <h3>识别到的内容：</h3>
      <el-input v-model="transcript" type="textarea" :rows="3" />

      <h3 style="margin-top:16px">自动识别的报警信息（可修改）：</h3>
      <el-form label-width="100px">
        <el-form-item label="案发地">
          <el-input v-model="form.location" />
          <el-tag v-if="form.uncertainFields?.includes('location')" type="warning" size="small" style="margin-left:8px">AI 不确定</el-tag>
        </el-form-item>
        <el-form-item label="冲突类型">
          <el-select v-model="form.conflictType">
            <el-option v-for="t in types" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="需要120"><el-switch v-model="form.need120" /></el-form-item>
        <el-form-item label="需要119"><el-switch v-model="form.need119" /></el-form-item>
        <el-form-item label="伤情">
          <el-select v-model="form.injuryLevel">
            <el-option v-for="t in ['无','轻微伤','重伤','不明']" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="案情摘要"><el-input v-model="form.summary" /></el-form-item>
      </el-form>
      <el-button type="primary" @click="submit">确认并提交报警</el-button>
      <el-button @click="reset">重录</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['submitted'])
const recording = ref(false)
const loading = ref(false)
const transcript = ref('')
const types = ['纠纷', '斗殴', '盗窃', '交通事故', '噪音', '其他']
const form = ref({})

let mediaRecorder, chunks

async function toggle() {
  if (recording.value) { mediaRecorder.stop(); return }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    chunks = []
    mediaRecorder.ondataavailable = e => chunks.push(e.data)
    mediaRecorder.onstop = async () => {
      recording.value = false
      loading.value = true
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const fd = new FormData()
      fd.append('audio', blob, 'call.webm')
      try {
        const { data } = await axios.post('/api/case/from-audio', fd)
        transcript.value = data.transcript
        form.value = data.parsed
      } catch (e) {
        ElMessage.error('识别失败，请手动填写')
      } finally { loading.value = false }
    }
    mediaRecorder.start()
    recording.value = true
  } catch (e) {
    ElMessage.error('无法访问麦克风，请检查浏览器权限（需 https 或 localhost）')
  }
}

async function submit() {
  const { data } = await axios.post('/api/case', { ...form.value, transcript: transcript.value })
  ElMessage.success('报警已受理，编号 ' + data.id)
  emit('submitted', data)
}

function reset() { transcript.value = ''; form.value = {} }
</script>

<style scoped>
.audio-report { text-align: center; padding: 20px; }
.rec-btn { width: 160px; height: 160px; border-radius: 50%; border: none; font-size: 18px; cursor: pointer; background: #1e50a2; color: #fff; box-shadow: 0 8px 24px rgba(30,80,162,.4); }
.rec-btn.recording { background: #d93636; animation: pulse 1.2s infinite; }
@keyframes pulse { 50% { transform: scale(1.08); } }
.hint { color: #888; margin-top: 16px; }
.loading { color: #1e50a2; }
.result { text-align: left; }
</style>
