// Cloudflare Pages Function - D1 리더보드 API
// D1 바인딩: DB

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const results = await env.DB.prepare(
      "SELECT nickname, score, wave, words_correct, created_at FROM leaderboard ORDER BY score DESC LIMIT 50",
    ).all();
    return Response.json({ ok: true, data: results.results });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    const { nickname, score, wave, words_correct, auth_token } = body;

    // 자체 인증: 간단한 토큰 검증
    if (!auth_token || auth_token.length < 8) {
      return Response.json(
        { ok: false, error: "Invalid auth" },
        { status: 401 },
      );
    }

    // 토큰 해시로 사용자 식별
    const encoder = new TextEncoder();
    const data = encoder.encode(auth_token);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    const userId = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);

    await env.DB.prepare(
      "INSERT INTO leaderboard (user_id, nickname, score, wave, words_correct) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(
        userId,
        nickname || "익명",
        score || 0,
        wave || 1,
        words_correct || 0,
      )
      .run();

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
