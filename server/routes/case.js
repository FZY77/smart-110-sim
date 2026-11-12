import { Router } from 'express'
import multer from 'multer'
import { transcribeAudio } from '../services/asr.js'
import { extractCaseInfo } from '../services/llm.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// ============ 内存案件库 ============
let cases = []
let seq = 1000

// ============ 警情类型字典 ============
const TYPE_DICT = {
  '盗窃':     { cat: 'criminal', sev: 3, urg: 2, unit: '刑事侦查大队' },
  '抢劫抢夺': { cat: 'criminal', sev: 5, urg: 5, unit: '特警突击中队' },
  '斗殴':     { cat: 'criminal', sev: 4, urg: 4, unit: '辖区派出所·巡警中队' },
  '斗殴伤人': { cat: 'criminal', sev: 4, urg: 4, unit: '辖区派出所·巡警中队' },
  '故意伤害': { cat: 'criminal', sev: 5, urg: 5, unit: '辖区派出所·巡警中队' },
  '诈骗':     { cat: 'criminal', sev: 3, urg: 1, unit: '刑事侦查大队' },
  '涉毒':     { cat: 'criminal', sev: 5, urg: 4, unit: '刑事侦查大队' },
  '涉黄':     { cat: 'criminal', sev: 3, urg: 2, unit: '辖区派出所·巡警中队' },
  '肇事逃逸': { cat: 'criminal', sev: 4, urg: 4, unit: '交通警察大队' },
  '邻里纠纷': { cat: 'civil',     sev: 1, urg: 1, unit: '社区警务队' },
  '噪音':     { cat: 'civil',     sev: 1, urg: 1, unit: '社区警务队' },
  '噪音扰民': { cat: 'civil',     sev: 1, urg: 1, unit: '社区警务队' },
  '消费纠纷': { cat: 'civil',     sev: 2, urg: 1, unit: '辖区派出所·巡警中队' },
  '家庭矛盾': { cat: 'civil',     sev: 2, urg: 2, unit: '社区警务队' },
  '宠物扰民': { cat: 'civil',     sev: 1, urg: 1, unit: '社区警务队' },
  '劳资纠纷': { cat: 'civil',     sev: 2, urg: 2, unit: '辖区派出所·巡警中队' },
  '交通事故': { cat: 'traffic',   sev: 3, urg: 3, unit: '交通警察大队' },
  '人员走失': { cat: 'other',     sev: 2, urg: 2, unit: '辖区派出所·巡警中队' },
  '高空坠物': { cat: 'other',     sev: 4, urg: 4, unit: '辖区派出所·巡警中队' },
  '火灾隐患': { cat: 'other',     sev: 4, urg: 4, unit: '辖区派出所·巡警中队' },
}

