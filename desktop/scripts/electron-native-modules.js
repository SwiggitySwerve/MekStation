const path = require('node:path');

// One descriptor owns the native build inputs and shipped runtime binding.
const nativeModules = [
  {
    name: 'better-sqlite3',
    buildSources: ['binding.gyp', 'deps', 'src'],
    runtimeBinding: path.join('build', 'Release', 'better_sqlite3.node'),
  },
];

module.exports = { nativeModules };
