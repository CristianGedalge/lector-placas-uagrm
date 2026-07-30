# Informe de limpieza controlada

La limpieza se limita a artefactos generados cuya falta de uso se comprobó con
búsqueda global y estado Git. No se eliminan migraciones, pruebas, licencias,
scripts agénticos, fallbacks ni componentes de aplicación.

## Candidatos demostrados

| Elemento | Evidencia de no uso | Acción |
|---|---|---|
| Lockfile npm accidental en raíz | No existe `package.json` raíz; fue creado al ejecutar npm en el directorio equivocado. | Eliminado en commit de limpieza. |
| JSON/TXT intermedios de Ruff, Bandit, pip-audit y npm audit | Ningún código o script los consume; búsquedas globales sólo encuentran el propio contenido de error. | Eliminados 15 artefactos versionados y variantes locales; se conservan informes Markdown. |
| `backend/.coverage` | Archivo binario regenerable por pytest-cov, sin referencias. | Eliminado del repositorio e ignorado. |
| Imports marcados por Ruff | Análisis estático demostró falta de uso. | Eliminados mecánicamente; pruebas completas requeridas. |

## Exclusiones deliberadas

- Todas las migraciones Alembic, incluidas las aplicadas y reversiones históricas.
- Todas las pruebas y scripts de `.agents`.
- Modelos ONNX, avisos/licencias de terceros y fallbacks IA.
- Rutas y componentes: no se demostró con suficiente certeza que alguno esté
  totalmente obsoleto, por lo que no se elimina ninguno.

Los archivos versionados eliminados son recuperables desde Git. Se añadieron
reglas específicas a `.gitignore` para impedir que resultados locales vuelvan a
contaminar commits; `frontend/package-lock.json` se conserva deliberadamente.
