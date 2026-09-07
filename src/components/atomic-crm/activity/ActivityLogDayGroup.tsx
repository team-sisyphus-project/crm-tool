import { useId, useState, type ReactNode } from "react";
import { useLocaleState, useTranslate } from "ra-core";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import { formatDayGroupDate, getRelativeDayName } from "./activityDayGroups";

type ActivityLogDayGroupProps = {
  /** Any event date of the day this group holds. */
  date: string;
  /** How many events the group holds, shown while it is folded. */
  count: number;
  /** Only the most recent day opens by default. */
  defaultOpen?: boolean;
  children: ReactNode;
};

/** Day header text: "Today", "Yesterday", or the localized date. */
const useDayLabel = (date: string) => {
  const translate = useTranslate();
  const [locale = "en"] = useLocaleState();
  const relativeDayName = getRelativeDayName(date);

  return relativeDayName
    ? translate(`crm.activity.${relativeDayName}`)
    : formatDayGroupDate(date, locale);
};

/**
 * One calendar day of the activity timeline, folded behind a single header line.
 *
 * Older days start closed: what happened days ago is context, not news, and
 * unfolding it is the reader's decision. The header keeps the day and its event
 * count visible so a folded group still says what it is hiding, and the events
 * themselves are only mounted once the group is open.
 */
export function ActivityLogDayGroup({
  date,
  count,
  defaultOpen = false,
  children,
}: ActivityLogDayGroupProps) {
  const translate = useTranslate();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const label = useDayLabel(date);

  return (
    <section data-state={isOpen ? "expanded" : "collapsed"}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-2 px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform",
            !isOpen && "-rotate-90",
          )}
        />
        <span>{label}</span>
        <span className="font-normal normal-case tracking-normal">
          {translate("crm.activity.entry_count", { smart_count: count })}
        </span>
      </button>
      <div id={contentId} className="space-y-1">
        {isOpen ? children : null}
      </div>
    </section>
  );
}
