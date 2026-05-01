import { expect, test } from '@playwright/test'

const STAGE_CSS = `
  html,
  body {
    margin: 0;
    min-height: 100%;
  }

  body {
    font-family: system-ui, sans-serif;
  }

  #stage {
    position: relative;
    width: 900px;
    min-height: 700px;
    padding: 16px;
  }

  .box,
  .target {
    position: absolute;
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    border: 1px solid #111;
    background: #fff;
    color: #111;
    font: 700 14px system-ui;
    touch-action: none;
    user-select: none;
  }

  .target {
    background: #e8f0ff;
  }
`

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__DRAGONWATCH_API__)
  await page.evaluate((css) => {
    document.body.innerHTML = '<main id="stage"></main>'
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
  }, STAGE_CSS)
})

const center = async (locator) => {
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no bounding box')
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  }
}

const dispatchSyntheticPointerDrag = async (locator, start, target, steps) => {
  await locator.evaluate(
    (element, options) => {
      const pointerId = 9001
      const pointerCapture = new Set()
      const prototype = HTMLElement.prototype
      const setPointerCapture = prototype.setPointerCapture
      const hasPointerCapture = prototype.hasPointerCapture
      const releasePointerCapture = prototype.releasePointerCapture

      prototype.setPointerCapture = function (id) {
        if (id === pointerId) {
          pointerCapture.add(this)
          return
        }
        return setPointerCapture.call(this, id)
      }
      prototype.hasPointerCapture = function (id) {
        if (id === pointerId) return pointerCapture.has(this)
        return hasPointerCapture.call(this, id)
      }
      prototype.releasePointerCapture = function (id) {
        if (id === pointerId) {
          pointerCapture.delete(this)
          return
        }
        return releasePointerCapture.call(this, id)
      }

      const dispatch = (targetElement, type, point, movement) => {
        targetElement.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            cancelable: true,
            clientX: point.x,
            clientY: point.y,
            composed: true,
            movementX: movement.x,
            movementY: movement.y,
            pointerId,
            pointerType: 'mouse',
          })
        )
      }

      try {
        dispatch(element, 'pointerdown', options.start, { x: 0, y: 0 })

        let previous = options.start
        for (let step = 1; step <= options.steps; step++) {
          const next = {
            x:
              options.start.x +
              ((options.target.x - options.start.x) * step) / options.steps,
            y:
              options.start.y +
              ((options.target.y - options.start.y) * step) / options.steps,
          }
          dispatch(document, 'pointermove', next, {
            x: next.x - previous.x,
            y: next.y - previous.y,
          })
          previous = next
        }

        dispatch(document, 'pointerup', options.target, { x: 0, y: 0 })
      } finally {
        prototype.setPointerCapture = setPointerCapture
        prototype.hasPointerCapture = hasPointerCapture
        prototype.releasePointerCapture = releasePointerCapture
      }
    },
    { start, target, steps }
  )
}

const dragFromTo = async (page, locator, target, steps = 12, browserName) => {
  const start = await center(locator)
  if (browserName === 'webkit') {
    await dispatchSyntheticPointerDrag(locator, start, target, steps)
    return
  }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(target.x, target.y, { steps })
  await page.mouse.up()
}

const waitForAnimations = async (page) => {
  await page.evaluate(async () => {
    const animations = document.getAnimations({ subtree: true })
    await Promise.allSettled(animations.map((animation) => animation.finished))
  })
}

test('exports the public browser API and mutates watch datasets explicitly', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const api = window.__DRAGONWATCH_API__
    const stage = document.getElementById('stage')
    const dragged = document.createElement('div')
    const watcher = document.createElement('div')
    dragged.id = 'dragged'
    watcher.id = 'watcher'
    stage.append(dragged, watcher)

    api.startWatch(watcher, dragged)
    const firstId = dragged.dataset.dragonwatchId
    const firstWatch = watcher.dataset.dragonWatches

    api.startWatch(watcher, dragged)
    const reusedId = dragged.dataset.dragonwatchId

    const unrelated = document.createElement('div')
    api.stopWatch(watcher, unrelated)
    const stillWatching = watcher.dataset.dragonWatches

    api.stopWatch(watcher, dragged)

    return {
      exports: Object.keys(api).sort(),
      firstId,
      firstWatch,
      reusedId,
      stillWatching,
      stopped: watcher.dataset.dragonWatches,
    }
  })

  expect(result.exports).toEqual([
    'DragTarget',
    'SwapSet',
    'drag',
    'startWatch',
    'stopWatch',
  ])
  expect(result.firstId).toBeTruthy()
  expect(result.firstWatch).toBe(result.firstId)
  expect(result.reusedId).toBe(result.firstId)
  expect(result.stillWatching).toBe(result.firstId)
  expect(result.stopped).toBeUndefined()
})

