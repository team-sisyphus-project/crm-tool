import { parseHeaders } from "./usePapaParse";

const csvFile = (content: string, name = "contacts.csv") =>
  new File([content], name, { type: "text/csv" });

const SAMPLE_CSV = [
  "first_name,last_name,email_work",
  "Ada,Lovelace,ada@example.com",
  "Grace,Hopper,grace@example.com",
  "Alan,Turing,alan@example.com",
].join("\n");

describe("parseHeaders", () => {
  it("returns the header row of a CSV file", async () => {
    const preview = await parseHeaders(csvFile(SAMPLE_CSV));

    expect(preview.headers).toEqual(["first_name", "last_name", "email_work"]);
  });

  it("returns the first rows keyed by header", async () => {
    const preview = await parseHeaders(csvFile(SAMPLE_CSV));

    expect(preview.rows).toHaveLength(3);
    expect(preview.rows[0]).toMatchObject({
      first_name: "Ada",
      last_name: "Lovelace",
      email_work: "ada@example.com",
    });
  });

  it("reads at most the requested number of rows", async () => {
    const preview = await parseHeaders(csvFile(SAMPLE_CSV), 2);

    expect(preview.rows).toHaveLength(2);
    expect(preview.rows.map((row) => row.first_name)).toEqual(["Ada", "Grace"]);
  });

  it("returns the headers of a file that has no data row", async () => {
    const preview = await parseHeaders(csvFile("first_name,last_name"));

    expect(preview.headers).toEqual(["first_name", "last_name"]);
    expect(preview.rows).toEqual([]);
  });

  it("rejects when the file has no header row", async () => {
    await expect(parseHeaders(csvFile(""))).rejects.toThrow(
      "The CSV file has no header row.",
    );
  });
});
