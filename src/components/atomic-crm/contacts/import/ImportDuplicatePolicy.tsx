import { useTranslate } from "ra-core";
import { useId } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { DuplicatePolicy } from "./duplicates";
import { DUPLICATE_POLICIES } from "./duplicates";

type ImportDuplicatePolicyProps = {
  value: DuplicatePolicy;
  onChange(policy: DuplicatePolicy): void;
};

/**
 * The one decision the import cannot make on the user's behalf: what happens to
 * a row whose email already belongs to a contact in the CRM. Sits on the mapping
 * step, next to the action it governs, and applies to the whole run.
 */
export function ImportDuplicatePolicy({
  value,
  onChange,
}: ImportDuplicatePolicyProps) {
  const translate = useTranslate();
  const groupId = useId();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          {translate("resources.contacts.import.duplicates_title")}
        </p>
        <p className="text-sm text-muted-foreground">
          {translate("resources.contacts.import.duplicates_hint")}
        </p>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(next) => onChange(next as DuplicatePolicy)}
        aria-label={translate("resources.contacts.import.duplicates_title")}
      >
        {DUPLICATE_POLICIES.map((policy) => (
          <div key={policy} className="flex flex-row items-start gap-2">
            <RadioGroupItem value={policy} id={`${groupId}-${policy}`} />
            <div className="flex flex-col gap-1">
              <Label
                htmlFor={`${groupId}-${policy}`}
                className="text-foreground"
              >
                {translate(`resources.contacts.import.duplicates_${policy}`)}
              </Label>
              <p className="text-xs text-muted-foreground">
                {translate(
                  `resources.contacts.import.duplicates_${policy}_hint`,
                )}
              </p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
