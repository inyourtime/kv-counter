import { Hono } from "hono";

type Bindings = {
  COUNTER_DB: D1Database;
  ALLOWED_KEYS: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/hit/:key", async (c) => {
  const key = c.req.param("key");
  const allowedKeys = c.env.ALLOWED_KEYS?.split(",") || [];

  if (!allowedKeys.includes(key)) {
    return c.text("Forbidden", 403);
  }

  // upsert
  await c.env.COUNTER_DB.prepare(
    `
    INSERT INTO counter (key, count)
    VALUES (?, 1)  
    ON CONFLICT (key) 
    DO UPDATE SET count = counter.count + 1
  `
  )
    .bind(key)
    .run();

  return c.text("OK", 200);
});

app.get("/lookup/:key", async (c) => {
  const result = await c.env.COUNTER_DB.prepare(
    "SELECT * FROM counter WHERE key = ?"
  )
    .bind(c.req.param("key"))
    .first();

  if (result === null) {
    return c.text("Key not found", 404);
  }

  return c.json(result);
});

export default app;