test('drag reports movement and intersection lifecycle against watched elements', async ({
  browserName,
  page,
}) => {
  await page.evaluate(() => {
    const api = window.__DRAGONWATCH_API__
    const stage = document.getElementById('stage')
    stage.innerHTML = `
      <div id="dragged" class="box" style="left: 20px; top: 20px">drag</div>
      <div id="watcher" class="target" style="left: 170px; top: 20px">watch</div>
    `
    const dragged = document.getElementById('dragged')
    const watcher = document.getElementById('watcher')
    window.__DRAG_LOW_LEVEL__ = {
      moves: [],
      starts: [],
      stops: [],
      bodyUserSelectBefore: document.body.style.userSelect,
    }
    api.startWatch(watcher, dragged)
    dragged.addEventListener('pointerdown', (event) => {
      api.drag(
        event,
        (thisEl, withEl) => {
          window.__DRAG_LOW_LEVEL__.starts.push([thisEl.id, withEl.id])
        },
        (thisEl, withEl) => {
          window.__DRAG_LOW_LEVEL__.stops.push([thisEl.id, withEl.id])
        },
        (_dragged, offset, pointerEvent) => {
          window.__DRAG_LOW_LEVEL__.moves.push({
            id: offset.thisEl.id,
            x: offset.x,
            y: offset.y,
            pointerType: pointerEvent.pointerType,
          })
        }
      )
    })
  })

  await dragFromTo(
    page,
    page.locator('#dragged'),
    { x: 360, y: 52 },
    16,
    browserName
  )

  const result = await page.evaluate(() => {
    const dragged = document.getElementById('dragged')
    return {
      ...window.__DRAG_LOW_LEVEL__,
      dataset: { ...dragged.dataset },
      transform: dragged.style.transform,
      zIndex: dragged.style.zIndex,
      bodyUserSelectAfter: document.body.style.userSelect,
    }
  })

  expect(result.moves.length).toBeGreaterThan(4)
  expect(result.moves.at(-1).id).toBe('dragged')
  expect(result.moves.at(-1).x).toBeGreaterThan(250)
  expect(result.starts).toEqual([['dragged', 'watcher']])
  expect(result.stops).toEqual([['dragged', 'watcher']])
  expect(result.dataset.x).toBeTruthy()
  expect(result.transform).toContain('translate(')
  expect(result.zIndex).toBe('')
  expect(result.bodyUserSelectAfter).toBe(result.bodyUserSelectBefore)
})

test('SwapSet swaps members, emits typed details, and supports listener removal', async ({
  browserName,
  page,
}) => {
  await page.evaluate(() => {
    const { SwapSet } = window.__DRAGONWATCH_API__
    const stage = document.getElementById('stage')
    stage.innerHTML = `
      <div id="set" style="position: relative">
        <div id="a" class="box" style="left: 20px; top: 20px">A</div>
        <div id="b" class="box" style="left: 170px; top: 20px">B</div>
        <div id="c" class="box" style="left: 320px; top: 20px">C</div>
      </div>
    `
    const members = Array.from(document.querySelectorAll('#set > .box'))
    const strayText = document.createTextNode('not an element')
    const swapSet = new SwapSet([...members, strayText], 0)
    const removed = () => window.__SWAP_SET__.removed++
    window.__SWAP_SET__ = {
      memberIds: swapSet.members.map((member) => member.id),
      getB: swapSet.getMemberById('b')?.id,
      getMissing: swapSet.getMemberById('missing')?.id,
      drag: [],
      swap: [],
      settle: [],
      removed: 0,
    }
    swapSet.addEventListener('drag', ({ detail }) => {
      window.__SWAP_SET__.drag.push({
        thisEl: detail.thisEl.id,
        x: detail.x,
        y: detail.y,
        pointerType: detail.pointerEvent.pointerType,
      })
    })
    swapSet.addEventListener('swap', removed)
    swapSet.removeEventListener('swap', removed)
    swapSet.addEventListener('swap', ({ detail }) => {
      window.__SWAP_SET__.swap.push({
        thisEl: detail.thisEl.id,
        withEl: detail.withEl.id,
      })
    })
    swapSet.addEventListener('settle', ({ detail }) => {
      window.__SWAP_SET__.settle.push(detail.thisEl.id)
    })
  })

  await dragFromTo(page, page.locator('#a'), { x: 202, y: 52 }, 12, browserName)
  await waitForAnimations(page)

  const result = await page.evaluate(() => {
    const a = document.getElementById('a')
    const b = document.getElementById('b')
    return {
      ...window.__SWAP_SET__,
      order: Array.from(document.querySelectorAll('#set > .box')).map(
        (element) => element.id
      ),
      aDataset: { ...a.dataset },
      bDataset: { ...b.dataset },
      aTransform: a.style.transform,
    }
  })

  expect(result.memberIds).toEqual(['a', 'b', 'c'])
  expect(result.getB).toBe('b')
  expect(result.getMissing).toBeUndefined()
  expect(result.drag.length).toBeGreaterThan(0)
  expect(result.swap).toEqual([{ thisEl: 'a', withEl: 'b' }])
  expect(result.settle).toEqual(['a'])
  expect(result.removed).toBe(0)
  expect(result.order).toEqual(['b', 'a', 'c'])
  expect(result.aDataset.dragging).toBeUndefined()
  expect(result.bDataset.dragonWatches).toBeUndefined()
  expect(result.aTransform).toBe('')
})

