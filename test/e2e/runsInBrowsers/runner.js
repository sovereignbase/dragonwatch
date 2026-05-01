import * as api from '/dist/index.js'

window.__DRAGONWATCH_API__ = api
const status = document.getElementById('status')
if (status) status.textContent = 'dragonwatch loaded'
