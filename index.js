// dist/index.js
function raiseDragged(dragged) {
  const restoredStyle = {
    position: dragged.style.position,
    transform: dragged.style.transform,
    transition: dragged.style.transition,
    zIndex: dragged.style.zIndex
  };
  if (dragged.ownerDocument.defaultView?.getComputedStyle(dragged).position === "static")
    dragged.style.position = "relative";
  dragged.style.zIndex = "2147483647";
  return restoredStyle;
}
function restoreDraggedStyle(dragged, restoredStyle) {
  dragged.style.position = restoredStyle.position;
  dragged.style.transform = restoredStyle.transform;
  dragged.style.transition = restoredStyle.transition;
  dragged.style.zIndex = restoredStyle.zIndex;
}
function ignoreAnimationAbort(error) {
  if (error instanceof DOMException && error.name === "AbortError") return;
  throw error;
}
function dropDraggedOnTarget(dragged, target, commit, animationDuration, restoredStyle) {
  const raisedStyle = raiseDragged(dragged);
  const nextRestoredStyle = restoredStyle ?? raisedStyle;
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
    void commit();
    delete dragged.dataset.x;
    delete dragged.dataset.y;
    void restoreDraggedStyle(dragged, {
      ...nextRestoredStyle,
      transform: ""
    });
  }).catch(ignoreAnimationAbort);
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
function ignoreAnimationAbort2(error) {
  if (error instanceof DOMException && error.name === "AbortError") return;
  throw error;
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
    void restoreDraggedStyle(dragged, restoredStyle);
  }).catch(ignoreAnimationAbort2);
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
  const restoredStyle = raiseDragged(target);
  const userSelect = ownerDocument.body.style.userSelect;
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
    void restoreDraggedStyle(target, {
      ...restoredStyle,
      transform: target.style.transform,
      transition: target.style.transition
    });
    if (target.hasPointerCapture(event.pointerId))
      void target.releasePointerCapture(event.pointerId);
    if (event.target !== target) {
      void target.dispatchEvent(
        new PointerEvent(event.type, { pointerId: event.pointerId })
      );
    }
  };
  ownerDocument.body.style.userSelect = "none";
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
var DragTarget = class {
  /**
   * Creates a drag target interaction.
   *
   * @param dragged The element users can drag.
   * @param targets One target element, or an iterable of target elements.
   * @param action The DOM operation to perform when a target accepts the drag.
   * @param animationDuration The duration of generated animations, in milliseconds.
   */
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
  /**
   * The target elements that can accept the dragged element.
   */
  targets;
  abortController = new AbortController();
  eventTarget = new EventTarget();
  restoredStyles = /* @__PURE__ */ new Map();
  used = false;
  /**
   * Replays a drag movement for the managed dragged element.
   *
   * @param instruction The dragged element and translate offset to apply.
   */
  remoteDrag({ thisEl, x, y }) {
    if (this.used || thisEl !== this.dragged) return;
    for (const animation of thisEl.getAnimations()) animation.cancel();
    if (!this.restoredStyles.has(thisEl)) {
      void this.restoredStyles.set(thisEl, raiseDragged(thisEl));
      thisEl.style.transition = "none";
    }
    void moveDraggedToOffset(thisEl, x, y);
  }
  /**
   * Replays a committed drop onto a target.
   *
   * @param swap The dragged element and target element to commit.
   */
  remoteSwap({ thisEl, withEl }) {
    if (this.used || thisEl !== this.dragged) return;
    const target = this.targets.find((target2) => target2 === withEl);
    if (!target) return;
    this.used = true;
    const restoredStyle = this.restoredStyles.get(thisEl);
    void this.restoredStyles.delete(thisEl);
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
      this.animationDuration,
      restoredStyle
    );
  }
  /**
   * Replays the end of an uncommitted drag operation.
   *
   * @param event The settle event detail to apply.
   */
  remoteSettle({ thisEl }) {
    if (this.used || thisEl !== this.dragged) return;
    const restoredStyle = this.restoredStyles.get(thisEl);
    void this.restoredStyles.delete(thisEl);
    void returnDraggedToStart(thisEl, this.animationDuration, restoredStyle);
  }
  /**
   * Returns the first target with the given element id.
   *
   * @param id The element id to match.
   * @returns The matching target, or `undefined` if no target matches.
   */
  getTargetById(id) {
    return this.targets.find((target) => target.id === id);
  }
  /**
   * Appends an event listener for events whose type is `type`.
   *
   * @param type The drag target event type to listen for.
   * @param listener The callback or event listener object that receives the event.
   * @param options Options that control listener registration.
   */
  addEventListener(type, listener, options) {
    void this.eventTarget.addEventListener(
      type,
      listener,
      options
    );
  }
  /**
   * Removes an event listener previously registered with {@link addEventListener}.
   *
   * @param type The drag target event type.
   * @param listener The callback or event listener object to remove.
   * @param options Options that identify the listener registration.
   */
  removeEventListener(type, listener, options) {
    void this.eventTarget.removeEventListener(
      type,
      listener,
      options
    );
  }
};
var SwapSet = class {
  /**
   * Creates a swap set from the provided elements.
   *
   * @param elements Elements to include; non-HTMLElement values are ignored.
   * @param animationDuration The duration of generated animations, in milliseconds.
   */
  constructor(elements, animationDuration = 200) {
    this.animationDuration = animationDuration;
    this.members = Array.from(elements).filter(
      (element) => element instanceof HTMLElement
    );
    for (const item of this.members) {
      void item.addEventListener("pointerdown", (event) => {
        const restoredStyle = raiseDragged(item);
        for (const animation of item.getAnimations()) animation.cancel();
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
          void returnDraggedToStart(item, this.animationDuration, restoredStyle);
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
  /**
   * The draggable members managed by this set.
   */
  members;
  eventTarget = new EventTarget();
  restoredStyles = /* @__PURE__ */ new Map();
  /**
   * Replays a drag movement against one managed member.
   *
   * @param instruction The member and translate offset to apply.
   */
  remoteDrag({ thisEl, x, y }) {
    for (const animation of thisEl.getAnimations()) animation.cancel();
    if (!this.restoredStyles.has(thisEl)) {
      void this.restoredStyles.set(thisEl, raiseDragged(thisEl));
      thisEl.style.transition = "none";
    }
    void moveDraggedToOffset(thisEl, x, y);
  }
  /**
   * Replays a member swap.
   *
   * @param swap The member and peer element to swap.
   */
  remoteSwap({ thisEl, withEl }) {
    void swapDraggedWithWatcher(thisEl, withEl, this.animationDuration);
  }
  /**
   * Replays the end of a drag operation for one managed member.
   *
   * @param event The settle event detail to apply.
   */
  remoteSettle({ thisEl }) {
    const restoredStyle = this.restoredStyles.get(thisEl);
    void this.restoredStyles.delete(thisEl);
    void returnDraggedToStart(thisEl, this.animationDuration, restoredStyle);
  }
  /**
   * Returns the first managed member with the given element id.
   *
   * @param id The element id to match.
   * @returns The matching member, or `undefined` if no member matches.
   */
  getMemberById(id) {
    return this.members.find((member) => member.id === id);
  }
  /**
   * Appends an event listener for events whose type is `type`.
   *
   * @param type The swap set event type to listen for.
   * @param listener The callback or event listener object that receives the event.
   * @param options Options that control listener registration.
   */
  addEventListener(type, listener, options) {
    void this.eventTarget.addEventListener(
      type,
      listener,
      options
    );
  }
  /**
   * Removes an event listener previously registered with {@link addEventListener}.
   *
   * @param type The swap set event type.
   * @param listener The callback or event listener object to remove.
   * @param options Options that identify the listener registration.
   */
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
  document.querySelectorAll("[data-swap-set]")
);
var swapSets = [];
for (const controls of controlsArr) {
  if (!controls) throw new Error();
  for (let i = 0; i < 9; i++) {
    const box = document.createElement("div");
    box.id = `box:${i + 1}`;
    box.textContent = `${i + 1}`;
    void controls.appendChild(box);
  }
  const swapSet = new SwapSet(controls.children);
  void swapSets.push(swapSet);
  swapSet.addEventListener("drag", ({ detail }) => {
    for (const otherSet of swapSets) {
      if (otherSet === swapSet) continue;
      const thisEl = otherSet.getMemberById(detail.thisEl.id);
      if (!thisEl) continue;
      void otherSet.remoteDrag({ thisEl, x: detail.x, y: detail.y });
    }
  });
  swapSet.addEventListener("swap", ({ detail }) => {
    for (const otherSet of swapSets) {
      if (otherSet === swapSet) continue;
      const thisEl = otherSet.getMemberById(detail.thisEl.id);
      const withEl = otherSet.getMemberById(detail.withEl.id);
      if (!thisEl || !withEl) continue;
      void otherSet.remoteSwap({ thisEl, withEl });
    }
  });
  swapSet.addEventListener("settle", ({ detail }) => {
    for (const otherSet of swapSets) {
      if (otherSet === swapSet) continue;
      const thisEl = otherSet.getMemberById(detail.thisEl.id);
      if (!thisEl) continue;
      void otherSet.remoteSettle({ thisEl });
    }
  });
}
var connect = (demo, template, targetFor) => {
  const pair = demo.querySelector("[data-target-pair]");
  const reset = demo.querySelector("[data-reset]");
  if (!pair || !reset) throw new Error();
  let dragTargets = [];
  const fill = () => {
    pair.replaceChildren(template.content.cloneNode(true));
    dragTargets = [];
    const rows = Array.from(pair.querySelectorAll(".target-row"));
    for (const row of rows) {
      const dragged = row.querySelector("[data-dragged]");
      const targets = Array.from(row.querySelectorAll("[data-target]")).filter(
        (element) => element instanceof HTMLElement
      );
      if (!dragged || targets.length === 0) throw new Error();
      dragged.id = `${demo.dataset.targetDemo}:dragged`;
      for (const [index, target] of targets.entries())
        target.id = `${demo.dataset.targetDemo}:target:${index}`;
      void dragTargets.push(targetFor(dragged, targets));
    }
    for (const dragTarget of dragTargets) watchTarget(dragTarget, dragTargets);
  };
  reset.addEventListener("click", fill);
  fill();
};
var watchTarget = (dragTarget, dragTargets) => {
  dragTarget.addEventListener("intersecting", ({ detail }) => {
    detail.withEl.dataset.intersecting = "true";
    for (const otherTarget of dragTargets) {
      if (otherTarget === dragTarget) continue;
      const withEl = otherTarget.getTargetById(detail.withEl.id);
      if (withEl) withEl.dataset.intersecting = "true";
    }
  });
  dragTarget.addEventListener("notintersecting", ({ detail }) => {
    delete detail.withEl.dataset.intersecting;
    for (const otherTarget of dragTargets) {
      if (otherTarget === dragTarget) continue;
      const withEl = otherTarget.getTargetById(detail.withEl.id);
      if (withEl) delete withEl.dataset.intersecting;
    }
  });
  dragTarget.addEventListener("drag", ({ detail }) => {
    for (const otherTarget of dragTargets) {
      if (otherTarget === dragTarget) continue;
      if (otherTarget.dragged.id !== detail.thisEl.id) continue;
      void otherTarget.remoteDrag({
        thisEl: otherTarget.dragged,
        x: detail.x,
        y: detail.y
      });
    }
  });
  dragTarget.addEventListener("swap", ({ detail }) => {
    delete detail.withEl.dataset.intersecting;
    for (const otherTarget of dragTargets) {
      if (otherTarget === dragTarget) continue;
      if (otherTarget.dragged.id !== detail.thisEl.id) continue;
      const withEl = otherTarget.getTargetById(detail.withEl.id);
      if (!withEl) continue;
      delete withEl.dataset.intersecting;
      void otherTarget.remoteSwap({ thisEl: otherTarget.dragged, withEl });
    }
  });
  dragTarget.addEventListener("settle", ({ detail }) => {
    for (const target of dragTarget.targets) delete target.dataset.intersecting;
    for (const otherTarget of dragTargets) {
      if (otherTarget === dragTarget) continue;
      if (otherTarget.dragged.id !== detail.thisEl.id) continue;
      for (const target of otherTarget.targets)
        delete target.dataset.intersecting;
      void otherTarget.remoteSettle({ thisEl: otherTarget.dragged });
    }
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
  (dragged, targets) => new DragTarget(dragged, targets, "replace")
);
connect(
  appendDemo,
  appendTemplate,
  (dragged, targets) => new DragTarget(dragged, targets, "append")
);
