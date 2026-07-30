"use client";

import React from "react";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CloudSun,
  Download,
  Droplets,
  Eraser,
  FileSpreadsheet,
  Filter,
  Gauge,
  Info,
  Languages,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Thermometer,
} from "lucide-react";
import {
  localizedRecordTitle,
  publicLocationModeLabels,
  publicRecordReference,
} from "../lib/public-content";

type Locale = "en" | "es";
type DonutDimension = "status" | "risk" | "provenance" | "category";
type Filters = {
  date_from: string;
  date_to: string;
  category: string;
  status: string;
  provenance: string;
  risk_level: string;
  search: string;
};
type RecordItem = {
  id: number;
  public_number: number;
  record_title: string;
  category: string;
  status: string;
  data_provenance: string;
  risk_score: number;
  risk_level: string;
  observed_at: string;
  latitude: number | null;
  longitude: number | null;
  public_location_mode: string;
};
type DashboardData = {
  generated_at: string;
  territory: { name: string; province: string; country: string; timezone: string };
  period: { start: string | null; end: string | null };
  active_filter_count: number;
  total_available: number;
  total: number;
  status: Record<string, number>;
  provenance: Record<string, number>;
  risk: Record<string, number>;
  categories: Record<string, number>;
  trends: Array<{
    date: string;
    value: number;
    categories: string[];
    risk_levels: string[];
  }>;
  observations: RecordItem[];
  methodology_version: string;
  prototype_notice: string;
};
type Climate = {
  source_name: string;
  source_url: string;
  observed_at: string;
  retrieved_at: string;
  stored_retrieved_at?: string;
  temperature_c: number;
  relative_humidity_percent: number;
  apparent_temperature_c: number;
  precipitation_mm: number;
  weather_code: number;
  is_stale: boolean;
  license: string;
};

const emptyFilters: Filters = {
  date_from: "",
  date_to: "",
  category: "",
  status: "",
  provenance: "",
  risk_level: "",
  search: "",
};

