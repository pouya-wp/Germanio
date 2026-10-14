import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  imports: false, // explicit imports keep the code readable outside WXT
  manifest: {
    name: 'Germanio',
    description: 'Alt + Klick auf jedes deutsche Wort: nachschlagen, anhören, lernen.',
    permissions: ['storage'],
    // Brain runs locally; the extension talks to it only from the background script.
    host_permissions: ['http://127.0.0.1:4317/*'],
    browser_specific_settings: {
      gecko: {
        id: 'germanio@local',
        strict_min_version: '115.0',
        // Nothing leaves the machine: brain is local and no data is sent to any server.
        data_collection_permissions: { required: ['none'] },
      },
    },
    commands: {
      'lookup-selection': {
        suggested_key: { default: 'Alt+Shift+D' },
        description: 'Markiertes Wort nachschlagen',
      },
    },
  },
});
