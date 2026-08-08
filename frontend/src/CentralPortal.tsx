import {
  ArrowRight,
  BarChart3,
  Building2,
  Info,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { Locale, translations } from "./i18n";

export type PlatformAvailability = "checking" | "available" | "partial" | "unavailable";
export type PlatformChecks = {
  frontend: boolean;
  backend: boolean;
  api: boolean;
};

type TooltipPosition = {
  left: number;
  top: number;
};

export function PlatformServiceStatus({
  locale,
  status,
  checks,
  compact = false,
}: {
  locale: Locale;
  status: PlatformAvailability;
  checks: PlatformChecks;
  compact?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [tooltipPosition, setTooltipPosition] =
    React.useState<TooltipPosition | null>(null);
  const trigger = React.useRef<HTMLButtonElement | null>(null);
  const tooltip = React.useRef<HTMLDivElement | null>(null);
  const openedByFocus = React.useRef(false);
  const tooltipId = React.useId();
  const t = translations[locale].portal;

  const positionTooltip = React.useCallback(() => {
    if (!trigger.current || !tooltip.current) return;
    const margin = 12;
    const gap = 8;
    const anchor = trigger.current.getBoundingClientRect();
    const tooltipBox = tooltip.current.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const left = Math.min(
      Math.max(
        margin,
        anchor.left + anchor.width / 2 - tooltipBox.width / 2,
      ),
      Math.max(margin, viewportWidth - tooltipBox.width - margin),
    );
    const below = anchor.bottom + gap;
    const above = anchor.top - tooltipBox.height - gap;
    const top =
      below + tooltipBox.height <= viewportHeight - margin || above < margin
        ? Math.min(
            Math.max(margin, below),
            Math.max(margin, viewportHeight - tooltipBox.height - margin),
          )
        : above;
    setTooltipPosition({ left, top });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) {
      setTooltipPosition(null);
      return;
    }
    positionTooltip();
  }, [open, locale, checks, positionTooltip]);

  React.useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !trigger.current?.contains(target) &&
        !tooltip.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, positionTooltip]);

  return (
    <div
      className={`portalAvailability ${compact ? "compact" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <span className={`availabilityDot ${status}`} aria-hidden="true" />
      <span role="status" aria-live="polite">{t.serviceStatus[status]}</span>
      <button
        ref={trigger}
        className="serviceInfoButton"
        type="button"
        aria-label={t.serviceHelpLabel}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => {
          if (openedByFocus.current) {
            openedByFocus.current = false;
            setOpen(true);
            return;
          }
          setOpen((current) => !current);
        }}
        onFocus={() => {
          openedByFocus.current = !open;
          setOpen(true);
        }}
        onBlur={() => {
          openedByFocus.current = false;
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={tooltip}
            className="serviceTooltipFloating"
            id={tooltipId}
            role="tooltip"
            style={{
              left: tooltipPosition?.left ?? 0,
              top: tooltipPosition?.top ?? 0,
              visibility: tooltipPosition ? "visible" : "hidden",
            }}
          >
          <span>{t.serviceHelp}</span>
          <span>
            {t.serviceChecks.frontend}: {checks.frontend ? t.serviceReady : t.serviceUnavailable}
          </span>
          <span>
            {t.serviceChecks.backend}: {checks.backend ? t.serviceReady : t.serviceUnavailable}
          </span>
          <span>
            {t.serviceChecks.api}: {checks.api ? t.serviceReady : t.serviceUnavailable}
          </span>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function CentralPortal({
  locale,
  serviceStatus,
  serviceChecks,
  onOpenPublic,
  onOpenInstitutional,
}: {
  locale: Locale;
  serviceStatus: PlatformAvailability;
  serviceChecks: PlatformChecks;
  onOpenPublic: () => void;
  onOpenInstitutional: () => void;
}) {
  const t = translations[locale];

  return (
    <main className="centralPortal">
      <section className="portalIntroduction" aria-labelledby="portal-title">
        <div>
          <p className="portalEyebrow">{t.portal.eyebrow}</p>
          <h2 id="portal-title">{t.portal.title}</h2>
          <p className="portalDescription">{t.portal.description}</p>
        </div>
        <PlatformServiceStatus
          locale={locale}
          status={serviceStatus}
          checks={serviceChecks}
        />
      </section>

      <section className="accessChoiceGrid" aria-label={t.portal.eyebrow}>
        <article className="accessChoice publicAccessChoice">
          <div className="accessChoiceIcon" aria-hidden="true">
            <BarChart3 size={28} />
          </div>
          <div className="accessChoiceContent">
            <p className="accessBoundary">{t.portal.publicBoundary}</p>
            <h3>{t.portal.publicTitle}</h3>
            <p>{t.portal.publicDescription}</p>
          </div>
          <button className="portalAction primaryPortalAction" type="button" onClick={onOpenPublic}>
            {t.portal.publicAction}
            <ArrowRight size={18} />
          </button>
        </article>

        <article className="accessChoice institutionalAccessChoice">
          <div className="accessChoiceIcon" aria-hidden="true">
            <Building2 size={28} />
          </div>
          <div className="accessChoiceContent">
            <p className="accessBoundary">{t.portal.institutionalBoundary}</p>
            <h3>{t.portal.institutionalTitle}</h3>
            <p>{t.portal.institutionalDescription}</p>
          </div>
          <button
            className="portalAction secondaryPortalAction"
            type="button"
            onClick={onOpenInstitutional}
          >
            <LockKeyhole size={18} />
            {t.portal.institutionalAction}
          </button>
        </article>
      </section>

      <div className="portalSecurityNote">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>{t.portal.securityNote}</p>
      </div>
    </main>
  );
}
