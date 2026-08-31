import { render } from "vitest-browser-react";

import { CRM } from "./CRM";
import { getMissingSupabaseEnv } from "../providers/supabase";

const URL_ENV = "VITE_SUPABASE_URL";
const KEY_ENV = "VITE_SB_PUBLISHABLE_KEY";
const DEMO_ENV = "VITE_IS_DEMO";

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

describe("CRM demo-mode fallback", () => {
  it("mounts the app with a mock-data banner when a required var is unset", async () => {
    vi.stubEnv(URL_ENV, "https://example.supabase.co");
    vi.stubEnv(KEY_ENV, "");

    const screen = await render(<CRM />);

    await expect.element(screen.getByRole("status")).toBeVisible();
    await expect.element(screen.getByText(/Demo mode/)).toBeVisible();
  });

  it("mounts the app with a mock-data banner when demo mode is forced", async () => {
    vi.stubEnv(URL_ENV, "https://example.supabase.co");
    vi.stubEnv(KEY_ENV, "publishable-key");
    vi.stubEnv(DEMO_ENV, "true");

    const screen = await render(<CRM />);

    await expect.element(screen.getByRole("status")).toBeVisible();
    await expect.element(screen.getByText(/Demo mode/)).toBeVisible();
  });
});
