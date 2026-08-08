import React from "react";
import { BarChart3, LoaderCircle } from "lucide-react";
import { Locale, translations } from "./i18n";

const PUBLIC_DEMO_ORIGIN =
  import.meta.env.VITE_PUBLIC_DEMO_URL ?? "http://127.0.0.1:4173";

export function PublicDashboardBridge({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}) {
  const frame = React.useRef<HTMLIFrameElement | null>(null);
  const initialSource = React.useRef(
    `${PUBLIC_DEMO_ORIGIN}/?${new URLSearchParams({ lang: locale }).toString()}`,
  );
  const [loaded, setLoaded] = React.useState(false);
  const t = translations[locale];

  React.useEffect(() => {
    const publicOrigin = new URL(PUBLIC_DEMO_ORIGIN).origin;
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== publicOrigin ||
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== "infinityatlas:locale"
      ) {
        return;
      }
      if (event.data.locale === "en" || event.data.locale === "es") {
        onLocaleChange(event.data.locale);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onLocaleChange]);

  React.useEffect(() => {
    if (!loaded) return;
    frame.current?.contentWindow?.postMessage(
      { type: "infinityatlas:set-locale", locale },
      new URL(PUBLIC_DEMO_ORIGIN).origin,
    );
  }, [loaded, locale]);

  return (
    <main className="publicDashboardBridge">
      <div className="surfaceContext">
        <BarChart3 size={18} />
        <span>{t.portal.publicLocation}</span>
        <small>{t.portal.publicBoundary}</small>
      </div>
      {!loaded && (
        <div className="publicFrameLoading" role="status">
          <LoaderCircle className="spin" size={19} />
          <span>{t.portal.publicFrameLoading}</span>
        </div>
      )}
      <iframe
        ref={frame}
        className="publicDashboardFrame"
        src={initialSource.current}
        title={t.portal.publicFrameTitle}
        sandbox="allow-downloads allow-forms allow-popups allow-same-origin allow-scripts"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
      />
    </main>
  );
}
