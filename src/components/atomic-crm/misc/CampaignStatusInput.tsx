import { SelectInput } from "@/components/admin/select-input";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { CampaignStatus } from "../types";
import { CampaignStatusDot } from "./CampaignStatusBadge";

const campaignStatusOptionText = (choice: CampaignStatus) => (
  <span className="inline-flex items-center gap-2">
    <CampaignStatusDot color={choice.color} />
    {choice.label}
  </span>
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
