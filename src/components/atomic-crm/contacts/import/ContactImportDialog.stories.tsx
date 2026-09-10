import type { Meta } from "@storybook/react-vite";

import { StoryWrapper } from "@/test/StoryWrapper";

import { ContactImportButton } from "./ContactImportButton";

const meta = {
  title: "Atomic CRM/Contacts/Contact Import",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

export const ImportWizard = () => (
  <StoryWrapper>
    <ContactImportButton />
  </StoryWrapper>
);
