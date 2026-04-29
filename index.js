// dist/index.js
function intersects(a, b) {
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  return !(ar.right < br.left || ar.left > br.right || ar.bottom < br.top || ar.top > br.bottom);
}
function drag(pointerEvent, onIntersectingStart, onIntersectingStop) {
  const target = pointerEvent.target;
  if (!(target instanceof HTMLElement)) return;
  const watcherClass = `${target.className}-watcher`;
  let watcher;
  let intersecting = false;
  const closestWatcher = (event) => {
    const elements = target.ownerDocument.elementsFromPoint(
      event.clientX,
      event.clientY
    );
    for (const element of elements) {
      if (element instanceof HTMLElement && element !== target) {
        if (element.classList.contains(watcherClass)) return element;
      }
    }
  };
  const move = (event) => {
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
    void target.removeEventListener("pointermove", move);
    void target.removeEventListener("pointerup", stop);
    void target.removeEventListener("pointercancel", stop);
    if (target.hasPointerCapture(event.pointerId))
      void target.releasePointerCapture(event.pointerId);
  };
  void target.setPointerCapture(pointerEvent.pointerId);
  void target.addEventListener("pointermove", move);
  void target.addEventListener("pointerup", stop);
  void target.addEventListener("pointercancel", stop);
}
function startWatch(watcher, elementToWatch) {
  watcher.classList.add(`${elementToWatch.className}-watcher`);
}
function stopWatch(watcher, elementToWatch) {
  watcher.classList.remove(`${elementToWatch.className}-watcher`);
}

// in-browser-testing-libs.ts
var controls = document.querySelector("div.controls");
if (!controls) throw new Error();
var boxes = [];
for (let i = 0; i < 9; i++) {
  const box = document.createElement("div");
  box.textContent = `${i + 1}`;
  box.classList.add(`box-${i}`);
  void controls.appendChild(box);
  void box.addEventListener("pointerdown", async (event) => {
    box.dataset.dragging = "true";
    void drag(event, async (dragged, watcher) => {
      const draggedRect = dragged.getBoundingClientRect();
      const watcherRect = watcher.getBoundingClientRect();
      const marker = document.createTextNode("");
      void controls.insertBefore(marker, dragged);
      void controls.insertBefore(dragged, watcher);
      void controls.insertBefore(watcher, marker);
      marker.remove();
      const nextDraggedRect = dragged.getBoundingClientRect();
      const nextWatcherRect = watcher.getBoundingClientRect();
      const x = Number(dragged.dataset.x ?? 0) + draggedRect.left - nextDraggedRect.left;
      const y = Number(dragged.dataset.y ?? 0) + draggedRect.top - nextDraggedRect.top;
      dragged.dataset.x = String(x);
      dragged.dataset.y = String(y);
      dragged.style.transform = `translate(${x}px, ${y}px)`;
      watcher.dataset.noTransition = "true";
      watcher.style.transform = `translate(${watcherRect.left - nextWatcherRect.left}px, ${watcherRect.top - nextWatcherRect.top}px)`;
      requestAnimationFrame(() => {
        delete watcher.dataset.noTransition;
        watcher.style.transform = "";
      });
    });
    for (const otherBox of boxes) {
      if (otherBox === box) continue;
      void startWatch(otherBox, box);
    }
  });
  void box.addEventListener("pointerup", async () => {
    delete box.dataset.dragging;
    box.style.transform = "translate(0px, 0px)";
    delete box.dataset.x;
    delete box.dataset.y;
    for (const otherBox of boxes) {
      if (otherBox === box) continue;
      void stopWatch(otherBox, box);
    }
  });
  boxes.push(box);
}
