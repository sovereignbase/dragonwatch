export function startWatch(
  watcher: HTMLElement,
  elementToWatch: HTMLElement
): void {
  watcher.classList.add(`${elementToWatch.className}-watcher`)
}

export function stopWatch(
  watcher: HTMLElement,
  elementToWatch: HTMLElement
): void {
  watcher.classList.remove(`${elementToWatch.className}-watcher`)
}
