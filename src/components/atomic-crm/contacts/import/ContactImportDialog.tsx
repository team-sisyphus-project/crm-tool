import { useEffect } from "react";
import { Form, useRefresh, useTranslate } from "ra-core";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ImportDuplicatePolicy } from "./ImportDuplicatePolicy";
import { ImportMappingStep } from "./ImportMappingStep";
import { ImportPreviewStep } from "./ImportPreviewStep";
import { ImportRunningStep } from "./ImportRunningStep";
import { ImportStepIndicator } from "./ImportStepIndicator";
import { ImportSummaryStep } from "./ImportSummaryStep";
import { ImportUploadStep } from "./ImportUploadStep";
import { useContactImportWizard } from "./useContactImportWizard";

type ContactImportDialogProps = {
  open: boolean;
  onClose(): void;
};

/**
 * Multi-step shell for the contact import: upload, preview, then import.
 * All the state lives in `useContactImportWizard`; this only renders it.
 */
export function ContactImportDialog({
  open,
  onClose,
}: ContactImportDialogProps) {
  const translate = useTranslate();
  const refresh = useRefresh();
  const wizard = useContactImportWizard();
  const { importer, step } = wizard;

  useEffect(() => {
    if (importer.state === "complete") {
      refresh();
    }
  }, [importer.state, refresh]);

  const handleClose = () => {
    wizard.resetWizard();
    onClose();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    // A running import must not be interrupted by an accidental Esc or
    // overlay click: the only way out is the explicit "stop import" action.
    if (nextOpen || step === "running") return;
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {translate("resources.contacts.import.title")}
          </DialogTitle>
          <DialogDescription>
            {translate("resources.contacts.import.description")}
          </DialogDescription>
        </DialogHeader>

        <ImportStepIndicator currentIndex={wizard.stepIndex} />

        <Form className="flex flex-col gap-4">
          {step === "upload" && (
            <ImportUploadStep
              isReadingFile={wizard.isReadingFile}
              previewError={wizard.previewError}
              onFileChange={wizard.selectFile}
            />
          )}

          {step === "preview" && wizard.preview && wizard.file && (
            <ImportPreviewStep
              fileName={wizard.file.name}
              preview={wizard.preview}
            />
          )}

          {step === "mapping" && wizard.preview && wizard.mapping && (
            <>
              <ImportMappingStep
                preview={wizard.preview}
                mapping={wizard.mapping}
                missingFields={wizard.missingFields}
                onColumnChange={wizard.mapColumn}
              />
              <ImportDuplicatePolicy
                value={wizard.duplicatePolicy}
                onChange={wizard.setDuplicatePolicy}
              />
            </>
          )}

          {step === "running" && importer.state === "running" && (
            <ImportRunningStep
              rowCount={importer.rowCount}
              importCount={importer.importCount}
              errorCount={wizard.failures.length}
              remainingTime={importer.remainingTime}
              onStop={wizard.stopImport}
            />
          )}

          {step === "summary" &&
            (importer.state === "complete" ? (
              <ImportSummaryStep
                outcome="complete"
                importCount={importer.importCount}
                outcomes={wizard.outcomes}
                failures={wizard.failures}
                onDownloadFailures={wizard.downloadErrorReport}
              />
            ) : (
              <ImportSummaryStep outcome="error" />
            ))}
        </Form>

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={wizard.goToUpload}
              >
                {translate("resources.contacts.import.back")}
              </Button>
              <Button type="button" onClick={wizard.goToMapping}>
                {translate("resources.contacts.import.next")}
              </Button>
            </>
          )}

          {step === "mapping" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={wizard.goToPreview}
              >
                {translate("resources.contacts.import.back")}
              </Button>
              <Button
                type="button"
                onClick={wizard.startImport}
                disabled={!wizard.canStartImport}
              >
                {translate("resources.contacts.import.start")}
              </Button>
            </>
          )}

          {step !== "preview" && step !== "mapping" && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={step === "running"}
            >
              {translate("ra.action.close")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
