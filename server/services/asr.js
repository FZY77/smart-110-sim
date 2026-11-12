// 语音识别服务：优先调火山引擎；无 Key 或 USE_MOCK=true 时走 mock
// 火山录音文件识别极速版文档：https://www.volcengine.com/docs/6561/80818

export async function transcribeAudio(buffer, mimetype) {
  if (process.env.USE_MOCK === 'true' || !process.env.VOLC_ASR_ACCESS_TOKEN) {
    return mockTranscript()
  }
  // TODO: 在这里实现火山 ASR HTTP 调用
  // 1. 把 buffer 上传到可公网访问的 URL（或用火山 SDK）
  // 2. 调 /api/v1/auc/submit 提交任务
  // 3. 轮询 /api/v1/auc/query 拿结果
  throw new Error('火山 ASR 未接入，先设 USE_MOCK=true 跑通流程')
}

function mockTranscript() {
  return new Promise(resolve => setTimeout(() => resolve(
    '喂你好110吗，我在文三路200号门口，两个人打起来了，有一个头破了在流血，需要救护车，大概三四个人在场。'
  ), 800))
}
