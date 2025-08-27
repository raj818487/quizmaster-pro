import { getDb } from "../_db";

export default function handler(req, res) {
  const db = getDb();
  if (req.method === "POST") {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing username or password" });
    }
    if (db.users.find((u) => u.username === username)) {
      return res
        .status(409)
        .json({ success: false, message: "User already exists" });
    }
    const user = {
      id: db.nextUserId++,
      username,
      password,
      role: role || "user",
    };
    db.users.push(user);
    const safeUser = { id: user.id, username: user.username, role: user.role };
    return res.status(201).json({ success: true, user: safeUser });
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
