import { useState, useEffect } from "react";
import API from "../api";
export default function Blockchain() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    API.get("/blockchain_records").then(res => setRecords(res.data));
  }, []);

  return (
    <div className="card">
      <h2>🔗 Blockchain</h2>
      {records.map((r, i) => (
        <div className="item" key={i}>
          TX: {r.transaction_id}<br />
          <small>{r.hash.slice(0, 20)}...</small>
        </div>
      ))}
    </div>
  );
}