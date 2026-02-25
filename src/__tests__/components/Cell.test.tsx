import { render, screen } from "@testing-library/react";
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
});
