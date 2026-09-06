import { render } from "vitest-browser-react";
import {
  ContactEditBasic,
  ContactEditWithEmailsAndPhones,
} from "./ContactEdit.stories";
import {
  ContactEditBasic as ContactEditMobileBasic,
  ContactEditWithEmailsAndPhones as ContactEditMobileWithEmailsAndPhones,
} from "./ContactEdit.mobile.stories";
import { page, userEvent } from "vitest/browser";

describe("ContactEdit", () => {
  describe("desktop", () => {
    beforeAll(() => {
      page.viewport(1600, 900);
    });

    it("shows empty email and phone inputs when the contact has none", async () => {
      const screen = await render(<ContactEditBasic silent />);

      // The form should display one empty email placeholder input
      await expect
        .element(screen.getByPlaceholder("Email"))
        .toBeInTheDocument();

      // The form should display one empty phone placeholder input
      await expect
        .element(screen.getByPlaceholder("Phone number"))
        .toBeInTheDocument();
    });

    it("does not submit empty email and phone entries", async () => {
      const updateMock = vi.fn().mockResolvedValue({ data: {} });
      const screen = await render(
        <ContactEditBasic
          silent
          dataProvider={{
            update: updateMock,
          }}
        />,
      );

      // Wait for the form to load
      await expect
        .element(screen.getByPlaceholder("Email"))
        .toBeInTheDocument();

      // Submit without filling anything
      await screen.getByRole("button", { name: /^save$/i }).click();
      await expect
        .poll(() => screen.getByText("Element updated"))
        .toBeInTheDocument();

      await screen.getByLabelText("Close toast").click();

      // Verify the transform cleaned up the empty arrays
      expect(updateMock).toBeCalledTimes(1);
      expect(updateMock).toBeCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            email_jsonb: null,
            phone_jsonb: null,
          }),
        }),
      );
    });

    it("submits only filled email and phone entries, stripping empty ones", async () => {
      const updateMock = vi.fn().mockResolvedValue({ data: {} });

      const screen = await render(
        <ContactEditBasic
          dataProvider={{
            update: updateMock,
          }}
          silent
        />,
      );

      // Wait for the form to load and fill in the email
      const emailInput = screen.getByPlaceholder("Email");
      await expect.element(emailInput).toBeInTheDocument();
      await emailInput.fill("ada@example.com");

      // Leave the phone input empty and submit
      await screen.getByRole("button", { name: /^save$/i }).click();
      await expect
        .poll(() => screen.getByText("Element updated"))
        .toBeInTheDocument();

      await screen.getByLabelText("Close toast").click();

      // Wait for the update call to complete
      await expect.poll(() => updateMock.mock.calls.length).toBe(1);

      expect(updateMock).toBeCalledTimes(1);

      expect(updateMock).toBeCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            email_jsonb: [{ email: "ada@example.com", type: "Work" }],
            phone_jsonb: null,
          }),
        }),
      );
    });

    it("saves the campaign status picked in the misc section", async () => {
      // Arrange
      const updateMock = vi.fn().mockResolvedValue({ data: {} });
      const screen = await render(
        <ContactEditBasic silent dataProvider={{ update: updateMock }} />,
      );
      const statusInput = screen.getByRole("combobox", {
        name: "Campaign status",
      });
      await expect.element(statusInput).toBeInTheDocument();

      // Act
      await statusInput.click();
      await screen.getByRole("listbox").getByText("Active").click();
      await screen.getByRole("button", { name: /^save$/i }).click();
      await expect
        .poll(() => screen.getByText("Element updated"))
        .toBeInTheDocument();
      await screen.getByLabelText("Close toast").click();

      // Assert
      expect(updateMock).toBeCalledTimes(1);
      expect(updateMock).toBeCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ campaign_status: "active" }),
        }),
      );
    });

    it("saves an empty campaign status as null rather than an empty string", async () => {
      // Arrange: the database only accepts one of the three statuses or null,
      // so clearing the input must not submit the select's empty string.
      const updateMock = vi.fn().mockResolvedValue({ data: {} });
      const screen = await render(
        <ContactEditBasic silent dataProvider={{ update: updateMock }} />,
      );
      const statusInput = screen.getByRole("combobox", {
        name: "Campaign status",
      });
      await expect.element(statusInput).toBeInTheDocument();

      // Act: pick a status, then clear it again before saving
      await statusInput.click();
      await screen.getByRole("listbox").getByText("Planning").click();
      await expect.element(statusInput).toHaveTextContent("Planning");

      // The clear affordance is the only button inside the trigger, and it only
      // renders while a status is set.
      await statusInput.getByRole("button").click();
      await userEvent.keyboard("{Escape}");
      await expect
        .element(statusInput.getByRole("button"))
        .not.toBeInTheDocument();

      await screen.getByRole("button", { name: /^save$/i }).click();
      await expect
        .poll(() => screen.getByText("Element updated"))
        .toBeInTheDocument();
      await screen.getByLabelText("Close toast").click();

      // Assert
      expect(updateMock).toBeCalledTimes(1);
      expect(updateMock).toBeCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({ campaign_status: null }),
        }),
      );
    });

    it("preserves existing email and phone entries on edit", async () => {
      const updateMock = vi.fn().mockResolvedValue({ data: {} });
      const screen = await render(
        <ContactEditWithEmailsAndPhones
          silent
          dataProvider={{ update: updateMock }}
        />,
      );

      // Wait for existing values to appear
      const emailInput = screen.getByPlaceholder("Email");
      await expect.element(emailInput).toHaveValue("ada@example.com");

      const phoneInput = screen.getByPlaceholder("Phone number");
      await expect.element(phoneInput).toHaveValue("0123456789");

      // Submit without changes
      await screen.getByRole("button", { name: /^save$/i }).click();
      await expect
        .poll(() => screen.getByText("Element updated"))
        .toBeInTheDocument();

      await screen.getByLabelText("Close toast").click();

      // Wait for the update call to complete
      expect(updateMock).toBeCalledTimes(1);

      // Verify existing data is preserved through the transform
      expect(updateMock).toBeCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            email_jsonb: [{ email: "ada@example.com", type: "Work" }],
            phone_jsonb: [{ number: "0123456789", type: "Work" }],
          }),
        }),
      );
    });
  });
  describe("mobile", () => {
    beforeAll(() => {
      page.viewport(375, 667);
    });

    it("shows empty email and phone inputs when the contact has none on mobile", async () => {
      const screen = await render(<ContactEditMobileBasic silent />);

      await screen.getByRole("button", { name: /edit/i }).click();
      // The form should display one empty email placeholder input
      await expect
        .element(screen.getByPlaceholder("Email"))
        .toBeInTheDocument();

      // The form should display one empty phone placeholder input
      await expect
        .element(screen.getByPlaceholder("Phone number"))
        .toBeInTheDocument();
    });

    it("does not submit empty email and phone entries on mobile", async () => {
      const updateMock = vi.fn().mockResolvedValue({ data: {} });
      const screen = await render(
        <ContactEditMobileBasic
          silent
          dataProvider={{
            update: updateMock,
          }}
        />,
      );
      await screen.getByRole("button", { name: /edit/i }).click();

      // Wait for the form to load
      await expect
        .element(screen.getByPlaceholder("Email"))
        .toBeInTheDocument();

      // Submit without filling anything
      await screen.getByRole("button", { name: /^save$/i }).click();
      await expect
        .poll(() => screen.getByText("Element updated"))
        .toBeInTheDocument();

      await screen.getByLabelText("Close toast").click();

      // Verify the transform cleaned up the empty arrays
      expect(updateMock).toBeCalledTimes(1);
      expect(updateMock).toBeCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            email_jsonb: null,
            phone_jsonb: null,
          }),
        }),
      );
    });

    it("submits only filled email and phone entries, stripping empty ones on mobile", async () => {
      const updateMock = vi.fn().mockResolvedValue({ data: {} });

      const screen = await render(
        <ContactEditMobileBasic
          dataProvider={{
            update: updateMock,
          }}
          silent
        />,
      );
      await screen.getByRole("button", { name: /edit/i }).click();

      // Wait for the edit sheet form to render before interacting
      const emailInput = screen.getByPlaceholder("Email");
      await expect.element(emailInput).toBeInTheDocument();
      await emailInput.fill("ada@example.com");

      // Leave the phone input empty and submit
      await screen.getByRole("button", { name: /^save$/i }).click();
      await expect
        .poll(() => screen.getByText("Element updated"))
        .toBeInTheDocument();

      await screen.getByLabelText("Close toast").click();

      // Wait for the update call to complete
      await expect.poll(() => updateMock.mock.calls.length).toBe(1);

      expect(updateMock).toBeCalledTimes(1);

      expect(updateMock).toBeCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            email_jsonb: [{ email: "ada@example.com", type: "Work" }],
            phone_jsonb: null,
          }),
        }),
      );
    });

    it("preserves existing email and phone entries on edit on mobile", async () => {
      const updateMock = vi.fn().mockResolvedValue({ data: {} });
      const screen = await render(
        <ContactEditMobileWithEmailsAndPhones
          silent
          dataProvider={{ update: updateMock }}
        />,
      );
      await screen.getByRole("button", { name: /edit/i }).click();

      // Wait for existing values to appear
      const emailInput = screen.getByPlaceholder("Email");
      await expect.element(emailInput).toHaveValue("ada@example.com");

      const phoneInput = screen.getByPlaceholder("Phone number");
      await expect.element(phoneInput).toHaveValue("0123456789");

      // Submit without changes
      await screen.getByRole("button", { name: /^save$/i }).click();
      await expect
        .poll(() => screen.getByText("Element updated"))
        .toBeInTheDocument();

      await screen.getByLabelText("Close toast").click();

      // Wait for the update call to complete
      expect(updateMock).toBeCalledTimes(1);

      // Verify existing data is preserved through the transform
      expect(updateMock).toBeCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            email_jsonb: [{ email: "ada@example.com", type: "Work" }],
            phone_jsonb: [{ number: "0123456789", type: "Work" }],
          }),
        }),
      );
    });
  });
});
