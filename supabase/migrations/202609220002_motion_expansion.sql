-- Apply BEFORE deploying v0.2. Additive: pupils, sessions, progress and PBs survive.
-- The old v0.1 server remains accepted for Levels 1–3 during rollout/rollback.
begin;
alter table public.levels drop constraint levels_id_check;
alter table public.levels add constraint levels_id_check check(id between 1 and 10);
insert into public.levels(id,name,physics_version) values
 (4,'Faster Route','motion-2.0.0'),(5,'Heavy Cargo','motion-2.0.0'),
 (6,'Slippery Path','motion-2.0.0'),(7,'Balance Point','motion-2.0.0'),
 (8,'Bounce Back','motion-2.0.0'),(9,'Precision Drop','motion-2.0.0'),(10,'Motion Master','motion-2.0.0');
update public.levels set physics_version='motion-2.0.0' where id between 1 and 3;
create table public.weekly_records (
 week timestamptz not null,student_id text not null references public.students(student_id),
 level_id integer not null references public.levels(id),cost integer not null check(cost>=0),
 parts integer not null check(parts between 0 and 8),time double precision not null check(time>0 and time<=20),
 primary key(week,student_id)
);
alter table public.weekly_records enable row level security;
revoke all on public.weekly_records from public,anon,authenticated;
grant all on public.weekly_records to service_role;
create or replace function public.inventra_save_attempt(p_student text,p_attempt uuid,p_level integer,p_build jsonb,p_won boolean,p_score integer,p_stars integer,p_cost integer,p_ticks integer,p_time double precision,p_parts integer,p_version text)
returns void language plpgsql set search_path='' as $$
declare week_index integer; week_start timestamptz; weekly_level integer;
begin
 if not exists(select 1 from public.students where student_id=p_student and active) then raise exception 'Inactive pupil'; end if;
 if p_level>1 and not exists(select 1 from public.player_progress where student_id=p_student and level_id=p_level-1) then raise exception 'Level locked'; end if;
 if not exists(select 1 from public.levels where id=p_level and (physics_version=p_version or (id<=3 and p_version='motion-1.0.0'))) then raise exception 'Physics version mismatch'; end if;
 if p_parts not between 0 and 8 or p_time<=0 or p_time>20 then raise exception 'Invalid result'; end if;
 insert into public.level_attempts(id,student_id,level_id,won,score,stars,cost,ticks,build,physics_version)
 values(p_attempt,p_student,p_level,p_won,p_score,p_stars,p_cost,p_ticks,p_build,p_version) on conflict(id) do nothing;
 if not found then return; end if;
 if p_won then
  insert into public.player_progress(student_id,level_id,best_score,stars,cost,time,parts,best_build)
  values(p_student,p_level,p_score,p_stars,p_cost,p_time,p_parts,p_build)
  on conflict(student_id,level_id) do update set best_score=excluded.best_score,stars=greatest(public.player_progress.stars,excluded.stars),cost=excluded.cost,time=excluded.time,parts=excluded.parts,best_build=excluded.best_build,updated_at=now()
  where excluded.best_score>public.player_progress.best_score;
  update public.player_progress set stars=greatest(stars,p_stars) where student_id=p_student and level_id=p_level;
  insert into public.leaderboard_records(student_id,level_id,score,cost,time,parts) values(p_student,p_level,p_score,p_cost,p_time,p_parts)
  on conflict(student_id,level_id) do update set score=excluded.score,cost=excluded.cost,time=excluded.time,parts=excluded.parts,updated_at=now()
  where excluded.score>public.leaderboard_records.score;
  -- Only v0.2 results compete under the new component-price rules.
  if p_version='motion-2.0.0' then
   week_index=floor(extract(epoch from (now()-timestamptz '2026-09-20 16:00:00+00'))/604800)::integer;
   week_start=timestamptz '2026-09-20 16:00:00+00'+week_index*interval '7 days';
   weekly_level=1+((week_index%3+3)%3);
   if p_level=weekly_level then
    insert into public.weekly_records(week,student_id,level_id,cost,parts,time) values(week_start,p_student,p_level,p_cost,p_parts,p_time)
    on conflict(week,student_id) do update set cost=least(public.weekly_records.cost,excluded.cost),parts=least(public.weekly_records.parts,excluded.parts),time=least(public.weekly_records.time,excluded.time);
   end if;
  end if;
 end if;
end $$;
revoke all on function public.inventra_save_attempt(text,uuid,integer,jsonb,boolean,integer,integer,integer,integer,double precision,integer,text) from public,anon,authenticated;
grant execute on function public.inventra_save_attempt(text,uuid,integer,jsonb,boolean,integer,integer,integer,integer,double precision,integer,text) to service_role;
commit;
