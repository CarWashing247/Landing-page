import * as migration_20261003_100544_initial from './20261003_100544_initial';
import * as migration_20261003_130303_media from './20261003_130303_media';
import * as migration_20261003_133714_roles from './20261003_133714_roles';
import * as migration_20261003_141502_localization from './20261003_141502_localization';
import * as migration_20261004_151139_globals from './20261004_151139_globals';
import * as migration_20261005_082937_pages from './20261005_082937_pages';
import * as migration_20261005_090150_services from './20261005_090150_services';
import * as migration_20261005_092701_seo from './20261005_092701_seo';
import * as migration_20261005_155731_locale_updated_at from './20261005_155731_locale_updated_at';
import * as migration_20261006_072800_content_blocks from './20261006_072800_content_blocks';

export const migrations = [
  {
    up: migration_20261003_100544_initial.up,
    down: migration_20261003_100544_initial.down,
    name: '20261003_100544_initial',
  },
  {
    up: migration_20261003_130303_media.up,
    down: migration_20261003_130303_media.down,
    name: '20261003_130303_media',
  },
  {
    up: migration_20261003_133714_roles.up,
    down: migration_20261003_133714_roles.down,
    name: '20261003_133714_roles',
  },
  {
    up: migration_20261003_141502_localization.up,
    down: migration_20261003_141502_localization.down,
    name: '20261003_141502_localization',
  },
  {
    up: migration_20261004_151139_globals.up,
    down: migration_20261004_151139_globals.down,
    name: '20261004_151139_globals',
  },
  {
    up: migration_20261005_082937_pages.up,
    down: migration_20261005_082937_pages.down,
    name: '20261005_082937_pages',
  },
  {
    up: migration_20261005_090150_services.up,
    down: migration_20261005_090150_services.down,
    name: '20261005_090150_services',
  },
  {
    up: migration_20261005_092701_seo.up,
    down: migration_20261005_092701_seo.down,
    name: '20261005_092701_seo',
  },
  {
    up: migration_20261005_155731_locale_updated_at.up,
    down: migration_20261005_155731_locale_updated_at.down,
    name: '20261005_155731_locale_updated_at',
  },
  {
    up: migration_20261006_072800_content_blocks.up,
    down: migration_20261006_072800_content_blocks.down,
    name: '20261006_072800_content_blocks'
  },
];
