import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_locales" ADD COLUMN "locale_updated_at" timestamp(3) with time zone;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_locale_updated_at" timestamp(3) with time zone;
  ALTER TABLE "services_locales" ADD COLUMN "locale_updated_at" timestamp(3) with time zone;
  ALTER TABLE "_services_v_locales" ADD COLUMN "version_locale_updated_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_locales" DROP COLUMN "locale_updated_at";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_locale_updated_at";
  ALTER TABLE "services_locales" DROP COLUMN "locale_updated_at";
  ALTER TABLE "_services_v_locales" DROP COLUMN "version_locale_updated_at";`)
}
