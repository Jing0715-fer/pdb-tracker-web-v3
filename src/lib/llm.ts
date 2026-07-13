/**
 * Shared LLM helper.
 *
 * Provider selection policy (NO z-ai, NO hardcoded absolute paths):
 *
 *   The first time a model call is made (or on explicit `inspectProviders()`)
 *   we **probe** each candidate. A candidate is considered *available* only if
 *   its binary resolves on PATH (via `where`/`which`) and a tiny smoke-test
 *   invocation succeeds within a 6-second budget. That probe is cached for
 *   the lifetime of the Node process.
 *
 *   At call time `generateText` / `llmComplete` walks the candidate list in
 *   the user-requested order (or auto order), and on the first failed call it
 *   cleanly falls through to the next candidate. We never fabricate output.
 *
 *   Each CLI has a tiny *adapter* table — name, smoke-test args, real-call
 *   arg template, output-stream hint (stdout|stderr|both), and a regex to
 *   strip the leading "session_id: ..." banner that some agents emit on
 *   stderr. Adding a new CLI = adding one entry to `CLI_ADAPTERS`.
 */

import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface LlmConfig {
  /** One of: 'cli:hermes' | 'cli:claude' | 'cli:codex' | 'cli:openclaw' | 'cli:gemini' | 'cli:aider' | 'anthropic' | 'openai' | '' (auto) */
  provider?: string;
  model?: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmResult {
  ok: boolean;
  content: string;
  /** Alias for `content` — legacy callers read `.text`. */
  text: string;
  provider: string;
  model: string;
  durationMs: number;
  fallback: boolean;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface LlmProviderInfo {
  provider: string;
  /** Resolved binary path if a CLI provider; null for SDK providers. */
  bin: string | null;
  /** UI icon — single emoji chosen to loosely match the original brand. */
  icon: string;
  /** When set, the UI should render <img src={iconUrl} /> instead of emoji. */
  iconUrl?: string | null;
  label: string;
  reason: string;
  available: boolean;
  /** 'native' (PATH on host OS), 'wsl' (Linux distro via WSL bridge), or 'sdk'. */
  via: 'native' | 'wsl' | 'sdk';
}


// ─── Brand asset resolution (NOT hardcoded) ──────────────────────────────
// When a CLI is detected, climb from its binary directory looking for a
// brand asset (icon.ico / icon.png / assets/icon.svg / logo.png). The list of
// candidate filenames is brand-agnostic so the same discovery works for any
// new CLI we add. Searches up to 5 levels deep and follows standard
// well-known asset paths (resources/, assets/, build/Release/).
async function findBrandIcon(binDir: string, binName: string, brandTokens: string[]): Promise<string | null> {
  // Returns an absolute PATH on disk if found (UI will fetch via /api/llm/icon?path=…)
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    // 1. Candidate icon paths, ordered by fidelity:
    //    ICO (Windows desktop) > PNG > SVG. The outer `candidates` array
    //    is checked in order — first hit wins.
    const candidates: string[] = [];
    for (const tok of brandTokens) {
      // ICO first
      candidates.push(
        `${tok}.ico`,
        path.join('resources', `${tok}.ico`),
        path.join('assets', `${tok}.ico`),
      );
      // PNG second
      candidates.push(
        `${tok}.png`,
        path.join('resources', `${tok}.png`),
        path.join('assets', `${tok}.png`),
      );
      // SVG last (treats .ico as higher-priority brand asset)
      candidates.push(
        `${tok}.svg`,
        path.join('resources', `${tok}.svg`),
        path.join('assets', `${tok}.svg`),
      );
    }
    // Generic fallbacks (icon.ico / icon.png / logo.png / icon.svg)
    candidates.push('icon.ico', 'logo.png', 'icon.png', 'logo.svg', 'icon.svg');

    // Walk up from binary dir, at most 8 levels. At each level, scan the
    // immediate `dir` PLUS a few common sibling subdirs (apps/*/release/*/resources,
    // build/Release, etc.) because Electron-packaged CLIs frequently keep
    // their icon under e.g. `apps/desktop/release/win-unpacked/resources/`.
    let _scanDir = binDir;
    const _scanRoots: string[] = [];
    for (let i = 0; i < 6; i++) {
      _scanRoots.push(_scanDir);
      const _parent = path.dirname(_scanDir);
      if (_parent === _scanDir) break;
      _scanDir = _parent;
    }
    const _ebRoots: string[] = [];
    for (const _root of _scanRoots) {
      try {
        const _items = await fs.readdir(_root, { withFileTypes: true });
        for (const _it of _items) {
          if (!_it.isDirectory()) continue;
          // Electron-builder: apps/<app>/release/<platform>/resources/
          if (_it.name === 'apps') {
            try {
              const _appsDir = path.join(_root, 'apps');
              const _appEntries = await fs.readdir(_appsDir, { withFileTypes: true });
              for (const _appEnt of _appEntries) {
                if (!_appEnt.isDirectory()) continue;
                const _appPath = path.join(_appsDir, _appEnt.name);
                _ebRoots.push(path.join(_appPath, 'release'));
              }
            } catch { /* keep going */ }
          }
          // `release` dir directly
          if (_it.name === 'release' || _it.name === 'releases') {
            _ebRoots.push(path.join(_root, _it.name));
          }
        }
      } catch { /* keep going */ }
    }
    for (const _relRoot of _ebRoots) {
      try {
        const _platformEntries = await fs.readdir(_relRoot, { withFileTypes: true });
        for (const _pe of _platformEntries) {
          if (!_pe.isDirectory()) continue;
          const _resDir = path.join(_relRoot, _pe.name, 'resources');
          for (const _fname of ['icon.ico', 'icon.png', 'logo.ico', 'logo.png', 'icon.svg', 'logo.svg']) {
            const _abs = path.join(_resDir, _fname);
            try {
              const _st = await fs.stat(_abs);
              if (_st.isFile() && _st.size > 200) return _abs;
            } catch { /* keep looking */ }
          }
        }
      } catch { /* keep going */ }
    }

    // Generic walk afterwards.
    let dir = binDir;
    for (let depth = 0; depth < 8; depth++) {
      // 1) current dir — single ordered candidates list
      for (const rel of candidates) {
        const abs = path.resolve(dir, rel);
        try {
          const st = await fs.stat(abs);
          if (st.isFile() && st.size > 200) return abs;
        } catch { /* keep looking */ }
      }
      // 2) Sibling subdirs + 2-level descent into well-known bundled-app layouts.
      //    Herme s Electron app stores its icon at apps/desktop/release/<platform>/resources/.
      //    Generic patterns that cover Electron-builder / Electron Forge / Tauri:
      //      apps/<app>/release/<platform>/resources/
      //      <brand>-desktop/release/<platform>/resources/
      //      bin/<brand>/resources/
      //    We only enter them when the directory name matches a brand token or
      //    a known desktop-app directory, to keep the search fast.
      const descendantSubdirs: string[] = [];
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const ent of entries) {
          if (!ent.isDirectory()) continue;
          const subPath = path.resolve(dir, ent.name);
          if (/(^|[\\/])(node_modules|venv|env|\.venv|site-packages|dist|build|\.git|node_modules\.cache)$/i.test(subPath)) continue;
          // Single-level: check immediate children for icon files.
          for (const rel of candidates) {
            const abs = path.resolve(subPath, rel);
            try {
              const st = await fs.stat(abs);
              if (st.isFile() && st.size > 200) return abs;
            } catch { /* keep looking */ }
          }
          // Multi-level: descend into `apps`, `releases`, `desktop`, etc.
          if (/(^|[\\/])(apps?|releases?|desktop|release|bin|out|target|dist-app|app)$/i.test(ent.name)) {
            descendantSubdirs.push(subPath);
          }
        }
      } catch { /* dir unreadable */ }
      // Descend up to 2 extra levels into flagged sibling dirs.
      // This handles `apps/desktop/release/<platform>/resources/icon.ico`
      // (Electron-builder layout) and `<x>-desktop/release/<platform>/resources/...`.
      const seen = new Set<string>();
      const visitDescendants = async (root: string) => {
        try {
          const entries = await fs.readdir(root, { withFileTypes: true });
          for (const ent of entries) {
            if (!ent.isDirectory()) continue;
            const subPath = path.resolve(root, ent.name);
            if (seen.has(subPath)) continue;
            seen.add(subPath);
            // Single candidate check (ordered list, ICO > PNG > SVG).
            for (const rel of candidates) {
              const abs = path.resolve(subPath, rel);
              try {
                const st = await fs.stat(abs);
                if (st.isFile() && st.size > 200) return abs;
              } catch { /* keep looking */ }
            }
            // Look for common Electron-builder intermediate dirs; descend one more level.
            if (/(^|[\\/])(desktop|release|releases|target|win-unpacked|linux-unpacked|mac|macos|darwin|windows|win64|win32|app)$/i.test(ent.name)) {
              const found = await visitDescendants(subPath);
              if (found) return found;
            }
          }
        } catch { /* dir unreadable */ }
        return null;
      };
      for (const sub of descendantSubdirs) {
        const found = await visitDescendants(sub);
        if (found) return found;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch { /* no fs access */ }
  return null;
}

// Map each CLI id to brand tokens used for icon discovery.
function brandTokensFor(id: string): string[] {
  switch (id) {
    case 'hermes':     return ['hermes', 'icon'];
    case 'claude':     return ['claude', 'claude-code', 'icon', 'logo'];
    case 'codex':      return ['codex', 'openai', 'icon', 'logo'];
    case 'openclaw':   return ['openclaw', 'icon', 'logo'];
    case 'gemini':     return ['gemini', 'google-gemini', 'icon', 'logo'];
    case 'aider':      return ['aider', 'icon', 'logo'];
    default:           return ['icon', 'logo'];
  }
}

// ─── Adapter table ────────────────────────────────────────────────────────────

interface CliAdapter {
  /** Public id used in LlmConfig.provider ("cli:<id>"). */
  id: string;
  /** Display name. */
  label: string;
  /** Brand-matching icon (emoji that visually resembles the original logo). */
  icon: string;
  /** CLI binary name to resolve on PATH. */
  bin: string;
  /** Optional override for the binary name when invoked inside WSL. */
  wslBin?: string;
  /**
   * Lightweight args used by the probe — must exit quickly with success.
   * We default to `['--version']` because it always exits 0 fast without
   * hitting the model API; per-CLI overrides only when --version is
   * unsupported.
   */
  probeArgs?: string[];
  /**
   * Optional probe that just *prints* `ok` (no LLM round trip). Use this if
   * the CLI has no fast --version flag.
   */
  probeCommand?: 'silent-read';
  /** Real-call args template. */
  callArgs: (prompt: string, model: string | undefined) => string[];
  /** Which stream(s) carry the actual text response. */
  outputStream: 'stdout' | 'stderr' | 'both';
  /** Strip leading non-text banner lines (e.g. "session_id: …"). */
  stripBanner?: (raw: string) => string;
  /** Per-call extra env (e.g. PYTHONIOENCODING). */
  extraEnv?: Record<string, string>;
  /** Probe timeout (ms). Default 6000. */
  probeTimeoutMs?: number;
  /** Call timeout (ms). Default 240000. */
  callTimeoutMs?: number;
}

const HERMES_BANNER_RE = /(?:^|\n)\s*session_id:\s*\S+\s*(?=\n|$)/i;

const CLI_ADAPTERS: CliAdapter[] = [
  {
    id: 'hermes',
    label: 'Hermes CLI',
    bin: 'hermes',
    icon: '🪶',
    wslBin: 'hermes',
    probeArgs: ['--version'],
    // `hermes chat -q "..." -Q` runs a one-shot query in quiet mode (no TUI).
    // We KEEP the user's model/provider config (no `--ignore-user-config`)
    // so the agent honours whatever default the user has set (e.g. MiniMax).
    callArgs: (q) => ['chat', '-q', q, '-Q'],
    outputStream: 'both',
    stripBanner: (raw) => raw.replace(HERMES_BANNER_RE, '').trim(),
    extraEnv: { PYTHONIOENCODING: 'utf-8' },
    probeTimeoutMs: 15_000,
    // Hermes CLI may need >5min for large reports (e.g. 4000-char full report).
    // Override globally with HERMES_CLI_TIMEOUT_MS env (e.g. `set HERMES_CLI_TIMEOUT_MS=900000`).
    callTimeoutMs: Number(process.env.HERMES_CLI_TIMEOUT_MS) || 600_000,
  },
  {
    id: 'claude',
    label: 'Claude Code CLI',
    bin: 'claude',
    icon: '🟠',
    wslBin: 'claude',
    probeArgs: ['--version'],
    // Claude Code supports `claude -p "..."` (print mode, non-interactive).
    callArgs: (q) => ['-p', q, '--no-stream'],
    outputStream: 'stdout',
    probeTimeoutMs: 15_000,
    callTimeoutMs: 240_000,
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    bin: 'codex',
    icon: '🟢',
    wslBin: 'codex',
    probeArgs: ['--version'],
    callArgs: (q) => ['exec', '--quiet', q],
    outputStream: 'stdout',
    probeTimeoutMs: 15_000,
    callTimeoutMs: 240_000,
  },
  {
    id: 'openclaw',
    label: 'OpenClaw CLI',
    bin: 'openclaw',
    icon: '🦅',
    wslBin: 'openclaw',
    probeArgs: ['--version'],
    callArgs: (q) => ['llm', 'chat', '--no-stream', q],
    outputStream: 'stdout',
    probeTimeoutMs: 15_000,
    callTimeoutMs: 240_000,
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    bin: 'gemini',
    icon: '♊',
    wslBin: 'gemini',
    probeArgs: ['--version'],
    callArgs: (q) => [q],
    outputStream: 'stdout',
    probeTimeoutMs: 15_000,
    callTimeoutMs: 240_000,
  },
  {
    id: 'codebuddy',
    label: 'Codebuddy / WorkBuddy CLI',
    icon: '🐼',
    bin: 'codebuddy',
    needsNode: true,
    /** Hard-coded fallback for WorkBuddy's bundled CLI:
     *  `C:\Program Files\WorkBuddy\resources\app.asar.unpacked\cli\bin\codebuddy`.
     *  PATH rarely has it; we try this absolute location first. Env override:
     *  `CODEBUDDY_CLI_PATH=...`. */
    extraProbePaths: [
      process.platform === 'win32'
        ? 'C:\\Program Files\\WorkBuddy\\resources\\app.asar.unpacked\\cli\\bin\\codebuddy'
        : '/usr/local/bin/codebuddy',
    ],
    /** Headless invocation — same flag set used by Claude Code-style CLIs.
     *  `--print "<prompt>"` emits a single text reply on stdout and exits.
     *  For streaming, append `--output-format stream-json` (NDJSON events).
     *  For interactive TUI/REPL, omit `--print`. */
    callArgs: (q, model) => {
      // Default to deepseek-v4-pro for WorkBuddy CLI; user can override via the
      // LLM 高级配置 → model field in the Run Center.
      const m = model || process.env.CODEBUDDY_MODEL || 'deepseek-v4-pro';
      return ['--print', '--model', m, q];
    },
    outputStream: 'stdout',
    probeTimeoutMs: 15_000,
    callTimeoutMs: 240_000,
    extraEnv: { PYTHONIOENCODING: 'utf-8' },
  },
  {
    id: 'aider',
    label: 'Aider CLI',
    bin: 'aider',
    icon: '🛠️',
    wslBin: 'aider',
    probeArgs: ['--version'],
    callArgs: (q) => ['--message', q, '--no-git', '--yes', '--no-auto-commits'],
    outputStream: 'stdout',
    probeTimeoutMs: 15_000,
    callTimeoutMs: 240_000,
  },
];

// ─── PATH-based resolver (cross-platform, no hardcoded paths) ────────────────


/** Read the Lxss registry to enumerate installed WSL distros + the default one. */
function wslRegistryInfo(): { defaultDistro: string; distros: string[] } | null {
  if (process.platform !== 'win32') return null;
  try {
    // execSync imported at top of file; safe since we already gated on `process.platform === 'win32'`.
    // `reg query` enumerates distros; use ASCII codepage to avoid UTF-8 decode errors.
    const out = execSync('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Lxss" /s', {
      timeout: 5_000,
      encoding: 'buffer',
      windowsHide: true,
    });
    const text = Buffer.from(out).toString('latin1');
    const uuids: string[] = [];
    const uuid2name: Record<string, string> = {};
    let defaultDistro = '';
    // Split into per-subkey blocks
    const blocks = text.split(/\r?\n\s*\r?\n/);
    for (const blk of blocks) {
      const uuidMatch = blk.match(/\\\\([\w-]{36})\s*$/m);
      if (!uuidMatch) continue;
      const uuid = uuidMatch[1];
      uuids.push(uuid);
      const nameMatch = blk.match(/DistributionName\s+REG_SZ\s+(.+)/);
      if (nameMatch) uuid2name[uuid] = nameMatch[1].trim();
    }
    const defaultMatch = text.match(/DefaultDistribution\s+REG_SZ\s+\{?([\w-]+)\}?/);
    if (defaultMatch) {
      const uuid = defaultMatch[1];
      defaultDistro = uuid2name[uuid] || uuid;
    }
    const distros = uuids.map((u) => uuid2name[u] || u).filter(Boolean);
    if (distros.length === 0) return null;
    return { defaultDistro: defaultDistro || distros[0], distros };
  } catch { return null; }
}

/** Resolve the WSL distro name to invoke. Priority: WSL_DISTRO env > WSLRegistry default > "Debian". */
function wslTargetDistro(): string {
  return process.env.WSL_DISTRO || 'Debian';
}

/** Lightweight readiness check — runs `true` in the default distro. Long timeout because
 * WSL often needs 30-60s on first launch. */
function wslAvailable(): Promise<boolean> {
  if (process.platform !== 'win32') return Promise.resolve(false);
  const info = wslRegistryInfo();
  if (!info) return Promise.resolve(false);
  const distro = wslTargetDistro();
  return new Promise<boolean>((resolve) => {
    let done = false;
    const finish = (b: boolean) => { if (!done) { done = true; resolve(b); } };
    try {
      const child = spawn('wsl.exe', ['-d', distro, '--', 'true'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      child.on('error', () => finish(false));
      child.on('close', (code) => finish(code === 0));
    } catch { finish(false); }
    // 45s ceiling — first WSL invocation can need that much; subsequent calls are fast.
    setTimeout(() => finish(false), 45_000);
  });
}

/** Run `bash -lc '...'` inside the configured WSL distro and capture stdout/stderr. */
function runInWsl(bashCmd: string, timeoutMs = 300_000): Promise<{ code: number; stdout: string; stderr: string }> {
  const distro = wslTargetDistro();
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (code: number, stdout: string, stderr: string) => {
      if (done) return;
      done = true;
      resolve({ code, stdout, stderr });
    };
    try {
      const child = spawn('wsl.exe', ['-d', distro, '--', 'bash', '-lc', bashCmd], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      let stdout = '';
      let stderr = '';
      const killTimer = setTimeout(() => {
        try { child.kill(); } catch {}
        finish(124, stdout, stderr);
      }, timeoutMs);
      child.stdout.on('data', (b) => { stdout += b.toString(); });
      child.stderr.on('data', (b) => { stderr += b.toString(); });
      child.on('error', (err) => { clearTimeout(killTimer); finish(1, stdout, stderr + '\nspawn: ' + err.message); });
      child.on('close', (code) => { clearTimeout(killTimer); finish(code ?? -1, stdout, stderr); });
    } catch (err) {
      // Make sure promise resolves even if spawn throws synchronously.
      finish(1, '', 'spawn: ' + (err as Error).message);
    }
  });
}

/** Try to find `bin` inside WSL PATH. Returns path or null. */
async function findOnWsl(bin: string): Promise<string | null> {
  try {
    const r = await runInWsl(`command -v ${bin} 2>/dev/null || which ${bin} 2>/dev/null`, 30_000);
    if (r.code !== 0) return null;
    const first = r.stdout.split('\n').map((line) => line.trim()).find(Boolean);
    return first || null;
  } catch { return null; }
}


/** Resolve `bin` on PATH. Uses `where` (Windows) / `which` (POSIX). Returns absolute path or null. */
function findOnPath(bin: string, extras?: string[]): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let resolved = false;
    // 1. Hard-coded extras (e.g. WorkBuddy's bundled CLI).
    if (extras) {
      for (const p of extras) {
        if (resolved) break;
        try {
          if (existsSync(p)) { resolved = true; resolve(p); return; }
        } catch { /* keep looking */ }
      }
    }
    // 2. ${BIN}_CLI_PATH env override.
    if (!resolved) {
      const envKey = bin.toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_CLI_PATH';
      const envPath = process.env[envKey];
      if (envPath) {
        try {
          if (existsSync(envPath)) { resolved = true; resolve(envPath); return; }
        } catch { /* keep looking */ }
      }
    }
    // 3. PATH lookup (where / which).
    if (resolved) return;
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const r = spawn(cmd, [bin], { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let out = '';
    r.stdout.on('data', (b) => { out += b.toString(); });
    r.on('error', () => { if (!resolved) { resolved = true; resolve(null); } });
    r.on('close', (code) => {
      if (resolved) return;
      resolved = true;
      if (code !== 0) return resolve(null);
      const first = out.split('\n').map((line) => line.trim()).find(Boolean);
      resolve(first || null);
    });
  });
}

// ─── Probe (smoke test) ───────────────────────────────────────────────────────

interface ProbeOk  { ok: true; bin: string; reason: string }
interface ProbeErr { ok: false; reason: string }

async function probeCli(adapter: CliAdapter): Promise<ProbeOk | ProbeErr> {
  const bin = await findOnPath(adapter.bin, adapter.extraProbePaths);
  if (!bin) return { ok: false, reason: `${adapter.label} not found on PATH` };

  // Default to a fast --version probe; skip if not provided.
  const args = adapter.probeArgs ?? ['--version'];
  const probeTimeout = adapter.probeTimeoutMs ?? 6_000;

  return new Promise((resolve) => {
    // WorkBuddy-style shims are Node.js scripts — launch via `node <bin> ...args`
    const child = adapter.needsNode
      ? spawn(process.execPath, [bin, ...args], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...adapter.extraEnv } })
      : spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...adapter.extraEnv } });
    let stdout = '';
    let stderr = '';
    let done = false;
    const finish = (r: ProbeOk | ProbeErr) => { if (!done) { done = true; resolve(r); } };
    const killTimer = setTimeout(() => { try { child.kill(); } catch {} finish({ ok: false, reason: `${adapter.label} probe timed out (${probeTimeout}ms)` }); }, probeTimeout);
    child.stdout.on('data', (b) => { stdout += b.toString(); });
    child.stderr.on('data', (b) => { stderr += b.toString(); });
    child.on('error', (err) => { clearTimeout(killTimer); finish({ ok: false, reason: `${adapter.label} spawn failed: ${err?.message}` }); });
    child.on('close', (code) => {
      clearTimeout(killTimer);
      const combined = (stdout + '\n' + stderr).trim();
      if (code === 0 && combined.length > 0) {
        finish({ ok: true, bin, reason: `${adapter.label} found at ${bin}` });
      } else {
        finish({ ok: false, reason: `${adapter.label} probe failed (exit=${code}, ${combined.slice(0, 120)})` });
      }
    });
  });
}

