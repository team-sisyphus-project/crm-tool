import type { DataProvider } from "ra-core";
import { describe, expect, it, vi } from "vitest";

import type { Contact } from "../../types";
import { mergeContacts } from "./mergeContacts";

const buildContact = (contact: Partial<Contact> & Pick<Contact, "id">) =>
  ({
    first_name: "Jane",
    last_name: "Doe",
    title: "Designer",
    email_jsonb: [],
    phone_jsonb: [],
    first_seen: "2026-01-01T00:00:00.000Z",
    last_seen: "2026-01-01T00:00:00.000Z",
    has_newsletter: false,
    tags: [],
    gender: "female",
    status: "cold",
    background: "",
    ...contact,
  }) as Contact;

/**
 * Minimal in-memory dataProvider: only the methods mergeContacts calls, with
 * the related-record lookups returning nothing so the assertions stay focused
 * on the winner's merged payload.
 */
const buildDataProvider = (contacts: Contact[]) => {
  const update = vi.fn().mockResolvedValue({ data: {} });
  return {
    getOne: vi.fn(async (_resource: string, { id }: { id: unknown }) => {
      const data = contacts.find((contact) => contact.id === id);
      if (!data) throw new Error(`No contact ${String(id)}`);
      return { data };
    }),
    getManyReference: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getList: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    update,
    delete: vi.fn().mockResolvedValue({ data: {} }),
  } as unknown as DataProvider & { update: typeof update };
};

const updatedContactData = (dataProvider: {
  update: ReturnType<typeof vi.fn>;
}) =>
  dataProvider.update.mock.calls.find(
    ([resource]) => resource === "contacts",
  )?.[1].data as Partial<Contact>;

describe("mergeContacts", () => {
  it("keeps the winner's campaign status when it has one", async () => {
    // Arrange
    const dataProvider = buildDataProvider([
      buildContact({ id: 1, campaign_status: "active" }),
      buildContact({ id: 2, campaign_status: "completed" }),
    ]);

    // Act
    await mergeContacts(2, 1, dataProvider);

    // Assert
    expect(updatedContactData(dataProvider).campaign_status).toBe("active");
  });

  it("falls back to the loser's campaign status when the winner has none", async () => {
    // Arrange
    const dataProvider = buildDataProvider([
      buildContact({ id: 1, campaign_status: null }),
      buildContact({ id: 2, campaign_status: "planning" }),
    ]);

    // Act
    await mergeContacts(2, 1, dataProvider);

    // Assert
    expect(updatedContactData(dataProvider).campaign_status).toBe("planning");
  });

  it("leaves the campaign status empty when neither contact has one", async () => {
    // Arrange
    const dataProvider = buildDataProvider([
      buildContact({ id: 1 }),
      buildContact({ id: 2 }),
    ]);

    // Act
    await mergeContacts(2, 1, dataProvider);

    // Assert
    expect(updatedContactData(dataProvider).campaign_status).toBeUndefined();
  });
});
