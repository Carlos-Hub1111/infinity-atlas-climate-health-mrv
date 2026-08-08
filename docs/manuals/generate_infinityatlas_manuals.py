from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PILImage
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "manuals" / "es"
IMAGES = OUT / "images"
LOGO = ROOT / "frontend" / "public" / "brand" / "infinityatlas-logo-official.png"
REFERENCE_COMMIT = "2543f7b3bd57598f22698f175b9eb50a671c59e0"
BRANCH = "feature/sprint-1d-b-unified-demo-flow"
CREATION_DATE = "30 de julio de 2026"
SYSTEM_VERSION = "Sprint 1D - Portal unificado y frontera de publicación"
DOCUMENT_VERSION = "1.0 - Borrador para UAT"
DOCUMENT_CHANGE = (
    "Segunda edición corregida: ortografía, localización visible, fichas específicas, "
    "índice navegable, enlaces internos y marcadores PDF."
)
DOCUMENT_PREPARED_BY = "Ciro (Codex) para INFINITYGAIA S.A.S. B.I.C."
DOCUMENT_APPROVED_BY = "Pendiente de aprobación final de Carlos y Nova"

NAVY = colors.HexColor("#082A3A")
PETROL = colors.HexColor("#064E5B")
TEAL = colors.HexColor("#087E83")
TURQUOISE = colors.HexColor("#35B7C5")
COOL = colors.HexColor("#EAF2F5")
GOLD = colors.HexColor("#D6AF42")
DARK = colors.HexColor("#102734")
MUTED = colors.HexColor("#526670")
PALE_GOLD = colors.HexColor("#FBF6E8")
WHITE = colors.white

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", r"C:\Windows\Fonts\ariali.ttf"))
pdfmetrics.registerFont(TTFont("Arial-BoldItalic", r"C:\Windows\Fonts\arialbi.ttf"))
pdfmetrics.registerFontFamily(
    "Arial",
    normal="Arial",
    bold="Arial-Bold",
    italic="Arial-Italic",
    boldItalic="Arial-BoldItalic",
)


def classify_element(name_es: str, required: str) -> str:
    name = name_es.casefold()
    requirement = required.strip().casefold()
    chart_map_terms = (
        "distribución",
        "registros por categoría",
        "registros observados por fecha",
        "mapa",
        "zoom",
        "marcador",
        "popup",
        "lista accesible",
        "lectura de la selección",
        "lectura territorial complementaria",
    )
    action_terms = (
        "actualizar clima",
        "guardar observación",
        "cerrar sesión",
        "buscar observaciones",
        "aplicar filtros",
        "limpiar filtros",
        "seleccionar todos",
        "casilla de selección",
        "ver en el mapa",
        "descargar",
        "usar coordenadas",
        "validar",
        "observar",
        "rechazar",
        "volver a la actividad",
    )
    navigation_terms = (
        "logo",
        "idioma",
        "pestaña",
        "portal central",
        "actividad global",
        "línea de tiempo por observación",
    )
    calculated_terms = (
        "puntaje",
        "nivel de riesgo",
        "registros totales",
        "pendientes",
        "validados",
        "observados",
        "rechazados",
        "dato público real",
        "prueba controlada",
        "demo sintética",
        "estado",
        "n.º público",
        "id técnico",
        "mensaje de éxito",
    )
    indicator_terms = (
        "servicios de la plataforma",
        "nombre del usuario",
        "rol",
        "estado de la consulta",
        "temperatura",
        "humedad",
        "sensación térmica",
        "precipitación",
        "código meteorológico",
        "fuente open-meteo",
        "hora observada",
        "última consulta",
        "observado por el proveedor",
        "respuesta actual",
        "dato desactualizado",
        "fuente de datos",
        "periodo consultado",
        "zona horaria",
        "aviso de prototipo",
        "propiedad de infinitygaia",
    )
    if any(term in name for term in chart_map_terms):
        return "Gráfico o mapa"
    if any(term in name for term in action_terms):
        return "Botón o acción"
    if any(term in name for term in navigation_terms):
        return "Elemento de navegación"
    if requirement.startswith("automático") or requirement.startswith("automatico"):
        if any(term in name for term in calculated_terms):
            return "Resultado calculado"
        return "Indicador informativo"
    if any(term in name for term in indicator_terms):
        return "Indicador informativo"
    if requirement.startswith("sí") or requirement.startswith("si"):
        return "Campo obligatorio"
    if requirement.startswith("condicional"):
        return "Campo obligatorio cuando aplica"
    return "Campo opcional"


def absence_explanation(element_type: str, name_es: str) -> str:
    name = name_es.casefold()
    if element_type == "Campo obligatorio":
        return (
            "InfinityAtlas detiene el guardado o la acción y señala este campo para que el usuario lo complete."
        )
    if element_type == "Campo obligatorio cuando aplica":
        return (
            "Cuando la condición está activa, InfinityAtlas detiene la acción hasta completarlo; "
            "si la condición no aplica, puede permanecer vacío."
        )
    if element_type == "Campo opcional":
        return (
            "El registro puede continuar. InfinityAtlas conserva el valor predeterminado o deja este dato "
            "opcional sin registrar, según corresponda."
        )
    if element_type == "Botón o acción":
        return (
            "No es un campo para llenar. Si no se pulsa, la operación asociada no se ejecuta y no cambia "
            "ningún registro."
        )
    if element_type == "Resultado calculado":
        return (
            "El usuario no lo escribe. Si faltan datos de origen, InfinityAtlas muestra el resultado como "
            "no disponible; nunca debe inventarse manualmente."
        )
    if element_type == "Elemento de navegación":
        return (
            "No es un campo para llenar. Si no se utiliza, el usuario permanece en la vista o sección actual."
        )
    if element_type == "Gráfico o mapa":
        if "mapa" in name or "marcador" in name or "zoom" in name or "popup" in name:
            return (
                "No es un campo para llenar. Si no existen ubicaciones públicas compatibles con los filtros, "
                "el mapa conserva su base y muestra un estado sin puntos."
            )
        return (
            "No es un campo para llenar. Si no existen registros compatibles con los filtros, la visualización "
            "muestra un estado vacío y una explicación textual."
        )
    return (
        "El usuario no lo escribe. Si no aparece, debe comprobar la fuente o el estado del servicio y no "
        "suponer un valor."
    )


def public_relation(
    element_type: str,
    visible_to: str,
    private: str,
    public_visibility: str,
) -> tuple[str, str]:
    if element_type in {"Botón o acción", "Resultado calculado", "Elemento de navegación"}:
        return (
            "Publicación pública",
            "No aplica: no es un dato territorial publicable.",
        )
    if "público" in visible_to.casefold() or "public" in visible_to.casefold():
        return (
            "¿Es visible en la interfaz pública?",
            "Sí. Forma parte de la superficie pública de solo lectura, con los límites de privacidad indicados.",
        )
    if private.strip().casefold().startswith("sí") or private.strip().casefold().startswith("si"):
        return (
            "¿Puede incluirse en una publicación pública?",
            "No en su forma institucional. Requiere autorización, sanitización y una revisión de privacidad.",
        )
    if public_visibility.strip().casefold().startswith("sí"):
        return (
            "¿Puede incluirse en una publicación pública?",
            "Sí, únicamente después de revisión, autorización y aplicación de las reglas de privacidad.",
        )
    return (
        "¿Puede incluirse en una publicación pública?",
        "Solo después de revisión, autorización y sanitización; nunca de forma automática.",
    )


@dataclass
class Manual:
    filename: str
    pdfname: str
    title: str
    subtitle: str
    audience: str
    items: list[tuple] = field(default_factory=list)
    figures: list[str] = field(default_factory=list)
    field_count: int = 0
    functions: list[str] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)

    def h1(self, text: str) -> None:
        self.items.append(("h1", text))

    def h2(self, text: str) -> None:
        self.items.append(("h2", text))

    def h3(self, text: str) -> None:
        self.items.append(("h3", text))

    def p(self, text: str) -> None:
        self.items.append(("p", text))

    def note(self, title: str, text: str) -> None:
        self.items.append(("note", title, text))

    def bullets(self, values: list[str]) -> None:
        self.items.append(("bullets", values))

    def steps(self, values: list[str]) -> None:
        self.items.append(("steps", values))

    def code(self, value: str) -> None:
        self.items.append(("code", value))

    def figure(self, filename: str, caption: str) -> None:
        self.items.append(("figure", filename, caption))
        self.figures.append(filename)

    def table(self, headers: list[str], rows: list[list[str]], widths=None) -> None:
        self.items.append(("table", headers, rows, widths))

    def field_card(
        self,
        name_es: str,
        name_en: str,
        purpose: str,
        instruction: str,
        good: str,
        bad: str,
        required: str,
        visible_to: str,
        private: str,
        common_error: str,
        correction: str,
        public_visibility: str = "No se publica automáticamente.",
    ) -> None:
        element_type = classify_element(name_es, required)
        empty_result = absence_explanation(element_type, name_es)
        relation_label, relation_value = public_relation(
            element_type,
            visible_to,
            private,
            public_visibility,
        )
        self.items.append(
            (
                "field",
                {
                    "Nombre exacto en español": name_es,
                    "Nombre exacto en inglés": name_en,
                    "Tipo de elemento": element_type,
                    "¿Para qué sirve?": purpose,
                    "¿Qué debe escribir o seleccionar el usuario?": instruction,
                    "Ejemplo correcto": good,
                    "Ejemplo incorrecto": bad,
                    "¿Es obligatorio?": required,
                    "¿Qué sucede si se deja vacío?": empty_result,
                    "¿Quién puede verlo?": visible_to,
                    "¿Contiene información privada?": private,
                    relation_label: relation_value,
                    "Error común": common_error,
                    "Cómo corregirlo": correction,
                },
            )
        )
        self.field_count += 1

    def pagebreak(self) -> None:
        self.items.append(("pagebreak",))


def add_access_and_start(manual: Manual, role_name: str, username: str) -> None:
    display_name = "Demo Administrador" if username == "demo-admin" else "Demo Monitor"
    manual.h1("Cómo encender InfinityAtlas")
    manual.p(
        "InfinityAtlas funciona localmente mediante tres servicios: el Portal Central, la API institucional "
        "y el Dashboard Público. El script de inicio los enciende juntos."
    )
    manual.h2("¿Qué es PowerShell?")
    manual.p(
        "PowerShell es una ventana de Windows donde se escriben instrucciones. No necesitas saber programar. "
        "Solo debes copiar los dos comandos exactamente como aparecen."
    )
    manual.steps(
        [
            "Presiona la tecla Windows.",
            "Escribe PowerShell.",
            "Abre Windows PowerShell.",
            "Copia el primer comando y presiona Enter.",
            "Copia el segundo comando y presiona Enter.",
            "Espera hasta que aparezcan las direcciones de los servicios.",
        ]
    )
    manual.code(
        'cd "C:\\Users\\carlo\\OneDrive\\Documentos\\InfinityAtlas_GitHub_Publication"\n'
        ".\\start-local.ps1"
    )
    manual.note(
        "Resultado esperado",
        "El Portal Central debe responder en http://127.0.0.1:5173/ y la API debe responder en "
        "http://127.0.0.1:8000/health. Si una página no abre, espera 20 segundos y actualiza una vez.",
    )
    manual.h1("Cómo entrar al Portal Central")
    manual.steps(
        [
            "Abre Google Chrome.",
            "Escribe http://127.0.0.1:5173/ en la barra superior.",
            "Presiona Enter.",
            "Selecciona Español.",
            "Presiona Iniciar sesión.",
            f"Escribe {username} en Usuario o correo.",
            "Escribe la contraseña local. La contraseña no aparece en este manual.",
            "Presiona Iniciar sesión.",
            f"Confirma que el encabezado muestra {display_name} y el rol {role_name}.",
        ]
    )
    manual.note(
        "Protege la contraseña",
        "No fotografíes, grabes, copies en un chat ni compartas la contraseña. Si Chrome ofrece guardarla, "
        "Carlos decide si acepta. Este manual nunca contiene contraseñas.",
    )
    manual.figure(
        "fig-01-portal-central-numerado.png",
        "Figura 1. Portal Central de InfinityAtlas. 1: marca; 2: idioma; 3: estado de servicios; "
        "4: acceso público; 5: acceso institucional; 6: aviso de prototipo; 7: frontera de datos.",
    )
    manual.figure(
        "fig-02-acceso-institucional-numerado.png",
        "Figura 2. Acceso institucional. 1: marca; 2: volver al portal; 3: idioma; 4: usuario; "
        "5: contraseña protegida; 6: iniciar sesión; 7: aviso de prototipo.",
    )


def add_common_intro(manual: Manual, role_focus: str) -> None:
    manual.h1("¿Qué es InfinityAtlas?")
    manual.p(
        "InfinityAtlas Climate & Health MRV Toolkit organiza información territorial para que sea más fácil "
        "observar, registrar, revisar y explicar riesgos relacionados con clima, salud, agua, residuos y "
        "contaminación ambiental."
    )
    manual.h2("¿Qué significa MRV?")
    manual.table(
        ["Palabra", "Explicación sencilla"],
        [
            ["Medir", "Registrar qué se observó, dónde, cuándo y con qué nivel metodológico."],
            ["Reportar", "Guardar la información de forma ordenada y producir reportes comprensibles."],
            ["Verificar", "Revisar que el registro esté completo y siga la metodología acordada."],
        ],
        [38 * mm, 132 * mm],
    )
    manual.p(
        f"En este manual el enfoque es {role_focus}. InfinityAtlas puede apoyar decisiones que protejan a "
        "niños, familias y comunidades, pero no reemplaza la evaluación de especialistas."
    )
    manual.note(
        "Límite importante",
        "InfinityAtlas no es una herramienta de diagnóstico médico. No ingreses nombres de niños, historias "
        "clínicas, documentos de identidad, fotografías identificables ni otros datos personales.",
    )


