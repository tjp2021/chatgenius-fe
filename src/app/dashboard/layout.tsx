import { ProtectedLayout } from '@/components/layouts/ProtectedLayout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
} 