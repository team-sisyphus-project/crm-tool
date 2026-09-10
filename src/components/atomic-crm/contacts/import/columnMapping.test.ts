import {
  applyMapping,
  autoMapColumns,
  columnOfField,
  fieldOfColumn,
  IMPORT_FIELDS,
  isRequiredImportField,
  missingRequiredFields,
  REQUIRED_IMPORT_FIELDS,
  setColumnField,
} from "./columnMapping";

describe("autoMapColumns", () => {
  it("matches a header that is already the field name", () => {
    const mapping = autoMapColumns(["first_name", "last_name"]);

    expect(mapping).toEqual({
      first_name: "first_name",
      last_name: "last_name",
    });
  });

  it("ignores case, spaces, underscores and punctuation in the header", () => {
    const mapping = autoMapColumns([
      "First Name",
      "LAST_NAME",
      "e-mail work",
      "Linkedin.Url",
    ]);

    expect(mapping).toEqual({
      "First Name": "first_name",
      LAST_NAME: "last_name",
      "e-mail work": "email_work",
      "Linkedin.Url": "linkedin_url",
    });
  });

  it("leaves a header it does not recognise out of the import", () => {
    const mapping = autoMapColumns(["first_name", "Loyalty points"]);

    expect(mapping["Loyalty points"]).toBeNull();
  });

  it("gives a field to the first column that claims it", () => {
    const mapping = autoMapColumns(["first name", "first_name"]);

    expect(mapping).toEqual({
      "first name": "first_name",
      first_name: null,
    });
  });

  it("returns an empty mapping for a file with no columns", () => {
    expect(autoMapColumns([])).toEqual({});
  });
});

describe("setColumnField", () => {
  it("sends a column to the field the user picked", () => {
    const mapping = autoMapColumns(["Given name", "last_name"]);

    const updated = setColumnField(mapping, "Given name", "first_name");

    expect(fieldOfColumn(updated, "Given name")).toBe("first_name");
  });

  it("leaves a column out of the import when the field is null", () => {
    const mapping = autoMapColumns(["first_name", "background"]);

    const updated = setColumnField(mapping, "background", null);

    expect(fieldOfColumn(updated, "background")).toBeNull();
    expect(fieldOfColumn(updated, "first_name")).toBe("first_name");
  });

  it("takes the field away from the column that held it", () => {
    const mapping = autoMapColumns(["email_work", "Contact email"]);

    const updated = setColumnField(mapping, "Contact email", "email_work");

    expect(fieldOfColumn(updated, "email_work")).toBeNull();
    expect(columnOfField(updated, "email_work")).toBe("Contact email");
  });

  it("does not modify the mapping it was given", () => {
    const mapping = autoMapColumns(["first_name"]);

    setColumnField(mapping, "first_name", "last_name");

    expect(mapping).toEqual({ first_name: "first_name" });
  });
});

describe("missingRequiredFields", () => {
  it("reports nothing when every required field has a column", () => {
    const mapping = autoMapColumns(["first_name", "last_name", "title"]);

    expect(missingRequiredFields(mapping)).toEqual([]);
  });

  it("reports the required fields no column feeds", () => {
    const mapping = autoMapColumns(["first_name", "Company"]);

    expect(missingRequiredFields(mapping)).toEqual(["last_name"]);
  });

  it("reports a required field again once its column is ignored", () => {
    const mapping = autoMapColumns(["first_name", "last_name"]);

    const updated = setColumnField(mapping, "last_name", null);

    expect(missingRequiredFields(updated)).toEqual(["last_name"]);
  });

  it("reports both required fields for a file with none of them", () => {
    const mapping = autoMapColumns(["Nickname", "Notes"]);

    expect(missingRequiredFields(mapping)).toEqual(["first_name", "last_name"]);
  });
});

describe("applyMapping", () => {
  it("rewrites a row under the field names the user chose", () => {
    const mapping = setColumnField(
      autoMapColumns(["Given name", "Surname"]),
      "Given name",
      "first_name",
    );
    const row = { "Given name": "Ada", Surname: "Lovelace" };

    const contact = applyMapping(
      row,
      setColumnField(mapping, "Surname", "last_name"),
    );

    expect(contact).toEqual({ first_name: "Ada", last_name: "Lovelace" });
  });

  it("drops the columns left out of the import", () => {
    const mapping = autoMapColumns(["first_name", "Loyalty points"]);
    const row = { first_name: "Ada", "Loyalty points": "320" };

    expect(applyMapping(row, mapping)).toEqual({ first_name: "Ada" });
  });

  it("keeps values as the parser produced them", () => {
    const mapping = autoMapColumns(["has_newsletter", "first_seen"]);
    const row = { has_newsletter: true, first_seen: "2025-01-01" };

    expect(applyMapping(row, mapping)).toEqual({
      has_newsletter: true,
      first_seen: "2025-01-01",
    });
  });
});

describe("IMPORT_FIELDS", () => {
  it("offers first_name and last_name as the required fields", () => {
    expect(REQUIRED_IMPORT_FIELDS).toEqual(["first_name", "last_name"]);
    expect(isRequiredImportField("first_name")).toBe(true);
    expect(isRequiredImportField("company")).toBe(false);
  });

  it("lists every field the sample CSV template ships with", () => {
    expect(IMPORT_FIELDS).toContain("email_work");
    expect(IMPORT_FIELDS).toContain("tags");
    expect(new Set(IMPORT_FIELDS).size).toBe(IMPORT_FIELDS.length);
  });
});