def add_live_demo(manual: Manual) -> None:
    manual.pagebreak()
    manual.h1("Apéndice A. Cómo presentar InfinityAtlas en una demostración en vivo")
    manual.p(
        "Este recorrido dura aproximadamente siete minutos. Las frases entre comillas pueden ser leídas por "
        "Carlos durante la presentación."
    )
    manual.table(
        ["Minuto", "Qué mostrar", "Frase exacta sugerida"],
        [
            [
                "0-1",
                "Portal Central, dos accesos y estado de servicios.",
                "“InfinityAtlas reúne en una sola plataforma el acceso público y el trabajo institucional, "
                "manteniendo separadas las fronteras de datos y permisos.”",
            ],
            [
                "1-2",
                "Dashboard Público: indicadores, clima, mapa, gráficos, filtros y reportes.",
                "“La superficie pública es de solo lectura. Presenta información controlada, geoprivada y "
                "explicable, sin usuarios, comentarios internos ni evidencia restringida.”",
            ],
            [
                "2-4",
                "Monitor: inicio seguro, formulario, evidencia y puntaje.",
                "“El Monitor registra una observación territorial y una referencia de evidencia. El puntaje "
                "se calcula en el backend y el Monitor no puede validar su propio registro.”",
            ],
            [
                "4-6",
                "Administrador: cola, decisión, comentario, historial y auditoría.",
                "“El Administrador revisa la integridad metodológica, registra una decisión y deja una "
                "trazabilidad que no puede editarse desde la interfaz normal.”",
            ],
            [
                "6-7",
                "Valor para una demostración dirigida a UNICEF.",
                "“Para una demostración dirigida a UNICEF, InfinityAtlas muestra cómo mejorar la información "
                "territorial, proteger datos y apoyar decisiones basadas en evidencia sobre clima, agua, residuos "
                "y salud. Este prototipo no implica selección, financiamiento, asociación ni respaldo de UNICEF.”",
            ],
        ],
        [16 * mm, 58 * mm, 96 * mm],
    )


TROUBLESHOOTING = [
    ["El sistema está apagado", "No se ejecutó start-local.ps1.", "Abre PowerShell, entra a la carpeta y ejecuta .\\start-local.ps1.", "Si el script termina con error."],
    ["Puerto ocupado", "Otro programa usa 5173, 4173 u 8000.", "Cierra la otra copia de InfinityAtlas. Ejecuta stop-local.ps1 y vuelve a iniciar.", "Si el mensaje continúa."],
    ["Backend no disponible", "La API no inició.", "Abre http://127.0.0.1:8000/health. Reinicia con stop-local.ps1 y start-local.ps1.", "Si /health no responde 200."],
    ["Frontend no disponible", "El Portal Central no inició.", "Abre http://127.0.0.1:5173/. Reinicia los servicios.", "Si la página sigue en blanco."],
    ["API desconectada", "El Portal no recibe respuesta del backend.", "Comprueba /health y espera 20 segundos.", "Si el estado sigue rojo."],
    ["Contraseña antigua", "Chrome guardó una clave anterior.", "Borra la entrada antigua del administrador de contraseñas y usa la clave local actual.", "Si Carlos no conoce la clave local vigente."],
    ["Usuario inactivo", "La cuenta fue desactivada.", "Pide al Administrador que compruebe Usuarios demo.", "Si la cuenta correcta sigue inactiva."],
    ["Token expirado", "La sesión terminó.", "Vuelve al acceso institucional e inicia sesión otra vez.", "Si ocurre inmediatamente después de ingresar."],
    ["Error 401", "Falta sesión o la sesión expiró.", "Cierra sesión, vuelve a entrar y repite la acción.", "Si ocurre con una sesión nueva."],
    ["Error 404", "La ruta o el recurso no existe.", "Revisa la URL y vuelve al Portal Central.", "Si una ruta documentada devuelve 404."],
    ["Error 405", "Se intentó escribir en una ruta de solo lectura.", "No repitas la solicitud. Usa únicamente los botones visibles.", "Si una acción permitida devuelve 405."],
    ["Error 422", "Falta un campo o su formato no es válido.", "Revisa los campos marcados, la URL y los valores 1-4.", "Si todos los campos parecen correctos."],
    ["Open-Meteo no responde", "El proveedor climático no está disponible temporalmente.", "Espera y pulsa Actualizar clima una vez. Usa el último dato solo si aparece como desactualizado.", "Si no hay dato almacenado."],
    ["El mapa no carga", "Red, mosaicos o navegador bloqueados.", "Actualiza una vez y comprueba la conexión.", "Si la atribución y el mapa siguen ausentes."],
    ["D1 no responde", "La base pública remota está temporalmente inaccesible.", "Prueba la versión local o espera unos minutos.", "Si /health público falla."],
    ["PDF vacío", "La descarga fue interrumpida o no hay resultados.", "Revisa los filtros, limpia filtros y descarga otra vez.", "Si el archivo sigue vacío."],
    ["CSV en una columna", "Se abrió el CSV técnico con configuración regional española.", "Descarga CSV para Excel, que usa punto y coma y BOM UTF-8.", "Si Excel no separa columnas."],
    ["Idioma mezclado", "Hay datos históricos controlados en inglés o caché antigua.", "Cambia de idioma y actualiza una vez.", "Si botones críticos permanecen mezclados."],
    ["Navegador congelado", "La pestaña tiene demasiados recursos o quedó esperando.", "Cierra solo la pestaña, abre el Portal y repite.", "Si ocurre en varios intentos."],
    ["Pantalla pequeña", "El zoom o el ancho no permiten ver la tabla.", "Usa 100% de zoom o gira el dispositivo. En móvil, desplázate verticalmente.", "Si existe desplazamiento horizontal incoherente."],
    ["Caché antigua", "Chrome conserva una versión anterior.", "Presiona Ctrl+F5 una vez.", "Si la interfaz no coincide con este manual."],
    ["Servicio local apagado", "PowerShell se cerró o stop-local.ps1 fue ejecutado.", "Ejecuta start-local.ps1 nuevamente.", "Si el servicio se apaga solo."],
    ["Error al guardar", "Falta un dato, la URL es inválida o la API no está disponible.", "Revisa los campos obligatorios y /health. Presiona Guardar una sola vez.", "Si no aparece un mensaje claro."],
    ["Campo obligatorio", "Un casillero requerido está vacío.", "Busca el campo señalado, complétalo y vuelve a guardar.", "Si no se identifica el campo."],
    ["URL de evidencia inválida", "No empieza por http:// o https://.", "Usa una dirección pública completa y segura.", "Si el enlace correcto es rechazado."],
]


def add_troubleshooting(manual: Manual) -> None:
    manual.pagebreak()
    manual.h1("Apéndice B. Solución de problemas")
    manual.table(
        ["Problema", "Posible causa", "Solución paso a paso", "Cuándo pedir ayuda técnica"],
        TROUBLESHOOTING,
        [33 * mm, 39 * mm, 65 * mm, 35 * mm],
    )


def add_shutdown(manual: Manual) -> None:
    manual.h1("Cómo cerrar sesión y apagar el sistema")
    manual.steps(
        [
            "Presiona el botón Cerrar sesión del encabezado.",
            "Confirma que regresaste al Portal Central.",
            "No dejes una sesión institucional abierta en un equipo compartido.",
            "Abre PowerShell cuando termine la demostración.",
            "Ejecuta los comandos siguientes.",
        ]
    )
    manual.code(
        'cd "C:\\Users\\carlo\\OneDrive\\Documentos\\InfinityAtlas_GitHub_Publication"\n'
        ".\\stop-local.ps1"
    )
    manual.p(
        "Cerrar la pestaña no siempre revoca la sesión de la misma forma que el botón Cerrar sesión. Usa primero "
        "el botón y después apaga los servicios."
    )


