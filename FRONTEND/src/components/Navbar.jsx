export default function Navbar() {
  const role = localStorage.getItem("role");

  return (
    <div style={{
      background: "white",
      padding: "15px",
      borderBottom: "1px solid #ddd"
    }}>
      <h3>{role?.toUpperCase()} DASHBOARD</h3>
    </div>
  );
}