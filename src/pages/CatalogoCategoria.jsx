import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getCatalogCategory, getProductsByCategory } from '../services/catalogService'
import ProductCard from '../components/ProductCard'

export default function CatalogoCategoria() {
  const { slug } = useParams()
  const category = getCatalogCategory(slug)
  const categoryProducts = getProductsByCategory(slug)

  if (!category) {
    return (
      <main className="simplePage">
        <h1>Categoría no encontrada</h1>
        <Link className="textLink" to="/catalogo"><ArrowLeft size={16} /> Volver al catálogo</Link>
      </main>
    )
  }

  return (
    <main>
      <section className="pageHero">
        <span className="sectionKicker">Catálogo</span>
        <h1>{category.title}</h1>
        <p>{category.description}</p>
      </section>

      <section className="section">
        {categoryProducts.length ? (
          <div className="productGrid">
            {categoryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="emptyState">
            <h2>Sin productos cargados</h2>
            <p>Los productos se agregarán desde el panel administrativo o la sincronización con proveedores.</p>
          </div>
        )}
      </section>
    </main>
  )
}
