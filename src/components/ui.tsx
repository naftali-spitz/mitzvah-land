import type { Lang, Localized } from "../types/game";
import { CurrencyIcon } from "./CurrencyIcon";

export const txt = (l: Localized, lang: Lang) =>
  lang === "he" ? l.he : lang === "en" ? l.en : `${l.he} · ${l.en}`;
export const ui = (he: string, en: string, lang: Lang) =>
  lang === "he" ? he : lang === "en" ? en : `${he} · ${en}`;
export function Money({
  value,
  className = "",
}: {
  value?: number | null;
  className?: string;
}) {
  const validValue = typeof value === "number" && Number.isFinite(value);
  if (!validValue && import.meta.env.DEV)
    console.warn("Money received invalid value:", value);
  const safeValue = validValue ? value : 0;
  return (
    <span className={`money ${className}`}>
      <CurrencyIcon size={16} />
      <b>{safeValue.toLocaleString()}</b>
    </span>
  );
}
export function Modal({
  children,
  onClose,
  className = "",
}: {
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`modal ${className}`} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}
