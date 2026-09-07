import { useTranslate } from "ra-core";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { CampaignStatus } from "../types";

/**
 * Resolves a raw `campaign_status` value against the configured campaign
 * vocabulary. Returns `undefined` when the value is empty or unknown, so the
 * caller can fall back to a neutral rendering instead of inventing a label.
 */
const findCampaignStatus = (
  campaignStatuses: CampaignStatus[],
  value?: string | null,
): CampaignStatus | undefined =>
  value ? campaignStatuses.find((status) => status.value === value) : undefined;

/**
 * Color-coded badge for a campaign lifecycle state, so the state is
 * recognizable at a glance instead of being read word by word.
 *
 * The surface color comes from the configured status (a `var(--status-*)`
 * token), and the text stays on `--foreground`, which both themes already
 * define with the right contrast against those tinted surfaces.
 */
export const CampaignStatusBadge = ({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) => {
  const { campaignStatuses } = useConfigurationContext();
  const translate = useTranslate();
  const status = findCampaignStatus(campaignStatuses, value);

  if (!status) {
    return (
      <Badge
        variant="outline"
        className={cn("text-muted-foreground font-normal", className)}
      >
        {translate("crm.campaign_status.not_set")}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("text-foreground font-normal", className)}
      style={{ backgroundColor: status.color }}
    >
      {status.label}
    </Badge>
  );
};

/**
 * The same color cue in a compact dot, for dense surfaces such as a select
 * option where a full badge would fight with the option label.
 */
export const CampaignStatusDot = ({ color }: { color: string }) => (
  <span
    aria-hidden="true"
    className="inline-block w-2.5 h-2.5 rounded-full border"
    style={{ backgroundColor: color }}
  />
);
