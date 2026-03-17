-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
-- If you already have a profiles table with "credits", run: alter table public.profiles rename column credits to credits_minutes;

-- profiles table (extends auth with app-specific fields)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    credits_minutes integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

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
