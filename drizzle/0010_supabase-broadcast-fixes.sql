-- Fix broadcast_poker_cards_changes UPDATE logic and harden search_path
create or replace function public.broadcast_poker_cards_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  gid uuid;
  row_new public.poker_cards%rowtype;
  row_old public.poker_cards%rowtype;
begin
  row_new := NEW;
  row_old := OLD;
  gid := coalesce(row_new.game_id, row_old.game_id);

  if TG_OP = 'INSERT' then
    if row_new.player_id is null then
      perform realtime.broadcast_changes(
        'topic:' || gid::text,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        row_new,
        row_old
      );
    end if;
    return NEW;

  elsif TG_OP = 'UPDATE' then
    -- Broadcast if either version represents a community card
    if (row_new.player_id is null) or (row_old.player_id is null) then
      perform realtime.broadcast_changes(
        'topic:' || gid::text,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        row_new,
        row_old
      );
    end if;
    return NEW;

  elsif TG_OP = 'DELETE' then
    if row_old.player_id is null then
      perform realtime.broadcast_changes(
        'topic:' || gid::text,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        row_new,
        row_old
      );
    end if;
    return OLD;
  end if;

  return null;
end;
$function$;

-- Harden search_path for broadcast and helper functions
alter function public.try_broadcast_changes(text, text, text, text, text, anyelement, anyelement)
  set search_path = public, pg_temp;

alter function public.broadcast_poker_actions_changes()
  set search_path = public, pg_temp;

alter function public.broadcast_poker_games_changes()
  set search_path = public, pg_temp;

alter function public.broadcast_poker_players_changes()
  set search_path = public, pg_temp;

alter function public.poker_changes()
  set search_path = public, pg_temp;

alter function public.rebroadcast_player_reveal()
  set search_path = public, pg_temp;

alter function public.rebroadcast_reveals_on_showdown()
  set search_path = public, pg_temp;

alter function public.should_reveal_card_public(uuid, uuid, boolean)
  set search_path = public, pg_temp;

alter function public.broadcast_game_with_relations()
  set search_path = public, pg_temp;

-- Ensure view runs with invoker privileges (prevents privilege escalation)
alter view public.cards set (security_invoker = true);

-- Add indexes for foreign keys to improve performance
create index if not exists idx_poker_actions_game_id on public.poker_actions(game_id);
create index if not exists idx_poker_actions_player_id on public.poker_actions(player_id);
create index if not exists idx_poker_cards_game_id on public.poker_cards(game_id);
create index if not exists idx_poker_cards_player_id on public.poker_cards(player_id);
create index if not exists idx_poker_games_current_player_turn on public.poker_games(current_player_turn);
create index if not exists idx_poker_players_game_id on public.poker_players(game_id);
create index if not exists idx_poker_players_user_id on public.poker_players(user_id);
create index if not exists idx_poker_timeouts_game_id on public.poker_timeouts(game_id);
create index if not exists idx_poker_timeouts_player_id on public.poker_timeouts(player_id);
create index if not exists idx_poker_timeouts_reported_by on public.poker_timeouts(reported_by);