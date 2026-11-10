import { API_URL, obtenerPromociones, productImageUrl } from '../services/publicApi'
import usePublicContent from '../hooks/usePublicContent'

export default function Promociones() {
  const { data, loading, error } = usePublicContent(obtenerPromociones, Boolean(API_URL))
  return <main>
    <section className="pageHero"><span className="sectionKicker">Promociones</span><h1>Promociones y soluciones destacadas</h1></section>
    <section className="section">
      {loading && <p role="status">Cargando promociones…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && !data?.length && <div className="emptyState"><h2>No hay promociones vigentes</h2></div>}
      <div className="serviceGrid promotionGrid">{data?.map(p => <article className="serviceCard" key={p.id}>
        {p.imagenUrl && <img src={productImageUrl(p.imagenUrl)} alt={p.titulo} loading="lazy" style={{ width: '100%', maxHeight: 300, objectFit: 'contain' }} />}
        <h2>{p.titulo}</h2><p style={{ whiteSpace: 'pre-line' }}>{p.descripcion}</p>
        {(p.fechaInicio || p.fechaFin) && <p>{p.fechaInicio && `Desde ${p.fechaInicio}`}{p.fechaFin && ` Hasta ${p.fechaFin}`}</p>}
      </article>)}</div>
    </section>
  </main>
}