test('clicking a SwapSet member without dragging keeps the console clean', async ({
  page,
}) => {
  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (error) => pageErrors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.evaluate(() => {
    const { SwapSet } = window.__DRAGONWATCH_API__
    const stage = document.getElementById('stage')
    stage.innerHTML = `
      <div id="set" style="position: relative">
        <div id="a" class="box" style="left: 20px; top: 20px">A</div>
        <div id="b" class="box" style="left: 170px; top: 20px">B</div>
      </div>
    `
    new SwapSet(document.querySelectorAll('#set > .box'), 200)
  })

  await page.locator('#a').click()
  await page.locator('#a').click()
  await page.waitForTimeout(250)

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})

test('SwapSet remote replay applies drag, swap, and settle without pointer input', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { SwapSet } = window.__DRAGONWATCH_API__
    const stage = document.getElementById('stage')
    stage.innerHTML = `
      <div id="remote-set" style="position: relative">
        <div id="r1" class="box" style="left: 20px; top: 20px">1</div>
        <div id="r2" class="box" style="left: 170px; top: 20px">2</div>
      </div>
    `
    const swapSet = new SwapSet(
      document.querySelectorAll('#remote-set > .box'),
      0
    )
    const r1 = document.getElementById('r1')
    const r2 = document.getElementById('r2')
    const settleAnimations = async () => {
      await Promise.allSettled(
        document
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished)
      )
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
    }

    swapSet.remoteDrag({ thisEl: r1, x: 17, y: -9 })
    const afterDrag = {
      dataset: { ...r1.dataset },
      transform: r1.style.transform,
      transition: r1.style.transition,
      zIndex: r1.style.zIndex,
    }

    swapSet.remoteSwap({ thisEl: r1, withEl: r2 })
    const afterSwap = Array.from(
      document.querySelectorAll('#remote-set > .box')
    ).map((element) => element.id)

    swapSet.remoteSettle({ thisEl: r1 })
    await settleAnimations()

    return {
      afterDrag,
      afterSwap,
      afterSettle: {
        dataset: { ...r1.dataset },
        transform: r1.style.transform,
        transition: r1.style.transition,
        zIndex: r1.style.zIndex,
      },
    }
  })

  expect(result.afterDrag.dataset).toMatchObject({ x: '17', y: '-9' })
  expect(result.afterDrag.transform).toBe('translate(17px, -9px)')
  expect(result.afterDrag.transition).toBe('none')
  expect(result.afterDrag.zIndex).toBe('2147483647')
  expect(result.afterSwap).toEqual(['r2', 'r1'])
  expect(result.afterSettle.dataset.x).toBeUndefined()
  expect(result.afterSettle.dataset.y).toBeUndefined()
  expect(['', 'none']).toContain(result.afterSettle.transform)
  expect(result.afterSettle.transition).toBe('')
  expect(result.afterSettle.zIndex).toBe('')
})

