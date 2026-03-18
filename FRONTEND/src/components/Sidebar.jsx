import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div style={{
      width: "240px",
      background: "#1e293b",
      color: "white",
      padding: "20px"
    }}>
      <h2>FinOps</h2>

      <p onClick={() => navigate("/dashboard")} style={{ cursor: "pointer" }}>
        Dashboard
      </p>

      <p onClick={logout} style={{ cursor: "pointer", color: "#f87171" }}>
        Logout
      </p>
    </div>
  );
}