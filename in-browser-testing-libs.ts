import { startDrag, createIntersectionWatcher } from './dist/index.js'

const dragTarget = document.createElement('h1')
dragTarget.textContent = 'moi'
dragTarget.classList.add('moi')

dragTarget.addEventListener('pointerdown', startDrag)

document.body.appendChild(dragTarget)

const watcher = createIntersectionWatcher('moi', (dragged, watcher) => {
  watcher.style.background = 'green'
})

watcher.style.cssText = `
width: 100px;
height: 100px;
background: red;
`

document.body.appendChild(watcher)
