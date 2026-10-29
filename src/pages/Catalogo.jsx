import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import useProductCatalog from '../hooks/useProductCatalog'
import ProductResults from '../components/ProductResults'

export default function Catalogo() {
  const [filters, setFilters] = useState({ q: '', categoria: '', page: 0 })
  const catalog = useProductCatalog(filters)
  const change = (key, value) => setFilters(current => ({ ...current, [key]: value, page: 0 }))
  return (
    <main>
      <section className="pageHero">
        <span className="sectionKicker">Catálogo digital</span>
        <h1>Consulta productos por categoría</h1>
        <p>
          Explora nuestras soluciones tecnológicas y solicita una cotización.
          Confirma disponibilidad y características con nuestro equipo.
        </p>
      </section>

      <section className="section">
        <div className="catalogCategoryGrid">
          {catalog.categories.map((category) => (
            <Link className="catalogCategoryCard" key={category.slug} to={`/catalogo/${category.slug}`}>
              <span className="categoryIndex">CAT</span>
              <h2>{category.title}</h2>
              <p>{category.description}</p>
              <span className="textLink">Explorar <ArrowRight size={16} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section softSection">
        <div className="sectionHeading">
          <span className="sectionKicker">Vista general</span>
          <h2>Productos</h2>
        </div>
        <div className="catalogTools">
          <label>Buscar productos
            <input type="search" value={filters.q} maxLength={200} placeholder="Nombre, marca o modelo" onChange={event => change('q', event.target.value)} />
          </label>
          <label>Categoría
            <select value={filters.categoria} onChange={event => change('categoria', event.target.value)}>
              <option value="">Todas las categorías</option>
              {catalog.categories.map(category => <option key={category.slug} value={category.slug}>{category.title}</option>)}
            </select>
          </label>
        </div>
        <ProductResults catalog={catalog} page={filters.page} onPageChange={page => setFilters(current => ({ ...current, page }))} />
      </section>
    </main>
  )
}
