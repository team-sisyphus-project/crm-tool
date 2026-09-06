/**
 * Lifecycle of the campaign a contact or a company is associated with.
 *
 * Fixed enum: unlike `companySectors` or `noteStatuses`, it is not configurable
 * through the `<CRM>` props, and both `public.contacts` and `public.companies`
 * enforce the very same list with a check constraint. Keep the two in sync.
 */
export const CAMPAIGN_STATUSES = ["planning", "active", "completed"] as const;

export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

const isCampaignStatus = (value: string): value is CampaignStatus =>
  (CAMPAIGN_STATUSES as readonly string[]).includes(value);

/**
 * Narrow an untrusted string (CSV cell, JSON payload) to a campaign status.
 * Matching is case-insensitive and surrounding whitespace is ignored; anything
 * else becomes `null` rather than reaching the database and tripping the check
 * constraint.
 */
export const parseCampaignStatus = (
  value: string | null | undefined,
): CampaignStatus | null => {
  const normalized = value?.trim().toLowerCase();
  return normalized && isCampaignStatus(normalized) ? normalized : null;
};
