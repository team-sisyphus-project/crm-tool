import { EllipsisVertical, Trash2 } from "lucide-react";
import {
  type Identifier,
  useCreatePath,
  useDeleteController,
  useGetRecordRepresentation,
  useNotify,
  useRecordContext,
  useRedirect,
  useTranslate,
} from "ra-core";
import { ReferenceField } from "@/components/admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EditSheet } from "../misc/EditSheet";
import { foreignKeyMapping } from "./foreignKeyMapping";
import { NoteInputsMobile } from "./NoteInputsMobile";
import { useCreateNextActionTask } from "./useCreateNextActionTask";

export interface NoteEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: Identifier;
}

export const NoteEditSheet = ({
  open,
  onOpenChange,
  noteId,
}: NoteEditSheetProps) => {
  const createPath = useCreatePath();
  const translate = useTranslate();
  const notify = useNotify();
  const redirect = useRedirect();
  const createNextActionTask = useCreateNextActionTask();
  const getRedirectTo = (record: any) => {
    return createPath({
      resource: "contacts",
      type: "show",
      id: record ? record[foreignKeyMapping["contacts"]] : undefined,
    });
  };
  const getContactRepresentation = useGetRecordRepresentation("contacts");

  // Taking over onSuccess disables EditSheet's default close/notify/redirect,
  // so they are reproduced here alongside the next action reminder.
  const handleSuccess = (data: any, variables: any) => {
    void createNextActionTask(data, variables?.previousData);
    notify("resources.contact_notes.notifications.updated", {
      type: "info",
      messageArgs: {
        smart_count: 1,
        _: translate("ra.notification.updated", { smart_count: 1 }),
      },
      undoable: true,
    });
    redirect(getRedirectTo(data));
    onOpenChange(false);
  };

  return (
    <EditSheet
      resource="contact_notes"
      id={noteId}
      title={
        <ReferenceField
          source={foreignKeyMapping["contacts"]}
          reference="contacts"
          render={({ referenceRecord }) => (
            <span className="text-xl font-semibold truncate">
              {referenceRecord
                ? translate("resources.notes.sheet.edit_for", {
                    name: getContactRepresentation(referenceRecord),
                  })
                : translate("resources.notes.sheet.edit")}
            </span>
          )}
        />
      }
      redirect={(_resource, _id, record) => getRedirectTo(record)}
      mutationOptions={{ onSuccess: handleSuccess }}
      open={open}
      onOpenChange={onOpenChange}
      headerActions={
        <NoteEditMenuButton
          onOpenChange={onOpenChange}
          getRedirectTo={getRedirectTo}
        />
      }
    >
      <NoteInputsMobile />
    </EditSheet>
  );
};

const NoteEditMenuButton = ({
  onOpenChange,
  getRedirectTo,
}: {
  onOpenChange: (open: boolean) => void;
  getRedirectTo: (record: any) => string;
}) => {
  const translate = useTranslate();
  const record = useRecordContext();
  const { handleDelete } = useDeleteController({
    record,
    resource: "contact_notes",
    redirect: getRedirectTo(record),
    mutationMode: "undoable",
  });

  const onDelete = () => {
    onOpenChange(false);
    handleDelete();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="opacity-70 transition-opacity hover:opacity-100 rounded-xs"
        >
          <EllipsisVertical className="size-6" />
          <span className="sr-only">
            {translate("ra.action.open_menu", { _: "More" })}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          className="h-12 md:h-8 px-4 md:px-2 text-base md:text-sm"
          onSelect={onDelete}
        >
          <Trash2 />
          {translate("ra.action.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
