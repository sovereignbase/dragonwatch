import assert from 'node:assert/strict'
import test from 'node:test'
import * as api from '../../dist/index.js'

test('integration: package entrypoint exposes browser primitives only', () => {
  assert.deepEqual(Object.keys(api).sort(), [
    'DragTarget',
    'SwapSet',
    'drag',
    'startWatch',
    'stopWatch',
  ])
})
