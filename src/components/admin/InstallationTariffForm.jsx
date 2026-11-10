import { useState } from 'react'
import { adminRequest } from '../../services/admin/authService'

const heightFields = [
  ['minHeight','Desde altura (exclusivo, m)','number',true,0,500],
  ['maxHeight','Hasta altura (inclusive, m)','number',true,.01,500],
  ['pricePerCamera','Mano de obra por cámara (MXN)','number',false,0,1000000],
]
const materialFields = [
  ['name','Material o accesorio','text',true],
  ['quantityPerCamera','Unidades por cámara','number',true,.01,1000],
  ['unitPrice','Precio por unidad (MXN)','number',false,0,1000000],
]
const ruleFields = [
  ['family','Familia técnica de productos','text',true], ['cameraType','Tipo de cámara','text',true],
  ['cableType','Tipo de cable','text',true], ['connectors','Conectores','text',true],
  ['power','Alimentación','text',true], ['manufacturerReference','Referencia técnica del fabricante','text',true],
  ['maxRunMetres','Máximo recorrido completo (m)','number',true,.01,100000],
  ['maxSegments','Máximo de tramos totales (incluye el inicial)','number',true,1,1000],
  ['allowExtensions','Extensiones técnicamente aprobadas','checkbox'],
  ['allowSegments','Uniones prefabricadas aprobadas','checkbox'], ['verified','Regla revisada y aprobada','checkbox'],
]
const emptyRule = { family:'',cameraType:'',cableType:'',connectors:'',power:'',manufacturerReference:'',maxRunMetres:'',maxSegments:1,allowExtensions:false,allowSegments:false,verified:false }
const numberOrNull = value => value==='' || value==null ? null : Number(value)

