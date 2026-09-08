import { useSearchParams } from 'react-router-dom'

export default function Cotizacion() {
  const [params] = useSearchParams()
  const reference = params.get('servicio') || params.get('producto') || ''

  return (
    <main>
      <section className="pageHero">
        <span className="sectionKicker">Cotización</span>
        <h1>Solicita información sobre tu proyecto</h1>
        <p>Completa los datos y posteriormente el formulario se conectará al backend.</p>
      </section>

      <section className="section formSection">
        <form className="quoteForm" onSubmit={(event) => event.preventDefault()}>
          <div className="formGrid">
            <label>
              Nombre
              <input type="text" placeholder="Nombre completo" />
            </label>
            <label>
              Teléfono
              <input type="tel" placeholder="324 000 0000" />
            </label>
            <label>
              Correo
              <input type="email" placeholder="correo@ejemplo.com" />
            </label>
            <label>
              Referencia
              <input type="text" value={reference} readOnly placeholder="Servicio o producto" />
            </label>
          </div>

          <label>
            Descripción de la solicitud
            <textarea rows="6" placeholder="Describe lo que necesitas..." />
          </label>

          <button className="button primary" type="submit">
            Enviar solicitud
          </button>

          <small className="formNote">
            Formulario visual de demostración. La persistencia se implementará con Spring Boot y MySQL.
          </small>
        </form>
      </section>
    </main>
  )
}
