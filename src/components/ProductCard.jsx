import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import ProductImage from './ProductImage'
import ProductPrice from './ProductPrice'

export default function ProductCard({ product }) {
  return (
    <article className="productCard">
      <div className="productPlaceholder">
        <ProductImage images={product.images} name={product.name} />
      </div>
      <span className="productBrand">{product.brand}</span>
      <h3>{product.name}</h3>
      {product.categoryName && <span className="productBrand">{product.categoryName}</span>}
      <p>{product.description}</p>
      <div><ProductPrice price={product.price} /></div>
      <Link to={`/producto/${product.id}`}>
        Ver producto <ArrowRight size={16} />
      </Link>
    </article>
  )
}
