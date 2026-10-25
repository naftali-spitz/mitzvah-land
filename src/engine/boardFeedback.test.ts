import { describe, expect, it } from "vitest";
import { boardChangeLabel, detectBoardChange } from "./boardFeedback";
import type { Ownership } from "../types/game";

const asset = (houses = 0, mortgaged = false, ownerId = "p1"): Ownership => ({
  ownerId,
  houses,
  mortgaged,
});

describe("board animation events", () => {
  it("detects a purchase or a transferred property", () => {
    expect(detectBoardChange({}, { "bnei-brak": asset() })).toEqual({
      spaceId: "bnei-brak",
      kind: "purchase",
    });
    expect(
      detectBoardChange(
        { "bnei-brak": asset() },
        { "bnei-brak": asset(0, false, "p2") },
      ),
    ).toEqual({ spaceId: "bnei-brak", kind: "transfer" });
  });

  it("distinguishes houses, guest houses, and building sales", () => {
    const previous = { "bnei-brak": asset(2) };
    expect(detectBoardChange(previous, { "bnei-brak": asset(3) })?.kind).toBe("build");
    expect(detectBoardChange({ "bnei-brak": asset(4) }, { "bnei-brak": asset(5) })?.kind).toBe("hotel");
    expect(detectBoardChange(previous, { "bnei-brak": asset(1) })?.kind).toBe("sell");
  });

  it("distinguishes mortgage and redemption", () => {
    expect(
      detectBoardChange(
        { "bnei-brak": asset() },
        { "bnei-brak": asset(0, true) },
      )?.kind,
    ).toBe("mortgage");
    expect(
      detectBoardChange(
        { "bnei-brak": asset(0, true) },
        { "bnei-brak": asset() },
      )?.kind,
    ).toBe("unmortgage");
  });

  it("does not invent events when assets have not changed", () => {
    expect(detectBoardChange({}, {})).toBeUndefined();
    expect(
      detectBoardChange(
        { "bnei-brak": asset(2) },
        { "bnei-brak": asset(2) },
      ),
    ).toBeUndefined();
  });

  it("provides Hebrew, English, and bilingual labels", () => {
    expect(boardChangeLabel("build", "he")).toContain("בית");
    expect(boardChangeLabel("mortgage", "en")).toBe("MORTGAGED");
    expect(boardChangeLabel("purchase", "bi")).toContain("PURCHASED");
  });
});
