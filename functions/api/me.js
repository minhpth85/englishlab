function getEmail(request) {
  return request.headers.get("Cf-Access-Authenticated-User-Email");
}

// GET: lấy email và tên đã lưu (name = null nếu chưa đặt)
export async function onRequestGet({ request, env }) {
  const email = getEmail(request);
  if (!email) return new Response("Unauthorized", { status: 401 });
  const name = await env.PROGRESS.get(`profile:${email}`);
  return Response.json({ email, name });
}

// PUT: lưu tên người dùng vừa nhập
export async function onRequestPut({ request, env }) {
  const email = getEmail(request);
  if (!email) return new Response("Unauthorized", { status: 401 });
  const { name } = await request.json();
  const clean = String(name || "").trim().slice(0, 40);
  if (!clean) return new Response("Tên trống", { status: 400 });
  await env.PROGRESS.put(`profile:${email}`, clean);
  return Response.json({ ok: true, name: clean });
}
