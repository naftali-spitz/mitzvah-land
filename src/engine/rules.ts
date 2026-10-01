import { board } from "../data/board";
import type { Ownership, Player, Space } from "../types/game";

export const START_SALARY = 200;
export const JAIL_FINE = 50;

export function ownedSpaces(
  playerId: string,
  ownership: Record<string, Ownership>,
): Space[] {
  return board.filter((s) => ownership[s.id]?.ownerId === playerId);
}

export function groupSpaces(group: Space["group"]): Space[] {
  return board.filter((s) => s.type === "property" && s.group === group);
}

export function ownsGroup(
  playerId: string,
  group: Space["group"],
  ownership: Record<string, Ownership>,
): boolean {
  if (!group) return false;
  const spaces = groupSpaces(group);
  return (
    spaces.length > 0 &&
    spaces.every((s) => ownership[s.id]?.ownerId === playerId)
  );
}

export function calculateRent(
  space: Space,
  ownership: Record<string, Ownership>,
  diceTotal = 7,
): number {
  const own = ownership[space.id];
  if (!own || own.mortgaged) return 0;
  if (space.type === "station") {
    const count = board.filter(
      (s) =>
        s.type === "station" &&
        ownership[s.id]?.ownerId === own.ownerId &&
        !ownership[s.id]?.mortgaged,
    ).length;
    return [0, 25, 50, 100, 200][count] ?? 0;
  }
  if (space.type === "utility") {
    const count = board.filter(
      (s) =>
        s.type === "utility" &&
        ownership[s.id]?.ownerId === own.ownerId &&
        !ownership[s.id]?.mortgaged,
    ).length;
    return diceTotal * (count >= 2 ? 10 : 4);
  }
  if (space.type === "property" && space.rents) {
    if (own.houses > 0)
      return space.rents[Math.min(5, own.houses)] ?? space.rents[0];
    const base = space.rents[0];
    return ownsGroup(own.ownerId, space.group, ownership) ? base * 2 : base;
  }
  return 0;
}

export function canBuild(
  playerId: string,
  space: Space,
  ownership: Record<string, Ownership>,
): boolean {
  const own = ownership[space.id];
  if (
    space.type !== "property" ||
    !space.group ||
    !own ||
    own.ownerId !== playerId ||
    own.houses >= 5
  )
    return false;
  if (!ownsGroup(playerId, space.group, ownership)) return false;
  const group = groupSpaces(space.group);
  if (group.some((s) => ownership[s.id]?.mortgaged)) return false;
  const min = Math.min(...group.map((s) => ownership[s.id]?.houses ?? 0));
  return own.houses === min;
}

export type BuildBlockReason =
  | "not-property"
  | "not-owned"
  | "incomplete-group"
  | "group-mortgaged"
  | "unbalanced"
  | "max-buildings"
  | "insufficient-funds";

export function buildBlockReason(
  playerId: string,
  money: number,
  space: Space,
  ownership: Record<string, Ownership>,
): BuildBlockReason | undefined {
  const own = ownership[space.id];
  if (space.type !== "property" || !space.group || !space.buildingCost)
    return "not-property";
  if (!own || own.ownerId !== playerId) return "not-owned";
  if (!ownsGroup(playerId, space.group, ownership)) return "incomplete-group";
  if (groupSpaces(space.group).some((s) => ownership[s.id]?.mortgaged))
    return "group-mortgaged";
  if (own.houses >= 5) return "max-buildings";
  const min = Math.min(
    ...groupSpaces(space.group).map((s) => ownership[s.id]?.houses ?? 0),
  );
  if (own.houses !== min) return "unbalanced";
  if (money < space.buildingCost) return "insufficient-funds";
  return undefined;
}

export function canSellBuilding(
  playerId: string,
  space: Space,
  ownership: Record<string, Ownership>,
): boolean {
  const own = ownership[space.id];
  if (
    space.type !== "property" ||
    !space.group ||
    !own ||
    own.ownerId !== playerId ||
    own.houses <= 0
  )
    return false;
  const group = groupSpaces(space.group);
  const max = Math.max(...group.map((s) => ownership[s.id]?.houses ?? 0));
  return own.houses === max;
}

export function canMortgage(
  playerId: string,
  space: Space,
  ownership: Record<string, Ownership>,
): boolean {
  const own = ownership[space.id];
  if (!own || own.ownerId !== playerId || own.mortgaged) return false;
  if (space.type === "property" && space.group) {
    return groupSpaces(space.group).every(
      (s) => (ownership[s.id]?.houses ?? 0) === 0,
    );
  }
  return true;
}

export function netWorth(
  player: Player,
  ownership: Record<string, Ownership>,
): number {
  let total = player.money;
  for (const s of ownedSpaces(player.id, ownership)) {
    const o = ownership[s.id];
    total += o.mortgaged ? (s.mortgage ?? 0) : (s.price ?? 0);
    if (o.houses > 0) total += (o.houses * (s.buildingCost ?? 0)) / 2;
  }
  return Math.round(total);
}
