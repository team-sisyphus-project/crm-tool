-- Add the next-action pair to both note tables.
-- `next_action` holds what the sales rep committed to do after the logged
-- activity, `next_action_date` when it is due. Both are nullable: a note
-- without a follow-up keeps both columns null.
-- The `activity_log` view needs no change: it projects notes through
-- `to_json(cn.*)` / `to_json(dn.*)`, whole-row references that expand to the
-- table's current column set at execution time.

alter table "public"."contact_notes" add column "next_action" text;

alter table "public"."contact_notes" add column "next_action_date" timestamp with time zone;

alter table "public"."deal_notes" add column "next_action" text;

alter table "public"."deal_notes" add column "next_action_date" timestamp with time zone;
