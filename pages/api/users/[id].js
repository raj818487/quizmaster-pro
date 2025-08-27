import { getDb } from "../_db";

export default function handler(req, res) {
  const db = getDb();
  const { id } = req.query;
  const userId = parseInt(id, 10);
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx === -1)
    return res.status(404).json({ success: false, message: "User not found" });

  if (req.method === "DELETE") {
    db.users.splice(idx, 1);
    return res.status(200).json({ success: true });
  } else if (req.method === "PUT") {
    const { username, password, role } = req.body;
    const user = db.users[idx];
    if (username) user.username = username;
    if (password) user.password = password;
    if (role) user.role = role;
    return res
      .status(200)
      .json({
        success: true,
        user: { id: user.id, username: user.username, role: user.role },
      });
  } else {
    res.setHeader("Allow", ["DELETE", "PUT"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
