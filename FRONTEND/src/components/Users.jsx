import { useState, useEffect } from "react";
import API from "../api";

export default function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    API.get("/list_users").then(res => setUsers(res.data));
  }, []);

  return (
    <div className="card">
      <h2>👥 Users</h2>
      {users.map(u => (
        <div className="item" key={u.id}>
          <b>{u.name}</b><br />
          Role: {u.role_id} | Dept: {u.department_id}
        </div>
      ))}
    </div>
  );
}