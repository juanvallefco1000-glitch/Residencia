import { servicesPageCategories } from '../data/servicesPage.js'

const hasText = (value) => typeof value === 'string' && value.trim().length > 0
const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Slugs abreviados del backend que corresponden a rótulos locales existentes.
const localNamesBySlug = {
  'camaras-seguridad-ip': 'Cámaras de seguridad IP',
  'control-acceso': 'Control de acceso',
  'sensores-movimiento': 'Sensores de movimiento',
  'mantenimiento-seguridad': 'Configuración y mantenimiento de sistemas de seguridad',
  'instalacion-redes-lan': 'Instalación de redes LAN',
  'redes-wifi-empresariales': 'Redes WiFi',
  'enlaces-inalambricos': 'Enlaces inalámbricos punto a punto',
  'instalacion-starlink': 'Instalación de Starlink',
  'internet-satelital-servicio': 'Internet satelital',
  'domotica-residencial': 'Domótica',
  'automatizacion-comercial': 'Automatización de negocios',
  'iluminacion-inteligente': 'Control de iluminación',
  'instalacion-paneles-solares': 'Paneles solares',
  'instalacion-aire-acondicionado': 'Instalación y mantenimiento de aire acondicionado',
  'mantenimiento-equipos': 'Configuración de equipos tecnológicos',
}

// Los slugs enlazan presentación local y datos remotos; los IDs solo relacionan API con API.
export function mergeServiceCatalog(categories, services) {
  return servicesPageCategories.map((local) => {
    const remote = categories.find((item) => item.slug === local.slug || local.aliases?.includes(item.slug))
    if (!remote) throw new Error(`Falta la categoría ${local.slug} en la API.`)
    const seen = new Set()
    const records = services.filter((item) => String(item.categoriaId) === String(remote.id)).filter((item) => {
      const key = item.slug || item.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).map((item) => {
      const name = localNamesBySlug[item.slug] ?? local.services.find((name) => slugify(name) === item.slug)
        ?? local.shortServices.find((name) => slugify(name) === item.slug)
      return { ...item, nombre: hasText(item.nombre) ? item.nombre : name || item.slug }
    })
    const assigned = new Set()
    const serviceGroups = local.serviceGroups.map((group) => ({
      ...group,
      services: records.filter((item) => {
        if (assigned.has(item.slug)) return false
        if (!group.services.some((name) => slugify(name) === item.slug || name === localNamesBySlug[item.slug] || name === item.nombre)
          && !(item.slug === 'alarmas' && group.id === 'videovigilancia-seguridad-2')
          && !(item.slug === 'mantenimiento-electrico' && group.id === 'electricidad-soporte-3')) return false
        assigned.add(item.slug)
        return true
      }).map((item) => item.nombre),
    })).filter((group) => group.services.length)
    const remaining = records.filter((item) => !assigned.has(item.slug)).map((item) => item.nombre)
    if (remaining.length) serviceGroups.push({ id: `${local.slug}-otros`, title: 'Servicios', services: remaining })
    return {
      ...local,
      id: remote.id,
      title: hasText(remote.nombre) ? remote.nombre : local.title,
      description: hasText(remote.descripcion) ? remote.descripcion : local.description,
      // Los iconos son parte de la identidad visual, no nombres de componentes del servidor.
      records,
      services: records.map((item) => item.nombre),
      shortServices: records.map((item) => item.nombre),
      serviceGroups,
    }
  })
}
