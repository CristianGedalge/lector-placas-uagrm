import { useState, useEffect, useCallback } from "react";
import parseApiError from "../utils/errors";

/**
 * MNT-002: Hook genérico para fetch de datos de página con manejo de
 * estado de carga, error, y refresco manual.
 *
 * @param {Function} fetchFn  - Función async que retorna los datos
 * @param {Array}    deps     - Dependencias que disparan un re-fetch automático (como useEffect)
 * @param {*}        initial  - Valor inicial del estado de datos ([] por defecto)
 *
 * @returns {{ data, loading, isRefreshing, error, refresh }}
 *
 * Ejemplo:
 *   const { data: users, loading, isRefreshing, error, refresh } = usePageData(
 *     () => listUsers(),
 *     []
 *   );
 */
function usePageData(fetchFn, deps = [], initial = []) {
  const [data, setData]               = useState(initial);
  const [loading, setLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError]             = useState("");

  const load = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      else          setLoading(true);
      setError("");

      const result = await fetchFn();
      setData(result ?? initial);
    } catch (err) {
      setError(parseApiError(err, "Error al cargar los datos."));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const refresh = () => load(true);

  return { data, setData, loading, isRefreshing, error, setError, refresh };
}

export default usePageData;