export default function InstallationTariffForm({ tariffs, writable, onSaved }) {
  const [values,setValues]=useState(tariffs)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const update=(key,value)=>setValues(current=>({...current,[key]:value}))
  const updateRow=(group,index,key,value)=>setValues(current=>({...current,[group]:current[group].map((row,i)=>i===index?{...row,[key]:value}:row)}))
  function rows(group,title,fields,empty) {
    return <section><h3>{title}</h3>{values[group].map((row,index)=><div className="adminTariffRow" key={index}>
      <div className="formGrid">{fields.map(([key,label,type,required,min,max])=>type==='checkbox'
        ? <label className="adminQuoteCheckbox" key={key}><input type="checkbox" checked={Boolean(row[key])} onChange={e=>updateRow(group,index,key,e.target.checked)} />{label}</label>
        : <label key={key}>{label}<input type={type} required={required} min={min} max={max} step={key==='maxSegments'?'1':'0.01'} maxLength={key==='manufacturerReference'?500:key==='family'?80:150} value={row[key]??''} onChange={e=>updateRow(group,index,key,e.target.value)} /></label>)}</div>
      <button type="button" className="adminButton" onClick={()=>update(group,values[group].filter((_,i)=>i!==index))}>Retirar {group==='heightRates'?'rango':group==='materials'?'material':'regla'}</button>
    </div>)}<button type="button" className="adminButton" disabled={values[group].length>=100} onClick={()=>update(group,[...values[group],{...empty}])}>Agregar {group==='heightRates'?'rango':group==='materials'?'material':'regla'}</button></section>
  }
  async function save(event) {
    event.preventDefault();setError('');setNotice('')
    const heightRates=values.heightRates.map(row=>Object.fromEntries(heightFields.map(([key])=>[key,numberOrNull(row[key])])))
    const sorted=[...heightRates].sort((a,b)=>a.minHeight-b.minHeight)
    if(sorted.some((row,i)=>row.maxHeight<=row.minHeight || i>0 && sorted[i-1].maxHeight>row.minHeight)) return setError('Los rangos deben tener límites válidos y no superponerse.')
    if(new Set(values.cableRules.map(row=>row.family)).size!==values.cableRules.length || new Set(values.materials.map(row=>row.name)).size!==values.materials.length) return setError('No repitas familias técnicas ni nombres de materiales.')
    const body={...values,heightRates,
      includedLength:numberOrNull(values.includedLength),extraMetrePrice:numberOrNull(values.extraMetrePrice),segmentPrice:numberOrNull(values.segmentPrice),segmentLength:numberOrNull(values.segmentLength),maxAutoHeight:numberOrNull(values.maxAutoHeight),
      materials:values.materials.map(row=>({...row,quantityPerCamera:numberOrNull(row.quantityPerCamera),unitPrice:numberOrNull(row.unitPrice)})),
      cableRules:values.cableRules.map(row=>({...row,maxRunMetres:numberOrNull(row.maxRunMetres),maxSegments:Number(row.maxSegments)})),
    }
    setBusy(true)
    try { const saved=await adminRequest('/api/admin/cotizaciones/instalacion',{method:'PUT',body:JSON.stringify(body)});setValues(saved);setNotice('Tarifas de instalación guardadas.');onSaved?.() }
    catch(error) {setError(error.message)} finally {setBusy(false)}
  }
  return <section className="adminPanel adminQuotePanel" aria-labelledby="installation-tariffs-title"><h2 id="installation-tariffs-title">Tarifas de instalación</h2>
    <p>La longitud inicial propuesta es 18 m por cámara. No hay precios automáticos: deja vacíos los importes sin aprobar. Los rangos se interpretan como (desde, hasta]. El factor exterior y los impuestos se conservan en la configuración fiscal existente.</p>
    <form onSubmit={save}><fieldset disabled={!writable || busy}><div className="formGrid">
      <label>Longitud incluida por cámara (m)<input required type="number" min="0.01" max="100000" step="0.01" value={values.includedLength} onChange={e=>update('includedLength',e.target.value)} /></label>
      <label>Modalidad del cable adicional<select value={values.cableMode} onChange={e=>update('cableMode',e.target.value)}><option value="PENDING">Pendiente de configurar</option><option value="METRE">Por metro lineal adicional</option><option value="SEGMENT">Por tramo prefabricado adicional</option></select></label>
      <label>Precio por metro adicional (MXN)<input type="number" min="0" max="1000000" step="0.01" value={values.extraMetrePrice??''} onChange={e=>update('extraMetrePrice',e.target.value)} /></label>
      <label>Precio por tramo adicional (MXN)<input type="number" min="0" max="1000000" step="0.01" value={values.segmentPrice??''} onChange={e=>update('segmentPrice',e.target.value)} /></label>
      <label>Longitud del tramo comercial (m)<input type="number" min="0.01" max="100000" step="0.01" value={values.segmentLength??''} onChange={e=>update('segmentLength',e.target.value)} /></label>
      <label>Altura máxima de estimación automática (m)<input type="number" min="0.01" max="500" step="0.01" value={values.maxAutoHeight??''} onChange={e=>update('maxAutoHeight',e.target.value)} /></label>
    </div>
    {rows('heightRates','Mano de obra por rangos de altura',heightFields,{minHeight:'',maxHeight:'',pricePerCamera:''})}
    <p>Una regla de cable solo se aplica a cámaras de una misma familia verificada. Revisar tecnología, cable, conectores, caída de tensión/alimentación y documentación del fabricante. Activar extensiones o uniones no sustituye esa verificación. El límite contempla el cable comercial completo, no solo la distancia solicitada.</p>
    {rows('cableRules','Compatibilidad y límites técnicos de cable',ruleFields,emptyRule)}
    {rows('materials','Materiales y accesorios adicionales',materialFields,{name:'',quantityPerCamera:1,unitPrice:''})}
    <button className="adminButton adminPrimary" disabled={busy}>{busy?'Guardando…':'Guardar tarifas de instalación'}</button></fieldset></form>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  </section>
}
