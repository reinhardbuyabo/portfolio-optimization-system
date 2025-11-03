import { Role } from "@prisma/client";
import { getRoleDisplayName, getRoleColor } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  role: Role;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        getRoleColor(role),
        className
      )}
    >
      {getRoleDisplayName(role)}
    </span>
  );
}
