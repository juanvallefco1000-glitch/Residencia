// Prueba de lectura y estado del navegador: no guarda cotizaciones ni modifica el catálogo.
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { connectBrowser } from './browser/bidiClient.mjs'
const browser = await connectBrowser(process.env.QUOTES_BROWSER_BIDI || 'ws://127.0.0.1:19223/session')
let context
try {
  await browser.command('session.new', { capabilities: {} })
  ;({ context } = await browser.command('browsingContext.create', { type: 'tab' }))
  await browser.command('script.addPreloadScript', { contexts: [context], functionDeclaration: "() => { const request = window.fetch.bind(window); window.__quoteEstimateCalls = []; window.fetch = async (...args) => { if (!String(args[0]).includes('/api/cotizador/estimar')) return request(...args); const call = { body: JSON.parse(args[1].body) }; window.__quoteEstimateCalls.push(call); try { const response = await request(...args); call.status = response.status; return response; } catch (error) { call.error = error.name; throw error; } }; }" })
  const origin = process.env.QUOTES_BROWSER_ORIGIN || 'http://127.0.0.1:5173/'
  const publicPages = []
  for (const route of ['/', '/empresa', '/catalogo', '/promociones', '/servicios/videovigilancia-seguridad', '/cotizacion']) {
    await browser.command('browsingContext.navigate', { context, url: `${origin.replace(/\/$/, '')}/#${route}`, wait: 'complete' })
    await browser.wait(context, `Boolean(document.querySelector('.app main'))`, 'página pública lista')
    for (const width of [1440, 390]) {
      await browser.command('browsingContext.setViewport', { context, viewport: { width, height: 1000 }, devicePixelRatio: 1 })
      const theme = await browser.evaluate(context, `(() => {
        const root = document.querySelector('.app');
        const whiteText = [...root.querySelectorAll('main h1,main h2,main h3,main p,main label,main a,main button')].filter(el => el.getClientRects().length && getComputedStyle(el).color === 'rgb(245, 245, 245)').length;
        return { background: getComputedStyle(root).backgroundColor, text: getComputedStyle(root).color, whiteText, overflow: document.documentElement.scrollWidth > innerWidth };
      })()`)
      assert.equal(theme.background, 'rgb(255, 255, 255)'); assert.equal(theme.text, 'rgb(32, 37, 42)')
      assert.equal(theme.whiteText, 0); assert.equal(theme.overflow, false, `${route}: ${width}`)
      publicPages.push({ route, width, ...theme })
    }
  }
  await browser.command('browsingContext.navigate', { context, url: `${origin.replace(/\/$/, '')}/#/catalogo`, wait: 'complete' })
  await browser.wait(context, `document.querySelectorAll('.productCard').length > 0`, 'catálogo público visible')
  const catalogProduct = await browser.evaluate(context, `(() => { const card = document.querySelector('.productCard'); return { name: card.querySelector('h3').textContent, price: card.querySelector('.productCardPrice').textContent, quoteUrl: card.querySelector('a.primary').href } })()`)
  await browser.command('browsingContext.navigate', { context, url: catalogProduct.quoteUrl, wait: 'complete' })
  await browser.wait(context, `document.querySelectorAll('.quoteSelectedItem').length === 1`, 'referencia del catálogo en selección')
  const selected = await browser.evaluate(context, `(() => { const card = document.querySelector('.quoteSelectedItem'); return { name: card.querySelector('strong').textContent, price: card.querySelector('p span').textContent } })()`)
  assert.equal(selected.name, catalogProduct.name); assert.equal(selected.price, catalogProduct.price)
  await browser.evaluate(context, `document.querySelector('.quoteSelectedItem > button').click()`)

  await browser.wait(context, `document.querySelectorAll('.quoteProductRow').length > 0`, 'productos públicos visibles')
  const initial = await browser.evaluate(context, `(() => ({ products: document.querySelectorAll('.quoteProductRow').length, login: document.querySelector('.quoteBuilder').textContent.includes('Inicia sesión de nuevo') }))()`)
  assert.ok(initial.products > 0); assert.equal(initial.login, false)
  const index = await browser.evaluate(context, `Math.max(0, [...document.querySelectorAll('.quoteProductRow')].findIndex(card => card.querySelector('.catalogProductImage')))`)
  const card = `document.querySelectorAll('.quoteProductRow')[${index}]`
  const name = await browser.evaluate(context, `${card}.querySelector('h3').textContent`)
  const realImage = await browser.evaluate(context, `(() => { const img = document.querySelector('.quoteProductImage .catalogProductImage'); if (img) img.scrollIntoView(); return Boolean(img) })()`)
  if (realImage) await browser.wait(context, `${card}.querySelector('.catalogProductImage')?.naturalWidth > 0 || Boolean(${card}.querySelector('.productImageFallback'))`, 'fotografía cargada o respaldo ante archivo ausente')
  const photoLoaded = await browser.evaluate(context, `${card}.querySelector('.catalogProductImage')?.naturalWidth > 0`)
  const images = await browser.evaluate(context, `(() => ({ real: document.querySelectorAll('.quoteProductImage .catalogProductImage').length, fallback: document.querySelectorAll('.quoteProductImage .productImageFallback').length }))()`)

  await browser.evaluate(context, `(() => { const input = ${card}.querySelector('input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '2'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await browser.evaluate(context, `${card}.querySelector('button').click()`)
  await browser.wait(context, `document.querySelectorAll('.quoteSelectedItem').length === 1`, 'selección agregada')
  await browser.evaluate(context, `${card}.querySelector('button').click()`)
  await browser.wait(context, `document.querySelector('.quoteSelectedItem input').value === '4'`, 'producto repetido acumula cantidad elegida')
  assert.equal(await browser.evaluate(context, `document.querySelectorAll('.quoteSelectedItem').length`), 1)
  assert.equal(await browser.evaluate(context, `document.querySelectorAll('.quoteEquipmentBreakdown li').length`), 1)
  assert.equal(await browser.evaluate(context, `document.querySelector('.quoteEquipmentBreakdown li > span').textContent.startsWith('4 ')`), true)
  const instantBudget = await browser.evaluate(context, `(() => { const row = document.querySelector('.quoteSelectedItem'); const priceText = row.querySelector('p span').textContent; if (!/[0-9]/.test(priceText)) return document.querySelector('.quoteEquipmentBreakdown').textContent.includes('Consultar precio'); const amount = Number(priceText.replace(/[^0-9.]/g, '')); const expected = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount * 4); return document.querySelector('.quoteBudgetTotal').textContent.includes(expected) && document.querySelector('.quoteEquipmentSubtotal').textContent.includes(expected) })()`)
  assert.equal(instantBudget, true, 'presupuesto inmediato en Equipos sin datos de instalación')

  await browser.evaluate(context, `document.querySelector('.quoteSelectedItem button[aria-label^="Disminuir"]').click()`)
  await browser.wait(context, `document.querySelector('.quoteSelectedItem input').value === '3'`, 'disminución')
  assert.equal(await browser.evaluate(context, `Boolean(document.querySelector('.quoteSelectedImage img'))`), true)
  if (photoLoaded) await browser.wait(context, `document.querySelector('.quoteSelectedImage .catalogProductImage')?.naturalWidth > 0`, 'fotografía real en selección')
  await browser.evaluate(context, `document.querySelector('.quoteContinue').click()`)
  await browser.wait(context, `document.querySelector('.quoteSteps [aria-current="step"]').textContent.includes('Instalación')`, 'paso instalación')
  assert.equal(await browser.evaluate(context, `document.querySelector('.quoteSelectedItem input').value`), '3')
  await browser.evaluate(context, `document.querySelectorAll('.quoteSteps button')[2].click()`)
  await browser.wait(context, `document.querySelector('.quoteSteps [aria-current="step"]').textContent.includes('Solicitud')`, 'paso solicitud')
  assert.equal(await browser.evaluate(context, `document.querySelector('.quoteSelectedItem input').value`), '3')
  const subtotalsCorrect = await browser.evaluate(context, `(() => { const row = document.querySelector('.quoteSelectedItem'); const price = row.querySelector('p span').textContent; if (!/[0-9]/.test(price)) return true; const amount = Number(price.replace(/[^0-9.]/g, '')); const expected = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount * Number(row.querySelector('input').value)); return row.querySelector('p b').textContent === expected && document.querySelector('.quoteSelectionTotal strong').textContent.includes(expected) })()`)
  assert.equal(subtotalsCorrect, true, 'subtotal individual y general actualizados')
  assert.equal(await browser.evaluate(context, `document.querySelector('.quoteEquipmentBreakdown li > span').textContent.startsWith('3 ')`), true)
  assert.equal(await browser.evaluate(context, `document.querySelector('.quoteSummary').textContent.includes('Presupuesto incompleto.')`), true)

  await browser.evaluate(context, `document.querySelector('.quoteSteps button').click()`)
  const setSearch = value => browser.evaluate(context, `(() => { const input = document.querySelector('input[type="search"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await setSearch(name)
  await browser.wait(context, `document.querySelector('.quoteProductRow h3')?.textContent === ${JSON.stringify(name)}`, 'búsqueda por nombre')
  await setSearch('sin-resultados-segurixt-imagenes-xyz')
  await browser.wait(context, `document.querySelector('.quoteBuilder').textContent.includes('No hay productos para esta búsqueda.')`, 'búsqueda sin coincidencias')
  await setSearch('')
  await browser.wait(context, `document.querySelectorAll('.quoteProductRow').length > 0`, 'restauración de catálogo')
  const dimensions = []
  for (const width of [1440, 768, 390]) {
    await browser.command('browsingContext.setViewport', { context, viewport: { width, height: 1000 }, devicePixelRatio: 1 })
    const result = await browser.evaluate(context, `(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, columns: getComputedStyle(document.querySelector('.quoteProductList')).gridTemplateColumns.split(' ').length }))()`)
    assert.equal(result.overflow, false, JSON.stringify(result)); assert.equal(result.columns, 1, 'una fila por producto'); dimensions.push(result)
    const rowLayout = await browser.evaluate(context, `(() => { const rows = [...document.querySelectorAll('.quoteProductRow')]; return rows.every((row, index) => !index || row.getBoundingClientRect().top >= rows[index - 1].getBoundingClientRect().bottom) })()`)
    assert.equal(rowLayout, true, 'lista vertical sin filas en paralelo')
    await browser.evaluate(context, "window.scrollTo({ top: 0, behavior: 'instant' })")
    await browser.wait(context, 'scrollY === 0', 'captura desde inicio')
    if (width !== 768) {
      const shot = await browser.command('browsingContext.captureScreenshot', { context, origin: 'viewport' })
      await writeFile(`/tmp/segurixt-quote-images-${width}.png`, Buffer.from(shot.data, 'base64'))
    }
  }
  // Observar consultas reales de estimación; nunca se envía el formulario formal.
  await browser.evaluate(context, 'window.__quoteEstimateCalls = []')
  await browser.evaluate(context, `document.querySelectorAll('.quoteSteps button')[1].click()`)
  await browser.wait(context, `document.querySelectorAll('.cameraRunRow').length > 0`, 'recorridos por cámara')
  assert.equal(await browser.evaluate(context, `[...document.querySelectorAll('.quoteForm label')].some(label => label.textContent.startsWith('Dificultad'))`),false)
  const installationChanges = [
    ['Superficie aproximada', 'areaM2', '100'], ['Altura aproximada', 'heightMetres', '2.5'],
    ['Cámaras por instalar', 'cameras', '5'], ['Superficie aproximada', 'areaM2', '120'],
    ['Ubicación', 'environment', 'EXTERIOR'], ['Altura aproximada', 'heightMetres', '3.5'],
    ['Cámara 1 —', 'cameraRuns', '25'],
  ]
  for (const [label, key, value] of installationChanges) {
    const previous = await browser.evaluate(context, 'window.__quoteEstimateCalls.length')
    await browser.evaluate(context, `(() => { const label = [...document.querySelectorAll('.quoteForm label')].find(el => el.textContent.startsWith(${JSON.stringify(label)})); const input = label.querySelector('input,select'); const prototype = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); })()`)
    if (label==='Superficie aproximada' && value==='100') continue
    await browser.wait(context, `window.__quoteEstimateCalls.length > ${previous} && (window.__quoteEstimateCalls.at(-1).status != null || window.__quoteEstimateCalls.at(-1).error)`, `consulta de instalación actualizada: ${key}`)
    assert.equal(await browser.evaluate(context, key==='cameraRuns' ? `String(window.__quoteEstimateCalls.at(-1).body.installation.cameraRuns[0].distanceMetres)` : `String(window.__quoteEstimateCalls.at(-1).body.installation[${JSON.stringify(key)}])`), value)
    if (key==='cameras') assert.equal(await browser.evaluate(context, `document.querySelectorAll('.cameraRunRow').length`),5)
    assert.equal(await browser.evaluate(context, `JSON.stringify(window.__quoteEstimateCalls.at(-1).body).includes('unitPrice')`), false)
    assert.equal(await browser.evaluate(context, `/NaN|Infinity/.test(document.querySelector('.quoteSummary').textContent)`), false)
  }
  await browser.evaluate(context, `(() => { const label=[...document.querySelectorAll('.quoteForm label')].find(el=>el.textContent.startsWith('Hipótesis')); const select=label.querySelector('select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'SQUARE_CENTER'); select.dispatchEvent(new Event('change',{bubbles:true})); })()`)
  await browser.wait(context, `document.querySelectorAll('.cameraRunRow input').length===5 && [...document.querySelectorAll('.cameraRunRow input')].every(input=>Number(input.value)>0)`, 'sugerencias geométricas explícitas')
  assert.equal(await browser.evaluate(context, `document.querySelector('.cameraRunRow input').value`),'25','se conserva ajuste manual')
  for(const width of [1440,768,390]) {
    await browser.command('browsingContext.setViewport',{context,viewport:{width,height:1000},devicePixelRatio:1})
    assert.equal(await browser.evaluate(context, 'document.documentElement.scrollWidth > innerWidth'),false,'recorridos sin desbordamiento')
    if(width!==768) {
      await browser.evaluate(context, `window.scrollTo({top:document.querySelector('.quoteForm').getBoundingClientRect().top+scrollY-90,behavior:'instant'})`)
      const shot=await browser.command('browsingContext.captureScreenshot',{context,origin:'viewport'})
      await writeFile(`/tmp/segurixt-height-runs-${width}.png`,Buffer.from(shot.data,'base64'))
    }
  }
  const installationRequests = await browser.evaluate(context, 'window.__quoteEstimateCalls.map(call => call.status || call.error)')
  await browser.evaluate(context, `document.querySelector('.quoteSteps button').click()`)
  if (photoLoaded) {
    await browser.evaluate(context, `document.querySelector('.quoteSelectedImage .catalogProductImage').dispatchEvent(new Event('error'))`)
    await browser.wait(context, `document.querySelector('.quoteSelectedImage').textContent.includes('Imagen no disponible')`, 'respaldo tras error de imagen')
  }
  await browser.evaluate(context, `document.querySelector('.quoteSelectedItem > button').click()`)
  await browser.wait(context, `!document.querySelector('.quoteSelectedItem')`, 'producto eliminado')
  assert.equal(await browser.evaluate(context, `document.querySelector('.quoteContinue').disabled`), true)
  assert.equal(await browser.evaluate(context, `document.querySelectorAll('.quoteEquipmentBreakdown li').length`), 0)
  assert.equal(await browser.evaluate(context, `document.querySelector('.quoteBudgetTotal').textContent.includes('$0.00')`), true)
  console.log(JSON.stringify({ installationRequests, publicPages: publicPages.length, catalogQuotePriceMatch: true, ...initial, images, photoLoaded: Boolean(photoLoaded), dimensions, selection: 'add/increment/decrement/preserve/remove OK', search: 'OK' }))
} finally {
  if (context) await browser.command('browsingContext.close', { context }).catch(() => {})
  await browser.command('session.end').catch(() => {})
  browser.close()
}
