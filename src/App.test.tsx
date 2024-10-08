import { expect, test } from "vitest";
import { act, render, screen } from "@testing-library/react";
import App from "./App";

test("renders count button", () => {
  render(<App />);
  const countButton = screen.getByText(/count is 0/i);
  expect(countButton).toBeDefined();
});

test("increments count", () => {
  render(<App />);
  const countButton = screen.getByText(/count is 0/i);

  act(() => {
    countButton.click();
  });

  expect(screen.getByText(/count is 1/i)).toBeDefined();
});
