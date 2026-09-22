-- INVENTRA / Season 1. Apply once using Supabase SQL editor or the Supabase CLI.
-- No real pupil rows are embedded. The roster importer is a separate dry-run-first step.
begin;
create table public.classes (
 id text primary key, name text not null, year smallint not null check (year between 2 and 6)
);
create table public.students (
 student_id text primary key, fullname text not null check (length(fullname) between 2 and 200),
 class_id text not null references public.classes(id), active boolean not null default true,
 updated_at timestamptz not null default now()
);
create index students_name_lower on public.students (lower(fullname));
create table public.player_profiles (
 student_id text primary key references public.students(student_id), created_at timestamptz not null default now()
);
create table public.levels (
 id integer primary key check (id between 1 and 3), name text not null, season integer not null default 1 check(season=1), physics_version text not null
);
insert into public.levels(id,name,physics_version) values
 (1,'First Motion','motion-1.0.0'),(2,'Mind the Gap','motion-1.0.0'),(3,'Launch It','motion-1.0.0');
create table public.level_attempts (
 id uuid primary key, student_id text not null references public.students(student_id),level_id integer not null references public.levels(id),
 won boolean not null, score integer not null check(score between 0 and 10000),stars integer not null check(stars between 0 and 3),
 cost integer not null check(cost>=0),ticks integer not null check(ticks between 1 and 1200),build jsonb not null,physics_version text not null,created_at timestamptz not null default now()
);
create index attempts_student_level on public.level_attempts(student_id,level_id,created_at);
create table public.player_progress (
 student_id text not null references public.students(student_id),level_id integer not null references public.levels(id),
 best_score integer not null,stars integer not null check(stars between 1 and 3),cost integer not null,time double precision not null,parts integer not null,
 best_build jsonb not null,updated_at timestamptz not null default now(),primary key(student_id,level_id)
);
create table public.leaderboard_records (
 student_id text not null references public.students(student_id),level_id integer not null references public.levels(id),score integer not null,
 cost integer not null,time double precision not null,parts integer not null,updated_at timestamptz not null default now(),primary key(student_id,level_id)
);
create index leaderboard_rank on public.leaderboard_records(level_id,score desc,updated_at,student_id);
create table public.player_sessions (
 token_hash text primary key check(length(token_hash)=64),student_id text not null references public.students(student_id),expires_at bigint not null
);
create index session_expiry on public.player_sessions(expires_at);
create table public.request_limits (key text primary key,count integer not null,expires_at bigint not null);

-- Name selection is deliberately passwordless. A server session narrows subsequent
-- requests to the selected student_id, but cannot prove that a pupil chose themselves.
-- Direct Supabase browser reads/writes are denied, including for authenticated users.
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.player_profiles enable row level security;
alter table public.levels enable row level security;
alter table public.level_attempts enable row level security;
alter table public.player_progress enable row level security;
alter table public.leaderboard_records enable row level security;
alter table public.player_sessions enable row level security;
alter table public.request_limits enable row level security;
revoke all on public.classes,public.students,public.player_profiles,public.levels,public.level_attempts,public.player_progress,public.leaderboard_records,public.player_sessions,public.request_limits from anon,authenticated;
grant all on public.classes,public.students,public.player_profiles,public.levels,public.level_attempts,public.player_progress,public.leaderboard_records,public.player_sessions,public.request_limits to service_role;

create function public.inventra_rate_limit(p_key text,p_max integer,p_expires bigint) returns boolean language plpgsql set search_path='' as $$
declare n integer;
begin
 delete from public.request_limits where expires_at < (extract(epoch from now())*1000)::bigint;
 delete from public.player_sessions where expires_at < (extract(epoch from now())*1000)::bigint;
 insert into public.request_limits(key,count,expires_at) values(p_key,1,p_expires)
 on conflict(key) do update set count=public.request_limits.count+1 returning count into n;
 return n<=p_max;
end $$;

