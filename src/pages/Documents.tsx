import { DashboardLayout } from '@/components/DashboardLayout';
import DocumentTable from '@/components/documents/DocumentTable';
import AskRegulationsModal from '@/components/documents/AskRegulationsModal';
import UploadDocumentModal from '@/components/documents/UploadDocumentModal';
import Asterisk from '@/components/icons/Asterisk';
import Calander2 from '@/components/icons/Calander2';
import CashIcon from '@/components/icons/CashIcon';
import Shield from '@/components/icons/Shield';
import { ProjectStatusCard } from '@/components/ProjectStatusCard';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import { Search, Upload } from 'lucide-react';
import { useState } from 'react';

const Documents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAskRegulationsModalOpen, setIsAskRegulationsModalOpen] = useState(false);
  const [isUploadDocumentModalOpen, setIsUploadDocumentModalOpen] = useState(false);
  return (
    <DashboardLayout >
      <div>
        <h1 className="text-3xl mb-[18px]  tracking-tight text-foreground">Documents</h1>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <ProjectStatusCard icon={<CashIcon />} title="Total Docs" value="7" badgeText={''} badgeVariant={'default'} actionText={''} />
          <ProjectStatusCard
            icon={<Calander2 />}
            title="With AI Flags"
            value="6"
            badgeText="Fev 10"
            badgeVariant="success"
            actionText={''}
          />
          <ProjectStatusCard
            icon={<Shield />}
            title="Overdue Obligations"
            value="2"
            badgeText="2 Open"
            badgeVariant="success"
            actionText={''}
          />
          <ProjectStatusCard icon={<Asterisk />} title="Finance Gated" value="1" badgeText={''} badgeVariant={'default'} actionText={''} />
        </div>
        <div className="flex gap-3 mt-6 mb-[28px] ">
          <div className="relative flex-1 hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search documents by name or reference..."
              className="pl-10 py-[9px]  border-[#EDEDED] rounded-[10px]"
            />
          </div>
          <Button className=" text-[15px] py-[9px]" onClick={() => setIsAskRegulationsModalOpen(true)}>Ask Regulations</Button>
          <Button className=" text-[15px] py-[9px]" onClick={() => setIsUploadDocumentModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
        <DocumentTable />
      </div>
      <AskRegulationsModal isOpen={isAskRegulationsModalOpen} onClose={() => setIsAskRegulationsModalOpen(false)} />
      <UploadDocumentModal isOpen={isUploadDocumentModalOpen} onClose={() => setIsUploadDocumentModalOpen(false)} />
    </DashboardLayout>
  );
};

export default Documents;
