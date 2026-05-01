import { spawnSync } from 'node:child_process'
import fg from 'fast-glob'

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const unitTests = fg.sync('test/unit/**/*.test.js')
const integrationTests = fg.sync('test/integration/**/*.test.js')

run(process.execPath, ['--test', '--test-concurrency=1', ...unitTests])
run(process.execPath, ['--test', '--test-concurrency=1', ...integrationTests])
