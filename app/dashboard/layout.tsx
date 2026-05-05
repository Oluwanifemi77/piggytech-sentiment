// Dashboard is a dynamic, data-fetching client view. If this project later
// enables `cacheComponents` in next.config.ts, add
//   export const unstable_instant = false;
// here (per node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md)
// so the subtree opts out of instant-navigation validation.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
