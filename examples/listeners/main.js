'use strict';

const ispn = require('infinispan');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const client = await ispn.client({port: 11222, host: '127.0.0.1'}, {
    authentication: {
      enabled: true,
      saslMechanism: 'PLAIN',
      userName: 'admin',
      password: 'password'
    }
  });

  try {
    // Add a listener for 'create' events
    const listenerId = await client.addListener('create', (key, version, id) => {
      console.log('[CREATE] key=' + key);
    });

    // Register 'modify' and 'remove' on the same listener
    await client.addListener('modify', (key, version, id) => {
      console.log('[MODIFY] key=' + key);
    }, {listenerId: listenerId});

    await client.addListener('remove', (key, id) => {
      console.log('[REMOVE] key=' + key);
    }, {listenerId: listenerId});

    console.log('Listener registered: ' + listenerId);

    // Trigger create events
    await client.put('player1', 'Mario');
    await client.put('player2', 'Luigi');
    await sleep(100);

    // Trigger modify events
    await client.replace('player1', 'Peach');
    await sleep(100);

    // Trigger remove events
    await client.remove('player2');
    await sleep(100);

    // Remove the listener
    await client.removeListener(listenerId);
    console.log('\nListener removed.');

    // This operation will not trigger any events
    await client.put('player3', 'Toad');
    await sleep(100);
    console.log('No events after listener removal.');

    await client.clear();
  } finally {
    await client.disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
