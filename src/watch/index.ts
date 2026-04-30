export function startWatch(
  watcher: HTMLElement,
  elementToWatch: HTMLElement
): void {
  const id = elementToWatch.dataset.dragonwatchId ?? crypto.randomUUID()
  elementToWatch.dataset.dragonwatchId = id
  watcher.dataset.dragonWatches = id
}

export function stopWatch(
  watcher: HTMLElement,
  elementToWatch: HTMLElement
): void {
  if (watcher.dataset.dragonWatches === elementToWatch.dataset.dragonwatchId)
    delete watcher.dataset.dragonWatches
}
