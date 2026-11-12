import axios from 'axios'

const SYSTEM_PROMPT = `你是110接警信息抽取助手。下面是报警人的语音转写稿，请从中抽取报警关键信息。
严格按下面JSON格式输出，不要任何解释文字，不要markdown代码块：
{
  "location": "案发地点，尽量具体，不知道填null",
  "conflictType": "只能是以下之一：纠纷/斗殴/盗窃/交通事故/噪音/其他",
  "need120": true或false,
  "need119": true或false,
  "needTraffic": true或false,
  "injuryLevel": "无/轻微伤/重伤/不明",
  "peopleCount": 数字或null,
  "summary": "30字以内案情摘要",
  "uncertainFields": ["你不太确定的字段名"]
}`

export async function extractCaseInfo(transcript) {
  if (process.env.USE_MOCK === 'true' || !process.env.LLM_API_KEY) {
    return mockExtract()
  }
  const resp = await axios.post(
    `${process.env.LLM_BASE_URL}/chat/completions`,
    {
      model: process.env.LLM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    },
    {
      headers: { Authorization: `Bearer ${process.env.LLM_API_KEY}` },
      timeout: 20000
    }
  )
  const text = resp.data.choices[0].message.content
  return safeParseJSON(text)
}

function safeParseJSON(text) {
  try { return JSON.parse(text) } catch {}
  const m = String(text).match(/\{[\s\S]*\}/)
  if (m) return JSON.parse(m[0])
  throw new Error('LLM 输出解析失败')
}

function mockExtract() {
  return new Promise(resolve => setTimeout(() => resolve({
    location: '文三路200号门口',
    conflictType: '斗殴',
    need120: true,
    need119: false,
    needTraffic: false,
    injuryLevel: '重伤',
    peopleCount: 4,
    summary: '两人斗殴致一人头部流血，需120到场',
    uncertainFields: ['peopleCount']
  }), 600))
}
