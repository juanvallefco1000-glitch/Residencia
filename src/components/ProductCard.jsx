import { Link } from 'react-router-dom'
import { Box, ArrowRight } from 'lucide-react'

export default function ProductCard({ product }) {
  return (
    <article className="productCard">
      <div className="productPlaceholder">
        <Box size={44} />
      </div>
      <span className="productBrand">{product.brand}</span>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <Link to={`/producto/${product.id}`}>
        Ver producto <ArrowRight size={16} />
      </Link>
    </article>
  )
}
