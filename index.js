// dist/index.js
function drag(pointermoveEvent) {
  const target = pointermoveEvent.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const x = Number(target.dataset.x ?? 0) + pointermoveEvent.movementX;
  const y = Number(target.dataset.y ?? 0) + pointermoveEvent.movementY;
  target.dataset.x = String(x);
  target.dataset.y = String(y);
  target.style.transform = `translate(${x}px, ${y}px)`;
}
function stopDrag(pointerEvent) {
  const target = pointerEvent.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  target.removeEventListener("pointermove", drag);
  target.removeEventListener("pointerup", stopDrag);
  target.removeEventListener("pointercancel", stopDrag);
  if (target.hasPointerCapture(pointerEvent.pointerId)) {
    target.releasePointerCapture(pointerEvent.pointerId);
  }
}
function startDrag(pointerEvent) {
  const target = pointerEvent.target;
  if (!(target instanceof HTMLElement)) return;
  target.setPointerCapture(pointerEvent.pointerId);
  target.addEventListener("pointermove", drag);
  target.addEventListener("pointerup", stopDrag);
  target.addEventListener("pointercancel", stopDrag);
}
function intersects(a, b) {
  const ar = a.getBoundingClientRect();
  const br = b.getBoundingClientRect();
  return !(ar.right < br.left || ar.left > br.right || ar.bottom < br.top || ar.top > br.bottom);
}
function createIntersectionWatcher(classNameToWatch, onIntersection) {
  const watcher2 = document.createElement("div");
  watcher2.classList.add(`${classNameToWatch}-watcher`);
  watcher2.addEventListener("pointerover", () => {
    const maybe = watcher2.closest("*");
    if (maybe && maybe.classList.contains(classNameToWatch) && intersects(maybe, watcher2))
      onIntersection(maybe, watcher2);
  });
  return watcher2;
}

// in-browser-testing-libs.ts
var dragTarget = document.createElement("h1");
dragTarget.textContent = "moi";
dragTarget.classList.add("moi");
dragTarget.addEventListener("pointerdown", startDrag);
document.body.appendChild(dragTarget);
var watcher = createIntersectionWatcher("moi", (dragged, watcher2) => {
  watcher2.style.background = "green";
});
watcher.style.cssText = `
width: 100px;
height: 100px;
background: red;
`;
document.body.appendChild(watcher);
