import {
  getPresignedUrl,
  uploadFileToPresignedUrl,
  registerS3Document,
  validateFile,
  ProjectDocument,
} from "@/lib/Api";

interface UploadOptions {
  folder?: string;
  onProgress?: (percent: number) => void;
}

export function usePresignedUpload() {
  const uploadFile = async (
    projectId: string | number,
    file: File,
    options: UploadOptions = {}
  ): Promise<ProjectDocument> => {
    const validation = validateFile(file);
    if (!validation.valid) throw new Error(validation.error);

    const { folder = "projects/documents", onProgress } = options;

    // Step 1: Get presigned PUT URL from backend
    const { upload_url, key } = await getPresignedUrl({
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      folder,
    });

    // Step 2: Upload file directly to S3
    await uploadFileToPresignedUrl(upload_url, file, file.type || "application/octet-stream", onProgress);

    // Step 3: Register file metadata in DB
    const doc = await registerS3Document(projectId, {
      file_name: file.name,
      s3_key: key,
    });

    return doc;
  };

  return { uploadFile };
}
