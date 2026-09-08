import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { getCatalogCategories, getProducts } from '../services/catalogService'
import ProductCard from '../components/ProductCard'

export default function Catalogo() {
  return (
    <main>
      <section className="pageHero">
        <span className="sectionKicker">Catálogo digital</span>
        <h1>Consulta productos por categoría</h1>
        <p>
          La información actual es demostrativa. Esta interfaz está preparada para conectarse
          posteriormente con Spring Boot, MySQL y APIs de proveedores autorizados.
        </p>
      </section>

      <section className="section">
        <div className="catalogCategoryGrid">
          {getCatalogCategories().map((category) => (
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
          <h2>Productos demostrativos</h2>
        </div>
        <div className="productGrid">
          {getProducts().map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  )
}
