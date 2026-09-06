-- Add the campaign status to contacts and companies.
-- Nullable: an existing row has no status until someone sets one, and a record
-- with no associated campaign legitimately keeps a null status forever.
alter table public.companies add column if not exists campaign_status text;
alter table public.contacts add column if not exists campaign_status text;

-- The status is a fixed, non-configurable enum, so the database enforces it
-- rather than trusting every write path to send a valid value.
alter table public.companies drop constraint if exists companies_campaign_status_check;
alter table public.companies
    add constraint companies_campaign_status_check
    check (campaign_status in ('planning', 'active', 'completed'));

alter table public.contacts drop constraint if exists contacts_campaign_status_check;
alter table public.contacts
    add constraint contacts_campaign_status_check
    check (campaign_status in ('planning', 'active', 'completed'));

-- The frontend reads both entities through their summary view, so the column
-- must be exposed there too. Views are dropped first because a column cannot be
-- inserted in the middle of an existing view definition.
drop view if exists public.companies_summary;

create view public.companies_summary with (security_invoker = on) as
select
    c.id,
    c.created_at,
    c.name,
    c.sector,
    c.size,
    c.linkedin_url,
    c.website,
    c.phone_number,
    c.address,
    c.zipcode,
    c.city,
    c.state_abbr,
    c.sales_id,
    c.context_links,
    c.country,
    c.description,
    c.revenue,
    c.tax_identifier,
    c.logo,
    c.campaign,
    c.campaign_status,
    count(distinct d.id) as nb_deals,
    count(distinct co.id) as nb_contacts
from public.companies c
    left join public.deals d on c.id = d.company_id
    left join public.contacts co on c.id = co.company_id
group by c.id;

grant all on table public.companies_summary to anon;
grant all on table public.companies_summary to authenticated;
grant all on table public.companies_summary to service_role;

drop view if exists public.contacts_summary;

create view public.contacts_summary with (security_invoker = on) as
select
    co.id,
    co.first_name,
    co.last_name,
    co.gender,
    co.title,
    co.background,
    co.avatar,
    co.first_seen,
    co.last_seen,
    co.has_newsletter,
    co.status,
    co.tags,
    co.company_id,
    co.sales_id,
    co.linkedin_url,
    co.email_jsonb,
    co.phone_jsonb,
    co.campaign,
    co.campaign_status,
    (jsonb_path_query_array(co.email_jsonb, '$[*]."email"'))::text as email_fts,
    (jsonb_path_query_array(co.phone_jsonb, '$[*]."number"'))::text as phone_fts,
    c.name as company_name,
    count(distinct t.id) filter (where t.done_date is null) as nb_tasks
from public.contacts co
    left join public.tasks t on co.id = t.contact_id
    left join public.companies c on co.company_id = c.id
group by co.id, c.name;

grant all on table public.contacts_summary to anon;
grant all on table public.contacts_summary to authenticated;
grant all on table public.contacts_summary to service_role;
