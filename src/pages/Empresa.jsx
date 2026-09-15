import { company } from '../config/company'
import { Target, Eye, Building2, CheckCircle2 } from 'lucide-react'

export default function Empresa() {
  return (
    <main>
      <section className="section twoColumn">
        <article className="contentCard">
          <Building2 size={31} />
          <h2>Descripción</h2>
          <p>{company.institutional.description}</p>
        </article>

        <article className="contentCard">
          <Target size={31} />
          <h2>Objetivo</h2>
          <p>{company.institutional.objective}</p>
        </article>

        <article className="contentCard">
          <Eye size={31} />
          <h2>Visión</h2>
          <p>{company.institutional.vision}</p>
        </article>

        <article className="contentCard">
          <CheckCircle2 size={31} />
          <h2>Valores</h2>
          <ul className="cleanList">
            {company.institutional.values.map((value) => <li key={value}>{value}</li>)}
          </ul>
        </article>
      </section>
    </main>
  )
}
