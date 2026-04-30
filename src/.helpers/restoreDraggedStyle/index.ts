import type { RestoredDragStyle } from '../../.types/types.js'

export function restoreDraggedStyle(
  dragged: HTMLElement,
  restoredStyle: RestoredDragStyle
): void {
  dragged.style.position = restoredStyle.position
  dragged.style.transform = restoredStyle.transform
  dragged.style.transition = restoredStyle.transition
  dragged.style.zIndex = restoredStyle.zIndex
}
