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
  const position = target.style.position;
  const userSelect = ownerDocument.body.style.userSelect;
  const zIndex = target.style.zIndex;
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
    ownerDocument.body.style.userSelect = userSelect;
    target.style.position = position;
    target.style.zIndex = zIndex;
    if (target.hasPointerCapture(event.pointerId))
      void target.releasePointerCapture(event.pointerId);
    if (event.target !== target) {
      target.dispatchEvent(
        new PointerEvent(event.type, { pointerId: event.pointerId })
      );
    }
  };
  ownerDocument.body.style.userSelect = "none";
  if (ownerDocument.defaultView?.getComputedStyle(target).position === "static")
    target.style.position = "relative";
  target.style.zIndex = "2147483647";
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
var moveTo = (dragged, target, change, animationDuration) => {
  const x = Number(dragged.dataset.x ?? 0);
  const y = Number(dragged.dataset.y ?? 0);
  const from = dragged.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const next = `translate(${x + to.left - from.left}px, ${y + to.top - from.top}px)`;
  const animation = dragged.animate(
    [{ transform: dragged.style.transform || "none" }, { transform: next }],
    { duration: animationDuration, easing: "ease" }
  );
  dragged.style.transform = next;
  void animation.finished.finally(() => {
    change();
    delete dragged.dataset.x;
    delete dragged.dataset.y;
    dragged.style.transform = "";
  });
};
var moveBack = (dragged, animationDuration) => {
  const animation = dragged.animate(
    [{ transform: dragged.style.transform || "none" }, { transform: "none" }],
    { duration: animationDuration, easing: "ease" }
  );
  delete dragged.dataset.x;
  delete dragged.dataset.y;
  dragged.style.transform = "";
  void animation.finished;
};
var targetFor = (dragged, target, change, animationDuration) => {
  let active = false;
  dragged.addEventListener("pointerdown", (event) => {
    startWatch(target, dragged);
    drag(
      event,
      () => {
        active = true;
      },
      () => {
        active = false;
      }
    );
    const stop = () => {
      stopWatch(target, dragged);
      if (active) moveTo(dragged, target, change, animationDuration);
      else moveBack(dragged, animationDuration);
      active = false;
    };
    dragged.addEventListener("pointerup", stop, { once: true });
    dragged.addEventListener("pointercancel", stop, { once: true });
  });
};
var replacedDragTargetFor = (dragged, replaced, animationDuration = 200) => targetFor(
  dragged,
  replaced,
  () => void replaced.replaceWith(dragged),
  animationDuration
);
var appendedDragTargetFor = (dragged, parent, animationDuration = 200) => targetFor(
  dragged,
  parent,
  () => void parent.appendChild(dragged),
  animationDuration
);
var DragArea = class {
  constructor(elements, animationDuration = 200) {
    const items = Array.from(elements).filter(
      (element) => element instanceof HTMLElement
    );
    for (const item of items) {
      item.addEventListener("pointerdown", (event) => {
        for (const animation of item.getAnimations()) animation.cancel();
        const originalTransform = item.style.transform;
        const originalTransition = item.style.transition;
        item.dataset.dragging = "true";
        item.style.transition = "none";
        void drag(event, (dragged, watcher) => {
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
          void watcher.animate(
            [
              {
                transform: `translate(${watcherRect.left - nextWatcherRect.left}px, ${watcherRect.top - nextWatcherRect.top}px)`
              },
              { transform: "none" }
            ],
            { duration: animationDuration, easing: "ease" }
          );
        });
        for (const other of items)
          if (other !== item) void startWatch(other, item);
        const stop = () => {
          if (item.dataset.dragging !== "true") return;
          delete item.dataset.dragging;
          const currentTransform = item.style.transform || "none";
          const nextTransform = originalTransform || "none";
          const animation = item.animate(
            [{ transform: currentTransform }, { transform: nextTransform }],
            { duration: animationDuration, easing: "ease" }
          );
          item.style.transform = nextTransform;
          void animation.finished.finally(() => {
            item.style.transform = originalTransform;
            item.style.transition = originalTransition;
          });
          delete item.dataset.x;
          delete item.dataset.y;
          for (const other of items)
            if (other !== item) void stopWatch(other, item);
        };
        void item.addEventListener("pointerup", stop, { once: true });
        void item.addEventListener("pointercancel", stop, { once: true });
      });
    }
  }
};

// in-browser-testing-libs.ts
var controls = document.querySelector("div.controls");
if (!controls) throw new Error();
for (let i = 0; i < 12; i++) {
  const box = document.createElement("div");
  box.textContent = `${i + 1}`;
  void controls.appendChild(box);
}
new DragArea(controls.children);
var connect = (demo, template, targetFor2) => {
  const row = demo.querySelector(".target-row");
  const reset = demo.querySelector("[data-reset]");
  if (!row || !reset) throw new Error();
  const fill = () => {
    row.replaceChildren(template.content.cloneNode(true));
    const dragged2 = row.querySelector("[data-dragged]");
    const target2 = row.querySelector("[data-target]");
    if (!dragged2 || !target2) throw new Error();
    targetFor2(dragged2, target2);
  };
  reset.addEventListener("click", fill);
  const dragged = row.querySelector("[data-dragged]");
  const target = row.querySelector("[data-target]");
  if (!dragged || !target) throw new Error();
  targetFor2(dragged, target);
};
var replaceDemo = document.querySelector(
  "[data-replace-demo]"
);
var appendDemo = document.querySelector("[data-append-demo]");
var replaceTemplate = document.querySelector(
  "#replace-demo-template"
);
var appendTemplate = document.querySelector(
  "#append-demo-template"
);
if (!replaceDemo || !appendDemo || !replaceTemplate || !appendTemplate)
  throw new Error();
connect(replaceDemo, replaceTemplate, replacedDragTargetFor);
connect(appendDemo, appendTemplate, appendedDragTargetFor);