// ============ AI 研判引擎 ============
function aiTriage(r) {
  const t = TYPE_DICT[r.conflictType] || { cat: 'other', sev: 2, urg: 2, unit: '辖区派出所·巡警中队' }
  let sev = t.sev, urg = t.urg
  const flags = []
  if (r.hasInjury) { sev = Math.max(sev, 4); urg = Math.max(urg, 4); flags.push('现场有人员受伤') }
  if (r.weapon)    { sev = 5; urg = 5; flags.push('现场有人持械/危险物品') }
  if (r.ongoing === '1' || r.ongoing === true || r.ongoing === 1) { urg = Math.max(urg, 4); flags.push('事件正在进行中') }
  if (r.peopleCount === '5+') { sev = Math.max(sev, 4); flags.push('5人以上聚集') }

  const need120 = r.need120 || r.hasInjury
  const need119 = r.need119
  const need122 = r.need122 || r.conflictType === '交通事故' || r.conflictType === '肇事逃逸'

  let severity, sevColor
  if (sev >= 5) { severity = '特别重大'; sevColor = 'red' }
  else if (sev >= 4) { severity = '重大'; sevColor = 'red' }
  else if (sev >= 3) { severity = '较大'; sevColor = 'orange' }
  else { severity = '一般'; sevColor = 'green' }

  let urgency, urgColor
  if (urg >= 5) { urgency = '特别紧急'; urgColor = 'red' }
  else if (urg >= 4) { urgency = '紧急'; urgColor = 'red' }
  else if (urg >= 3) { urgency = '较急'; urgColor = 'orange' }
  else { urgency = '一般'; urgColor = 'green' }

  const catMap = { criminal: '刑事案件', civil: '治安/民情案件', traffic: '交通类警情', other: '其他求助类' }
  const units = [t.unit]
  if (sev >= 4 && t.unit !== '特警突击中队') units.push('特警突击中队（备勤）')
  if (r.peopleCount === '5+') units.push('就近巡逻车组增援')

  const links = []
  if (need120) links.push({ name: '120急救中心', cls: 'ambulance' })
  if (need119) links.push({ name: '119消防救援', cls: 'fire' })
  if (need122) links.push({ name: '122交警联动', cls: 'traffic' })

  const adviceToReporter = [
    '请保持电话畅通，接警员将在 1 分钟内与您电话核实。',
    r.weapon ? '现场有人持械，请立即撤离到安全区域，不要正面冲突，远离门窗。'
      : r.hasInjury ? '请在安全前提下对伤者进行简单止血，不要随意搬动重伤员。'
      : t.cat === 'civil' ? '请保持克制，不要与对方发生肢体冲突，等待民警到场处理。'
      : (t.cat === 'criminal' && (r.ongoing === '1')) ? '请优先确保自身安全，记住嫌疑人特征和逃跑方向，不要追赶。' : '',
    need120 ? '已同步呼叫 120，急救人员将与警车联动到场。' : '',
    '不要关闭本页面，可随时查看警员位置与处置进度。'
  ].filter(Boolean)

  const adviceToOfficer = [
    `【定级】${severity} / ${urgency}，按${units[0]}主处警。`,
    r.weapon ? '【风险】现场持械，着防弹衣、携带警械，两车组以上协同接近，先喊话控制。' : '',
    r.hasInjury ? '【医疗】已联动120，到场后优先救护伤员并保护现场。' : '',
    r.peopleCount === '5+' ? '【群体】人数较多，立即上报指挥中心增派巡逻车组，开启执法记录仪全程录像。' : '',
    t.cat === 'criminal' ? '【取证】控制嫌疑人后立即盘问检查，调取周边监控，登记证人信息。'
      : t.cat === 'civil' ? '【调解】以劝导化解为主，分别听取双方陈述，做好调解笔录，防止矛盾升级。'
      : t.cat === 'traffic' ? '【交通】先划定警戒区、疏导交通，有人伤的先救人再定责。' : '',
    `【联络】已建立临时作战群，成员：${units.join('、')}${need120 ? '、120现场医护' : ''}。`
  ].filter(Boolean)

  return {
    category: catMap[t.cat], severity, sevColor, urgency, urgColor,
    units, links, flags, need120, need119, need122,
    adviceToReporter, adviceToOfficer,
    triageTime: new Date().toISOString()
  }
}

// ============ 卷宗生成 ============
function buildArchive(c, result) {
  const r = c.reporter, t = c.triage || {}
  const lawMap = {
    '盗窃': '《治安管理处罚法》第四十九条 / 《刑法》第二百六十四条',
    '诈骗': '《刑法》第二百六十六条',
    '斗殴': '《治安管理处罚法》第四十三条',
    '斗殴伤人': '《治安管理处罚法》第四十三条',
    '故意伤害': '《刑法》第二百三十四条',
    '抢劫抢夺': '《刑法》第二百六十三条 / 第二百六十七条',
    '涉毒': '《刑法》第三百四十七条',
    '邻里纠纷': '《治安管理处罚法》第九条（民间纠纷调解）',
    '噪音扰民': '《治安管理处罚法》第五十八条',
    '交通事故': '《道路交通安全法》第七十条',
  }
  const law = lawMap[r.conflictType] || '《治安管理处罚法》相关规定'
  const review = []
  if (r.weapon) review.push('现场存在持械风险，两车组协同接近、先喊话后控制的战术使用得当。')
  if (r.hasInjury) review.push('联动120响应及时，医疗与警力同步到场，伤员得到优先救治。')
  if (r.peopleCount === '5+') review.push('多人聚集警情第一时间上报增派警力并全程执法记录仪取证。')
  if (c.timeline.length <= 4) review.push('处置链条完整，从受理到结案全程留痕。')
  if (!review.length) review.push('处置流程规范，报警人反馈良好，无投诉无复议。')
  return {
    summary: result, result, legal: law, review: review.join(' '),
    lessons: `接警阶段关键要素采集完整，AI 研判定级准确。${t.severity || ''}警情出动时长合理，${(t.units || []).join('、')}协同顺畅。建议继续保持"先安全、后处置、全程取证"的处警原则。`
  }
}

