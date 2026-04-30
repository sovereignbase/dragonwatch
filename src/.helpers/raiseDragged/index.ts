import type { RestoredDragStyle } from '../../.types/types.js'

export function raiseDragged(dragged: HTMLElement): RestoredDragStyle {
  const restoredStyle = {
    position: dragged.style.position,
    transform: dragged.style.transform,
    transition: dragged.style.transition,
    zIndex: dragged.style.zIndex,
  }
  if (
    dragged.ownerDocument.defaultView?.getComputedStyle(dragged).position ===
    'static'
  )
    dragged.style.position = 'relative'
  dragged.style.zIndex = '2147483647'
  return restoredStyle
}
