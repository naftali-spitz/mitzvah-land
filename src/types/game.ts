export type Lang = "he" | "en" | "bi";
export type Group =
  | "brown"
  | "lightblue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "blue";
export type SpaceType =
  | "start"
  | "property"
  | "station"
  | "utility"
  | "mazal"
  | "good"
  | "tax"
  | "jail"
  | "free"
  | "go-jail";
export type GamePhase =
  | "SETUP"
  | "WAITING_FOR_ROLL"
  | "ROLLING"
  | "MOVING"
  | "RESOLVING"
  | "PROPERTY_DECISION"
  | "AUCTION"
  | "DEBT"
  | "MANAGEMENT"
  | "GAME_OVER";

export interface Localized {
  he: string;
  en: string;
}
export interface Space {
  id: string;
  index: number;
  type: SpaceType;
  name: Localized;
  subtitle?: Localized;
  group?: Group;
  price?: number;
  rents?: number[];
  mortgage?: number;
  buildingCost?: number;
  tax?: number;
}
export type AiDifficulty = 'easy' | 'medium' | 'hard';
export interface Player {
  isComputer?: boolean;
  aiDifficulty?: AiDifficulty;
  id: string;
  name: string;
  token: string;
  color: string;
  money: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
  getOutCards: number;
}
export interface Ownership {
  ownerId: string;
  mortgaged: boolean;
  houses: number;
}
export type CardEffect =
  | { type: "money"; amount: number }
  | { type: "each"; amount: number }
  | { type: "move"; to: number; collectStart?: boolean }
  | { type: "back"; spaces: number }
  | { type: "jail" }
  | { type: "getout" }
  | { type: "repairs"; house: number; hotel: number };
export interface Card {
  id: string;
  deck: "mazal" | "good";
  text: Localized;
  effect: CardEffect;
}
export interface LogEntry {
  id: string;
  text: string; // Legacy save compatibility
  he?: string;
  en?: string;
}
export type TransactionParty = string | "BANK";
export interface Transaction {
  id: string;
  from: TransactionParty;
  to: TransactionParty;
  amount: number;
  reason: Localized;
  propertyId?: string;
}
export interface Debt {
  amount: number;
  creditorId?: string;
  reason: string;
}
export interface AuctionState {
  spaceId: string;
  highestBid: number;
  highestBidderId?: string;
  passed: string[];
}
export interface TradeDraft {
  targetId: string;
  offerPropertyId?: string;
  requestPropertyId?: string;
  offerCash: number;
  requestCash: number;
}
