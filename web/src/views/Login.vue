<template>
  <div class="login">
    <el-card class="box">
      <h2 style="text-align:center;margin-top:0">登录</h2>
      <el-tabs v-model="tab">
        <el-tab-pane label="警员入口" name="officer">
          <el-input v-model="form.username" placeholder="警号" style="margin-bottom:12px" />
          <el-input v-model="form.password" type="password" placeholder="密码" style="margin-bottom:12px" />
          <el-button type="primary" style="width:100%" @click="go">进入工作台</el-button>
        </el-tab-pane>
        <el-tab-pane label="后台入口" name="admin">
          <el-input v-model="form.username" placeholder="管理员账号" style="margin-bottom:12px" />
          <el-input v-model="form.password" type="password" placeholder="密码（演示口令 admin）" style="margin-bottom:12px" />
          <el-button type="success" style="width:100%" @click="go">进入后台</el-button>
        </el-tab-pane>
      </el-tabs>
      <div style="text-align:center;margin-top:12px"><router-link to="/">← 返回首页</router-link></div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
const router = useRouter(), route = useRoute()
const tab = ref(route.query.type || 'officer')
const form = ref({ username: '', password: '' })
function go() {
  if (tab.value === 'admin') {
    if (form.value.password !== 'admin') { ElMessage.warning('演示口令为 admin'); return }
    router.push('/archive')
  } else {
    router.push('/officer')
  }
}
</script>

<style scoped>
.login { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f2f5; }
.box { width: 380px; }
</style>