def build_monitor() -> Manual:
    m = Manual(
        "InfinityAtlas_Manual_Monitor_ES.md",
        "InfinityAtlas_Manual_Monitor_ES.pdf",
        "Manual de Usuario Monitor",
        "Registro de observaciones territoriales",
        "Monitor / Técnico",
    )
    m.functions = [
        "Encendido y apagado local",
        "Portal Central y acceso institucional",
        "Consulta climática de Open-Meteo",
        "Creación de observaciones territoriales",
        "Referencia de evidencia mediante URL",
        "Puntaje metodológico Peligro + Exposición + Vulnerabilidad",
        "Consulta de registros propios",
        "Cierre de sesión y límites del rol",
    ]
    m.limitations = [
        "El Monitor no valida, observa metodológicamente ni rechaza registros.",
        "La evidencia se registra como referencia URL; no existe carga pública de archivos en este flujo.",
        "Los registros institucionales no se publican automáticamente en D1 ni en el Dashboard Público.",
        "No existe recuperación avanzada de contraseña, MFA ni SSO en el prototipo.",
    ]
    add_common_intro(m, "observar, documentar y enviar registros para revisión")
    m.h2("Responsabilidades del Monitor")
    m.bullets(
        [
            "Observar una situación territorial.",
            "Registrar información clara y verificable.",
            "Añadir una referencia de evidencia.",
            "Clasificar la categoría, procedencia y nivel metodológico.",
            "Guardar el registro con estado Pendiente.",
        ]
    )
    m.h2("Acciones que el Monitor no puede realizar")
    m.bullets(
        [
            "No valida ni rechaza.",
            "No escribe comentarios metodológicos de decisión.",
            "No modifica la auditoría.",
            "No administra usuarios.",
            "No publica directamente en el Dashboard Público.",
            "Solo consulta los registros permitidos por su rol.",
        ]
    )
    add_access_and_start(m, "Monitor / Técnico", "demo-monitor")
    m.pagebreak()
    m.h1("Explicación de la pantalla Monitor")
    m.figure(
        "fig-03-monitor-clima-numerado.png",
        "Figura 3. Encabezado y condiciones climáticas. Los números se explican en las fichas siguientes.",
    )
    ui_cards = [
        ("Logo y nombre InfinityAtlas", "InfinityAtlas logo and name", "Identifica la plataforma oficial.", "Comprueba que diga InfinityAtlas, sin espacio.", "InfinityAtlas", "Infinity Atlas", "No", "Monitor y Administrador", "No", "Confundir la marca con otro sistema.", "Regresa al Portal Central y verifica la URL."),
        ("Idioma", "Language", "Cambia los textos entre español e inglés.", "Selecciona Español o English.", "Español", "Buscar un botón de rol dentro del selector.", "No", "Monitor y Administrador", "No", "Pensar que cierra la sesión.", "Selecciona el idioma; la ruta y sesión se conservan."),
        ("Servicios de la plataforma disponibles", "Platform services available", "Comprueba Portal, backend /health y API pública.", "Observa el color y abre el icono de información.", "Estado disponible con punto verde.", "Ignorar un estado parcial antes de guardar.", "No", "Todos", "No", "El tooltip queda abierto.", "Presiona Escape o toca fuera."),
        ("Nombre del usuario", "User display name", "Confirma qué cuenta inició sesión.", "Debe mostrar Demo Monitor.", "Demo Monitor", "Una cuenta de otra persona.", "No", "Monitor y Administrador", "Sí: identifica la cuenta local.", "Trabajar con una cuenta equivocada.", "Cierra sesión y entra con demo-monitor."),
        ("Rol", "Role", "Muestra los permisos reconocidos por la API.", "Comprueba Monitor / Técnico.", "Monitor / Técnico", "Administrador", "No", "Monitor y Administrador", "No", "Esperar controles de validación.", "Recuerda que el Monitor no valida."),
        ("Cerrar sesión", "Log out", "Revoca la sesión actual.", "Presiona al terminar.", "Usar el botón antes de cerrar Chrome.", "Cerrar solo la pestaña.", "No", "Monitor y Administrador", "No", "Dejar la sesión abierta.", "Vuelve a entrar y ciérrala correctamente."),
        ("Pestaña Dashboard", "Dashboard tab", "Abre el resumen del rol y sus accesos.", "Presiona Dashboard.", "Ver métricas del Monitor.", "Buscar auditoría global.", "No", "Monitor", "No", "Confundirlo con el Dashboard Público.", "Usa Abrir información pública desde el Portal para la vista pública."),
        ("Pestaña Observaciones", "Observations tab", "Abre clima, formulario y registros propios.", "Presiona Observaciones.", "Ver Nueva observación territorial.", "Esperar usuarios o auditoría.", "No", "Monitor", "No", "No encontrar el formulario.", "Selecciona Observaciones."),
        ("Actualizar clima", "Refresh climate", "Consulta nuevamente el proveedor climático.", "Presiona una vez y espera.", "Esperar hasta que termine el giro.", "Presionar varias veces rápido.", "No", "Monitor", "No", "Creer que cambió la hora observada.", "Revisa la última consulta y la hora del proveedor por separado."),
        ("Estado de la consulta climática", "Climate query status", "Informa éxito, error o uso de último dato.", "Lee el mensaje antes de usar el dato.", "Clima actualizado correctamente.", "Presentar un dato desactualizado como actual.", "No", "Monitor", "No", "Ignorar la etiqueta desactualizado.", "Explica que se muestra un dato almacenado."),
        ("Temperatura", "Temperature", "Muestra la temperatura del aire en °C.", "Solo consulta el valor.", "28.4 °C como dato público real.", "Escribirlo como diagnóstico.", "No", "Monitor", "No", "Confundir temperatura con sensación térmica.", "Lee el nombre de la tarjeta."),
        ("Humedad relativa", "Relative humidity", "Muestra el porcentaje de humedad.", "Solo consulta el porcentaje.", "69%.", "69 °C.", "No", "Monitor", "No", "Usar una unidad incorrecta.", "La humedad se expresa con %."),
        ("Sensación térmica", "Feels like", "Indica cómo se siente la temperatura según el modelo.", "Lee el valor en °C.", "31.4 °C.", "Afirmar que mide una condición clínica.", "No", "Monitor", "No", "Confundirla con temperatura real.", "Compara ambas tarjetas."),
        ("Precipitación", "Precipitation", "Muestra milímetros de precipitación del intervalo.", "Lee el valor en mm.", "0 mm.", "Interpretarlo como lluvia anual.", "No", "Monitor", "No", "Confundir intervalo con acumulado largo.", "Explica que es contexto actual."),
        ("Código meteorológico", "Weather code", "Identifica la condición WMO usada por Open-Meteo.", "Consulta el código y su texto.", "Nublado - Código WMO 2.", "Usarlo como nivel de riesgo.", "No", "Monitor", "No", "Confundirlo con el puntaje territorial.", "El riesgo usa otra metodología."),
        ("Fuente Open-Meteo", "Open-Meteo source", "Mantiene visible el origen del clima.", "Abre el enlace solo si necesitas auditoría técnica.", "Open-Meteo Weather Forecast API.", "Ocultar la fuente.", "No", "Monitor", "No", "Sorprenderse por el JSON.", "La respuesta técnica es para trazabilidad."),
        ("Hora observada por el proveedor", "Observed by provider", "Indica cuándo corresponde el dato meteorológico.", "Lee la hora del proveedor.", "1:45 p. m.", "Cambiarla manualmente.", "No", "Monitor", "No", "Confundirla con la hora del clic.", "Compara con Última consulta."),
        ("Última consulta de InfinityAtlas", "Last InfinityAtlas query", "Indica cuándo InfinityAtlas pidió el dato.", "Comprueba que cambie después del clic.", "1:55 p. m.", "Afirmar que el proveedor cambió el intervalo.", "No", "Monitor", "No", "Esperar que ambos tiempos sean iguales.", "Una nueva consulta puede devolver el mismo intervalo."),
        ("Nueva observación territorial", "New territorial observation", "Agrupa los campos de creación.", "Completa cada campo antes de guardar.", "Una prueba controlada sin datos personales.", "Un registro con nombres de niños.", "Sí para crear", "Monitor", "Puede contener información interna.", "Omitir un campo requerido.", "Revisa las fichas campo por campo."),
        ("Mis observaciones", "My observations", "Muestra los registros permitidos para el Monitor.", "Busca por número o nombre.", "#6 - Prueba de riesgo por calor.", "Esperar todos los registros institucionales.", "No", "Monitor", "Sí: información institucional.", "No encontrar un registro ajeno.", "El alcance depende del usuario creador."),
        ("Buscar observaciones", "Search observations", "Filtra por número o nombre corto.", "Escribe #6 o parte del título.", "#6", "Una contraseña.", "No", "Monitor", "No", "Buscar por descripción completa.", "Usa el número o nombre corto."),
    ]
    for card in ui_cards:
        m.field_card(*card)

    m.pagebreak()
    m.h1("Formulario Nueva observación territorial: campo por campo")
    m.figure(
        "fig-04-monitor-formulario-numerado.png",
        "Figura 4. Campos principales del formulario. Los números 1-14 corresponden a las fichas siguientes.",
    )
    form_cards = [
        ("Proyecto", "Project", "Relaciona la observación con un proyecto.", "Selecciona InfinityAtlas Climate & Health MRV Prototype.", "Proyecto Prototype.", "Proyecto Synthetic Demo para un ejercicio que se presentará como controlado.", "Sí", "Monitor y Administrador", "No", "Elegir el proyecto equivocado.", "Revisa la procedencia antes de guardar."),
        ("Territorio", "Territory", "Indica dónde ocurrió la observación.", "Selecciona San Cristóbal.", "San Cristóbal.", "Escribir una dirección particular.", "Sí", "Monitor y Administrador", "Puede ser sensible si se combina con coordenadas.", "Territorio vacío.", "Selecciona el territorio disponible."),
        ("Nombre corto del registro", "Record title", "Permite reconocer el registro sin depender del número.", "Usa máximo 80 caracteres y ningún dato personal.", "Prueba controlada de calor en San Cristóbal.", "Calor de Juan Pérez en su casa.", "Sí", "Monitor y Administrador", "No debe contener datos privados.", "Título demasiado largo o personal.", "Resume categoría y territorio."),
        ("Categoría", "Category", "Clasifica el tema observado.", "Elige Agua, Residuos, Calor o Contaminación ambiental.", "Calor.", "Salud de un niño.", "Sí", "Monitor, Administrador y público si se autoriza.", "No", "Elegir una categoría que no coincide.", "Lee la descripción y selecciona la más cercana."),
        ("Procedencia del dato", "Data provenance", "Distingue dato real, prueba controlada o demo sintética.", "Selecciona la opción demostrable.", "Prueba controlada para un ejercicio.", "Dato público real sin fuente verificable.", "Sí", "Monitor, Administrador y público si se autoriza.", "No", "Presentar una prueba como dato real.", "Cambia a Prueba controlada o Demo sintética."),
        ("Descripción", "Description", "Explica qué se observó.", "Escribe qué, dónde de forma general, cuándo y bajo qué contexto.", "Durante una práctica controlada se registró exposición a calor en una zona general.", "El niño X está enfermo en su casa.", "Sí", "Monitor y Administrador", "Sí si incluye detalles; no los incluyas.", "Descripción vaga o personal.", "Usa hechos sencillos y sin nombres."),
        ("Peligro", "Hazard", "Mide qué tan serio puede ser el problema.", "Selecciona 1, 2, 3 o 4.", "2 para calor moderado en una prueba.", "5 o una palabra libre.", "Sí", "Monitor y Administrador; puntaje público si se autoriza.", "No", "Elegir fuera de 1-4.", "Usa la escala explicada más adelante."),
        ("Exposición", "Exposure", "Mide cuántas personas, lugares o recursos podrían estar en contacto.", "Selecciona 1-4.", "2 para exposición limitada.", "Usar nombres de personas.", "Sí", "Monitor y Administrador; puntaje público si se autoriza.", "No", "Confundirla con gravedad.", "Piensa en alcance, no en intensidad."),
        ("Vulnerabilidad", "Vulnerability", "Mide qué tan difícil sería protegerse o recuperarse.", "Selecciona 1-4.", "2 para capacidad de respuesta parcial.", "Describir una condición médica.", "Sí", "Monitor y Administrador; puntaje público si se autoriza.", "No", "Usar datos clínicos.", "Evalúa capacidad territorial de forma general."),
        ("Fecha y hora de observación", "Observation date and time", "Registra cuándo se observó la situación.", "Selecciona fecha y hora local correctas.", "30/07/2026 10:00.", "Una fecha futura accidental.", "Sí", "Monitor, Administrador y fecha pública si se autoriza.", "No", "Confundirla con fecha de evidencia.", "Comprueba el calendario antes de guardar."),
        ("Latitud", "Latitude", "Ubica el registro de norte a sur.", "Usa un valor entre -90 y 90.", "-0.9002.", "-89.6127 en Latitud.", "Sí", "Monitor y Administrador; se protege para público.", "Sí: puede ser sensible.", "Intercambiar latitud y longitud.", "Usa el botón de coordenadas del territorio."),
        ("Longitud", "Longitude", "Ubica el registro de este a oeste.", "Usa un valor entre -180 y 180.", "-89.6127.", "-0.9002 en Longitud.", "Sí", "Monitor y Administrador; se protege para público.", "Sí: puede ser sensible.", "Intercambiar coordenadas.", "Comprueba que San Cristóbal use longitud cercana a -89."),
        ("Ubicación en el mapa público", "Public map location", "Define la geoprivacidad pública.", "Elige Exacta, Aproximada, Agregada u Oculta.", "Coordenada aproximada.", "Exacta para un lugar sensible.", "Sí", "Monitor y Administrador; el modo puede ser público.", "Sí si se elige exacta.", "Usar exacta sin autorización.", "Usa Aproximada como opción segura."),
        ("Usar coordenadas del territorio", "Use territory coordinates", "Rellena latitud y longitud de San Cristóbal.", "Presiona si no necesitas un punto distinto.", "-0.9002, -89.6127.", "Presionar y luego afirmar que es una ubicación exacta del evento.", "No", "Monitor", "No", "Creer que confirma el evento.", "Aclara que son coordenadas de referencia."),
        ("Fuente de la observación", "Observation source", "Explica de dónde salió la información.", "Escribe una fuente general y comprobable.", "Visita de monitoreo territorial.", "Me dijeron algo.", "Sí", "Monitor y Administrador", "No debe incluir nombres personales.", "Fuente demasiado vaga.", "Describe el tipo de actividad o documento."),
        ("Rol o equipo responsable", "Responsible role or team", "Identifica el equipo, no una persona.", "Escribe un rol o unidad.", "Equipo de monitoreo territorial.", "Carlos Cifuentes, teléfono...", "Sí", "Monitor y Administrador", "Sí si se escribe un nombre; no lo hagas.", "Usar nombre personal.", "Sustituye por el rol o equipo."),
        ("Tipo de evidencia", "Evidence type", "Clasifica la referencia.", "Elige web, fotográfica o documental.", "Referencia web.", "Archivo clínico.", "Sí", "Monitor y Administrador", "Puede ser sensible según la fuente.", "Tipo no coincide con el enlace.", "Selecciona el tipo real."),
        ("Fecha y hora de evidencia", "Evidence date and time", "Registra cuándo fue producida o consultada la evidencia.", "Selecciona la fecha correcta.", "30/07/2026 10:05.", "Fecha futura accidental.", "Sí", "Monitor y Administrador", "No", "Copiar una fecha incorrecta.", "Verifica la fuente original."),
        ("URL de evidencia", "Evidence URL", "Guarda una referencia sin subir archivos al repositorio.", "Escribe una URL completa que empiece por https://.", "https://github.com/Carlos-Hub1111/infinity-atlas-climate-health-mrv", "example.local o una ruta privada.", "Sí", "Monitor y Administrador", "Puede revelar información; usa solo enlaces autorizados.", "Dejarla vacía o sin https://.", "Usa una referencia pública controlada."),
        ("Fuente de evidencia", "Evidence source", "Nombra a la organización o sistema de origen.", "Escribe una fuente institucional.", "INFINITYGAIA S.A.S. B.I.C.", "Nombre de un niño.", "Sí", "Monitor y Administrador", "No debe contener datos personales.", "Confundir fuente con descripción.", "Escribe quién publicó o custodia la evidencia."),
        ("Descripción de evidencia", "Evidence description", "Explica qué contiene el enlace y por qué se relaciona.", "Escribe una frase concreta.", "Rama pública usada para una práctica controlada del flujo MRV.", "Evidencia.", "Sí", "Monitor y Administrador", "Puede ser sensible; evita detalles personales.", "Texto demasiado corto.", "Explica contenido y relación."),
        ("Confirmación de demo sintética", "Synthetic demo confirmation", "Evita presentar datos ficticios como reales.", "Marca la casilla solo cuando la procedencia sea Demo sintética.", "Confirmación marcada para un dato ficticio.", "Marcar dato público real como sintético.", "Condicional", "Monitor y Administrador", "No", "No marcarla cuando corresponde.", "Marca la confirmación antes de guardar."),
        ("Guardar observación", "Save observation", "Envía el formulario a la API institucional.", "Presiona una sola vez después de revisar.", "Mensaje Observación #... guardada con estado Pendiente.", "Presionar dos veces rápidamente.", "Sí para completar", "Monitor", "No", "No ver el mensaje de éxito.", "Espera, revisa errores y busca el registro."),
    ]
    for card in form_cards:
        m.field_card(*card)
    m.figure(
        "fig-05-monitor-evidencia-numerado.png",
        "Figura 5. Fuente, equipo responsable, evidencia, privacidad y guardado. Los números 1-9 corresponden a las fichas anteriores.",
    )

    m.h1("Peligro, Exposición y Vulnerabilidad")
    m.table(
        ["Componente", "Pregunta sencilla", "Ejemplo"],
        [
            ["Peligro", "¿Qué tan fuerte o serio puede ser el problema?", "Calor ligero: 1; calor intenso: 3; peligro muy grave: 4."],
            ["Exposición", "¿Cuántas personas, lugares o recursos podrían estar en contacto?", "Alcance pequeño: 1; alcance amplio: 4."],
            ["Vulnerabilidad", "¿Qué tan difícil sería protegerse o recuperarse?", "Buena capacidad de respuesta: 1; capacidad muy limitada: 4."],
        ],
        [32 * mm, 70 * mm, 70 * mm],
    )
    m.note(
        "Fórmula",
        "Puntaje de riesgo = Peligro + Exposición + Vulnerabilidad. 3-5: Bajo; 6-8: Moderado; "
        "9-10: Alto; 11-12: Crítico. Sirve para ordenar y revisar información territorial. No es un diagnóstico médico.",
    )

    m.pagebreak()
    m.h1("Ejercicio completo del Monitor")
    m.p("Este ejercicio crea una prueba controlada. No representa una emergencia ni un evento territorial validado.")
    m.table(
        ["Campo", "Valor del ejercicio"],
        [
            ["Nombre corto", "Prueba controlada de calor en San Cristóbal"],
            ["Categoría", "Calor"],
            ["Procedencia", "Prueba controlada"],
            ["Descripción", "Ejercicio controlado para practicar el registro de exposición a calor sin datos personales."],
            ["Peligro", "2"],
            ["Exposición", "2"],
            ["Vulnerabilidad", "2"],
            ["Resultado esperado", "6 / Moderado"],
            ["Fuente", "INFINITYGAIA S.A.S. B.I.C. controlled training"],
            ["Rol o equipo", "Equipo de monitoreo territorial"],
            ["Evidencia", "Rama pública de GitHub"],
            ["URL", "https://github.com/Carlos-Hub1111/infinity-atlas-climate-health-mrv"],
            ["Ubicación pública", "Aproximada"],
        ],
        [47 * mm, 125 * mm],
    )
    m.steps(
        [
            "Completa todos los campos con los valores de la tabla.",
            "Comprueba que no hay nombres, teléfonos, diagnósticos ni fotografías personales.",
            "Presiona Guardar observación una sola vez.",
            "Lee el mensaje con el número creado y estado Pendiente.",
            "Busca el número en Mis observaciones.",
            "Actualiza la página.",
            "Confirma que el registro permanece.",
            "Comprueba que no existen botones Validar, Observar o Rechazar para el Monitor.",
        ]
    )
    m.figure(
        "fig-18-monitor-mobile-numerado.png",
        "Figura 6. Vista móvil del Monitor a 390 px. La información se organiza verticalmente y conserva las mismas reglas.",
    )

    m.h1("Información que nunca debe ingresar el Monitor")
    m.bullets(
        [
            "Nombres completos de niños.",
            "Fotografías identificables de menores.",
            "Diagnósticos médicos o historias clínicas.",
            "Números de identificación.",
            "Teléfonos personales.",
            "Direcciones particulares.",
            "Contraseñas o tokens.",
            "Documentos confidenciales.",
            "Información que pueda poner en riesgo a una persona, comunidad o lugar sensible.",
        ]
    )
    add_shutdown(m)
    m.h1("Errores frecuentes del Monitor")
    m.table(
        ["Situación", "Qué hacer"],
        [
            ["La página no abre", "Comprueba que start-local.ps1 siga abierto y prueba /health."],
            ["API no conectada", "Espera 20 segundos y revisa http://127.0.0.1:8000/health."],
            ["Contraseña incorrecta", "Elimina la contraseña antigua guardada y usa la local vigente."],
            ["URL de evidencia vacía o inválida", "Usa una URL completa https:// autorizada."],
            ["Falta un campo obligatorio", "Busca el campo marcado y complétalo."],
            ["Coordenadas incorrectas", "Usa coordenadas del territorio y revisa latitud/longitud."],
            ["No aparece el registro", "Busca por número; confirma que pertenece al Monitor actual."],
            ["Clima no se actualiza", "Espera; el formulario continúa disponible."],
            ["Se presionó Guardar dos veces", "No repitas. Busca si ya se creó un número."],
            ["El usuario intenta validar", "El Monitor no tiene ese permiso. Inicia sesión como Administrador."],
            ["El sistema muestra 401", "La sesión expiró. Cierra sesión e ingresa otra vez."],
            ["El servidor fue apagado", "Ejecuta start-local.ps1 nuevamente."],
        ],
        [62 * mm, 110 * mm],
    )
    add_live_demo(m)
    add_troubleshooting(m)
    return m


