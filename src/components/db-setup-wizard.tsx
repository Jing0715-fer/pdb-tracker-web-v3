'use client'

/**
 * DbSetupWizard — first-run / re-run modal that guides the user to either
 *   ① create a brand-new SQLite database file, or
 *   ② select an existing one from a clickable list.
 *
 * WHY: The bundled `./db/custom.db` is a TEST-ONLY database. Real user data
 * must live in a user-chosen file. This wizard is the single entry point
 * that ensures every downstream module (① literature / ② evaluation /
 * ③ weekly) reads from and writes to the SAME user-confirmed database.
 *
 * The wizard calls `POST /api/db-config` which:
 *   • writes `.hermes/db-config.json`
 *   • runs `prisma db push` to initialize the schema (for new DBs)
 *   • calls `recreatePrismaClient()` so all 3 modules immediately see the
 *     new DB without a server restart
 *
 * Error handling: the dev server can crash (OOM) during the POST (which
 * spawns `bunx prisma db push`), causing the gateway to return an HTML 502
 * page. We detect this and show a friendly retry prompt instead of a
 * confusing "Unexpected token '<'" JSON parse error.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Database, FilePlus2, FolderOpen, Loader2, CheckCircle2, XCircle,
  AlertTriangle, ShieldCheck, ArrowRight, ArrowLeft, FileText, FlaskConical,
  HardDrive, RefreshCw, Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export interface DbStatus {
  configuredDbPath: string | null
  confirmed: boolean
  activeUrl: string
  activeFsPath: string
  isTest: boolean
  exists: boolean
  hasSchema: boolean
  tableCount: number
  tables: string[]
  counts: Record<string, number>
  defaultTestPath: string
  testDbAbs: string
  updatedAt: string | null
}

export interface DbSetupWizardProps {
  open: boolean
  /** Called after the user successfully confirms a database. */
  onComplete: (status: DbStatus) => void
  /** Allow closing without setup (only offered when a confirmed DB already exists). */
  onClose?: () => void
  /** Whether the user is allowed to skip (only true when DB is already confirmed). */
  allowSkip?: boolean
}

interface DbListEntry {
  displayPath: string
  fsPath: string
  dbUrl: string
  sizeBytes: number
  mtime: string
  isActive: boolean
  hasSchema: boolean
  tableCount: number
  source: string
}

type Mode = 'choose' | 'create' | 'select' | 'working' | 'done' | 'error'

const DEFAULT_NEW_DB_DIR = 'db'
const DEFAULT_NEW_DB_NAME = 'my-pdb-tracker.db'

/**
 * Safely parse a fetch response as JSON. If the body is HTML (e.g. a 502
 * gateway error page), throw a friendly error instead of letting
 * `res.json()` produce "Unexpected token '<'".
 */
async function safeJson<T = any>(res: Response): Promise<T> {
  const ct = res.headers.get('content-type') || ''
  const text = await res.text()
  if (!ct.includes('application/json') || text.trimStart().startsWith('<')) {
    // HTML error page — likely 502 from gateway or a Next.js error page.
    if (res.status === 502 || text.includes('502')) {
      throw new Error('服务器暂时无响应（502）。这通常是因为数据库初始化时服务器内存紧张，请点击「重试」再试一次。')
    }
    if (res.status >= 500) {
      throw new Error(`服务器内部错误（HTTP ${res.status}）。请点击「重试」，或检查 dev.log 日志。`)
    }
    throw new Error(`服务器返回了非 JSON 响应（HTTP ${res.status}）。请点击「重试」。`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('无法解析服务器响应。请点击「重试」。')
  }
}

/** POST with retry — the dev server can crash mid-request during `prisma db push`. */
async function postDbConfigWithRetry(body: any, maxRetries = 2): Promise<any> {
  let lastErr: any
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch('/api/db-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await safeJson(res)
      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.stderr || `HTTP ${res.status}`)
      }
      return data
    } catch (err: any) {
      lastErr = err
      // Only retry on network/502 errors (server crashed), not on validation errors.
      const msg = err?.message || ''
      const isRetryable = msg.includes('502') || msg.includes('服务器') || msg.includes('Failed to fetch') || msg.includes('NetworkError')
      if (!isRetryable || attempt === maxRetries) throw err
      // Wait 2s before retrying to give the server time to recover.
      await new Promise((r) => setTimeout(r, 2000))
    }
  }
  throw lastErr
}

