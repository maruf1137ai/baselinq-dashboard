import { Check, ExternalLink, TriangleAlert, FileText, Calendar, AlertCircle, Clock, Tag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { RequestInfoDialog } from '../commons/RequestInfoDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilePreviewModal } from '../TaskComponents/FilePreviewModal';
import { getTaskDocuments } from '@/supabse/api';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import useFetch from '@/hooks/useFetch';

const ChatSammary = ({ task: channelTask }: { task: any }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Fetch full task details using the taskId from the channel
  const taskId = channelTask?.taskId;
  const { data: taskDetails, isLoading } = useFetch(
    taskId ? `tasks/tasks/${taskId}/` : null,
    { enabled: !!taskId }
  );

  // Normalize task data across types
  const task = taskDetails?.task || channelTask;
  const taskType = taskDetails?.taskType || channelTask?.taskType;

  // Helper to extract common fields based on type
  const getTaskFields = () => {
    if (!task) return {};

    // Default values
    let description = task.description || "No description provided";
    let date = task.dueDate || task.finishDate;
    let priority = task.priority;
    let discipline = task.discipline;

    // Type specific overrides
    if (taskType === 'RFI') {
      description = task.question || task.description;
    } else if (taskType === 'SI' || taskType === 'GI') {
      description = task.instruction || task.description;
    } else if (taskType === 'CPI') {
      description = task.description; // CPI might use different fields
    }

    return {
      description,
      date: date ? new Date(date) : null,
      priority,
      discipline,
      status: task.status || channelTask?.status || "Unknown"
    };
  };

  const { description, date, priority, discipline, status } = getTaskFields();

  useEffect(() => {
    const fetchDocuments = async () => {
      const targetId = channelTask?.id || taskId;
      if (targetId) {
        try {
          // Try fetching by channel ID first, then task ID if needed
          // Assuming getTaskDocuments handles linking logic or we might need to adjust
          const docs = await getTaskDocuments(targetId);
          setDocuments(docs || []);
        } catch (error) {
          console.error("Failed to fetch task documents", error);
        }
      }
    };

    fetchDocuments();
  }, [channelTask?.id, taskId]);

  if (!channelTask) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        Select a task to view summary
      </div>
    );
  }

  const handleViewTask = () => {
    const targetId = taskId || channelTask.id;
    if (targetId) {
      navigate(`/tasks/${targetId}`);
    }
  };

  // Status Color Logic
  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-600 border-gray-200';
    const s = status.toLowerCase();
    if (s.includes('overdue') || s.includes('risk')) return 'bg-red-50 text-red-700 border-red-200';
    if (s.includes('approved') || s.includes('done') || s.includes('closed')) return 'bg-green-50 text-green-700 border-green-200';
    if (s.includes('progress') || s.includes('pending')) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="py-4 px-6 border-b border-[#DEDEDE]">
        <h2 className="text-base font-medium text-[#101828]">Task Context</h2>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={`${getStatusColor(status)} border px-2.5 py-0.5 rounded-full text-xs font-medium`}>
            {status}
          </Badge>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            {date ? <><Clock className="w-3 h-3" /> Due {date.toLocaleDateString()}</> : "No Due Date"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-6 space-y-6">

        {/* Core Fields Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Priority
            </div>
            <div className="text-sm font-medium text-gray-900">{priority || "Normal"}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Discipline
            </div>
            <div className="text-sm font-medium text-gray-900">{discipline || "General"}</div>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
            {isLoading ? "Loading details..." : description}
          </p>
        </div>

        {/* Action Buttons */}
        {/* <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" onClick={handleViewTask}>Approve</Button>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleViewTask}>Reject</Button>
          <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={handleViewTask}>Escalate</Button>
        </div> */}

        {/* Documents Section */}
        {documents.length > 0 && (
          <div>
            <div className="title text-base text-[#101828] mb-3">Documents</div>
            <div className="flex flex-col gap-2">
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
          </div>
        )}

        <FilePreviewModal
          isOpen={!!selectedDocument}
          onOpenChange={(open) => !open && setSelectedDocument(null)}
          file={selectedDocument ? {
            name: selectedDocument.name,
            url: selectedDocument.url
          } : null}
        />

        {/* Legacy Sections (Next Steps / Risks) - Kept if needed, but data usually comes from AI analysis */}
        {/* Can be re-enabled if present in taskDetails response */}
      </div>

      <div className="p-4 border-t border-[#DEDEDE] mt-auto">
        {(taskId || channelTask.id) && (
          <div className="flex flex-col gap-2.5">
            <Button onClick={handleViewTask} className="w-full bg-[#6366F1] hover:bg-[#5558E3] text-white">
              <ExternalLink className="mr-2 h-4 w-4" /> View Full Task
            </Button>
            {/* Request Info Dialog kept as is */}
            <RequestInfoDialog taskType={taskType || 'RFI'} taskId={taskId || channelTask.id} wFull />
          </div>
        )}
      </div>
    </div>
  );
};
export default ChatSammary;
