/**
 * Contrato de paginación compartido por los listados de catálogo
 * (categorías, marcas, unidades de medida). Productos ya tenía su copia
 * en `producto.ts`; aquí queda la versión genérica para los demás dominios.
 *
 * El backend recibe `pagina`/`limite` como query params y responde:
 * - `limite` presente  → página acotada `{ data, total, page, limit, totalPages }`.
 * - `limite` ausente   → listado COMPLETO con
 *   `{ data, total, page: 1, limit: total || 0, totalPages: 1 }`.
 *
 * Por eso los clientes SOLO mandan los params cuando el caller los provee:
 * un `getAll()` sin argumentos debe seguir devolviendo la lista completa,
 * que es lo que necesitan los <select> de ProductosPage y ComprasNuevaPage.
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
