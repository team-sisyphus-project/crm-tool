import { describe, expect, it, vi } from "vitest";
import type { DataProvider } from "ra-core";

import type { Company, Contact, Tag } from "../types";
import type { DuplicatePolicy, ImportOutcomes } from "./import/duplicates";
import type { ContactImportSchema } from "./useContactImport";
import { createImportRun, importContactBatch } from "./useContactImport";

const TODAY = "2026-09-10T00:00:00.000Z";

const row = (values: Partial<ContactImportSchema>): ContactImportSchema =>
  values as ContactImportSchema;

const jane = {
  id: 9,
  first_name: "Jane",
  last_name: "Roe",
  title: "Analyst",
  email_jsonb: [{ email: "jane@acme.example", type: "Work" }],
  phone_jsonb: [],
  tags: [],
  sales_id: 7,
} as unknown as Contact;

/**
 * A data provider that answers the email search with whatever contacts it was
 * given, and records every write.
 */
const fakeDataProvider = (contacts: Contact[] = []) => {
  const getList = vi.fn(async () => ({
    data: contacts,
    total: contacts.length,
  }));
  const create = vi.fn(
    async (_resource: string, params: { data: unknown }) => ({
      data: { id: 100, ...(params.data as object) },
    }),
  );
  const update = vi.fn(
    async (_resource: string, params: { data: unknown }) => ({
      data: { id: 9, ...(params.data as object) },
    }),
  );

  return { getList, create, update } as unknown as DataProvider & {
    getList: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

/** The whole result of one batch: how its rows settled, and what failed. */
const importBatchResult = (
  dataProvider: ReturnType<typeof fakeDataProvider>,
  batch: ContactImportSchema[],
  policy: DuplicatePolicy,
  options: {
    run?: ReturnType<typeof createImportRun>;
    companies?: Map<string, Company>;
    tags?: Map<string, Tag>;
  } = {},
) =>
  importContactBatch({
    batch,
    policy,
    dataProvider,
    run: options.run ?? createImportRun(),
    companies: options.companies ?? new Map<string, Company>(),
    tags: options.tags ?? new Map<string, Tag>(),
    salesId: 7,
    today: TODAY,
  });

/** The outcome counters alone, for the cases that do not expect a failure. */
const importBatch = (
  ...args: Parameters<typeof importBatchResult>
): Promise<ImportOutcomes> =>
  importBatchResult(...args).then((result) => result.outcomes);

describe("importContactBatch", () => {
  it("creates a contact the CRM does not have yet", async () => {
    const dataProvider = fakeDataProvider([]);

    const outcomes = await importBatch(
      dataProvider,
      [
        row({
          first_name: "Sam",
          last_name: "Doe",
          email_work: "sam@acme.example",
        }),
      ],
      "skip",
    );

    expect(outcomes).toEqual({ created: 1, updated: 0, skipped: 0 });
    expect(dataProvider.create).toHaveBeenCalledTimes(1);
    expect(dataProvider.create.mock.calls[0][1].data).toMatchObject({
      first_name: "Sam",
      email_jsonb: [{ email: "sam@acme.example", type: "Work" }],
      sales_id: 7,
      first_seen: TODAY,
    });
  });

  it("leaves an existing contact untouched under the skip policy", async () => {
    const dataProvider = fakeDataProvider([jane]);

    const outcomes = await importBatch(
      dataProvider,
      [
        row({
          first_name: "Jane",
          last_name: "Roe",
          title: "Head of Analytics",
          email_work: "jane@acme.example",
        }),
      ],
      "skip",
    );

    expect(outcomes).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(dataProvider.create).not.toHaveBeenCalled();
    expect(dataProvider.update).not.toHaveBeenCalled();
  });

  it("patches the existing contact under the update policy", async () => {
    const dataProvider = fakeDataProvider([jane]);

    const outcomes = await importBatch(
      dataProvider,
      [
        row({
          first_name: "Jane",
          last_name: "Roe",
          title: "Head of Analytics",
          email_work: "jane@acme.example",
        }),
      ],
      "update",
    );

    expect(outcomes).toEqual({ created: 0, updated: 1, skipped: 0 });
    expect(dataProvider.create).not.toHaveBeenCalled();
    expect(dataProvider.update).toHaveBeenCalledTimes(1);

    const [resource, params] = dataProvider.update.mock.calls[0];
    expect(resource).toBe("contacts");
    expect(params.id).toBe(9);
    expect(params.data).toEqual({
      first_name: "Jane",
      last_name: "Roe",
      title: "Head of Analytics",
    });
  });

  it("matches an existing contact whatever the case of the address", async () => {
    const dataProvider = fakeDataProvider([jane]);

    const outcomes = await importBatch(
      dataProvider,
      [row({ first_name: "Jane", email_work: "  JANE@Acme.Example " })],
      "skip",
    );

    expect(outcomes).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(dataProvider.create).not.toHaveBeenCalled();
  });

  it("creates the contact when the search only returned a near-miss", async () => {
    const almostJane = {
      ...jane,
      id: 11,
      email_jsonb: [{ email: "notjane@acme.example", type: "Work" }],
    } as Contact;
    const dataProvider = fakeDataProvider([almostJane]);

    const outcomes = await importBatch(
      dataProvider,
      [row({ first_name: "Jane", email_work: "jane@acme.example" })],
      "update",
    );

    expect(outcomes).toEqual({ created: 1, updated: 0, skipped: 0 });
    expect(dataProvider.update).not.toHaveBeenCalled();
  });

  it("writes a repeated address in the file once", async () => {
    const dataProvider = fakeDataProvider([]);

    const outcomes = await importBatch(
      dataProvider,
      [
        row({ first_name: "Sam", email_work: "sam@acme.example" }),
        row({ first_name: "Samuel", email_work: "SAM@acme.example" }),
      ],
      "update",
    );

    expect(outcomes).toEqual({ created: 1, updated: 0, skipped: 1 });
    expect(dataProvider.create).toHaveBeenCalledTimes(1);
    expect(dataProvider.create.mock.calls[0][1].data).toMatchObject({
      first_name: "Sam",
    });
  });

  it("still writes it once when the repeat lands in a later batch", async () => {
    const dataProvider = fakeDataProvider([]);
    const run = createImportRun();

    const first = await importBatch(
      dataProvider,
      [row({ first_name: "Sam", email_work: "sam@acme.example" })],
      "update",
      { run },
    );
    const second = await importBatch(
      dataProvider,
      [row({ first_name: "Samuel", email_work: "Sam@Acme.Example" })],
      "update",
      { run },
    );

    expect(first).toEqual({ created: 1, updated: 0, skipped: 0 });
    expect(second).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(dataProvider.create).toHaveBeenCalledTimes(1);
  });

  it("updates a matched contact once when a later batch reaches it by another of its addresses", async () => {
    const janeBothAddresses = {
      ...jane,
      email_jsonb: [
        { email: "jane@acme.example", type: "Work" },
        { email: "jane@home.example", type: "Home" },
      ],
    } as unknown as Contact;
    const dataProvider = fakeDataProvider([janeBothAddresses]);
    const run = createImportRun();

    const first = await importBatch(
      dataProvider,
      [row({ email_work: "jane@acme.example", title: "Head of Analytics" })],
      "update",
      { run },
    );
    const second = await importBatch(
      dataProvider,
      [row({ email_home: "jane@home.example", title: "Analyst" })],
      "update",
      { run },
    );

    expect(first).toEqual({ created: 0, updated: 1, skipped: 0 });
    expect(second).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(dataProvider.update).toHaveBeenCalledTimes(1);
    expect(dataProvider.update.mock.calls[0][1].data).toMatchObject({
      title: "Head of Analytics",
    });
  });

  it("creates every row that carries no email, duplicate or not", async () => {
    const dataProvider = fakeDataProvider([]);

    const outcomes = await importBatch(
      dataProvider,
      [
        row({ first_name: "Sam", last_name: "Doe" }),
        row({ first_name: "Sam", last_name: "Doe" }),
      ],
      "skip",
    );

    expect(outcomes).toEqual({ created: 2, updated: 0, skipped: 0 });
    expect(dataProvider.create).toHaveBeenCalledTimes(2);
  });

  it("does not send an update when the row adds nothing to the contact", async () => {
    const dataProvider = fakeDataProvider([jane]);

    const outcomes = await importBatch(
      dataProvider,
      [row({ email_work: "jane@acme.example" })],
      "update",
    );

    expect(outcomes).toEqual({ created: 0, updated: 0, skipped: 1 });
    expect(dataProvider.update).not.toHaveBeenCalled();
  });

  it("searches for an address once per run", async () => {
    const dataProvider = fakeDataProvider([jane]);
    const run = createImportRun();

    await importBatch(
      dataProvider,
      [row({ first_name: "Jane", email_work: "jane@acme.example" })],
      "update",
      { run },
    );
    await importBatch(
      dataProvider,
      [row({ first_name: "Jane", email_work: "jane@acme.example" })],
      "update",
      { run },
    );

    expect(dataProvider.getList).toHaveBeenCalledTimes(1);
  });

  it("attaches the company and tags the row named", async () => {
    const dataProvider = fakeDataProvider([]);

    await importBatch(
      dataProvider,
      [
        row({
          first_name: "Sam",
          email_work: "sam@acme.example",
          company: " Acme ",
          tags: "vip, lead",
        }),
      ],
      "skip",
      {
        companies: new Map([["Acme", { id: 12 } as Company]]),
        tags: new Map([
          ["vip", { id: 1 } as Tag],
          ["lead", { id: 2 } as Tag],
        ]),
      },
    );

    expect(dataProvider.create.mock.calls[0][1].data).toMatchObject({
      company_id: 12,
      tags: [1, 2],
    });
  });
});

describe("importContactBatch, when the CRM refuses a row", () => {
  /** A provider that rejects the rows whose first name is in `refuse`. */
  const refusingDataProvider = (refuse: string[], message = "Boom") => {
    const dataProvider = fakeDataProvider([]);
    const create = dataProvider.create;
    dataProvider.create = vi.fn(
      async (resource: string, params: { data: { first_name?: string } }) => {
        if (refuse.includes(params.data.first_name ?? "")) {
          throw new Error(message);
        }
        return create(resource, params);
      },
    ) as unknown as typeof dataProvider.create;
    return dataProvider;
  };

  it("reports the refused row with its position and the reason", async () => {
    // Arrange
    const dataProvider = refusingDataProvider(["Sam"], "Email is invalid");

    // Act
    const { failures } = await importBatchResult(
      dataProvider,
      [
        row({ first_name: "Ada", email_work: "ada@acme.example" }),
        row({ first_name: "Sam", email_work: "sam@acme.example" }),
      ],
      "skip",
    );

    // Assert
    expect(failures).toEqual([{ index: 1, reason: "Email is invalid" }]);
  });

  it("keeps writing the rest of the batch", async () => {
    // Arrange
    const dataProvider = refusingDataProvider(["Sam"]);

    // Act
    const { outcomes } = await importBatchResult(
      dataProvider,
      [
        row({ first_name: "Sam", email_work: "sam@acme.example" }),
        row({ first_name: "Ada", email_work: "ada@acme.example" }),
      ],
      "skip",
    );

    // Assert
    expect(outcomes).toEqual({ created: 1, updated: 0, skipped: 0 });
    expect(dataProvider.create).toHaveBeenCalledTimes(2);
  });

  it("lets a later row with the same email try again", async () => {
    // Arrange: the first attempt fails, so the address stays unclaimed.
    const dataProvider = refusingDataProvider(["Sam"]);
    const run = createImportRun();
    await importBatchResult(
      dataProvider,
      [row({ first_name: "Sam", email_work: "sam@acme.example" })],
      "skip",
      { run },
    );

    // Act
    const { outcomes } = await importBatchResult(
      dataProvider,
      [row({ first_name: "Samuel", email_work: "sam@acme.example" })],
      "skip",
      { run },
    );

    // Assert
    expect(outcomes).toEqual({ created: 1, updated: 0, skipped: 0 });
  });

  it("reports the row an update refused", async () => {
    // Arrange
    const dataProvider = fakeDataProvider([jane]);
    dataProvider.update = vi.fn(async () => {
      throw new Error("Contact is locked");
    }) as unknown as typeof dataProvider.update;

    // Act
    const { outcomes, failures } = await importBatchResult(
      dataProvider,
      [
        row({
          first_name: "Jane",
          last_name: "Roe",
          email_work: "jane@acme.example",
          title: "Lead analyst",
        }),
      ],
      "update",
    );

    // Assert
    expect(failures).toEqual([{ index: 0, reason: "Contact is locked" }]);
    expect(outcomes).toEqual({ created: 0, updated: 0, skipped: 0 });
  });
});
