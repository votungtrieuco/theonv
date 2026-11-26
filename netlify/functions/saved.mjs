// Hàm lưu dữ liệu cho trang Theo dõi nhiệm vụ xã Triệu Cơ.
// - GET  /saved.json : trả về toàn bộ cập nhật đã lưu, dạng {tasks: {id: {...}}}
// - POST /saved.json : ghi một nhiệm vụ, thân yêu cầu {id, body, key}
// Mã chỉnh sửa đặt trong biến môi trường MA_CHINH_SUA trên Netlify.
import { getStore } from "@netlify/blobs";

// Dữ liệu đã lưu trước đây (tệp saved.json trong kho), dùng cho lần chạy đầu tiên.
const INITIAL_URL = "https://raw.githubusercontent.com/votungtrieuco/theonv/main/saved.json";

const reply = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

async function load(store) {
  const data = await store.get("saved", { type: "json" });
  if (data && data.tasks) return data;
  const r = await fetch(INITIAL_URL);
  if (!r.ok) throw new Error("initial");
  const j = await r.json();
  return { tasks: (j && j.tasks) || {} };
}

export default async (req) => {
  const store = getStore({ name: "theodoinhiemvu", consistency: "strong" });

  let data;
  try {
    data = await load(store);
  } catch (e) {
    return reply({ error: "load" }, 500);
  }

  if (req.method === "GET") return reply(data);
  if (req.method !== "POST") return reply({ error: "method" }, 405);

  let p;
  try {
    p = await req.json();
  } catch (e) {
    return reply({ error: "bad_request" }, 400);
  }

  const secret = process.env.MA_CHINH_SUA || "";
  if (!secret || typeof p.key !== "string" || p.key !== secret) return reply({ error: "forbidden" }, 403);
  if (p.check) return reply({ ok: true });

  if (typeof p.id !== "string" || !p.id || p.id.length > 80 || !p.body || typeof p.body !== "object" || Array.isArray(p.body))
    return reply({ error: "bad_request" }, 400);
  if (JSON.stringify(p.body).length > 20000) return reply({ error: "too_large" }, 413);

  data.tasks[p.id] = p.body;
  await store.setJSON("saved", data);
  return reply({ ok: true });
};

// Hàm này trả lời thay cho tệp tĩnh saved.json.
export const config = { path: "/saved.json" };
