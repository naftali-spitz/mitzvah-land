import type { Lang, Localized } from "../types/game";

export const UX = {
  owner: { he: "בעלים", en: "OWNER" },
  bank: { he: "הבנק", en: "BANK" },
  fullSet: { he: "✓ קבוצה מלאה", en: "✓ FULL SET" },
  groupProgress: { he: "התקדמות קבוצה", en: "GROUP PROGRESS" },
  mortgage: { he: "ממושכן", en: "MORTGAGED" },
  unMortgage: { he: "פדה משכון", en: "UNMORTGAGE" },
  currentRent: { he: "שכירות נוכחית", en: "CURRENT RENT" },
  price: { he: "מחיר רכישה", en: "PURCHASE PRICE" },
  group: { he: "קבוצה", en: "GROUP" },
  complete: { he: "קבוצה מלאה", en: "FULL SET" },
  available: { he: "זמין לרכישה", en: "AVAILABLE TO BUY" },
  transportRent: { he: "תחנות בבעלות", en: "TRANSPORT OWNED" },
  utilityRent: { he: "חברות שירות בבעלות", en: "UTILITIES OWNED" },
  mortgageValue: { he: "ערך משכון", en: "MORTGAGE VALUE" },
  trade: { he: "עסקה", en: "Trade" },
  card: { he: "כרטיס", en: "Card" },
  rentTable: { he: "טבלת שכירות", en: "RENT TABLE" },
  baseRent: { he: "בסיס", en: "Base" },
  fullRent: { he: "סט מלא", en: "Full set" },
  house: { he: "בית", en: "House" },
  houses: { he: "בתים", en: "Houses" },
  guestHouse: { he: "בית הארחה", en: "Guest house" },
  buildingCost: { he: "עלות בנייה", en: "BUILD COST" },
  transportOwned: { he: "תחנות בבעלות", en: "TRANSPORT OWNED" },
  oneStation: { he: "תחנה אחת בבעלות", en: "1 station owned" },
  twoStations: { he: "2 תחנות בבעלות", en: "2 stations owned" },
  threeStations: { he: "3 תחנות בבעלות", en: "3 stations owned" },
  fourStations: { he: "4 תחנות בבעלות", en: "4 stations owned" },
  utilitiesOwned: { he: "חברות שירות בבעלות", en: "UTILITIES OWNED" },
  oneUtility: { he: "חברת שירות אחת · קוביות × 4", en: "1 utility · Dice × 4" },
  twoUtilities: {
    he: "2 חברות שירות · קוביות × 10",
    en: "2 utilities · Dice × 10",
  },
  cannotBuild: { he: "⚠ לא ניתן לבנות", en: "⚠ CANNOT BUILD" },
  canBuild: { he: "🏠 אפשר לבנות", en: "🏠 CAN BUILD" },
  needFullSet: {
    he: "צריך להשלים את קבוצת הצבע",
    en: "Complete the color group first",
  },
  groupMortgaged: {
    he: "נכס בקבוצה ממושכן",
    en: "A property in this group is mortgaged",
  },
  buildBalanced: {
    he: "צריך לבנות בצורה מאוזנת בקבוצה",
    en: "Build evenly across the group",
  },
  maxBuildings: {
    he: "כבר הגעת למספר הבתים המרבי",
    en: "This property is fully built",
  },
  notOwned: { he: "הנכס אינו בבעלותך", en: "You do not own this property" },
  insufficientFunds: {
    he: "אין מספיק זוזים לבנייה",
    en: "Not enough Zuzim to build",
  },
  mortgageHasBuildings: {
    he: "יש למכור את הבתים לפני משכון",
    en: "Sell all buildings before mortgaging",
  },
  buildings: { he: "בניינים", en: "BUILDINGS" },
  goSalary: { he: "עברת ב״יוצאים לדרך״", en: "Passed GO" },
  propertyPurchase: { he: "רכישת נכס", en: "Property purchase" },
  auctionPurchase: { he: "זכייה במכרז", en: "Auction purchase" },
  rent: { he: "שכירות", en: "Rent" },
  tax: { he: "מס", en: "Tax" },
  jackpot: { he: "קופת חניה חופשית", en: "Free Parking jackpot" },
  jailFine: { he: "קנס יציאה מהפקק", en: "Traffic release fine" },
  mortgageIncome: { he: "משכון נכס", en: "Mortgage" },
  mortgagePayment: { he: "פדיון משכון", en: "Unmortgage" },
  houseBuilt: { he: "בניית בית", en: "House built" },
  houseSold: { he: "מכירת בית", en: "House sold" },
  debtPayment: { he: "תשלום חוב", en: "Debt payment" },
  repairs: { he: "תיקוני נכסים", en: "Property repairs" },
  paid: { he: "שילם", en: "paid" },
  received: { he: "קיבל", en: "received" },
  from: { he: "מאת", en: "from" },
  to: { he: "אל", en: "to" },
  for: { he: "עבור", en: "for" },
  transaction: { he: "תנועת זוזים", en: "ZUZIM TRANSFER" },
  dismiss: { he: "סגירה", en: "Close" },
  playerPays: { he: "שחקן שילם לשחקן", en: "Player paid player" },
} satisfies Record<string, Localized>;

export type UXKey = keyof typeof UX;

export function ux(key: UXKey, lang: Lang): string {
  const label = UX[key];
  return lang === "he"
    ? label.he
    : lang === "en"
      ? label.en
      : `${label.he} · ${label.en}`;
}

export function localized(he: string, en: string): Localized {
  return { he, en };
}

export const GROUP_LABELS: Record<string, Localized> = {
  brown: localized("חום", "BROWN"),
  lightblue: localized("תכלת", "LIGHT BLUE"),
  pink: localized("ורוד", "PINK"),
  orange: localized("כתום", "ORANGE"),
  red: localized("אדום", "RED"),
  yellow: localized("צהוב", "YELLOW"),
  green: localized("ירוק", "GREEN"),
  blue: localized("כחול", "BLUE"),
};
