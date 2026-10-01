import { board, groupColors } from "../data/board";
import { GROUP_LABELS, UX, ux } from "../data/ux";
import { calculateRent, groupSpaces, ownsGroup } from "../engine/rules";
import { useGameStore } from "../store/gameStore";
import type { Space } from "../types/game";
import { CurrencyIcon } from "./CurrencyIcon";
import { Modal, Money, ui } from "./ui";

export function AssetInformation({ space }: { space: Space }) {
  const s = useGameStore();
  const ownership = s.ownership[space.id];
  const owner = s.players.find((player) => player.id === ownership?.ownerId);
  const fullGroup = Boolean(
    owner && space.group && ownsGroup(owner.id, space.group, s.ownership),
  );
  const currentRent = ownership
    ? calculateRent(space, s.ownership, s.lastDiceTotal || 7)
    : 0;
  const ownedCount = owner
    ? board.filter(
        (candidate) =>
          candidate.type === space.type &&
          (space.type === "station" || space.type === "utility") &&
          s.ownership[candidate.id]?.ownerId === owner.id,
      ).length
    : 0;
  const activeCount = owner
    ? board.filter(
        (candidate) =>
          candidate.type === space.type &&
          (space.type === "station" || space.type === "utility") &&
          s.ownership[candidate.id]?.ownerId === owner.id &&
          !s.ownership[candidate.id]?.mortgaged,
      ).length
    : 0;
  const rentTier = ownership?.mortgaged
    ? undefined
    : space.type === "property"
      ? ownership?.houses
        ? `house-${ownership.houses}`
        : fullGroup
          ? "full-set"
          : "base"
      : space.type === "station"
        ? owner && activeCount > 0
          ? `station-${Math.max(1, activeCount)}`
          : undefined
        : undefined;
  const direction = s.lang === "he" ? "rtl" : "ltr";

  return (
    <article className={`asset-card asset-${space.type}`} dir={direction}>
      {space.group && (
        <div
          className="asset-group-banner"
          style={{ background: groupColors[space.group] }}
        >
          <span>{ux("group", s.lang)}</span>
          <b>
            {s.lang === "he"
              ? GROUP_LABELS[space.group].he
              : s.lang === "en"
                ? GROUP_LABELS[space.group].en
                : `${GROUP_LABELS[space.group].he} · ${GROUP_LABELS[space.group].en}`}
          </b>
          {fullGroup && <strong>{ux("fullSet", s.lang)}</strong>}
        </div>
      )}
      <header className="asset-title">
        <span className="asset-illustration" aria-hidden="true">
          {space.type === "station"
            ? "🚆"
            : space.type === "utility"
              ? "⚡"
              : "▥"}
        </span>
        <div>
          <h2>{space.name.he}</h2>
          <p>{space.name.en}</p>
        </div>
      </header>

      <section
        className={`asset-owner ${ownership?.mortgaged ? "is-mortgaged" : ""}`}
      >
        <div className="asset-owner-label">{ux("owner", s.lang)}</div>
        {owner ? (
          <div className="asset-owner-value">
            <span
              className="asset-owner-token"
              style={{ background: owner.color }}
            >
              {owner.token}
            </span>
            <b>{owner.name}</b>
          </div>
        ) : (
          <div className="asset-owner-value">
            <span className="asset-owner-token bank-token">₪</span>
            <b>{ux("bank", s.lang)}</b>
            <small>{ux("available", s.lang)}</small>
          </div>
        )}
        {ownership?.mortgaged && (
          <strong className="mortgage-alert">⚠ {ux("mortgage", s.lang)}</strong>
        )}
      </section>

      <div className="asset-facts">
        <div>
          <small>{ux("price", s.lang)}</small>
          <Money value={space.price} />
        </div>
        <div>
          <small>{ux("mortgageValue", s.lang)}</small>
          <Money value={space.mortgage} />
        </div>
        {space.type === "property" && space.buildingCost !== undefined && (
          <div>
            <small>{ux("buildingCost", s.lang)}</small>
            <Money value={space.buildingCost} />
          </div>
        )}
      </div>

      {space.type === "property" && (
        <>
          <section className="asset-building-state">
            <small>{ux("buildings", s.lang)}</small>
            {ownership?.houses ? (
              <div
                className="asset-house-count"
                aria-label={`${ownership.houses >= 5 ? 1 : ownership.houses} ${ownership.houses >= 5 ? "guest house" : "houses"}`}
              >
                {ownership.houses >= 5 ? (
                  <GuestHouseIcon />
                ) : (
                  <HouseIcons count={ownership.houses} />
                )}
                <b>
                  {ownership.houses >= 5
                    ? ux("guestHouse", s.lang)
                    : `${ownership.houses} ${ownership.houses === 1 ? ux("house", s.lang) : ux("houses", s.lang)}`}
                </b>
              </div>
            ) : (
              <b>—</b>
            )}
          </section>
          <section className="asset-rents">
            <div className="asset-section-title">
              {ux("currentRent", s.lang)} <Money value={currentRent} />
            </div>
            <h3>{ux("rentTable", s.lang)}</h3>
            <RentTier
              id="base"
              active={rentTier === "base"}
              label={ux("baseRent", s.lang)}
              value={space.rents?.[0]}
            />
            <RentTier
              id="full-set"
              active={rentTier === "full-set"}
              label={ux("fullRent", s.lang)}
              value={
                space.rents?.[0] === undefined ? undefined : space.rents[0] * 2
              }
            />
            {[1, 2, 3, 4].map((count) => (
              <RentTier
                key={count}
                id={`house-${count}`}
                active={rentTier === `house-${count}`}
                label={`${count} ${count === 1 ? ux("house", s.lang) : ux("houses", s.lang)}`}
                value={space.rents?.[count]}
              />
            ))}
            <RentTier
              id="guest-house"
              active={rentTier === "house-5"}
              label={ux("guestHouse", s.lang)}
              value={space.rents?.[5]}
            />
          </section>
        </>
      )}

      {space.type === "station" && (
        <>
          <div className="asset-count">
            <b>{ux("transportOwned", s.lang)}</b>
            <strong>{ownedCount} / 4</strong>
          </div>
          <section className="asset-rents">
            <div className="asset-section-title">
              {ux("currentRent", s.lang)} <Money value={currentRent} />
            </div>
            {(space.rents ?? []).map((rent, index) => {
              const tierLabel = [
                "oneStation",
                "twoStations",
                "threeStations",
                "fourStations",
              ][index] as
                | "oneStation"
                | "twoStations"
                | "threeStations"
                | "fourStations";
              return (
                <RentTier
                  key={index}
                  id={`station-${index + 1}`}
                  active={rentTier === `station-${index + 1}`}
                  label={ux(tierLabel, s.lang)}
                  value={rent}
                />
              );
            })}
          </section>
        </>
      )}

      {space.type === "utility" && (
        <>
          <div className="asset-count">
            <b>{ux("utilitiesOwned", s.lang)}</b>
            <strong>{ownedCount} / 2</strong>
          </div>
          <section className="asset-rents">
            <div className="asset-section-title">
              {ux("currentRent", s.lang)} <Money value={currentRent} />
            </div>
            <div className={`rent-tier ${activeCount === 1 ? "current" : ""}`}>
              <span>{ux("oneUtility", s.lang)}</span>
            </div>
            <div className={`rent-tier ${activeCount >= 2 ? "current" : ""}`}>
              <span>{ux("twoUtilities", s.lang)}</span>
            </div>
          </section>
        </>
      )}
    </article>
  );
}