def build_admin() -> Manual:
    m = Manual(
        "InfinityAtlas_Manual_Administrador_ES.md",
        "InfinityAtlas_Manual_Administrador_ES.pdf",
        "Manual de Usuario Administrador",
        "Revisión, validación, auditoría y control institucional",
        "Administrador",
    )
    m.functions = [
        "Portal Central y acceso institucional",
        "Dashboard interno",
        "Cola de revisión",
        "Observación, validación y rechazo metodológico",
        "Consulta de evidencia y puntaje",
        "Trazabilidad y auditoría navegable",
        "Usuarios demo y estado de cuentas",
        "Panel de frontera de publicación pública",
    ]
    m.limitations = [
        "Validar no publica un registro en el Dashboard Público.",
        "No existe sincronización automática con D1 remota.",
        "demo-validator permanece oculto e inactivo; su arquitectura se conserva para el futuro.",
        "No existe un botón funcional de publicación pública.",
        "No existe administración empresarial completa de organizaciones o identidades.",
    ]
    add_common_intro(m, "revisar, decidir, supervisar y conservar trazabilidad")
    m.h1("Qué hace el Administrador")
    m.table(
        ["Acción", "Significado"],
        [
            ["Crear", "Registrar una observación. En la demostración principal esta tarea corresponde al Monitor."],
            ["Revisar", "Leer datos, evidencia, puntaje, procedencia y geoprivacidad."],
            ["Observar", "Pedir aclaraciones o correcciones antes de validar."],
            ["Validar", "Confirmar integridad y consistencia metodológica."],
            ["Rechazar", "Cerrar el flujo porque no cumple requisitos mínimos."],
            ["Publicar", "Transferir información autorizada a una superficie pública. Esta función no está habilitada."],
            ["Auditar", "Consultar quién hizo cada acción, cuándo y con qué cambio."],
        ],
        [36 * mm, 136 * mm],
    )
    m.note(
        "Rol Validador",
        "El Administrador realiza la validación metodológica durante el prototipo. demo-validator está inactivo "
        "y oculto. Los modelos, permisos y pruebas históricas del rol Validador se conservan para una futura "
        "separación de responsabilidades.",
    )
    add_access_and_start(m, "Administrador", "demo-admin")
    m.note(
        "Contraseña local del Administrador",
        "Usa únicamente la contraseña local configurada en backend/.env. Este manual no contiene su valor. "
        "No la fotografíes, copies en chats ni guardes en documentación.",
    )
    m.h1("Pestañas del Administrador")
    m.figure(
        "fig-06-admin-cola-numerado.png",
        "Figura 3. Cola de revisión del Administrador. 1: identidad; 2: navegación; 3: publicación; "
        "4: cola; 5: detalle; 6: estado y procedencia; 7: componentes; 8: evidencia.",
    )
    nav_cards = [
        ("Dashboard", "Dashboard", "Muestra métricas generales y accesos rápidos.", "Presiona para regresar al resumen.", "Resumen institucional.", "Dashboard Público.", "No", "Administrador", "Sí: métricas internas.", "Confundirlo con la vista pública.", "Usa el Portal para abrir información pública."),
        ("Cola de revisión", "Review queue", "Lista registros que el Administrador puede revisar.", "Selecciona un registro.", "#3 - Pendiente.", "Elegir sin leer procedencia.", "No", "Administrador", "Sí", "No aparece un registro.", "Limpia filtros o revisa el alcance."),
        ("Observaciones", "Observations", "Muestra registros territoriales disponibles.", "Busca por número o nombre.", "#6 o prueba de riesgo.", "Buscar una contraseña.", "No", "Administrador", "Sí", "No encontrar un título histórico.", "Busca por número."),
        ("Usuarios demo", "Demo users", "Muestra cuentas locales y su estado.", "Consulta o cambia solo cuando esté autorizado.", "Demo Monitor activo.", "Publicar contraseñas.", "No", "Administrador", "Sí", "Intentar activar demo-validator deshabilitado.", "Respeta la configuración del prototipo."),
        ("Auditoría", "Audit", "Explora eventos globales o por observación.", "Aplica filtros y selecciona una observación.", "Eventos del registro #6.", "Editar la auditoría.", "No", "Administrador", "Sí: contiene actores y acciones.", "Esperar un botón eliminar.", "La auditoría es append-only."),
        ("Estado de publicación pública", "Public release status", "Explica la frontera entre validación interna y publicación.", "Lee el estado antes de presentar un registro.", "Uso interno - No autorizado para publicación pública.", "Afirmar que Validado significa publicado.", "No", "Administrador", "Sí", "Confundir validación con publicación.", "Recuerda que D1 pública está separada."),
    ]
    for card in nav_cards:
        m.field_card(*card)

    m.h1("Cola de revisión: elementos del registro")
    queue_cards = [
        ("Número del registro", "Record number", "Identifica la observación institucional.", "Úsalo para búsqueda y auditoría.", "#6.", "Número público 101.", "No", "Administrador", "No", "Confundir ID institucional con ID público.", "Menciona el contexto de la base."),
        ("Nombre corto", "Record title", "Resume el registro.", "Lee el título antes de decidir.", "Prueba de riesgo por calor.", "Un título con nombre personal.", "Sí en el registro", "Administrador", "Puede contener datos si fue mal escrito.", "Título histórico en inglés.", "Usa el número y registra la inconsistencia."),
        ("Categoría", "Category", "Clasifica el tema.", "Comprueba que coincide con la descripción.", "Calor.", "Agua para un registro de residuos.", "Sí", "Administrador", "No", "Categoría incoherente.", "Observa el registro y pide corrección."),
        ("Estado", "Status", "Muestra Pendiente, Observado, Validado o Rechazado.", "Comprueba la transición permitida.", "Pendiente antes de revisar.", "Validado sin revisión.", "Sí", "Administrador", "No", "Intentar una transición no permitida.", "Sigue el flujo definido."),
        ("Procedencia", "Provenance", "Distingue real, controlado o sintético.", "Verifica que la fuente lo demuestre.", "Prueba controlada.", "Dato público real sin fuente.", "Sí", "Administrador", "No", "Ocultar que es sintético.", "Rechaza u observa hasta corregir."),
        ("Descripción", "Description", "Explica el hecho registrado.", "Lee si contiene contexto suficiente y seguro.", "Descripción factual sin personas.", "Diagnóstico individual.", "Sí", "Administrador", "Sí si fue mal redactada.", "Datos personales visibles.", "No continúes; aplica el protocolo de privacidad."),
        ("Evidencia", "Evidence", "Abre la referencia autorizada.", "Comprueba fuente, fecha y relación.", "Rama pública controlada.", "Enlace roto o privado.", "Sí en este prototipo", "Administrador", "Puede ser sensible.", "El enlace no abre.", "Observa el registro y solicita nueva referencia."),
        ("Peligro", "Hazard", "Componente 1-4 del puntaje.", "Comprueba coherencia metodológica.", "3.", "5.", "Sí", "Administrador", "No", "Valor fuera de rango.", "El backend debe rechazarlo; no valides."),
        ("Exposición", "Exposure", "Componente 1-4 sobre alcance.", "Comprueba que no se confunda con gravedad.", "2.", "Nombres de personas.", "Sí", "Administrador", "No", "Valor incoherente.", "Observa y explica qué aclarar."),
        ("Vulnerabilidad", "Vulnerability", "Componente 1-4 sobre capacidad de respuesta.", "Comprueba contexto general.", "2.", "Historia clínica.", "Sí", "Administrador", "No", "Usar información clínica.", "Solicita una clasificación territorial."),
        ("Puntaje y nivel", "Risk score and level", "Muestra la suma calculada en backend.", "Verifica fórmula y versión.", "3 + 2 + 2 = 7 Moderado.", "Cambiar el total manualmente.", "Automático", "Administrador", "No", "No existe puntaje en un registro histórico.", "No inventes el valor; documenta que no está disponible."),
        ("Historial de trazabilidad", "Traceability history", "Muestra eventos append-only.", "Lee actor, rol, UTC, transición y comentario.", "pending -> observed.", "Editar un evento.", "Automático", "Administrador", "Sí", "Pensar que se puede borrar.", "La interfaz normal no permite editar."),
    ]
    for card in queue_cards:
        m.field_card(*card)

    m.h1("Estados de revisión")
    m.table(
        ["Estado", "Explicación sencilla"],
        [
            ["Pendiente", "El registro fue creado, pero todavía no ha sido revisado."],
            ["Observado", "Necesita aclaración, corrección o evidencia adicional."],
            ["Validado", "El Administrador confirmó integridad y consistencia metodológica."],
            ["Rechazado", "No cumple requisitos o no puede continuar en el flujo."],
        ],
        [35 * mm, 137 * mm],
    )
    m.note(
        "Validar no es verificar el evento",
        "La validación confirma la integridad del registro y su revisión metodológica. No constituye un "
        "diagnóstico médico ni verifica por sí sola el evento territorial.",
    )

    m.h1("Flujo paso a paso de validación")
    m.figure(
        "fig-07-admin-validacion-numerado.png",
        "Figura 4. Registro pendiente y acciones. 1: selección; 2: evidencia; 3: puntaje disponible o ausente; "
        "4: aviso metodológico; 5: comentario; 6: decisiones; 7: historial.",
    )
    action_cards = [
        ("Comentario de revisión", "Review comment", "Explica la decisión.", "Escribe una frase clara. Es obligatorio al Observar o Rechazar.", "La referencia necesita una descripción más clara.", "Corregir.", "Condicional", "Administrador", "Sí: comentario interno.", "Comentario vacío al observar.", "Explica qué falta y por qué."),
        ("Validar", "Validate", "Cambia un registro permitido a Validado.", "Presiona solo tras revisar integridad.", "Se revisó la integridad del registro y su consistencia metodológica.", "Validado porque parece real.", "No", "Administrador", "Sí: decisión interna.", "Validar sin evidencia.", "Regresa y revisa todos los componentes."),
        ("Observar", "Observe", "Solicita aclaración o corrección.", "Escribe comentario y confirma.", "La referencia necesita una descripción más clara antes de la validación.", "Falta algo.", "No", "Administrador", "Sí", "No escribir comentario.", "Añade una solicitud concreta."),
        ("Rechazar", "Reject", "Detiene el flujo por requisitos insuficientes.", "Escribe motivo y confirma.", "El registro no contiene evidencia suficiente para continuar.", "No me gusta.", "No", "Administrador", "Sí", "Rechazar sin motivo.", "Explica el requisito incumplido."),
        ("Mensaje de éxito", "Success message", "Confirma que la decisión fue guardada.", "Lee número y estado.", "El registro #3 cambió a Observado.", "Cerrar antes de confirmar.", "Automático", "Administrador", "No", "No aparece el mensaje.", "Revisa /health y no repitas indiscriminadamente."),
    ]
    for card in action_cards:
        m.field_card(*card)
    m.steps(
        [
            "Selecciona el registro.",
            "Lee nombre, descripción y procedencia.",
            "Abre la evidencia.",
            "Comprueba Peligro, Exposición y Vulnerabilidad.",
            "Confirma el puntaje y la versión cuando estén disponibles.",
            "Revisa si la ubicación pública es segura.",
            "Elige Observar, Validar o Rechazar.",
            "Escribe un comentario claro cuando corresponda.",
            "Confirma la decisión.",
            "Lee el mensaje de éxito.",
            "Revisa el historial.",
        ]
    )

    m.pagebreak()
    m.h1("Historial de trazabilidad")
    m.figure(
        "fig-20-admin-historial-numerado.png",
        "Figura 5. Puntaje e historial de un registro controlado validado. 1: evidencia; 2: puntaje; "
        "3: aviso metodológico; 4: historial; 5: evento auditado. Los datos históricos pueden conservar textos en inglés.",
    )
    m.table(
        ["Evento", "Qué significa"],
        [
            ["Observación creada", "Se guardó el registro inicial."],
            ["Puntaje de riesgo calculado", "El backend calculó total, nivel y versión."],
            ["Decisión de validación registrada", "Se guardó una decisión con actor y comentario."],
            ["Estado actualizado", "Se conservó la transición anterior y nueva."],
            ["Nombre del registro actualizado", "Se cambió el nombre corto y se guardó el valor anterior."],
            ["Inicio de sesión exitoso/fallido", "Se registró un intento de acceso."],
            ["Cierre de sesión", "Se revocó la sesión."],
        ],
        [54 * mm, 118 * mm],
    )

    m.h1("Auditoría: campo por campo")
    m.figure(
        "fig-08-admin-auditoria-numerado.png",
        "Figura 6. Auditoría navegable. 1: pestaña; 2: frontera pública; 3: búsqueda; 4: categoría; "
        "5: estado; 6: evento; 7: actor; 8: fecha UTC; 9: orden; 10: lista y actividad.",
    )
    audit_cards = [
        ("Número o nombre de observación", "Observation number or record title", "Busca una observación.", "Escribe #6 o parte del nombre.", "#6.", "Una contraseña.", "No", "Administrador", "No", "Usar un número público 101.", "Comprueba si buscas base institucional o pública."),
        ("Categoría", "Category", "Filtra Agua, Residuos, Calor o Contaminación.", "Selecciona una categoría o Todas.", "Calor.", "Un estado.", "No", "Administrador", "No", "Combinar filtros incompatibles.", "Limpia o ajusta filtros."),
        ("Estado", "Status", "Filtra por estado actual.", "Selecciona Pendiente, Observado, Validado o Rechazado.", "Validado.", "Publicado.", "No", "Administrador", "No", "Esperar un estado Publicado.", "La publicación es separada."),
        ("Evento", "Event", "Filtra el tipo de acción auditada.", "Selecciona el evento.", "Estado actualizado.", "Un nombre de usuario.", "No", "Administrador", "Sí", "No encontrar el evento.", "Prueba Todos los eventos."),
        ("Actor", "Actor", "Filtra quién realizó la acción.", "Selecciona un actor disponible.", "Administrador - usuario #4.", "Nombre público.", "No", "Administrador", "Sí: identidad interna.", "Presentarlo en público.", "Mantén la auditoría institucional."),
        ("Fecha (UTC)", "Date (UTC)", "Limita eventos a una fecha universal.", "Selecciona la fecha UTC.", "28/07/2026.", "Fecha local sin revisar zona.", "No", "Administrador", "No", "Confundir UTC con Galápagos.", "Lee la etiqueta UTC."),
        ("Orden", "Order", "Ordena más recientes o antiguos.", "Selecciona el orden.", "Más recientes primero.", "Orden alfabético.", "No", "Administrador", "No", "Pensar que altera los datos.", "Solo cambia la vista."),
        ("Observaciones", "Observations", "Lista registros coincidentes.", "Selecciona uno para ver su línea de tiempo.", "#6 - Prueba de riesgo por calor.", "Modificar desde la lista.", "No", "Administrador", "Sí", "No aparecen resultados.", "Revisa filtros."),
        ("Actividad global", "Global activity", "Muestra todos los eventos permitidos.", "Consulta o vuelve desde una línea de tiempo.", "Actividad global.", "Dashboard Público.", "No", "Administrador", "Sí", "Confundirla con eventos públicos.", "No compartas capturas sin sanitizar."),
        ("Línea de tiempo por observación", "Observation timeline", "Muestra solo eventos del registro seleccionado.", "Selecciona la observación.", "Creación -> puntaje -> observado -> validado.", "Editar la secuencia.", "No", "Administrador", "Sí", "Pensar que reemplaza la actividad global.", "Usa Volver a la actividad global."),
        ("Volver a la actividad global", "Back to global activity", "Quita la selección de una observación.", "Presiona el botón.", "Regresar a todos los eventos.", "Usar Volver del navegador.", "No", "Administrador", "No", "Perder el contexto.", "Usa el botón de la auditoría."),
    ]
    for card in audit_cards:
        m.field_card(*card)
    m.h2("Ejemplo: buscar todos los eventos del registro número 6")
    m.steps(
        [
            "Abre Auditoría.",
            "Escribe #6.",
            "Deja las demás opciones en Todos.",
            "Selecciona #6 - Prueba de riesgo por calor.",
            "Lee la línea de tiempo.",
            "Presiona Volver a la actividad global.",
        ]
    )

    m.h1("Usuarios demo y Validador inactivo")
    m.figure(
        "fig-09-admin-usuarios-numerado.png",
        "Figura 7. Usuarios demo. 1: Administrador activo; 2: Monitor activo; 3: cuentas heredadas inactivas; "
        "4: frontera de publicación. demo-validator está oculto y deshabilitado por configuración.",
    )
    m.note(
        "No hay contraseñas en esta pantalla",
        "La pantalla muestra nombre, identificador, rol y estado. No muestra ni permite copiar contraseñas. "
        "demo-validator no debe mostrarse como opción operativa.",
    )

    m.h1("Panel de publicación pública")
    m.p(
        "“Existe control de publicación pública” significa que el sistema separa la información interna de la "
        "información que cualquier persona puede consultar."
    )
    publication_cards = [
        ("Uso interno - No autorizado para publicación pública", "Internal use - Not authorized for public release", "Informa que el registro sigue siendo institucional.", "Lee el estado antes de presentar.", "Validado pero no publicado.", "Validado y publicado automáticamente.", "Automático", "Administrador", "Sí", "Confundir ambos conceptos.", "Explica la frontera."),
        ("Validación metodológica", "Methodological validation", "Confirma integridad, no publicación.", "Finaliza la revisión interna.", "Registro completo.", "Evento territorial verificado.", "Según flujo", "Administrador", "Sí", "Afirmar que confirma el evento.", "Usa el aviso metodológico."),
        ("Publicación externa deshabilitada", "External publication disabled", "Evita sincronización no autorizada.", "No busques un botón de publicación.", "D1 permanece separada.", "Intentar escribir en D1.", "Automático", "Administrador", "Sí", "Esperar cambio automático del Dashboard.", "La fase financiada requerirá autorización y sanitización."),
    ]
    for card in publication_cards:
        m.field_card(*card)

    m.h1("Qué permanece privado")
    m.bullets(
        [
            "Usuarios y cuentas.",
            "Actores y comentarios internos.",
            "Auditoría completa.",
            "Evidencia restringida.",
            "Coordenadas exactas sensibles.",
            "Contraseñas y tokens.",
            "Nombres personales e información clínica.",
            "Datos de niños.",
            "Documentación confidencial.",
        ]
    )

    m.h1("Ejercicio completo del Administrador")
    m.note(
        "Use un registro nuevo de prueba controlada",
        "No cambie registros históricos solo para completar el ejercicio. El Monitor crea primero un registro "
        "controlado. El ejercicio se realiza únicamente en la base local.",
    )
    m.steps(
        [
            "Ingresa como Administrador.",
            "Abre Cola de revisión.",
            "Selecciona el registro nuevo en estado Pendiente.",
            "Revisa fuente, evidencia, ubicación y puntaje.",
            "Escribe: “La referencia de evidencia necesita una descripción más clara antes de la validación.”",
            "Presiona Observar.",
            "Comprueba pending -> observed en el historial.",
            "Cuando la aclaración esté completa, escribe: “Se revisó la integridad del registro y su consistencia metodológica.”",
            "Presiona Validar.",
            "Abre Auditoría y confirma todos los eventos.",
            "Comprueba que el Monitor no tuvo controles de validación.",
            "Comprueba que demo-validator permanece inactivo y oculto.",
        ]
    )
    add_shutdown(m)
    m.h1("Errores frecuentes del Administrador")
    m.table(
        ["Situación", "Respuesta"],
        [
            ["Registro no aparece", "Revisa filtros, alcance y usuario creador."],
            ["Estado no cambia", "Comprueba transición y comentario obligatorio."],
            ["Comentario vacío", "Es obligatorio al Observar o Rechazar."],
            ["Transición no permitida", "No intentes cambiar un estado fuera del flujo."],
            ["Evidencia no abre", "Observa el registro y solicita una referencia válida."],
            ["Auditoría desordenada", "Cambia Orden y verifica UTC."],
            ["Filtro no devuelve datos", "Regresa a Todos y agrega un filtro a la vez."],
            ["Contraseña desactualizada", "Elimina la credencial antigua de Chrome."],
            ["Validador intenta entrar", "La cuenta demo-validator está deshabilitada."],
            ["Token expirado", "Inicia sesión nuevamente."],
            ["API no conectada", "Comprueba /health."],
            ["Se confunde validación con publicación", "Lee Estado de publicación pública."],
            ["Se espera cambio automático del Dashboard", "No existe sincronización automática con D1."],
        ],
        [62 * mm, 110 * mm],
    )
    add_live_demo(m)
    add_troubleshooting(m)
    return m


