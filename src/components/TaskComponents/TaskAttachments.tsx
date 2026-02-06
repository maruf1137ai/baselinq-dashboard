import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { FilePreviewModal } from "./FilePreviewModal";

interface TaskAttachmentsProps {
  attachments?: {
    id: string | number;
    type: string;
    name: string;
    url: string;
    fileType?: string;
    uploadedAt?: string;
  }[];
}

export const TaskAttachments: React.FC<TaskAttachmentsProps> = ({
  attachments,
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    url: string;
    fileType?: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleFileClick = (item: {
    name: string;
    url: string;
    fileType?: string;
  }) => {
    setSelectedFile(item);
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className="pt-4 bg-white shadow-none border-0">
        <h3 className="text-xs text-[#6B7280] uppercase tracking-wide mb-3">
          Attachments
        </h3>
        <div className="space-y-2">
          {attachments.map((item, i) => (
            <div
              key={i}
              onClick={() => handleFileClick(item)}
              className="flex items-start gap-3 px-[13px] py-[15px] border border-[#E7E9EB] rounded-[10px] hover:bg-gray-50 transition-colors cursor-pointer">
              <FileText className="h-4 w-4 text-[#6B7280] mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1B1C1F] truncate">{item.name}</p>
                {item.fileType && (
                  <p className="text-xs text-gray-500">{item.fileType}</p>
                )}
                {item.uploadedAt && (
                  <p className="text-xs text-gray-400">
                    {new Date(item.uploadedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <FilePreviewModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        file={selectedFile}
      />
    </>
  );
};
