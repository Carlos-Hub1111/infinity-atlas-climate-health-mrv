import React from "react";
import { normalizeSanCristobal } from "./presentation";
import L from "leaflet";
import { Crosshair, EyeOff, Layers3, MapPin } from "lucide-react";
import { getJson, MapObservation, MapResponse, User } from "./api";
import { Locale, translations, translateValue } from "./i18n";
import "./territory-map.css";

const riskColors: Record<string, string> = {
  low: "#2f7d56",
  moderate: "#b07a13",
  high: "#d46b35",
  critical: "#a9363c",
  none: "#5f7076",
};

const riskSymbols: Record<string, string> = {
  low: "L",
  moderate: "M",
  high: "H",
  critical: "C",
  none: "–",
};

function markerIcon(observation: MapObservation) {
  const risk = observation.risk_level ?? "none";
  const provenanceClass =
    observation.data_provenance === "public_real"
      ? "real"
      : observation.data_provenance === "synthetic_demo"
        ? "synthetic"
        : "controlled";
  return L.divIcon({
    className: "infinityMapMarkerHost",
    html: `<span class="infinityMapMarker ${provenanceClass}" style="--marker-color:${riskColors[risk]}"><b>${riskSymbols[risk]}</b></span>`,
    iconSize: [34, 38],
    iconAnchor: [17, 38],
    popupAnchor: [0, -34],
  });
}

function formatDate(value: string, locale: Locale, timeZone: string) {
  return new Intl.DateTimeFormat(translations[locale].dateLocale, {
    dateStyle: "medium",
    timeZone,
  }).format(new Date(value));
}

