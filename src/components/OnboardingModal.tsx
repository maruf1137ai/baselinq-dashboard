import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { uploadProjectDocument, validateFile, ALLOWED_FILE_EXTENSIONS } from "@/lib/Api";
import { X, FileText, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, differenceInMonths } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

const STEPS = [
  { id: 1, label: "Project Details" },
  { id: 2, label: "Documents" },
  { id: 3, label: "Financials & Timeline" },
];

// Fields to validate per step
const STEP_FIELDS: Record<number, (keyof z.infer<typeof projectSchema>)[]> = {
  1: ["name", "project_number"],
  2: [],
  3: ["start_date", "end_date", "total_budget", "fx_rate", "contract_type", "retention_rate", "vat_rate"],
};

export function OnboardingModal({
  isOpen,
  onOpenChange,
  project,
}: OnboardingModalProps) {
  const queryClient = useQueryClient();
  const { mutate: createProject, isPending: isCreating } = useCreateProject();
  const { mutate: updateProject, isPending: isUpdatingProject } =
    useUpdateProject();
  const isPending = isCreating || isUpdatingProject;
  const user = localStorage.getItem("user");
  const userObj = user ? JSON.parse(user) : null;
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploading, setIsUploading] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = React.useState<Record<string, number>>({});
  const [fileErrors, setFileErrors] = React.useState<Record<string, string>>({});

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      project_number: "",
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
          project_number: "",
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
      setCurrentStep(1);
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

      if (validFiles.length > 0) {
        form.clearErrors("attachments");
      }
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

  // Auto-generate project number from name (e.g. "Marina Bay Tower" → "MBT-001")
  const generateProjectNumber = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    let prefix: string;
    if (words.length === 0) return "";
    if (words.length === 1) {
      prefix = words[0].substring(0, 3).toUpperCase();
    } else {
      prefix = words.map((w) => w[0]).join("").toUpperCase().substring(0, 4);
    }
    return `${prefix}-001`;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    form.setValue("name", name);

    // Only auto-generate if user hasn't manually edited the project number,
    // or if it still matches a previously auto-generated pattern
    const currentNumber = form.getValues("project_number");
    const isAutoGenerated = currentNumber === "" ||
      currentNumber === "PRJ-001" ||
      /^[A-Z]{1,4}-001$/.test(currentNumber);

    if (!project && isAutoGenerated) {
      form.setValue("project_number", name.trim() ? generateProjectNumber(name) : "");
    }
  };

  const getDurationLabel = () => {
    if (!values.start_date || !values.end_date) return null;
    try {
      const start = parseISO(values.start_date);
      const end = parseISO(values.end_date);
      if (end <= start) return null;
      const months = differenceInMonths(end, start);
      const remainingDays = differenceInDays(end, new Date(start.getFullYear(), start.getMonth() + months, start.getDate()));
      if (months === 0) return `${differenceInDays(end, start)} days`;
      if (remainingDays === 0) return `${months} month${months !== 1 ? "s" : ""}`;
      return `${months} month${months !== 1 ? "s" : ""}, ${remainingDays} day${remainingDays !== 1 ? "s" : ""}`;
    } catch {
      return null;
    }
  };

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep];
    if (fields && fields.length > 0) {
      const valid = await form.trigger(fields);
      if (!valid) return;
    }
    // Step 2: check documents (only required when creating, not editing)
    if (currentStep === 2 && !project) {
      if (selectedFiles.length === 0) {
        form.setError("attachments", {
          type: "manual",
          message: "At least one project document is required",
        });
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
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
        _id: project?._id || project?.id,
      }),
    };

    const handleSuccess = async (result: any) => {
      // Django API sometimes returns { message, project } or just the project object
      const projectData = result?.project || result;

      if (!projectData) {
        console.error("Unexpected API response structure:", result);
        toast.error("Failed to retrieve project details after save");
        return;
      }

      const pId = projectData._id || projectData.id;

      if (selectedFiles.length > 0 && pId) {
        try {
          await uploadAllFiles(pId);
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

      // Refetch projects list
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      // Also invalidate the specific URL key used in the sidebar
      const userId = userObj?.id || project?.user_id;
      if (userId) {
        queryClient.invalidateQueries({ queryKey: [`projects/?userId=${userId}`] });
      }

      onOpenChange(false);

      if (pId) {
        // console.log("Setting selectedProjectId to:", pId);
        localStorage.setItem("selectedProjectId", String(pId));
        if (projectData.location) {
          localStorage.setItem("projectLocation", projectData.location);
        }
        // window.dispatchEvent(new Event("project-change"));
      } else {
        console.warn("Could not find project ID in response:", projectData);
      }

      setSelectedFiles([]);
    };

    const handleError = (error: any) => {
      // Parse API error response structure
      // Expected format: { field_name: ["error message"] } or { field_name: "error message" }
      console.log(error?.response?.data);
      if (error?.response?.data) {
        const errorData = error.response.data;

        // Handle field-specific errors
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          // Extract all error messages
          const errorMessages: string[] = [];

          Object.entries(errorData).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach((msg) => errorMessages.push(`${field}: ${msg}`));
            } else if (typeof messages === 'string') {
              errorMessages.push(`${field}: ${messages}`);
            }
          });

          // Display each error as a separate toast
          if (errorMessages.length > 0) {
            errorMessages.forEach((msg) => toast.error(msg));
            return;
          }
        }

        // Handle string error message
        if (typeof errorData === 'string') {
          toast.error(errorData);
          return;
        }

        // Handle error message in errorData.message
        if (errorData.message) {
          toast.error(errorData.message);
          return;
        }
      }

      // Fallback to generic error
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

  const values = form.watch();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-white max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>
            {project
              ? "Edit Project"
              : "Welcome! Let's set up your first project"}
          </DialogTitle>
          <DialogDescription>
            {project
              ? "Update the project details below."
              : "You need at least one project to get started."}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="px-6 pt-2 pb-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                      currentStep > step.id
                        ? "bg-primary text-white"
                        : currentStep === step.id
                          ? "bg-primary text-white"
                          : "bg-[#F3F4F6] text-[#9CA3AF]"
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap",
                      currentStep >= step.id ? "text-[#101828]" : "text-[#9CA3AF]"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-[2px] mx-3 mb-5 transition-colors",
                      currentStep > step.id ? "bg-primary" : "bg-[#E5E7EB]"
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()} className="px-6 pb-6">
            {/* Step 1: Project Details */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="My Awesome Project"
                            {...field}
                            onChange={handleNameChange}
                          />
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
                        <Textarea
                          placeholder="Brief description of the project, its goals, and key stakeholders..."
                          className="min-h-[100px] resize-none"
                          {...field}
                        />
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
              </div>
            )}

            {/* Step 2: Documents */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="attachments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Documents *</FormLabel>
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
                            className="mt-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-10 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() =>
                              document.getElementById("project-upload")?.click()
                            }>
                            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Drag and drop your files here
                            </p>
                            <p className="text-sm text-muted-foreground">
                              or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              PDF, JPG, PNG, GIF, WEBP, XLSX, XLS (max 20MB)
                            </p>
                          </div>

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
                                  {uploadProgress[file.name] !== undefined && (
                                    <div className="mt-2">
                                      <Progress value={uploadProgress[file.name]} className="h-1" />
                                      <p className="text-xs text-gray-500 mt-1">
                                        {uploadProgress[file.name] === 100 ? "Uploaded" : `${uploadProgress[file.name]}%`}
                                      </p>
                                    </div>
                                  )}
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
              </div>
            )}

            {/* Step 3: Financials & Timeline */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(parseISO(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-white" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? parseISO(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(parseISO(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-white" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? parseISO(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Duration indicator */}
                {getDurationLabel() && (
                  <div className="flex items-center gap-3 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-3">
                    <div className="flex-1">
                      <div className="h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-[#101828] whitespace-nowrap">
                      Duration: {getDurationLabel()}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="total_budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Budget</FormLabel>
                        <FormControl>
                          <div className="relative">
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
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                )}
              </div>
              <div>
                {currentStep < STEPS.length ? (
                  <Button type="button" onClick={handleNext}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isPending || isUploading}
                    onClick={async () => {
                      const fields = STEP_FIELDS[currentStep];
                      if (fields && fields.length > 0) {
                        const valid = await form.trigger(fields);
                        if (!valid) return;
                      }
                      form.handleSubmit(onSubmit)();
                    }}
                  >
                    {isPending || isUploading
                      ? project
                        ? "Updating..."
                        : "Creating..."
                      : project
                        ? "Update Project"
                        : "Create Project"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
