import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AuditAnchorModule", (m) => {
  const auditAnchor = m.contract("AuditAnchor");

  return { auditAnchor };
});