test('DragTarget replace mode commits once and aborts later drags', async ({
  browserName,
  page,
}) => {
  await page.evaluate(() => {
    const { DragTarget } = window.__DRAGONWATCH_API__
    const stage = document.getElementById('stage')
    stage.innerHTML = `
      <div id="host" style="position: relative">
        <div id="dragged" class="box" style="left: 20px; top: 160px">drag</div>
        <div id="replace-a" class="target" style="left: 170px; top: 160px">A</div>
        <div id="replace-b" class="target" style="left: 320px; top: 160px">B</div>
      </div>
    `
    const dragTarget = new DragTarget(
      document.getElementById('dragged'),
      [
        document.getElementById('replace-a'),
        document.getElementById('replace-b'),
      ],
      'replace',
      0
    )
    window.__DRAG_TARGET_REPLACE__ = {
      drag: [],
      intersecting: [],
      notintersecting: [],
      settle: [],
      swap: [],
      getA: dragTarget.getTargetById('replace-a')?.id,
      getMissing: dragTarget.getTargetById('missing')?.id,
    }
    for (const type of Object.keys(window.__DRAG_TARGET_REPLACE__)) {
      if (!Array.isArray(window.__DRAG_TARGET_REPLACE__[type])) continue
      dragTarget.addEventListener(type, ({ detail }) => {
        window.__DRAG_TARGET_REPLACE__[type].push({
          thisEl: detail.thisEl.id,
          withEl: detail.withEl?.id,
          x: detail.x,
          y: detail.y,
        })
      })
    }
  })

  await dragFromTo(
    page,
    page.locator('#dragged'),
    { x: 202, y: 192 },
    12,
    browserName
  )
  await page.waitForFunction(
    () => window.__DRAG_TARGET_REPLACE__.swap.length === 1
  )
  await waitForAnimations(page)

  await dragFromTo(
    page,
    page.locator('#dragged'),
    { x: 352, y: 192 },
    12,
    browserName
  )
  await page.waitForTimeout(100)

  const result = await page.evaluate(() => ({
    ...window.__DRAG_TARGET_REPLACE__,
    hostOrder: Array.from(document.querySelectorAll('#host > *')).map(
      (element) => element.id
    ),
    draggedParent: document.getElementById('dragged').parentElement.id,
    replaceAExists: Boolean(document.getElementById('replace-a')),
    replaceBWatching:
      document.getElementById('replace-b').dataset.dragonWatches,
  }))

  expect(result.getA).toBe('replace-a')
  expect(result.getMissing).toBeUndefined()
  expect(result.drag.length).toBeGreaterThan(0)
  expect(result.intersecting.map((event) => event.withEl)).toContain(
    'replace-a'
  )
  expect(result.notintersecting).toEqual([])
  expect(result.settle).toEqual([])
  expect(result.swap).toEqual([{ thisEl: 'dragged', withEl: 'replace-a' }])
  expect(result.hostOrder).toEqual(['dragged', 'replace-b'])
  expect(result.draggedParent).toBe('host')
  expect(result.replaceAExists).toBe(false)
  expect(result.replaceBWatching).toBeUndefined()
})

test('DragTarget append mode commits into a target element', async ({
  browserName,
  page,
}) => {
  await page.evaluate(() => {
    const { DragTarget } = window.__DRAGONWATCH_API__
    const stage = document.getElementById('stage')
    stage.innerHTML = `
      <div id="dragged" class="box" style="left: 20px; top: 270px">drag</div>
      <div id="append-target" class="target" style="left: 170px; top: 270px">target</div>
    `
    const dragTarget = new DragTarget(
      document.getElementById('dragged'),
      document.getElementById('append-target'),
      'append',
      0
    )
    window.__DRAG_TARGET_APPEND__ = { swap: [] }
    dragTarget.addEventListener('swap', ({ detail }) => {
      window.__DRAG_TARGET_APPEND__.swap.push({
        thisEl: detail.thisEl.id,
        withEl: detail.withEl.id,
      })
    })
  })

  await dragFromTo(
    page,
    page.locator('#dragged'),
    { x: 202, y: 302 },
    12,
    browserName
  )
  await page.waitForFunction(
    () => window.__DRAG_TARGET_APPEND__.swap.length === 1
  )
  await waitForAnimations(page)

  const result = await page.evaluate(() => ({
    events: window.__DRAG_TARGET_APPEND__,
    parent: document.getElementById('dragged').parentElement.id,
    targetChildren: Array.from(
      document.getElementById('append-target').children
    ).map((element) => element.id),
  }))

  expect(result.events.swap).toEqual([
    { thisEl: 'dragged', withEl: 'append-target' },
  ])
  expect(result.parent).toBe('append-target')
  expect(result.targetChildren).toEqual(['dragged'])
})

