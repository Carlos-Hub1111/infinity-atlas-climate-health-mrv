# Manuales oficiales de uso - InfinityAtlas

- Fecha de creación: 30 de julio de 2026
- Commit de referencia: `2543f7b3bd57598f22698f175b9eb50a671c59e0`
- Rama documentada: `feature/sprint-1d-b-unified-demo-flow`
- Versión del sistema: Sprint 1D - Portal unificado y frontera de publicación
- Versión documental: 1.0 - Borrador para UAT
- Estado: borradores locales para revisión de Carlos y Nova

## Reproducción documental

El generador versionado se encuentra en `../generate_infinityatlas_manuals.py`. Debe ejecutarse desde la raíz del repositorio con Python y las dependencias `Pillow`, `pypdf` y `reportlab`. Utiliza exclusivamente las figuras numeradas de `images/` y el logotipo oficial ya incluido en la aplicación.

## Manuales

| Manual | Fuente editable | PDF | Páginas | Campos explicados | SHA-256 |
| --- | --- | --- | ---: | ---: | --- |
| Manual de Usuario Monitor | `InfinityAtlas_Manual_Monitor_ES.md` | `InfinityAtlas_Manual_Monitor_ES.pdf` | 60 | 44 | `7b17b7cdafe58709baf2608cf923ab285d31cba10c45f4ad8f2962c760620784` |
| Manual de Usuario Administrador | `InfinityAtlas_Manual_Administrador_ES.md` | `InfinityAtlas_Manual_Administrador_ES.pdf` | 54 | 37 | `a92c1b50737d7a8076e33356c943b2f9619e18359cae8db7c1aeb0425742b73e` |
| Manual del Dashboard Público | `InfinityAtlas_Manual_Dashboard_Publico_ES.md` | `InfinityAtlas_Manual_Dashboard_Publico_ES.pdf` | 92 | 79 | `a964c61faf1ec1cf89200e5d0f13dac81830e2daef7f4e0d5dc7133335dc4f41` |

## Capturas utilizadas

### Manual de Usuario Monitor
- `images/fig-01-portal-central-numerado.png`
- `images/fig-02-acceso-institucional-numerado.png`
- `images/fig-03-monitor-clima-numerado.png`
- `images/fig-04-monitor-formulario-numerado.png`
- `images/fig-05-monitor-evidencia-numerado.png`
- `images/fig-18-monitor-mobile-numerado.png`

### Manual de Usuario Administrador
- `images/fig-01-portal-central-numerado.png`
- `images/fig-02-acceso-institucional-numerado.png`
- `images/fig-06-admin-cola-numerado.png`
- `images/fig-07-admin-validacion-numerado.png`
- `images/fig-20-admin-historial-numerado.png`
- `images/fig-08-admin-auditoria-numerado.png`
- `images/fig-09-admin-usuarios-numerado.png`

### Manual del Dashboard Público
- `images/fig-01-portal-central-numerado.png`
- `images/fig-10-publico-filtros-numerado.png`
- `images/fig-11-publico-resultados-numerado.png`
- `images/fig-12-publico-indicadores-clima-numerado.png`
- `images/fig-13-publico-graficos-numerado.png`
- `images/fig-14-publico-temporal-numerado.png`
- `images/fig-15-publico-mapa-numerado.png`
- `images/fig-19-publico-mobile-numerado.png`

## Limitaciones conocidas

- Los manuales describen exactamente el commit de referencia y no inventan funciones futuras.
- Los registros institucionales no se publican automáticamente en el Dashboard Público.
- `demo-validator` permanece inactivo y oculto; la arquitectura del rol se conserva.
- La evidencia institucional se registra mediante referencia URL en el flujo documentado.
- La versión pública de Internet puede diferir de cambios locales que aún no hayan sido desplegados.
- Open-Meteo puede fallar temporalmente; InfinityAtlas debe identificar el fallback como desactualizado.
- Algunos datos históricos controlados conservan textos en inglés.
- La interfaz visible normaliza el territorio como `San Cristóbal` sin modificar valores legacy de la base.
- La cuenta `demo-admin` se presenta como `Demo Administrador` en español y `Demo Administrator` en inglés.
- Los PDF incluyen tabla de contenidos, marcadores, enlaces internos y URLs web clicables.

## Seguridad y confidencialidad

Se verificó que los manuales y capturas no contienen contraseñas visibles, tokens, archivos `.env`, bases de datos, documentos UNICEF, información clínica ni datos personales. Las contraseñas aparecen ocultas visualmente y no se incluyen en Markdown, PDF o metadatos.

Se modificó únicamente la capa de presentación local para normalizar `San Cristóbal` y el nombre visible del Administrador en español. No se modificaron arquitectura, permisos, bases de datos ni comportamiento funcional. No se realizó commit, push, merge, PR adicional, redeploy ni escritura en D1 remota.
