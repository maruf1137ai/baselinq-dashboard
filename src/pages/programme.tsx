import { DashboardLayout } from '@/components/DashboardLayout';
import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import Window from '@/components/programme/window';
import { PageHeader } from '@/components/ui/page-header';

const Programme = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Programme"
          reference={
            <Link
              to="/help/programme"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Who can view/create phases, milestone fees, baseline, and Risk Forecast"
            >
              <HelpCircle className="h-4 w-4" />
              Programme reference
            </Link>
          }
        />
        <Window />
      </div>
    </DashboardLayout>
  );
};

export default Programme;
