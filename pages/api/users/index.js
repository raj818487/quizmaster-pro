import { getDb } from "../_db";

export default function handler(req, res) {
  const db = getDb();
  if (req.method === "GET") {
    const users = db.users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
    }));
    return res.status(200).json(users);
  } else if (req.method === "POST") {
    const { username, password, role } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    if (db.users.find((u) => u.username === username))
      return res.status(409).json({ success: false, message: "User exists" });
    const user = {
      id: db.nextUserId++,
      username,
      password,
      role: role || "user",
    };
    db.users.push(user);
    return res
      .status(201)
      .json({
        success: true,
        user: { id: user.id, username: user.username, role: user.role },
      });
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
