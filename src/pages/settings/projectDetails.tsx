import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjects } from "@/supabse/hook/useProject";
import { OnboardingModal } from "@/components/OnboardingModal";
import React, { useEffect, useState } from "react";
import { deleteFile, getTaskDocuments } from "@/supabse/api";
import { FileText, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ProjectDetails = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [docToDelete, setDocToDelete] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: projects = [], isLoading } = useProjects();
  const [showEditModal, setShowEditModal] = useState(false);
  const selectedProjectId = localStorage.getItem("selectedProjectId");
  const selectedProject = projects.find((project: any) => project.id === selectedProjectId);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (selectedProject?.id) {
        try {
          const docs = await getTaskDocuments(selectedProject.id);
          setDocuments(docs);
          console.log("Project Documents:", docs);
        } catch (error) {
          console.error("Failed to fetch project documents", error);
        }
      }
    };

    fetchDocuments();
  }, [selectedProject?.id]);

  const handleDeleteDocument = (e: React.MouseEvent, doc: any) => {
    e.stopPropagation();
    setDocToDelete(doc);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedProject?.id || !docToDelete) return;

    setIsDeleting(true);
    try {
      await deleteFile(selectedProject.id, docToDelete.name);
      setDocuments((prev) => prev.filter((d) => d.name !== docToDelete.name));
      toast.success("Document deleted successfully");
      setShowDeleteConfirm(false);
      setDocToDelete(null);
    } catch (error) {
      console.error("Failed to delete document", error);
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
        <div>
          <h2 className="text-[23px] text-[#1A1A1A]">Project Details</h2>
          <p className="text-[#6B7280] text-base">
            View and manage core project information.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className={cn('bg-transparent text-[#6B7280] border border-[#E5E7EB] hover:bg-transparent flex items-center gap-2 cursor-pointer')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 10V2" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4.66699 6.6665L8.00033 9.99984L11.3337 6.6665" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export Details
          </Button>
          <Button
            onClick={() => setShowEditModal(true)}
            className={cn('bg-primary text-white border border-border_color text-base !py-3 !px-4 flex items-center gap-2 cursor-pointer')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.1156 4.54126C14.4681 4.18888 14.6662 3.71091 14.6662 3.2125C14.6663 2.71409 14.4683 2.23607 14.116 1.8836C13.7636 1.53112 13.2856 1.33307 12.7872 1.33301C12.2888 1.33295 11.8108 1.53088 11.4583 1.88326L2.56096 10.7826C2.40618 10.9369 2.29171 11.127 2.22763 11.3359L1.34696 14.2373C1.32973 14.2949 1.32843 14.3562 1.3432 14.4145C1.35796 14.4728 1.38824 14.5261 1.43083 14.5686C1.47341 14.6111 1.52671 14.6413 1.58507 14.656C1.64343 14.6707 1.70467 14.6693 1.7623 14.6519L4.6643 13.7719C4.87308 13.7084 5.06308 13.5947 5.21763 13.4406L14.1156 4.54126Z" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Edit Project Info
          </Button>
        </div>
      </div>

      {/* Overview Card */}
      <div className="item border border-border_color rounded-[14px] mt-4 bg-white">
        <div className="p-6 flex gap-3">
          <div className="w-full">
            <div className="title text-base text-[#1A1A1A] mb-6">Overview</div>
            <div className="grid grid-cols-2 gap-5 mt-2">
              <div className="item">
                <div className="text-xs text-[#6B7280] mb-1">Project Name</div>
                <div className="text-base text-[#1A1A1A]">{selectedProject?.name || "N/A"}</div>
              </div>
              <div className="item">
                <div className="text-xs text-[#6B7280] mb-1">Project Code</div>
                <div className="text-base text-[#1A1A1A]">{selectedProject?.number || "N/A"}</div>
              </div>
              <div className="item">
                <div className="text-xs text-[#6B7280] mb-1">Location</div>
                <div className="text-base text-[#1A1A1A]">{selectedProject?.location || "N/A"}</div>
              </div>
              <div className="item">
                <div className="text-xs text-[#6B7280] mb-1">Project Type</div>
                <div className="text-base text-[#1A1A1A]">{selectedProject?.contract_type || "N/A"}</div>
              </div>
              <div className="item">
                <div className="text-xs text-[#6B7280] mb-1">Start Date</div>
                <div className="text-base text-[#1A1A1A]">{selectedProject?.start_date || "N/A"}</div>
              </div>
              <div className="item">
                <div className="text-xs text-[#6B7280] mb-1">End Date</div>
                <div className="text-base text-[#1A1A1A]">{selectedProject?.end_date || "N/A"}</div>
              </div>
              <div className="item">
                <div className="text-xs text-[#6B7280] mb-1">Total Budget</div>
                <div className="text-base text-[#1A1A1A]">R {selectedProject?.total_budget?.toLocaleString() || "0"}</div>
              </div>
              <div className="item col-span-2">
                <div className="text-xs text-[#6B7280] mb-1">Description</div>
                <div className="text-base text-[#1A1A1A]">{selectedProject?.description || "N/A"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Card */}
      <div className="item border border-border_color rounded-[14px] mt-4 bg-white">
        <div className="p-6 flex gap-3">
          <div className="w-full">
            <div className="title text-base text-[#1A1A1A] mb-6">Documents</div>
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {documents.map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {(doc.metadata?.size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteDocument(e, doc)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0 cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#6B7280]">No documents found for this project.</div>
            )}
          </div>
        </div>
      </div>

      <OnboardingModal
        isOpen={showEditModal}
        onOpenChange={setShowEditModal}
        project={selectedProject}
      />

      {/* Document Preview Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={(open) => !open && setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0 gap-0 [&>button]:text-white [&>button]:hover:text-white/80">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 bg-[#101828] text-white rounded-t-lg">
            <DialogTitle className="truncate pr-8 text-white">{selectedDocument?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-gray-100 overflow-hidden relative flex items-center justify-center rounded-b-lg">
            {selectedDocument && (
              selectedDocument.metadata?.mimetype?.startsWith('image/') ? (
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : selectedDocument.metadata?.mimetype === 'application/pdf' ? (
                <iframe
                  src={selectedDocument.url}
                  className="w-full h-full"
                  title={selectedDocument.name}
                />
              ) : (
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No Preview Available</p>
                  <p className="text-sm text-gray-500 mb-6">This file type cannot be previewed directly.</p>
                  <Button asChild>
                    <a href={selectedDocument.url} download={selectedDocument.name} target="_blank" rel="noreferrer">
                      Download File
                    </a>
                  </Button>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <TriangleAlert className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-500">
              Are you sure you want to delete <span className="font-semibold text-gray-900">{docToDelete?.name}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectDetails;