export function TerritoryMap({
  locale,
  user,
  filterQuery,
}: {
  locale: Locale;
  user: User | null;
  filterQuery: string;
}) {
  const t = translations[locale];
  const [data, setData] = React.useState<MapResponse | null>(null);
  const [error, setError] = React.useState(false);
  const mapHost = React.useRef<HTMLDivElement | null>(null);
  const mapInstance = React.useRef<L.Map | null>(null);
  const markerLayer = React.useRef<L.LayerGroup | null>(null);
  const isInternal = Boolean(user && user.role.name !== "public");

  React.useEffect(() => {
    let active = true;
    const endpoint = isInternal ? "/api/v1/map/internal" : "/api/v1/map/observations";
    getJson<MapResponse>(`${endpoint}${filterQuery}`, isInternal)
      .then((result) => {
        if (active) {
          setData(result);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [filterQuery, isInternal]);

  const center: [number, number] = [-0.9002, -89.6127];
  const mapped = data?.observations.filter(
    (item) => item.latitude !== null && item.longitude !== null,
  ) ?? [];
  const hidden = data?.observations.filter((item) => !item.is_publicly_mappable) ?? [];

  React.useEffect(() => {
    if (!data || !mapHost.current) return;
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapHost.current, {
        center,
        zoom: 11,
        scrollWheelZoom: true,
        keyboard: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapInstance.current);
      markerLayer.current = L.layerGroup().addTo(mapInstance.current);
    }
    markerLayer.current?.clearLayers();
    const timeZone = data.territory?.timezone ?? "Pacific/Galapagos";
    data.observations
      .filter((item) => item.latitude !== null && item.longitude !== null)
      .forEach((observation) => {
        const popup = document.createElement("article");
        popup.className = "mapPopup";
        const title = document.createElement("strong");
        title.textContent = `#${observation.id} · ${normalizeSanCristobal(observation.record_title)}`;
        popup.append(title);
        const facts = document.createElement("dl");
        const addFact = (label: string, value: string) => {
          const term = document.createElement("dt");
          term.textContent = label;
          const detail = document.createElement("dd");
          detail.textContent = value;
          facts.append(term, detail);
        };
        addFact(
          t.observationForm.category,
          translateValue(t.categories, observation.category, observation.category),
        );
        addFact(
          t.dashboard.status,
          translateValue(t.statuses, observation.status, observation.status),
        );
        addFact(
          t.dashboard.risk,
          observation.risk_level
            ? `${observation.risk_score} · ${translateValue(
                t.riskLevels,
                observation.risk_level,
                observation.risk_level,
              )}`
            : t.map.noRisk,
        );
        addFact(
          t.dashboard.provenance,
          translateValue(
            t.provenance,
            observation.data_provenance,
            observation.data_provenance,
          ),
        );
        addFact(
          t.observations.observed,
          formatDate(observation.observed_at, locale, timeZone),
        );
        popup.append(facts);
        if (observation.data_provenance !== "public_real") {
          const notice = document.createElement("p");
          notice.textContent = t.map.controlledNotice;
          popup.append(notice);
        }
        L.marker([observation.latitude!, observation.longitude!], {
          icon: markerIcon(observation),
          keyboard: true,
          title: `#${observation.id} ${normalizeSanCristobal(observation.record_title)}`,
          alt: `#${observation.id} ${normalizeSanCristobal(observation.record_title)}`,
        })
          .bindPopup(popup)
          .addTo(markerLayer.current!);
      });
    window.setTimeout(() => mapInstance.current?.invalidateSize(), 0);
  }, [data, locale, t]);

  React.useEffect(
    () => () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
      markerLayer.current = null;
    },
    [],
  );

  return (
    <section className="territoryMapSection">
      <header>
        <div>
          <MapPin size={20} />
          <div>
            <h2>{t.map.title}</h2>
            <p>{t.map.description}</p>
          </div>
        </div>
        <span>{mapped.length} {t.map.visiblePoints}</span>
      </header>
      {error ? (
        <div className="mapEmpty" role="alert">{t.map.unavailable}</div>
      ) : !data ? (
        <div className="mapEmpty">{t.map.loading}</div>
      ) : (
        <>
          <div className="mapLayout">
            <div className="mapCanvas">
              <div
                ref={mapHost}
                role="region"
                tabIndex={0}
                aria-label={t.map.ariaLabel}
              />
              <button
                className="mapCenterButton"
                type="button"
                aria-label={t.map.center}
                title={t.map.center}
                onClick={() => mapInstance.current?.setView(center, 11)}
              >
                <Crosshair size={17} />
              </button>
            </div>
            <aside className="mapLegend" aria-label={t.map.legend}>
              <h3><Layers3 size={16} /> {t.map.legend}</h3>
              {(Object.keys(t.riskLevels) as Array<keyof typeof t.riskLevels>).map((level) => (
                <div key={level}>
                  <span className="legendRisk" style={{ background: riskColors[level] }}>
                    {riskSymbols[level]}
                  </span>
                  {t.riskLevels[level]}
                </div>
              ))}
              <hr />
              <div><span className="legendShape real" /> {t.provenance.public_real}</div>
              <div><span className="legendShape controlled" /> {t.provenance.controlled_test}</div>
              <div><span className="legendShape synthetic" /> {t.provenance.synthetic_demo}</div>
              {hidden.length > 0 && (
                <div><EyeOff size={15} /> {hidden.length} {t.map.hiddenLocations}</div>
              )}
            </aside>
          </div>
          {mapped.length === 0 && <div className="mapEmpty">{t.map.empty}</div>}
          <div className="mapAccessibleList">
            <h3>{t.map.accessibleList}</h3>
            {data.observations.length ? (
              <ul>
                {data.observations.map((observation) => (
                  <li key={observation.id}>
                    <strong>
                      #{observation.id} · {normalizeSanCristobal(observation.record_title)}
                    </strong>
                    <span>
                      {translateValue(t.categories, observation.category, observation.category)}
                      {" · "}
                      {translateValue(t.statuses, observation.status, observation.status)}
                      {" · "}
                      {observation.risk_level
                        ? translateValue(t.riskLevels, observation.risk_level, observation.risk_level)
                        : t.map.noRisk}
                      {" · "}
                      {translateValue(t.provenance, observation.data_provenance, observation.data_provenance)}
                    </span>
                    {!observation.is_publicly_mappable && <em>{t.map.locationHidden}</em>}
                  </li>
                ))}
              </ul>
            ) : <p>{t.map.empty}</p>}
          </div>
          <footer>
            <span>{data.privacy_notice}</span>
            <span>{data.attribution}</span>
          </footer>
        </>
      )}
    </section>
  );
}
