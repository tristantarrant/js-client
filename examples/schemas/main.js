'use strict';

const ispn = require('infinispan');

const host = process.env.ISPN_HOST || '127.0.0.1';
const port = parseInt(process.env.ISPN_PORT || '11222');
const password = process.env.ISPN_PASSWORD || 'password';

const personProto = `syntax = "proto3";
package tutorial;

/* @Indexed */
message Person {
    /* @Keyword(projectable = true, sortable = true, normalizer = "lowercase") */
    string firstName = 1;
    /* @Keyword(projectable = true, sortable = true, normalizer = "lowercase") */
    string lastName = 2;
    /* @Basic(projectable = true, sortable = true) */
    int32 bornYear = 3;
    /* @Keyword(projectable = true, sortable = true, normalizer = "lowercase") */
    string bornIn = 4;
}`;

async function main() {
  const client = await ispn.client({port, host}, {
    cacheName: '___protobuf_metadata',
    dataFormat: {
      keyType: 'text/plain',
      valueType: 'text/plain'
    },
    authentication: {
      enabled: true,
      saslMechanism: 'PLAIN',
      userName: 'admin',
      password
    }
  });

  try {
    // Register a valid schema
    await client.put('person.proto', personProto);
    console.log('Registered person.proto schema.');

    // Retrieve the schema
    const retrieved = await client.get('person.proto');
    console.log('\nRetrieved schema:');
    console.log(retrieved);

    // Check for errors (Infinispan stores errors in a .errors suffix key)
    const errors = await client.get('person.proto.errors');
    if (errors) {
      console.log(`\nSchema errors: ${  errors}`);
    } else {
      console.log('\nNo schema errors.');
    }

    // Clean up
    await client.remove('person.proto');
    console.log('\nRemoved person.proto schema.');
  } finally {
    await client.disconnect();
  }
}

main().catch(err => { console.error(err); process.exit(1); });
