import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 5173,
  path: '/api/supabase-proxy',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(JSON.stringify({ action: 'get_users', table: 'users' }));
req.end();
