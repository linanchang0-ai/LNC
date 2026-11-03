alter table public.orders add column if not exists shipping_label_path text;

insert into storage.buckets (id, name, public)
values ('shipping-labels', 'shipping-labels', false)
on conflict (id) do update set public = false;
