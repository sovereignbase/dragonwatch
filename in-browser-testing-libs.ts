import { DragArea, DragTarget } from './dist/index.js'

const controlsArr: HTMLElement[] = Array.from(
  document.querySelectorAll('[data-drag-area]')
)

const areaArr: DragArea[] = []

for (const controls of controlsArr) {
  if (!controls) throw new Error()
  for (let i = 0; i < 9; i++) {
    const box = document.createElement('div')
    box.id = `box:${i + 1}`
    box.textContent = `${i + 1}`
    void controls.appendChild(box)
  }

  const area = new DragArea(controls.children)
  void areaArr.push(area)
  area.addEventListener('drag', ({ detail }) => {
    for (const otherArea of areaArr) {
      if (otherArea === area) continue
      const thisEl = otherArea.getMemberById(detail.thisEl.id)
      if (!thisEl) continue
      void otherArea.remoteDrag({ thisEl, x: detail.x, y: detail.y })
    }
  })
  area.addEventListener('swap', ({ detail }) => {
    for (const otherArea of areaArr) {
      if (otherArea === area) continue
      const thisEl = otherArea.getMemberById(detail.thisEl.id)
      const withEl = otherArea.getMemberById(detail.withEl.id)
      if (!thisEl || !withEl) continue
      void otherArea.remoteSwap({ thisEl, withEl })
    }
  })
  area.addEventListener('settle', ({ detail }) => {
    for (const otherArea of areaArr) {
      if (otherArea === area) continue
      const thisEl = otherArea.getMemberById(detail.thisEl.id)
      if (!thisEl) continue
      void otherArea.remoteSettle({ thisEl })
    }
  })
}
const connect = (
  demo: HTMLElement,
  template: HTMLTemplateElement,
  targetFor: (
    dragged: HTMLElement,
    targets: readonly HTMLElement[]
  ) => DragTarget
): void => {
  const pair: HTMLElement | null = demo.querySelector('[data-target-pair]')
  const reset: HTMLButtonElement | null = demo.querySelector('[data-reset]')
  if (!pair || !reset) throw new Error()

  let dragTargets: DragTarget[] = []

  const fill = (): void => {
    pair.replaceChildren(template.content.cloneNode(true))
    dragTargets = []
    const rows = Array.from(pair.querySelectorAll('.target-row'))
    for (const row of rows) {
      const dragged: HTMLElement | null = row.querySelector('[data-dragged]')
      const targets = Array.from(row.querySelectorAll('[data-target]')).filter(
        (element): element is HTMLElement => element instanceof HTMLElement
      )
      if (!dragged || targets.length === 0) throw new Error()
      dragged.id = `${demo.dataset.targetDemo}:dragged`
      for (const [index, target] of targets.entries())
        target.id = `${demo.dataset.targetDemo}:target:${index}`
      void dragTargets.push(targetFor(dragged, targets))
    }
    for (const dragTarget of dragTargets) watchTarget(dragTarget, dragTargets)
  }

  reset.addEventListener('click', fill)
  fill()
}

const watchTarget = (
  dragTarget: DragTarget,
  dragTargets: readonly DragTarget[]
): void => {
  dragTarget.addEventListener('intersecting', ({ detail }) => {
    detail.withEl.dataset.intersecting = 'true'
    for (const otherTarget of dragTargets) {
      if (otherTarget === dragTarget) continue
      const withEl = otherTarget.getTargetById(detail.withEl.id)
      if (withEl) withEl.dataset.intersecting = 'true'
    }
  })
  dragTarget.addEventListener('notintersecting', ({ detail }) => {
    delete detail.withEl.dataset.intersecting
    for (const otherTarget of dragTargets) {
      if (otherTarget === dragTarget) continue
      const withEl = otherTarget.getTargetById(detail.withEl.id)
      if (withEl) delete withEl.dataset.intersecting
    }
  })
  dragTarget.addEventListener('drag', ({ detail }) => {
    for (const otherTarget of dragTargets) {
      if (otherTarget === dragTarget) continue
      if (otherTarget.dragged.id !== detail.thisEl.id) continue
      void otherTarget.remoteDrag({
        thisEl: otherTarget.dragged,
        x: detail.x,
        y: detail.y,
      })
    }
  })
  dragTarget.addEventListener('swap', ({ detail }) => {
    delete detail.withEl.dataset.intersecting
    for (const otherTarget of dragTargets) {
      if (otherTarget === dragTarget) continue
      if (otherTarget.dragged.id !== detail.thisEl.id) continue
      const withEl = otherTarget.getTargetById(detail.withEl.id)
      if (!withEl) continue
      delete withEl.dataset.intersecting
      void otherTarget.remoteSwap({ thisEl: otherTarget.dragged, withEl })
    }
  })
  dragTarget.addEventListener('settle', ({ detail }) => {
    for (const target of dragTarget.targets) delete target.dataset.intersecting
    for (const otherTarget of dragTargets) {
      if (otherTarget === dragTarget) continue
      if (otherTarget.dragged.id !== detail.thisEl.id) continue
      for (const target of otherTarget.targets)
        delete target.dataset.intersecting
      void otherTarget.remoteSettle({ thisEl: otherTarget.dragged })
    }
  })
}

const replaceDemo: HTMLElement | null = document.querySelector(
  '[data-replace-demo]'
)
const appendDemo: HTMLElement | null =
  document.querySelector('[data-append-demo]')
const replaceTemplate: HTMLTemplateElement | null = document.querySelector(
  '#replace-demo-template'
)
const appendTemplate: HTMLTemplateElement | null = document.querySelector(
  '#append-demo-template'
)
if (!replaceDemo || !appendDemo || !replaceTemplate || !appendTemplate)
  throw new Error()

connect(
  replaceDemo,
  replaceTemplate,
  (dragged, targets) => new DragTarget(dragged, targets, 'replace')
)
connect(
  appendDemo,
  appendTemplate,
  (dragged, targets) => new DragTarget(dragged, targets, 'append')
)
