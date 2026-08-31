import { render } from "vitest-browser-react";

import { ConfigurationRequired } from "./ConfigurationRequired";
import { CRM } from "./CRM";
import { getMissingSupabaseEnv } from "../providers/supabase";

const URL_ENV = "VITE_SUPABASE_URL";
const KEY_ENV = "VITE_SB_PUBLISHABLE_KEY";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getMissingSupabaseEnv", () => {
  it("returns an empty array when both required vars are set", () => {
    vi.stubEnv(URL_ENV, "https://example.supabase.co");
    vi.stubEnv(KEY_ENV, "publishable-key");

    expect(getMissingSupabaseEnv()).toEqual([]);
  });

  it("reports the URL var when only it is missing", () => {
    vi.stubEnv(URL_ENV, "");
    vi.stubEnv(KEY_ENV, "publishable-key");

    expect(getMissingSupabaseEnv()).toEqual([URL_ENV]);
  });

  it("reports the publishable key var when only it is missing", () => {
    vi.stubEnv(URL_ENV, "https://example.supabase.co");
    vi.stubEnv(KEY_ENV, "");

    expect(getMissingSupabaseEnv()).toEqual([KEY_ENV]);
  });

  it("reports both vars when both are missing", () => {
    vi.stubEnv(URL_ENV, "");
    vi.stubEnv(KEY_ENV, "");

    expect(getMissingSupabaseEnv()).toEqual([URL_ENV, KEY_ENV]);
  });
});

describe("ConfigurationRequired", () => {
  it("names each missing variable and how to fix it", async () => {
    const screen = await render(
      <ConfigurationRequired missingEnv={[URL_ENV, KEY_ENV]} />,
    );

    await expect
      .element(screen.getByRole("heading", { name: "Configuration required" }))
      .toBeVisible();
    await expect.element(screen.getByText(URL_ENV)).toBeVisible();
    await expect.element(screen.getByText(KEY_ENV)).toBeVisible();
    await expect.element(screen.getByText(/\.env/)).toBeVisible();
  });
});

describe("CRM configuration guard", () => {
  it("renders the guidance screen when a required var is unset", async () => {
    vi.stubEnv(URL_ENV, "https://example.supabase.co");
    vi.stubEnv(KEY_ENV, "");

    const screen = await render(<CRM />);

    await expect
      .element(screen.getByRole("heading", { name: "Configuration required" }))
      .toBeVisible();
    await expect.element(screen.getByText(KEY_ENV)).toBeVisible();
  });
});
