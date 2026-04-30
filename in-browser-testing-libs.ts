import {
  appendedDragTargetFor,
  replacedDragTargetFor,
  DragArea,
} from './dist/index.js'

const controls: HTMLElement | null = document.querySelector('div.controls')
if (!controls) throw new Error()

for (let i = 0; i < 12; i++) {
  const box = document.createElement('div')

  box.textContent = `${i + 1}`
  void controls.appendChild(box)
}

new DragArea(controls.children)

const connect = (
  demo: HTMLElement,
  template: HTMLTemplateElement,
  targetFor: (dragged: HTMLElement, target: HTMLElement) => void
): void => {
  const row: HTMLElement | null = demo.querySelector('.target-row')
  const reset: HTMLButtonElement | null = demo.querySelector('[data-reset]')
  if (!row || !reset) throw new Error()

  const fill = (): void => {
    row.replaceChildren(template.content.cloneNode(true))
    const dragged: HTMLElement | null = row.querySelector('[data-dragged]')
    const target: HTMLElement | null = row.querySelector('[data-target]')
    if (!dragged || !target) throw new Error()
    targetFor(dragged, target)
  }

  reset.addEventListener('click', fill)
  const dragged: HTMLElement | null = row.querySelector('[data-dragged]')
  const target: HTMLElement | null = row.querySelector('[data-target]')
  if (!dragged || !target) throw new Error()
  targetFor(dragged, target)
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

connect(replaceDemo, replaceTemplate, replacedDragTargetFor)
connect(appendDemo, appendTemplate, appendedDragTargetFor)
