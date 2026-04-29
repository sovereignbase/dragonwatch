// dist/index.js
function intersects(a, b) {
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  return !(ar.right < br.left || ar.left > br.right || ar.bottom < br.top || ar.top > br.bottom);
}
function drag(pointerEvent, onIntersectingStart, onIntersectingStop) {
  const target = pointerEvent.target;
  if (!(target instanceof HTMLElement)) return;
  const ownerDocument = target.ownerDocument;
  let watcher;
  let intersecting = false;
  const closestWatcher = (event) => {
    const elements = target.ownerDocument.elementsFromPoint(
      event.clientX,
      event.clientY
    );
    for (const element of elements) {
      if (element instanceof HTMLElement && element !== target) {
        if (element.dataset.dragndropWatches === target.dataset.dragndropId)
          return element;
      }
    }
  };
  const move = (event) => {
    if (event.pointerId !== pointerEvent.pointerId) return;
    const x = Number(target.dataset.x ?? 0) + event.movementX;
    const y = Number(target.dataset.y ?? 0) + event.movementY;
    target.dataset.x = String(x);
    target.dataset.y = String(y);
    target.style.transform = `translate(${x}px, ${y}px)`;
    const nextWatcher = closestWatcher(event);
    const next = nextWatcher ? intersects(target, nextWatcher) : false;
    if (intersecting && (!next || nextWatcher !== watcher) && watcher)
      void onIntersectingStop?.(target, watcher);
    if (next && (!intersecting || nextWatcher !== watcher) && nextWatcher)
      void onIntersectingStart?.(target, nextWatcher);
    watcher = nextWatcher;
    intersecting = next;
  };
  const stop = (event) => {
    if (event.pointerId !== pointerEvent.pointerId) return;
    void ownerDocument.removeEventListener("pointermove", move, true);
    void ownerDocument.removeEventListener("pointerup", stop, true);
    void ownerDocument.removeEventListener("pointercancel", stop, true);
    if (target.hasPointerCapture(event.pointerId))
      void target.releasePointerCapture(event.pointerId);
    if (event.target !== target) {
      target.dispatchEvent(
        new PointerEvent(event.type, { pointerId: event.pointerId })
      );
    }
  };
  void target.setPointerCapture(pointerEvent.pointerId);
  void ownerDocument.addEventListener("pointermove", move, true);
  void ownerDocument.addEventListener("pointerup", stop, true);
  void ownerDocument.addEventListener("pointercancel", stop, true);
}
function startWatch(watcher, elementToWatch) {
  const id = elementToWatch.dataset.dragndropId ?? crypto.randomUUID();
  elementToWatch.dataset.dragndropId = id;
  watcher.dataset.dragndropWatches = id;
}
function stopWatch(watcher, elementToWatch) {
  if (watcher.dataset.dragndropWatches === elementToWatch.dataset.dragndropId)
    delete watcher.dataset.dragndropWatches;
}
function swapify(elements) {
  const items = Array.from(elements).filter(
    (element) => element instanceof HTMLElement
  );
  for (const item of items) {
    item.addEventListener("pointerdown", (event) => {
      const originalTransform = item.style.transform;
      item.dataset.dragging = "true";
      drag(event, (dragged, watcher) => {
        const draggedRect = dragged.getBoundingClientRect();
        const watcherRect = watcher.getBoundingClientRect();
        const marker = watcher.ownerDocument.createTextNode("");
        void watcher.parentNode?.insertBefore(marker, watcher);
        void dragged.parentNode?.insertBefore(watcher, dragged);
        void marker.parentNode?.insertBefore(dragged, marker);
        marker.remove();
        const nextDraggedRect = dragged.getBoundingClientRect();
        const nextWatcherRect = watcher.getBoundingClientRect();
        const x = Number(dragged.dataset.x ?? 0) + draggedRect.left - nextDraggedRect.left;
        const y = Number(dragged.dataset.y ?? 0) + draggedRect.top - nextDraggedRect.top;
        dragged.dataset.x = String(x);
        dragged.dataset.y = String(y);
        dragged.style.transform = `translate(${x}px, ${y}px)`;
        watcher.animate(
          [
            {
              transform: `translate(${watcherRect.left - nextWatcherRect.left}px, ${watcherRect.top - nextWatcherRect.top}px)`
            },
            { transform: "none" }
          ],
          { duration: 180, easing: "ease" }
        );
      });
      for (const other of items) if (other !== item) startWatch(other, item);
      const stop = () => {
        if (item.dataset.dragging !== "true") return;
        delete item.dataset.dragging;
        item.style.transform = originalTransform;
        delete item.dataset.x;
        delete item.dataset.y;
        for (const other of items) if (other !== item) stopWatch(other, item);
      };
      item.addEventListener("pointerup", stop, { once: true });
      item.addEventListener("pointercancel", stop, { once: true });
    });
  }
}

// in-browser-testing-libs.ts
var controls = document.querySelector("div.controls");
if (!controls) throw new Error();
for (let i = 0; i < 12; i++) {
  const box = document.createElement("div");
  box.textContent = `${i + 1}`;
  void controls.appendChild(box);
}
swapify(controls.children);
