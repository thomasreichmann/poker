-- Harden realtime broadcast functions so failures never block writes

-- Helper: safe wrapper to call realtime.broadcast_changes without raising
create or replace function public.try_broadcast_changes(
  topic text,
  event text,
  operation text,
  table_name text,
  table_schema text,
  new_row anyelement,
  old_row anyelement
) returns void
language plpgsql
as $$
begin
  begin
    perform realtime.broadcast_changes(topic, event, operation, table_name, table_schema, new_row, old_row);
  exception when others then
    -- swallow any errors to avoid interfering with application DML
    null;
  end;
end;
$$;

-- Replace functions to use try_broadcast_changes
create or replace function public.broadcast_poker_games_changes()
returns trigger
security definer
language plpgsql
as $$
begin
  perform public.try_broadcast_changes(
    'topic:' || coalesce(NEW.id, OLD.id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  return null;
end;
$$;

create or replace function public.broadcast_poker_players_changes()
returns trigger
security definer
language plpgsql
as $$
declare
  gid uuid;
begin
  gid := coalesce(NEW.game_id, OLD.game_id);
  perform public.try_broadcast_changes(
    'topic:' || gid::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  return null;
end;
$$;

create or replace function public.broadcast_poker_cards_changes()
returns trigger
security definer
language plpgsql
as $$
declare
  gid uuid;
begin
  gid := coalesce(NEW.game_id, OLD.game_id);
  perform public.try_broadcast_changes(
    'topic:' || gid::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  return null;
end;
$$;

create or replace function public.broadcast_poker_actions_changes()
returns trigger
security definer
language plpgsql
as $$
declare
  gid uuid;
begin
  gid := coalesce(NEW.game_id, OLD.game_id);
  perform public.try_broadcast_changes(
    'topic:' || gid::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  return null;
end;
$$;