-- Only the server calls this after replaying the build. One transaction updates all
-- records; retries reuse the same attempt UUID and cannot inflate progression.
create function public.inventra_save_attempt(p_student text,p_attempt uuid,p_level integer,p_build jsonb,p_won boolean,p_score integer,p_stars integer,p_cost integer,p_ticks integer,p_time double precision,p_parts integer,p_version text)
returns void language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.students where student_id=p_student and active) then raise exception 'Inactive pupil'; end if;
 if p_level>1 and not exists(select 1 from public.player_progress where student_id=p_student and level_id=p_level-1) then raise exception 'Level locked'; end if;
 if not exists(select 1 from public.levels where id=p_level and physics_version=p_version) then raise exception 'Physics version mismatch'; end if;
 if exists(select 1 from public.level_attempts where id=p_attempt) then return; end if;
 insert into public.level_attempts(id,student_id,level_id,won,score,stars,cost,ticks,build,physics_version)
 values(p_attempt,p_student,p_level,p_won,p_score,p_stars,p_cost,p_ticks,p_build,p_version);
 if p_won then
  insert into public.player_progress(student_id,level_id,best_score,stars,cost,time,parts,best_build)
  values(p_student,p_level,p_score,p_stars,p_cost,p_time,p_parts,p_build)
  on conflict(student_id,level_id) do update set best_score=excluded.best_score,stars=greatest(public.player_progress.stars,excluded.stars),cost=excluded.cost,time=excluded.time,parts=excluded.parts,best_build=excluded.best_build,updated_at=now()
  where excluded.best_score>public.player_progress.best_score;
  update public.player_progress set stars=greatest(stars,p_stars) where student_id=p_student and level_id=p_level;
  insert into public.leaderboard_records(student_id,level_id,score,cost,time,parts) values(p_student,p_level,p_score,p_cost,p_time,p_parts)
  on conflict(student_id,level_id) do update set score=excluded.score,cost=excluded.cost,time=excluded.time,parts=excluded.parts,updated_at=now()
  where excluded.score>public.leaderboard_records.score;
 end if;
end $$;

-- Atomic, non-destructive roster import: same IDs update existing pupils; absent
-- pupils are NOT deleted or deactivated. Only explicit active=false deactivates.
create function public.inventra_import_roster(p_rows jsonb) returns integer language plpgsql set search_path='' as $$
declare r jsonb; n integer:=0; class_key text;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>5000 then raise exception 'Invalid roster'; end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  if coalesce(r->>'student_id','') !~ '^[A-Za-z0-9_-]{1,64}$' or length(coalesce(r->>'fullname',''))<2 or coalesce(r->>'class','')='' or (r->>'year')::integer not between 2 and 6 or jsonb_typeof(r->'active')<>'boolean' then raise exception 'Invalid roster row'; end if;
  class_key=(r->>'year')||':'||upper(trim(r->>'class'));
  insert into public.classes(id,name,year) values(class_key,upper(trim(r->>'class')),(r->>'year')::integer) on conflict(id) do update set name=excluded.name,year=excluded.year;
  insert into public.students(student_id,fullname,class_id,active) values(r->>'student_id',trim(r->>'fullname'),class_key,(r->>'active')::boolean)
  on conflict(student_id) do update set fullname=excluded.fullname,class_id=excluded.class_id,active=excluded.active,updated_at=now();
  insert into public.player_profiles(student_id) values(r->>'student_id') on conflict do nothing;
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function public.inventra_rate_limit(text,integer,bigint) from public,anon,authenticated;
revoke all on function public.inventra_save_attempt(text,uuid,integer,jsonb,boolean,integer,integer,integer,integer,double precision,integer,text) from public,anon,authenticated;
revoke all on function public.inventra_import_roster(jsonb) from public,anon,authenticated;
grant execute on function public.inventra_rate_limit(text,integer,bigint) to service_role;
grant execute on function public.inventra_save_attempt(text,uuid,integer,jsonb,boolean,integer,integer,integer,integer,double precision,integer,text) to service_role;
grant execute on function public.inventra_import_roster(jsonb) to service_role;
commit;