def build_public() -> Manual:
    m = Manual(
        "InfinityAtlas_Manual_Dashboard_Publico_ES.md",
        "InfinityAtlas_Manual_Dashboard_Publico_ES.pdf",
        "Manual del Dashboard Público",
        "Consulta de información territorial segura",
        "Público",
    )
    m.functions = [
        "Acceso público sin inicio de sesión",
        "Filtros reproducibles en URL",
        "Indicadores agregados",
        "Contexto climático de Open-Meteo",
        "Tabla de resultados y selección múltiple",
        "Gráficos accesibles y lectura interpretativa",
        "Mapa Leaflet/OpenStreetMap con geoprivacidad",
        "PDF público y CSV técnico/Excel",
        "Diccionario público de datos",
    ]
    m.limitations = [
        "La superficie pública es de solo lectura y no crea ni modifica registros.",
        "La versión pública estable puede no contener cambios locales aún no desplegados.",
        "El clima depende de Open-Meteo y puede mostrar un fallback claramente desactualizado.",
        "La ubicación oculta no aparece como punto.",
        "Los valores altos o críticos de la demo no representan emergencias reales.",
    ]
    add_common_intro(m, "consultar información pública segura sin iniciar sesión")
    m.note(
        "Qué contiene esta demostración",
        "Los seis registros son datos públicos controlados: prueba controlada, dato público real o demo sintética. "
        "No contienen nombres personales, comentarios internos ni auditoría privada.",
    )
    m.h1("Cómo entrar")
    m.steps(
        [
            "Abre http://127.0.0.1:5173/ para la versión local.",
            "Presiona Abrir información pública.",
            "También puedes abrir directamente http://127.0.0.1:5173/#public.",
            "Para la versión pública activa usa https://infinityatlas-public-demo.infinitygaia.workers.dev.",
            "No necesitas usuario ni contraseña.",
        ]
    )
    m.table(
        ["Versión", "Qué significa"],
        [
            ["Local", "Se ejecuta en el equipo de Carlos. Puede documentar cambios aún no publicados."],
            ["Pública de Internet", "Worker HTTPS activo, de solo lectura, conectado a D1 controlada."],
            ["Preview", "Versión temporal de Cloudflare para UAT; no necesariamente recibe tráfico estable."],
            ["Versión activa", "Versión que responde en la URL workers.dev estable."],
            ["Información institucional", "Datos internos del backend local. No forman parte del Dashboard Público."],
        ],
        [38 * mm, 134 * mm],
    )
    m.figure(
        "fig-01-portal-central-numerado.png",
        "Figura 1. Desde el Portal Central, el acceso público está separado del acceso institucional.",
    )

    m.h1("Encabezado y filtros")
    m.figure(
        "fig-10-publico-filtros-numerado.png",
        "Figura 2. Encabezado y filtros. 1: marca; 2: idioma; 3: API; 4: prototipo; 5: periodo, zona y fuente; "
        "6: territorio; 7: fechas; 8: filtros; 9: resumen activo; 10: aplicar/limpiar.",
    )
    header_cards = [
        ("Logo InfinityAtlas", "InfinityAtlas logo", "Identifica la superficie oficial.", "Comprueba la marca unida.", "InfinityAtlas.", "Infinity Atlas.", "No", "Público", "No", "Confundir con otra plataforma.", "Regresa a la URL oficial."),
        ("Propiedad de INFINITYGAIA S.A.S. B.I.C.", "Owned by INFINITYGAIA S.A.S. B.I.C.", "Identifica la empresa propietaria.", "Lee el pie y encabezado.", "INFINITYGAIA S.A.S. B.I.C.", "UNICEF.", "No", "Público", "No", "Afirmar respaldo de UNICEF.", "No hagas afirmaciones de selección o financiamiento."),
        ("Idioma", "Language", "Cambia toda la superficie pública.", "Selecciona Español o English.", "Español.", "Seleccionar un rol.", "No", "Público", "No", "Ver textos históricos distintos.", "Los títulos controlados se traducen; recarga si hay caché."),
        ("API pública disponible", "Public API available", "Muestra salud de la superficie pública.", "Comprueba estado antes de descargar.", "Disponible.", "Creer que habilita escritura.", "No", "Público", "No", "Confundir disponibilidad con permisos.", "La API pública continúa siendo de solo lectura."),
        ("Actualizado", "Updated", "Indica cuándo cargó el dashboard.", "Lee fecha y hora.", "30 jul 2026.", "Hora del evento territorial.", "No", "Público", "No", "Confundir con hora climática.", "Cada bloque tiene su propia hora."),
        ("Aviso de prototipo", "Prototype notice", "Evita presentar la demo como piloto validado.", "Mantenlo visible en demostraciones.", "Prototipo / prueba controlada.", "Sistema territorial validado.", "No", "Público", "No", "Omitirlo en capturas.", "Incluye el aviso."),
        ("Periodo consultado", "Consulted period", "Resume el rango de registros visibles.", "Lee las fechas.", "2026-07-21 - 2026-07-26.", "Rango clínico.", "No", "Público", "No", "Confundir con pronóstico.", "Es el rango de observaciones."),
        ("Zona horaria territorial", "Territory timezone", "Indica la zona usada para mostrar fechas.", "Comprueba Pacific/Galapagos.", "Pacific/Galapagos.", "UTC como hora local.", "No", "Público", "No", "Comparar sin zona.", "Usa la zona indicada."),
        ("Fuente de datos", "Data source", "Indica que la base pública es D1 controlada.", "Abre el tooltip para conocer el límite.", "Base demostrativa controlada en Cloudflare D1.", "backend/local.db.", "No", "Público", "No", "Creer que D1 contiene usuarios.", "El tooltip explica que no contiene datos internos."),
    ]
    for card in header_cards:
        m.field_card(*card)
    filter_cards = [
        ("Territorio", "Territory", "Limita al territorio disponible.", "Mantén San Cristóbal, Galápagos.", "San Cristóbal.", "Una dirección privada.", "Sí, fijo", "Público", "No", "Esperar varios territorios.", "El prototipo documenta uno."),
        ("Fecha desde", "From date", "Define el inicio del rango.", "Elige una fecha igual o anterior a Fecha hasta.", "21/07/2026.", "31/07/2026 cuando Fecha hasta es 21/07.", "No", "Público", "No", "Rango invertido.", "Corrige las fechas."),
        ("Fecha hasta", "To date", "Define el final del rango.", "Elige la fecha final.", "26/07/2026.", "Una fecha anterior al inicio.", "No", "Público", "No", "No aparecen resultados.", "Limpia o amplía el rango."),
        ("Categoría", "Category", "Filtra Agua, Residuos, Calor o Contaminación.", "Selecciona una opción.", "Calor.", "Moderado.", "No", "Público", "No", "Elegir dimensión equivocada.", "Lee la etiqueta."),
        ("Estado de revisión", "Review status", "Filtra Pendiente, Validado, Observado o Rechazado.", "Selecciona un estado.", "Validado.", "Publicado.", "No", "Público", "No", "Confundir validado con verificado.", "Abre el tooltip."),
        ("Procedencia del dato", "Data provenance", "Filtra real, controlado o sintético.", "Selecciona la procedencia.", "Prueba controlada.", "Dato real sin fuente.", "No", "Público", "No", "Interpretar controlado como evento.", "Lee el aviso."),
        ("Nivel de riesgo", "Risk level", "Filtra Bajo, Moderado, Alto o Crítico.", "Selecciona un nivel.", "Crítico.", "Emergencia.", "No", "Público", "No", "Presentarlo como alerta real.", "El nivel es metodológico y controlado."),
        ("Número o nombre del registro", "Record number or title", "Busca por número público, ID técnico o título.", "Escribe 2, 102 o parte del nombre.", "calor.", "Nombre personal.", "No", "Público", "No", "Buscar comentarios internos.", "Solo se buscan campos públicos."),
        ("Aplicar filtros", "Apply filters", "Actualiza indicadores, tabla, gráficos, mapa y descargas.", "Presiona una vez.", "Calor -> 3 de 6 registros.", "Aplicar repetidamente.", "No", "Público", "No", "No ver cambios.", "Lee el resumen activo y la URL."),
        ("Limpiar filtros", "Clear filters", "Regresa a los seis registros.", "Presiona una vez.", "6 de 6 registros.", "Recargar muchas veces.", "No", "Público", "No", "El mapa parece vacío.", "Espera a que se restaure la selección."),
        ("Filtros activos", "Active filters", "Resume criterios aplicados.", "Lee los chips.", "Categoría: Calor.", "Pensar que un campo seleccionado ya fue aplicado.", "Automático", "Público", "No", "Olvidar presionar Aplicar.", "Comprueba el resumen."),
    ]
    for card in filter_cards:
        m.field_card(*card)
    m.h2("Ejercicios con filtros")
    m.steps(
        [
            "Selecciona Categoría = Calor y presiona Aplicar filtros.",
            "Comprueba 3 de 6 registros.",
            "Busca 102 para localizar el registro técnico 102.",
            "Selecciona Estado = Validado.",
            "Selecciona Riesgo = Crítico y observa el resultado.",
            "Presiona Limpiar filtros.",
            "Comprueba que regresan 6 de 6 registros y cinco puntos visibles.",
        ]
    )

    m.pagebreak()
    m.h1("Resultados filtrados y descargas")
    m.figure(
        "fig-11-publico-resultados-numerado.png",
        "Figura 3. Resultados y descargas. 1: conteo; 2: seleccionar todos; 3: número/ID; 4: título; "
        "5: campos públicos; 6: mapa; 7: PDF; 8: CSV Excel; 9: CSV técnico; 10: diccionario.",
    )
    result_cards = [
        ("Casilla de selección", "Selection checkbox", "Selecciona uno o varios registros.", "Marca o desmarca la fila.", "Seleccionar 101 y 103.", "Pensar que cambia la base.", "No", "Público", "No", "Olvidar la selección manual.", "Revisa el contador."),
        ("Seleccionar todos", "Select all", "Marca todos los resultados visibles.", "Usa la casilla del encabezado.", "Seleccionar los seis filtrados.", "Seleccionar registros fuera del filtro.", "No", "Público", "No", "Confundir visibles con toda D1.", "Lee X de 6."),
        ("Registro público", "Public record number", "Numera la interfaz 1-6.", "Úsalo en la explicación pública.", "Registro 2.", "ID institucional #2.", "Automático", "Público", "No", "Confundir con ID técnico.", "Menciona ambos cuando sea necesario."),
        ("ID técnico", "Technical ID", "Mantiene trazabilidad estable 101-106.", "Úsalo en CSV y auditoría técnica.", "ID técnico 102.", "Cambiarlo manualmente.", "Automático", "Público", "No", "Usar N.º público como clave.", "El CSV conserva el ID técnico."),
        ("Título", "Title", "Describe el registro con un nombre público controlado.", "Lee el título traducido.", "Revisión controlada de exposición al calor.", "Nombre de una persona.", "Automático", "Público", "No", "Título en idioma distinto por caché.", "Cambia idioma o recarga."),
        ("Categoría", "Category", "Muestra el tema.", "Lee Agua, Residuos, Calor o Contaminación.", "Calor.", "Diagnóstico.", "Automático", "Público", "No", "Interpretar categoría como causa.", "Es solo clasificación."),
        ("Estado de revisión", "Review status", "Muestra el estado metodológico.", "Abre el tooltip si necesitas definición.", "Validado.", "Evento verificado.", "Automático", "Público", "No", "Confundir validación con ocurrencia.", "Lee la ayuda."),
        ("Nivel de riesgo", "Risk level", "Muestra total y nivel metodológico.", "Lee número y nivel.", "11 - Crítico.", "Emergencia real.", "Automático", "Público", "No", "Alarmar por un dato controlado.", "Lee el aviso de demo."),
        ("Procedencia", "Provenance", "Explica origen del registro.", "Comprueba real, controlado o sintético.", "Prueba controlada.", "Ocultar la procedencia.", "Automático", "Público", "No", "Presentar sintético como real.", "Usa la etiqueta visible."),
        ("Fecha observada", "Observed date", "Indica la fecha pública del registro.", "Lee la fecha.", "22 jul 2026.", "Hora climática.", "Automático", "Público", "No", "Confundir con actualización.", "Cada bloque etiqueta su fecha."),
        ("Modo de ubicación", "Location mode", "Informa geoprivacidad.", "Lee aproximada, agregada u oculta.", "Ubicación pública aproximada.", "Coordenada exacta restringida.", "Automático", "Público", "No", "Buscar coordenadas ocultas.", "InfinityAtlas no las expone."),
        ("Ver en el mapa", "View on map", "Centra y abre el marcador permitido.", "Presiona en una fila visible.", "Un resultado centra el mapa.", "Esperar un punto para ubicación oculta.", "No", "Público", "No", "El registro oculto no muestra punto.", "Lee la explicación de geoprivacidad."),
        ("Descargar reporte PDF", "Download PDF report", "Genera un informe de filtros o selección.", "Selecciona filas o usa el conjunto filtrado.", "Un PDF con 101 y 103.", "Esperar comentarios internos.", "No", "Público", "No", "Descargar sin revisar selección.", "Lee el texto del botón."),
        ("Descargar CSV para Excel", "Download CSV for Excel", "Abre columnas correctamente en Excel español.", "Usa esta opción para hojas de cálculo.", "UTF-8 BOM y punto y coma.", "CSV técnico en Excel regional sin importar.", "No", "Público", "No", "Toda la fila aparece en una columna.", "Usa CSV para Excel."),
        ("Descargar CSV técnico interoperable", "Download interoperable technical CSV", "Entrega nombres de máquina y coma para Power BI, GIS y auditoría.", "Usa en sistemas técnicos.", "Fechas ISO 8601.", "Convertirlo en informe narrativo.", "No", "Público", "No", "Abrirlo directamente en Excel español.", "Importa delimitado por coma."),
        ("Diccionario público de datos", "Public data dictionary", "Explica cada columna del CSV.", "Ábrelo antes de integrar.", "technical_id = identificador estable.", "Adivinar el significado.", "No", "Público", "No", "Ignorar geoprivacidad.", "Consulta las columnas location_mode y coordenadas públicas."),
    ]
    for card in result_cards:
        m.field_card(*card)

    m.h1("Contexto climático")
    m.figure(
        "fig-12-publico-indicadores-clima-numerado.png",
        "Figura 4. Indicadores y un estado temporal del clima. 1-4: conteos; 5: clima; 6: actualización; "
        "7: fuente/JSON; 8: gráficos. El formulario y los registros siguen disponibles si Open-Meteo falla.",
    )
    climate_cards = [
        ("Open-Meteo", "Open-Meteo", "Identifica el proveedor climático público.", "Usa Conocer la fuente para una explicación.", "open-meteo.com.", "Ocultar la atribución.", "No", "Público", "No", "Abrir JSON esperando una página narrativa.", "Usa el enlace Conocer la fuente."),
        ("Temperatura", "Temperature", "Muestra °C actuales del modelo.", "Lee el valor.", "28.4 °C.", "Diagnóstico clínico.", "Automático", "Público", "No", "Confundir con sensación.", "Compara las etiquetas."),
        ("Humedad", "Humidity", "Muestra porcentaje relativo.", "Lee %.", "69%.", "69 °C.", "Automático", "Público", "No", "Unidad incorrecta.", "Usa %."),
        ("Sensación térmica", "Feels like", "Muestra temperatura aparente.", "Lee °C.", "31.4 °C.", "Temperatura corporal.", "Automático", "Público", "No", "Interpretación clínica.", "Es contexto meteorológico."),
        ("Precipitación", "Precipitation", "Muestra mm del intervalo.", "Lee mm.", "0 mm.", "Promedio anual.", "Automático", "Público", "No", "Usar periodo equivocado.", "Explica el intervalo."),
        ("Código meteorológico", "Weather code", "Código WMO de condición.", "Consulta número y condición.", "2 - Nublado.", "Nivel de riesgo.", "Automático", "Público", "No", "Confundir con puntaje.", "Son metodologías distintas."),
        ("Observado por el proveedor", "Observed by provider", "Hora del intervalo meteorológico.", "Lee sin modificar.", "12:45 p. m.", "Hora del clic.", "Automático", "Público", "No", "Esperar cambio cada clic.", "El proveedor puede conservar intervalo."),
        ("Última consulta de InfinityAtlas", "Last InfinityAtlas query", "Hora en que se pidió la respuesta.", "Comprueba que cambie al actualizar.", "1:56 p. m.", "Hora observada.", "Automático", "Público", "No", "Confundir ambas horas.", "Lee los dos rótulos."),
        ("Actualizar clima", "Refresh climate", "Repite la consulta.", "Presiona una vez y espera el giro.", "Mensaje de éxito.", "Clics repetidos.", "No", "Público", "No", "Pensar que no funcionó si el intervalo no cambió.", "Lee el mensaje de consulta terminada."),
        ("Respuesta actual del proveedor", "Current provider response", "Confirma que la respuesta vino en vivo.", "Comprueba la etiqueta.", "Respuesta actual.", "Dato almacenado presentado como actual.", "Automático", "Público", "No", "Ignorar stale.", "Los datos almacenados deben decir desactualizado."),
        ("Dato desactualizado", "Stale data", "Mantiene resiliencia transparente.", "Úsalo solo como último dato disponible.", "Fuente no disponible; último dato real.", "Dato actual.", "Automático", "Público", "No", "Ocultar la falla.", "Menciona observación y recuperación."),
        ("Ver respuesta técnica JSON", "View technical JSON response", "Permite reproducir la consulta exacta.", "Ábrelo para auditoría técnica.", "URL con latitud, longitud y variables.", "Copiarlo como narrativa.", "No", "Público", "No", "No entender llaves y valores.", "JSON es un formato estructurado para sistemas."),
    ]
    for card in climate_cards:
        m.field_card(*card)
    m.note(
        "Qué no demuestra el clima",
        "El clima sirve como contexto territorial. No demuestra por sí solo que una observación, riesgo o "
        "evento haya ocurrido.",
    )

    m.h1("Indicadores principales")
    indicators = [
        ("Registros totales", "Total records", "Cuenta resultados después de filtros.", "6 sin filtros.", "No cuenta registros institucionales."),
        ("Pendientes", "Pending", "Cuenta registros aún no revisados.", "2.", "No significa error."),
        ("Validados", "Validated", "Cuenta registros metodológicamente completos.", "2.", "No confirma que ocurrieron."),
        ("Observados", "Observed", "Cuenta registros que necesitan aclaración.", "1.", "No es observación meteorológica."),
        ("Rechazados", "Rejected", "Cuenta registros que no siguieron requisitos.", "1.", "No se elimina automáticamente."),
        ("Dato público real", "Public real data", "Cuenta fuentes públicas identificadas.", "1.", "No incluye toda prueba controlada."),
        ("Prueba controlada", "Controlled test", "Cuenta ejercicios explícitos.", "4.", "No son eventos verificados."),
        ("Demo sintética", "Synthetic demo", "Cuenta datos ficticios.", "1.", "Nunca se presenta como real."),
        ("Riesgo Bajo", "Low risk", "Cuenta puntajes 3-5.", "1.", "No es diagnóstico."),
        ("Riesgo Moderado", "Moderate risk", "Cuenta puntajes 6-8.", "3.", "No implica alerta."),
        ("Riesgo Alto", "High risk", "Cuenta puntajes 9-10.", "1.", "No representa emergencia real."),
        ("Riesgo Crítico", "Critical risk", "Cuenta puntajes 11-12.", "1.", "En la demo es controlado."),
    ]
    for es_name, en_name, purpose, good, bad in indicators:
        m.field_card(es_name, en_name, purpose, "Lee el número y abre el tooltip.", good, bad, "Automático", "Público", "No", "Interpretar el conteo sin filtros.", "Revisa filtros activos.", "Sí, es un indicador público agregado.")

    m.h1("Gráficos y lectura interpretativa")
    m.figure(
        "fig-13-publico-graficos-numerado.png",
        "Figura 5. Gráficos. 1: categoría; 2: procedencia; 3: selector de dona; 4: dona; "
        "5: lectura de selección; 6: lectura territorial complementaria.",
    )
    m.figure(
        "fig-14-publico-temporal-numerado.png",
        "Figura 6. Serie temporal y entrada al mapa. 1: barras por fecha; 2: explicación; "
        "3: aviso de riesgo controlado; 4: mapa.",
    )
    chart_cards = [
        ("Distribución por estado de revisión", "Distribution by review status", "Responde cuántos están pendientes, validados, observados o rechazados.", "Pasa el cursor, enfoca o toca una barra.", "Pendiente 2.", "Concluir que validado ocurrió realmente.", "Automático", "Público", "No", "Tooltip queda abierto.", "Retira cursor, pulsa Escape o toca fuera."),
        ("Distribución por nivel de riesgo", "Distribution by risk level", "Agrupa por Bajo, Moderado, Alto y Crítico.", "Lee cantidades y fórmula.", "Moderado 3.", "Alarma clínica.", "Automático", "Público", "No", "Ignorar aviso controlado.", "Explica metodología."),
        ("Registros por categoría", "Records by category", "Muestra qué temas aparecen.", "Compara barras.", "Calor 3.", "Afirmar causalidad.", "Automático", "Público", "No", "Decir que predominancia representa el territorio.", "Solo describe la muestra."),
        ("Procedencia de los datos", "Data provenance", "Muestra real, controlado y sintético.", "Comprueba porcentajes.", "Prueba controlada 4.", "Mezclar dimensiones.", "Automático", "Público", "No", "Ocultar sintéticos.", "Mantén etiquetas."),
        ("Distribución complementaria", "Complementary distribution", "Permite una dimensión a la vez.", "Selecciona estado, riesgo, procedencia o categoría.", "Estado de revisión.", "Mezclar riesgo y categoría en la misma dona.", "No", "Público", "No", "Comparar porcentajes de dimensiones distintas.", "Selecciona una sola."),
        ("Lectura de la selección", "Selection reading", "Resume factual y cuantitativamente.", "Lee número, grupo mayor y aviso.", "2 de 6, controlados.", "Recomendación clínica.", "Automático", "Público", "No", "Interpretar como diagnóstico.", "Lee el aviso."),
        ("Registros observados por fecha", "Records observed by date", "Cuenta registros que comparten fecha.", "Lee número sobre cada barra.", "Un registro por fecha.", "Evolución clínica.", "Automático", "Público", "No", "Afirmar tendencia con un punto por fecha.", "La interfaz advierte que no permite identificar tendencia."),
        ("Lectura territorial complementaria", "Complementary territorial reading", "Resume cantidad y predominancias.", "Lee categoría, riesgo y procedencia predominantes.", "Calor 3 de 6.", "Representatividad territorial.", "Automático", "Público", "No", "Confundir predominancia con causalidad.", "Es una lectura de la selección."),
    ]
    for card in chart_cards:
        m.field_card(*card)

    m.h1("Mapa territorial y geoprivacidad")
    m.figure(
        "fig-15-publico-mapa-numerado.png",
        "Figura 7. Mapa territorial. 1: base cartográfica; 2: zoom; 3: marcadores; 4: leyenda; "
        "5: atribución; 6: lista accesible.",
    )
    map_cards = [
        ("Mover el mapa", "Pan map", "Explora la zona visible.", "Arrastra sin cambiar datos.", "Mover hacia Puerto Baquerizo Moreno.", "Creer que cambia coordenadas.", "No", "Público", "No", "Perder los puntos.", "Usa Ver en el mapa o recarga filtros."),
        ("Zoom", "Zoom", "Acerca o aleja.", "Usa + y -.", "Acercar para leer.", "Zoom como evidencia de precisión.", "No", "Público", "No", "Esperar ubicación exacta.", "Respeta el modo de privacidad."),
        ("Marcador", "Marker", "Representa una ubicación permitida.", "Selecciona para abrir popup.", "Letra M para Moderado.", "Punto de registro oculto.", "Automático", "Público", "No", "Inferir coordenada restringida.", "Usa solo la información del popup."),
        ("Color y letra de riesgo", "Risk color and letter", "Distingue niveles con dos señales.", "Lee letra y leyenda.", "B, M, A, C.", "Usar solo color.", "Automático", "Público", "No", "Confundir C con categoría.", "Lee la leyenda."),
        ("Popup público", "Public popup", "Muestra número, título, categoría, estado, riesgo, procedencia y fecha.", "Abre un marcador.", "Registro 2 - ID 102.", "Esperar actor o comentario.", "No", "Público", "No", "Buscar evidencia interna.", "La superficie excluye campos privados."),
        ("Lista accesible", "Accessible list", "Permite consultar registros sin depender del mapa.", "Lee la lista debajo.", "Registro 1, categoría Agua.", "Usar coordenadas ocultas.", "Automático", "Público", "No", "Pensar que duplica datos.", "Es una alternativa accesible."),
        ("Atribución OpenStreetMap", "OpenStreetMap attribution", "Reconoce al proveedor cartográfico.", "Debe permanecer visible.", "© OpenStreetMap contributors.", "Eliminar atribución.", "Automático", "Público", "No", "Recortar la atribución en una captura.", "Inclúyela."),
        ("Ubicación exacta", "Exact location", "Muestra coordenada autorizada cuando no hay riesgo.", "Úsala solo con autorización.", "Punto público no sensible.", "Domicilio personal.", "Depende del dato", "Público si está autorizado", "Puede ser sensible.", "Publicar sin revisión.", "Prefiere aproximada."),
        ("Ubicación aproximada", "Approximate location", "Mueve o redondea el punto.", "Interprétala como zona general.", "Punto aproximado.", "Dirección exacta.", "Automático según registro", "Público", "No", "Tomarla como sitio exacto.", "Lee el modo."),
        ("Ubicación agregada", "Aggregate location", "Representa varios datos en zona general.", "Lee el modo agregado.", "Centro territorial.", "Evento exacto.", "Automático según registro", "Público", "No", "Inferir individuo.", "No reconstruyas coordenadas."),
        ("Ubicación oculta", "Hidden location", "Cuenta el registro sin mostrar punto.", "Lee la explicación.", "Registro 104 se cuenta y no tiene marcador.", "Buscar el punto por otros campos.", "Automático según registro", "Público", "Protege información sensible.", "Pensar que el mapa falla.", "La ausencia es intencional."),
    ]
    for card in map_cards:
        m.field_card(*card)

    m.h1("Contenido del PDF público")
    m.bullets(
        [
            "Portada, territorio, periodo y fecha.",
            "Índice y prólogo.",
            "Resumen territorial.",
            "Registros numerados e ID técnico.",
            "Lectura interpretativa factual.",
            "Señales metodológicas, no alertas reales.",
            "Mapa con ubicaciones autorizadas.",
            "Metodología, geoprivacidad, licencias y limitaciones.",
            "Pie institucional.",
        ]
    )
    m.p(
        "El PDF no contiene usuarios, contraseñas, actores, comentarios internos, auditoría completa, evidencia "
        "restringida ni coordenadas protegidas."
    )

    m.h1("CSV técnico y CSV para Excel")
    m.p("Un CSV es una tabla de datos que puede abrirse en Excel o utilizarse en análisis técnicos.")
    m.table(
        ["Columna técnica canónica", "Significado"],
        [
            ["observation_id", "Identificador técnico estable 101-106 para trazabilidad."],
            ["record_title", "Título controlado canónico conservado en inglés para interoperabilidad."],
            ["category", "Código estable de categoría."],
            ["review_status", "Estado de revisión."],
            ["risk_score", "Puntaje total 3-12."],
            ["risk_level", "low, moderate, high o critical."],
            ["data_provenance", "public_real, controlled_test o synthetic_demo."],
            ["observed_at_utc", "Fecha y hora ISO 8601 en UTC."],
            ["public_latitude", "Latitud solo cuando la geoprivacidad lo permite."],
            ["public_longitude", "Longitud solo cuando la geoprivacidad lo permite."],
            ["public_location_mode", "exact, approximate, aggregate o hidden."],
            ["methodology_version", "Versión climate-health-risk-v0.1."],
            ["public_record_number", "Número público secuencial 1-6; no reemplaza observation_id."],
            ["record_title_en", "Título público controlado en inglés."],
            ["record_title_es", "Título público controlado en español."],
        ],
        [48 * mm, 124 * mm],
    )
    m.h2("Encabezados de la descarga para Excel")
    m.table(
        ["Encabezado visible", "Uso"],
        [
            ["N.º público", "Número corto para presentación."],
            ["ID técnico", "Identificador estable para trazabilidad."],
            ["Nombre corto del registro", "Título localizado en español."],
            ["Categoría", "Tema territorial controlado."],
            ["Estado de revisión", "Pendiente, Validado, Observado o Rechazado."],
            ["Puntaje de riesgo", "Suma metodológica entre 3 y 12."],
            ["Nivel de riesgo", "Bajo, Moderado, Alto o Crítico."],
            ["Procedencia del dato", "Dato público real, Prueba controlada o Demo sintética."],
            ["Fecha observada UTC", "Fecha y hora ISO 8601."],
            ["Latitud pública", "Coordenada permitida o celda vacía."],
            ["Longitud pública", "Coordenada permitida o celda vacía."],
            ["Modo de ubicación pública", "Exacta, Aproximada, Agregada u Oculta."],
            ["Versión metodológica", "Identificador de la metodología utilizada."],
        ],
        [60 * mm, 112 * mm],
    )

    m.h1("Qué puede y qué no puede ver el público")
    m.table(
        ["Puede ver", "No puede ver"],
        [
            ["Conteos, indicadores, clima, categorías, riesgos y procedencia.", "Contraseñas, usuarios y sesiones."],
            ["Estados, ubicaciones permitidas, títulos y fechas públicas.", "Actores, comentarios y auditoría institucional."],
            ["PDF, CSV y diccionario autorizados.", "Evidencia restringida o coordenadas exactas protegidas."],
            ["Datos controlados identificados como tales.", "Datos clínicos o información identificable de niños."],
        ],
        [86 * mm, 86 * mm],
    )
    m.figure(
        "fig-19-publico-mobile-numerado.png",
        "Figura 8. Vista móvil a 390 px. Los módulos se apilan verticalmente sin cambiar permisos ni significado.",
    )

    m.h1("Errores frecuentes del Dashboard Público")
    m.table(
        ["Situación", "Qué hacer"],
        [
            ["Página no abre", "Comprueba versión local o URL HTTPS."],
            ["Mapa no carga", "Actualiza una vez y revisa red/atribución."],
            ["Clima no actualiza", "Espera; revisa si aparece fallback desactualizado."],
            ["Filtro no devuelve registros", "Limpia filtros y añade uno a la vez."],
            ["Mapa queda sin puntos", "Puede haber cero resultados o ubicaciones ocultas."],
            ["PDF no descarga", "Revisa selección, filtros y permisos de descarga."],
            ["CSV en una columna", "Usa CSV para Excel."],
            ["Tooltip permanece abierto", "Pulsa Escape, retira cursor o toca fuera."],
            ["Idioma no cambia", "Cambia selector y actualiza una vez."],
            ["No aparece un registro validado", "Validar internamente no publica automáticamente."],
            ["URL sin HTTPS visible", "El navegador puede ocultar el esquema; verifica la URL completa."],
            ["Local confundido con público", "Revisa 127.0.0.1 frente a workers.dev."],
            ["Caché antigua", "Presiona Ctrl+F5 una vez."],
            ["Cloudflare responde temporalmente con error", "Espera un minuto y reintenta una sola vez."],
            ["Open-Meteo no responde", "Usa el fallback solo si está marcado como desactualizado."],
        ],
        [68 * mm, 104 * mm],
    )
    add_live_demo(m)
    add_troubleshooting(m)
    return m


