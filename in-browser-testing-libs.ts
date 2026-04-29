import { drag, startWatch, stopWatch } from './dist/index.js'

const dragTarget = document.createElement('h1')
dragTarget.textContent = 'moi'
dragTarget.classList.add('moi')

const watcher = document.createElement('div')

watcher.style.cssText = `
width: 100px;
height: 100px;
background: red;
`

void dragTarget.addEventListener('pointerdown', async (event) => {
  void drag(
    event,
    async (dragged, watcher) => {
      watcher.style.background = 'green'
    },
    async (dragged, watcher) => {
      watcher.style.background = 'red'
    }
  )
  startWatch(watcher, dragTarget)
})

void dragTarget.addEventListener('pointerup', async () => {
  stopWatch(watcher, dragTarget)
})

void document.body.appendChild(watcher)
void document.body.appendChild(dragTarget)
