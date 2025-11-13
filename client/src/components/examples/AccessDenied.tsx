import AccessDenied from '../AccessDenied';

export default function AccessDeniedExample() {
  return (
    <div className="space-y-8">
      <AccessDenied />
      <AccessDenied error="Missing x-whop-user-token header. Ensure you're accessing this app through Whop or using the dev proxy for local development." />
      <AccessDenied error="Access denied to this experience" />
    </div>
  );
}