def numbered_items(manual: Manual) -> list[tuple]:
    numbered: list[tuple] = []
    chapter = 0
    section = 0
    for item in manual.items:
        kind = item[0]
        if kind == "h1":
            chapter += 1
            section = 0
            numbered.append(("h1", f"{chapter}. {item[1]}", f"chapter-{chapter}", 0))
        elif kind == "h2":
            section += 1
            numbered.append(
                ("h2", f"{chapter}.{section} {item[1]}", f"section-{chapter}-{section}", 1)
            )
        else:
            numbered.append(item)
    return numbered


def toc_entries(manual: Manual) -> list[tuple[int, str, str]]:
    return [
        (item[3], item[1], item[2])
        for item in numbered_items(manual)
        if item[0] in {"h1", "h2"}
    ]


def md_linkify(value: str) -> str:
    def replace_url(match: re.Match[str]) -> str:
        raw_url = match.group(1)
        url = raw_url.rstrip(".,;")
        return f"<{url}>{raw_url[len(url):]}"

    return re.sub(
        r"(?<![<(])(https?://[A-Za-z0-9][^\s|)]*)",
        replace_url,
        value,
    )


def md_escape(value: str) -> str:
    return md_linkify(value.replace("|", "\\|").replace("\n", "<br>"))


def write_markdown(manual: Manual) -> None:
    lines = [
        f"# {manual.title}",
        "",
        f"## {manual.subtitle}",
        "",
        f"**Producto:** InfinityAtlas Climate & Health MRV Toolkit  ",
        f"**Propiedad y operación:** INFINITYGAIA S.A.S. B.I.C.  ",
        f"**Versión del manual:** {DOCUMENT_VERSION}  ",
        f"**Fecha:** {CREATION_DATE}  ",
        f"**Commit documentado:** `{REFERENCE_COMMIT}`  ",
        f"**Rama:** `{BRANCH}`",
        "",
        "> Prototipo / prueba controlada - No constituye un piloto territorial validado.",
        "",
        "## Control documental",
        "",
        "| Versión | Fecha | Descripción del cambio | Preparado por | Aprobado por |",
        "| --- | --- | --- | --- | --- |",
        f"| {DOCUMENT_VERSION} | {CREATION_DATE} | {DOCUMENT_CHANGE} | "
        f"{DOCUMENT_PREPARED_BY} | {DOCUMENT_APPROVED_BY} |",
        "",
        '<a id="indice"></a>',
        "",
        "## Tabla de contenidos",
        "",
    ]
    for level, text, anchor in toc_entries(manual):
        prefix = "  - " if level == 1 else "- "
        lines.append(f"{prefix}[{text}](#{anchor})")
    lines += ["", "---", ""]

    for item in numbered_items(manual):
        kind = item[0]
        if kind == "h1":
            lines += [
                f'<a id="{item[2]}"></a>',
                "",
                f"# {item[1]}",
                "",
                "[Volver al índice](#indice)",
                "",
            ]
        elif kind == "h2":
            lines += [f'<a id="{item[2]}"></a>', "", f"## {item[1]}", ""]
        elif kind == "h3":
            lines += [f"### {item[1]}", ""]
        elif kind == "p":
            lines += [md_linkify(item[1]), ""]
        elif kind == "note":
            lines += [f"> **{item[1]}**  ", f"> {md_linkify(item[2])}", ""]
        elif kind == "bullets":
            lines += [f"- {md_linkify(value)}" for value in item[1]] + [""]
        elif kind == "steps":
            lines += [
                f"{index}. {md_linkify(value)}"
                for index, value in enumerate(item[1], 1)
            ] + [""]
        elif kind == "code":
            lines += ["```powershell", item[1], "```", ""]
        elif kind == "figure":
            lines += [f"![{item[2]}](images/{item[1]})", "", f"*{item[2]}*", ""]
        elif kind == "table":
            headers, rows = item[1], item[2]
            lines += [
                "| " + " | ".join(md_escape(v) for v in headers) + " |",
                "| " + " | ".join("---" for _ in headers) + " |",
            ]
            lines += ["| " + " | ".join(md_escape(v) for v in row) + " |" for row in rows]
            lines += [""]
        elif kind == "field":
            data = item[1]
            lines += [f"### Ficha: {data['Nombre exacto en español']}", "", "| Elemento | Explicación |", "| --- | --- |"]
            lines += [f"| {md_escape(key)} | {md_escape(value)} |" for key, value in data.items()]
            lines += [""]
        elif kind == "pagebreak":
            lines += ["<div style=\"page-break-after: always;\"></div>", ""]
    lines += [
        "---",
        "",
        "InfinityAtlas Climate & Health MRV Toolkit  ",
        "Propiedad y operación de INFINITYGAIA S.A.S. B.I.C.  ",
        "Prototipo / prueba controlada - No constituye un piloto territorial validado.",
        "",
    ]
    (OUT / manual.filename).write_text("\n".join(lines), encoding="utf-8")


