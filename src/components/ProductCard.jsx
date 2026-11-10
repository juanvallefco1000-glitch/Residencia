import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ProductImage from './ProductImage'
import ProductPrice from './ProductPrice'

export default function ProductCard({ product }) {
  return (
    <article className="productCard">
      <div className="productPlaceholder">
        <ProductImage images={product.images} name={product.name} showFallback />
      </div>
      {(product.brand || product.model) && <span className="productBrand">{[product.brand, product.model].filter(Boolean).join(' · ')}</span>}
      <h3>{product.name}</h3>
      {product.categoryName && <span className="productBrand">{product.categoryName}</span>}
      <p>{product.description}</p>
      <div className="productCardPrice"><ProductPrice price={product.price} /></div>
      <Link className="primary" to={`/cotizacion?producto=${product.id}`}>
        Agregar a cotización <ArrowRight size={16} />
      </Link>
      <Link className="productDetailLink" to={`/producto/${product.id}`}>Ver producto</Link>
    </article>
  )
}
