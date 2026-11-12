<template>
  <div class="home">
    <h1 class="title">智慧110接处警模拟平台</h1>
    <p class="sub">教学演示系统 · 不受理真实警情</p>
    <div class="cards">
      <div class="card" @click="$router.push('/report')">
        <div class="icon">🚨</div>
        <h2>我要报警</h2>
        <p>语音上报 / 填写案发信息</p>
      </div>
      <div class="card" @click="$router.push('/login?type=officer')">
        <div class="icon">👮</div>
        <h2>警员登录</h2>
        <p>工作台 · 派警 · 处置</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #1e50a2, #0d2b5c); color: #fff; }
.title { font-size: 36px; margin: 0 0 8px; }
.sub { opacity: .7; margin-bottom: 48px; }
.cards { display: flex; gap: 32px; }
.card { width: 260px; padding: 40px 24px; background: #fff; border-radius: 12px; color: #333; text-align: center; cursor: pointer; transition: transform .2s; box-shadow: 0 8px 24px rgba(0,0,0,.2); }
.card:hover { transform: translateY(-4px); }
.icon { font-size: 48px; }
.card h2 { margin: 16px 0 8px; }
.card p { color: #888; font-size: 14px; margin: 0; }
</style>
