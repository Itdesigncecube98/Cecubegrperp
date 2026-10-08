'use client';
import ProjectRoutePermissionGate from '@/components/ProjectRoutePermissionGate';

export default function MarketingEnquiriesLayout({ children }) {
  return <ProjectRoutePermissionGate>{children}</ProjectRoutePermissionGate>;
}
