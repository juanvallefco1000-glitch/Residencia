import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import logoSegurIXT from '../assets/segurixt-logo-oficial.jpeg'
import { company } from '../config/company'
import { getCatalogCategories } from '../services/catalogService'

function CategoryDropdown({ id, title, to, categories, open, onOpen, onClose, onNavigate }) {
  const toggleRef = useRef(null)

  return (
    <div
      className="dropdown"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' && window.matchMedia('(min-width: 851px)').matches) onOpen()
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) onClose()
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          event.stopPropagation()
          onClose()
          toggleRef.current?.focus()
        }
      }}
    >
      <div className="dropdownHeading">
        <NavLink className="dropdownTrigger" to={to} onClick={onNavigate}>{title}</NavLink>
        <button
          ref={toggleRef}
          className="dropdownToggle"
          type="button"
          aria-label={`${open ? 'Cerrar' : 'Abrir'} categorías de ${title.toLowerCase()}`}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => open ? onClose() : onOpen()}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
      <div id={id} className="dropdownPanel catalogDropdown" hidden={!open}>
        {categories.map(({ slug, title: categoryTitle, description }) => (
          <Link key={slug} className="dropdownItem" to={`${to}/${slug}`} onClick={onNavigate}>
            <span className="dropdownDot" aria-hidden="true" />
            <span>
              <strong>{categoryTitle}</strong>
              <small>{description}</small>
            </span>
          </Link>
        ))}
        <Link className="dropdownFooter" to={to} onClick={onNavigate}>
          Ver catálogo completo
        </Link>
      </div>
    </div>
  )
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const headerRef = useRef(null)
  const menuRef = useRef(null)
  const location = useLocation()

  const closeMenus = () => {
    setMobileOpen(false)
    setOpenDropdown(null)
  }

  // También cubre atrás/adelante del navegador y enlaces fuera del Navbar.
  useEffect(() => {
    setMobileOpen(false)
    setOpenDropdown(null)
  }, [location])

  useEffect(() => {
    const handleOutside = (event) => {
      if (!headerRef.current?.contains(event.target)) closeMenus()
    }
    const media = window.matchMedia('(max-width: 850px)')
    const handleResize = () => {
      const focused = document.activeElement
      if (headerRef.current?.contains(focused)) {
        // No dejar el foco en un control que el cambio de tamaño ocultará.
        if (media.matches) menuRef.current?.focus()
        else headerRef.current.querySelector('.brand')?.focus()
      }
      closeMenus()
    }
    document.addEventListener('pointerdown', handleOutside)
    media.addEventListener('change', handleResize)
    return () => {
      document.removeEventListener('pointerdown', handleOutside)
      media.removeEventListener('change', handleResize)
    }
  }, [])

  return (
    <header
      ref={headerRef}
      className="navbar"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closeMenus()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && mobileOpen) {
          event.preventDefault()
          closeMenus()
          menuRef.current?.focus()
        }
      }}
    >
      <Link className="brand" to="/" onClick={closeMenus}>
        <img src={logoSegurIXT} alt={`${company.name} ${company.tagline}`} className="logoNavbar" />
      </Link>
      <button
        ref={menuRef}
        className="menuButton"
        type="button"
        onClick={() => {
          setMobileOpen((value) => !value)
          setOpenDropdown(null)
        }}
        aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={mobileOpen}
        aria-controls="primary-navigation"
      >
        {mobileOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
      </button>
      <nav id="primary-navigation" aria-label="Navegación principal" className={mobileOpen ? 'navLinks open' : 'navLinks'}>
        <NavLink to="/" onClick={closeMenus}>Inicio</NavLink>
        <NavLink to="/empresa" onClick={closeMenus}>Empresa</NavLink>
        <CategoryDropdown
          id="catalog-navigation"
          title="Catálogo"
          to="/catalogo"
          categories={getCatalogCategories()}
          open={openDropdown === 'catalog'}
          onOpen={() => setOpenDropdown('catalog')}
          onClose={() => setOpenDropdown((current) => current === 'catalog' ? null : current)}
          onNavigate={closeMenus}
        />
        <NavLink to="/promociones" onClick={closeMenus}>Promociones</NavLink>
        <Link className="navCta" to="/cotizacion" onClick={closeMenus}>Cotizar</Link>
      </nav>
    </header>
  )
}
