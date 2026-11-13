import React from "react";
import { Outlet } from "react-router-dom";

import { PageHeader } from "@/components/ui/page-header";
import { AwesomeLoader } from "@/components/commons/AwesomeLoader";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Wraps every /account/admin page. The server refuses non-superusers (403);
 * this only keeps someone who types the URL from seeing a broken screen, and
 * stops the pages from requesting anything for them.
 */
const AdminGuard = () => {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><AwesomeLoader message="Loading" /></div>;
  }

  if (!user?.is_superuser) {
    return (
      <div className="max-w-5xl p-6">
        <PageHeader title="Admin Panel" description="This area is only available to superusers." />
      </div>
    );
  }

  return <Outlet />;
};

export default AdminGuard;
