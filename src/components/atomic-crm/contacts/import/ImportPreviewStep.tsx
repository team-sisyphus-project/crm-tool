import { useTranslate } from "ra-core";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { CsvPreview } from "../../misc/usePapaParse";

type ImportPreviewStepProps = {
  fileName: string;
  preview: CsvPreview;
};

/** Step 2: show what we read from the file before anything is written. */
export function ImportPreviewStep({
  fileName,
  preview,
}: ImportPreviewStepProps) {
  const translate = useTranslate();
  const { headers, rows } = preview;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          {translate("resources.contacts.import.preview_title", { fileName })}
        </p>
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? translate("resources.contacts.import.preview_empty")
            : translate("resources.contacts.import.preview_hint", {
                rowCount: rows.length,
                columnCount: headers.length,
              })}
        </p>
      </div>

      {rows.length > 0 && (
        <div className="max-h-72 overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header) => (
                  <TableHead
                    key={header}
                    scope="col"
                    className="whitespace-nowrap"
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                // Rows have no natural key: the CSV order is the identity here.
                <TableRow key={index}>
                  {headers.map((header) => (
                    <TableCell
                      key={header}
                      className="max-w-48 truncate whitespace-nowrap"
                      title={row[header] ?? ""}
                    >
                      {row[header]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
