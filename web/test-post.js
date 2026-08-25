const fetch = require('node-fetch');

async function testPost() {
  try {
    const res = await fetch('http://localhost:3000/api/project-statuses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Status',
        code: 'TS',
        description: 'Test description',
        status: 'Active'
      })
    });
    
    if (res.ok) {
      console.log('Success:', await res.json());
    } else {
      console.log('Error:', await res.text());
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testPost();
