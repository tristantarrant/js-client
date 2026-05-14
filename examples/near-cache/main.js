'use strict';

const ispn = require('infinispan');

const host = process.env.ISPN_HOST || '127.0.0.1';
const port = parseInt(process.env.ISPN_PORT || '11222');
const password = process.env.ISPN_PASSWORD || 'password';

const authOpts = {
  authentication: {
    enabled: true,
    saslMechanism: 'PLAIN',
    userName: 'admin',
    password
  }
};

async function main() {
  // Client without near cache
  const remoteClient = await ispn.client({port, host}, authOpts);

  // Client with near cache
  const nearClient = await ispn.client({port, host}, {
    ...authOpts,
    nearCache: {maxEntries: 20}
  });

  try {
    const numEntries = 20;
    const numReads = 10000;

    // Populate entries using the remote client
    console.log(`Populating ${  numEntries  } entries...`);
    for (let i = 0; i < numEntries; i++) {
      await remoteClient.put(`key-${  i}`, `value-${  i}`);
    }

    // Warm the near cache by reading all entries once
    for (let i = 0; i < numEntries; i++) {
      await nearClient.get(`key-${  i}`);
    }
    console.log(`Near cache size: ${  nearClient.nearCacheSize()}`);

    // Benchmark remote reads
    const remoteStart = Date.now();
    for (let i = 0; i < numReads; i++) {
      await remoteClient.get(`key-${  i % numEntries}`);
    }
    const remoteTime = Date.now() - remoteStart;

    // Benchmark near cache reads
    const nearStart = Date.now();
    for (let i = 0; i < numReads; i++) {
      await nearClient.get(`key-${  i % numEntries}`);
    }
    const nearTime = Date.now() - nearStart;

    console.log(`\n=== Performance comparison (${  numReads  } reads) ===`);
    console.log(`Remote reads:     ${  remoteTime  } ms`);
    console.log(`Near cache reads: ${  nearTime  } ms`);

    if (nearTime > 0) {
      console.log(`Speedup: ${  (remoteTime / nearTime).toFixed(1)  }x`);
    }

    await remoteClient.clear();
  } finally {
    await remoteClient.disconnect();
    await nearClient.disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
