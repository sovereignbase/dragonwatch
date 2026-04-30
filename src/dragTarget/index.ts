import { drag } from '../drag/index.js'
import { startWatch, stopWatch } from '../watch/index.js'

const moveTo = (
  dragged: HTMLElement,
  target: HTMLElement,
  change: () => void,
  animationDuration: number
): void => {
  const x = Number(dragged.dataset.x ?? 0)
  const y = Number(dragged.dataset.y ?? 0)
  const from = dragged.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const next = `translate(${x + to.left - from.left}px, ${
    y + to.top - from.top
  }px)`
  const animation = dragged.animate(
    [{ transform: dragged.style.transform || 'none' }, { transform: next }],
    { duration: animationDuration, easing: 'ease' }
  )
  dragged.style.transform = next
  void animation.finished.finally(() => {
    change()
    delete dragged.dataset.x
    delete dragged.dataset.y
    dragged.style.transform = ''
  })
}

const moveBack = (dragged: HTMLElement, animationDuration: number): void => {
  const animation = dragged.animate(
    [{ transform: dragged.style.transform || 'none' }, { transform: 'none' }],
    { duration: animationDuration, easing: 'ease' }
  )
  delete dragged.dataset.x
  delete dragged.dataset.y
  dragged.style.transform = ''
  void animation.finished
}

const targetFor = (
  dragged: HTMLElement,
  target: HTMLElement,
  change: () => void,
  animationDuration: number
): void => {
  let active = false
  dragged.addEventListener('pointerdown', (event) => {
    startWatch(target, dragged)
    drag(
      event,
      () => {
        active = true
      },
      () => {
        active = false
      }
    )
    const stop = (): void => {
      stopWatch(target, dragged)
      if (active) moveTo(dragged, target, change, animationDuration)
      else moveBack(dragged, animationDuration)
      active = false
    }
    dragged.addEventListener('pointerup', stop, { once: true })
    dragged.addEventListener('pointercancel', stop, { once: true })
  })
}

export class DragTarget {
  constructor(
    dragged: HTMLElement,
    target: HTMLElement,
    action: 'replace' | 'append',
    animationDuration: number = 200
  ) {
    targetFor(
      dragged,
      target,
      () =>
        void (action === 'replace' ? target.replaceWith : target.appendChild)(
          dragged
        ),
      animationDuration
    )
  }
}
