import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "pages_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "pages_locales" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "pages_locales" ADD COLUMN "meta_canonical" varchar;
  ALTER TABLE "pages_locales" ADD COLUMN "meta_noindex" boolean;
  ALTER TABLE "pages_locales" ADD COLUMN "meta_keyword_focus" varchar;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_meta_title" varchar;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_meta_description" varchar;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_meta_image_id" integer;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_meta_canonical" varchar;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_meta_noindex" boolean;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_meta_keyword_focus" varchar;
  ALTER TABLE "services_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "services_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "services_locales" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "services_locales" ADD COLUMN "meta_canonical" varchar;
  ALTER TABLE "services_locales" ADD COLUMN "meta_noindex" boolean;
  ALTER TABLE "services_locales" ADD COLUMN "meta_keyword_focus" varchar;
  ALTER TABLE "_services_v_locales" ADD COLUMN "version_meta_title" varchar;
  ALTER TABLE "_services_v_locales" ADD COLUMN "version_meta_description" varchar;
  ALTER TABLE "_services_v_locales" ADD COLUMN "version_meta_image_id" integer;
  ALTER TABLE "_services_v_locales" ADD COLUMN "version_meta_canonical" varchar;
  ALTER TABLE "_services_v_locales" ADD COLUMN "version_meta_noindex" boolean;
  ALTER TABLE "_services_v_locales" ADD COLUMN "version_meta_keyword_focus" varchar;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "services_locales" ADD CONSTRAINT "services_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_services_v_locales" ADD CONSTRAINT "_services_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_meta_meta_image_idx" ON "pages_locales" USING btree ("meta_image_id","_locale");
  CREATE INDEX "_pages_v_version_meta_version_meta_image_idx" ON "_pages_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE INDEX "services_meta_meta_image_idx" ON "services_locales" USING btree ("meta_image_id","_locale");
  CREATE INDEX "_services_v_version_meta_version_meta_image_idx" ON "_services_v_locales" USING btree ("version_meta_image_id","_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_locales" DROP CONSTRAINT "pages_locales_meta_image_id_media_id_fk";
  
  ALTER TABLE "_pages_v_locales" DROP CONSTRAINT "_pages_v_locales_version_meta_image_id_media_id_fk";
  
  ALTER TABLE "services_locales" DROP CONSTRAINT "services_locales_meta_image_id_media_id_fk";
  
  ALTER TABLE "_services_v_locales" DROP CONSTRAINT "_services_v_locales_version_meta_image_id_media_id_fk";
  
  DROP INDEX "pages_meta_meta_image_idx";
  DROP INDEX "_pages_v_version_meta_version_meta_image_idx";
  DROP INDEX "services_meta_meta_image_idx";
  DROP INDEX "_services_v_version_meta_version_meta_image_idx";
  ALTER TABLE "pages_locales" DROP COLUMN "meta_title";
  ALTER TABLE "pages_locales" DROP COLUMN "meta_description";
  ALTER TABLE "pages_locales" DROP COLUMN "meta_image_id";
  ALTER TABLE "pages_locales" DROP COLUMN "meta_canonical";
  ALTER TABLE "pages_locales" DROP COLUMN "meta_noindex";
  ALTER TABLE "pages_locales" DROP COLUMN "meta_keyword_focus";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_meta_title";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_meta_description";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_meta_image_id";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_meta_canonical";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_meta_noindex";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_meta_keyword_focus";
  ALTER TABLE "services_locales" DROP COLUMN "meta_title";
  ALTER TABLE "services_locales" DROP COLUMN "meta_description";
  ALTER TABLE "services_locales" DROP COLUMN "meta_image_id";
  ALTER TABLE "services_locales" DROP COLUMN "meta_canonical";
  ALTER TABLE "services_locales" DROP COLUMN "meta_noindex";
  ALTER TABLE "services_locales" DROP COLUMN "meta_keyword_focus";
  ALTER TABLE "_services_v_locales" DROP COLUMN "version_meta_title";
  ALTER TABLE "_services_v_locales" DROP COLUMN "version_meta_description";
  ALTER TABLE "_services_v_locales" DROP COLUMN "version_meta_image_id";
  ALTER TABLE "_services_v_locales" DROP COLUMN "version_meta_canonical";
  ALTER TABLE "_services_v_locales" DROP COLUMN "version_meta_noindex";
  ALTER TABLE "_services_v_locales" DROP COLUMN "version_meta_keyword_focus";`)
}
