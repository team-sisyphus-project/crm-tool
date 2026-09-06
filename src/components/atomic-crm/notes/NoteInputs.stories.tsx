import type { Meta, StoryObj } from "@storybook/react-vite";
import { Form } from "ra-core";

import { NoteInputs } from "./NoteInputs";
import { SaveButton } from "@/components/admin/form";
import { StoryWrapper } from "@/test/StoryWrapper";

type NoteInputsStoryProps = React.ComponentProps<typeof NoteInputs> & {
  defaultValues?: Record<string, unknown>;
  withSaveButton?: boolean;
  onSubmit?: (values: Record<string, unknown>) => void;
};

export const NoteInputsStory = ({
  defaultValues,
  withSaveButton = false,
  onSubmit,
  ...props
}: NoteInputsStoryProps) => (
  <StoryWrapper>
    <Form defaultValues={defaultValues} onSubmit={onSubmit}>
      <NoteInputs {...props} />
      {/* A "submit" button goes through the Form onSubmit prop, a "button" one
          only runs validation — the stories need both. */}
      {withSaveButton || onSubmit ? (
        <SaveButton type={onSubmit ? "submit" : "button"} />
      ) : null}
    </Form>
  </StoryWrapper>
);

const meta = {
  title: "Atomic CRM/Notes/Note Inputs",
  includeStories: ["Default", "WithSaveButton", "WithAttachmentDefault"],
  render: (args) => <NoteInputsStory {...args} />,
} satisfies Meta<typeof NoteInputsStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSaveButton: Story = {
  args: {
    withSaveButton: true,
  },
};

export const WithAttachmentDefault: Story = {
  args: {
    defaultValues: {
      attachments: [{ src: "blob:test", title: "evidence.pdf" }],
    },
    withSaveButton: true,
  },
};
