import { useTranslate } from "ra-core";
import { Badge } from "@/components/ui/badge";
import { parseCampaignStatus } from "../campaignStatus";
import { CAMPAIGN_STATUS_VOCABULARY } from "./campaignStatusVocabulary";

/**
 * The lifecycle of a contact's or a company's campaign, as a single badge.
 *
 * Renders nothing when the record carries no status, or a status the
 * application does not know about: an unreadable badge would be worse than no
 * badge at all, and the row it sits on already names the campaign.
 */
export const CampaignStatusBadge = ({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) => {
  const translate = useTranslate();
  const campaignStatus = parseCampaignStatus(status);

  if (!campaignStatus) return null;

  const { labelKey, tone } = CAMPAIGN_STATUS_VOCABULARY[campaignStatus];

  return (
    <Badge variant={tone} className={className}>
      {translate(labelKey)}
    </Badge>
  );
};
