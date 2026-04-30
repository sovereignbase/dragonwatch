import { DragArea, DragTarget } from './dist/index.js'

const controlsArr: HTMLElement[] = Array.from(
  document.querySelectorAll('div.controls')
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
  areaArr.push(area)
  area.addEventListener('drag', ({ detail }) => {
    for (const otherArea of areaArr) {
      if (otherArea === area) continue
      otherArea.remoteDrag(detail)
    }
  })
  area.addEventListener('swap', ({ detail }) => {
    for (const otherArea of areaArr) {
      if (otherArea === area) continue
      otherArea.remoteSwap(detail)
    }
  })
}
/////////
const connect = (
  demo: HTMLElement,
  template: HTMLTemplateElement,
  targetFor: (dragged: HTMLElement, target: HTMLElement) => DragTarget
): void => {
  const row: HTMLElement | null = demo.querySelector('.target-row')
  const reset: HTMLButtonElement | null = demo.querySelector('[data-reset]')
  if (!row || !reset) throw new Error()

  const fill = (): void => {
    row.replaceChildren(template.content.cloneNode(true))
    const dragged: HTMLElement | null = row.querySelector('[data-dragged]')
    const target: HTMLElement | null = row.querySelector('[data-target]')
    if (!dragged || !target) throw new Error()
    watchTarget(targetFor(dragged, target), target)
  }

  reset.addEventListener('click', fill)
  const dragged: HTMLElement | null = row.querySelector('[data-dragged]')
  const target: HTMLElement | null = row.querySelector('[data-target]')
  if (!dragged || !target) throw new Error()
  watchTarget(targetFor(dragged, target), target)
}

const watchTarget = (dragTarget: DragTarget, target: HTMLElement): void => {
  dragTarget.addEventListener('intersecting', () => {
    target.dataset.intersecting = 'true'
  })
  dragTarget.addEventListener('notintersecting', () => {
    delete target.dataset.intersecting
  })
  dragTarget.addEventListener('swap', () => {
    delete target.dataset.intersecting
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
  (dragged, target) => new DragTarget(dragged, target, 'replace')
)
connect(
  appendDemo,
  appendTemplate,
  (dragged, target) => new DragTarget(dragged, target, 'append')
)
