import { ImageOff } from 'lucide-react'

export function PageHeading({ title, description, children }) {
  return <div className="adminPageHeading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children}</div>
}
export function DataState({ state, children }) {
  if (state.loading) return <p role="status" className="adminNotice">Cargando información…</p>
  if (state.error) return <div role="alert" className="adminNotice">{state.error} <button className="adminButton" onClick={state.retry}>Reintentar</button></div>
  return children(state.data)
}
export function AdminTable({ caption, columns, rows, rowKey = 'id' }) {
  return <div className="adminTableWrap" role="region" aria-label={caption} tabIndex={0}><table>
    <caption className="adminSrOnly">{caption}</caption>
    <thead><tr>{columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map(row => <tr key={row[rowKey]}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? 'Sin definir'}</td>)}</tr>) : <tr><td colSpan={columns.length} className="adminEmpty">No hay resultados para mostrar.</td></tr>}</tbody>
  </table></div>
}
export function MediaPreview({ image, title }) {
  return image ? <img className="adminThumbnail" src={image} alt={title} /> : <span className="adminThumbnail" role="img" aria-label="Sin imagen"><ImageOff size={22} /></span>
}
export function PreviewButton({ children, onPreview, title, detail }) {
  return <button type="button" className="adminButton adminButtonSmall" onClick={() => onPreview({ title, detail })}>{children}</button>
}
