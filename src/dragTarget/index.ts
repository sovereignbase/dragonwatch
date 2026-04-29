import { drag } from '../drag/index.js'
import { startWatch, stopWatch } from '../watch/index.js'

const move = (
  dragged: HTMLElement,
  change: () => void,
  animationDuration: number
): void => {
  const from = dragged.getBoundingClientRect()
  delete dragged.dataset.x
  delete dragged.dataset.y
  dragged.style.transform = ''
  change()
  const to = dragged.getBoundingClientRect()
  dragged.animate(
    [
      {
        transform: `translate(${from.left - to.left}px, ${
          from.top - to.top
        }px)`,
      },
      { transform: 'none' },
    ],
    { duration: animationDuration, easing: 'ease' }
  )
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
      if (active) move(dragged, change, animationDuration)
      else move(dragged, () => {}, animationDuration)
      active = false
    }
    dragged.addEventListener('pointerup', stop, { once: true })
    dragged.addEventListener('pointercancel', stop, { once: true })
  })
}

export const replacedDragTargetFor = (
  dragged: HTMLElement,
  replaced: HTMLElement,
  animationDuration: number = 200
): void =>
  targetFor(
    dragged,
    replaced,
    () => void replaced.replaceWith(dragged),
    animationDuration
  )

export const appendedDragTargetFor = (
  dragged: HTMLElement,
  parent: HTMLElement,
  animationDuration: number = 200
): void =>
  targetFor(
    dragged,
    parent,
    () => void parent.appendChild(dragged),
    animationDuration
  )
