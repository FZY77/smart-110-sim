import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import caseRouter from './routes/case.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/case', caseRouter)

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`[server] http://localhost:${PORT}  USE_MOCK=${process.env.USE_MOCK}`))
