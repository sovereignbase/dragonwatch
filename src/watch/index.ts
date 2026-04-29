export function startWatch(
  watcher: HTMLElement,
  elementToWatch: HTMLElement
): void {
  const id = elementToWatch.dataset.dragndropId ?? crypto.randomUUID()
  elementToWatch.dataset.dragndropId = id
  watcher.dataset.dragndropWatches = id
}

export function stopWatch(
  watcher: HTMLElement,
  elementToWatch: HTMLElement
): void {
  if (watcher.dataset.dragndropWatches === elementToWatch.dataset.dragndropId)
    delete watcher.dataset.dragndropWatches
}
