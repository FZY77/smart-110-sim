import { Router } from 'express'
import multer from 'multer'
import { transcribeAudio } from '../services/asr.js'
import { extractCaseInfo } from '../services/llm.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// 内存案件库（演示用；正式版换 MySQL）
let cases = []
let seq = 1000

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

// POST /api/case  报警人确认后提交案件
router.post('/', (req, res) => {
  const c = {
    id: 'CASE-' + (++seq),
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...req.body
  }
  cases.unshift(c)
  res.json(c)
})

// GET /api/case  警员工作台列表
router.get('/', (req, res) => res.json(cases))

// GET /api/case/:id  报警人查进度
router.get('/:id', (req, res) => {
  const c = cases.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  res.json(c)
})

// PATCH /api/case/:id  警员更新状态/派警
router.patch('/:id', (req, res) => {
  const c = cases.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'not found' })
  Object.assign(c, req.body, { updatedAt: new Date().toISOString() })
  res.json(c)
})

export default router
