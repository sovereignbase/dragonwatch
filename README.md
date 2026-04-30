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

- Typed event maps for `DragArea` and `DragTarget`.
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
```

## Usage

### DragArea

```ts
import { DragArea } from '@sovereignbase/dragonwatch'

const area = new DragArea(document.querySelectorAll('[data-draggable]'))

area.addEventListener('drag', ({ detail }) => {
  console.log(detail.thisEl, detail.x, detail.y)
})

area.addEventListener('swap', ({ detail }) => {
  console.log(detail.thisEl, detail.withEl)
})
```

### Remote DragArea replay

```ts
import { DragArea } from '@sovereignbase/dragonwatch'

const localArea = new DragArea(localGrid.children)
const remoteArea = new DragArea(remoteGrid.children)

localArea.addEventListener('drag', ({ detail }) => {
  const thisEl = remoteArea.getMemberById(detail.thisEl.id)
  if (thisEl) remoteArea.remoteDrag({ thisEl, x: detail.x, y: detail.y })
})

localArea.addEventListener('swap', ({ detail }) => {
  const thisEl = remoteArea.getMemberById(detail.thisEl.id)
  const withEl = remoteArea.getMemberById(detail.withEl.id)
  if (thisEl && withEl) remoteArea.remoteSwap({ thisEl, withEl })
})

localArea.addEventListener('settle', ({ detail }) => {
  const thisEl = remoteArea.getMemberById(detail.thisEl.id)
  if (thisEl) remoteArea.remoteSettle({ thisEl })
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
  detail.withEl.dataset.intersecting = 'true'
})

dragTarget.addEventListener('notintersecting', ({ detail }) => {
  delete detail.withEl.dataset.intersecting
})

dragTarget.addEventListener('swap', ({ detail }) => {
  delete detail.withEl.dataset.intersecting
})
```

## Runtime Behavior

### Browsers

`DragArea` wires each member to pointer dragging and swaps members when the dragged element intersects a watched member. `DragTarget` wires one dragged element to one or more target options and commits once, using either append or replace behavior.

### Remote Replay

Both classes emit `drag`, `settle`, and `swap` events for replaying the same interaction elsewhere. `DragArea` exposes `members` and `getMemberById`; `DragTarget` exposes `dragged`, `targets`, and `getTargetById` so callers can map local elements to remote-compatible elements by id.

### Events

`DragArea` events:

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

Suite: unit, integration, and E2E scripts under `test/`.
Command: `npm run test`
Coverage: c8 through `test/run-coverage.mjs`.

## Benchmarks

Command: `npm run bench`

Results vary by machine.

## License

Apache-2.0