function now() { return new Date().toLocaleString('zh-CN', { hour12: false }) }

// ============ 路由 ============

// POST /api/case/from-audio  上传录音 → 转写 → 抽取
router.post('/from-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未收到音频文件' })
    const transcript = await transcribeAudio(req.file.buffer, req.file.mimetype)
    const parsed = await extractCaseInfo(transcript)
    res.json({ transcript, parsed })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: '识别失败：' + e.message })
  }
})

// POST /api/case  报警人提交案件（自动 AI 研判）
router.post('/', (req, res) => {
  const reporter = req.body
  const c = {
    id: 'AJ' + Date.now().toString().slice(-6) + '-' + (++seq),
    reporter,
    status: 'pending',
    triage: null,
    assignedUnit: null,
    assignedOfficer: null,
    timeline: [{ time: now(), event: '110接警台受理警情', detail: `报警人${reporter.name || '匿名'}提交警情` }],
    createdAt: new Date().toISOString(),
    closedAt: null,
    archive: null,
  }
  // 自动 AI 研判
  c.triage = aiTriage(reporter)
  c.timeline.push({ time: now(), event: 'AI 完成初步研判', detail: `${c.triage.category} · ${c.triage.severity} · ${c.triage.urgency}` })
  cases.unshift(c)
  res.json(c)
})

// GET /api/case  案件列表
router.get('/', (req, res) => res.json(cases))

// GET /api/case/:id  查询单案
router.get('/:id', (req, res) => {
  const c = cases.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  res.json(c)
})

// PATCH /api/case/:id  通用更新
router.patch('/:id', (req, res) => {
  const c = cases.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  Object.assign(c, req.body, { updatedAt: new Date().toISOString() })
  res.json(c)
})

// PATCH /api/case/:id/dispatch  派警
router.patch('/:id/dispatch', (req, res) => {
  const c = cases.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  c.status = 'dispatched'
  c.assignedUnit = c.triage.units[0]
  c.assignedOfficer = req.body.officer || '值班民警'
  c.timeline.push({ time: now(), event: '指挥中心派警', detail: `指令下达：${c.triage.units.join('、')}；主责：${c.assignedUnit}` })
  if (c.triage.need120) c.timeline.push({ time: now(), event: '联动 120', detail: '急救中心已接单' })
  if (c.triage.need119) c.timeline.push({ time: now(), event: '联动 119', detail: '消防救援站已出动' })
  if (c.triage.need122) c.timeline.push({ time: now(), event: '联动 122', detail: '交警已调度就近警力' })
  c.timeline.push({ time: now(), event: '建立临时联络群', detail: `成员：${c.assignedOfficer}、${c.triage.units.join('、')}、指挥中心` })
  res.json(c)
})

// PATCH /api/case/:id/advance  状态推进
router.patch('/:id/advance', (req, res) => {
  const c = cases.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const next = { pending: 'dispatched', dispatched: 'enroute', enroute: 'onscene', onscene: 'handling', handling: 'handling' }
  const evMap = {
    dispatched: ['民警出动', '巡逻车组已从所内出发'],
    enroute: ['到达现场', '警力已抵达，开始现场管控'],
    onscene: ['现场处置', '开展处置、取证、调解 / 控制嫌疑人'],
  }
  c.status = next[c.status] || c.status
  const ev = evMap[c.status]
  if (ev) c.timeline.push({ time: now(), event: ev[0], detail: ev[1] })
  res.json(c)
})

// PATCH /api/case/:id/close  结案并生成卷宗
router.patch('/:id/close', (req, res) => {
  const c = cases.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  const result = req.body.result || '现场处置完毕'
  c.archive = buildArchive(c, result)
  c.status = 'closed'
  c.closedAt = new Date().toISOString()
  c.timeline.push({ time: now(), event: '案件办结', detail: result })
  c.timeline.push({ time: now(), event: '卷宗已生成', detail: '系统自动生成处警卷宗与复盘要点' })
  res.json(c)
})

export default router
