import type { Meta } from "@storybook/react-vite";
import {
  RecordContextProvider,
  ResourceContextProvider,
  useGetOne,
} from "ra-core";

import { StoryWrapper, buildContact } from "@/test/StoryWrapper";
import type { ContactNote } from "../types";
import { Note } from "./Note";

const meta = {
  title: "Atomic CRM/Notes/Next Action Priority",
  includeStories: ["NoteWithOverdueNextAction"],
} satisfies Meta;

export default meta;

export const CONTACT = buildContact({ id: 1, sales_id: 0 });

export const NOTE_ID = 20;

/** Days from now, at noon, so a reminder never straddles midnight mid-test. */
export const daysFromNowAtNoon = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};

export const buildNote = (overrides: Partial<ContactNote> = {}): ContactNote =>
  ({
    contact_id: CONTACT.id,
    date: new Date().toISOString(),
    id: NOTE_ID,
    next_action: "Send the proposal",
    reminder_date: null,
    sales_id: 0,
    status: "warm",
    text: "Recap of the call.",
    ...overrides,
  }) as ContactNote;

const StoredNote = () => {
  const { data } = useGetOne<ContactNote>("contact_notes", { id: NOTE_ID });

  if (!data) return null;

  return <Note note={data} isLast />;
};

/** The real desktop note read view, over a note that already exists. */
export const NoteView = ({ note = buildNote() }: { note?: ContactNote }) => (
  <StoryWrapper data={{ contacts: [CONTACT], contact_notes: [note] }}>
    <ResourceContextProvider value="contact_notes">
      <RecordContextProvider value={CONTACT}>
        <StoredNote />
      </RecordContextProvider>
    </ResourceContextProvider>
  </StoryWrapper>
);

export const NoteWithOverdueNextAction = () => (
  <NoteView note={buildNote({ reminder_date: daysFromNowAtNoon(-2) })} />
);
