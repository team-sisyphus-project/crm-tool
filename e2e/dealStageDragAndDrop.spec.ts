import { expect, test } from "./fixtures";

// Stage values and labels come from the default deal pipeline configuration.
const SOURCE_STAGE = { value: "opportunity", label: "Opportunity" };
const TARGET_STAGE = { value: "proposal-sent", label: "Proposal Sent" };

const DRAGGED_DEAL = "Website redesign";
const SETTLED_DEAL = "Print campaign";
const STAGE_CHANGE_NOTE = `Stage changed from ${SOURCE_STAGE.label} to ${TARGET_STAGE.label}`;

// The class a stage column carries while it is the active drop target. Waiting
// on it is what keeps the keyboard drag deterministic: every step waits for the
// board to acknowledge the previous one instead of sleeping.
const DROP_TARGET_HIGHLIGHT = /bg-accent/;

test("user drags a deal to another stage column", async ({
  page,
  createSales,
  createCompany,
  createDeal,
  menu,
}) => {
  const sales = await createSales({
    first_name: "John",
    last_name: "Doe",
    email: "john@doe.com",
    password: "password",
  });

  const company = await createCompany({ name: "Acme Inc", salesId: sales.id });

  const draggedDeal = await createDeal({
    name: DRAGGED_DEAL,
    stage: SOURCE_STAGE.value,
    companyId: company.id,
    salesId: sales.id,
    amount: 12000,
  });

  // A deal already sitting in the destination, so the drop lands in a column
  // that is not empty — the common case on a real pipeline.
  await createDeal({
    name: SETTLED_DEAL,
    stage: TARGET_STAGE.value,
    companyId: company.id,
    salesId: sales.id,
    amount: 3000,
  });

  await page.goto("/");
  await page.getByLabel("Email").fill("john@doe.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveTitle(/Atomic CRM/);
  await menu.goToDeals();

  // Each stage column is a drop zone keyed by its stage value, and each card a
  // drag handle keyed by its deal id — the board's addressable DOM contract.
  const column = (stage: string) =>
    page.locator(`[data-rfd-droppable-id="${stage}"]`);
  const dragHandle = page.locator(
    `[data-rfd-drag-handle-draggable-id="${draggedDeal.id}"]`,
  );

  await expect(
    column(SOURCE_STAGE.value).getByText(DRAGGED_DEAL),
  ).toBeVisible();
  await expect(
    column(TARGET_STAGE.value).getByText(SETTLED_DEAL),
  ).toBeVisible();

  // Armed before the drop: the note is written once the stage move is
  // persisted, so this response is the signal that the drag fully round-tripped.
  const stageChangeLogged = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/deal_notes"),
  );

  // Keyboard drag: @hello-pangea/dnd lifts on Space, crosses columns with the
  // arrow keys and drops on Space. Unlike a synthetic mouse drag, every step
  // has an observable effect to wait on, so no timing guesses are needed.
  await dragHandle.focus();
  await page.keyboard.press("Space");
  await expect(column(SOURCE_STAGE.value)).toHaveClass(DROP_TARGET_HIGHLIGHT);

  await page.keyboard.press("ArrowRight");
  await expect(column(TARGET_STAGE.value)).toHaveClass(DROP_TARGET_HIGHLIGHT);

  await page.keyboard.press("Space");

  // The card now renders under the destination stage, and only there.
  await expect(
    column(TARGET_STAGE.value).getByText(DRAGGED_DEAL),
  ).toBeVisible();
  await expect(column(SOURCE_STAGE.value).getByText(DRAGGED_DEAL)).toHaveCount(
    0,
  );

  const stageChangeResponse = await stageChangeLogged;
  expect(stageChangeResponse.ok()).toBe(true);

  await column(TARGET_STAGE.value).getByText(DRAGGED_DEAL).click();

  const dealDialog = page.getByRole("dialog");
  await expect(
    dealDialog.getByRole("heading", { name: DRAGGED_DEAL }),
  ).toBeVisible();
  // The move was persisted...
  await expect(
    dealDialog.getByText(TARGET_STAGE.label, { exact: true }),
  ).toBeVisible();
  // ...and the timeline records it exactly once.
  await expect(dealDialog.getByText(STAGE_CHANGE_NOTE)).toHaveCount(1);
  await expect(dealDialog.getByText(STAGE_CHANGE_NOTE)).toBeVisible();
});
