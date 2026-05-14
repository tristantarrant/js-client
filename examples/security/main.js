'use strict';

const ispn = require('infinispan');

const host = process.env.ISPN_HOST || '127.0.0.1';
const port = parseInt(process.env.ISPN_PORT || '11222');
const password = process.env.ISPN_PASSWORD || 'password';

async function main() {
  // Connect with valid credentials
  const client = await ispn.client({port, host}, {
    authentication: {
      enabled: true,
      saslMechanism: 'PLAIN',
      userName: 'admin',
      password
    }
  });

  try {
    // Successful operation on default cache
    await client.put('key', 'value');
    const val = await client.get('key');
    console.log(`Successfully put and got value: ${  val}`);
    await client.clear();
  } finally {
    await client.disconnect();
  }

  // Attempt to connect with wrong credentials
  console.log('\nAttempting connection with wrong credentials...');
  try {
    const badClient = await ispn.client({port, host}, {
      authentication: {
        enabled: true,
        saslMechanism: 'PLAIN',
        userName: 'admin',
        password: 'wrongpassword'
      }
    });
    await badClient.disconnect();
    console.log('ERROR: Should have failed with wrong credentials');
  } catch (err) {
    console.log(`Connection failed as expected: ${  err.message}`);
  }

  // Connect with SCRAM-SHA-256 mechanism
  console.log('\nConnecting with SCRAM-SHA-256 mechanism...');
  const scramClient = await ispn.client({port, host}, {
    authentication: {
      enabled: true,
      saslMechanism: 'SCRAM-SHA-256',
      userName: 'admin',
      password
    }
  });

  try {
    await scramClient.put('scram-key', 'scram-value');
    const scramVal = await scramClient.get('scram-key');
    console.log(`SCRAM-SHA-256 auth successful: ${  scramVal}`);
    await scramClient.clear();
  } finally {
    await scramClient.disconnect();
  }

  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
