import { render, screen, fireEvent } from "@testing-library/react";
import Board from "@/components/Board";
import { emptyBoard, dropPiece } from "@/lib/game";
import { PLAYER, ROWS, COLS } from "@/lib/constants";

const noop = () => {};

describe("Board", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <Board
        board={emptyBoard()}
        winResult={null}
        hoverCol={null}
        phase="player"
        onColClick={noop}
        onColHover={noop}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it(`renders ${ROWS * COLS + COLS} cells (grid cells + column buttons)`, () => {
    const { container } = render(
      <Board
        board={emptyBoard()}
        winResult={null}
        hoverCol={null}
        phase="player"
        onColClick={noop}
        onColHover={noop}
      />
    );
    // ROWS*COLS cell divs + COLS column-button divs
    const grid = container.querySelector(".grid");
    expect(grid?.children).toHaveLength(ROWS * COLS + COLS);
  });

  it("calls onColClick with the correct column index when a cell is clicked", () => {
    const handleClick = jest.fn();
    const { container } = render(
      <Board
        board={emptyBoard()}
        winResult={null}
        hoverCol={null}
        phase="player"
        onColClick={handleClick}
        onColHover={noop}
      />
    );
    // The first cell div in the grid (after the COLS header buttons) is row 0, col 0
    const grid = container.querySelector(".grid")!;
    const firstCell = grid.children[COLS] as HTMLElement; // skip header buttons
    fireEvent.click(firstCell);
    expect(handleClick).toHaveBeenCalledWith(0);
  });

  it("does not call onColClick during 'thinking' phase", () => {
    const handleClick = jest.fn();
    const { container } = render(
      <Board
        board={emptyBoard()}
        winResult={null}
        hoverCol={null}
        phase="thinking"
        onColClick={handleClick}
        onColHover={noop}
      />
    );
    const grid = container.querySelector(".grid")!;
    const firstCell = grid.children[COLS] as HTMLElement;
    fireEvent.click(firstCell);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("calls onColHover when mouse enters a cell", () => {
    const handleHover = jest.fn();
    const { container } = render(
      <Board
        board={emptyBoard()}
        winResult={null}
        hoverCol={null}
        phase="player"
        onColClick={noop}
        onColHover={handleHover}
      />
    );
    const grid = container.querySelector(".grid")!;
    const firstCell = grid.children[COLS] as HTMLElement;
    fireEvent.mouseEnter(firstCell);
    expect(handleHover).toHaveBeenCalledWith(0);
  });

  it("calls onColHover(null) when mouse leaves the board", () => {
    const handleHover = jest.fn();
    const { container } = render(
      <Board
        board={emptyBoard()}
        winResult={null}
        hoverCol={null}
        phase="player"
        onColClick={noop}
        onColHover={handleHover}
      />
    );
    const boardDiv = container.firstChild as HTMLElement;
    fireEvent.mouseLeave(boardDiv);
    expect(handleHover).toHaveBeenCalledWith(null);
  });

  it("shows bounce indicator in the hover column header", () => {
    const { container } = render(
      <Board
        board={emptyBoard()}
        winResult={null}
        hoverCol={2}
        phase="player"
        onColClick={noop}
        onColHover={noop}
      />
    );
    const indicator = container.querySelector(".animate-bounce");
    expect(indicator).toBeInTheDocument();
  });

  it("does not show bounce indicator when not hovering", () => {
    const { container } = render(
      <Board
        board={emptyBoard()}
        winResult={null}
        hoverCol={null}
        phase="player"
        onColClick={noop}
        onColHover={noop}
      />
    );
    expect(container.querySelector(".animate-bounce")).not.toBeInTheDocument();
  });
});
