import { render } from "vitest-browser-react";

import { DemoModeBanner } from "./DemoModeBanner";

describe("DemoModeBanner", () => {
  it("tells the viewer the app is running on in-browser mock data", async () => {
    const screen = await render(<DemoModeBanner />);

    await expect.element(screen.getByText("Demo mode")).toBeVisible();
    await expect
      .element(screen.getByText(/in-browser mock data, not a real backend/))
      .toBeVisible();
    await expect
      .element(screen.getByText(/reloading the page resets everything/))
      .toBeVisible();
  });
});