// ─── Probe cache (per-process) ────────────────────────────────────────────────

interface AdapterProbes {
  native?: ProbeOk | ProbeErr;
  wsl?: ProbeOk | ProbeErr;
}

let _probeCache: Promise<Record<string, AdapterProbes>> | null = null;
function probeAll(): Promise<Record<string, AdapterProbes>> {
  if (_probeCache) return _probeCache;
  _probeCache = (async () => {
    // Kick off WSL check in the background. Native probes return immediately so the UI is
    // responsive; WSL entries appear later when the readiness probe + per-CLI probes finish.
    const out: Record<string, AdapterProbes> = {};
    // Native probes always run first (fast — typically <1s).
    await Promise.all(CLI_ADAPTERS.map(async (a) => {
      out[a.id] = { native: await probeCli(a) };
    }));
    // Now wait for WSL readiness (long, up to 45s on first launch).
    if (process.platform === 'win32') {
      const wsl = await wslAvailable();
      if (wsl) {
        const wslResults = await Promise.all(
          CLI_ADAPTERS.map((a) => probeCliInWsl(a).then((r) => ({ id: a.id, r })))
        );
        for (const { id, r } of wslResults) {
          out[id] = { ...(out[id] ?? {}), wsl: r };
        }
      }
    }
    return out;
  })();
  return _probeCache;
}

