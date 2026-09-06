import { type ReactNode } from "react";
import { Link } from "react-router";

import { useIsCompactActivityLog } from "./ActivityLogDensityContext";

type ActivityLogNoteProps = {
  header: ReactNode;
  text: string;
  link: string | false;
  /** Next-action summary line, rendered under the note text and outside the link. */
  nextAction?: ReactNode;
};

export function ActivityLogNote({
  header,
  text,
  link,
  nextAction,
}: ActivityLogNoteProps) {
  const isCompact = useIsCompactActivityLog();

  if (!text) {
    return null;
  }

  const plainText = text.replace(/\s+/g, " ").trim();

  const textElement = (
    <p className="text-sm line-clamp-3 overflow-hidden">{plainText}</p>
  );

  // A compact row keeps the headline — who did what, with its links — and the
  // follow-up highlight, and drops the note body, which the note itself still
  // carries.
  if (isCompact) {
    return (
      <div className="flex w-full items-center gap-2">
        {header}
        {nextAction}
      </div>
    );
  }

  return (
    <div className="p-0">
      <div className="flex flex-col space-y-2 w-full">
        <div className="flex flex-row space-x-1 items-center w-full">
          {header}
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
          {nextAction}
        </div>
      </div>
    </div>
  );
}
