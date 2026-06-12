-- KnowYourMechanic Phase 2 auth profile linking

create or replace function public.link_current_auth_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_auth_id uuid;
  current_phone text;
  normalized_phone text;
  linked_profile public.profiles;
begin
  current_auth_id := auth.uid();

  if current_auth_id is null then
    raise exception 'not authenticated';
  end if;

  select regexp_replace(phone, '\D', '', 'g')
  into current_phone
  from auth.users
  where id = current_auth_id;

  if current_phone is null or current_phone = '' then
    raise exception 'authenticated user has no phone';
  end if;

  normalized_phone := right(current_phone, 10);

  select *
  into linked_profile
  from public.profiles
  where phone_number = current_phone
     or phone_number = normalized_phone
  limit 1;

  if linked_profile.id is null then
    raise exception 'profile not found for authenticated phone';
  end if;

  if linked_profile.auth_user_id is not null and linked_profile.auth_user_id <> current_auth_id then
    raise exception 'profile already linked to another auth user';
  end if;

  update public.profiles
  set auth_user_id = current_auth_id,
      updated_at = now()
  where id = linked_profile.id
  returning * into linked_profile;

  return linked_profile;
end;
$$;

grant execute on function public.link_current_auth_profile() to authenticated;
