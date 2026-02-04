import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { uploadProjectDocument, validateFile, ALLOWED_FILE_EXTENSIONS } from "@/lib/Api";
import { X, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { toast } from "sonner";

const projectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  project_number: z.string().min(1, "Project number is required"), // e.g., PRJ-001
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  fx_rate: z.coerce.number().min(0, "Must be a positive number"),
  retention_rate: z.coerce.number().min(0).max(10, "Must be between 0 and 10"),
  vat_rate: z.coerce.number().min(0).max(25, "Must be between 0 and 25"),
  contract_type: z.string().min(1, "Contract type is required"),
  total_budget: z.coerce.number().min(0, "Must be a positive number"),
  location: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

interface OnboardingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project?: any;
}

export function OnboardingModal({
  isOpen,
  onOpenChange,
  project,
}: OnboardingModalProps) {
  const { mutate: createProject, isPending: isCreating } = useCreateProject();
  const { mutate: updateProject, isPending: isUpdatingProject } =
    useUpdateProject();
  const isPending = isCreating || isUpdatingProject;
  const [isUploading, setIsUploading] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});
  const [fileErrors, setFileErrors] = React.useState<Record<string, string>>({});

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      project_number: "PRJ-001",
      start_date: "",
      end_date: "",
      fx_rate: 1,
      retention_rate: 5, // Default from generic commercial project standards or user preference
      vat_rate: 15,
      contract_type: "JBCC",
      total_budget: 0,
      location: "",
      attachments: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (project) {
        // Helper to get formatted date YYYY-MM-DD
        const getDate = (dateStr: string) => {
          if (!dateStr) return "";
          return dateStr.split("T")[0];
        };

        form.reset({
          name: project.name || "",
          description: project.description || "",
          project_number: project.projectNumber || project.project_number || "",
          start_date: getDate(project.startDate || project.start_date),
          end_date: getDate(project.endDate || project.end_date),
          fx_rate: project.fxRate ?? project.fx_rate ?? 1,
          retention_rate: project.retentionRate ?? project.retention_rate ?? 5,
          vat_rate: project.vatRate ?? project.vat_rate ?? 15,
          contract_type: project.contractType || project.contract_type || "JBCC",
          total_budget: project.totalBudget ?? project.total_budget ?? 0,
          location: project.location || "",
          attachments: project.attachments || [],
        });
      } else {
        form.reset({
          name: "",
          description: "",
          project_number: "PRJ-001",
          start_date: "",
          end_date: "",
          fx_rate: 1,
          retention_rate: 5,
          vat_rate: 15,
          contract_type: "JBCC",
          total_budget: 0,
          location: "",
          attachments: [],
        });
      }
      setSelectedFiles([]);
    }
  }, [project, isOpen, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      const errors: Record<string, string> = {};

      newFiles.forEach((file) => {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          errors[file.name] = validation.error || "Invalid file";
          toast.error(`${file.name}: ${validation.error}`);
        }
      });

      setFileErrors((prev) => ({ ...prev, ...errors }));
      setSelectedFiles((prev) => [...prev, ...validFiles]);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadProgress((prev) => {
      const updated = { ...prev };
      delete updated[fileToRemove.name];
      return updated;
    });
    setFileErrors((prev) => {
      const updated = { ...prev };
      delete updated[fileToRemove.name];
      return updated;
    });
  };

  const uploadAllFiles = async (projectId: string) => {
    if (!selectedFiles.length) return [];
    setIsUploading(true);
    const uploadedDocs: any[] = [];

    for (const file of selectedFiles) {
      try {
        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
        const doc = await uploadProjectDocument(projectId, file, (progress) => {
          setUploadProgress((prev) => ({ ...prev, [file.name]: progress }));
        });
        uploadedDocs.push(doc);
        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      } catch (err) {
        console.error("Error uploading file:", file.name, err);
        toast.error(`Failed to upload ${file.name}`);
        setFileErrors((prev) => ({
          ...prev,
          [file.name]: err instanceof Error ? err.message : "Upload failed",
        }));
      }
    }

    setIsUploading(false);
    return uploadedDocs;
  };

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    const data = {
      name: values.name,
      description: values.description,
      project_number: values.project_number,
      projectNumber: values.project_number,
      start_date: values.start_date,
      startDate: values.start_date,
      end_date: values.end_date,
      endDate: values.end_date,
      fx_rate: values.fx_rate,
      fxRate: values.fx_rate,
      retention_rate: values.retention_rate,
      retentionRate: values.retention_rate,
      vat_rate: values.vat_rate,
      vatRate: values.vat_rate,
      contract_type: values.contract_type,
      contractType: values.contract_type,
      total_budget: values.total_budget,
      totalBudget: values.total_budget,
      location: values.location,
      status: "Draft",
      ...((project?.id || project?._id) && {
        id: project.id || project?._id,
        _id: project?._id || project?.id
      }),
    };

    const handleSuccess = async (result: any) => {
      // Django API returns { message, project }
      const projectData = result.project;

      if (selectedFiles.length > 0) {
        try {
          await uploadAllFiles(projectData.id || projectData._id);
          toast.success(
            project
              ? "Project updated with attachments!"
              : "Project created with attachments!",
          );
        } catch (error) {
          console.error("Attachment upload error:", error);
          toast.error("Project saved but failed to upload attachments");
        }
      } else {
        toast.success(
          project
            ? "Project updated successfully!"
            : "Project created successfully!",
        );
      }

      onOpenChange(false);
      const newProjectId = projectData.id || projectData._id;
      localStorage.setItem("selectedProjectId", newProjectId);
      if (projectData.location) {
        localStorage.setItem("projectLocation", projectData.location);
      }
      window.dispatchEvent(new Event("project-change"));
      setSelectedFiles([]);
    };

    const handleError = (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(
        `Failed to ${project ? "update" : "create"} project: ${errorMessage}`,
      );
    };

    if (project) {
      updateProject(data, {
        onSuccess: handleSuccess,
        onError: handleError,
      });
    } else {
      createProject(data, {
        onSuccess: handleSuccess,
        onError: handleError,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {project
              ? "Edit Project"
              : "Welcome! Let's set up your first project"}
          </DialogTitle>
          <DialogDescription>
            {project
              ? "Update the project details below."
              : "You need at least one project to get started. Fill in the details below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="project_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Number</FormLabel>
                    <FormControl>
                      <Input placeholder="PRJ-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Project Location (e.g. New York, NY)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attachments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Documents</FormLabel>
                  <FormControl>
                    <div>
                      <Input
                        type="file"
                        id="project-upload"
                        className="hidden"
                        onChange={handleFileChange}
                        multiple
                        accept={ALLOWED_FILE_EXTENSIONS.join(',')}
                      />
                      <div
                        className="mt-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-8 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() =>
                          document.getElementById("project-upload")?.click()
                        }>
                        <p className="text-sm text-muted-foreground">
                          Drag and drop your file here
                        </p>
                        <p className="text-sm text-muted-foreground">
                          or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          PDF, JPG, PNG, GIF, WEBP, XLSX, XLS (max 20MB)
                        </p>
                      </div>

                      {/* Selected files */}
                      {selectedFiles.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
                          {selectedFiles.map((file, index) => (
                            <div
                              key={index}
                              className="border rounded-lg p-3 bg-gray-50">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <FileText className="h-4 w-4 text-gray-500 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(index)}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                  disabled={isUploading}>
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              {/* Upload progress */}
                              {uploadProgress[file.name] !== undefined && (
                                <div className="mt-2">
                                  <Progress value={uploadProgress[file.name]} className="h-1" />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {uploadProgress[file.name] === 100 ? "Uploaded" : `${uploadProgress[file.name]}%`}
                                  </p>
                                </div>
                              )}
                              {/* Error message */}
                              {fileErrors[file.name] && (
                                <p className="text-xs text-red-500 mt-1">{fileErrors[file.name]}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="total_budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Budget</FormLabel>
                    <FormControl>
                      <div className="relative">
                        {/* <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R</span> */}
                        <Input
                          placeholder="0"
                          {...field}
                          className="pl-54"
                          value={
                            (field.value as any) === 0 ||
                              (field.value as any) === ""
                              ? ""
                              : field.value !== undefined &&
                                field.value !== null
                                ? field.value.toLocaleString()
                                : ""
                          }
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/,/g, "")
                              .replace(/R\s?/, "");
                            if (val === "") {
                              field.onChange("");
                            } else if (!isNaN(Number(val))) {
                              field.onChange(Number(val));
                            }
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fx_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FX Rate</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={(field.value as any) === 0 ? "" : field.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? "" : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contract_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contract type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        <SelectItem value="JBCC">JBCC</SelectItem>
                        <SelectItem value="NEC">NEC</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="retention_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retention Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        max={10}
                        type="number"
                        step="0.1"
                        {...field}
                        value={(field.value as any) === 0 ? "" : field.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? "" : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vat_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VAT Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        max={25}
                        type="number"
                        step="0.1"
                        {...field}
                        value={(field.value as any) === 0 ? "" : field.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? "" : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isPending || isUploading}>
                {isPending || isUploading
                  ? project
                    ? "Updating..."
                    : "Creating..."
                  : project
                    ? "Update Project"
                    : "Create Project"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
