import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { chromium, firefox, webkit } from 'playwright'

const root = process.cwd()
const port = Number.parseInt(process.env.BENCH_PORT ?? '4183', 10)
const baseURL = `http://127.0.0.1:${port}`
const browsers = [
  ['chromium', chromium],
  ['firefox', firefox],
  ['webkit', webkit],
]

const mimeTypes = {
  '.js': 'text/javascript',
  '.map': 'application/json',
}

function safeResolve(base, pathname) {
  const resolved = resolve(base, '.' + pathname)
  if (!resolved.startsWith(base)) return null
  return resolved
}

function startServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', baseURL)
    if (url.pathname === '/') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html')
      res.end(`<!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>dragonwatch browser benchmark</title>
            <style>
              html, body { margin: 0; min-height: 100%; }
              body { font-family: system-ui, sans-serif; }
              #stage { position: relative; width: 1200px; min-height: 1200px; }
              .bench-box, .bench-target {
                position: absolute;
                display: grid;
                place-items: center;
                width: 24px;
                height: 24px;
                border: 1px solid #111;
                box-sizing: border-box;
                touch-action: none;
                user-select: none;
              }
              .bench-target { background: #e8f0ff; }
            </style>
          </head>
          <body>
            <main id="stage"></main>
          </body>
        </html>`)
      return
    }

    if (!url.pathname.startsWith('/dist/')) {
      res.statusCode = 404
      res.end('Not found')
      return
    }

    const filePath = safeResolve(root, url.pathname)
    if (!filePath) {
      res.statusCode = 400
      res.end('Bad request')
      return
    }

    try {
      const data = await readFile(filePath)
      res.statusCode = 200
      res.setHeader(
        'Content-Type',
        mimeTypes[extname(filePath)] ?? 'application/octet-stream'
      )
      res.end(data)
    } catch {
      res.statusCode = 404
      res.end('Not found')
    }
  })

  return new Promise((resolveServer, reject) => {
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => resolveServer(server))
  })
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.ceil((percentileValue / 100) * sorted.length) - 1
  )
  return sorted[index]
}

function summarize(samples) {
  const durations = samples.map((sample) => sample.duration)
  const operations = samples.reduce((total, sample) => total + sample.ops, 0)
  const durationTotal = durations.reduce((total, value) => total + value, 0)
  const longTasks = samples.reduce(
    (total, sample) => total + sample.longTasks,
    0
  )
  const mean = durationTotal / durations.length
  const variance =
    durations.reduce((total, value) => total + (value - mean) ** 2, 0) /
    durations.length

  return {
    runs: samples.length,
    operations,
    medianMs: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    meanMs: mean,
    stdDevMs: Math.sqrt(variance),
    opsPerSecond: operations / (durationTotal / 1000),
    longTasks,
  }
}

function printTable(rows) {
  const formatted = rows.map((row) => ({
    browser: row.browser,
    benchmark: row.benchmark,
    runs: row.runs,
    operations: row.operations,
    medianMs: row.medianMs.toFixed(3),
    p95Ms: row.p95Ms.toFixed(3),
    meanMs: row.meanMs.toFixed(3),
    stdDevMs: row.stdDevMs.toFixed(3),
    opsPerSecond: Math.round(row.opsPerSecond),
    longTasks: row.longTasks,
  }))
  console.table(formatted)
}

