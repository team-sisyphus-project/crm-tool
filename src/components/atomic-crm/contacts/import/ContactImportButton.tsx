import { Upload } from "lucide-react";
import { useTranslate } from "ra-core";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { ContactImportDialog } from "./ContactImportDialog";

/** Entry point of the contact import wizard. */
export const ContactImportButton = () => {
  const translate = useTranslate();
  const [isDialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setDialogOpen(true)}
        className="flex items-center gap-2 cursor-pointer"
      >
        <Upload /> {translate("resources.contacts.import.button")}
      </Button>
      <ContactImportDialog
        open={isDialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
};
