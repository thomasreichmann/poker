-- Realtime Broadcast setup for poker tables
-- Reference: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes#using-broadcast

-- Allow authenticated users to receive broadcasts on private channels
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname = 'authenticated_can_receive_broadcasts'
  ) then
    create policy "authenticated_can_receive_broadcasts"
      on "realtime"."messages"
      for select
      to authenticated
      using (true);
  end if;
end $$;

-- Broadcast function for poker_games (topic by game id)
create or replace function public.broadcast_poker_games_changes()
returns trigger
security definer
language plpgsql
as $$
begin
  perform realtime.broadcast_changes(
    'topic:' || coalesce(NEW.id, OLD.id)::text, -- topic
    TG_OP,                                     -- event
    TG_OP,                                     -- operation (alias)
    TG_TABLE_NAME,                             -- table
    TG_TABLE_SCHEMA,                           -- schema
    NEW,                                       -- new record
    OLD                                        -- old record
  );
  return null;
end;
$$;

drop trigger if exists trg_poker_games_broadcast on public.poker_games;
create trigger trg_poker_games_broadcast
after insert or update or delete on public.poker_games
for each row execute function public.broadcast_poker_games_changes();

-- Broadcast function for poker_players (topic by game_id)
create or replace function public.broadcast_poker_players_changes()
returns trigger
security definer
language plpgsql
as $$
declare
  gid uuid;
begin
  gid := coalesce(NEW.game_id, OLD.game_id);
  perform realtime.broadcast_changes(
    'topic:' || gid::text,
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
  return null;
end;
$$;

drop trigger if exists trg_poker_players_broadcast on public.poker_players;
create trigger trg_poker_players_broadcast
after insert or update or delete on public.poker_players
for each row execute function public.broadcast_poker_players_changes();

-- Broadcast function for poker_cards (topic by game_id)
create or replace function public.broadcast_poker_cards_changes()
returns trigger
security definer
language plpgsql
as $$
declare
  gid uuid;
begin
  gid := coalesce(NEW.game_id, OLD.game_id);
  perform realtime.broadcast_changes(
    'topic:' || gid::text,
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
  return null;
end;
$$;

drop trigger if exists trg_poker_cards_broadcast on public.poker_cards;
create trigger trg_poker_cards_broadcast
after insert or update or delete on public.poker_cards
for each row execute function public.broadcast_poker_cards_changes();

-- Broadcast function for poker_actions (topic by game_id)
create or replace function public.broadcast_poker_actions_changes()
returns trigger
security definer
language plpgsql
as $$
declare
  gid uuid;
begin
  gid := coalesce(NEW.game_id, OLD.game_id);
  perform realtime.broadcast_changes(
    'topic:' || gid::text,
    TG_OP, TG_OP, TG_TABLE_NAME, TG_TABLE_SCHEMA, NEW, OLD
  );
  return null;
end;
$$;

drop trigger if exists trg_poker_actions_broadcast on public.poker_actions;
create trigger trg_poker_actions_broadcast
after insert or update or delete on public.poker_actions
for each row execute function public.broadcast_poker_actions_changes();


