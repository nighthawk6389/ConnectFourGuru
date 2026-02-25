import { render } from "@testing-library/react";
import WinnerModal from "@/components/WinnerModal";
import { PLAYER, AI } from "@/lib/constants";
import { WinResult } from "@/lib/game";

const noop = () => {};

const playerWin: WinResult = {
  winner: PLAYER,
  cells: [
    [5, 0],
    [5, 1],
    [5, 2],
    [5, 3],
  ],
};

const aiWin: WinResult = {
  winner: AI,
  cells: [
    [5, 3],
    [4, 3],
    [3, 3],
    [2, 3],
  ],
};

describe("WinnerModal", () => {
  it("renders nothing when there is no winner and no draw", () => {
    const { container } = render(
      <WinnerModal winResult={null} isDraw={false} onNewGame={noop} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows 'You Win!' when the player wins", () => {
    const { getByText } = render(
      <WinnerModal winResult={playerWin} isDraw={false} onNewGame={noop} />
    );
    expect(getByText("You Win!")).toBeInTheDocument();
  });

  it("shows 'CPU Wins!' when the AI wins", () => {
    const { getByText } = render(
      <WinnerModal winResult={aiWin} isDraw={false} onNewGame={noop} />
    );
    expect(getByText("CPU Wins!")).toBeInTheDocument();
  });

  it("shows draw message when isDraw=true", () => {
    const { getByText } = render(
      <WinnerModal winResult={null} isDraw={true} onNewGame={noop} />
    );
    expect(getByText("It's a Draw!")).toBeInTheDocument();
  });

  it("shows the Play Again button", () => {
    const { getByText } = render(
      <WinnerModal winResult={playerWin} isDraw={false} onNewGame={noop} />
    );
    expect(getByText("Play Again")).toBeInTheDocument();
  });

  it("calls onNewGame when Play Again is clicked", () => {
    const handleNewGame = jest.fn();
    const { getByText } = render(
      <WinnerModal winResult={playerWin} isDraw={false} onNewGame={handleNewGame} />
    );
    getByText("Play Again").click();
    expect(handleNewGame).toHaveBeenCalledTimes(1);
  });

  it("shows player sub-line text for player win", () => {
    const { getByText } = render(
      <WinnerModal winResult={playerWin} isDraw={false} onNewGame={noop} />
    );
    expect(getByText("Amazing — you beat the AI!")).toBeInTheDocument();
  });

  it("shows AI sub-line text for AI win", () => {
    const { getByText } = render(
      <WinnerModal winResult={aiWin} isDraw={false} onNewGame={noop} />
    );
    expect(getByText("Better luck next time.")).toBeInTheDocument();
  });

  it("draw takes priority over null winResult", () => {
    const { getByText } = render(
      <WinnerModal winResult={null} isDraw={true} onNewGame={noop} />
    );
    expect(getByText("It's a Draw!")).toBeInTheDocument();
    expect(getByText("Nobody wins this time.")).toBeInTheDocument();
  });
});
