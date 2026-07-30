import {
  ArrowRight,
  BarChart3,
  Building2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Locale, translations } from "./i18n";

export function CentralPortal({
  locale,
  apiConnected,
  onOpenPublic,
  onOpenInstitutional,
}: {
  locale: Locale;
  apiConnected: boolean;
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
        <div className="portalAvailability" role="status">
          <span
            className={`availabilityDot ${apiConnected ? "available" : "unavailable"}`}
            aria-hidden="true"
          />
          <span>{apiConnected ? t.portal.availability : t.apiError}</span>
        </div>
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
