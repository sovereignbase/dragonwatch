import { RestoredDragStyle } from '../../.types/types.js'

export function returnDraggedToStart(
  dragged: HTMLElement,
  animationDuration: number,
  restoredStyle?: RestoredDragStyle
): void {
  const nextTransform = restoredStyle?.transform || 'none'
  const animation = dragged.animate(
    [
      { transform: dragged.style.transform || 'none' },
      { transform: nextTransform },
    ],
    { duration: animationDuration, easing: 'ease' }
  )
  dragged.style.transform = nextTransform
  delete dragged.dataset.x
  delete dragged.dataset.y
  void animation.finished.finally(() => {
    if (!restoredStyle) {
      dragged.style.transform = ''
      return
    }
    dragged.style.transform = restoredStyle.transform
    if (restoredStyle.transition !== undefined)
      dragged.style.transition = restoredStyle.transition
  })
}
