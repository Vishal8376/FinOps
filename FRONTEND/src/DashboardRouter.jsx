import DashboardLayout from "./DashboardLayout";
import Admin from "./pages/Admin";
import Manager from "./pages/Manager";
import Employee from "./pages/Employee";
import Vendor from "./pages/Vendor";

export default function DashboardRouter() {
  const role = localStorage.getItem("role");

  let Page;

  if (role === "admin") Page = <Admin />;
  else if (role === "manager") Page = <Manager />;
  else if (role === "employee") Page = <Employee />;
  else if (role === "vendor") Page = <Vendor />;
  else return <h1>Unauthorized</h1>;

  return <DashboardLayout>{Page}</DashboardLayout>;
}