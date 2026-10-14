import { useMemo, useState } from "react";
import { board, groupColors } from "../data/board";
import { GROUP_LABELS, UX, ux } from "../data/ux";
import { useGameStore } from "../store/gameStore";
import {
  buildBlockReason,
  canBuild,
  canMortgage,
  canSellBuilding,
  groupSpaces,
  ownedSpaces,
  ownsGroup,
} from "../engine/rules";
import { playSfx, unlockSfx } from "../audio/sfx";
import type { Lang, Space, TradeDraft } from "../types/game";
import { Modal, Money, txt, ui } from "./ui";
import { AssetInformation } from "./AssetCard";

function RentRow({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return (
    <span>
      {label} <Money value={value} />
    </span>
  );
}

function PurchaseDetails({ space, lang }: { space: Space; lang: Lang }) {
  switch (space.type) {
    case "property":
      return (
        <div className="rent-list">
          <RentRow
            label={ui("שכירות בסיסית", "Base rent", lang)}
            value={space.rents?.[0]}
          />
          <RentRow
            label={ui("סט מלא", "Full color set", lang)}
            value={
              space.rents?.[0] === undefined ? undefined : space.rents[0] * 2
            }
          />
          <RentRow label="1 🏠" value={space.rents?.[1]} />
          <RentRow label="2 🏠" value={space.rents?.[2]} />
          <RentRow label="3 🏠" value={space.rents?.[3]} />
          <RentRow label="4 🏠" value={space.rents?.[4]} />
          <RentRow label="🏨" value={space.rents?.[5]} />
          <RentRow
            label={ui("משכנתא", "Mortgage", lang)}
            value={space.mortgage}
          />
          <RentRow
            label={ui("עלות בנייה", "Building cost", lang)}
            value={space.buildingCost}
          />
        </div>
      );
    case "station":
      return (
        <div className="rent-list">
          <RentRow
            label={ui("תחנה אחת", "1 station owned", lang)}
            value={space.rents?.[0]}
          />
          <RentRow
            label={ui("2 תחנות", "2 stations owned", lang)}
            value={space.rents?.[1]}
          />
          <RentRow
            label={ui("3 תחנות", "3 stations owned", lang)}
            value={space.rents?.[2]}
          />
          <RentRow
            label={ui("כל 4 התחנות", "All 4 stations owned", lang)}
            value={space.rents?.[3]}
          />
          <RentRow
            label={ui("משכנתא", "Mortgage", lang)}
            value={space.mortgage}
          />
        </div>
      );
    case "utility":
      return (
        <div className="rent-list">
          <p>
            {ui(
              "השכירות מבוססת על סכום הקוביות של השחקן שנחת כאן.",
              "Rent is based on the dice total rolled by the player who lands here.",
              lang,
            )}
          </p>
          <span>
            {ui("בעלות על חברת שירות אחת", "Owning one utility", lang)} ×4
          </span>
          <span>
            {ui("בעלות על שתי חברות השירות", "Owning both utilities", lang)} ×10
          </span>
          <RentRow
            label={ui("משכנתא", "Mortgage", lang)}
            value={space.mortgage}
          />
        </div>
      );
    default:
      return null;
  }
}

export function PropertyDecision({
  onInspect,
}: {
  onInspect?: (spaceId: string) => void;
}) {
  const s = useGameStore();
  const sp = board.find((x) => x.id === s.pendingSpaceId);
  const p = s.players[s.activePlayerIndex];
  if (!sp) return null;
  return (
    <Modal>
      <div className="property-decision-card">
        <AssetInformation space={sp} />
        <div className="modal-actions">
          <button
            className="primary"
            disabled={!!p.isComputer || (sp.price ?? 0) > p.money}
            onClick={s.buyPendingProperty}
          >
            {ui("קנה", "BUY", s.lang)}
          </button>
          <button className="secondary" disabled={!!p.isComputer} onClick={s.startAuction}>
            {ui("מכרז", "AUCTION", s.lang)}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function CardModal() {
  const s = useGameStore();
  const c = s.currentCard;
  if (!c) return null;
  return (
    <Modal>
      <div className={`event-card ${c.deck}`}>
        <div className="event-symbol">{c.deck === "mazal" ? "✦" : "♥"}</div>
        <small>
          {c.deck === "mazal" ? "מזל טוב · MAZAL TOV" : "מעשה טוב · GOOD DEEDS"}
        </small>
        <h2>{txt(c.text, s.lang)}</h2>
        <button className="primary" disabled={!!s.players[s.activePlayerIndex]?.isComputer} onClick={s.dismissCard}>
          {ui("המשך", "CONTINUE", s.lang)}
        </button>
      </div>
    </Modal>
  );
}

export function DebtModal() {
  const s = useGameStore();
  const d = s.debt;
  const p = s.players[s.activePlayerIndex];
  if (!d) return null;
  return (
    <Modal>
      <div className="debt-modal">
        <div className="oy">
          אוי ווי! <span>OY VEY!</span>
        </div>
        <h2>{ui("צריך לשלם", "Payment due", s.lang)}</h2>
        <Money value={d.amount} className="price-big" />
        <p>{d.reason}</p>
        <p>
          {ui(
            "אפשר למשכן נכסים או למכור בתים דרך ניהול הנכסים, ואז לשלם.",
            "Mortgage properties or sell buildings in Property Management, then settle the debt.",
            s.lang,
          )}
        </p>
        {!p.isComputer && <Management inline />}
        <div className="modal-actions">
          <button
            className="primary"
            disabled={!!p.isComputer || p.money < d.amount}
            onClick={s.settleDebt}
          >
            {ui("שלם עכשיו", "PAY NOW", s.lang)}
          </button>
          <button className="danger" disabled={!!p.isComputer} onClick={s.declareBankruptcy}>
            {ui("הכרז פשיטת רגל", "DECLARE BANKRUPTCY", s.lang)}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function AuctionModal({
  onInspect,
}: {
  onInspect?: (spaceId: string) => void;
}) {
  const s = useGameStore();
  const a = s.auction;
  if (!a) return null;
  const sp = board.find((x) => x.id === a.spaceId)!;
  const alive = s.players.filter((p) => !p.bankrupt);
  const canFinish = a.highestBidderId
    ? alive.every(p => p.id === a.highestBidderId || a.passed.includes(p.id))
    : alive.every(p => a.passed.includes(p.id));
  return (
    <Modal>
      <div className="auction">
        <div className="gavel">⚖</div>
        <h2>
          {ui("מכרז", "AUCTION", s.lang)} — {txt(sp.name, s.lang)}
        </h2>
        <button
          className="asset-inspect-link"
          onClick={() => onInspect?.(sp.id)}
        >
          {ui("הצג פרטי נכס", "View asset details", s.lang)}
        </button>
        <div className="highest">
          <span>{ui("הצעה מובילה", "Highest bid", s.lang)}</span>
          <Money value={a.highestBid} />
          <b>
            {s.players.find((p) => p.id === a.highestBidderId)?.name ?? "—"}
          </b>
        </div>
        <div className="auction-players">
          {alive.map((p) => {
            const passed = a.passed.includes(p.id);
            return (
              <div
                className={`auction-player ${passed ? "passed" : ""}`}
                key={p.id}
              >
                <span className="mini-token" style={{ background: p.color }}>
                  {p.token}
                </span>
                <b>{p.name} {p.isComputer && "🤖"}</b>
                <Money value={p.money} />
                <div>
                  <button
                    disabled={passed || !!p.isComputer || p.money <= a.highestBid}
                    onClick={() =>
                      s.bidAuction(p.id, Math.min(p.money, a.highestBid + 10))
                    }
                  >
                    +10
                  </button>
                  <button
                    disabled={passed || !!p.isComputer || p.money <= a.highestBid}
                    onClick={() =>
                      s.bidAuction(p.id, Math.min(p.money, a.highestBid + 50))
                    }
                  >
                    +50
                  </button>
                  <button disabled={passed || !!p.isComputer} onClick={() => s.passAuction(p.id)}>
                    {ui("פרש", "PASS", s.lang)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button
          className="primary huge"
          disabled={!canFinish}
          onClick={s.finishAuction}
        >
          {ui("סגור מכרז", "FINISH AUCTION", s.lang)}
        </button>
      </div>
    </Modal>
  );
}

export function Management({
  inline = false,
  onInspect,
}: {
  inline?: boolean;
  onInspect?: (spaceId: string) => void;
}) {
  const s = useGameStore();
  const p = s.players[s.activePlayerIndex];
  const props = ownedSpaces(p.id, s.ownership);
  if (!props.length)
    return inline ? (
      <div className="empty-management">
        {ui("אין נכסים לניהול", "No properties to manage", s.lang)}
      </div>
    ) : null;
  const colorGroups = Object.keys(groupColors) as NonNullable<Space["group"]>[];
  return (
    <div className={`management ${inline ? "inline" : ""}`}>
      {!inline &&
        colorGroups.map((group) => {
          const spaces = groupSpaces(group);
          const complete = ownsGroup(p.id, group, s.ownership);
          const canBuildAny =
            complete &&
            spaces.some(
              (space) =>
                canBuild(p.id, space, s.ownership) &&
                (space.buildingCost ?? Infinity) <= p.money,
            );
          const blockers = spaces
            .filter((space) => s.ownership[space.id]?.ownerId === p.id)
            .map((space) => buildBlockReason(p.id, p.money, space, s.ownership))
            .filter(Boolean);
          const blocker = blockers.includes("group-mortgaged")
            ? "group-mortgaged"
            : blockers.includes("max-buildings")
              ? "max-buildings"
              : blockers.includes("unbalanced")
                ? "unbalanced"
                : blockers.includes("insufficient-funds")
                  ? "insufficient-funds"
                  : blockers[0];
          const blockerLabels = {
            "group-mortgaged": UX.groupMortgaged,
            "max-buildings": UX.maxBuildings,
            unbalanced: UX.buildBalanced,
            "insufficient-funds": UX.insufficientFunds,
            "incomplete-group": UX.needFullSet,
            "not-owned": UX.notOwned,
            "not-property": UX.notOwned,
          } as const;
          return (
            <section
              key={group}
              className={`property-group-panel ${complete ? "complete" : "incomplete"}`}
            >
              <header
                style={
                  { "--group-color": groupColors[group] } as React.CSSProperties
                }
              >
                <i />{" "}
                <b>
                  {s.lang === "he"
                    ? GROUP_LABELS[group].he
                    : s.lang === "en"
                      ? GROUP_LABELS[group].en
                      : `${GROUP_LABELS[group].he} · ${GROUP_LABELS[group].en}`}
                </b>
                <span>
                  {
                    spaces.filter(
                      (space) => s.ownership[space.id]?.ownerId === p.id,
                    ).length
                  }{" "}
                  / {spaces.length}
                </span>
              </header>
              <div className="property-group-spaces">
                {spaces.map((space) => {
                  const own = s.ownership[space.id];
                  const isMine = own?.ownerId === p.id;
                  const buildReason = buildBlockReason(
                    p.id,
                    p.money,
                    space,
                    s.ownership,
                  );
                  const canBuildHere = isMine && !buildReason;
                  return (
                    <div
                      className={`property-group-space ${isMine ? "is-owned" : "is-missing"}`}
                      key={space.id}
                    >
                      <button
                        className="asset-link"
                        onClick={() => onInspect?.(space.id)}
                      >
                        <span>{isMine ? "✓" : "—"}</span>
                        {txt(space.name, s.lang)}
                      </button>
                      {isMine && (
                        <>
                          <div className="manage-actions">
                            {own.mortgaged ? (
                              <button onClick={() => s.unmortgage(space.id)}>
                                {ui("פדה", "UNMORTGAGE", s.lang)}
                              </button>
                            ) : (
                              <button
                                disabled={
                                  !canMortgage(p.id, space, s.ownership)
                                }
                                title={
                                  !canMortgage(p.id, space, s.ownership)
                                    ? s.lang === "en"
                                      ? UX.mortgageHasBuildings.en
                                      : UX.mortgageHasBuildings.he
                                    : undefined
                                }
                                onClick={() => s.mortgage(space.id)}
                              >
                                {ui("משכן", "MORTGAGE", s.lang)}
                              </button>
                            )}
                            {!own.mortgaged && space.type === "property" && (
                              <button
                                disabled={!canBuildHere}
                                onClick={() => {
                                  const before =
                                    useGameStore.getState().ownership[space.id]
                                      ?.houses ?? 0;
                                  s.build(space.id);
                                  const current = useGameStore.getState();
                                  if (
                                    (current.ownership[space.id]?.houses ?? 0) >
                                    before
                                  ) {
                                    unlockSfx();
                                    playSfx(
                                      "buildHouse",
                                      current.settings.sound,
                                    );
                                  }
                                }}
                              >
                                ＋⌂
                              </button>
                            )}
                            {own.houses > 0 && (
                              <button
                                disabled={
                                  !canSellBuilding(p.id, space, s.ownership)
                                }
                                onClick={() => s.sellBuilding(space.id)}
                              >
                                −⌂
                              </button>
                            )}
                          </div>
                          {space.type === "property" && (
                            <small
                              className={`property-build-row-status ${canBuildHere ? "allowed" : "blocked"}`}
                            >
                              {ux(
                                canBuildHere ? "canBuild" : "cannotBuild",
                                s.lang,
                              )}
                              {!canBuildHere && buildReason && (
                                <span>
                                  {s.lang === "he"
                                    ? blockerLabels[buildReason].he
                                    : s.lang === "en"
                                      ? blockerLabels[buildReason].en
                                      : `${blockerLabels[buildReason].he} · ${blockerLabels[buildReason].en}`}
                                </span>
                              )}
                            </small>
                          )}
                          {!canMortgage(p.id, space, s.ownership) &&
                            !own.mortgaged && (
                              <small className="mortgage-row-status">
                                {s.lang === "en"
                                  ? UX.mortgageHasBuildings.en
                                  : s.lang === "he"
                                    ? UX.mortgageHasBuildings.he
                                    : `${UX.mortgageHasBuildings.he} · ${UX.mortgageHasBuildings.en}`}
                              </small>
                            )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {complete && (
                <div className="group-complete-badge">
                  {ux("fullSet", s.lang)}
                </div>
              )}
              {complete && (
                <div
                  className={`group-build-status ${canBuildAny ? "allowed" : "blocked"}`}
                >
                  <b>{ux(canBuildAny ? "canBuild" : "cannotBuild", s.lang)}</b>
                  {!canBuildAny && blocker && (
                    <small>
                      {s.lang === "he"
                        ? blockerLabels[blocker].he
                        : s.lang === "en"
                          ? blockerLabels[blocker].en
                          : `${blockerLabels[blocker].he} · ${blockerLabels[blocker].en}`}
                    </small>
                  )}
                </div>
              )}
            </section>
          );
        })}
      {props
        .filter((space) => space.type === "station" || space.type === "utility")
        .map((sp) => {
          const o = s.ownership[sp.id];
          return (
            <div className="manage-row" key={sp.id}>
              <div>
                <button
                  className="asset-link"
                  onClick={() => onInspect?.(sp.id)}
                >
                  {txt(sp.name, s.lang)}
                </button>
                <small>
                  {o.mortgaged
                    ? ui("ממושכן", "Mortgaged", s.lang)
                    : o.houses >= 5
                      ? "🏨"
                      : o.houses
                        ? `🏠 × ${o.houses}`
                        : ""}
                </small>
              </div>
              <div className="manage-actions">
                {o.mortgaged ? (
                  <button onClick={() => s.unmortgage(sp.id)}>
                    {ui("פדה", "UNMORTGAGE", s.lang)}
                  </button>
                ) : (
                  <button onClick={() => s.mortgage(sp.id)}>
                    {ui("משכן", "MORTGAGE", s.lang)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export function TradeModal({ onClose }: { onClose: () => void }) {
  const s = useGameStore();
  const a = s.players[s.activePlayerIndex];
  const targets = s.players.filter((p) => p.id !== a.id && !p.bankrupt && !p.isComputer);
  const [target, setTarget] = useState(targets[0]?.id ?? "");
  const [offerPropertyId, setOffer] = useState("");
  const [requestPropertyId, setRequest] = useState("");
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const b = s.players.find((p) => p.id === target);
  const aProps = ownedSpaces(a.id, s.ownership);
  const bProps = b ? ownedSpaces(b.id, s.ownership) : [];
  const offeredSpace = aProps.find((space) => space.id === offerPropertyId);
  const requestedSpace = bProps.find((space) => space.id === requestPropertyId);
  const draft: TradeDraft = {
    targetId: target,
    offerPropertyId: offerPropertyId || undefined,
    requestPropertyId: requestPropertyId || undefined,
    offerCash,
    requestCash,
  };
  return (
    <Modal onClose={onClose}>
      <div className="trade">
        <h2>{ui("עסקה בין שחקנים", "PLAYER TRADE", s.lang)}</h2>
        <label>
          {ui("עם", "With", s.lang)}
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {targets.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="trade-cols">
          <div>
            <h3>
              {a.name} {ui("נותן", "GIVES", s.lang)}
            </h3>
            <select
              value={offerPropertyId}
              onChange={(e) => setOffer(e.target.value)}
            >
              <option value="">
                — {ui("ללא נכס", "No property", s.lang)} —
              </option>
              {aProps.map((sp) => (
                <option value={sp.id} key={sp.id}>
                  {sp.name.en}
                </option>
              ))}
            </select>
            <label>
              {ui("מזומן", "Cash", s.lang)}
              <input
                type="number"
                min="0"
                max={a.money}
                value={offerCash}
                onChange={(e) => setOfferCash(Math.max(0, +e.target.value))}
              />
            </label>
          </div>
          <div className="trade-arrow">⇄</div>
          <div>
            <h3>
              {b?.name} {ui("נותן", "GIVES", s.lang)}
            </h3>
            <select
              value={requestPropertyId}
              onChange={(e) => setRequest(e.target.value)}
            >
              <option value="">
                — {ui("ללא נכס", "No property", s.lang)} —
              </option>
              {bProps.map((sp) => (
                <option value={sp.id} key={sp.id}>
                  {sp.name.en}
                </option>
              ))}
            </select>
            <label>
              {ui("מזומן", "Cash", s.lang)}
              <input
                type="number"
                min="0"
                max={b?.money ?? 0}
                value={requestCash}
                onChange={(e) => setRequestCash(Math.max(0, +e.target.value))}
              />
            </label>
          </div>
        </div>
        {(offeredSpace || requestedSpace) && (
          <div className="trade-asset-previews">
            {offeredSpace && <AssetInformation space={offeredSpace} />}
            {requestedSpace && <AssetInformation space={requestedSpace} />}
          </div>
        )}
        <button
          className="primary huge"
          onClick={() => {
            s.executeTrade(draft);
            onClose();
          }}
        >
          {ui("שני הצדדים מאשרים", "BOTH PLAYERS CONFIRM", s.lang)}
        </button>
      </div>
    </Modal>
  );
}