def rich_text(value: str) -> str:
    value = value.replace("—", "-").replace("–", "-").replace("…", "...")
    parts: list[str] = []
    cursor = 0
    for match in re.finditer(r"https?://[A-Za-z0-9][^\s<>()]*", value):
        parts.append(escape(value[cursor:match.start()]))
        raw_url = match.group(0)
        url = raw_url.rstrip(".,;")
        trailing = raw_url[len(url):]
        escaped_url = escape(url, {'"': "&quot;"})
        parts.append(
            f'<link href="{escaped_url}" color="#087E83"><u>{escape(url)}</u></link>'
        )
        parts.append(escape(trailing))
        cursor = match.end()
    parts.append(escape(value[cursor:]))
    text = "".join(parts)
    text = text.replace("\n", "<br/>")
    text = re.sub(r"“([^”]+)”", r"<i>“\1”</i>", text)
    return text


class ManualDocTemplate(BaseDocTemplate):
    def __init__(self, filename, manual: Manual, **kwargs):
        super().__init__(filename, **kwargs)
        self.manual = manual
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates(PageTemplate(id="manual", frames=frame, onPage=self.draw_page))

    def afterFlowable(self, flowable):
        bookmark_name = getattr(flowable, "_bookmarkName", None)
        if not bookmark_name:
            return
        outline_text = getattr(flowable, "_outlineText", bookmark_name)
        outline_level = getattr(flowable, "_outlineLevel", 0)
        self.canv.bookmarkPage(bookmark_name)
        self.canv.addOutlineEntry(
            outline_text,
            bookmark_name,
            level=outline_level,
            closed=False,
        )
        if getattr(flowable, "_includeInToc", False):
            self.notify(
                "TOCEntry",
                (outline_level, outline_text, self.page, bookmark_name),
            )

    def draw_page(self, canvas, doc):
        canvas.saveState()
        page = canvas.getPageNumber()
        canvas.setStrokeColor(PETROL)
        canvas.setLineWidth(0.8)
        canvas.line(20 * mm, A4[1] - 16 * mm, A4[0] - 20 * mm, A4[1] - 16 * mm)
        canvas.setFont("Arial-Bold", 7.3)
        canvas.setFillColor(PETROL)
        canvas.drawString(20 * mm, A4[1] - 13 * mm, "InfinityAtlas")
        canvas.setFont("Arial", 7)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(A4[0] - 20 * mm, A4[1] - 13 * mm, self.manual.title)
        canvas.setStrokeColor(colors.HexColor("#9DB7C0"))
        canvas.line(20 * mm, 20 * mm, A4[0] - 20 * mm, 20 * mm)
        canvas.setFont("Arial", 6.5)
        canvas.setFillColor(DARK)
        canvas.drawCentredString(A4[0] / 2, 16 * mm, "InfinityAtlas Climate & Health MRV Toolkit")
        canvas.drawCentredString(A4[0] / 2, 12.7 * mm, "Propiedad y operación de INFINITYGAIA S.A.S. B.I.C.")
        canvas.setFillColor(MUTED)
        canvas.drawCentredString(A4[0] / 2, 9.4 * mm, "Prototipo / prueba controlada - No constituye un piloto territorial validado.")
        canvas.setFillColor(PETROL)
        canvas.drawRightString(A4[0] - 20 * mm, 12.7 * mm, f"Página {page}")
        canvas.restoreState()


