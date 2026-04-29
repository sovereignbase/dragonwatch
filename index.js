// dist/index.js
function intersects(a, b) {
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  return !(ar.right < br.left || ar.left > br.right || ar.bottom < br.top || ar.top > br.bottom);
}
function drag(pointerEvent, onIntersectingStart, onIntersectingStop) {
  const target = pointerEvent.target;
  if (!(target instanceof HTMLElement)) return;
  const maybeWatcher = target.ownerDocument.getElementsByClassName(
    `${target.className}-watcher`
  )[0];
  const watcher2 = maybeWatcher instanceof HTMLElement ? maybeWatcher : void 0;
  let intersecting = false;
  const move = (event) => {
    const x = Number(target.dataset.x ?? 0) + event.movementX;
    const y = Number(target.dataset.y ?? 0) + event.movementY;
    target.dataset.x = String(x);
    target.dataset.y = String(y);
    target.style.transform = `translate(${x}px, ${y}px)`;
    if (!watcher2) return;
    const next = intersects(target, watcher2);
    if (next === intersecting) return;
    intersecting = next;
    const callback = next ? onIntersectingStart : onIntersectingStop;
    if (typeof callback === "function") void callback(target, watcher2);
  };
  const stop = (event) => {
    void target.removeEventListener("pointermove", move);
    void target.removeEventListener("pointerup", stop);
    void target.removeEventListener("pointercancel", stop);
    if (target.hasPointerCapture(event.pointerId)) {
      void target.releasePointerCapture(event.pointerId);
    }
  };
  void target.setPointerCapture(pointerEvent.pointerId);
  void target.addEventListener("pointermove", move);
  void target.addEventListener("pointerup", stop);
  void target.addEventListener("pointercancel", stop);
}
function startWatch(watcher2, elementToWatch) {
  watcher2.classList.add(`${elementToWatch.className}-watcher`);
}
function stopWatch(watcher2, elementToWatch) {
  watcher2.classList.remove(`${elementToWatch.className}-watcher`);
}

// in-browser-testing-libs.ts
var dragTarget = document.createElement("h1");
dragTarget.textContent = "moi";
dragTarget.classList.add("moi");
var watcher = document.createElement("div");
watcher.style.cssText = `
width: 100px;
height: 100px;
background: red;
`;
void dragTarget.addEventListener("pointerdown", async (event) => {
  void drag(
    event,
    async (dragged, watcher2) => {
      watcher2.style.background = "green";
    },
    async (dragged, watcher2) => {
      watcher2.style.background = "red";
    }
  );
  startWatch(watcher, dragTarget);
});
void dragTarget.addEventListener("pointerup", async () => {
  stopWatch(watcher, dragTarget);
});
void document.body.appendChild(watcher);
void document.body.appendChild(dragTarget);
