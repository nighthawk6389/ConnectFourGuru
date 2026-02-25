import { render } from "@testing-library/react";
import ScoreBoard from "@/components/ScoreBoard";

describe("ScoreBoard", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <ScoreBoard score={{ player: 0, ai: 0, draws: 0 }} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it("displays the player score", () => {
    const { getByText } = render(
      <ScoreBoard score={{ player: 3, ai: 1, draws: 2 }} />
    );
    expect(getByText("3")).toBeInTheDocument();
  });

  it("displays the AI score", () => {
    const { getByText } = render(
      <ScoreBoard score={{ player: 0, ai: 5, draws: 0 }} />
    );
    expect(getByText("5")).toBeInTheDocument();
  });

  it("displays the draw count", () => {
    const { getByText } = render(
      <ScoreBoard score={{ player: 0, ai: 0, draws: 4 }} />
    );
    expect(getByText("4")).toBeInTheDocument();
  });

  it("shows all three labels", () => {
    const { getByText } = render(
      <ScoreBoard score={{ player: 0, ai: 0, draws: 0 }} />
    );
    expect(getByText("You")).toBeInTheDocument();
    expect(getByText("Draws")).toBeInTheDocument();
    expect(getByText("CPU")).toBeInTheDocument();
  });
});
