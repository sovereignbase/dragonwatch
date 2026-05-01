[![npm version](https://img.shields.io/npm/v/@sovereignbase/dragonwatch)](https://www.npmjs.com/package/@sovereignbase/dragonwatch)
[![CI](https://github.com/sovereignbase/dragonwatch/actions/workflows/ci.yaml/badge.svg?branch=master)](https://github.com/sovereignbase/dragonwatch/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/sovereignbase/dragonwatch/branch/master/graph/badge.svg)](https://codecov.io/gh/sovereignbase/dragonwatch)
[![license](https://img.shields.io/npm/l/@sovereignbase/dragonwatch)](LICENSE)

# dragonwatch

Dragonwatch is built around two functions, `drag` and `watch`, which is where the name comes from. Its event model also makes the same interactions easy to replay remotely.

## Compatibility

- Runtimes: modern browsers; Node >= 20 only with a DOM-like environment.
- Module format: ESM and CJS.
- Required globals / APIs: `HTMLElement`, `PointerEvent`, `CustomEvent`, `EventTarget`, Web Animations API, and `crypto.randomUUID`.
- TypeScript: bundled types.

## Goals

- Typed event maps for `SwapSet` and `DragTarget`.
- Remote replay support for drag movement, settling, and swaps.
- Minimal DOM behavior without framework dependencies.
- Side-effect free package entrypoint.

## Installation

```sh
npm install @sovereignbase/dragonwatch
# or
pnpm add @sovereignbase/dragonwatch
# or
yarn add @sovereignbase/dragonwatch
# or
bun add @sovereignbase/dragonwatch
# or
deno add jsr:@sovereignbase/dragonwatch
# or
vlt install jsr:@sovereignbase/dragonwatch
```

## Usage

### SwapSet

```ts
import { SwapSet } from '@sovereignbase/dragonwatch'

// Makes all given elements draggable and swappable between each other preserving the original layout.
const swapSet = new SwapSet(document.querySelectorAll('[data-draggable]'))
```

### Remote SwapSet replay

```ts
import { SwapSet } from '@sovereignbase/dragonwatch'

const localSet = new SwapSet(localGrid.children)
const remoteSet = new SwapSet(remoteGrid.children)

// In practice you would only stream the id and coordinate data trough some transport.
localSet.addEventListener('drag', ({ detail }) => {
  const thisEl = remoteSet.getMemberById(detail.thisEl.id)
  if (thisEl) remoteSet.remoteDrag({ thisEl, x: detail.x, y: detail.y })
})

localSet.addEventListener('swap', ({ detail }) => {
  const thisEl = remoteSet.getMemberById(detail.thisEl.id)
  const withEl = remoteSet.getMemberById(detail.withEl.id)
  if (thisEl && withEl) remoteSet.remoteSwap({ thisEl, withEl })
})

localSet.addEventListener('settle', ({ detail }) => {
  const thisEl = remoteSet.getMemberById(detail.thisEl.id)
  if (thisEl) remoteSet.remoteSettle({ thisEl })
})
```

### DragTarget

```ts
import { DragTarget } from '@sovereignbase/dragonwatch'

const dragged = document.querySelector('[data-dragged]')
const targets = Array.from(document.querySelectorAll('[data-target]')).filter(
  (element): element is HTMLElement => element instanceof HTMLElement
)

if (!(dragged instanceof HTMLElement)) throw new Error('missing dragged')
if (targets.length === 0) throw new Error('missing targets')

const dragTarget = new DragTarget(dragged, targets, 'replace')

dragTarget.addEventListener('intersecting', ({ detail }) => {
  detail.withEl.style.border = 'solid 1px green'
})

dragTarget.addEventListener('notintersecting', ({ detail }) => {
  detail.withEl.style.border = 'solid 1px white'
})

dragTarget.addEventListener('swap', ({ detail }) => {
  detail.withEl.style.border = 'solid 1px white'
})
```

## Advanced Exports

`DragTarget` and `SwapSet` are the main classes. The same package entrypoint
also exports the lower-level `drag`, `startWatch`, and `stopWatch` functions,
plus the public TypeScript types:

```ts
import { drag, startWatch, stopWatch } from '@sovereignbase/dragonwatch'
import type {
  DragEventDetail,
  DragTargetEventMap,
  SettleEventDetail,
  SwapEventDetail,
  SwapSetEventMap,
} from '@sovereignbase/dragonwatch'
```

## Runtime Behavior

### Browsers

`SwapSet` wires each member to pointer dragging and swaps members when the dragged element intersects a watched member. `DragTarget` wires one dragged element to one or more target options and commits once, using either append or replace behavior.

### Remote Replay

Both classes emit `drag`, `settle`, and `swap` events for replaying the same interaction elsewhere. `SwapSet` exposes `members` and `getMemberById`; `DragTarget` exposes `dragged`, `targets`, and `getTargetById` so callers can map local elements to remote-compatible elements by id.

### Events

`SwapSet` events:

- `drag`
- `settle`
- `swap`

`DragTarget` events:

- `drag`
- `intersecting`
- `notintersecting`
- `settle`
- `swap`

## Tests

Suite: unit, integration, and Playwright browser E2E scripts under `test/`.
Command: `npm run test`
Coverage: c8 through `test/run-coverage.mjs`.

Latest targeted local run on 2026-05-01:

| Command                      | Result                         |
| ---------------------------- | ------------------------------ |
| `node test/run-coverage.mjs` | 2 passed, 0 failed, 0 skipped  |
| `node test/e2e/run.mjs`      | 45 passed, 0 failed, 0 skipped |

The browser E2E matrix covers Chromium, Firefox, WebKit, Mobile Chrome, and
Mobile Safari projects. The E2E suite includes public export checks, pointer
drag and intersection behavior, `SwapSet` swap and remote replay behavior,
`DragTarget` replace and append behavior, outside-target settle behavior, and a
console-clean click regression for non-drag clicks.

## Benchmarks

Command: `npm run bench`

The benchmark suite runs in real browsers through Playwright and measures work
inside the browser with the Performance API (`performance.mark`,
`performance.measure`, and Long Task entries where supported).

Latest targeted local run on 2026-05-01 with `node benchmark/bench.js`:

| Browser  | Benchmark                              | Runs | Operations | Median ms |  P95 ms | Mean ms | Std dev ms | Ops/sec | Long tasks |
| -------- | -------------------------------------- | ---: | ---------: | --------: | ------: | ------: | ---------: | ------: | ---------: |
| chromium | SwapSet constructor, 400 members       |   25 |     10,000 |     5.800 |   8.800 |   6.744 |      3.349 |  59,312 |          1 |
| chromium | SwapSet remoteDrag replay, 5k moves    |   25 |    125,000 |   186.300 | 234.100 | 183.656 |     28.295 |  27,225 |         17 |
| chromium | SwapSet remoteSwap replay, 250 swaps   |   20 |      5,000 |   210.900 | 365.600 | 224.190 |     68.303 |   1,115 |         16 |
| chromium | DragTarget constructor, 250 targets    |   25 |      6,250 |     2.000 |   2.700 |   2.028 |      0.402 | 123,274 |          0 |
| chromium | DragTarget remoteDrag replay, 5k moves |   25 |    125,000 |   100.300 | 111.200 |  99.428 |      9.240 |  50,288 |         22 |
| chromium | watch dataset start/stop, 10k cycles   |   25 |    250,000 |    27.200 |  31.700 |  27.312 |      3.266 | 366,139 |          1 |
| firefox  | SwapSet constructor, 400 members       |   25 |     10,000 |     8.000 |  12.000 |   8.840 |      2.310 |  45,249 |          0 |
| firefox  | SwapSet remoteDrag replay, 5k moves    |   25 |    125,000 |   190.000 | 322.000 | 210.920 |     44.686 |  23,706 |          0 |
| firefox  | SwapSet remoteSwap replay, 250 swaps   |   20 |      5,000 |    95.000 | 122.000 | 100.100 |     11.891 |   2,498 |          0 |
| firefox  | DragTarget constructor, 250 targets    |   25 |      6,250 |     3.000 |   4.000 |   3.320 |      0.614 |  75,301 |          0 |
| firefox  | DragTarget remoteDrag replay, 5k moves |   25 |    125,000 |   160.000 | 182.000 | 162.720 |     12.207 |  30,728 |          0 |
| firefox  | watch dataset start/stop, 10k cycles   |   25 |    250,000 |    27.000 |  31.000 |  27.480 |      1.792 | 363,901 |          0 |
| webkit   | SwapSet constructor, 400 members       |   25 |     10,000 |     8.000 |  10.000 |   8.200 |      1.265 |  48,780 |          0 |
| webkit   | SwapSet remoteDrag replay, 5k moves    |   25 |    125,000 |   437.000 | 503.000 | 431.400 |     54.110 |  11,590 |          0 |
| webkit   | SwapSet remoteSwap replay, 250 swaps   |   20 |      5,000 |   274.000 | 377.000 | 286.200 |     40.180 |     874 |          0 |
| webkit   | DragTarget constructor, 250 targets    |   25 |      6,250 |     6.000 |  10.000 |   6.720 |      2.010 |  37,202 |          0 |
| webkit   | DragTarget remoteDrag replay, 5k moves |   25 |    125,000 |   270.000 | 298.000 | 272.000 |     17.767 |  18,382 |          0 |
| webkit   | watch dataset start/stop, 10k cycles   |   25 |    250,000 |    30.000 |  34.000 |  29.520 |      3.623 | 338,753 |          0 |

Results vary by hardware, browser version, thermal state, and background load.

## License

Apache-2.0
