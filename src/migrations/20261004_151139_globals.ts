import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_business_info_opening_hours_day" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  CREATE TYPE "public"."enum_site_settings_social_links_platform" AS ENUM('facebook', 'zalo', 'youtube', 'tiktok', 'instagram');
  CREATE TABLE "business_info_opening_hours" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" "enum_business_info_opening_hours_day" NOT NULL,
  	"closed" boolean DEFAULT false,
  	"opens" varchar,
  	"closes" varchar
  );
  
  CREATE TABLE "business_info" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"legal_name" varchar NOT NULL,
  	"street_address" varchar NOT NULL,
  	"locality" varchar NOT NULL,
  	"postal_code" varchar,
  	"lat" numeric,
  	"lng" numeric,
  	"phone" varchar NOT NULL,
  	"zalo" varchar,
  	"price_range" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_site_settings_social_links_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand_name" varchar NOT NULL,
  	"favicon_id" integer,
  	"og_fallback_id" integer,
  	"ga4_measurement_id" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"title_suffix" varchar,
  	"default_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "business_info_opening_hours" ADD CONSTRAINT "business_info_opening_hours_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."business_info"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_og_fallback_id_media_id_fk" FOREIGN KEY ("og_fallback_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "business_info_opening_hours_order_idx" ON "business_info_opening_hours" USING btree ("_order");
  CREATE INDEX "business_info_opening_hours_parent_id_idx" ON "business_info_opening_hours" USING btree ("_parent_id");
  CREATE INDEX "site_settings_social_links_order_idx" ON "site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "site_settings_social_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_favicon_idx" ON "site_settings" USING btree ("favicon_id");
  CREATE INDEX "site_settings_og_fallback_idx" ON "site_settings" USING btree ("og_fallback_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "business_info_opening_hours" CASCADE;
  DROP TABLE "business_info" CASCADE;
  DROP TABLE "site_settings_social_links" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TYPE "public"."enum_business_info_opening_hours_day";
  DROP TYPE "public"."enum_site_settings_social_links_platform";`)
}
