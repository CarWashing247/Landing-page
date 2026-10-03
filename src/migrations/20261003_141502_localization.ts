import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Localize Media.alt and Media.caption (T-04A).
 *
 * Payload moves localized fields into a `<collection>_locales` table. Its
 * generated migration created that table and then dropped `media.alt` and
 * `media.caption` **without copying anything**, which would have silently
 * discarded the alt text of every existing image — and `alt` is required, so
 * those rows would have come back invalid rather than merely empty.
 *
 * The INSERT below is hand-added, and must run before the DROP. Existing
 * values become the default locale's values, which is correct: they were
 * written when Vietnamese was the only language.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."_locales" AS ENUM('vi', 'en');
    CREATE TABLE "media_locales" (
      "alt" varchar NOT NULL,
      "caption" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id")
      ON DELETE cascade ON UPDATE no action;
    CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique"
      ON "media_locales" USING btree ("_locale","_parent_id");
  `)

  // Carry the existing values across before the columns disappear.
  await db.execute(sql`
    INSERT INTO "media_locales" ("alt", "caption", "_locale", "_parent_id")
    SELECT "alt", "caption", 'vi', "id" FROM "media";
  `)

  await db.execute(sql`
    ALTER TABLE "media" DROP COLUMN "alt";
    ALTER TABLE "media" DROP COLUMN "caption";
  `)
}

/**
 * The generated `down` was also wrong: it added `alt varchar NOT NULL` to a
 * populated table, which Postgres refuses without a default, and it dropped
 * `media_locales` before the data could be copied back. A rollback has to
 * work — T-22 requires a tested restore.
 */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" ADD COLUMN "alt" varchar;
    ALTER TABLE "media" ADD COLUMN "caption" varchar;
  `)

  // Default locale first.
  await db.execute(sql`
    UPDATE "media" m
    SET "alt" = l."alt", "caption" = l."caption"
    FROM "media_locales" l
    WHERE l."_parent_id" = m."id" AND l."_locale" = 'vi';
  `)

  // Then any locale, for a row that was never translated into the default
  // one. `alt` is about to become NOT NULL again, so a row must not be left
  // empty just because it skipped Vietnamese.
  await db.execute(sql`
    UPDATE "media" m
    SET "alt" = l."alt", "caption" = COALESCE(m."caption", l."caption")
    FROM (
      SELECT "_parent_id", "alt", "caption",
             ROW_NUMBER() OVER (PARTITION BY "_parent_id" ORDER BY "id") AS rn
      FROM "media_locales"
    ) l
    WHERE l."_parent_id" = m."id" AND l.rn = 1 AND m."alt" IS NULL;
  `)

  await db.execute(sql`
    UPDATE "media" SET "alt" = '' WHERE "alt" IS NULL;
    ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;
    DROP TABLE "media_locales" CASCADE;
    DROP TYPE "public"."_locales";
  `)
}