const copy = {
  en: {
    language: "Language",
    eyebrow: "Controlled public demonstration · San Cristóbal",
    title: "InfinityAtlas",
    product: "Climate & Health MRV Toolkit",
    identity: "Territorial intelligence, traceability and trusted impact data.",
    notice: "Prototype / controlled test — Not a validated field pilot",
    api: "Public API available",
    apiDown: "Public API unavailable",
    updated: "Updated",
    period: "Consulted period",
    timezone: "Territory timezone",
    dataSource: "Data source",
    dataSourceValue: "Controlled demonstration base in Cloudflare D1",
    d1HelpLabel: "What Cloudflare D1 means in this demonstration",
    d1Help: "Cloudflare D1 is the separate public database used by this read-only demonstration. It contains only controlled public observations and no internal users, evidence, comments or audit data.",
    territory: "Territory",
    territoryShort: "San Cristóbal, Galapagos",
    filters: "Global filters",
    filterHelpLabel: "How public filters work",
    filterHelp: "Filters apply together to the indicators, visualizations, map, public results, PDF and technical CSV. Applying them also preserves the selection in the page URL.",
    activeFiltersTitle: "Active filters",
    noActiveFilters: "No filters applied",
    from: "From date",
    to: "To date",
    category: "Category",
    status: "Review status",
    provenance: "Data provenance",
    risk: "Risk level",
    search: "Record number or title",
    all: "All",
    apply: "Apply filters",
    clear: "Clear filters",
    active: "active filters",
    loading: "Loading public data",
    indicators: "Main indicators",
    total: "Total records",
    climate: "Current climate context",
    refresh: "Refresh climate",
    refreshing: "Updating climate…",
    climateError: "Climate source is temporarily unavailable.",
    climateStart: "Climate update started.",
    climateSuccess: "Climate updated successfully.",
    climateFailure: "Climate update failed.",
    climateNoChange: "Query completed. Open-Meteo remains in the same observation interval, so the values did not change.",
    providerObserved: "Observed by provider",
    atlasQueried: "Last InfinityAtlas query",
    climateCurrent: "Current provider response",
    climateStale: "Stored real observation · Provider temporarily unavailable",
    openMeteoAbout: "Learn about the Open-Meteo source",
    openMeteoJson: "View technical JSON response",
    jsonHelpLabel: "What a technical JSON response means",
    jsonHelp: "JSON is a structured, machine-readable response containing the exact values returned by the provider. The reproducible URL remains visible for technical audit.",
    temperature: "Temperature",
    humidity: "Humidity",
    feels: "Feels like",
    rain: "Precipitation",
    weather: "Weather code",
    charts: {
      status: "Distribution by review status",
      risk: "Distribution by risk level",
      category: "Records by category",
      provenance: "Data provenance",
      trend: "Records observed by date",
    },
    chartHelp: "Values are calculated by the public API and reflect the active filters.",
    chartHelps: {
      status: "Groups records by their current methodological review state: pending, validated, observed or rejected.",
      risk: "Groups records by the methodological risk band calculated from Hazard + Exposure + Vulnerability. It is not a clinical classification.",
      category: "Shows how many records belong to each controlled territorial observation category.",
      provenance: "Shows whether records come from public real data, a controlled test or a synthetic demonstration.",
    },
    trendHelp: "This chart measures the volume of public records by observation date. It does not show clinical evolution or risk intensity.",
    trendBarHelp: "Each bar represents an observation date. The number above it is the count of public records observed on that date.",
    trendNoPattern: "The sample contains one record per date and does not allow a temporal trend to be identified.",
    donutTitle: "Complementary distribution",
    donutDimension: "Distribution dimension",
    donutHelp: "Select one dimension at a time. Counts and percentages reflect the active filters.",
    donutOptions: {
      status: "Review status",
      risk: "Risk level",
      provenance: "Data provenance",
      category: "Category",
    },
    quantitySingular: "record",
    quantity: "records",
    percentage: "of filtered records",
    selectionReading: "Selection reading",
    selectionEmpty: "There are no records in the current selection.",
    selectionAggregate: "Aggregate view of {count} records. The largest {dimension} group is {label}, with {value} records ({percentage}%).",
    selectionMultiple: "The filtered selection contains {count} records. Its largest {dimension} group is {label}, with {value} records ({percentage}%).",
    selectionSingle: "{reference}: {category}; {status}; risk {score} · {risk}; {provenance}.",
    controlledSelectionNotice: "This selection includes controlled or synthetic records. It must not be interpreted as a verified territorial event.",
    riskDemoNotice: "Risk levels belong to a controlled demonstration. High or critical values do not represent a real territorial emergency.",
    territorialReading: "Complementary territorial reading",
    territorialReadingHelp: "A factual summary of the active public selection. Predominance means the group with the largest record count and does not imply causality, severity or territorial representativeness.",
    territorialReadingCount: "Records in selection",
    territorialReadingCategory: "Predominant category",
    territorialReadingRisk: "Predominant risk level",
    territorialReadingProvenance: "Predominant data provenance",
    territorialReadingEmpty: "No predominant group can be identified because the current selection contains no records.",
    territorialReadingNotice: "Methodological reading of controlled public data. It is not a clinical diagnosis and does not independently verify a territorial event.",
    map: "Territorial map",
    mapHelp: "Only safe controlled, approximate or aggregate locations are shown.",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    visible: "visible locations",
    hidden: "Location hidden",
    hiddenExplanation: "This record uses hidden public location mode. InfinityAtlas does not expose or reconstruct its restricted coordinates.",
    mapEmpty: "The map remains available, but no public records match the active filters.",
    mapMultiple: "The map is fitted to all visible public locations in the current selection.",
    mapSingle: "The map is centered on the only visible public location in the selection.",
    mapFocused: "The map is centered on the selected public record.",
    noData: "No data matches the active filters.",
    results: "Filtered results",
    resultsHelp: "Only safe public fields are included. Internal evidence, actors, comments and restricted coordinates are excluded.",
    showingRecords: "{shown} of {total} records",
    select: "Select",
    selectAll: "Select all visible records",
    selectRecord: "Select record {id}",
    selectedCount: "{count} selected",
    selectedCountSingular: "1 selected",
    selectedDownloadHelp: "PDF and CSV downloads will contain only the manually selected records.",
    clearSelection: "Clear selection",
    record: "Record",
    publicNumber: "Public No.",
    technicalId: "Technical ID",
    recordTitle: "Title",
    observedDate: "Observed date",
    locationMode: "Location mode",
    actions: "Actions",
    viewOnMap: "View on map",
    pdfRecord: "Download report PDF for this record",
    pdfSelection: "Download report PDF for this selection",
    excelRecord: "Download Excel CSV for this record",
    excelSelection: "Download Excel CSV for this selection",
    technicalCsvRecord: "Download interoperable technical CSV for this record",
    technicalCsvSelection: "Download interoperable technical CSV for this selection",
    csvHelpLabel: "How to use the technical CSV",
    csvHelp: "The interoperable UTF-8 CSV uses commas and stable machine column names for Power BI, GIS, audit and data integration. The Excel version uses semicolons, a UTF-8 BOM and readable Spanish headers.",
    dataDictionary: "Open public data dictionary",
    method: "Risk Score = Hazard + Exposure + Vulnerability. Methodological, not clinical.",
    source: "Weather data by Open-Meteo.com · CC BY 4.0",
    mapSource: "Map data © OpenStreetMap contributors",
    owner: "Owned by INFINITYGAIA S.A.S. B.I.C.",
    categories: {
      water: "Water",
      waste: "Waste",
      heat: "Heat",
      environmental_pollution: "Environmental pollution",
    },
    statuses: {
      pending: "Pending",
      validated: "Validated",
      observed: "Observed",
      rejected: "Rejected",
    },
    statusHelpLabel: "More information about {status}",
    statusHelp: {
      pending: "Record received and not yet reviewed by an authorized person.",
      validated: "Record methodologically reviewed and considered complete. It does not by itself confirm that the event occurred.",
      observed: "Reviewed record that needs clarification, correction or additional evidence.",
      rejected: "Record that did not meet the minimum quality or evidence requirements for validation.",
    },
    provenances: {
      public_real: "Public real data",
      controlled_test: "Controlled test",
      synthetic_demo: "Synthetic demo",
    },
    provenanceHelpLabel: "More information about {provenance}",
    provenanceHelp: {
      public_real: "Data obtained from an identified and verifiable public source. Its provenance must remain visible.",
      controlled_test: "Record created during a controlled prototype test. It does not represent a validated territorial event.",
      synthetic_demo: "Fictitious data created only for demonstration or testing. It must never be interpreted as real data.",
    },
    risks: { low: "Low", moderate: "Moderate", high: "High", critical: "Critical" },
    riskHelpLabel: "More information about {level} risk",
    riskHelp: {
      low: "Methodological score from 3 to 5. It is not a clinical assessment.",
      moderate: "Methodological score from 6 to 8. It is not a clinical assessment.",
      high: "Methodological score from 9 to 10. It is not a clinical assessment.",
      critical: "Methodological score from 11 to 12. It is not a clinical assessment.",
    },
    riskFormulaHelpLabel: "How the methodological risk score is calculated",
  },
  es: {
    language: "Idioma",
    eyebrow: "Demostración pública controlada · San Cristóbal",
    title: "InfinityAtlas",
    product: "Climate & Health MRV Toolkit",
    identity: "Inteligencia territorial, trazabilidad y datos de impacto confiables.",
    notice: "Prototipo / prueba controlada — No constituye un piloto territorial validado",
    api: "API pública disponible",
    apiDown: "API pública no disponible",
    updated: "Actualizado",
    period: "Periodo consultado",
    timezone: "Zona horaria territorial",
    dataSource: "Fuente de datos",
    dataSourceValue: "Base demostrativa controlada en Cloudflare D1",
    d1HelpLabel: "Qué significa Cloudflare D1 en esta demostración",
    d1Help: "Cloudflare D1 es la base pública separada que utiliza esta demostración de solo lectura. Contiene únicamente observaciones públicas controladas y no incluye usuarios internos, evidencia, comentarios ni auditoría.",
    territory: "Territorio",
    territoryShort: "San Cristóbal, Galápagos",
    filters: "Filtros globales",
    filterHelpLabel: "Cómo funcionan los filtros públicos",
    filterHelp: "Los filtros se aplican conjuntamente a indicadores, visualizaciones, mapa, resultados públicos, PDF y CSV técnico. Al aplicarlos, la selección también queda preservada en la URL.",
    activeFiltersTitle: "Filtros activos",
    noActiveFilters: "Sin filtros aplicados",
    from: "Fecha desde",
    to: "Fecha hasta",
    category: "Categoría",
    status: "Estado de revisión",
    provenance: "Procedencia del dato",
    risk: "Nivel de riesgo",
    search: "Número o nombre del registro",
    all: "Todos",
    apply: "Aplicar filtros",
    clear: "Limpiar filtros",
    active: "filtros activos",
    loading: "Cargando datos públicos",
    indicators: "Indicadores principales",
    total: "Registros totales",
    climate: "Contexto climático actual",
    refresh: "Actualizar clima",
    refreshing: "Actualizando clima…",
    climateError: "La fuente climática no está disponible temporalmente.",
    climateStart: "Actualización climática iniciada.",
    climateSuccess: "Clima actualizado correctamente.",
    climateFailure: "No se pudo actualizar el clima.",
    climateNoChange: "La consulta terminó. Open-Meteo mantiene el mismo intervalo observado, por lo que los valores no cambiaron.",
    providerObserved: "Observado por el proveedor",
    atlasQueried: "Última consulta de InfinityAtlas",
    climateCurrent: "Respuesta actual del proveedor",
    climateStale: "Observación real almacenada · Proveedor temporalmente no disponible",
    openMeteoAbout: "Conocer la fuente Open-Meteo",
    openMeteoJson: "Ver respuesta técnica JSON",
    jsonHelpLabel: "Qué significa una respuesta técnica JSON",
    jsonHelp: "JSON es una respuesta estructurada y legible por máquinas que contiene los valores exactos entregados por el proveedor. La URL reproducible se mantiene visible para auditoría técnica.",
    temperature: "Temperatura",
    humidity: "Humedad",
    feels: "Sensación térmica",
    rain: "Precipitación",
    weather: "Código meteorológico",
    charts: {
      status: "Distribución por estado de revisión",
      risk: "Distribución por nivel de riesgo",
      category: "Registros por categoría",
      provenance: "Procedencia de los datos",
      trend: "Registros observados por fecha",
    },
    chartHelp: "Los valores son calculados por la API pública y reflejan los filtros activos.",
    chartHelps: {
      status: "Agrupa los registros por su estado actual de revisión metodológica: pendiente, validado, observado o rechazado.",
      risk: "Agrupa los registros por el nivel metodológico calculado mediante Peligro + Exposición + Vulnerabilidad. No es una clasificación clínica.",
      category: "Muestra cuántos registros pertenecen a cada categoría controlada de observación territorial.",
      provenance: "Muestra si los registros proceden de un dato público real, una prueba controlada o una demostración sintética.",
    },
    trendHelp: "Este gráfico mide el volumen de registros públicos por fecha de observación. No representa evolución clínica ni intensidad del riesgo.",
    trendBarHelp: "Cada barra representa una fecha de observación. El número superior indica cuántos registros públicos fueron observados en esa fecha.",
    trendNoPattern: "La muestra contiene un registro por fecha y no permite identificar una tendencia temporal.",
    donutTitle: "Distribución complementaria",
    donutDimension: "Dimensión de distribución",
    donutHelp: "Seleccione una dimensión a la vez. Las cantidades y porcentajes reflejan los filtros activos.",
    donutOptions: {
      status: "Estado de revisión",
      risk: "Nivel de riesgo",
      provenance: "Procedencia del dato",
      category: "Categoría",
    },
    quantitySingular: "registro",
    quantity: "registros",
    percentage: "de los registros filtrados",
    selectionReading: "Lectura de la selección",
    selectionEmpty: "No existen registros en la selección actual.",
    selectionAggregate: "Lectura agregada de {count} registros. El grupo más numeroso de {dimension} es {label}, con {value} registros ({percentage}%).",
    selectionMultiple: "La selección filtrada contiene {count} registros. El grupo más numeroso de {dimension} es {label}, con {value} registros ({percentage}%).",
    selectionSingle: "{reference}: {category}; {status}; riesgo {score} · {risk}; {provenance}.",
    controlledSelectionNotice: "Esta selección incluye registros controlados o sintéticos. No debe interpretarse como un evento territorial verificado.",
    riskDemoNotice: "Los niveles de riesgo pertenecen a una demostración controlada. Los valores altos o críticos no representan una emergencia territorial real.",
    territorialReading: "Lectura territorial complementaria",
    territorialReadingHelp: "Resumen factual de la selección pública activa. La predominancia indica el grupo con mayor cantidad de registros y no implica causalidad, gravedad ni representatividad territorial.",
    territorialReadingCount: "Registros en la selección",
    territorialReadingCategory: "Categoría predominante",
    territorialReadingRisk: "Nivel de riesgo predominante",
    territorialReadingProvenance: "Procedencia predominante",
    territorialReadingEmpty: "No es posible identificar un grupo predominante porque la selección actual no contiene registros.",
    territorialReadingNotice: "Lectura metodológica de datos públicos controlados. No constituye un diagnóstico clínico ni verifica por sí sola un evento territorial.",
    map: "Mapa territorial",
    mapHelp: "Solo se muestran ubicaciones seguras controladas, aproximadas o agregadas.",
    zoomIn: "Acercar",
    zoomOut: "Alejar",
    visible: "ubicaciones visibles",
    hidden: "Ubicación oculta",
    hiddenExplanation: "Este registro utiliza el modo de ubicación pública oculta. InfinityAtlas no expone ni reconstruye sus coordenadas restringidas.",
    mapEmpty: "El mapa permanece disponible, pero ningún registro público coincide con los filtros activos.",
    mapMultiple: "El mapa está ajustado a todas las ubicaciones públicas visibles de la selección.",
    mapSingle: "El mapa está centrado en la única ubicación pública visible de la selección.",
    mapFocused: "El mapa está centrado en el registro público seleccionado.",
    noData: "Ningún dato coincide con los filtros activos.",
    results: "Resultados filtrados",
    resultsHelp: "Solo se incluyen campos públicos seguros. Se excluyen evidencia interna, actores, comentarios y coordenadas restringidas.",
    showingRecords: "{shown} de {total} registros",
    select: "Seleccionar",
    selectAll: "Seleccionar todos los registros visibles",
    selectRecord: "Seleccionar el registro {id}",
    selectedCount: "{count} seleccionados",
    selectedCountSingular: "1 seleccionado",
    selectedDownloadHelp: "Las descargas PDF y CSV contendrán únicamente los registros seleccionados manualmente.",
    clearSelection: "Limpiar selección",
    record: "Registro",
    publicNumber: "N.º público",
    technicalId: "ID técnico",
    recordTitle: "Título",
    observedDate: "Fecha observada",
    locationMode: "Modo de ubicación",
    actions: "Acciones",
    viewOnMap: "Ver en el mapa",
    pdfRecord: "Descargar reporte PDF del registro",
    pdfSelection: "Descargar reporte PDF de la selección",
    excelRecord: "Descargar CSV para Excel del registro",
    excelSelection: "Descargar CSV para Excel de la selección",
    technicalCsvRecord: "Descargar CSV técnico interoperable del registro",
    technicalCsvSelection: "Descargar CSV técnico interoperable de la selección",
    csvHelpLabel: "Cómo utilizar el CSV técnico",
    csvHelp: "El CSV interoperable UTF-8 usa comas y nombres de máquina estables para Power BI, GIS, auditoría e integración. La versión para Excel usa punto y coma, BOM UTF-8 y encabezados comprensibles en español.",
    dataDictionary: "Abrir diccionario público de datos",
    method: "Puntaje de riesgo = Peligro + Exposición + Vulnerabilidad. Metodológico, no clínico.",
    source: "Datos meteorológicos de Open-Meteo.com · CC BY 4.0",
    mapSource: "Datos del mapa © colaboradores de OpenStreetMap",
    owner: "Propiedad de INFINITYGAIA S.A.S. B.I.C.",
    categories: {
      water: "Agua",
      waste: "Residuos",
      heat: "Calor",
      environmental_pollution: "Contaminación ambiental",
    },
    statuses: {
      pending: "Pendiente",
      validated: "Validado",
      observed: "Observado",
      rejected: "Rechazado",
    },
    statusHelpLabel: "Más información sobre {status}",
    statusHelp: {
      pending: "Registro recibido y aún no revisado por una persona autorizada.",
      validated: "Registro revisado metodológicamente y considerado completo. No confirma por sí solo que el evento ocurrió.",
      observed: "Registro revisado que necesita aclaraciones, correcciones o evidencia adicional.",
      rejected: "Registro que no cumplió los requisitos mínimos de calidad o evidencia para ser validado.",
    },
    provenances: {
      public_real: "Dato público real",
      controlled_test: "Prueba controlada",
      synthetic_demo: "Demo sintética",
    },
    provenanceHelpLabel: "Más información sobre {provenance}",
    provenanceHelp: {
      public_real: "Dato obtenido de una fuente pública identificada y verificable. Su procedencia debe mantenerse visible.",
      controlled_test: "Registro creado durante una prueba controlada del prototipo. No representa un evento territorial validado.",
      synthetic_demo: "Dato ficticio creado únicamente para demostración o pruebas. Nunca debe interpretarse como un dato real.",
    },
    risks: { low: "Bajo", moderate: "Moderado", high: "Alto", critical: "Crítico" },
    riskHelpLabel: "Más información sobre riesgo {level}",
    riskHelp: {
      low: "Puntaje metodológico de 3 a 5. No constituye una evaluación clínica.",
      moderate: "Puntaje metodológico de 6 a 8. No constituye una evaluación clínica.",
      high: "Puntaje metodológico de 9 a 10. No constituye una evaluación clínica.",
      critical: "Puntaje metodológico de 11 a 12. No constituye una evaluación clínica.",
    },
    riskFormulaHelpLabel: "Cómo se calcula el puntaje metodológico de riesgo",
  },
} as const;

