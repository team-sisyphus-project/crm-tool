import { expect, test } from "./fixtures";

const NEXT_ACTION = "Send the proposal";
const DEADLINE = "2027-04-11T21:00";

test.describe("note next action", () => {
  test.beforeEach(async ({ createSales, createCompany, createContact }) => {
    const sales = await createSales({
      first_name: "John",
      last_name: "Doe",
      email: "john@doe.com",
      password: "password",
    });

    const company = await createCompany({
      name: "Smith Corp",
      salesId: sales.id,
    });

    await createContact({
      first_name: "Jane",
      last_name: "Smith",
      title: "CEO",
      sales_id: sales.id,
      company_id: company.id,
    });
  });

  test("a note next action creates a reminder task and shows up in the activity log", async ({
    page,
    isMobile,
    menu,
    dismissToast,
  }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("john@doe.com");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveTitle(/Atomic CRM/);

    await menu.goToContacts();
    await page.getByText("Jane Smith").click();
    await page.waitForLoadState("networkidle");

    if (isMobile) {
      // The mobile note sheet shows the next action fields without an options toggle.
      await page.getByRole("button", { name: "Create" }).click();
      await page.getByRole("menuitem", { name: "Note" }).click();
      await page.getByPlaceholder("Add a note").fill("Recap of the call");
      await page.getByLabel("Next action").fill(NEXT_ACTION);
      await page.getByLabel("Deadline").fill(DEADLINE);
      await page.getByRole("button", { name: "Save" }).click();
    } else {
      await page.getByPlaceholder("Add a note").fill("Recap of the call");
      await page.getByRole("button", { name: "Show options" }).click();
      await page.getByLabel("Next action").fill(NEXT_ACTION);
      await page.getByLabel("Deadline").fill(DEADLINE);
      await page.getByRole("button", { name: "Add this note" }).click();
    }

    await dismissToast("Note added");

    // The reminder task was really inserted in the `tasks` table.
    if (isMobile) {
      await page.getByText("1 task").click();
      await expect(page.getByText(NEXT_ACTION)).toBeVisible();
    } else {
      await expect(page.getByText("Tasks").locator("..")).toHaveText(
        new RegExp(NEXT_ACTION),
      );
      // The next action is also readable on the note itself.
      await expect(page.getByText("Next action").first()).toBeVisible();
    }

    // The activity log is a database view built on a whole-row projection of
    // the notes table: reading the next action there proves the new columns
    // travel all the way through it.
    await menu.goToDashboard();

    await expect(page.getByText("Latest Activity")).toBeVisible();
    const activityLog = page
      .getByText("Latest Activity")
      .locator("xpath=../..");
    await expect(activityLog).toHaveText(/Next action/);
    await expect(activityLog).toHaveText(new RegExp(NEXT_ACTION));
  });
});
