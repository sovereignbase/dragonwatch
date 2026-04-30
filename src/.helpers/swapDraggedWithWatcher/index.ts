export function swapDraggedWithWatcher(
  dragged: HTMLElement,
  watcher: HTMLElement,
  animationDuration: number
): void {
  const draggedRect = dragged.getBoundingClientRect()
  const watcherRect = watcher.getBoundingClientRect()
  const marker = watcher.ownerDocument.createTextNode('')
  void watcher.parentNode?.insertBefore(marker, watcher)
  void dragged.parentNode?.insertBefore(watcher, dragged)
  void marker.parentNode?.insertBefore(dragged, marker)
  void marker.remove()

  const nextDraggedRect = dragged.getBoundingClientRect()
  const nextWatcherRect = watcher.getBoundingClientRect()
  const x =
    Number(dragged.dataset.x ?? 0) + draggedRect.left - nextDraggedRect.left
  const y =
    Number(dragged.dataset.y ?? 0) + draggedRect.top - nextDraggedRect.top
  dragged.dataset.x = String(x)
  dragged.dataset.y = String(y)
  dragged.style.transform = `translate(${x}px, ${y}px)`

  void watcher.animate(
    [
      {
        transform: `translate(${watcherRect.left - nextWatcherRect.left}px, ${
          watcherRect.top - nextWatcherRect.top
        }px)`,
      },
      { transform: 'none' },
    ],
    { duration: animationDuration, easing: 'ease' }
  )
}
