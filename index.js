// dist/index.js
function dropDraggedOnTarget(dragged, target, commit, animationDuration) {
  const position = dragged.style.position;
  const zIndex = dragged.style.zIndex;
  const x = Number(dragged.dataset.x ?? 0);
  const y = Number(dragged.dataset.y ?? 0);
  const from = dragged.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const next = `translate(${x + to.left - from.left}px, ${y + to.top - from.top}px)`;
  const animation = dragged.animate(
    [{ transform: dragged.style.transform || "none" }, { transform: next }],
    { duration: animationDuration, easing: "ease" }
  );
  if (dragged.ownerDocument.defaultView?.getComputedStyle(dragged).position === "static")
    dragged.style.position = "relative";
  dragged.style.zIndex = "2147483647";
  dragged.style.transform = next;
  void animation.finished.finally(() => {
    void commit();
    delete dragged.dataset.x;
    delete dragged.dataset.y;
    dragged.style.transform = "";
    dragged.style.position = position;
    dragged.style.zIndex = zIndex;
  });
}
function intersects(a, b) {
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  return !(ar.right < br.left || ar.left > br.right || ar.bottom < br.top || ar.top > br.bottom);
}
function moveDraggedToOffset(dragged, x, y) {
  dragged.dataset.x = String(x);
  dragged.dataset.y = String(y);
  dragged.style.transform = `translate(${x}px, ${y}px)`;
}
function returnDraggedToStart(dragged, animationDuration, restoredStyle) {
  const nextTransform = restoredStyle?.transform || "none";
  const animation = dragged.animate(
    [
      { transform: dragged.style.transform || "none" },
      { transform: nextTransform }
    ],
    { duration: animationDuration, easing: "ease" }
  );
  dragged.style.transform = nextTransform;
  delete dragged.dataset.x;
  delete dragged.dataset.y;
  void animation.finished.finally(() => {
    if (!restoredStyle) {
      dragged.style.transform = "";
      return;
    }
    dragged.style.transform = restoredStyle.transform;
    if (restoredStyle.transition !== void 0)
      dragged.style.transition = restoredStyle.transition;
  });
}
function swapDraggedWithWatcher(dragged, watcher, animationDuration) {
  const draggedRect = dragged.getBoundingClientRect();
  const watcherRect = watcher.getBoundingClientRect();
  const marker = watcher.ownerDocument.createTextNode("");
  void watcher.parentNode?.insertBefore(marker, watcher);
  void dragged.parentNode?.insertBefore(watcher, dragged);
  void marker.parentNode?.insertBefore(dragged, marker);
  void marker.remove();
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
}
function drag(pointerEvent, onIntersectingStart, onIntersectingStop, onMove) {
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
        if (element.dataset.dragonWatches === target.dataset.dragonwatchId)
          return element;
      }
    }
  };
  const move = (event) => {
    if (event.pointerId !== pointerEvent.pointerId) return;
    const x = Number(target.dataset.x ?? 0) + event.movementX;
    const y = Number(target.dataset.y ?? 0) + event.movementY;
    void moveDraggedToOffset(target, x, y);
    void onMove?.(target, { thisEl: target, x, y }, event);
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
      void target.dispatchEvent(
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
  const id = elementToWatch.dataset.dragonwatchId ?? crypto.randomUUID();
  elementToWatch.dataset.dragonwatchId = id;
  watcher.dataset.dragonWatches = id;
}
function stopWatch(watcher, elementToWatch) {
  if (watcher.dataset.dragonWatches === elementToWatch.dataset.dragonwatchId)
    delete watcher.dataset.dragonWatches;
}
var DragArea = class {
  constructor(elements, animationDuration = 200) {
    this.animationDuration = animationDuration;
    this.members = Array.from(elements).filter(
      (element) => element instanceof HTMLElement
    );
    for (const item of this.members) {
      void item.addEventListener("pointerdown", (event) => {
        for (const animation of item.getAnimations()) animation.cancel();
        const originalTransform = item.style.transform;
        const originalTransition = item.style.transition;
        item.dataset.dragging = "true";
        item.style.transition = "none";
        void drag(
          event,
          (dragged, watcher) => {
            void swapDraggedWithWatcher(
              dragged,
              watcher,
              this.animationDuration
            );
            void this.eventTarget.dispatchEvent(
              new CustomEvent("swap", {
                detail: { thisEl: dragged, withEl: watcher }
              })
            );
          },
          void 0,
          (_dragged, { thisEl, x, y }, pointerEvent) => {
            void this.eventTarget.dispatchEvent(
              new CustomEvent("drag", {
                detail: { pointerEvent, thisEl, x, y }
              })
            );
          }
        );
        for (const other of this.members)
          if (other !== item) void startWatch(other, item);
        const stop = () => {
          if (item.dataset.dragging !== "true") return;
          delete item.dataset.dragging;
          void returnDraggedToStart(item, this.animationDuration, {
            transform: originalTransform,
            transition: originalTransition
          });
          void this.eventTarget.dispatchEvent(
            new CustomEvent("settle", {
              detail: { thisEl: item }
            })
          );
          for (const other of this.members)
            if (other !== item) void stopWatch(other, item);
        };
        void item.addEventListener("pointerup", stop, { once: true });
        void item.addEventListener("pointercancel", stop, { once: true });
      });
    }
  }
  animationDuration;
  members;
  eventTarget = new EventTarget();
  remoteDrag({ thisEl, x, y }) {
    for (const animation of thisEl.getAnimations()) animation.cancel();
    void moveDraggedToOffset(thisEl, x, y);
  }
  remoteSwap({ thisEl, withEl }) {
    void swapDraggedWithWatcher(thisEl, withEl, this.animationDuration);
  }
  remoteSettle({ thisEl }) {
    void returnDraggedToStart(thisEl, this.animationDuration);
  }
  getMemberById(id) {
    return this.members.find((member) => member.id === id);
  }
  addEventListener(type, listener, options) {
    void this.eventTarget.addEventListener(
      type,
      listener,
      options
    );
  }
  removeEventListener(type, listener, options) {
    void this.eventTarget.removeEventListener(
      type,
      listener,
      options
    );
  }
};
var DragTarget = class {
  constructor(dragged, targets, action, animationDuration = 200) {
    this.dragged = dragged;
    this.action = action;
    this.animationDuration = animationDuration;
    this.targets = targets instanceof HTMLElement ? [targets] : Array.from(targets);
    void this.dragged.addEventListener(
      "pointerdown",
      (event) => {
        if (this.used) return;
        let activeTarget;
        for (const target of this.targets) void startWatch(target, this.dragged);
        void drag(
          event,
          (_dragged, target) => {
            activeTarget = target;
            void this.eventTarget.dispatchEvent(
              new CustomEvent(
                "intersecting",
                {
                  detail: { thisEl: this.dragged, withEl: target }
                }
              )
            );
          },
          (_dragged, target) => {
            if (activeTarget === target) activeTarget = void 0;
            void this.eventTarget.dispatchEvent(
              new CustomEvent(
                "notintersecting",
                {
                  detail: { thisEl: this.dragged, withEl: target }
                }
              )
            );
          },
          (_dragged, { thisEl, x, y }, pointerEvent) => {
            void this.eventTarget.dispatchEvent(
              new CustomEvent("drag", {
                detail: { pointerEvent, thisEl, x, y }
              })
            );
          }
        );
        const stop = () => {
          if (this.used) return;
          for (const target2 of this.targets)
            void stopWatch(target2, this.dragged);
          const target = activeTarget;
          if (target) {
            this.used = true;
            void this.abortController.abort();
            void dropDraggedOnTarget(
              this.dragged,
              target,
              () => {
                if (this.action === "replace")
                  void target.replaceWith(this.dragged);
                else void target.appendChild(this.dragged);
                void this.eventTarget.dispatchEvent(
                  new CustomEvent("swap", {
                    detail: { thisEl: this.dragged, withEl: target }
                  })
                );
              },
              this.animationDuration
            );
          } else {
            void returnDraggedToStart(this.dragged, this.animationDuration);
            void this.eventTarget.dispatchEvent(
              new CustomEvent("settle", {
                detail: { thisEl: this.dragged }
              })
            );
          }
          activeTarget = void 0;
        };
        void this.dragged.addEventListener("pointerup", stop, {
          once: true,
          signal: this.abortController.signal
        });
        void this.dragged.addEventListener("pointercancel", stop, {
          once: true,
          signal: this.abortController.signal
        });
      },
      { signal: this.abortController.signal }
    );
  }
  dragged;
  action;
  animationDuration;
  targets;
  abortController = new AbortController();
  eventTarget = new EventTarget();
  used = false;
  remoteDrag({ thisEl, x, y }) {
    if (this.used || thisEl !== this.dragged) return;
    for (const animation of thisEl.getAnimations()) animation.cancel();
    void moveDraggedToOffset(thisEl, x, y);
  }
  remoteSwap({ thisEl, withEl }) {
    if (this.used || thisEl !== this.dragged) return;
    const target = this.targets.find((target2) => target2 === withEl);
    if (!target) return;
    this.used = true;
    for (const watchedTarget of this.targets)
      void stopWatch(watchedTarget, this.dragged);
    void this.abortController.abort();
    void dropDraggedOnTarget(
      thisEl,
      target,
      () => {
        if (this.action === "replace") void target.replaceWith(thisEl);
        else void target.appendChild(thisEl);
      },
      this.animationDuration
    );
  }
  remoteSettle({ thisEl }) {
    if (this.used || thisEl !== this.dragged) return;
    void returnDraggedToStart(thisEl, this.animationDuration);
  }
  getTargetById(id) {
    return this.targets.find((target) => target.id === id);
  }
  addEventListener(type, listener, options) {
    void this.eventTarget.addEventListener(
      type,
      listener,
      options
    );
  }
  removeEventListener(type, listener, options) {
    void this.eventTarget.removeEventListener(
      type,
      listener,
      options
    );
  }
};

// in-browser-testing-libs.ts
var controlsArr = Array.from(
  document.querySelectorAll("div.controls")
);
var areaArr = [];
for (const controls of controlsArr) {
  if (!controls) throw new Error();
  for (let i = 0; i < 9; i++) {
    const box = document.createElement("div");
    box.id = `box:${i + 1}`;
    box.textContent = `${i + 1}`;
    void controls.appendChild(box);
  }
  const area = new DragArea(controls.children);
  areaArr.push(area);
  area.addEventListener("drag", ({ detail }) => {
    for (const otherArea of areaArr) {
      if (otherArea === area) continue;
      const thisEl = otherArea.getMemberById(detail.thisEl.id);
      if (!thisEl) continue;
      otherArea.remoteDrag({ thisEl, x: detail.x, y: detail.y });
    }
  });
  area.addEventListener("swap", ({ detail }) => {
    for (const otherArea of areaArr) {
      if (otherArea === area) continue;
      const thisEl = otherArea.getMemberById(detail.thisEl.id);
      const withEl = otherArea.getMemberById(detail.withEl.id);
      if (!thisEl || !withEl) continue;
      otherArea.remoteSwap({ thisEl, withEl });
    }
  });
  area.addEventListener("settle", ({ detail }) => {
    for (const otherArea of areaArr) {
      if (otherArea === area) continue;
      const thisEl = otherArea.getMemberById(detail.thisEl.id);
      if (!thisEl) continue;
      otherArea.remoteSettle({ thisEl });
    }
  });
}
var connect = (demo, template, targetFor) => {
  const row = demo.querySelector(".target-row");
  const reset = demo.querySelector("[data-reset]");
  if (!row || !reset) throw new Error();
  const fill = () => {
    row.replaceChildren(template.content.cloneNode(true));
    const dragged2 = row.querySelector("[data-dragged]");
    const targets2 = Array.from(row.querySelectorAll("[data-target]")).filter(
      (element) => element instanceof HTMLElement
    );
    if (!dragged2 || targets2.length === 0) throw new Error();
    watchTarget(targetFor(dragged2, targets2));
  };
  reset.addEventListener("click", fill);
  const dragged = row.querySelector("[data-dragged]");
  const targets = Array.from(row.querySelectorAll("[data-target]")).filter(
    (element) => element instanceof HTMLElement
  );
  if (!dragged || targets.length === 0) throw new Error();
  watchTarget(targetFor(dragged, targets));
};
var watchTarget = (dragTarget) => {
  dragTarget.addEventListener("intersecting", ({ detail }) => {
    detail.withEl.dataset.intersecting = "true";
  });
  dragTarget.addEventListener("notintersecting", ({ detail }) => {
    delete detail.withEl.dataset.intersecting;
  });
  dragTarget.addEventListener("swap", ({ detail }) => {
    delete detail.withEl.dataset.intersecting;
  });
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
connect(
  replaceDemo,
  replaceTemplate,
  (dragged, target) => new DragTarget(dragged, target, "replace")
);
connect(
  appendDemo,
  appendTemplate,
  (dragged, target) => new DragTarget(dragged, target, "append")
);