export function DbSetupWizard({ open, onComplete, onClose, allowSkip }: DbSetupWizardProps) {
  const [mode, setMode] = useState<Mode>('choose')
  const [newDbName, setNewDbName] = useState(DEFAULT_NEW_DB_NAME)
  const [newDbDir, setNewDbDir] = useState(DEFAULT_NEW_DB_DIR)
  const [existingPath, setExistingPath] = useState('')
  const [workingMsg, setWorkingMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [resultStatus, setResultStatus] = useState<DbStatus | null>(null)
  // Existing DB list for the "select" mode
  const [dbList, setDbList] = useState<DbListEntry[]>([])
  const [dbListLoading, setDbListLoading] = useState(false)
  const [dbListError, setDbListError] = useState('')
  const [dbListSearch, setDbListSearch] = useState('')
  const [selectedDbUrl, setSelectedDbUrl] = useState<string | null>(null)

  // Reset to the choose step every time the wizard is (re)opened.
  useEffect(() => {
    if (open) {
      setMode('choose')
      setNewDbName(DEFAULT_NEW_DB_NAME)
      setNewDbDir(DEFAULT_NEW_DB_DIR)
      setExistingPath('')
      setWorkingMsg('')
      setErrorMsg('')
      setResultStatus(null)
      setSelectedDbUrl(null)
      setDbListSearch('')
    }
  }, [open])

  // Fetch the list of existing databases when entering "select" mode.
  const loadDbList = useCallback(async () => {
    setDbListLoading(true)
    setDbListError('')
    try {
      const res = await fetch('/api/db-list')
      const data = await safeJson(res)
      setDbList(data.databases || [])
    } catch (err: any) {
      setDbListError(err?.message || '加载列表失败')
      setDbList([])
    } finally {
      setDbListLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mode === 'select' && dbList.length === 0 && !dbListLoading) {
      loadDbList()
    }
  }, [mode, dbList.length, dbListLoading, loadDbList])

  const buildNewFsPath = useCallback(() => {
    const cleanDir = (newDbDir || '.').replace(/\/+$/, '')
    const cleanName = (newDbName || DEFAULT_NEW_DB_NAME).replace(/^\/+/, '')
    // Strip any accidental .db duplication.
    const name = cleanName.endsWith('.db') ? cleanName : `${cleanName}.db`
    return `${cleanDir}/${name}`
  }, [newDbDir, newDbName])

  const handleCreate = useCallback(async () => {
    const relPath = buildNewFsPath()
    const dbPath = `file:./${relPath.replace(/^\.?\//, '')}`
    setMode('working')
    setWorkingMsg(`正在创建新数据库 ${relPath} 并初始化表结构…`)
    setErrorMsg('')
    try {
      await postDbConfigWithRetry({ dbPath, create: true, initSchema: true, confirmed: true })
      // Fetch updated status to surface to the caller.
      const sres = await fetch('/api/db-config')
      const status = await safeJson<DbStatus>(sres)
      setResultStatus(status)
      setMode('done')
      toast.success('数据库已创建', { description: relPath })
    } catch (err: any) {
      setErrorMsg(err?.message || String(err))
      setMode('error')
    }
  }, [buildNewFsPath])

  const handleSelect = useCallback(async (dbUrl?: string) => {
    const raw = (dbUrl || existingPath || '').trim()
    if (!raw) {
      setErrorMsg('请选择或输入一个数据库文件')
      setMode('error')
      return
    }
    const dbPath = raw.startsWith('file:') ? raw : `file:${raw}`
    setMode('working')
    setWorkingMsg(`正在切换到数据库 ${raw.replace(/^file:/, '')} …`)
    setErrorMsg('')
    try {
      await postDbConfigWithRetry({ dbPath, create: false, initSchema: true, confirmed: true })
      const sres = await fetch('/api/db-config')
      const status = await safeJson<DbStatus>(sres)
      setResultStatus(status)
      setMode('done')
      toast.success('数据库已切换', { description: raw.replace(/^file:/, '') })
    } catch (err: any) {
      setErrorMsg(err?.message || String(err))
      setMode('error')
    }
  }, [existingPath])

  const handleFinish = useCallback(() => {
    if (resultStatus) onComplete(resultStatus)
  }, [resultStatus, onComplete])

  const handleRetry = useCallback(() => {
    setMode('choose')
    setErrorMsg('')
  }, [])

  const filteredDbList = dbList.filter((e) => {
    if (!dbListSearch.trim()) return true
    return e.displayPath.toLowerCase().includes(dbListSearch.toLowerCase())
      || e.fsPath.toLowerCase().includes(dbListSearch.toLowerCase())
  })

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && allowSkip && onClose) onClose() }}>
      <DialogContent className="max-w-2xl w-[92vw] !max-w-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-amber-500" />
            数据库初始化设置
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            首次使用前，请创建一个新的数据库文件，或选择一个已有数据库。运行中心与 ① 文献 / ② 评估 / ③ 周报三大模块将共用此数据库。
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ── Step 1: choose ─────────────────────────────────────── */}
            {mode === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    <div className="font-semibold mb-0.5">当前数据库仅供测试</div>
                    默认的 <code className="font-mono text-[10px] bg-amber-500/10 px-1 rounded">db/custom.db</code> 是测试数据库，请勿用于真实数据。建议创建一个新数据库用于日常工作。
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode('create')}
                    className="group text-left rounded-lg border border-border hover:border-claude-accent/50 hover:bg-claude-accent/5 p-4 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center">
                        <FilePlus2 className="h-4 w-4 text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium">创建新数据库</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      新建一个空的 SQLite 数据库文件并自动初始化表结构。推荐首次使用。
                    </p>
                  </button>

                  <button
                    onClick={() => setMode('select')}
                    className="group text-left rounded-lg border border-border hover:border-claude-accent/50 hover:bg-claude-accent/5 p-4 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-md bg-sky-500/10 flex items-center justify-center">
                        <FolderOpen className="h-4 w-4 text-sky-600" />
                      </div>
                      <span className="text-sm font-medium">选择已有数据库</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      从列表中点击选择一个已存在的数据库文件。会自动补全缺失的表。
                    </p>
                  </button>
                </div>

                {allowSkip && onClose && (
                  <div className="flex justify-end pt-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onClose}>
                      暂时跳过（继续使用当前数据库）
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 2a: create ────────────────────────────────────── */}
            {mode === 'create' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">数据库目录（相对项目根目录）</Label>
                  <Input
                    value={newDbDir}
                    onChange={(e) => setNewDbDir(e.target.value)}
                    placeholder="db"
                    className="h-9 text-xs font-mono mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">默认放在项目 <code>db/</code> 目录下。</p>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">数据库文件名</Label>
                  <Input
                    value={newDbName}
                    onChange={(e) => setNewDbName(e.target.value)}
                    placeholder="my-pdb-tracker.db"
                    className="h-9 text-xs font-mono mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">将以 <code>.db</code> 后缀创建 SQLite 文件。</p>
                </div>
                <div className="rounded-md bg-muted/40 p-3 text-xs">
                  <div className="text-muted-foreground mb-1">最终路径：</div>
                  <code className="font-mono text-[11px] break-all">./{buildNewFsPath().replace(/^\.?\//, '')}</code>
                </div>
                <div className="flex justify-between gap-2 pt-2">
                  <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setMode('choose')}>
                    <ArrowLeft className="h-3 w-3 mr-1" /> 上一步
                  </Button>
                  <Button size="sm" className="h-8 text-xs" onClick={handleCreate}>
                    <FilePlus2 className="h-3 w-3 mr-1" /> 创建并初始化
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2b: select ────────────────────────────────────── */}
            {mode === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {/* Search box */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={dbListSearch}
                    onChange={(e) => setDbListSearch(e.target.value)}
                    placeholder="搜索数据库文件…"
                    className="h-9 text-xs pl-8 pr-8"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={loadDbList}
                    title="刷新列表"
                  >
                    <RefreshCw className={`h-3 w-3 ${dbListLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* Clickable list of existing databases */}
                {dbListLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">正在扫描已有数据库…</p>
                  </div>
                ) : dbListError ? (
                  <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-600">
                    {dbListError}
                  </div>
                ) : filteredDbList.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-6 text-center">
                    <FolderOpen className="mx-auto h-5 w-5 text-muted-foreground/60" />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {dbListSearch ? '未找到匹配的数据库' : '未找到已有数据库文件'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      可在下方手动输入路径，或返回上一步创建新数据库
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[280px] rounded-md border border-border/40">
                    <div className="divide-y divide-border/30">
                      {filteredDbList.map((db) => (
                        <button
                          key={db.fsPath}
                          onClick={() => setSelectedDbUrl(db.dbUrl)}
                          className={`w-full text-left px-3 py-2.5 transition-colors flex items-start gap-2.5 ${
                            selectedDbUrl === db.dbUrl
                              ? 'bg-claude-accent/10 border-l-2 border-l-claude-accent'
                              : 'hover:bg-muted/40 border-l-2 border-l-transparent'
                          }`}
                        >
                          <HardDrive className={`h-4 w-4 mt-0.5 shrink-0 ${db.isActive ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <code className="text-[11px] font-mono text-foreground break-all">{db.displayPath}</code>
                              {db.isActive && (
                                <Badge variant="outline" className="text-2xs px-1 py-0 h-4 border-emerald-500/40 text-emerald-600 bg-emerald-500/10 gap-0.5 shrink-0">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> 当前
                                </Badge>
                              )}
                              {db.hasSchema ? (
                                <Badge variant="outline" className="text-2xs px-1 py-0 h-4 border-sky-500/30 text-sky-600 bg-sky-500/10 gap-0.5 shrink-0">
                                  {db.tableCount} 表
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-2xs px-1 py-0 h-4 border-amber-500/30 text-amber-600 bg-amber-500/10 gap-0.5 shrink-0">
                                  未初始化
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                              <span>{formatSize(db.sizeBytes)}</span>
                              <span>·</span>
                              <span>{new Date(db.mtime).toLocaleDateString('zh-CN')} {new Date(db.mtime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Manual path input (fallback) */}
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                    手动输入路径（高级）
                  </summary>
                  <div className="mt-2">
                    <Input
                      value={existingPath}
                      onChange={(e) => { setExistingPath(e.target.value); setSelectedDbUrl(null) }}
                      placeholder="/path/to/existing.db 或 ./db/backup.db"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </details>

                <div className="rounded-md bg-sky-500/5 border border-sky-500/20 p-3 text-xs text-sky-700 dark:text-sky-300">
                  <ShieldCheck className="h-3.5 w-3.5 inline mr-1" />
                  若该文件缺少 PDB Tracker 所需的表结构，会自动运行 <code className="font-mono text-[10px]">prisma db push</code> 补全，不会清空已有数据。
                </div>
                <div className="flex justify-between gap-2 pt-2">
                  <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setMode('choose')}>
                    <ArrowLeft className="h-3 w-3 mr-1" /> 上一步
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleSelect(selectedDbUrl || undefined)}
                    disabled={!selectedDbUrl && !existingPath.trim()}
                  >
                    <FolderOpen className="h-3 w-3 mr-1" /> 切换到此数据库
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: working ────────────────────────────────────── */}
            {mode === 'working' && (
              <motion.div
                key="working"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <Loader2 className="h-8 w-8 animate-spin text-claude-accent" />
                <p className="text-sm text-foreground">{workingMsg}</p>
                <p className="text-xs text-muted-foreground">正在初始化表结构，请稍候…</p>
              </motion.div>
            )}

            {/* ── Step 4a: done ──────────────────────────────────────── */}
            {mode === 'done' && resultStatus && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">数据库已就绪</div>
                    <div className="text-xs text-muted-foreground mt-1 break-all font-mono">
                      {resultStatus.activeFsPath}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-700 bg-emerald-500/10">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> 表结构已初始化
                      </Badge>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {resultStatus.tableCount} 表
                      </Badge>
                      {!resultStatus.isTest && (
                        <Badge variant="outline" className="text-[10px] h-5 border-sky-500/30 text-sky-700 bg-sky-500/10">
                          <ShieldCheck className="h-2.5 w-2.5 mr-0.5" /> 正式数据库
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                  <div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-muted-foreground" />
                    当前数据库内容统计
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <CountCell label="PDB 结构" value={resultStatus.counts?.PdbStructure ?? 0} icon={<FileText className="h-3 w-3" />} />
                    <CountCell label="评估记录" value={resultStatus.counts?.Evaluation ?? 0} icon={<FlaskConical className="h-3 w-3" />} />
                    <CountCell label="PubMed 论文" value={resultStatus.counts?.PubMedArticle ?? 0} icon={<FileText className="h-3 w-3" />} />
                    <CountCell label="周报" value={resultStatus.counts?.WeeklyReport ?? 0} icon={<FileText className="h-3 w-3" />} />
                    <CountCell label="运行记录" value={resultStatus.counts?.SkillRunRecord ?? 0} icon={<Database className="h-3 w-3" />} />
                    <CountCell label="快照" value={resultStatus.counts?.WeeklySnapshot ?? 0} icon={<Database className="h-3 w-3" />} />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 leading-relaxed">
                  <Database className="h-3 w-3 inline mr-1" />
                  运行中心与 ① 文献 / ② 评估 / ③ 周报三大模块现在都读写这个数据库。运行中心写入的内容会立即在前端可读。
                </div>

                <div className="flex justify-end pt-2">
                  <Button size="sm" className="h-8 text-xs" onClick={handleFinish}>
                    开始使用 <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── Step 4b: error ─────────────────────────────────────── */}
            {mode === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
                  <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-rose-700 dark:text-rose-300">操作失败</div>
                    <div className="text-xs text-muted-foreground mt-1 break-all">{errorMsg}</div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleRetry}>
                    返回重试
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CountCell({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-background/60 border border-border/40">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto font-mono font-semibold text-foreground">{value}</span>
    </div>
  )
}

export default DbSetupWizard
