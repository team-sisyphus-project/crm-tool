import type { Meta } from "@storybook/react-vite";

import { StoryWrapper } from "@/test/StoryWrapper";
import type { ContactNote } from "../types";
import {
  CONTACT,
  EXISTING_NOTE_ID,
  buildExistingNote,
  daysFromNow,
} from "./NextActionReminder.stories";

const meta = {
  title: "Atomic CRM/Notes/Note Show Page",
  parameters: {
    layout: "fullscreen",
  },
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  includeStories: ["WithNextAction", "WithoutNextAction"],
} satisfies Meta;

export default meta;

export const NEXT_ACTION = "Send the signed quote";

/**
 * The real mobile note detail page, reached by tapping a note in the activity
 * log or in the contact's note list. Rendering it through the router — rather
 * than mounting the component directly — is what proves the note is actually
 * read back from the data provider by its URL.
 *
 * Requires a mobile viewport: the note detail route only exists on the mobile
 * admin.
 */
const MobileNoteShow = ({ note }: { note: ContactNote }) => (
  <StoryWrapper
    data={{ contacts: [CONTACT], contact_notes: [note] }}
    initialEntries={[`/contacts/${CONTACT.id}/notes/${EXISTING_NOTE_ID}`]}
  >
    <></>
  </StoryWrapper>
);

export const WithNextAction = () => (
  <MobileNoteShow
    note={buildExistingNote({
      next_action: NEXT_ACTION,
      reminder_date: daysFromNow(1).toISOString(),
    })}
  />
);

export const WithoutNextAction = () => (
  <MobileNoteShow note={buildExistingNote()} />
);
