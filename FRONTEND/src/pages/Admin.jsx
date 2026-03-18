import { useState } from "react";

export default function Admin() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [dept, setDept] = useState("");

  const createUser = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch("http://localhost:5000/admin/create_user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({
        name,
        password,
        role_id: parseInt(roleId),
        department_id: parseInt(dept)
      })
    });

    const data = await res.json();
    alert(data.message || data.error);
  };

  return (
    <div>
      <h2>Admin Panel</h2>

      <div style={{
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        width: "300px"
      }}>
        <h3>Create User</h3>

        <input placeholder="Name" onChange={e => setName(e.target.value)} />
        <input placeholder="Password" onChange={e => setPassword(e.target.value)} />

        <select onChange={e => setRoleId(e.target.value)}>
          <option>Select Role</option>
          <option value="2">Manager</option>
          <option value="3">Employee</option>
        </select>

        <input placeholder="Dept ID" onChange={e => setDept(e.target.value)} />

        <button onClick={createUser}>Create</button>
      </div>
    </div>
  );
}