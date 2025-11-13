import RoleBadge from '../RoleBadge';

export default function RoleBadgeExample() {
  return (
    <div className="flex gap-4">
      <RoleBadge role="admin" />
      <RoleBadge role="customer" />
    </div>
  );
}
