import type { RestoredDragStyle } from '../../.types/types.js'
import { restoreDraggedStyle } from '../restoreDraggedStyle/index.js'

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
    void restoreDraggedStyle(dragged, restoredStyle)
  })
}
