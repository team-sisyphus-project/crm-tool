import type { Meta } from "@storybook/react-vite";
import {
  ListContextProvider,
  RecordContextProvider,
  ResourceContextProvider,
  useGetOne,
  type ListControllerResult,
} from "ra-core";

import { StoryWrapper, buildContact } from "@/test/StoryWrapper";
import { TasksListByDueDate } from "../tasks/TasksListByDueDate";
import type { ContactNote } from "../types";
import { Note } from "./Note";
import { NoteCreate } from "./NoteCreate";
import type { NextActionNote } from "./nextActionTask";
import { useCreateNextActionTask } from "./useCreateNextActionTask";

const meta = {
  title: "Atomic CRM/Notes/Next Action Reminder",
  includeStories: ["NoteCreateWithTaskList", "InlineNoteEditWithTaskList"],
} satisfies Meta;

export default meta;

export const CONTACT = buildContact({ id: 1, sales_id: 0 });

export const EMPTY_PLACEHOLDER_TEXT = "No reminder yet";

/** Days from now, at noon, so the due-date bucket never straddles midnight. */
export const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
};

/** The `YYYY-MM-DDTHH:mm` shape a `datetime-local` input expects. */
export const toDateTimeInputValue = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000)
    .toISOString()
    .slice(0, 16);

/**
 * A second, always-new note used as a control: saving it proves the pipeline
 * ran, which is what makes "the other note created nothing" a real assertion
 * rather than a race.
 */
export const CONTROL_NOTE: NextActionNote = {
  contact_id: CONTACT.id,
  sales_id: 0,
  next_action: "Book the kickoff",
  reminder_date: daysFromNow(30).toISOString(),
};

// NoteCreate is always rendered inside the contact's note list; it only reads
// `refetch` from that context, so a stub is enough here.
const noteListContext = {
  refetch: () => {},
} as unknown as ListControllerResult;

const TaskList = () => (
  <TasksListByDueDate
    filterByContact={CONTACT.id}
    emptyPlaceholder={<p>{EMPTY_PLACEHOLDER_TEXT}</p>}
  />
);

/**
 * The real note creation form, next to the task list it is expected to feed.
 * Both read the same FakeRest database, so a reminder created by the form has
 * to travel through the data provider before the list can show it.
 */
export const NoteCreateWithTaskList = () => (
  <StoryWrapper data={{ contacts: [CONTACT] }}>
    <ResourceContextProvider value="contact_notes">
      <RecordContextProvider value={CONTACT}>
        <ListContextProvider value={noteListContext}>
          <NoteCreate reference="contacts" />
        </ListContextProvider>
      </RecordContextProvider>
    </ResourceContextProvider>
    <TaskList />
  </StoryWrapper>
);

const SaveNoteButton = ({
  label,
  note,
  previousNote,
}: {
  label: string;
  note: NextActionNote;
  previousNote?: NextActionNote;
}) => {
  const createNextActionTask = useCreateNextActionTask();

  return (
    <button
      type="button"
      onClick={() => void createNextActionTask(note, previousNote)}
    >
      {label}
    </button>
  );
};

/**
 * Replays what a note submit handler does after a save, without driving a form:
 * pass `previousNote` to simulate an edit, omit it to simulate a creation.
 */
export const SavedNoteWithTaskList = ({
  note,
  previousNote,
}: {
  note: NextActionNote;
  previousNote?: NextActionNote;
}) => (
  <StoryWrapper data={{ contacts: [CONTACT] }}>
    <SaveNoteButton label="Save note" note={note} previousNote={previousNote} />
    <SaveNoteButton label="Save control note" note={CONTROL_NOTE} />
    <TaskList />
  </StoryWrapper>
);

export const EXISTING_NOTE_ID = 10;

export const EXISTING_NOTE_TEXT = "Recap of the discovery call";

/** A note already stored for the contact, as the desktop note list renders it. */
export const buildExistingNote = (
  overrides: Partial<ContactNote> = {},
): ContactNote => ({
  id: EXISTING_NOTE_ID,
  contact_id: CONTACT.id,
  sales_id: 0,
  date: "2026-01-01T10:00:00.000Z",
  status: "warm",
  text: EXISTING_NOTE_TEXT,
  ...overrides,
});

const StoredNote = () => {
  const { data } = useGetOne<ContactNote>("contact_notes", {
    id: EXISTING_NOTE_ID,
  });

  if (!data) return null;

  return <Note note={data} isLast />;
};

/**
 * The real desktop inline note editor, next to the task list it is expected to
 * feed — the counterpart of `NoteCreateWithTaskList` for the edit path.
 */
export const InlineNoteEditWithTaskList = ({
  note = buildExistingNote(),
}: {
  note?: ContactNote;
}) => (
  <StoryWrapper data={{ contacts: [CONTACT], contact_notes: [note] }}>
    <ResourceContextProvider value="contact_notes">
      <RecordContextProvider value={CONTACT}>
        <StoredNote />
      </RecordContextProvider>
    </ResourceContextProvider>
    <TaskList />
  </StoryWrapper>
);
