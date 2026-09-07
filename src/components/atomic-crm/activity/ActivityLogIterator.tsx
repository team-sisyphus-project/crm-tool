import { useMemo } from "react";
import {
  useListContext,
  useInfinitePaginationContext,
  useTranslate,
} from "ra-core";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/admin/spinner";
import { RotateCcw } from "lucide-react";
import {
  COMPANY_CREATED,
  CONTACT_CREATED,
  CONTACT_NOTE_CREATED,
  DEAL_CREATED,
  DEAL_NOTE_CREATED,
} from "../consts";
import type { Activity } from "../types";
import { ActivityLogCompanyCreated } from "./ActivityLogCompanyCreated";
import { ActivityLogContactCreated } from "./ActivityLogContactCreated";
import { ActivityLogContactNoteCreated } from "./ActivityLogContactNoteCreated";
import { ActivityLogDealCreated } from "./ActivityLogDealCreated";
import { ActivityLogDealNoteCreated } from "./ActivityLogDealNoteCreated";
import { ActivityLogDayGroup } from "./ActivityLogDayGroup";
import { groupActivitiesByDay } from "./activityDayGroups";
import { InfinitePagination } from "../misc/InfinitePagination";
import { useIsMobile } from "@/hooks/use-mobile";

export function ActivityLogIterator() {
  const isMobile = useIsMobile();
  const { data, isPending, error, refetch } = useListContext<Activity>();
  const { hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfinitePaginationContext();
  const translate = useTranslate();

  // The timeline reads day by day: only the most recent day stays open, older
  // days fold away so the panel shows what is new instead of everything.
  const dayGroups = useMemo(() => groupActivitiesByDay(data ?? []), [data]);

  if (isPending) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            className="flex flex-row gap-2 items-center px-2 py-1"
            key={index}
          >
            <Skeleton className="w-5 h-5 rounded-full shrink-0" />
            <Skeleton className="w-full h-4" />
          </div>
        ))}
      </div>
    );
  }

  if (error && !data?.length) {
    return (
      <div className="p-4">
        <div className="text-center text-muted-foreground mb-4">
          {translate("crm.dashboard.latest_activity_error", {
            _: "Error loading latest activity",
          })}
        </div>
        <div className="text-center mt-2">
          <Button onClick={() => refetch()}>
            <RotateCcw />
            {translate("crm.common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {dayGroups.map((dayGroup, index) => (
        <ActivityLogDayGroup
          key={dayGroup.key}
          date={dayGroup.date}
          count={dayGroup.items.length}
          defaultOpen={index === 0}
        >
          {dayGroup.items.map((activity, itemIndex) => (
            <ActivityItem key={activity.id ?? itemIndex} activity={activity} />
          ))}
        </ActivityLogDayGroup>
      ))}

      {/* Desktop: explicit Load More button */}
      {!isMobile && hasNextPage && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            fetchNextPage();
          }}
          className="flex w-full justify-center mt-2 text-sm underline hover:no-underline"
        >
          {isFetchingNextPage ? (
            <Spinner />
          ) : (
            translate("crm.activity.load_more")
          )}
        </a>
      )}

      {/* Mobile: auto-load on scroll via IntersectionObserver */}
      {isMobile && (
        <div className="flex justify-center mt-2">
          <InfinitePagination />
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  if (activity.type === COMPANY_CREATED) {
    return <ActivityLogCompanyCreated activity={activity} />;
  }

  if (activity.type === CONTACT_CREATED) {
    return <ActivityLogContactCreated activity={activity} />;
  }

  if (activity.type === CONTACT_NOTE_CREATED) {
    return <ActivityLogContactNoteCreated activity={activity} />;
  }

  if (activity.type === DEAL_CREATED) {
    return <ActivityLogDealCreated activity={activity} />;
  }

  if (activity.type === DEAL_NOTE_CREATED) {
    return <ActivityLogDealNoteCreated activity={activity} />;
  }

  return null;
}
