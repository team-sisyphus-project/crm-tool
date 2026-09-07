import { SelectInput } from "@/components/admin/select-input";
import { Badge } from "@/components/ui/badge";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { CampaignStatus } from "../types";
import { CampaignStatusDot } from "./CampaignStatusBadge";

/**
 * The option reuses the Badge with its chrome suppressed: it reads as plain
 * text next to a colored dot, while the dot's size and the gap before the
 * label still come from the registered Badge instead of being restated here.
 */
const campaignStatusOptionText = (choice: CampaignStatus) => (
  <Badge variant="outline" className="border-transparent px-0 font-normal">
    <CampaignStatusDot color={choice.color} />
    {choice.label}
  </Badge>
);

/**
 * Campaign lifecycle selector for the contact and company edit forms. Each
 * option carries the same color cue as the badge shown on the detail views, so
 * picking a state and reading it back use one visual language.
 */
export const CampaignStatusInput = () => {
  const { campaignStatuses } = useConfigurationContext();

  return (
    <SelectInput
      source="campaign_status"
      choices={campaignStatuses}
      optionText={campaignStatusOptionText}
      optionValue="value"
      helperText={false}
    />
  );
};
