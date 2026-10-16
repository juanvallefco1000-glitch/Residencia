const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function getData(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  return response.json();
}

export function obtenerCategoriasServicio() {
  return getData("/api/categorias-servicio");
}

export function obtenerServicios() {
  return getData("/api/servicios");
}