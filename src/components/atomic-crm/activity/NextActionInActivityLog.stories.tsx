import type { Meta } from "@storybook/react-vite";
import {
  ListContextProvider,
  RecordContextProvider,
  ResourceContextProvider,
  type ListControllerResult,
} from "ra-core";
import { useState } from "react";

import { StoryWrapper, buildContact } from "@/test/StoryWrapper";
import { NoteCreate } from "../notes/NoteCreate";
import { TasksListByDueDate } from "../tasks/TasksListByDueDate";
import type { Company, ContactNote, Deal, DealNote } from "../types";
import { ActivityLog } from "./ActivityLog";

const meta = {
  title: "Atomic CRM/Activity/Next Action In Activity Log",
  includeStories: ["NoteToActivityLog"],
} satisfies Meta;

export default meta;

export const CONTACT = buildContact({ id: 1, sales_id: 0 });

export const EMPTY_PLACEHOLDER_TEXT = "No reminder yet";

export const REVEAL_ACTIVITY_LABEL = "Show activity";

/** Accessible name of the region wrapping the activity log, so assertions can
 * target the log rather than the form or the task list rendered next to it. */
export const ACTIVITY_REGION_LABEL = "Activity";

export const COMPANY: Company = {
  address: "",
  city: "",
  country: "",
  created_at: "2025-01-01T09:00:00.000Z",
  description: "",
  id: 1,
  linkedin_url: "",
  logo: null as unknown as Company["logo"],
  name: "Analytical Engines",
  phone_number: "",
  revenue: "",
  sales_id: 0,
  sector: "Tech",
  size: 10,
  state_abbr: "",
  tax_identifier: "",
  website: "",
  zipcode: "",
};

export const DEAL: Deal = {
  amount: 1000,
  category: "Other",
  company_id: COMPANY.id,
  contact_ids: [CONTACT.id],
  created_at: "2025-01-01T09:00:00.000Z",
  description: "",
  expected_closing_date: "2025-06-01T09:00:00.000Z",
  id: 1,
  index: 0,
  name: "Engine rollout",
  sales_id: 0,
  stage: "opportunity",
  updated_at: "2025-01-01T09:00:00.000Z",
};

/** A contact note as the activity log receives it, with the pair already set. */
export const buildContactNote = (
  overrides: Partial<ContactNote> = {},
): ContactNote => ({
  contact_id: CONTACT.id,
  date: new Date().toISOString(),
  id: 1,
  next_action: null,
  reminder_date: null,
  sales_id: 0,
  status: "warm",
  text: "Recap of the call.",
  ...overrides,
});

export const buildDealNote = (overrides: Partial<DealNote> = {}): DealNote => ({
  date: new Date().toISOString(),
  deal_id: DEAL.id,
  id: 1,
  next_action: null,
  reminder_date: null,
  sales_id: 0,
  text: "Pricing discussed.",
  ...overrides,
});

// NoteCreate is always rendered inside the contact's note list; it only reads
// `refetch` from that context, so a stub is enough here.
const noteListContext = {
  refetch: () => {},
} as unknown as ListControllerResult;

/**
 * The activity log is mounted on demand so it always fetches after the note has
 * been saved — saving a note does not invalidate the `activity_log` query.
 */
const ActivityReveal = () => {
  const [isRevealed, setRevealed] = useState(false);

  if (!isRevealed) {
    return (
      <button type="button" onClick={() => setRevealed(true)}>
        {REVEAL_ACTIVITY_LABEL}
      </button>
    );
  }

  return (
    <section aria-label={ACTIVITY_REGION_LABEL}>
      <ActivityLog />
    </section>
  );
};

/**
 * The real note form, the task list its reminder feeds, and the activity log
 * that has to surface the same next action — all reading one FakeRest database.
 */
export const NoteToActivityLog = () => (
  <StoryWrapper data={{ contacts: [CONTACT] }}>
    <ResourceContextProvider value="contact_notes">
      <RecordContextProvider value={CONTACT}>
        <ListContextProvider value={noteListContext}>
          <NoteCreate reference="contacts" />
        </ListContextProvider>
      </RecordContextProvider>
    </ResourceContextProvider>
    <TasksListByDueDate
      filterByContact={CONTACT.id}
      emptyPlaceholder={<p>{EMPTY_PLACEHOLDER_TEXT}</p>}
    />
    <ActivityReveal />
  </StoryWrapper>
);

/** The activity log alone, over notes that already exist in the database. */
export const SeededActivityLog = ({
  contactNotes = [],
  dealNotes = [],
}: {
  contactNotes?: ContactNote[];
  dealNotes?: DealNote[];
}) => (
  <StoryWrapper
    data={{
      companies: [COMPANY],
      contacts: [CONTACT],
      contact_notes: contactNotes,
      deals: [DEAL],
      deal_notes: dealNotes,
    }}
  >
    <section aria-label={ACTIVITY_REGION_LABEL}>
      <ActivityLog />
    </section>
  </StoryWrapper>
);
