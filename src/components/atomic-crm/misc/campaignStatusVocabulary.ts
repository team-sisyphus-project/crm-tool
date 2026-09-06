import { CAMPAIGN_STATUSES, type CampaignStatus } from "../campaignStatus";

/**
 * How each campaign status reaches the screen: the translation key of its label
 * and the badge tone that carries it.
 *
 * Single source for the display vocabulary — the badge and any future status
 * input read it from here, so a wording or tone change happens once.
 *
 * The tones are ordered by how much attention the status deserves: an active
 * campaign is the one a sales rep acts on (strongest tone), a completed one is
 * history (muted), and a campaign still being planned is only an outline.
 */
export const CAMPAIGN_STATUS_VOCABULARY: Record<
  CampaignStatus,
  { labelKey: string; tone: "default" | "secondary" | "outline" }
> = {
  planning: { labelKey: "crm.campaign_status.planning", tone: "outline" },
  active: { labelKey: "crm.campaign_status.active", tone: "default" },
  completed: { labelKey: "crm.campaign_status.completed", tone: "secondary" },
};

/**
 * The same three statuses as choices for a `<SelectInput>`, in lifecycle order.
 *
 * `name` is a translation key rather than a translated string: a non-reference
 * `<SelectInput>` translates its choice text by default, so the option list and
 * the badge end up reading from the same key.
 *
 * Derived from `CAMPAIGN_STATUSES` instead of being spelled out again, so a
 * status added to the enum cannot be missing from the form.
 */
export const CAMPAIGN_STATUS_CHOICES = CAMPAIGN_STATUSES.map((status) => ({
  id: status,
  name: CAMPAIGN_STATUS_VOCABULARY[status].labelKey,
}));