const colors: Record<string, string> = {
  pending: "#64747a",
  validated: "#2f7d56",
  observed: "#ad7712",
  rejected: "#ac433d",
  low: "#2f7d56",
  moderate: "#c18a1c",
  high: "#ce6533",
  critical: "#9e3038",
  public_real: "#277b71",
  controlled_test: "#3979a4",
  synthetic_demo: "#9b5b25",
  water: "#006d77",
  waste: "#62747a",
  heat: "#c45e36",
  environmental_pollution: "#934b62",
};

function query(filters: Filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  return params.toString();
}

function pageQuery(filters: Filters, locale: Locale) {
  const params = new URLSearchParams(query(filters));
  if (locale === "es") params.set("lang", "es");
  return params.toString();
}

function label(labels: Readonly<Record<string, string>>, key: string) {
  return labels[key] ?? key.replaceAll("_", " ");
}

function interpolate(template: string, token: string, value: string) {
  return template.replace(`{${token}}`, value);
}

function interpolateMany(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (result, [token, value]) =>
      result.replaceAll(`{${token}}`, String(value)),
    template,
  );
}

function formatDate(value: string, locale: Locale, withTime = false) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "medium" as const } : {}),
    timeZone: "Pacific/Galapagos",
  }).format(new Date(value));
}

function useDismissibleSelection() {
  const [activeKey, setActiveKey] = React.useState("");
  const rootRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        activeKey &&
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setActiveKey("");
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [activeKey]);

  const closeWhenFocusLeaves = (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setActiveKey("");
    }
  };

  return {
    activeKey,
    setActiveKey,
    rootRef,
    rootProps: {
      onMouseLeave: () => setActiveKey(""),
      onBlur: closeWhenFocusLeaves,
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape") {
          setActiveKey("");
          (event.target as HTMLElement).blur();
        }
      },
    },
  };
}

