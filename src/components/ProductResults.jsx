import ProductCard from './ProductCard'

export default function ProductResults({ catalog, page, onPageChange }) {
  return <>
    <p role="status" aria-live="polite">
      {catalog.loading ? 'Cargando productos…' : catalog.error || (catalog.source === 'local' ? 'Catálogo local demostrativo. Disponibilidad por confirmar.' : `${catalog.totalElements} productos disponibles.`)}
    </p>
    {!catalog.loading && !catalog.error && !catalog.products.length && <div className="emptyState"><h2>Sin resultados</h2><p>Prueba otra búsqueda o categoría.</p></div>}
    <div className="productGrid" aria-busy={catalog.loading}>
      {catalog.products.map(product => <ProductCard key={product.id} product={product} />)}
    </div>
    {catalog.totalPages > 1 && <nav className="catalogPagination" aria-label="Paginación del catálogo">
      <button className="button secondary" disabled={catalog.loading || page === 0} onClick={() => onPageChange(page - 1)}>Anterior</button>
      <span>Página {page + 1} de {catalog.totalPages}</span>
      <button className="button secondary" disabled={catalog.loading || page + 1 >= catalog.totalPages} onClick={() => onPageChange(page + 1)}>Siguiente</button>
    </nav>}
  </>
}