export function AssetCardModal({
  spaceId,
  onClose,
}: {
  spaceId: string;
  onClose: () => void;
}) {
  const lang = useGameStore((state) => state.lang);
  const space = board.find((candidate) => candidate.id === spaceId);
  if (!space) return null;
  return (
    <Modal onClose={onClose} className="asset-card-modal">
      <AssetInformation space={space} />
      <button className="secondary full" onClick={onClose}>
        {ui("סגור", "CLOSE", lang)}
      </button>
    </Modal>
  );
}

function RentTier({
  id,
  label,
  value,
  active,
}: {
  id: string;
  label: string;
  value?: number;
  active: boolean;
}) {
  return (
    <div className={`rent-tier ${active ? "current" : ""}`} data-tier={id}>
      <span>{label}</span>
      <Money value={value} />
    </div>
  );
}

function HouseIcons({ count }: { count: number }) {
  return (
    <span className="asset-house-icons">
      {Array.from({ length: count }, (_, index) => (
        <HouseIcon key={index} />
      ))}
    </span>
  );
}

export function HouseIcon() {
  return (
    <svg
      className="house-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.5 11.2 12 3l9.5 8.2v10.3H2.5z"
        fill="#4f9a66"
        stroke="#18302d"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M9 21.5v-7h6v7M5.5 12h3v3h-3zm10 0h3v3h-3z"
        fill="#f6edda"
        stroke="#18302d"
        strokeWidth=".8"
      />
    </svg>
  );
}

export function GuestHouseIcon() {
  return (
    <svg
      className="guest-house-icon"
      viewBox="0 0 36 28"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 12 18 2l16 10v14H2z"
        fill="#d6a83e"
        stroke="#18302d"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 26V14h8v12M5.5 14h5v5h-5zm15 0h5v5h-5z"
        fill="#fff7e8"
        stroke="#18302d"
        strokeWidth=".9"
      />
      <path d="M15 8h6" stroke="#fff7e8" strokeWidth="1.5" />
    </svg>
  );
}