function InfoTooltip({ labelText, text }: { labelText: string; text: string }) {
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  const tooltipId = React.useId();
  const open = hovered || focused || pinned;

  return (
    <span
      className="infoTooltip"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
          setPinned(false);
        }
      }}
    >
      <button
        type="button"
        className="infoTooltipButton"
        aria-label={labelText}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={(event) => {
          if (pinned) {
            setPinned(false);
            setFocused(false);
            event.currentTarget.blur();
          } else {
            setPinned(true);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setHovered(false);
            setFocused(false);
            setPinned(false);
            event.currentTarget.blur();
          }
        }}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      {open && (
        <span className="infoTooltipContent" id={tooltipId} role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}

function Metric({
  value,
  labelText,
  tone,
  help,
}: {
  value: number;
  labelText: string;
  tone: string;
  help?: { labelText: string; text: string };
}) {
  return (
    <div className="metric" style={{ borderTopColor: colors[tone] ?? "#003b49" }}>
      <strong>{value}</strong>
      <div className="metricLabel">
        <span>{labelText}</span>
        {help && <InfoTooltip labelText={help.labelText} text={help.text} />}
      </div>
    </div>
  );
}

function BarGroup({
  title,
  values,
  labels,
  help,
  titleHelp,
}: {
  title: string;
  values: Record<string, number>;
  labels: Record<string, string>;
  help: string;
  titleHelp?: { labelText: string; text: string };
}) {
  const { activeKey, setActiveKey, rootRef, rootProps } =
    useDismissibleSelection();
  const max = Math.max(1, ...Object.values(values));
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  return (
    <section className="chart" ref={rootRef} {...rootProps}>
      <h3>
        {title}
        {titleHelp && <InfoTooltip labelText={titleHelp.labelText} text={titleHelp.text} />}
      </h3>
      <p>{help}</p>
      <div>
        {Object.entries(values).map(([key, value]) => (
          <div
            className="barRow"
            key={key}
            role="button"
            tabIndex={0}
            aria-label={`${label(labels, key)}: ${value}, ${total ? ((value / total) * 100).toFixed(1) : "0.0"}%`}
            onMouseEnter={() => setActiveKey(key)}
            onMouseLeave={() => setActiveKey("")}
            onFocus={() => setActiveKey(key)}
            onClick={() =>
              setActiveKey((current) => current === key ? "" : key)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveKey((current) => current === key ? "" : key);
              }
            }}
          >
            <span>{label(labels, key)}</span>
            <div aria-hidden="true">
              <i style={{ width: `${(value / max) * 100}%`, background: colors[key] }} />
            </div>
            <b>{value}</b>
            {activeKey === key && (
              <span className="barTooltip" role="tooltip">
                <strong>{label(labels, key)}</strong>
                {value} · {total ? ((value / total) * 100).toFixed(1) : "0.0"}%
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function DonutChart({
  title,
  help,
  dimension,
  dimensionLabel,
  options,
  values,
  labels,
  quantity,
  quantitySingular,
  percentage,
  interpretationTitle,
  interpretation,
  controlledNotice,
  onDimensionChange,
}: {
  title: string;
  help: string;
  dimension: DonutDimension;
  dimensionLabel: string;
  options: Readonly<Record<DonutDimension, string>>;
  values: Record<string, number>;
  labels: Readonly<Record<string, string>>;
  quantity: string;
  quantitySingular: string;
  percentage: string;
  interpretationTitle: string;
  interpretation: string;
  controlledNotice: string;
  onDimensionChange: (dimension: DonutDimension) => void;
}) {
  const { activeKey, setActiveKey, rootRef, rootProps } =
    useDismissibleSelection();
  const items = Object.entries(values);
  const total = items.reduce((sum, [, value]) => sum + value, 0);
  const active = items.find(([key]) => key === activeKey);
  let offset = 0;

  return (
    <section className="chart donutChart" ref={rootRef} {...rootProps}>
      <header>
        <div>
          <h3>{title}</h3>
          <p>{help}</p>
        </div>
        <label>
          <span>{dimensionLabel}</span>
          <select
            value={dimension}
            onChange={(event) => {
              setActiveKey("");
              onDimensionChange(event.target.value as DonutDimension);
            }}
          >
            {Object.entries(options).map(([key, value]) => (
              <option key={key} value={key}>{value}</option>
            ))}
          </select>
        </label>
      </header>
      <div className="donutLayout">
        <div className="donutVisual">
          <svg viewBox="0 0 120 120" role="img" aria-label={`${title}: ${options[dimension]}`}>
            <circle className="donutTrack" cx="60" cy="60" r="42" pathLength="100" />
            {items.map(([key, value]) => {
              const share = total ? (value / total) * 100 : 0;
              const unit = value === 1 ? quantitySingular : quantity;
              const dashOffset = -offset;
              offset += share;
              const accessibleLabel = `${label(labels, key)}: ${value} ${unit}, ${share.toFixed(1)}% ${percentage}`;
              return (
                <circle
                  className="donutSegment"
                  cx="60"
                  cy="60"
                  r="42"
                  pathLength="100"
                  key={key}
                  tabIndex={0}
                  role="button"
                  aria-label={accessibleLabel}
                  stroke={colors[key] ?? "#006d77"}
                  strokeDasharray={`${share} ${100 - share}`}
                  strokeDashoffset={dashOffset}
                  onMouseEnter={() => setActiveKey(key)}
                  onMouseLeave={() => setActiveKey("")}
                  onFocus={() => setActiveKey(key)}
                  onClick={() =>
                    setActiveKey((current) => current === key ? "" : key)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveKey((current) => current === key ? "" : key);
                    }
                  }}
                />
              );
            })}
          </svg>
          <strong>{total}</strong>
          {active && (
            <div className="donutTooltip" role="tooltip">
              <b>{label(labels, active[0])}</b>
              <span>{active[1]} {active[1] === 1 ? quantitySingular : quantity}</span>
              <span>{total ? ((active[1] / total) * 100).toFixed(1) : "0.0"}% {percentage}</span>
            </div>
          )}
        </div>
        <div className="donutDetails">
          <aside className="selectionReading" aria-live="polite">
            <h4>{interpretationTitle}</h4>
            <p>{interpretation}</p>
            {controlledNotice && <strong>{controlledNotice}</strong>}
          </aside>
          <div className="donutSummary" aria-label={`${title}: ${options[dimension]}`}>
            {items.map(([key, value]) => (
              <div key={key}>
                <i style={{ background: colors[key] ?? "#006d77" }} aria-hidden="true" />
                <span>{label(labels, key)}</span>
                <b>{value}</b>
                <small>{total ? ((value / total) * 100).toFixed(1) : "0.0"}%</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrendChart({
  title,
  help,
  barHelp,
  noPattern,
  trends,
  categoryLabels,
  riskLabels,
  locale,
  quantity,
  quantitySingular,
}: {
  title: string;
  help: string;
  barHelp: string;
  noPattern: string;
  trends: DashboardData["trends"];
  categoryLabels: Readonly<Record<string, string>>;
  riskLabels: Readonly<Record<string, string>>;
  locale: Locale;
  quantity: string;
  quantitySingular: string;
}) {
  const {
    activeKey: activeDate,
    setActiveKey: setActiveDate,
    rootRef,
    rootProps,
  } = useDismissibleSelection();
  const active = trends.find((item) => item.date === activeDate);
  const max = Math.max(1, ...trends.map((item) => item.value));
  const oneRecordPerDate =
    trends.length > 1 && trends.every((item) => item.value === 1);

  return (
    <section className="chart trendChart" ref={rootRef} {...rootProps}>
      <h3>{title}</h3>
      <p>{help}</p>
      <p className="chartExplanation">{barHelp}</p>
      {oneRecordPerDate && <p className="trendCaution">{noPattern}</p>}
      <div className="trend">
        {trends.map((item) => {
          const categories = item.categories.map((key) => label(categoryLabels, key)).join(", ");
          const risks = item.risk_levels.map((key) => label(riskLabels, key)).join(", ");
          const accessibleLabel = `${formatDate(`${item.date}T12:00:00Z`, locale)}: ${item.value} ${item.value === 1 ? quantitySingular : quantity}; ${categories}; ${risks}`;
          return (
            <button
              type="button"
              className="trendPoint"
              key={item.date}
              aria-label={accessibleLabel}
              onMouseEnter={() => setActiveDate(item.date)}
              onMouseLeave={() => setActiveDate("")}
              onFocus={() => setActiveDate(item.date)}
              onClick={() =>
                setActiveDate((current) =>
                  current === item.date ? "" : item.date
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveDate((current) =>
                    current === item.date ? "" : item.date
                  );
                }
              }}
            >
              <b>{item.value}</b>
              <i style={{ height: `${Math.max(12, (item.value / max) * 120)}px` }} aria-hidden="true" />
              <span>{item.date.slice(5)}</span>
            </button>
          );
        })}
      </div>
      {active && (
        <div className="trendTooltip" role="tooltip">
          <b>{formatDate(`${active.date}T12:00:00Z`, locale)}</b>
          <span>{active.value} {active.value === 1 ? quantitySingular : quantity}</span>
          <span>{active.categories.map((key) => label(categoryLabels, key)).join(", ")}</span>
          <span>{active.risk_levels.map((key) => label(riskLabels, key)).join(", ")}</span>
        </div>
      )}
    </section>
  );
}

export function PublicDashboard() {
  const [locale, setLocale] = React.useState<Locale>("en");
  const [draft, setDraft] = React.useState<Filters>(emptyFilters);
  const [filters, setFilters] = React.useState<Filters>(emptyFilters);
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [climate, setClimate] = React.useState<Climate | null>(null);
  const [apiOk, setApiOk] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [climateLoading, setClimateLoading] = React.useState(false);
  const [climateAnnouncement, setClimateAnnouncement] = React.useState("");
  const [climateUpdateNotice, setClimateUpdateNotice] = React.useState("");
  const [mapAnnouncement, setMapAnnouncement] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(
    () => new Set(),
  );
  const [donutDimension, setDonutDimension] =
    React.useState<DonutDimension>("status");
  const [error, setError] = React.useState(false);
  const mapHost = React.useRef<HTMLDivElement | null>(null);
  const mapSection = React.useRef<HTMLElement | null>(null);
  const map = React.useRef<LeafletMap | null>(null);
  const layer = React.useRef<LayerGroup | null>(null);
  const markers = React.useRef<Map<number, Marker>>(new Map());
  const requestSequence = React.useRef(0);
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);
  const t = copy[locale];
  const filterQuery = query(filters);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = { ...emptyFilters };
    (Object.keys(initial) as Array<keyof Filters>).forEach((key) => {
      initial[key] = params.get(key) ?? "";
    });
    queueMicrotask(() => {
      setDraft(initial);
      setFilters(initial);
      setLocale(params.get("lang") === "es" ? "es" : "en");
    });
  }, []);

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  React.useEffect(() => {
    let parentOrigin: string | null = null;
    try {
      parentOrigin = document.referrer ? new URL(document.referrer).origin : null;
    } catch {
      parentOrigin = null;
    }
    const handlePortalMessage = (event: MessageEvent) => {
      if (
        !parentOrigin ||
        event.origin !== parentOrigin ||
        event.source !== window.parent ||
        event.data?.type !== "infinityatlas:set-locale"
      ) {
        return;
      }
      if (event.data.locale !== "en" && event.data.locale !== "es") return;
      setLocale(event.data.locale);
      const value = pageQuery(filters, event.data.locale);
      window.history.replaceState(
        {},
        "",
        value ? `?${value}` : window.location.pathname,
      );
    };
    window.addEventListener("message", handlePortalMessage);
    return () => window.removeEventListener("message", handlePortalMessage);
  }, [filters]);

  React.useEffect(() => {
    if (!selectAllRef.current || !data) return;
    const visibleIds = data.observations.map((item) => item.id);
    const selectedVisible = visibleIds.filter((id) => selectedIds.has(id)).length;
    selectAllRef.current.indeterminate =
      selectedVisible > 0 && selectedVisible < visibleIds.length;
  }, [data, selectedIds]);

  const loadClimate = React.useCallback(async (announcement?: {
    start: string;
    success: string;
    failure: string;
    noChange: string;
    previousObservedAt?: string;
  }) => {
    const startedAt = Date.now();
    setClimateLoading(true);
    if (announcement) {
      setClimateAnnouncement(announcement.start);
      setClimateUpdateNotice(announcement.start);
    }
    try {
      const response = await fetch("/api/climate", { cache: "no-store" });
      if (!response.ok) throw new Error("climate");
      const nextClimate = (await response.json()) as Climate;
      setClimate(nextClimate);
      if (announcement) {
        const message =
          announcement.previousObservedAt === nextClimate.observed_at
            ? announcement.noChange
            : announcement.success;
        setClimateAnnouncement(message);
        setClimateUpdateNotice(message);
      }
    } catch {
      if (announcement) {
        setClimateAnnouncement(announcement.failure);
        setClimateUpdateNotice(announcement.failure);
      }
    } finally {
      const remainingFeedbackTime = 450 - (Date.now() - startedAt);
      if (remainingFeedbackTime > 0) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, remainingFeedbackTime),
        );
      }
      setClimateLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestSequence.current;
    queueMicrotask(() => {
      if (requestId === requestSequence.current) setLoading(true);
    });
    Promise.all([
      fetch(`/api/dashboard${filterQuery ? `?${filterQuery}` : ""}`, {
        signal: controller.signal,
        cache: "no-store",
      }),
      fetch("/api/health", { signal: controller.signal, cache: "no-store" }),
    ])
      .then(async ([dashboardResponse, healthResponse]) => {
        if (!dashboardResponse.ok) throw new Error("dashboard");
        if (requestId !== requestSequence.current) return;
        setData(await dashboardResponse.json());
        setApiOk(healthResponse.ok);
        setError(false);
      })
      .catch((reason) => {
        if (
          reason.name !== "AbortError" &&
          requestId === requestSequence.current
        ) {
          setError(true);
        }
      })
      .finally(() => {
        if (requestId === requestSequence.current) setLoading(false);
      });
    return () => controller.abort();
  }, [filterQuery]);

  React.useEffect(() => {
    queueMicrotask(() => void loadClimate());
  }, [loadClimate]);

  React.useEffect(() => {
    if (!data || !mapHost.current) return;
    let cancelled = false;

    async function renderMap() {
      const L = await import("leaflet");
      if (cancelled || !data || !mapHost.current) return;
      if (!map.current) {
        map.current = L.map(mapHost.current, {
          center: [-0.9002, -89.6127],
          zoom: 12,
          keyboard: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map.current);
        layer.current = L.layerGroup().addTo(map.current);
      }
      layer.current?.clearLayers();
      markers.current.clear();
      const visiblePoints: Array<[number, number]> = [];
      data.observations
        .filter((item) => item.latitude !== null && item.longitude !== null)
        .forEach((item) => {
          const localizedTitle = localizedRecordTitle(
            item.id,
            item.record_title,
            locale,
          );
          const localizedRisk = label(t.risks, item.risk_level);
          const marker = L.divIcon({
            className: "markerHost",
            html: `<span class="mapMarker" style="--marker:${colors[item.risk_level]}">${localizedRisk.slice(0, 1).toUpperCase()}</span>`,
            iconSize: [32, 36],
            iconAnchor: [16, 36],
          });
          const popup = document.createElement("div");
          popup.className = "popup";
          const strong = document.createElement("strong");
          strong.textContent = `${publicRecordReference(item.id, locale)} · ${localizedTitle}`;
          const details = document.createElement("span");
          details.textContent = `${label(t.categories, item.category)} · ${label(t.statuses, item.status)} · ${item.risk_score} ${localizedRisk} · ${label(t.provenances, item.data_provenance)} · ${label(publicLocationModeLabels[locale], item.public_location_mode)}`;
          popup.append(strong, details);
          const markerInstance = L.marker([item.latitude!, item.longitude!], {
            icon: marker,
            keyboard: true,
            title: `${publicRecordReference(item.id, locale)} ${localizedTitle}`,
            alt: `${publicRecordReference(item.id, locale)} ${localizedTitle}`,
          }).bindPopup(popup).addTo(layer.current!);
          markers.current.set(item.id, markerInstance);
          visiblePoints.push([item.latitude!, item.longitude!]);
        });
      if (visiblePoints.length === 1) {
        const onlyMarker = markers.current.values().next().value as
          | Marker
          | undefined;
        map.current.setView(visiblePoints[0], 13);
        window.setTimeout(() => onlyMarker?.openPopup(), 150);
        setMapAnnouncement(t.mapSingle);
      } else if (visiblePoints.length > 1) {
        map.current.fitBounds(L.latLngBounds(visiblePoints), {
          padding: [34, 34],
          maxZoom: 13,
        });
        setMapAnnouncement(t.mapMultiple);
      } else {
        map.current.setView([-0.9002, -89.6127], 12);
        setMapAnnouncement(
          data.observations.some(
            (item) => item.public_location_mode === "hidden",
          )
            ? t.hiddenExplanation
            : t.mapEmpty,
        );
      }
      const zoomIn = mapHost.current.querySelector<HTMLAnchorElement>(
        ".leaflet-control-zoom-in",
      );
      const zoomOut = mapHost.current.querySelector<HTMLAnchorElement>(
        ".leaflet-control-zoom-out",
      );
      zoomIn?.setAttribute("title", t.zoomIn);
      zoomIn?.setAttribute("aria-label", t.zoomIn);
      zoomOut?.setAttribute("title", t.zoomOut);
      zoomOut?.setAttribute("aria-label", t.zoomOut);
      window.setTimeout(() => map.current?.invalidateSize(), 0);
    }

    void renderMap();
    return () => {
      cancelled = true;
    };
  }, [data, locale, t]);

  React.useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    [],
  );

  function apply(event: React.FormEvent) {
    event.preventDefault();
    const value = pageQuery(draft, locale);
    window.history.replaceState({}, "", value ? `?${value}` : window.location.pathname);
    setSelectedIds(new Set());
    setFilters({ ...draft });
  }

  function clear() {
    const value = pageQuery(emptyFilters, locale);
    window.history.replaceState({}, "", value ? `?${value}` : window.location.pathname);
    setDraft(emptyFilters);
    setSelectedIds(new Set());
    setFilters(emptyFilters);
  }

  function toggleRecordSelection(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    if (!data) return;
    const visibleIds = data.observations.map((item) => item.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    const value = pageQuery(filters, nextLocale);
    window.history.replaceState(
      {},
      "",
      value ? `?${value}` : window.location.pathname,
    );
    if (window.parent !== window && document.referrer) {
      try {
        window.parent.postMessage(
          { type: "infinityatlas:locale", locale: nextLocale },
          new URL(document.referrer).origin,
        );
      } catch {
        // The dashboard continues independently when no trusted portal origin is available.
      }
    }
  }

  const selectedIdsValue = [...selectedIds]
    .sort((left, right) => left - right)
    .join(",");
  const downloadParams = new URLSearchParams(filterQuery);
  if (selectedIdsValue) downloadParams.set("ids", selectedIdsValue);
  const downloadParamsValue = downloadParams.toString();
  const downloadQuery = downloadParamsValue ? `?${downloadParamsValue}` : "";
  const pdfQuery = `${downloadQuery}${downloadQuery ? "&" : "?"}locale=${locale}`;
  const visibleRecords = data?.observations.filter((item) => item.latitude !== null) ?? [];
  const activeFilterChips = [
    filters.date_from && `${t.from}: ${filters.date_from}`,
    filters.date_to && `${t.to}: ${filters.date_to}`,
    filters.category &&
      `${t.category}: ${label(t.categories, filters.category)}`,
    filters.status && `${t.status}: ${label(t.statuses, filters.status)}`,
    filters.provenance &&
      `${t.provenance}: ${label(t.provenances, filters.provenance)}`,
    filters.risk_level &&
      `${t.risk}: ${label(t.risks, filters.risk_level)}`,
    filters.search && `${t.search}: ${filters.search}`,
  ].filter((value): value is string => Boolean(value));
  const donutValues = data
    ? {
        status: data.status,
        risk: data.risk,
        provenance: data.provenance,
        category: data.categories,
      }[donutDimension]
    : {};
  const donutLabels = {
    status: t.statuses,
    risk: t.risks,
    provenance: t.provenances,
    category: t.categories,
  }[donutDimension];
  const dominantDonutItem = Object.entries(donutValues).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const selectionInterpretation = (() => {
    if (!data || data.total === 0) return t.selectionEmpty;
    if (data.total === 1) {
      const item = data.observations[0];
      return interpolateMany(t.selectionSingle, {
        reference: publicRecordReference(item.id, locale),
        category: label(t.categories, item.category),
        status: label(t.statuses, item.status),
        score: item.risk_score,
        risk: label(t.risks, item.risk_level),
        provenance: label(t.provenances, item.data_provenance),
      });
    }
    const [key, value] = dominantDonutItem ?? ["", 0];
    return interpolateMany(
      data.active_filter_count > 0
        ? t.selectionMultiple
        : t.selectionAggregate,
      {
        count: data.total,
        dimension: t.donutOptions[donutDimension].toLowerCase(),
        label: label(donutLabels, key),
        value,
        percentage: data.total
          ? ((value / data.total) * 100).toFixed(1)
          : "0.0",
      },
    );
  })();
  const controlledSelectionNotice = data?.observations.some(
    (item) => item.data_provenance !== "public_real",
  )
    ? t.controlledSelectionNotice
    : "";
  const dominantLabel = (
    values: Record<string, number> | undefined,
    labels: Record<string, string>,
  ) => {
    const [key, value] = Object.entries(values ?? {}).sort(
      (left, right) => right[1] - left[1],
    )[0] ?? ["", 0];
    return value > 0
      ? `${label(labels, key)} · ${value} (${data?.total ? ((value / data.total) * 100).toFixed(1) : "0.0"}%)`
      : "—";
  };
  const territorialReading = data
    ? {
        category: dominantLabel(data.categories, t.categories),
        risk: dominantLabel(data.risk, t.risks),
        provenance: dominantLabel(data.provenance, t.provenances),
      }
    : { category: "—", risk: "—", provenance: "—" };
  const selectedCount = selectedIds.size;
  const selectedCountText = selectedCount === 1
    ? t.selectedCountSingular
    : interpolate(t.selectedCount, "count", String(selectedCount));
  const allVisibleSelected = Boolean(
    data?.observations.length &&
      data.observations.every((item) => selectedIds.has(item.id)),
  );
  const singleResult = selectedCount > 0
    ? selectedCount === 1
    : data?.total === 1;
  const pdfDownloadLabel = singleResult ? t.pdfRecord : t.pdfSelection;
  const excelDownloadLabel = singleResult
    ? t.excelRecord
    : t.excelSelection;
  const technicalCsvDownloadLabel = singleResult
    ? t.technicalCsvRecord
    : t.technicalCsvSelection;

  function viewOnMap(item: RecordItem) {
    const marker = markers.current.get(item.id);
    mapSection.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!marker || !map.current) {
      setMapAnnouncement(t.hiddenExplanation);
      window.setTimeout(() => mapHost.current?.focus(), 350);
      return;
    }
    map.current.setView(marker.getLatLng(), Math.max(map.current.getZoom(), 13));
    setMapAnnouncement(t.mapFocused);
    window.setTimeout(() => marker.openPopup(), 350);
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          {/* The official artwork is served unchanged; browser optimization is intentionally bypassed. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/infinityatlas-logo-official.png"
            alt="InfinityAtlas"
            width="118"
            height="101"
          />
          <span>{t.product}</span>
        </div>
        <label className="language">
          <Languages size={17} />
          <span>{t.language}</span>
          <select value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
      </header>

      <section className="territoryHeader">
        <div>
          <p>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <h2>{t.product}</h2>
          <span>{t.identity}</span>
        </div>
        <div className="systemStatus">
          <span className={apiOk ? "ok" : "down"}>
            {apiOk ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {apiOk ? t.api : t.apiDown}
          </span>
          <span>
            {t.updated}: {data ? formatDate(data.generated_at, locale, true) : "—"}
          </span>
        </div>
      </section>

      <div className="prototype">
        <ShieldCheck size={18} />
        <strong>{t.notice}</strong>
      </div>

      <section className="territoryMeta">
        <div><span>{t.period}</span><strong>{data?.period.start ?? "—"} – {data?.period.end ?? "—"}</strong></div>
        <div><span>{t.timezone}</span><strong>{data?.territory.timezone ?? "Pacific/Galapagos"}</strong></div>
        <div>
          <span className="metaLabel">
            {t.dataSource}
            <InfoTooltip labelText={t.d1HelpLabel} text={t.d1Help} />
          </span>
          <strong>{t.dataSourceValue}</strong>
        </div>
      </section>

      <form className="filters" onSubmit={apply} aria-busy={loading}>
        <header>
          <Filter size={18} />
          <h2>{t.filters}</h2>
          <InfoTooltip labelText={t.filterHelpLabel} text={t.filterHelp} />
          {data && data.active_filter_count > 0 && (
            <span>{data.active_filter_count} {t.active}</span>
          )}
        </header>
        <div className="filterGrid">
          <label><span>{t.territory}</span><select value="san-cristobal" disabled aria-label={t.territory}><option value="san-cristobal">{t.territoryShort}</option></select></label>
          <label><span>{t.from}</span><input type="date" value={draft.date_from} onChange={(e) => setDraft({ ...draft, date_from: e.target.value })} /></label>
          <label><span>{t.to}</span><input type="date" value={draft.date_to} onChange={(e) => setDraft({ ...draft, date_to: e.target.value })} /></label>
          <label><span>{t.category}</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}><option value="">{t.all}</option>{Object.entries(t.categories).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
          <label><span>{t.status}</span><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}><option value="">{t.all}</option>{Object.entries(t.statuses).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
          <label><span>{t.provenance}</span><select value={draft.provenance} onChange={(e) => setDraft({ ...draft, provenance: e.target.value })}><option value="">{t.all}</option>{Object.entries(t.provenances).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
          <label><span>{t.risk}</span><select value={draft.risk_level} onChange={(e) => setDraft({ ...draft, risk_level: e.target.value })}><option value="">{t.all}</option>{Object.entries(t.risks).map(([key, value]) => <option value={key} key={key}>{value}</option>)}</select></label>
          <label className="searchLabel"><span>{t.search}</span><div><Search size={16} /><input maxLength={80} value={draft.search} onChange={(e) => setDraft({ ...draft, search: e.target.value })} /></div></label>
        </div>
        <div className="activeFilterSummary" aria-live="polite">
          <strong>{t.activeFiltersTitle}</strong>
          <div>
            {activeFilterChips.length > 0
              ? activeFilterChips.map((chip) => <span key={chip}>{chip}</span>)
              : <span className="emptyChip">{t.noActiveFilters}</span>}
          </div>
        </div>
        <footer>
          <button className="primary" type="submit" aria-describedby="filter-help">
            <Filter size={16} />{t.apply}
          </button>
          <button type="button" onClick={clear}><Eraser size={16} />{t.clear}</button>
        </footer>
        <p className="srOnly" id="filter-help">{t.filterHelp}</p>
        <p className="srOnly" role="status" aria-live="polite">
          {loading ? t.loading : ""}
        </p>
      </form>

      {loading && !data ? (
        <div className="state"><RefreshCw className="spin" size={20} /> {t.loading}</div>
      ) : !data ? (
        <div className="state error"><AlertTriangle size={20} /> {t.apiDown}</div>
      ) : (
        <>
          {error && (
            <div className="inlineError" role="status">
              <AlertTriangle size={18} /> {t.apiDown}
            </div>
          )}
          <section
            className="resultsSection"
            aria-labelledby="filtered-results-title"
            aria-busy={loading}
          >
            <header>
              <div>
                <h2 id="filtered-results-title">{t.results}</h2>
                <p>{t.resultsHelp}</p>
              </div>
              <div className="resultsCountGroup">
                <strong>
                  {interpolate(
                    interpolate(t.showingRecords, "shown", String(data.total)),
                    "total",
                    String(data.total_available),
                  )}
                </strong>
                <strong className={selectedCount > 0 ? "selectedCount active" : "selectedCount"}>
                  {selectedCountText}
                </strong>
              </div>
            </header>
            {data.observations.length > 0 ? (
              <div className="resultsTableWrap">
                <table>
                  <thead>
                    <tr>
                      <th className="selectionColumn">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          aria-label={t.selectAll}
                          title={t.selectAll}
                        />
                      </th>
                      <th>{t.record}</th>
                      <th>{t.recordTitle}</th>
                      <th>{t.category}</th>
                      <th>{t.status}</th>
                      <th>{t.risk}</th>
                      <th>{t.provenance}</th>
                      <th>{t.observedDate}</th>
                      <th>{t.locationMode}</th>
                      <th>{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.observations.map((item) => (
                      <tr
                        key={item.id}
                        className={selectedIds.has(item.id) ? "selectedRow" : ""}
                      >
                        <td className="selectionColumn" data-label={t.select}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleRecordSelection(item.id)}
                            aria-label={interpolate(
                              t.selectRecord,
                              "id",
                              String(item.id),
                            )}
                          />
                        </td>
                        <td data-label={t.record}>
                          {publicRecordReference(item.id, locale)}
                        </td>
                        <td data-label={t.recordTitle}>
                          {localizedRecordTitle(item.id, item.record_title, locale)}
                        </td>
                        <td data-label={t.category}>{label(t.categories, item.category)}</td>
                        <td data-label={t.status}>{label(t.statuses, item.status)}</td>
                        <td data-label={t.risk}>{item.risk_score} · {label(t.risks, item.risk_level)}</td>
                        <td data-label={t.provenance}>{label(t.provenances, item.data_provenance)}</td>
                        <td data-label={t.observedDate}>{formatDate(item.observed_at, locale)}</td>
                        <td data-label={t.locationMode}>{label(publicLocationModeLabels[locale], item.public_location_mode)}</td>
                        <td data-label={t.actions}>
                          <button
                            type="button"
                            className="mapAction"
                            onClick={() => viewOnMap(item)}
                          >
                            <MapPin size={15} />
                            {t.viewOnMap}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="emptyResults">{t.noData}</p>
            )}
            {selectedCount > 0 && (
              <div className="manualSelectionNotice" role="status" aria-live="polite">
                <strong>{selectedCountText}</strong>
                <span>{t.selectedDownloadHelp}</span>
                <button type="button" onClick={() => setSelectedIds(new Set())}>
                  <Eraser size={15} />
                  {t.clearSelection}
                </button>
              </div>
            )}
            <div className="resultDownloads">
              <a href={`/api/report.pdf${pdfQuery}`}><Download size={16} />{pdfDownloadLabel}</a>
              <a href={`/api/export.excel.csv${downloadQuery}`}>
                <FileSpreadsheet size={16} />{excelDownloadLabel}
              </a>
              <span className="downloadWithHelp">
                <a href={`/api/export.csv${downloadQuery}`}><FileSpreadsheet size={16} />{technicalCsvDownloadLabel}</a>
                <InfoTooltip labelText={t.csvHelpLabel} text={t.csvHelp} />
              </span>
              <a href="/data/infinityatlas-public-data-dictionary.csv" target="_blank">
                {t.dataDictionary}<ArrowUpRight size={15} />
              </a>
            </div>
          </section>

          <section className="metrics" aria-label={t.indicators}>
            <Metric value={data.total} labelText={t.total} tone="total" />
            {Object.entries(data.status).map(([key, value]) => {
              const labelText = label(t.statuses, key);
              return <Metric key={key} value={value} labelText={labelText} tone={key} help={{ labelText: interpolate(t.statusHelpLabel, "status", labelText), text: label(t.statusHelp, key) }} />;
            })}
            {Object.entries(data.provenance).map(([key, value]) => {
              const labelText = label(t.provenances, key);
              return <Metric key={key} value={value} labelText={labelText} tone={key} help={{ labelText: interpolate(t.provenanceHelpLabel, "provenance", labelText), text: label(t.provenanceHelp, key) }} />;
            })}
            {Object.entries(data.risk).map(([key, value]) => {
              const labelText = label(t.risks, key);
              return <Metric key={key} value={value} labelText={labelText} tone={key} help={{ labelText: interpolate(t.riskHelpLabel, "level", labelText), text: label(t.riskHelp, key) }} />;
            })}
          </section>

          <section className="climate">
            <header>
              <div><CloudSun size={20} /><div><h2>{t.climate}</h2>{climate && <p>{climate.source_name} <span className={climate.is_stale ? "climateStale" : "climateCurrent"}>{climate.is_stale ? t.climateStale : t.climateCurrent}</span></p>}</div></div>
              <button
                aria-busy={climateLoading}
                disabled={climateLoading}
                onClick={() => void loadClimate({
                  start: t.climateStart,
                  success: t.climateSuccess,
                  failure: t.climateFailure,
                  noChange: t.climateNoChange,
                  previousObservedAt: climate?.observed_at,
                })}
              >
                <RefreshCw className={climateLoading ? "spin" : ""} size={16} />
                {climateLoading ? t.refreshing : t.refresh}
              </button>
            </header>
            <p className="srOnly" role="status" aria-live="polite" aria-atomic="true">
              {climateAnnouncement}
            </p>
            {climate ? (
              <>
                <div className="climateTimes">
                  <div><span>{t.providerObserved}</span><strong>{formatDate(climate.observed_at, locale, true)}</strong></div>
                  <div><span>{t.atlasQueried}</span><strong>{formatDate(climate.retrieved_at, locale, true)}</strong></div>
                </div>
                <div className="climateGrid">
                  <div><Thermometer size={18} /><span>{t.temperature}</span><strong>{climate.temperature_c} °C</strong></div>
                  <div><Droplets size={18} /><span>{t.humidity}</span><strong>{climate.relative_humidity_percent}%</strong></div>
                  <div><Gauge size={18} /><span>{t.feels}</span><strong>{climate.apparent_temperature_c} °C</strong></div>
                  <div><CloudSun size={18} /><span>{t.rain}</span><strong>{climate.precipitation_mm} mm</strong></div>
                  <div><Activity size={18} /><span>{t.weather}</span><strong>{climate.weather_code}</strong></div>
                </div>
              </>
            ) : <p className="climateError">{t.climateError}</p>}
            {climateUpdateNotice && (
              <p className={climateUpdateNotice === t.climateFailure ? "climateNotice error" : "climateNotice"}>
                {climateUpdateNotice}
              </p>
            )}
            <div className="climateSources">
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                {t.openMeteoAbout}<ArrowUpRight size={14} />
              </a>
              <span>
                <a
                  href={climate?.source_url ?? "https://api.open-meteo.com/"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.openMeteoJson}<ArrowUpRight size={14} />
                </a>
                <InfoTooltip labelText={t.jsonHelpLabel} text={t.jsonHelp} />
              </span>
              {climate?.source_url && (
                <code>{climate.source_url}</code>
              )}
            </div>
          </section>

          <section className="charts" aria-label={t.indicators}>
            <BarGroup
              title={t.charts.status}
              values={data.status}
              labels={t.statuses}
              help={t.chartHelps.status}
              titleHelp={{ labelText: t.charts.status, text: t.chartHelps.status }}
            />
            <BarGroup
              title={t.charts.risk}
              values={data.risk}
              labels={t.risks}
              help={t.method}
              titleHelp={{ labelText: t.riskFormulaHelpLabel, text: t.chartHelps.risk }}
            />
            <BarGroup
              title={t.charts.category}
              values={data.categories}
              labels={t.categories}
              help={t.chartHelps.category}
              titleHelp={{ labelText: t.charts.category, text: t.chartHelps.category }}
            />
            <BarGroup
              title={t.charts.provenance}
              values={data.provenance}
              labels={t.provenances}
              help={t.chartHelps.provenance}
              titleHelp={{ labelText: t.charts.provenance, text: t.chartHelps.provenance }}
            />
            <DonutChart
              title={t.donutTitle}
              help={t.donutHelp}
              dimension={donutDimension}
              dimensionLabel={t.donutDimension}
              options={t.donutOptions}
              values={donutValues}
              labels={donutLabels}
              quantitySingular={t.quantitySingular}
              quantity={t.quantity}
              percentage={t.percentage}
              interpretationTitle={t.selectionReading}
              interpretation={selectionInterpretation}
              controlledNotice={controlledSelectionNotice}
              onDimensionChange={setDonutDimension}
            />
            <TrendChart
              title={t.charts.trend}
              help={t.trendHelp}
              barHelp={t.trendBarHelp}
              noPattern={t.trendNoPattern}
              trends={data.trends}
              categoryLabels={t.categories}
              riskLabels={t.risks}
              locale={locale}
              quantitySingular={t.quantitySingular}
              quantity={t.quantity}
            />
            <section className="chart territorialReading" aria-labelledby="territorial-reading-title">
              <header>
                <div>
                  <h3 id="territorial-reading-title">
                    {t.territorialReading}
                    <InfoTooltip
                      labelText={t.territorialReading}
                      text={t.territorialReadingHelp}
                    />
                  </h3>
                  <p>{t.territorialReadingHelp}</p>
                </div>
                <MapPin size={22} aria-hidden="true" />
              </header>
              {data.total > 0 ? (
                <dl>
                  <div>
                    <dt>{t.territorialReadingCount}</dt>
                    <dd>{data.total}</dd>
                  </div>
                  <div>
                    <dt>{t.territorialReadingCategory}</dt>
                    <dd>{territorialReading.category}</dd>
                  </div>
                  <div>
                    <dt>{t.territorialReadingRisk}</dt>
                    <dd>{territorialReading.risk}</dd>
                  </div>
                  <div>
                    <dt>{t.territorialReadingProvenance}</dt>
                    <dd>{territorialReading.provenance}</dd>
                  </div>
                </dl>
              ) : (
                <p className="territorialReadingEmpty">{t.territorialReadingEmpty}</p>
              )}
              <strong>{t.territorialReadingNotice}</strong>
            </section>
          </section>
          <div className="riskDemoNotice">
            <AlertTriangle size={17} />
            <span>{t.riskDemoNotice}</span>
          </div>

          <section className="mapSection" ref={mapSection} aria-busy={loading}>
            <header><div><MapPin size={20} /><div><h2>{t.map}</h2><p>{t.mapHelp}</p></div></div><span>{visibleRecords.length} {t.visible}</span></header>
            <p className="mapAnnouncement" role="status" aria-live="polite">
              {mapAnnouncement}
            </p>
            <div className="mapLayout">
              <div ref={mapHost} className="mapCanvas" role="region" tabIndex={0} aria-label={t.map} />
              <aside>
                {Object.entries(t.risks).map(([key, value]) => <div key={key}><i style={{ background: colors[key] }}>{value.slice(0, 1).toUpperCase()}</i>{value}</div>)}
              </aside>
            </div>
            <ul>
              {data.observations.map((item) => (
                <li key={item.id}>
                  <strong>{publicRecordReference(item.id, locale)} · {localizedRecordTitle(item.id, item.record_title, locale)}</strong>
                  <span>{label(t.categories, item.category)} · {label(t.statuses, item.status)} · {item.risk_score} {label(t.risks, item.risk_level)} · {label(t.provenances, item.data_provenance)} · {label(publicLocationModeLabels[locale], item.public_location_mode)}</span>
                  {item.latitude === null && <em>{t.hiddenExplanation}</em>}
                </li>
              ))}
            </ul>
            <p>{t.mapSource}</p>
          </section>

          <div className="method"><BarChart3 size={17} /><span>{data.methodology_version} · {t.method}</span></div>
        </>
      )}

      <footer className="footer">
        <strong>{t.owner}</strong>
        <span>{t.notice}</span>
        <span>{t.source}</span>
        <span>{t.mapSource}</span>
      </footer>
    </main>
  );
}
