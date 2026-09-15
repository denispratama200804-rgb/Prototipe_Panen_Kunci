async function test() {
  const res = await fetch('http://localhost:5173/api/supabase-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generate_recovery_link',
      data: { email: 'panenkuncii@gmail.com' }
    })
  });
  const json = await res.json();
  console.log(json);
}
test();