/** Run the same probe as `probeCli` but inside WSL bash. */
async function probeCliInWsl(adapter: CliAdapter): Promise<ProbeOk | ProbeErr> {
  const wslBin = adapter.wslBin ?? adapter.bin;
  // Pre-check whether the binary exists in WSL PATH first (avoids spawning failing commands).
  const wslPath = await findOnWsl(wslBin);
  if (!wslPath) return { ok: false, reason: `${adapter.label} not found inside WSL` };
  const args = adapter.probeArgs ?? ['--version'];
  const bashCmd = `${wslBin} ${args.map((a) => JSON.stringify(a)).join(' ')}`;
  const probeTimeout = adapter.probeTimeoutMs ?? 6_000;
  try {
    // Use GNU `timeout` (always in WSL) to hard-cap the probe; and `command -v` already
    // confirmed the binary exists. code === 124 from GNU timeout counts as success when
    // there is any output (some CLIs print version then wait).
    const r = await runInWsl(`timeout ${Math.ceil(probeTimeout / 1000)} ${bashCmd} 2>&1`, probeTimeout + 30_000);
    const combined = (r.stdout + '\n' + r.stderr).trim();
    if ((r.code === 0 || r.code === 124) && combined.length > 0) {
      return { ok: true, bin: wslPath, reason: `${adapter.label} found in WSL at ${wslPath}` };
    }
    return { ok: false, reason: `${adapter.label} WSL probe failed (exit=${r.code}, ${combined.slice(0, 120)})` };
  } catch (err: any) {
    return { ok: false, reason: `${adapter.label} WSL probe error: ${err?.message}` };
  }
}

