import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import useProductCatalog from '../hooks/useProductCatalog'
import ProductResults from '../components/ProductResults'

export default function CatalogoCategoria() {
  const { slug } = useParams()
  return <CategoryCatalog key={slug} slug={slug} />
}

function CategoryCatalog({ slug }) {
  const [filters, setFilters] = useState({ q: '', page: 0 })
  const catalog = useProductCatalog({ ...filters, categoria: slug })
  const category = catalog.categories.find(item => item.slug === slug)

  if (catalog.loading && !category) return <main className="simplePage"><p role="status">Cargando categoría…</p></main>

  if (!category) {
    return (
      <main className="simplePage">
        <h1>Categoría no encontrada</h1>
        {catalog.error && <p role="status">{catalog.error}</p>}
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
        <div className="catalogTools"><label>Buscar en {category.title}
          <input type="search" value={filters.q} maxLength={200} onChange={event => setFilters({ q: event.target.value, page: 0 })} />
        </label></div>
        <ProductResults catalog={catalog} page={filters.page} onPageChange={page => setFilters(current => ({ ...current, page }))} />
      </section>
    </main>
  )
}
