alter table "public"."videos" drop constraint "videos_status_check";

alter table "public"."videos" drop constraint "videos_user_id_fkey";

alter table "public"."videos" drop column "processed_url";

alter table "public"."videos" add column "thumbnail_url" text;

alter table "public"."videos" alter column "id" set default uuid_generate_v4();

alter table "public"."videos" alter column "size" set default 0;

alter table "public"."videos" add constraint "videos_status_check" CHECK ((status = ANY (ARRAY['processing'::text, 'ready'::text, 'failed'::text]))) not valid;

alter table "public"."videos" validate constraint "videos_status_check";

alter table "public"."videos" add constraint "videos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."videos" validate constraint "videos_user_id_fkey";

create policy "Users can insert own videos"
on "public"."videos"
as permissive
for insert
to authenticated
with check ((auth.uid() = user_id));


create policy "Users can view own videos"
on "public"."videos"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));



