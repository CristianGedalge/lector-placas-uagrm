# Informe de limpieza controlada

La limpieza se limita a artefactos generados cuya falta de uso se comprobó con
búsqueda global y estado Git. No se eliminan migraciones, pruebas, licencias,
scripts agénticos, fallbacks ni componentes de aplicación.

## Candidatos demostrados

| Elemento | Evidencia de no uso | Acción |
|---|---|---|
| Lockfile npm accidental en raíz | No existe `package.json` raíz; fue creado al ejecutar npm en el directorio equivocado. | Eliminar en commit de limpieza. |
| JSON/TXT intermedios de Ruff, Bandit, pip-audit y npm audit | Ningún código o script los consume; búsquedas globales sólo encuentran el propio contenido de error. | Eliminar resultados intermedios; conservar informes Markdown. |
| `backend/.coverage` | Archivo binario regenerable por pytest-cov, sin referencias. | Eliminar del repositorio e ignorar. |
| Imports marcados por Ruff | Análisis estático demostró falta de uso. | Eliminados mecánicamente; pruebas completas requeridas. |

## Exclusiones deliberadas

- Todas las migraciones Alembic, incluidas las aplicadas y reversiones históricas.
- Todas las pruebas y scripts de `.agents`.
- Modelos ONNX, avisos/licencias de terceros y fallbacks IA.
- Rutas y componentes: no se demostró con suficiente certeza que alguno esté
  totalmente obsoleto, por lo que no se elimina ninguno.
