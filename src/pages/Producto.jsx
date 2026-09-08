import { Link, useParams } from 'react-router-dom'
import { Box, CheckCircle2 } from 'lucide-react'
import { getProductById } from '../services/catalogService'

export default function Producto() {
  const { id } = useParams()
  const product = getProductById(id)

  if (!product) {
    return (
      <main className="simplePage">
        <h1>Producto no encontrado</h1>
        <Link className="textLink" to="/catalogo">Volver al catálogo</Link>
      </main>
    )
  }

  return (
    <main>
      <section className="section productDetail">
        <div className="productDetailImage"><Box size={84} /></div>
        <div>
          <span className="sectionKicker">{product.brand}</span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="featureList compact">
            <div><CheckCircle2 size={19} /> Información técnica demostrativa</div>
            <div><CheckCircle2 size={19} /> Disponibilidad por confirmar</div>
            <div><CheckCircle2 size={19} /> Precio sujeto a sincronización</div>
          </div>
          <Link className="button primary" to={`/cotizacion?producto=${product.id}`}>
            Solicitar cotización
          </Link>
        </div>
      </section>
    </main>
  )
}