// Allow callers (tests or admin endpoints) to force-refresh.
export function clearLlmProbeCache(): void { _probeCache = null; }

// ─── Provider enumeration (for the front-end settings panel) ──────────────────

export interface InspectProvidersOptions {
  /** When true, include `available: false` entries so the UI can show them dim. Default false. */
  showUnavailable?: boolean;
  /** Optional list of provider ids the user has whitelisted (others hidden). */
  whitelist?: string[];
}

export async function inspectProviders(opts: InspectProvidersOptions = {}): Promise<{
  chosen: string;
  available: LlmProviderInfo[];
  totalClisScanned: number;
}> {
  const probes = await probeAll();
  const available: LlmProviderInfo[] = [];

  let totalClisScanned = 0;
  for (const a of CLI_ADAPTERS) {
    totalClisScanned++;
    const probePair = probes[a.id] ?? {};
    if (probePair.native?.ok) {
      available.push({
        provider: `cli:${a.id}`,
        bin: probePair.native.bin,
        icon: a.icon,
        label: a.label,
        reason: probePair.native.reason,
        available: true,
        via: 'native',
      });
    }
    if (probePair.wsl?.ok) {
      // Use a different provider id so the user can pick native vs wsl explicitly.
      available.push({
        provider: `cli:${a.id}`,
        bin: probePair.wsl.bin,
        icon: a.icon,
        label: `${a.label} (WSL)`,
        reason: probePair.wsl.reason,
        available: true,
        via: 'wsl',
      });
    }
    if (!probePair.native?.ok && !probePair.wsl?.ok) {
      const why = probePair.native?.reason || probePair.wsl?.reason || `${a.label} not found`;
      // Surface a single 'unavailable' entry (the UI can render it dim).
      available.push({
        provider: `cli:${a.id}`,
        bin: null,
        icon: a.icon,
        label: a.label,
        reason: why,
        available: false,
        via: 'native',
      });
    }
  }

  // Anthropic SDK
  const anthropicAvailable = !!process.env.ANTHROPIC_API_KEY;
  available.push({
    provider: 'anthropic',
    bin: null,
    icon: '🤖',
    iconUrl: null,
    label: 'Anthropic SDK',
    reason: anthropicAvailable ? 'ANTHROPIC_API_KEY is set' : 'ANTHROPIC_API_KEY not set',
    available: anthropicAvailable,
    via: 'sdk',
  });

  const openaiAvailable = !!process.env.OPENAI_API_KEY;
  available.push({
    provider: 'openai',
    bin: null,
    icon: '🧠',
    iconUrl: null,
    label: 'OpenAI SDK',
    reason: openaiAvailable ? 'OPENAI_API_KEY is set' : 'OPENAI_API_KEY not set',
    available: openaiAvailable,
    via: 'sdk',
  });

  const chosen = available.find((p) => p.available)?.provider || 'cli:hermes';
  // Apply visibility filters for the front-end.
  const showAll = !!opts.showUnavailable;
  const wl = opts.whitelist && opts.whitelist.length > 0 ? new Set(opts.whitelist) : null;

  // Resolve brand icons in parallel for available entries.
  const iconPromises = available.map((p) => {
    if (!p.available) return Promise.resolve(p);
    return resolveIconFor(p.provider.replace(/^cli:/, ''), p.bin).then((iconUrl) => ({ ...p, iconUrl }));
  });
  const withIcons = await Promise.all(iconPromises);

  const filtered = withIcons.filter((p) => {
    if (wl && !wl.has(p.provider)) return false;
    if (!showAll && !p.available) return false;
    return true;
  });
  return { chosen, available: filtered, totalClisScanned };
}