def get_styles():
    sample = getSampleStyleSheet()
    return {
        "cover_title": ParagraphStyle(
            "cover_title", parent=sample["Title"], fontName="Arial-Bold", fontSize=26,
            leading=31, textColor=NAVY, alignment=TA_LEFT, spaceAfter=8,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", parent=sample["Normal"], fontName="Arial", fontSize=14,
            leading=19, textColor=PETROL, spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "h1", parent=sample["Heading1"], fontName="Arial-Bold", fontSize=18,
            leading=23, textColor=NAVY, spaceBefore=10, spaceAfter=9, keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "h2", parent=sample["Heading2"], fontName="Arial-Bold", fontSize=14,
            leading=18, textColor=PETROL, spaceBefore=9, spaceAfter=6, keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "h3", parent=sample["Heading3"], fontName="Arial-Bold", fontSize=11.5,
            leading=15, textColor=TEAL, spaceBefore=7, spaceAfter=5, keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "body", parent=sample["BodyText"], fontName="Arial", fontSize=9.1,
            leading=13.2, textColor=DARK, alignment=TA_JUSTIFY, spaceAfter=6,
        ),
        "body_left": ParagraphStyle(
            "body_left", parent=sample["BodyText"], fontName="Arial", fontSize=8.4,
            leading=11.5, textColor=DARK, alignment=TA_LEFT,
        ),
        "label": ParagraphStyle(
            "label", parent=sample["BodyText"], fontName="Arial-Bold", fontSize=8,
            leading=10.5, textColor=PETROL, alignment=TA_LEFT,
        ),
        "caption": ParagraphStyle(
            "caption", parent=sample["BodyText"], fontName="Arial-Italic", fontSize=7.8,
            leading=10.5, textColor=MUTED, alignment=TA_LEFT, spaceAfter=9,
        ),
        "note_title": ParagraphStyle(
            "note_title", parent=sample["BodyText"], fontName="Arial-Bold", fontSize=9,
            leading=12, textColor=NAVY,
        ),
        "code": ParagraphStyle(
            "code", parent=sample["Code"], fontName="Courier", fontSize=8.2,
            leading=11, textColor=NAVY, backColor=COOL, borderColor=colors.HexColor("#B8CCD3"),
            borderWidth=0.6, borderPadding=8, spaceBefore=4, spaceAfter=8,
        ),
        "back_link": ParagraphStyle(
            "back_link", parent=sample["BodyText"], fontName="Arial", fontSize=7.8,
            leading=10, textColor=TEAL, alignment=TA_LEFT, spaceAfter=7,
        ),
        "toc_level_0": ParagraphStyle(
            "toc_level_0", parent=sample["BodyText"], fontName="Arial-Bold", fontSize=9.2,
            leading=12.5, textColor=NAVY, leftIndent=0, firstLineIndent=0, spaceBefore=4,
        ),
        "toc_level_1": ParagraphStyle(
            "toc_level_1", parent=sample["BodyText"], fontName="Arial", fontSize=8.3,
            leading=11, textColor=PETROL, leftIndent=12 * mm, firstLineIndent=0, spaceBefore=2,
        ),
    }


def image_flowable(filename: str, max_width: float, max_height: float):
    path = IMAGES / filename
    with PILImage.open(path) as im:
        width, height = im.size
    scale = min(max_width / width, max_height / height)
    return Image(str(path), width=width * scale, height=height * scale)


def pdf_table(headers, rows, widths, styles):
    if widths is None:
        count = len(headers)
        widths = [172 * mm / count] * count
    data = [[Paragraph(f'<font color="#FFFFFF">{rich_text(v)}</font>', styles["label"]) for v in headers]]
    data += [[Paragraph(rich_text(str(v)), styles["body_left"]) for v in row] for row in rows]
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PETROL),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#B8CCD3")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F5F9FA")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def build_pdf(manual: Manual) -> None:
    styles = get_styles()
    pdf_path = OUT / manual.pdfname
    doc = ManualDocTemplate(
        str(pdf_path),
        manual,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=23 * mm,
        bottomMargin=25 * mm,
        title=f"{manual.title} - InfinityAtlas",
        author="INFINITYGAIA S.A.S. B.I.C.",
        subject=manual.subtitle,
    )
    story = []
    story.append(Spacer(1, 8 * mm))
    story.append(image_flowable(LOGO.name, 50 * mm, 35 * mm) if (IMAGES / LOGO.name).exists() else Image(str(LOGO), width=45 * mm, height=28 * mm))
    story.append(Spacer(1, 8 * mm))
    cover_title = Paragraph(rich_text(manual.title), styles["cover_title"])
    cover_title._bookmarkName = "portada"
    cover_title._outlineText = "Portada"
    cover_title._outlineLevel = 0
    cover_title._includeInToc = False
    story.append(cover_title)
    story.append(Paragraph(rich_text(manual.subtitle), styles["cover_sub"]))
    cover_rows = [
        ["Producto", "InfinityAtlas Climate & Health MRV Toolkit"],
        ["Audiencia", manual.audience],
        ["Versión del manual", DOCUMENT_VERSION],
        ["Fecha", CREATION_DATE],
        ["Commit documentado", REFERENCE_COMMIT],
        ["Propiedad y operación", "INFINITYGAIA S.A.S. B.I.C."],
    ]
    story.append(pdf_table(["Elemento", "Valor"], cover_rows, [48 * mm, 124 * mm], styles))
    story.append(Spacer(1, 9 * mm))
    note = Table(
        [[Paragraph("<b>Prototipo / prueba controlada</b><br/>No constituye un piloto territorial validado.", styles["body_left"])]],
        colWidths=[172 * mm],
    )
    note.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE_GOLD), ("BOX", (0, 0), (-1, -1), 1, GOLD), ("PADDING", (0, 0), (-1, -1), 10)]))
    story.append(note)
    story.append(PageBreak())

    control_heading = Paragraph("Control documental", styles["h1"])
    control_heading._bookmarkName = "control-documental"
    control_heading._outlineText = "Control documental"
    control_heading._outlineLevel = 0
    control_heading._includeInToc = False
    story.append(control_heading)
    story.append(
        pdf_table(
            ["Versión", "Fecha", "Descripción del cambio", "Preparado por", "Aprobado por"],
            [[
                DOCUMENT_VERSION,
                CREATION_DATE,
                DOCUMENT_CHANGE,
                DOCUMENT_PREPARED_BY,
                DOCUMENT_APPROVED_BY,
            ]],
            [28 * mm, 25 * mm, 51 * mm, 34 * mm, 34 * mm],
            styles,
        )
    )
    story.append(Spacer(1, 6 * mm))
    story.append(
        Paragraph(
            "Este documento conserva la versión 1.0 mientras permanece en revisión UAT. "
            "La aprobación final se registrará después de la revisión de Carlos y Nova.",
            styles["body"],
        )
    )
    story.append(PageBreak())

    index_heading = Paragraph("Tabla de contenidos", styles["h1"])
    index_heading._bookmarkName = "indice"
    index_heading._outlineText = "Tabla de contenidos"
    index_heading._outlineLevel = 0
    index_heading._includeInToc = False
    story.append(index_heading)
    toc = TableOfContents()
    toc.levelStyles = [styles["toc_level_0"], styles["toc_level_1"]]
    story.append(toc)
    story.append(PageBreak())

    for item in numbered_items(manual):
        kind = item[0]
        if kind == "h1":
            heading = Paragraph(rich_text(item[1]), styles["h1"])
            heading._bookmarkName = item[2]
            heading._outlineText = item[1]
            heading._outlineLevel = item[3]
            heading._includeInToc = True
            story.append(heading)
            story.append(
                Paragraph(
                    '<link href="#indice"><u>Volver al índice</u></link>',
                    styles["back_link"],
                )
            )
        elif kind == "h2":
            heading = Paragraph(rich_text(item[1]), styles["h2"])
            heading._bookmarkName = item[2]
            heading._outlineText = item[1]
            heading._outlineLevel = item[3]
            heading._includeInToc = True
            story.append(heading)
        elif kind == "h3":
            story.append(Paragraph(rich_text(item[1]), styles["h3"]))
        elif kind == "p":
            story.append(Paragraph(rich_text(item[1]), styles["body"]))
        elif kind == "note":
            table = Table(
                [[Paragraph(rich_text(item[1]), styles["note_title"])], [Paragraph(rich_text(item[2]), styles["body"])]],
                colWidths=[172 * mm],
            )
            table.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), COOL), ("BOX", (0, 0), (-1, -1), 0.8, TEAL), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
            story += [table, Spacer(1, 6)]
        elif kind == "bullets":
            for value in item[1]:
                story.append(Paragraph("- " + rich_text(value), styles["body"]))
        elif kind == "steps":
            for index, value in enumerate(item[1], 1):
                story.append(Paragraph(f"<b>{index}.</b> {rich_text(value)}", styles["body"]))
        elif kind == "code":
            story.append(Paragraph(rich_text(item[1]), styles["code"]))
        elif kind == "figure":
            story.append(image_flowable(item[1], 172 * mm, 130 * mm))
            story.append(Paragraph(rich_text(item[2]), styles["caption"]))
        elif kind == "table":
            story += [pdf_table(item[1], item[2], item[3], styles), Spacer(1, 8)]
        elif kind == "field":
            data = item[1]
            story.append(Paragraph("Ficha: " + rich_text(data["Nombre exacto en español"]), styles["h3"]))
            rows = [[key, value] for key, value in data.items()]
            story += [pdf_table(["Elemento", "Explicación"], rows, [58 * mm, 114 * mm], styles), Spacer(1, 8)]
        elif kind == "pagebreak":
            story.append(PageBreak())
    doc.multiBuild(story)


def copy_logo_for_manuals() -> None:
    target = IMAGES / LOGO.name
    if not target.exists():
        target.write_bytes(LOGO.read_bytes())


def build_readme(manuals: list[Manual], summaries: dict) -> None:
    lines = [
        "# Manuales oficiales de uso - InfinityAtlas",
        "",
        f"- Fecha de creación: {CREATION_DATE}",
        f"- Commit de referencia: `{REFERENCE_COMMIT}`",
        f"- Rama documentada: `{BRANCH}`",
        f"- Versión del sistema: {SYSTEM_VERSION}",
        f"- Versión documental: {DOCUMENT_VERSION}",
        f"- Estado: borradores locales para revisión de Carlos y Nova",
        "",
        "## Reproducción documental",
        "",
        "El generador versionado se encuentra en `../generate_infinityatlas_manuals.py`. "
        "Debe ejecutarse desde la raíz del repositorio con Python y las dependencias "
        "`Pillow`, `pypdf` y `reportlab`. Utiliza exclusivamente las figuras numeradas "
        "de `images/` y el logotipo oficial ya incluido en la aplicación.",
        "",
        "## Manuales",
        "",
        "| Manual | Fuente editable | PDF | Páginas | Campos explicados | SHA-256 |",
        "| --- | --- | --- | ---: | ---: | --- |",
    ]
    for manual in manuals:
        s = summaries[manual.pdfname]
        lines.append(
            f"| {manual.title} | `{manual.filename}` | `{manual.pdfname}` | {s['pages']} | "
            f"{manual.field_count} | `{s['sha256']}` |"
        )
    lines += ["", "## Capturas utilizadas", ""]
    for manual in manuals:
        lines.append(f"### {manual.title}")
        lines += [f"- `images/{name}`" for name in manual.figures]
        lines.append("")
    lines += [
        "## Limitaciones conocidas",
        "",
        "- Los manuales describen exactamente el commit de referencia y no inventan funciones futuras.",
        "- Los registros institucionales no se publican automáticamente en el Dashboard Público.",
        "- `demo-validator` permanece inactivo y oculto; la arquitectura del rol se conserva.",
        "- La evidencia institucional se registra mediante referencia URL en el flujo documentado.",
        "- La versión pública de Internet puede diferir de cambios locales que aún no hayan sido desplegados.",
        "- Open-Meteo puede fallar temporalmente; InfinityAtlas debe identificar el fallback como desactualizado.",
        "- Algunos datos históricos controlados conservan textos en inglés.",
        "- La interfaz visible normaliza el territorio como `San Cristóbal` sin modificar valores legacy de la base.",
        "- La cuenta `demo-admin` se presenta como `Demo Administrador` en español y `Demo Administrator` en inglés.",
        "- Los PDF incluyen tabla de contenidos, marcadores, enlaces internos y URLs web clicables.",
        "",
        "## Seguridad y confidencialidad",
        "",
        "Se verificó que los manuales y capturas no contienen contraseñas visibles, tokens, archivos `.env`, "
        "bases de datos, documentos UNICEF, información clínica ni datos personales. Las contraseñas aparecen "
        "ocultas visualmente y no se incluyen en Markdown, PDF o metadatos.",
        "",
        "Se modificó únicamente la capa de presentación local para normalizar `San Cristóbal` y el nombre visible "
        "del Administrador en español. No se modificaron arquitectura, permisos, bases de datos ni comportamiento "
        "funcional. No se realizó commit, push, merge, PR adicional, redeploy ni escritura en D1 remota.",
        "",
    ]
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    IMAGES.mkdir(parents=True, exist_ok=True)
    copy_logo_for_manuals()
    manuals = [build_monitor(), build_admin(), build_public()]
    summaries = {}
    for manual in manuals:
        write_markdown(manual)
        build_pdf(manual)
        pdf_path = OUT / manual.pdfname
        summaries[manual.pdfname] = {
            "pages": len(PdfReader(str(pdf_path)).pages),
            "sha256": hashlib.sha256(pdf_path.read_bytes()).hexdigest(),
            "figures": len(manual.figures),
            "fields": manual.field_count,
            "functions": manual.functions,
            "limitations": manual.limitations,
        }
    build_readme(manuals, summaries)
    (OUT / "generation-summary.json").write_text(
        json.dumps(
            {
                "reference_commit": REFERENCE_COMMIT,
                "branch": BRANCH,
                "manuals": summaries,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(json.dumps(summaries, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
