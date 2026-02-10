import { Check, ExternalLink, TriangleAlert, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { RequestInfoDialog } from '../commons/RequestInfoDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilePreviewModal } from '../TaskComponents/FilePreviewModal';
import { getTaskDocuments } from '@/supabse/api';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';

const ChatSammary = ({ task }: { task: any }) => {
  const navigate = useNavigate();
  // const { mutateAsync: updateTask } = useUpdateTask();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (task?.id) {
        try {
          const docs = await getTaskDocuments(task.id);
          setDocuments(docs);
          // console.log("Task Documents:", docs);
        } catch (error) {
          console.error("Failed to fetch task documents", error);
        }
      }
    };

    fetchDocuments();
  }, [task?.id]);

  if (!task) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        Select a task to view summary
      </div>
    );
  }

  const handleViewTask = () => {
    const taskId = task.taskId || task.id;
    if (taskId) {
      navigate(`/tasks/${taskId}`);
    }
  };

  return (
    <div>
      <div className="nav py-3 px-6 border-b border-[#DEDEDE] flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="title text-base text-[#101828]">AI Summary</div>
          <p className="text text-sm text-[#6A7282] mt-1">Current status and recommendations</p>
        </div>
      </div>

      <div className="py-3.5 px-6">
        <div className="title text-base text-[#101828]">Status</div>
        <div className="flex items-center gap-2 mt-2">
          <div className={`date text-xs py-2 px-3 border rounded-full ${task.status === 'Overdue' || (task.due_date && new Date(task.due_date) < new Date())
            ? 'bg-[#FEF2F2] border-[#FECACA] text-[#EF4444]'
            : 'bg-green-50 border-green-200 text-green-700'
            }`}>
            {task.status || (task.due_date && new Date(task.due_date) < new Date() ? 'Overdue' : 'On Track')}
          </div>
          <p className="text text-sm text-[#4A5565]">
            {task.due_date ? `Response required by ${new Date(task.due_date).toLocaleDateString()}` : 'No deadline'}
          </p>
        </div>

        {/* Next Steps - Only show if data exists (mocked or real) */}
        {task.nextSteps && task.nextSteps.length > 0 && (
          <>
            <div className="title text-base mt-6 text-[#101828]">Next Steps</div>
            <div className="items">
              {task.nextSteps.map((step: string, i: number) => (
                <div key={i} className="item flex gap-2 text-[#4A5565] text-sm mt-2.5">
                  <Check className="text-[#99A1AF] h-4 w-4 mt-[2px]" />
                  {step}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Risks - Only show if data exists */}
        {task.risks && task.risks.length > 0 && (
          <>
            <div className="title text-base mt-6 text-[#101828]">Risks</div>
            <div className="items">
              {task.risks.map((risk: string, i: number) => (
                <div key={i} className="item flex gap-2 text-[#EF4444] text-sm mt-2.5">
                  <TriangleAlert className="text-[#EF4444] h-4 w-4 mt-[2px]" />
                  {risk}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Documents Section */}
        {documents.length > 0 && (
          <>
            <div className="title text-base mt-6 text-[#101828]">Documents</div>
            <div className="flex flex-col gap-2 mt-2">
              {documents.map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedDocument(doc)}
                >
                  <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      {(doc.metadata?.size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <FilePreviewModal
          isOpen={!!selectedDocument}
          onOpenChange={(open) => !open && setSelectedDocument(null)}
          file={selectedDocument ? {
            name: selectedDocument.name,
            url: selectedDocument.url
          } : null}
        />


        {/* Action Requests Section */}
        {task.request_info && task.request_info.length > 0 && (
          <div className="mt-8">
            <div className="title text-base text-[#101828] mb-4">Action Requests</div>
            <div className="space-y-3">
              {task.request_info.map((request: any) => (
                <div key={request.id} className="flex items-start gap-4 p-3 bg-white border rounded-[10px]">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">DC</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-black">{request.recipient}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{request.role}</p>
                    <p className="text-xs text-black">{request.task}</p>
                    <p className="text-xs text-gray-500 mt-1">Due {new Date(request.date).toLocaleDateString()}</p>
                  </div>
                  <Badge className="bg-[#FFF7ED] text-[#F97316] py-1.5 px-3 hover:bg-orange-50 border-[#FED7AA] text-xs">
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {(task.taskId || task.id) && (
          <div className="flex flex-col gap-2.5 mt-8">
            <Button onClick={handleViewTask} className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white">
              <ExternalLink className="mr-2 h-4 w-4" /> View Task
            </Button>
            <RequestInfoDialog taskType={task.type || 'RFI'} taskId={task.taskId || task.id} wFull />
          </div>
        )}
      </div>
    </div>
  );
};
export default ChatSammary;