export function resolveLlmConfig(overrides?: LlmConfig): LlmConfig & { resolvedProvider: string } {
  const envProvider = process.env.LLM_PROVIDER || '';
  const provider = (overrides?.provider || envProvider || '').trim() || 'auto';
  const model = (overrides?.model || process.env.LLM_MODEL || '').trim() || undefined;
  return { ...overrides, provider, model, resolvedProvider: provider };
}

// ─── High-level text-in / text-out ────────────────────────────────────────────

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  opts: { maxChars?: number; llm?: LlmConfig } = {},
): Promise<LlmResult> {
  const t0 = Date.now();
  const maxChars = opts.maxChars ?? 4000;
  const cfg = resolveLlmConfig(opts.llm);
  const r = await callAnyLlm(userPrompt, { ...cfg, system: cfg.system || systemPrompt });
  if (r.ok) {
    const content = (r.content || '').slice(0, maxChars);
    return {
      ok: true,
      content,
      text: content,
      provider: r.provider,
      model: r.model,
      durationMs: Date.now() - t0,
      fallback: false,
      meta: r.meta,
    };
  }
  return {
    ok: false,
    content: '',
    text: '',
    provider: r.provider,
    model: r.model,
    durationMs: Date.now() - t0,
    fallback: false,
    error: r.error,
  };
}

