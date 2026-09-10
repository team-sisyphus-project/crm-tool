import { useTranslate } from "ra-core";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { CsvPreview } from "../../misc/usePapaParse";
import type { ColumnMapping, ImportField } from "./columnMapping";
import {
  columnOfField,
  IMPORT_FIELDS,
  isRequiredImportField,
} from "./columnMapping";

/**
 * Stands for "do not import this column". The select needs a non-empty value
 * to represent it, since an empty one means "nothing chosen yet" to Radix.
 */
const IGNORE_VALUE = "__ignore__";

type ImportMappingStepProps = {
  preview: CsvPreview;
  mapping: ColumnMapping;
  missingFields: ImportField[];
  onColumnChange(header: string, field: ImportField | null): void;
};

/** The first value the file actually holds for a column, as a hint of content. */
const sampleValue = (rows: CsvPreview["rows"], header: string): string => {
  const row = rows.find((candidate) => candidate[header]?.trim());
  return row?.[header]?.trim() ?? "";
};

/** Step 3: decide which contact field each column of the file feeds. */
export function ImportMappingStep({
  preview,
  mapping,
  missingFields,
  onColumnChange,
}: ImportMappingStepProps) {
  const translate = useTranslate();
  const { headers, rows } = preview;

  const fieldLabel = (field: ImportField) =>
    translate(`resources.contacts.import.fields.${field}`);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          {translate("resources.contacts.import.mapping_title")}
        </p>
        <p className="text-sm text-muted-foreground">
          {translate("resources.contacts.import.mapping_hint")}
        </p>
      </div>

      {missingFields.length > 0 && (
        <Alert>
          <AlertDescription>
            {translate("resources.contacts.import.mapping_missing", {
              fields: missingFields.map(fieldLabel).join(", "),
            })}
          </AlertDescription>
        </Alert>
      )}

      <div className="max-h-72 overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                {translate("resources.contacts.import.mapping_column")}
              </TableHead>
              <TableHead scope="col">
                {translate("resources.contacts.import.mapping_sample")}
              </TableHead>
              <TableHead scope="col">
                {translate("resources.contacts.import.mapping_field")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headers.map((header) => (
              <TableRow key={header}>
                <TableCell className="max-w-48 truncate font-medium">
                  {header}
                </TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">
                  {sampleValue(rows, header)}
                </TableCell>
                <TableCell>
                  <Select
                    value={mapping[header] ?? IGNORE_VALUE}
                    onValueChange={(value) =>
                      onColumnChange(
                        header,
                        value === IGNORE_VALUE ? null : (value as ImportField),
                      )
                    }
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label={translate(
                        "resources.contacts.import.mapping_select_label",
                        { header },
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={IGNORE_VALUE}>
                        {translate("resources.contacts.import.mapping_ignore")}
                      </SelectItem>
                      {IMPORT_FIELDS.map((field) => {
                        const takenBy = columnOfField(mapping, field);
                        return (
                          <SelectItem
                            key={field}
                            value={field}
                            disabled={takenBy !== null && takenBy !== header}
                          >
                            {isRequiredImportField(field)
                              ? translate(
                                  "resources.contacts.import.field_required",
                                  { field: fieldLabel(field) },
                                )
                              : fieldLabel(field)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
