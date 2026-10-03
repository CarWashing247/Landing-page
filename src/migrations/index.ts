import * as migration_20261003_100544_initial from './20261003_100544_initial';
import * as migration_20261003_130303_media from './20261003_130303_media';
import * as migration_20261003_133714_roles from './20261003_133714_roles';

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
    name: '20261003_133714_roles'
  },
];
