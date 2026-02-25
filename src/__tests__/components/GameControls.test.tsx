import { render, fireEvent } from "@testing-library/react";
import GameControls from "@/components/GameControls";

const noop = () => {};

describe("GameControls", () => {
  it("renders all four difficulty buttons", () => {
    const { getByText } = render(
      <GameControls
        difficulty="medium"
        onDifficultyChange={noop}
        onNewGame={noop}
        thinking={false}
      />
    );
    expect(getByText("Easy")).toBeInTheDocument();
    expect(getByText("Medium")).toBeInTheDocument();
    expect(getByText("Hard")).toBeInTheDocument();
    expect(getByText("Guru")).toBeInTheDocument();
  });

  it("renders the New Game button", () => {
    const { getByText } = render(
      <GameControls
        difficulty="medium"
        onDifficultyChange={noop}
        onNewGame={noop}
        thinking={false}
      />
    );
    expect(getByText("New Game")).toBeInTheDocument();
  });

  it("calls onNewGame when New Game is clicked", () => {
    const handleNewGame = jest.fn();
    const { getByText } = render(
      <GameControls
        difficulty="medium"
        onDifficultyChange={noop}
        onNewGame={handleNewGame}
        thinking={false}
      />
    );
    fireEvent.click(getByText("New Game"));
    expect(handleNewGame).toHaveBeenCalledTimes(1);
  });

  it("calls onDifficultyChange with the correct value", () => {
    const handleChange = jest.fn();
    const { getByText } = render(
      <GameControls
        difficulty="medium"
        onDifficultyChange={handleChange}
        onNewGame={noop}
        thinking={false}
      />
    );
    fireEvent.click(getByText("Hard"));
    expect(handleChange).toHaveBeenCalledWith("hard");
  });

  it("shows thinking indicator when thinking=true", () => {
    const { getByText } = render(
      <GameControls
        difficulty="medium"
        onDifficultyChange={noop}
        onNewGame={noop}
        thinking={true}
      />
    );
    expect(getByText("CPU is thinking…")).toBeInTheDocument();
  });

  it("hides thinking indicator when thinking=false", () => {
    const { queryByText } = render(
      <GameControls
        difficulty="medium"
        onDifficultyChange={noop}
        onNewGame={noop}
        thinking={false}
      />
    );
    expect(queryByText("CPU is thinking…")).not.toBeInTheDocument();
  });

  it("highlights the active difficulty button", () => {
    const { getByText } = render(
      <GameControls
        difficulty="guru"
        onDifficultyChange={noop}
        onNewGame={noop}
        thinking={false}
      />
    );
    const guruBtn = getByText("Guru");
    expect(guruBtn.className).toMatch(/bg-blue-500/);
  });

  it("does not highlight inactive difficulty buttons", () => {
    const { getByText } = render(
      <GameControls
        difficulty="easy"
        onDifficultyChange={noop}
        onNewGame={noop}
        thinking={false}
      />
    );
    const medBtn = getByText("Medium");
    expect(medBtn.className).not.toMatch(/bg-blue-500/);
  });
});