/** Per-paper one-line digest (used by module ①). */
export async function generatePaperDigest(title: string, pmid: string): Promise<LlmResult> {
  return generateText(
    '你是结构生物学领域的资深研究员。请用一句中文（不超过 40 字）概括这篇论文的核心发现，要求准确、简洁、专业。',
    `论文标题：${title}\nPMID: ${pmid}`,
    { maxChars: 120 },
  );
}

// ─── Core dispatch with fallback ──────────────────────────────────────────────

async function callAnyLlm(
  prompt: string,
  cfg: LlmConfig & { resolvedProvider: string; system: string },
): Promise<LlmResult> {
  const probes = await probeAll();
  const order = decideProviderOrder(cfg.resolvedProvider, cfg.model);

  const errors: string[] = [];
  for (const item of order) {
    const id = item.id;
    const via = item.via;
    if (id.startsWith('cli:')) {
      const adapter = CLI_ADAPTERS.find((a) => `cli:${a.id}` === id);
      if (!adapter) continue;
      const probePair = probes[adapter.id] ?? {};
      const probe = via === 'wsl' ? probePair.wsl : probePair.native;
      if (!probe?.ok) {
        errors.push(`${id}${via ? `(${via})` : ''}: ${probe?.reason ?? 'unavailable'}`);
        continue;
      }
      try {
        const t0 = Date.now();
        const text = via === 'wsl'
          ? await runCliInWsl(adapter, probe.bin, prompt, cfg.model)
          : await runCli(adapter, probe.bin, prompt, cfg.model);
        return {
          ok: true,
          content: text,
          text,
          provider: id,
          model: cfg.model || adapter.id,
          durationMs: Date.now() - t0,
          fallback: item.fallback,
          meta: { cli: probe.bin, via: via ?? 'native' },
        };
      } catch (err: any) {
        // ★ Fallback to the next provider on failure.
        errors.push(`${id}${via ? `(${via})` : ''}: ${err?.message ?? String(err)}`);
        continue;
      }
    }
    if (id === 'anthropic') {
      if (!process.env.ANTHROPIC_API_KEY) { errors.push('anthropic: ANTHROPIC_API_KEY not set'); continue; }
      try {
        const t0 = Date.now();
        const text = await callAnthropic(prompt, cfg.system, cfg.model);
        return {
          ok: true,
          content: text,
          text,
          provider: id,
          model: cfg.model || 'claude-3-5-sonnet-latest',
          durationMs: Date.now() - t0,
          fallback: false,
        };
      } catch (err: any) {
        errors.push(`anthropic: ${err?.message ?? String(err)}`);
        continue;
      }
    }
    if (id === 'openai') {
      if (!process.env.OPENAI_API_KEY) { errors.push('openai: OPENAI_API_KEY not set'); continue; }
      try {
        const t0 = Date.now();
        const text = await callOpenai(prompt, cfg.system, cfg.model);
        return {
          ok: true,
          content: text,
          text,
          provider: id,
          model: cfg.model || 'gpt-4o-mini',
          durationMs: Date.now() - t0,
          fallback: false,
        };
      } catch (err: any) {
        errors.push(`openai: ${err?.message ?? String(err)}`);
        continue;
      }
    }
  }

  return {
    ok: false,
    content: '',
    text: '',
    provider: cfg.resolvedProvider,
    model: cfg.model || '',
    durationMs: 0,
    fallback: false,
    error: `No LLM provider succeeded. Tried ${order.length} candidate(s): ${errors.join('; ')}`,
  };
}

