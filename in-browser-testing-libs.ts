import { drag, startWatch, stopWatch } from './dist/index.js'

const controls: HTMLElement | null = document.querySelector('div.controls')
if (!controls) throw new Error()

const boxes: HTMLElement[] = []
for (let i = 0; i < 9; i++) {
  const box = document.createElement('div')

  box.textContent = `${i + 1}`
  box.classList.add(`box-${i}`)
  void controls.appendChild(box)

  void box.addEventListener('pointerdown', async (event) => {
    box.dataset.dragging = 'true'
    void drag(event, async (dragged, watcher) => {
      const draggedRect = dragged.getBoundingClientRect()
      const watcherRect = watcher.getBoundingClientRect()
      const marker = document.createTextNode('')
      void controls.insertBefore(marker, dragged)
      void controls.insertBefore(dragged, watcher)
      void controls.insertBefore(watcher, marker)
      marker.remove()
      const nextDraggedRect = dragged.getBoundingClientRect()
      const nextWatcherRect = watcher.getBoundingClientRect()
      const x =
        Number(dragged.dataset.x ?? 0) + draggedRect.left - nextDraggedRect.left
      const y =
        Number(dragged.dataset.y ?? 0) + draggedRect.top - nextDraggedRect.top
      dragged.dataset.x = String(x)
      dragged.dataset.y = String(y)
      dragged.style.transform = `translate(${x}px, ${y}px)`
      watcher.dataset.noTransition = 'true'
      watcher.style.transform = `translate(${watcherRect.left - nextWatcherRect.left}px, ${
        watcherRect.top - nextWatcherRect.top
      }px)`
      requestAnimationFrame(() => {
        delete watcher.dataset.noTransition
        watcher.style.transform = ''
      })
    })
    for (const otherBox of boxes) {
      if (otherBox === box) continue
      void startWatch(otherBox, box)
    }
  })

  void box.addEventListener('pointerup', async () => {
    delete box.dataset.dragging
    box.style.transform = 'translate(0px, 0px)'
    delete box.dataset.x
    delete box.dataset.y
    for (const otherBox of boxes) {
      if (otherBox === box) continue
      void stopWatch(otherBox, box)
    }
  })

  boxes.push(box)
}
