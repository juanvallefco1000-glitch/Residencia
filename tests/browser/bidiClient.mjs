// Cliente mínimo para las pruebas locales de Firefox, sin dependencias adicionales.
export async function connectBrowser(url) {
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error('No se pudo conectar con Firefox BiDi.')) })
  let nextId = 0
  const pending = new Map()
  const listeners = new Set()
  socket.onmessage = event => {
    const data = JSON.parse(event.data)
    if (!data.id) { listeners.forEach(listener => listener(data)); return }
    const request = pending.get(data.id)
    if (!request) return
    pending.delete(data.id); clearTimeout(request.timer)
    if (data.type === 'error') request.reject(new Error(`${data.error}: ${data.message}`))
    else request.resolve(data.result)
  }
  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Tiempo agotado: ${method}`)) }, 15000)
      pending.set(id, { resolve, reject, timer })
      socket.send(JSON.stringify({ id, method, params }))
    })
  }
  async function evaluate(context, expression) {
    const result = await command('script.evaluate', { expression: `(async()=>JSON.stringify(await (${expression})))()`, target: { context }, awaitPromise: true })
    if (result.type === 'exception') throw new Error('Falló una operación del navegador.')
    return result.result.value === undefined ? undefined : JSON.parse(result.result.value)
  }
  async function wait(context, expression, description) {
    const deadline = Date.now() + 15000
    while (Date.now() < deadline) {
      if (await evaluate(context, expression).catch(() => false)) return
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error(`No se cumplió: ${description}`)
  }
  return { command, evaluate, wait, onEvent: listener => { listeners.add(listener); return () => listeners.delete(listener) }, close: () => socket.close() }
}