interface OrderedProvider {
  id: string;
  via?: 'native' | 'wsl';
  /** True when not the user-requested provider (i.e. fallback). */
  fallback: boolean;
}

function decideProviderOrder(requested: string, _model?: string): OrderedProvider[] {
  // Auto order: native CLI first, then WSL CLI mirrors, then SDK fallbacks.
  const cliIds = CLI_ADAPTERS.map((a) => `cli:${a.id}`);
  const auto: OrderedProvider[] = [];
  for (const id of cliIds) auto.push({ id, via: 'native', fallback: requested !== id });
  for (const id of cliIds) auto.push({ id, via: 'wsl', fallback: requested !== id });
  auto.push({ id: 'anthropic', fallback: true });
  auto.push({ id: 'openai', fallback: true });

  if (!requested || requested === 'auto' || requested === 'zai') {
    return auto.map((p) => ({ ...p, fallback: false }));
  }
  // Promote requested to first.
  const requestedProvider = auto.find((p) => p.id === requested);
  const rest = auto.filter((p) => p.id !== requested);
  return [{ ...(requestedProvider ?? { id: requested, fallback: false }), fallback: false }, ...rest];
}

// ─── CLI subprocess runner ────────────────────────────────────────────────────

/**
 * Compute per-call timeout. Hermes specifically scales with prompt size — a 10k-char
 * full report takes ~5-10 minutes; a short query returns in ~30s. We choose the larger
 * of the adapter default and `60s + 30ms-per-char` heuristic.
 */
function computeCliTimeoutMs(adapter: CliAdapter, prompt: string): number {
  const base = adapter.callTimeoutMs ?? 240_000;
  const heuristic = 60_000 + prompt.length * 30;
  return Math.max(base, heuristic);
}

