// Fuente compartida y serializable para Inicio y los detalles.
// shortServices contiene los rótulos resumidos; la lista completa se deriva
// de los grupos para no duplicar los servicios de detalle.
const categories = [
  {
    "slug": "videovigilancia-seguridad",
    "aliases": [
      "seguridad-videovigilancia"
    ],
    "title": "VIDEOVIGILANCIA Y SEGURIDAD",
    "icon": "security-camera",
    "shortServices": [
      "Cámaras de seguridad IP",
      "Sistemas DVR / NVR",
      "Alarmas",
      "Control de acceso",
      "Monitoreo remoto"
    ],
    "serviceGroups": [
      {
        "id": "videovigilancia-seguridad-1",
        "title": "Videovigilancia",
        "services": [
          "Cámaras de seguridad IP",
          "Cámaras HD / 4K",
          "Sistemas DVR / NVR"
        ]
      },
      {
        "id": "videovigilancia-seguridad-2",
        "title": "Alarmas y control de acceso",
        "services": [
          "Alarmas cableadas",
          "Alarmas inalámbricas",
          "Sensores de movimiento",
          "Videoporteros",
          "Control de acceso"
        ]
      },
      {
        "id": "videovigilancia-seguridad-3",
        "title": "Monitoreo y mantenimiento",
        "services": [
          "Monitoreo remoto",
          "Configuración y mantenimiento de sistemas de seguridad"
        ]
      }
    ]
  },
  {
    "slug": "redes-telecomunicaciones",
    "title": "REDES Y TELECOMUNICACIONES",
    "icon": "network",
    "shortServices": [
      "Redes LAN",
      "Redes WiFi",
      "Cableado estructurado",
      "Enlaces inalámbricos",
      "Redes Mesh"
    ],
    "serviceGroups": [
      {
        "id": "redes-telecomunicaciones-1",
        "title": "Infraestructura de red",
        "services": [
          "Instalación de redes LAN",
          "Redes WiFi",
          "Cableado estructurado",
          "Enlaces inalámbricos punto a punto",
          "Redes Mesh"
        ]
      },
      {
        "id": "redes-telecomunicaciones-2",
        "title": "Equipos y configuración",
        "services": [
          "Configuración de routers",
          "Configuración de access points",
          "Equipos Ubiquiti",
          "Equipos MikroTik"
        ]
      },
      {
        "id": "redes-telecomunicaciones-3",
        "title": "Mantenimiento y conectividad",
        "services": [
          "Mantenimiento de infraestructura de red",
          "Soluciones de conectividad para empresas, hogares y zonas rurales"
        ]
      }
    ]
  },
  {
    "slug": "internet-satelital",
    "title": "INTERNET SATELITAL Y AUTOMATIZACIÓN",
    "icon": "satellite",
    "shortServices": [
      "Instalación de Starlink",
      "Internet satelital",
      "Domótica",
      "Automatización residencial",
      "Control remoto de dispositivos"
    ],
    "serviceGroups": [
      {
        "id": "internet-satelital-1",
        "title": "Internet satelital y cobertura",
        "services": [
          "Instalación de Starlink",
          "Configuración de Starlink",
          "Internet satelital",
          "Conectividad para zonas rurales",
          "Optimización de cobertura",
          "Configuración de equipos",
          "Soporte y mantenimiento"
        ]
      },
      {
        "id": "internet-satelital-2",
        "title": "Domótica y automatización",
        "services": [
          "Domótica",
          "Automatización residencial",
          "Automatización de negocios",
          "Control de iluminación"
        ]
      },
      {
        "id": "internet-satelital-3",
        "title": "Integración y control",
        "services": [
          "Control de dispositivos desde aplicación móvil",
          "Integración de sensores",
          "Automatización de procesos",
          "Sistemas de control remoto"
        ]
      }
    ]
  },
  {
    "slug": "electricidad-soporte",
    "aliases": [
      "electricidad-soporte-tecnologico"
    ],
    "title": "ELECTRICIDAD Y SOPORTE TECNOLÓGICO",
    "icon": "electricity",
    "shortServices": [
      "Instalaciones eléctricas",
      "Aire acondicionado",
      "Paneles solares",
      "Electrónica y mecatrónica",
      "Soporte técnico"
    ],
    "serviceGroups": [
      {
        "id": "electricidad-soporte-1",
        "title": "Instalaciones eléctricas",
        "services": [
          "Instalaciones eléctricas",
          "Cableado eléctrico",
          "Contactos eléctricos",
          "Centros de carga",
          "Tableros eléctricos",
          "Iluminación"
        ]
      },
      {
        "id": "electricidad-soporte-2",
        "title": "Energía y climatización",
        "services": [
          "Instalación y mantenimiento de aire acondicionado",
          "Instalación de minisplit",
          "Calentadores solares",
          "Paneles solares",
          "Sistemas fotovoltaicos"
        ]
      },
      {
        "id": "electricidad-soporte-3",
        "title": "Mantenimiento eléctrico",
        "services": [
          "Mantenimiento preventivo",
          "Mantenimiento correctivo",
          "Diagnóstico de fallas eléctricas"
        ]
      },
      {
        "id": "electricidad-soporte-4",
        "title": "Electrónica y soporte tecnológico",
        "services": [
          "Electrónica",
          "Reparación de equipos electrónicos",
          "Mecatrónica",
          "Mantenimiento de controladores",
          "Mantenimiento de tarjetas electrónicas",
          "Configuración de equipos tecnológicos",
          "Soporte técnico"
        ]
      }
    ]
  }
]

export const servicesPageCategories = categories.map((category) => ({
  ...category,
  services: category.serviceGroups.flatMap((group) => group.services),
}))
