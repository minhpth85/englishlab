function getEmail(request) {
  return request.headers.get("Cf-Access-Authenticated-User-Email");
}

// Mỗi chunk là một key riêng: chunk:<email>:<id>, nên hai thiết bị không ghi đè lên nhau
const PREFIX = (email) => `chunk:${email}:`;
const MAX_OPS = 500;

// GET: lấy toàn bộ chunk đã lưu, dạng { "<id>": {...}, ... }
export async function onRequestGet({ request, env }) {
  const email = getEmail(request);
  if (!email) return new Response("Unauthorized", { status: 401 });

  const prefix = PREFIX(email);
  const names = [];
  let cursor;
  do {
    const page = await env.PROGRESS.list({ prefix, cursor });
    names.push(...page.keys.map((k) => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const entries = await Promise.all(
    names.map(async (name) => [name.slice(prefix.length), await env.PROGRESS.get(name, "json")])
  );
  const result = {};
  for (const [id, item] of entries) if (item) result[id] = item;
  return Response.json(result);
}

// POST: { upsert: { "<id>": {...} }, remove: ["<id>", ...] } — chỉ gửi phần thay đổi
export async function onRequestPost({ request, env }) {
  const email = getEmail(request);
  if (!email) return new Response("Unauthorized", { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response("JSON không hợp lệ", { status: 400 });
  }

  const upsert = body && typeof body.upsert === "object" && body.upsert ? body.upsert : {};
  const remove = Array.isArray(body && body.remove) ? body.remove : [];
  if (Object.keys(upsert).length + remove.length > MAX_OPS) {
    return new Response("Quá nhiều thay đổi trong một lần", { status: 413 });
  }

  const prefix = PREFIX(email);
  const ids = [...Object.keys(upsert), ...remove];
  if (ids.some((id) => typeof id !== "string" || !id || id.length > 200)) {
    return new Response("Mã chunk không hợp lệ", { status: 400 });
  }

  const writes = Object.entries(upsert).map(([id, item]) =>
    env.PROGRESS.put(prefix + id, JSON.stringify(item))
  );
  const deletes = remove.map((id) => env.PROGRESS.delete(prefix + id));
  await Promise.all([...writes, ...deletes]);

  return Response.json({ ok: true, saved: Object.keys(upsert).length, removed: remove.length });
}
