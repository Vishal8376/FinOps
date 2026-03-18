import { useState } from "react";
import "./Login.css";

export default function Register() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const register = async () => {
    const res = await fetch("http://localhost:5000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        password,
        role_id: 4
      })
    });

    const data = await res.json();
    alert(data.message || data.error);
    window.location.href = "/";
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Vendor Registration</h2>

        <input placeholder="Username" onChange={e => setName(e.target.value)} />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} />

        <button onClick={register}>Register</button>

        <p>
          Already have an account? <a href="/">Login</a>
        </p>
      </div>
    </div>
  );
}