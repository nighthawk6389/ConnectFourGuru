import { render, fireEvent } from "@testing-library/react";
import GameControls from "@/components/GameControls";

const noop = () => {};

const defaultProps = {
  difficulty: "medium" as const,
  onDifficultyChange: noop,
  playerGoesFirst: true,
  onStartingPlayerChange: noop,
  onNewGame: noop,
  thinking: false,
};

describe("GameControls", () => {
  it("renders all five difficulty buttons", () => {
    const { getByText } = render(<GameControls {...defaultProps} />);
    expect(getByText("Easy")).toBeInTheDocument();
    expect(getByText("Medium")).toBeInTheDocument();
    expect(getByText("Hard")).toBeInTheDocument();
    expect(getByText("Guru")).toBeInTheDocument();
    expect(getByText("Victor")).toBeInTheDocument();
  });

  it("renders the New Game button", () => {
    const { getByText } = render(<GameControls {...defaultProps} />);
    expect(getByText("New Game")).toBeInTheDocument();
  });

  it("calls onNewGame when New Game is clicked", () => {
    const handleNewGame = jest.fn();
    const { getByText } = render(
      <GameControls {...defaultProps} onNewGame={handleNewGame} />
    );
    fireEvent.click(getByText("New Game"));
    expect(handleNewGame).toHaveBeenCalledTimes(1);
  });

  it("calls onDifficultyChange with the correct value", () => {
    const handleChange = jest.fn();
    const { getByText } = render(
      <GameControls {...defaultProps} onDifficultyChange={handleChange} />
    );
    fireEvent.click(getByText("Hard"));
    expect(handleChange).toHaveBeenCalledWith("hard");
  });

  it("calls onDifficultyChange with 'victor' when Victor is clicked", () => {
    const handleChange = jest.fn();
    const { getByText } = render(
      <GameControls {...defaultProps} onDifficultyChange={handleChange} />
    );
    fireEvent.click(getByText("Victor"));
    expect(handleChange).toHaveBeenCalledWith("victor");
  });

  it("shows thinking indicator when thinking=true", () => {
    const { getByText } = render(
      <GameControls {...defaultProps} thinking={true} />
    );
    expect(getByText("CPU is thinking…")).toBeInTheDocument();
  });

  it("hides thinking indicator when thinking=false", () => {
    const { queryByText } = render(<GameControls {...defaultProps} />);
    expect(queryByText("CPU is thinking…")).not.toBeInTheDocument();
  });

  it("highlights the active difficulty button", () => {
    const { getByText } = render(
      <GameControls {...defaultProps} difficulty="guru" />
    );
    const guruBtn = getByText("Guru");
    expect(guruBtn.className).toMatch(/bg-blue-500/);
  });

  it("does not highlight inactive difficulty buttons", () => {
    const { getByText } = render(
      <GameControls {...defaultProps} difficulty="easy" />
    );
    const medBtn = getByText("Medium");
    expect(medBtn.className).not.toMatch(/bg-blue-500/);
  });
});

describe("GameControls — first-move toggle", () => {
  it("renders You First and CPU First buttons", () => {
    const { getByText } = render(<GameControls {...defaultProps} />);
    expect(getByText("You First")).toBeInTheDocument();
    expect(getByText("CPU First")).toBeInTheDocument();
  });

  it("highlights You First when playerGoesFirst is true", () => {
    const { getByText } = render(
      <GameControls {...defaultProps} playerGoesFirst={true} />
    );
    expect(getByText("You First").className).toMatch(/bg-red-500/);
    expect(getByText("CPU First").className).not.toMatch(/bg-yellow-500/);
  });

  it("highlights CPU First when playerGoesFirst is false", () => {
    const { getByText } = render(
      <GameControls {...defaultProps} playerGoesFirst={false} />
    );
    expect(getByText("CPU First").className).toMatch(/bg-yellow-500/);
    expect(getByText("You First").className).not.toMatch(/bg-red-500/);
  });

  it("calls onStartingPlayerChange(true) when You First is clicked", () => {
    const handleChange = jest.fn();
    const { getByText } = render(
      <GameControls
        {...defaultProps}
        playerGoesFirst={false}
        onStartingPlayerChange={handleChange}
      />
    );
    fireEvent.click(getByText("You First"));
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("calls onStartingPlayerChange(false) when CPU First is clicked", () => {
    const handleChange = jest.fn();
    const { getByText } = render(
      <GameControls
        {...defaultProps}
        playerGoesFirst={true}
        onStartingPlayerChange={handleChange}
      />
    );
    fireEvent.click(getByText("CPU First"));
    expect(handleChange).toHaveBeenCalledWith(false);
  });
});
