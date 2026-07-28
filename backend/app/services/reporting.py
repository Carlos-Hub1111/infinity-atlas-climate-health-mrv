"""Reproducible public and role-scoped PDF reporting."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ClimateData, User
from app.services.dashboard import (
    CATEGORIES,
    PROVENANCE_TYPES,
    RISK_LEVELS,
    STATUSES,
    DashboardFilters,
    build_dashboard,
    filtered_observations,
)

OWNER = "INFINITYGAIA S.A.S. B.I.C."
SOLUTION = "InfinityAtlas Climate & Health MRV Toolkit"
PROTOTYPE_NOTICE_EN = "Prototype / controlled test - Not a validated field pilot"
PROTOTYPE_NOTICE_ES = (
    "Prototipo / prueba controlada - No constituye un piloto territorial validado"
)

LABELS = {
    "en": {
        "report": "Territorial Intelligence Report",
        "public": "Public aggregate report",
        "internal": "Authorized internal report",
        "territory": "Territory",
        "period": "Consulted period",
        "generated": "Generated at",
        "report_id": "Report identifier",
        "executive": "Executive summary",
        "executive_body": (
            "This prototype report consolidates filter-consistent climate context, "
            "methodological review status, provenance and non-clinical risk indicators."
        ),
        "climate": "Climate conditions",
        "indicators": "Main indicators",
        "status": "Review status",
        "provenance": "Data provenance",
        "risk": "Methodological risk levels",
        "categories": "Observation categories",
        "records": "Authorized record list",
        "record_title": "Record title",
        "record_status": "Status",
        "record_risk": "Risk",
        "record_provenance": "Provenance",
        "record_observed": "Observed UTC",
        "methodology": "Methodology",
        "sources": "Sources, licenses and attribution",
        "limitations": "Limitations",
        "unavailable": "Not available",
        "total": "Total records",
        "map_note": (
            "A live geoprivacy-aware map is available in the application. A static tile image "
            "is intentionally omitted from this reproducible server report."
        ),
        "method_body": (
            "Risk Score = Hazard + Exposure + Vulnerability. Each component ranges from 1 to "
            "4. This is a transparent methodological prioritization score, not a clinical "
            "diagnosis and not independent verification that a territorial event occurred."
        ),
        "limits_body": (
            "Controlled tests and synthetic demonstrations are clearly labeled and must not be "
            "interpreted as validated territorial events. Public outputs omit actors, internal "
            "comments, restricted evidence, credentials and exact locations unless an explicit "
            "public exact-location mode is authorized."
        ),
        "notice": PROTOTYPE_NOTICE_EN,
    },
    "es": {
        "report": "Reporte de Inteligencia Territorial",
        "public": "Reporte público agregado",
        "internal": "Reporte interno autorizado",
        "territory": "Territorio",
        "period": "Periodo consultado",
        "generated": "Generado",
        "report_id": "Identificador del reporte",
        "executive": "Resumen ejecutivo",
        "executive_body": (
            "Este reporte del prototipo consolida contexto climático, estado de revisión "
            "metodológica, procedencia e indicadores de riesgo no clínico consistentes con "
            "los filtros aplicados."
        ),
        "climate": "Condiciones climáticas",
        "indicators": "Indicadores principales",
        "status": "Estado de revisión",
        "provenance": "Procedencia de los datos",
        "risk": "Niveles de riesgo metodológico",
        "categories": "Categorías de observación",
        "records": "Listado autorizado de registros",
        "record_title": "Nombre del registro",
        "record_status": "Estado",
        "record_risk": "Riesgo",
        "record_provenance": "Procedencia",
        "record_observed": "Observado UTC",
        "methodology": "Metodología",
        "sources": "Fuentes, licencias y atribuciones",
        "limitations": "Limitaciones",
        "unavailable": "No disponible",
        "total": "Registros totales",
        "map_note": (
            "La aplicación incluye un mapa en vivo con privacidad geográfica. La imagen "
            "cartográfica estática se omite deliberadamente de este reporte reproducible."
        ),
        "method_body": (
            "Puntaje de riesgo = Peligro + Exposición + Vulnerabilidad. Cada componente usa "
            "una escala de 1 a 4. Es un puntaje metodológico transparente de priorización, "
            "no un diagnóstico clínico ni una verificación independiente del evento territorial."
        ),
        "limits_body": (
            "Las pruebas controladas y demos sintéticas están etiquetadas y no deben "
            "interpretarse como eventos territoriales validados. Las salidas públicas omiten "
            "actores, comentarios internos, evidencia restringida, credenciales y ubicaciones "
            "exactas salvo autorización explícita del modo público exacto."
        ),
        "notice": PROTOTYPE_NOTICE_ES,
    },
}

VALUE_LABELS = {
    "en": {
        "pending": "Pending",
        "validated": "Validated",
        "observed": "Observed",
        "rejected": "Rejected",
        "public_real": "Public real data",
        "controlled_test": "Controlled test",
        "synthetic_demo": "Synthetic demo",
        "low": "Low",
        "moderate": "Moderate",
        "high": "High",
        "critical": "Critical",
        "water": "Water",
        "waste": "Waste",
        "heat": "Heat",
        "environmental_pollution": "Environmental pollution",
    },
    "es": {
        "pending": "Pendiente",
        "validated": "Validado",
        "observed": "Observado",
        "rejected": "Rechazado",
        "public_real": "Dato público real",
        "controlled_test": "Prueba controlada",
        "synthetic_demo": "Demo sintética",
        "low": "Bajo",
        "moderate": "Moderado",
        "high": "Alto",
        "critical": "Crítico",
        "water": "Agua",
        "waste": "Residuos",
        "heat": "Calor",
        "environmental_pollution": "Contaminación ambiental",
    },
}


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _report_identifier(kind: str, filters: DashboardFilters, generated_at: datetime) -> str:
    fingerprint = hashlib.sha256(
        repr(sorted(filters.public_dict().items())).encode("utf-8")
    ).hexdigest()[:8].upper()
    return f"IA-{kind.upper()}-{generated_at:%Y%m%d-%H%M%S}-{fingerprint}"


def _counts_table(
    title: str,
    counts: dict[str, int],
    order: tuple[str, ...],
    styles,
    value_labels: dict[str, str],
):
    rows = [[Paragraph(f"<b>{title}</b>", styles["BodyText"]), ""]]
    rows.extend([[value_labels[item], counts.get(item, 0)] for item in order])
    table = Table(rows, colWidths=[105 * mm, 35 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E5F1F0")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#003B49")),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#AEBCC0")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _page_footer(canvas, document, report_id: str) -> None:
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#AEBCC0"))
    canvas.line(18 * mm, 14 * mm, 192 * mm, 14 * mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#53656B"))
    canvas.drawString(18 * mm, 9 * mm, report_id)
    canvas.drawRightString(192 * mm, 9 * mm, f"Page {document.page}")
    canvas.restoreState()


def build_report_pdf(
    db: Session,
    filters: DashboardFilters,
    *,
    locale: str,
    user: User | None = None,
) -> tuple[bytes, str]:
    language = "es" if locale == "es" else "en"
    labels = LABELS[language]
    value_labels = VALUE_LABELS[language]
    generated_at = datetime.now(timezone.utc)
    kind = "internal" if user is not None else "public"
    report_id = _report_identifier(kind, filters, generated_at)
    dashboard = build_dashboard(db, filters, user=user)
    territory = dashboard["territory"]

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CoverTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=27,
            textColor=colors.HexColor("#003B49"),
            alignment=TA_CENTER,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Section",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#006D77"),
            spaceBefore=12,
            spaceAfter=7,
        )
    )
    output = BytesIO()
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title=f"{SOLUTION} - {labels['report']}",
        author=OWNER,
        subject=labels["notice"],
        pageCompression=0,
    )
    story = [
        Spacer(1, 28 * mm),
        Paragraph("InfinityAtlas", styles["CoverTitle"]),
        Paragraph(SOLUTION, styles["Heading2"]),
        Spacer(1, 8 * mm),
        Paragraph(labels["report"], styles["Title"]),
        Paragraph(labels[kind], styles["Heading3"]),
        Spacer(1, 8 * mm),
        Table(
            [
                [labels["territory"], territory["name"] if territory else labels["unavailable"]],
                [
                    labels["period"],
                    f"{dashboard['period']['start'] or '-'} - {dashboard['period']['end'] or '-'}",
                ],
                [labels["generated"], generated_at.isoformat()],
                [labels["report_id"], report_id],
                ["Owner / Propietaria", OWNER],
            ],
            colWidths=[48 * mm, 108 * mm],
            style=[
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#AEBCC0")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F6F6")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ],
        ),
        Spacer(1, 8 * mm),
        Paragraph(labels["notice"], styles["Heading3"]),
        PageBreak(),
        Paragraph(labels["executive"], styles["Section"]),
        Paragraph(labels["executive_body"], styles["BodyText"]),
        Spacer(1, 4 * mm),
        Table(
            [
                [labels["total"], dashboard["total_observations"]],
                ["Methodology / Metodología", dashboard["methodology_version"]],
                [
                    "Timezone / Zona horaria",
                    territory["timezone"] if territory else "UTC",
                ],
            ],
            colWidths=[72 * mm, 68 * mm],
            style=[
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#AEBCC0")),
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F1F6F6")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ],
        ),
    ]

    climate = None
    if territory:
        climate = db.scalar(
            select(ClimateData)
            .where(ClimateData.territory_id == territory["id"])
            .order_by(ClimateData.observed_at.desc(), ClimateData.id.desc())
        )
    story.extend([Paragraph(labels["climate"], styles["Section"])])
    if climate:
        story.append(
            Table(
                [
                    ["Source / Fuente", climate.source_name],
                    ["Observed / Observado", _utc(climate.observed_at).isoformat()],
                    ["Temperature / Temperatura", f"{climate.temperature_c} C"],
                    ["Humidity / Humedad", f"{climate.humidity_percent}%"],
                    ["Feels like / Sensación", f"{climate.apparent_temperature_c} C"],
                    ["Precipitation / Precipitación", f"{climate.precipitation_mm} mm"],
                ],
                colWidths=[62 * mm, 92 * mm],
                style=[
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#AEBCC0")),
                    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ],
            )
        )
    else:
        story.append(Paragraph(labels["unavailable"], styles["BodyText"]))

    story.extend(
        [
            Paragraph(labels["indicators"], styles["Section"]),
            _counts_table(
                labels["status"],
                dashboard["status_counts"],
                STATUSES,
                styles,
                value_labels,
            ),
            Spacer(1, 3 * mm),
            _counts_table(
                labels["provenance"],
                dashboard["provenance_counts"],
                PROVENANCE_TYPES,
                styles,
                value_labels,
            ),
            Spacer(1, 3 * mm),
            _counts_table(
                labels["risk"],
                dashboard["risk_counts"],
                RISK_LEVELS,
                styles,
                value_labels,
            ),
            Spacer(1, 3 * mm),
            _counts_table(
                labels["categories"],
                dashboard["category_counts"],
                CATEGORIES,
                styles,
                value_labels,
            ),
            Paragraph("Map / Mapa", styles["Section"]),
            Paragraph(labels["map_note"], styles["BodyText"]),
        ]
    )

    if user is not None:
        observations, risks = filtered_observations(db, filters, user=user)
        rows = [[
            "ID",
            labels["record_title"],
            labels["record_status"],
            labels["record_risk"],
            labels["record_provenance"],
            labels["record_observed"],
        ]]
        for observation in observations:
            risk = risks.get(observation.id)
            rows.append(
                [
                    f"#{observation.id}",
                    observation.record_title,
                    value_labels[observation.status],
                    (
                        f"{risk.risk_score} / {value_labels[risk.risk_level]}"
                        if risk
                        else "-"
                    ),
                    value_labels[observation.data_provenance],
                    _utc(observation.observed_at).isoformat(),
                ]
            )
        story.extend(
            [
                Paragraph(labels["records"], styles["Section"]),
                Table(
                    rows or [["-"]],
                    repeatRows=1,
                    colWidths=[12 * mm, 48 * mm, 20 * mm, 24 * mm, 28 * mm, 39 * mm],
                    style=[
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#003B49")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#AEBCC0")),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 6.5),
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ],
                ),
            ]
        )

    story.extend(
        [
            Paragraph(labels["methodology"], styles["Section"]),
            Paragraph(labels["method_body"], styles["BodyText"]),
            Paragraph(labels["sources"], styles["Section"]),
            Paragraph(
                "Open-Meteo Weather Forecast API - CC BY 4.0. "
                "Map data (c) OpenStreetMap contributors. Leaflet - BSD-2-Clause. "
                "Recharts - MIT. ReportLab - BSD.",
                styles["BodyText"],
            ),
            Paragraph(labels["limitations"], styles["Section"]),
            Paragraph(labels["limits_body"], styles["BodyText"]),
            Spacer(1, 6 * mm),
            Paragraph(labels["notice"], styles["Heading3"]),
        ]
    )
    document.build(
        story,
        onFirstPage=lambda canvas, doc: _page_footer(canvas, doc, report_id),
        onLaterPages=lambda canvas, doc: _page_footer(canvas, doc, report_id),
    )
    return output.getvalue(), report_id
