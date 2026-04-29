import { swapify } from './dist/index.js'

const nav: HTMLElement | null = document.querySelector('nav')
const controls: HTMLElement | null = document.querySelector('div.controls')
if (!controls || !nav) throw new Error()

for (let i = 0; i < 12; i++) {
  const box = document.createElement('div')

  box.textContent = `${i + 1}`
  void controls.appendChild(box)
}

swapify(controls.children)
swapify(nav.children)
