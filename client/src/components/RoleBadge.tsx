import { Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RoleBadgeProps {
  role: "admin" | "customer";
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge 
      variant={role === "admin" ? "default" : "secondary"}
      className="gap-1.5"
      data-testid={`badge-role-${role}`}
    >
      {role === "admin" ? (
        <Shield className="h-3 w-3" />
      ) : (
        <User className="h-3 w-3" />
      )}
      <span className="font-medium capitalize">{role}</span>
    </Badge>
  );
}
