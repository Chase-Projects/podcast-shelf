-- PodcastLB Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Podcasts table (cached from iTunes)
create table public.podcasts (
  id uuid primary key default uuid_generate_v4(),
  itunes_id text unique not null,
  title text not null,
  author text not null,
  artwork_url text not null,
  feed_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User's podcast library
create table public.user_podcasts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles on delete cascade not null,
  podcast_id uuid references public.podcasts on delete cascade not null,
  overall_rating decimal(2,1) check (overall_rating >= 0.5 and overall_rating <= 5.0),
  review_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, podcast_id)
);

-- Custom rating categories
create table public.custom_ratings (
  id uuid primary key default uuid_generate_v4(),
  user_podcast_id uuid references public.user_podcasts on delete cascade not null,
  category_name text not null,
  rating decimal(2,1) check (rating >= 0.5 and rating <= 5.0) not null,
  unique(user_podcast_id, category_name)
);

-- Favorite episodes
create table public.favorite_episodes (
  id uuid primary key default uuid_generate_v4(),
  user_podcast_id uuid references public.user_podcasts on delete cascade not null,
  episode_title text not null,
  episode_number text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security Policies

-- Profiles: public read, own write
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Podcasts: public read, authenticated write
alter table public.podcasts enable row level security;

create policy "Podcasts are viewable by everyone" on public.podcasts
  for select using (true);

create policy "Authenticated users can insert podcasts" on public.podcasts
  for insert with check (auth.role() = 'authenticated');

-- User Podcasts: public read, own write
alter table public.user_podcasts enable row level security;

create policy "User podcasts are viewable by everyone" on public.user_podcasts
  for select using (true);

create policy "Users can manage own podcasts" on public.user_podcasts
  for all using (auth.uid() = user_id);

-- Custom Ratings: public read, own write (via user_podcasts)
alter table public.custom_ratings enable row level security;

create policy "Custom ratings are viewable by everyone" on public.custom_ratings
  for select using (true);

create policy "Users can manage own custom ratings" on public.custom_ratings
  for all using (
    exists (
      select 1 from public.user_podcasts
      where user_podcasts.id = custom_ratings.user_podcast_id
      and user_podcasts.user_id = auth.uid()
    )
  );

-- Favorite Episodes: public read, own write (via user_podcasts)
alter table public.favorite_episodes enable row level security;

create policy "Favorite episodes are viewable by everyone" on public.favorite_episodes
  for select using (true);

create policy "Users can manage own favorite episodes" on public.favorite_episodes
  for all using (
    exists (
      select 1 from public.user_podcasts
      where user_podcasts.id = favorite_episodes.user_podcast_id
      and user_podcasts.user_id = auth.uid()
    )
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at on user_podcasts
create trigger user_podcasts_updated_at
  before update on public.user_podcasts
  for each row execute procedure public.handle_updated_at();

-- Indexes for performance
create index user_podcasts_user_id_idx on public.user_podcasts(user_id);
create index user_podcasts_podcast_id_idx on public.user_podcasts(podcast_id);
create index custom_ratings_user_podcast_id_idx on public.custom_ratings(user_podcast_id);
create index favorite_episodes_user_podcast_id_idx on public.favorite_episodes(user_podcast_id);
create index profiles_username_idx on public.profiles(username);
