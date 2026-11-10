import { formatSalePrice, publicSalePrice } from '../services/catalogService.js'

export default function ProductPrice({ price }) {
  return <span>{formatSalePrice(price)}{publicSalePrice(price) != null && <small> MXN</small>}</span>
}