function runCli(adapter: CliAdapter, bin: string, prompt: string, model: string | undefined): Promise<string> {
  const args = adapter.callArgs(prompt, model);
  const timeoutMs = computeCliTimeoutMs(adapter, prompt);

  return new Promise((resolve, reject) => {
    // WorkBuddy-style shims are Node.js scripts — invoke via `node <bin> ...args`.
    const child = adapter.needsNode
      ? spawn(process.execPath, [bin, ...args], {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, ...adapter.extraEnv },
        })
      : spawn(bin, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, ...adapter.extraEnv },
        });

    let stdout = '';
    let stderr = '';
    const killTimer = setTimeout(() => {
      try { child.kill(); } catch {}
      reject(new Error(`${adapter.id} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (b) => { stdout += b.toString(); });
    child.stderr.on('data', (b) => { stderr += b.toString(); });

    child.on('error', (err) => { clearTimeout(killTimer); reject(new Error(`${adapter.id} spawn error: ${err?.message}`)); });
    child.on('close', (code) => {
      clearTimeout(killTimer);
      const raw = adapter.outputStream === 'stdout' ? stdout
                : adapter.outputStream === 'stderr' ? stderr
                : (stdout.trim() + (stderr.includes('\n') ? '\n' : '') + stderr).trim();
      const cleaned = adapter.stripBanner ? adapter.stripBanner(raw) : raw.trim();
      if (cleaned.length > 0) {
        resolve(cleaned);
        return;
      }
      reject(new Error(`${adapter.id} returned empty output (exit=${code}, stderr=${stderr.slice(0, 300)})`));
    });
  });
}

function runCliInWsl(adapter: CliAdapter, wslBin: string, prompt: string, model: string | undefined): Promise<string> {
  // Build a single bash command string that runs the CLI with the same args,
  // then trim the trailing "session_id: ..." banner on stderr if needed.
  const args = adapter.callArgs(prompt, model);
  const escaped = args.map((a) => `'${a.replace(/'/g, `'\\''`)}'`).join(' ');
  const timeoutSec = Math.max(1, Math.ceil((adapter.callTimeoutMs ?? 240_000) / 1000));
  // Use `timeout` (coreutils) to hard-cap total wall time inside WSL.
  const bashCmd = `timeout ${timeoutSec} ${wslBin} ${escaped} 2>&1`;

  // Match the host-side heuristic so WSL mirrors the same scaling.
  const totalTimeout = computeCliTimeoutMs(adapter, prompt) + 15_000;
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const child = spawn('wsl.exe', ['-e', 'bash', '-lc', bashCmd], { stdio: ['ignore', 'pipe', 'pipe'] });
    const killTimer = setTimeout(() => {
      try { child.kill(); } catch {}
      reject(new Error(`${adapter.id} WSL timed out after ${totalTimeout}ms`));
    }, totalTimeout);
    child.stdout.on('data', (b) => { stdout += b.toString(); });
    child.stderr.on('data', (b) => { stderr += b.toString(); });
    child.on('error', (err) => { clearTimeout(killTimer); reject(new Error(`${adapter.id} WSL spawn error: ${err?.message}`)); });
    child.on('close', (code) => {
      clearTimeout(killTimer);
      const raw = (stdout + (stderr ? '\n' + stderr : '')).trim();
      const cleaned = adapter.stripBanner ? adapter.stripBanner(raw) : raw.trim();
      // code === 124 → `timeout` killed it (still might have partial output)
      if (cleaned.length > 0) { resolve(cleaned); return; }
      reject(new Error(`${adapter.id} WSL returned empty output (exit=${code}, stderr=${stderr.slice(0, 300)})`));
    });
  });
}

// ─── SDK providers ────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string, system?: string, model?: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: model || 'claude-3-5-sonnet-latest',
    max_tokens: 4096,
    system: system || 'You are a helpful assistant.',
    messages: [{ role: 'user', content: prompt }],
  });
  const block = resp.content?.[0];
  return (block && block.type === 'text' ? block.text : '') || '';
}

async function callOpenai(prompt: string, system?: string, model?: string): Promise<string> {
  const OpenAI = (await import('openai')).default;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const client = new OpenAI({ apiKey });
  const resp = await client.chat.completions.create({
    model: model || 'gpt-4o-mini',
    messages: [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      { role: 'user' as const, content: prompt },
    ],
  });
  return resp.choices?.[0]?.message?.content || '';
}

// ─── llmComplete (legacy interface used by pdb-weekly/literature-daily/target-eval) ─

export async function llmComplete(prompt: string, cfg?: LlmConfig): Promise<LlmResult> {
  const t0 = Date.now();
  const resolved = resolveLlmConfig(cfg);
  const r = await callAnyLlm(prompt, { ...resolved, system: resolved.system || '' });
  return { ...r, durationMs: r.durationMs || (Date.now() - t0) };
}

// Cache: providerId -> absolute icon path on disk (or null)
let _iconCache: Record<string, string | null> = {};
export function clearLlmIconCache(): void { _iconCache = {}; }
export async function resolveIconFor(id: string, binPath: string | null): Promise<string | null> {
  if (id in _iconCache) return _iconCache[id];
  if (!binPath) { _iconCache[id] = null; return null; }
  const path = await import('node:path');
  const binDir = path.dirname(binPath);
  const icon = await findBrandIcon(binDir, id, brandTokensFor(id));
  _iconCache[id] = icon;
  return icon;
}
