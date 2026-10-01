import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UX, ux } from "../data/ux";
import { board } from "../data/board";
import { useGameStore } from "../store/gameStore";
import { CurrencyIcon } from "./CurrencyIcon";

const DISPLAY_MS = 1450;

export function TransactionOverlay() {
  const transaction = useGameStore((state) => state.transactionQueue[0]);
  const players = useGameStore((state) => state.players);
  const lang = useGameStore((state) => state.lang);
  const dismiss = useGameStore((state) => state.dismissTransaction);

  useEffect(() => {
    if (!transaction) return;
    const timeout = window.setTimeout(dismiss, DISPLAY_MS);
    return () => window.clearTimeout(timeout);
  }, [transaction?.id, dismiss]);

  const partyName = (id: string) =>
    id === "BANK"
      ? ux("bank", lang)
      : (players.find((player) => player.id === id)?.name ?? id);
  const from = transaction ? partyName(transaction.from) : "";
  const to = transaction ? partyName(transaction.to) : "";
  const payer =
    transaction?.from === "BANK"
      ? undefined
      : players.find((p) => p.id === transaction?.from);
  const receiver =
    transaction?.to === "BANK"
      ? undefined
      : players.find((p) => p.id === transaction?.to);
  const label = transaction
    ? lang === "he"
      ? transaction.reason.he
      : lang === "en"
        ? transaction.reason.en
        : `${transaction.reason.he} · ${transaction.reason.en}`
    : "";
  const property = transaction?.propertyId
    ? board.find((space) => space.id === transaction.propertyId)
    : undefined;

  return (
    <AnimatePresence>
      {transaction && (
        <motion.aside
          className="transaction-overlay"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          style={
            {
              "--payer-color": payer?.color ?? "#7e8a83",
              "--receiver-color": receiver?.color ?? "#d6a83e",
            } as React.CSSProperties
          }
        >
          <div className="transaction-caption">{ux("transaction", lang)}</div>
          <div className="transaction-parties">
            <div className="transaction-party payer">
              <span style={{ background: payer?.color }}>
                {payer?.token ?? "₪"}
              </span>
              <b>{from}</b>
            </div>
            <motion.div
              className="transaction-arrow"
              initial={{
                x: transaction.from === "BANK" ? 8 : -8,
                opacity: 0.4,
              }}
              animate={{ x: 0, opacity: 1 }}
            >
              →
            </motion.div>
            <div className="transaction-party receiver">
              <span style={{ background: receiver?.color }}>
                {receiver?.token ?? "₪"}
              </span>
              <b>{to}</b>
            </div>
          </div>
          <motion.div
            className="transaction-amount"
            initial={{ scale: 0.82 }}
            animate={{ scale: 1 }}
          >
            <CurrencyIcon size={28} />
            <strong>{transaction.amount.toLocaleString()}</strong>
          </motion.div>
          <div className="transaction-reason">{label}</div>
          {property && (
            <small className="transaction-property">
              {property.name.he} · {property.name.en}
            </small>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
