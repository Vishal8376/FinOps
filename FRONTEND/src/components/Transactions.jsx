import { useState, useEffect } from "react";
import API from "../api";
export default function Transactions() {
  const [txs, setTxs] = useState([]);

  const fetchTx = () => {
    API.get("/list_transactions").then(res => setTxs(res.data));
  };

  const approve = async (id) => {
    await API.post("/approve_transaction", {
      transaction_id: id,
      approver_id: 2,
    });
    fetchTx();
  };

  useEffect(() => {
    fetchTx();
  }, []);

  return (
    <div className="card">
      <h2>💰 Transactions</h2>
      {txs.map(t => (
        <div className="item" key={t.id}>
          ₹{t.amount} | {t.status}
          {t.status === "pending" && (
            <button onClick={() => approve(t.id)}>Approve</button>
          )}
        </div>
      ))}
    </div>
  );
}