test('DragTarget emits notintersecting and settle when dropped outside targets', async ({
  browserName,
  page,
}) => {
  await page.evaluate(() => {
    const { DragTarget } = window.__DRAGONWATCH_API__
    const stage = document.getElementById('stage')
    stage.innerHTML = `
      <div id="dragged" class="box" style="left: 20px; top: 390px">drag</div>
      <div id="settle-target" class="target" style="left: 170px; top: 390px">target</div>
    `
    const target = document.getElementById('settle-target')
    const dragTarget = new DragTarget(
      document.getElementById('dragged'),
      target,
      'replace',
      0
    )
    window.__DRAG_TARGET_SETTLE__ = {
      intersecting: [],
      notintersecting: [],
      settle: [],
      swap: [],
    }
    for (const type of Object.keys(window.__DRAG_TARGET_SETTLE__)) {
      dragTarget.addEventListener(type, ({ detail }) => {
        window.__DRAG_TARGET_SETTLE__[type].push({
          thisEl: detail.thisEl.id,
          withEl: detail.withEl?.id,
        })
      })
    }
  })

  await dragFromTo(
    page,
    page.locator('#dragged'),
    { x: 430, y: 422 },
    16,
    browserName
  )
  await waitForAnimations(page)

  const result = await page.evaluate(() => {
    const dragged = document.getElementById('dragged')
    const target = document.getElementById('settle-target')
    return {
      ...window.__DRAG_TARGET_SETTLE__,
      draggedDataset: { ...dragged.dataset },
      targetWatch: target.dataset.dragonWatches,
      transform: dragged.style.transform,
    }
  })

  expect(result.intersecting).toEqual([
    { thisEl: 'dragged', withEl: 'settle-target' },
  ])
  expect(result.notintersecting).toEqual([
    { thisEl: 'dragged', withEl: 'settle-target' },
  ])
  expect(result.settle).toEqual([{ thisEl: 'dragged' }])
  expect(result.swap).toEqual([])
  expect(result.draggedDataset.x).toBeUndefined()
  expect(result.draggedDataset.y).toBeUndefined()
  expect(result.targetWatch).toBeUndefined()
  expect(result.transform).toBe('')
})

test('DragTarget remote replay mirrors drag, settle, and append commits', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { DragTarget } = window.__DRAGONWATCH_API__
    const stage = document.getElementById('stage')
    stage.innerHTML = `
      <div id="remote-dragged" class="box" style="left: 20px; top: 510px">drag</div>
      <div id="remote-target" class="target" style="left: 170px; top: 510px">target</div>
    `
    const dragged = document.getElementById('remote-dragged')
    const target = document.getElementById('remote-target')
    const dragTarget = new DragTarget(dragged, target, 'append', 0)
    const settleAnimations = async () => {
      await Promise.allSettled(
        document
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished)
      )
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
    }

    dragTarget.remoteDrag({ thisEl: dragged, x: 11, y: 13 })
    const afterDrag = {
      transform: dragged.style.transform,
      dataset: { ...dragged.dataset },
      zIndex: dragged.style.zIndex,
    }
    dragTarget.remoteSettle({ thisEl: dragged })
    await settleAnimations()
    const afterSettle = {
      transform: dragged.style.transform,
      dataset: { ...dragged.dataset },
      zIndex: dragged.style.zIndex,
    }

    dragTarget.remoteDrag({ thisEl: dragged, x: 30, y: 0 })
    dragTarget.remoteSwap({ thisEl: dragged, withEl: target })
    await settleAnimations()

    return {
      afterDrag,
      afterSettle,
      finalParent: dragged.parentElement.id,
      targetChildren: Array.from(target.children).map((element) => element.id),
    }
  })

  expect(result.afterDrag.transform).toBe('translate(11px, 13px)')
  expect(result.afterDrag.dataset).toMatchObject({ x: '11', y: '13' })
  expect(result.afterDrag.zIndex).toBe('2147483647')
  expect(['', 'none']).toContain(result.afterSettle.transform)
  expect(result.afterSettle.dataset.x).toBeUndefined()
  expect(result.afterSettle.zIndex).toBe('')
  expect(result.finalParent).toBe('remote-target')
  expect(result.targetChildren).toEqual(['remote-dragged'])
})
