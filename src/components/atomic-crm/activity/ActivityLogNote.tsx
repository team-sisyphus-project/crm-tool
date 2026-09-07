import { useState, type ReactNode } from "react";
import { useTranslate } from "ra-core";
import { ChevronDown } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActivityLogNoteProps = {
  header: ReactNode;
  text: string;
  link: string | false;
};

/**
 * A note event in the activity timeline.
 *
 * Collapsed (the default) the note body is clamped to a single line, so every
 * row in the timeline costs the same vertical space and the list stays
 * scannable. The disclosure control reveals the full body on demand.
 */
export function ActivityLogNote({ header, text, link }: ActivityLogNoteProps) {
  const translate = useTranslate();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) {
    return null;
  }

  const plainText = text.replace(/\s+/g, " ").trim();

  const textElement = (
    <p
      data-state={isExpanded ? "expanded" : "collapsed"}
      className={cn("text-sm", !isExpanded && "line-clamp-1")}
    >
      {plainText}
    </p>
  );

  return (
    <div className="px-2 py-1">
      <div
        className={cn(
          "flex flex-col w-full",
          isExpanded ? "space-y-2" : "space-y-1",
        )}
      >
        <div className="flex flex-row gap-2 items-center w-full">
          {header}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-5 shrink-0 text-muted-foreground"
            aria-expanded={isExpanded}
            aria-label={translate(
              isExpanded ? "crm.activity.collapse" : "crm.activity.expand",
            )}
            onClick={() => setIsExpanded((expanded) => !expanded)}
          >
            <ChevronDown
              className={cn("transition-transform", isExpanded && "rotate-180")}
            />
          </Button>
        </div>
        <div className="md:max-w-150 [&_p]:my-auto">
          {link !== false ? (
            <Link
              to={link}
              className="hover:bg-muted rounded transition-colors"
            >
              {textElement}
            </Link>
          ) : (
            textElement
          )}
        </div>
      </div>
    </div>
  );
}