async function runBrowserBenchmarks(browserName, browserType) {
  const browser = await browserType.launch()
  const page = await browser.newPage()

  try {
    await page.goto(baseURL)

    return await page.evaluate(async () => {
      const api = await import('/dist/index.js')
      const stage = document.getElementById('stage')

      window.DragonwatchBenchmarkReady = true

      const supportsLongTask =
        typeof PerformanceObserver !== 'undefined' &&
        PerformanceObserver.supportedEntryTypes?.includes('longtask')

      function installLongTaskObserver() {
        const entries = []
        if (!supportsLongTask) return { entries, disconnect() {} }
        const observer = new PerformanceObserver((list) => {
          entries.push(...list.getEntries())
        })
        observer.observe({ entryTypes: ['longtask'] })
        return {
          entries,
          disconnect() {
            observer.disconnect()
          },
        }
      }

      function resetStage() {
        stage.replaceChildren()
      }

      function makeBox(id, index, className = 'bench-box') {
        const element = document.createElement('div')
        element.id = id
        element.className = className
        element.style.left = `${20 + (index % 40) * 28}px`
        element.style.top = `${20 + Math.floor(index / 40) * 28}px`
        element.textContent = String(index)
        return element
      }

      function appendBoxes(count, prefix = 'box') {
        const fragment = document.createDocumentFragment()
        for (let index = 0; index < count; index++)
          fragment.append(makeBox(`${prefix}-${index}`, index))
        stage.append(fragment)
        return Array.from(stage.children)
      }

      async function waitForAnimations() {
        await Promise.allSettled(
          document
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished)
        )
      }

      async function sample(name, ops, fn) {
        const longTasks = installLongTaskObserver()
        performance.clearMarks(name)
        performance.clearMeasures(name)
        performance.mark(`${name}:start`)
        await fn()
        performance.mark(`${name}:end`)
        performance.measure(name, `${name}:start`, `${name}:end`)
        await new Promise((resolve) => requestAnimationFrame(resolve))
        longTasks.disconnect()
        const [measure] = performance.getEntriesByName(name).slice(-1)
        return {
          duration: measure.duration,
          ops,
          longTasks: longTasks.entries.length,
        }
      }

      async function run(name, runs, ops, fn) {
        const samples = []
        await fn()
        await waitForAnimations()
        for (let index = 0; index < runs; index++) {
          samples.push(await sample(`${name}:${index}`, ops, fn))
          await waitForAnimations()
        }
        return { name, samples }
      }

      const benchmarks = []

      benchmarks.push(
        await run('SwapSet constructor, 400 members', 25, 400, () => {
          resetStage()
          const members = appendBoxes(400, 'swap-member')
          new api.SwapSet(members, 0)
        })
      )

      benchmarks.push(
        await run('SwapSet remoteDrag replay, 5k moves', 25, 5000, () => {
          resetStage()
          const members = appendBoxes(128, 'remote-drag')
          const swapSet = new api.SwapSet(members, 0)
          for (let index = 0; index < 5000; index++) {
            const member = members[index % members.length]
            swapSet.remoteDrag({
              thisEl: member,
              x: (index % 31) - 15,
              y: (index % 17) - 8,
            })
          }
        })
      )

      benchmarks.push(
        await run('SwapSet remoteSwap replay, 250 swaps', 20, 250, async () => {
          resetStage()
          const members = appendBoxes(80, 'remote-swap')
          const swapSet = new api.SwapSet(members, 0)
          for (let index = 0; index < 250; index++) {
            const thisEl = members[index % members.length]
            const withEl = members[(index + 1) % members.length]
            swapSet.remoteSwap({ thisEl, withEl })
          }
          await waitForAnimations()
        })
      )

      benchmarks.push(
        await run('DragTarget constructor, 250 targets', 25, 250, () => {
          resetStage()
          const dragged = makeBox('dragged', 0)
          stage.append(dragged)
          const targets = []
          for (let index = 0; index < 250; index++) {
            const target = makeBox(`target-${index}`, index + 1, 'bench-target')
            targets.push(target)
            stage.append(target)
          }
          new api.DragTarget(dragged, targets, 'replace', 0)
        })
      )

      benchmarks.push(
        await run('DragTarget remoteDrag replay, 5k moves', 25, 5000, () => {
          resetStage()
          const dragged = makeBox('dragged', 0)
          const target = makeBox('target', 1, 'bench-target')
          stage.append(dragged, target)
          const dragTarget = new api.DragTarget(dragged, target, 'append', 0)
          for (let index = 0; index < 5000; index++)
            dragTarget.remoteDrag({
              thisEl: dragged,
              x: (index % 41) - 20,
              y: (index % 23) - 11,
            })
        })
      )

      benchmarks.push(
        await run('watch dataset start/stop, 10k cycles', 25, 10000, () => {
          resetStage()
          const dragged = makeBox('watched', 0)
          const watcher = makeBox('watcher', 1, 'bench-target')
          stage.append(dragged, watcher)
          for (let index = 0; index < 10000; index++) {
            api.startWatch(watcher, dragged)
            api.stopWatch(watcher, dragged)
          }
        })
      )

      return benchmarks
    })
  } finally {
    await browser.close()
  }
}

const server = await startServer()
const rows = []

try {
  for (const [browserName, browserType] of browsers) {
    try {
      const benchmarks = await runBrowserBenchmarks(browserName, browserType)
      for (const benchmark of benchmarks)
        rows.push({
          browser: browserName,
          benchmark: benchmark.name,
          ...summarize(benchmark.samples),
        })
    } catch (error) {
      console.error(`${browserName} benchmark failed:`, error)
      process.exitCode = 1
    }
  }
} finally {
  await new Promise((resolveClose) => server.close(resolveClose))
}

if (rows.length > 0) printTable(rows)
