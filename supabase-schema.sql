-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
-- If you already have a profiles table with "credits", run: alter table public.profiles rename column credits to credits_minutes;

-- profiles table (extends auth with app-specific fields)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    credits_minutes integer not null default 0,
    marketing_opt_in boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists marketing_opt_in boolean not null default false;

-- Sync new auth users into profiles (including marketing_opt_in from signUp metadata when client has no session).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, marketing_opt_in)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false)
  )
  on conflict (id) do update
    set email = excluded.email,
        marketing_opt_in = excluded.marketing_opt_in,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "Users can read own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);
