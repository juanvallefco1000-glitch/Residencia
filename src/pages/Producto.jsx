import { Link, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import useCatalogRevision from '../hooks/useCatalogRevision'
import { loadProduct } from '../services/catalogService'
import ProductImage from '../components/ProductImage'
import ProductPrice from '../components/ProductPrice'

export default function Producto() {
  const { id } = useParams()
  const revision = useCatalogRevision()
  const [state, setState] = useState({ product: null, loading: true, error: '', source: '' })
  const [selectedImage, setSelectedImage] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setSelectedImage(0)
    setState({ product: null, loading: true, error: '', source: '' })
    loadProduct(id, { signal: controller.signal }).then(result => {
      if (!controller.signal.aborted) setState({ ...result, loading: false, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setState({ product: null, loading: false, error: error.status === 404 ? '' : error.message, source: '' })
    })
    return () => controller.abort()
  }, [id, revision])
  const { product } = state

  if (state.loading) return <main className="simplePage"><p role="status">Cargando producto…</p></main>

  if (!product) {
    return (
      <main className="simplePage">
        <h1>{state.error ? 'No se pudo cargar el producto' : 'Producto no encontrado'}</h1>
        {state.error && <p role="status">{state.error}</p>}
        <Link className="textLink" to="/catalogo">Volver al catálogo</Link>
      </main>
    )
  }

  return (
    <main>
      <section className="section productDetail">
        <div className="catalogGallery">
          <div className="productDetailImage"><ProductImage images={product.images?.slice(selectedImage, selectedImage + 1)} name={product.name} size={84} /></div>
          {product.images?.length > 1 && <div className="catalogThumbnails" role="group" aria-label="Imágenes del producto">
            {product.images.map((image, index) => <button key={image.id} type="button" aria-label={`Ver imagen ${index + 1}`} aria-pressed={selectedImage === index} onClick={() => setSelectedImage(index)}>
              <ProductImage images={[image]} name={product.name} />
            </button>)}
          </div>}
        </div>
        <div>
          <span className="sectionKicker">{product.brand}</span>
          <h1>{product.name}</h1>
          {product.categoryName && <Link className="textLink" to={`/catalogo/${product.category}`}>{product.categoryName}</Link>}
          {product.model && <p>Modelo: {product.model}</p>}
          <p>{product.fullDescription || product.description}</p>
          <p><ProductPrice price={product.price} /></p>
          <div className="featureList compact">
            {state.source === 'local' && <div><CheckCircle2 size={19} /> Catálogo local demostrativo</div>}
            <div><CheckCircle2 size={19} /> Disponibilidad por confirmar</div>
            <div><CheckCircle2 size={19} /> Atención y asesoría para tu proyecto</div>
          </div>
          <Link className="button primary" to={`/cotizacion?producto=${product.id}`}>
            Solicitar cotización
          </Link>
        </div>
      </section>
    </main>
  )
}
