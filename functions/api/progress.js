function getEmail(request) {
  return request.headers.get("Cf-Access-Authenticated-User-Email");
}

// GET: lấy tiến độ của người dùng, dạng { "chunk-01": true, ... }
export async function onRequestGet({ request, env }) {
  const email = getEmail(request);
  if (!email) return new Response("Unauthorized", { status: 401 });

  const prefix = `progress:${email}:`;
  const list = await env.PROGRESS.list({ prefix });
  const progress = {};
  for (const key of list.keys) {
    const lessonId = key.name.slice(prefix.length);
    progress[lessonId] = key.metadata?.completed === true;
  }
  return Response.json(progress);
}

// POST: lưu trạng thái một bài { lessonId, completed }
export async function onRequestPost({ request, env }) {
  const email = getEmail(request);
  if (!email) return new Response("Unauthorized", { status: 401 });

  const { lessonId, completed } = await request.json();
  const id = String(lessonId || "").trim().slice(0, 100);
  if (!id) return new Response("Thiếu lessonId", { status: 400 });

  const done = completed === true;
  await env.PROGRESS.put(`progress:${email}:${id}`, "1", {
    metadata: { completed: done }
  });
  return Response.json({ ok: true, lessonId: id, completed: done });
}
