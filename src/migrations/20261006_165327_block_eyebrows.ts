import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_blocks_hero_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "secondary_cta_label" varchar;
  ALTER TABLE "pages_blocks_hero" ADD COLUMN "secondary_cta_href" varchar;
  ALTER TABLE "pages_blocks_steps" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "pages_blocks_steps" ADD COLUMN "note" varchar;
  ALTER TABLE "pages_blocks_pricing" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "pages_blocks_pricing" ADD COLUMN "note" varchar;
  ALTER TABLE "pages_blocks_faq" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "pages_blocks_faq" ADD COLUMN "note" varchar;
  ALTER TABLE "pages_blocks_cta" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "secondary_cta_label" varchar;
  ALTER TABLE "_pages_v_blocks_hero" ADD COLUMN "secondary_cta_href" varchar;
  ALTER TABLE "_pages_v_blocks_steps" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_pages_v_blocks_steps" ADD COLUMN "note" varchar;
  ALTER TABLE "_pages_v_blocks_pricing" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_pages_v_blocks_pricing" ADD COLUMN "note" varchar;
  ALTER TABLE "_pages_v_blocks_faq" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_pages_v_blocks_faq" ADD COLUMN "note" varchar;
  ALTER TABLE "_pages_v_blocks_cta" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "pages_blocks_hero_highlights" ADD CONSTRAINT "pages_blocks_hero_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_highlights" ADD CONSTRAINT "_pages_v_blocks_hero_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_highlights_order_idx" ON "pages_blocks_hero_highlights" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_highlights_parent_id_idx" ON "pages_blocks_hero_highlights" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_highlights_locale_idx" ON "pages_blocks_hero_highlights" USING btree ("_locale");
  CREATE INDEX "_pages_v_blocks_hero_highlights_order_idx" ON "_pages_v_blocks_hero_highlights" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_highlights_parent_id_idx" ON "_pages_v_blocks_hero_highlights" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_highlights_locale_idx" ON "_pages_v_blocks_hero_highlights" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_hero_highlights" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_highlights" CASCADE;
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "eyebrow";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "secondary_cta_label";
  ALTER TABLE "pages_blocks_hero" DROP COLUMN "secondary_cta_href";
  ALTER TABLE "pages_blocks_steps" DROP COLUMN "eyebrow";
  ALTER TABLE "pages_blocks_steps" DROP COLUMN "note";
  ALTER TABLE "pages_blocks_pricing" DROP COLUMN "eyebrow";
  ALTER TABLE "pages_blocks_pricing" DROP COLUMN "note";
  ALTER TABLE "pages_blocks_faq" DROP COLUMN "eyebrow";
  ALTER TABLE "pages_blocks_faq" DROP COLUMN "note";
  ALTER TABLE "pages_blocks_cta" DROP COLUMN "eyebrow";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "eyebrow";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "secondary_cta_label";
  ALTER TABLE "_pages_v_blocks_hero" DROP COLUMN "secondary_cta_href";
  ALTER TABLE "_pages_v_blocks_steps" DROP COLUMN "eyebrow";
  ALTER TABLE "_pages_v_blocks_steps" DROP COLUMN "note";
  ALTER TABLE "_pages_v_blocks_pricing" DROP COLUMN "eyebrow";
  ALTER TABLE "_pages_v_blocks_pricing" DROP COLUMN "note";
  ALTER TABLE "_pages_v_blocks_faq" DROP COLUMN "eyebrow";
  ALTER TABLE "_pages_v_blocks_faq" DROP COLUMN "note";
  ALTER TABLE "_pages_v_blocks_cta" DROP COLUMN "eyebrow";`)
}
