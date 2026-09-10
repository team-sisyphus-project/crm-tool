import { Loader2 } from "lucide-react";
import { useTranslate } from "ra-core";
import { Link } from "react-router";

import { FileField } from "@/components/admin/file-field";
import { FileInput } from "@/components/admin/file-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import * as sampleCsv from "../contacts_export.csv?raw";

const SAMPLE_FILE_NAME = "crm_contacts_sample.csv";
const SAMPLE_URL = `data:text/csv;name=${SAMPLE_FILE_NAME};charset=utf-8,${encodeURIComponent(
  sampleCsv.default,
)}`;

type ImportUploadStepProps = {
  isReadingFile: boolean;
  previewError: Error | null;
  onFileChange(file: File | null): void;
};

/** Step 1: pick a CSV file, with a downloadable template to start from. */
export function ImportUploadStep({
  isReadingFile,
  previewError,
  onFileChange,
}: ImportUploadStepProps) {
  const translate = useTranslate();

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <AlertDescription className="flex flex-col gap-2">
          {translate("resources.contacts.import.sample_hint")}
          <Button asChild variant="outline" size="sm">
            <Link to={SAMPLE_URL} download={SAMPLE_FILE_NAME}>
              {translate("resources.contacts.import.sample_download")}
            </Link>
          </Button>
        </AlertDescription>
      </Alert>

      <FileInput
        source="csv"
        label="resources.contacts.import.csv_file"
        accept={{ "text/csv": [".csv"] }}
        onChange={onFileChange}
      >
        <FileField source="src" title="title" target="_blank" />
      </FileInput>

      {isReadingFile && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {translate("resources.contacts.import.reading")}
        </p>
      )}

      {previewError && (
        <Alert variant="destructive">
          <AlertDescription>
            {translate("resources.contacts.import.parse_error")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
