# Manuales oficiales de uso - InfinityAtlas

- Fecha de creación: 8 de agosto de 2026
- Etiqueta de entrega final: `unicef-rfps-503931-submission-2026-08-08-final`
- Versión del sistema: Prototipo funcional controlado - Cierre de entrega
- Versión documental: 1.0 — Cierre de entrega
- Estado: documentación institucional final de entrega

## Reproducción documental

El generador versionado se encuentra en `../generate_infinityatlas_manuals.py`. Debe ejecutarse desde la raíz del repositorio con Python y las dependencias `Pillow`, `pypdf` y `reportlab`. Utiliza exclusivamente las figuras numeradas de `images/` y el logotipo oficial ya incluido en la aplicación.

## Manuales

| Manual | Fuente editable | PDF | Páginas | Campos explicados | SHA-256 |
| --- | --- | --- | ---: | ---: | --- |
| Manual de Usuario Monitor | `InfinityAtlas_Manual_Monitor_ES.md` | `InfinityAtlas_Manual_Monitor_ES.pdf` | 60 | 44 | `dd493ca7013fa79881891235ce269fa10c4fcb926fe117bb8483de2ceccc7ebc` |
| Manual de Usuario Administrador | `InfinityAtlas_Manual_Administrador_ES.md` | `InfinityAtlas_Manual_Administrador_ES.pdf` | 57 | 41 | `a020a966ccba3b91f938f6597c0fc1f99f13d9d9b278fb042b31102e3dd6773b` |
| Manual del Dashboard Público | `InfinityAtlas_Manual_Dashboard_Publico_ES.md` | `InfinityAtlas_Manual_Dashboard_Publico_ES.pdf` | 92 | 79 | `bc8e64d7bb1b333fbc4a9b9de11a305c278b58531cbe496cfb0bc81006885090` |

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

- Los manuales describen el prototipo funcional controlado identificado por la etiqueta de entrega y no inventan funciones futuras.
- Los registros institucionales no se publican automáticamente en el Dashboard Público.
- La eliminación lógica institucional es exclusiva del Administrador y no retira automáticamente datos de D1 pública.
- `demo-validator` permanece inactivo y oculto; la arquitectura del rol se conserva.
- La evidencia institucional se registra mediante referencia URL en el flujo documentado.
- La versión pública de Internet puede diferir de cambios locales que aún no hayan sido desplegados.
- Open-Meteo puede fallar temporalmente; InfinityAtlas debe identificar el fallback como desactualizado.
- Algunos datos históricos controlados conservan textos en inglés.
- La interfaz visible normaliza el territorio como `San Cristóbal` sin modificar valores legacy de la base.
- La cuenta `demo-admin` se presenta como `Demo Administrador` en español y `Demo Administrator` en inglés.
- Los PDF incluyen tabla de contenidos, marcadores, enlaces internos y URLs web clicables.
- Las guías Markdown en inglés están disponibles en `../en/README.md`.

## Seguridad y confidencialidad

Se verificó que los manuales y capturas no contienen contraseñas visibles, tokens, archivos `.env`, bases de datos, documentos UNICEF, información clínica ni datos personales. Las contraseñas aparecen ocultas visualmente y no se incluyen en Markdown, PDF o metadatos.

Esta edición actualiza exclusivamente la documentación institucional. No modifica arquitectura, permisos, bases de datos ni comportamiento funcional, y no introduce escrituras en D1 remota.
