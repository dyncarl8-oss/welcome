import RoleBadge from "./RoleBadge";

interface HeaderProps {
  role: "admin" | "customer";
  userId?: string | null;
  companyId?: string | null;
}

export default function Header({ role, userId, companyId }: HeaderProps) {
  return (
    <header className="border-b bg-card">
      <div className="flex items-center justify-between p-4 lg:px-8">
        <div className="flex items-center gap-4">
          <RoleBadge role={role} />
        </div>
      </div>
    </header>
  );
}
