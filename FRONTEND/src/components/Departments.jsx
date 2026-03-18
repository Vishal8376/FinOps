import { useState, useEffect } from "react";
import API from "../api";
export default function Departments() {
  const [depts, setDepts] = useState([]);

  useEffect(() => {
    API.get("/list_departments").then(res => setDepts(res.data));
  }, []);

  return (
    <div className="card">
      <h2>🏢 Departments</h2>
      {depts.map(d => (
        <div className="item" key={d.id}>
          {d.name}
        </div>
      ))}
    </div>
  );
}