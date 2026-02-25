import { render, screen } from "@testing-library/react";
import React from "react";
import Cell from "@/components/Cell";
import { EMPTY, PLAYER, AI } from "@/lib/constants";

describe("Cell", () => {
  it("renders without crashing for an empty cell", () => {
    const { container } = render(
      <Cell value={EMPTY} isWinCell={false} isHovered={false} row={0} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders without crashing for a player piece", () => {
    const { container } = render(
      <Cell value={PLAYER} isWinCell={false} isHovered={false} row={3} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders without crashing for an AI piece", () => {
    const { container } = render(
      <Cell value={AI} isWinCell={false} isHovered={false} row={5} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it("applies red background class for player piece", () => {
    const { container } = render(
      <Cell value={PLAYER} isWinCell={false} isHovered={false} row={0} />
    );
    const disc = container.querySelector(".bg-red-500");
    expect(disc).toBeInTheDocument();
  });

  it("applies yellow background class for AI piece", () => {
    const { container } = render(
      <Cell value={AI} isWinCell={false} isHovered={false} row={0} />
    );
    const disc = container.querySelector(".bg-yellow-400");
    expect(disc).toBeInTheDocument();
  });

  it("applies dark background for an empty cell", () => {
    const { container } = render(
      <Cell value={EMPTY} isWinCell={false} isHovered={false} row={0} />
    );
    const disc = container.querySelector(".bg-blue-950");
    expect(disc).toBeInTheDocument();
  });

  it("applies hover styling when isHovered and cell is empty", () => {
    const { container } = render(
      <Cell value={EMPTY} isWinCell={false} isHovered={true} row={0} />
    );
    const disc = container.querySelector(".bg-red-200");
    expect(disc).toBeInTheDocument();
  });

  it("does not apply hover styling to filled cells", () => {
    const { container } = render(
      <Cell value={PLAYER} isWinCell={false} isHovered={true} row={0} />
    );
    const disc = container.querySelector(".bg-red-200");
    expect(disc).not.toBeInTheDocument();
  });

  it("applies scale-110 class for a winning cell", () => {
    const { container } = render(
      <Cell value={PLAYER} isWinCell={true} isHovered={false} row={0} />
    );
    const disc = container.querySelector(".scale-110");
    expect(disc).toBeInTheDocument();
  });

  it("applies piece-drop animation class for a filled cell", () => {
    const { container } = render(
      <Cell value={AI} isWinCell={false} isHovered={false} row={2} />
    );
    const disc = container.querySelector(".piece-drop");
    expect(disc).toBeInTheDocument();
  });

  it("sets --drop-rows CSS variable for a filled cell", () => {
    const { container } = render(
      <Cell value={PLAYER} isWinCell={false} isHovered={false} row={4} />
    );
    const disc = container.querySelector(".piece-drop") as HTMLElement | null;
    expect(disc?.style.getPropertyValue("--drop-rows")).toBe("4");
  });

  // ---------------------------------------------------------------------------
  // win-pulse animation (new feature)
  // ---------------------------------------------------------------------------

  it("applies win-pulse class to a winning cell", () => {
    const { container } = render(
      <Cell value={PLAYER} isWinCell={true} isHovered={false} row={0} />
    );
    const disc = container.querySelector(".win-pulse");
    expect(disc).toBeInTheDocument();
  });

  it("does NOT apply win-pulse class to a non-winning filled cell", () => {
    const { container } = render(
      <Cell value={PLAYER} isWinCell={false} isHovered={false} row={0} />
    );
    const disc = container.querySelector(".win-pulse");
    expect(disc).not.toBeInTheDocument();
  });

  it("does NOT apply win-pulse class to an empty cell", () => {
    const { container } = render(
      <Cell value={EMPTY} isWinCell={false} isHovered={false} row={0} />
    );
    const disc = container.querySelector(".win-pulse");
    expect(disc).not.toBeInTheDocument();
  });

  it("applies win-pulse class to a winning AI cell", () => {
    const { container } = render(
      <Cell value={AI} isWinCell={true} isHovered={false} row={0} />
    );
    const disc = container.querySelector(".win-pulse");
    expect(disc).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // React.memo — verify the component is memoised
  // ---------------------------------------------------------------------------

  it("is wrapped with React.memo", () => {
    // React.memo wraps the component in an object whose $$typeof is Symbol(react.memo)
    // We check that re-rendering with identical props does not unmount/remount.
    const renderSpy = jest.fn();

    // Render twice with same props — a non-memoised component would re-render
    // both times, but with React.memo the second render is skipped.
    // We test this indirectly: the component type should be a memo object.
    const CellModule = require("@/components/Cell");
    const CellDefault = CellModule.default;

    // React.memo components have a $$typeof of Symbol(react.memo)
    expect(CellDefault.$$typeof?.toString()).toContain("react.memo");
  });
});
