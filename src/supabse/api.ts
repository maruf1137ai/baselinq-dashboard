// import JSZip, { file } from 'jszip';
// import { saveAs } from 'file-saver';
import { error } from 'console';
// import { supabase } from '../lib/supabaseClient';
import { supabase } from "../lib/supabaseClient";

// ---------------------------
// Get All Task
// ---------------------------
// ---------------------------
// Get All Task
// ---------------------------
export const GetTask = async (projectId?: string) => {
  let query = supabase.from('task').select('*');

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  query = query.order('created_by', { ascending: false }); // or created_at if it exists, using created_by as listed in schema user provided, but likely created_at is better standard. User schema didn't explicitly list created_at, but `created_by` IS user.id. I'll stick to created_by or just not order if unsure. But standard is created_at. I'll check my createProject, it used created_at. Standard Supabase.
  // Actually, wait, use `created_at` if I can, but to be safe with the prompt "don't add new field", if user didn't mention it... but Supabase usually adds it. 
  // Let's just return unsorted or sort by title? 
  // I will assume created_at exists as it's standard, or just not sort for now to be safe.

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return { data };
};

// ---------------------------
// Add New Task
// ---------------------------
export const addNewTask = async ({ newTask }) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");
  if (!newTask) throw new Error("No task provided");

  const processTask = (task) => ({
    ...task,
    created_by: user.id,
    project_id: task.project_id || null, // Ensure project_id is passed
    status: task.status || "Todo",
    priority: task.priority || "Medium",
  });

  // Always insert as array
  const tasksToInsert = Array.isArray(newTask)
    ? newTask.map(processTask)
    : [processTask(newTask)];

  const { data, error } = await supabase
    .from("task")
    .insert(tasksToInsert)
    .select();

  if (error) {
    console.error("SUPABASE INSERT ERROR:", error);
    throw new Error(error.message);
  }

  return data;
};

// ---------------------------
// Modify Task
// ---------------------------
export const modifyTask = async ({ newTask }) => {
  if (!newTask?.id) throw new Error("Task ID missing");

  const { data, error } = await supabase
    .from("task")
    .update(newTask)
    .eq("id", newTask.id)
    .select();

  if (error) {
    console.error("SUPABASE UPDATE ERROR:", error);
    throw new Error(error.message);
  }

  return data;
};

// ---------------------------
// Delete Task
// ---------------------------
export const deleteTask = async (taskId) => {
  if (!taskId) throw new Error("Task ID is required");

  const { data, error } = await supabase
    .from("task")
    .delete()
    .eq("id", taskId)
    .select(); // returns the deleted row

  if (error) {
    console.error("SUPABASE DELETE ERROR:", error);
    throw new Error(error.message);
  }

  return data;
};


// Upload file to Supabase Storage
export const uploadFile = async (file: File, id: string) => {
  const safeFileName = file.name
    .replace(/\s/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  const filePath = `${id}/${safeFileName}`;

  // Upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Upload error:", uploadError);
    throw uploadError;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("documents")
    .getPublicUrl(filePath);

  console.log("Uploaded file path:", filePath, "Public URL:", urlData.publicUrl);

  return urlData.publicUrl;
};

// Delete file from Supabase Storage
export const deleteFile = async (taskId: string, fileName: string) => {
  const { data, error } = await supabase.storage
    .from("documents")
    .remove([`${taskId}/${fileName}`]);

  if (error) {
    console.error("Delete error:", error);
    throw error;
  }

  return data;
};

// Get all documents for a task
export const getTaskDocuments = async (taskId: string) => {
  const { data, error } = await supabase.storage
    .from("documents")
    .list(taskId);

  if (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }

  // Map to include public URLs
  const filesWithUrls = data.map((file) => {
    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(`${taskId}/${file.name}`);

    return {
      ...file,
      url: urlData.publicUrl
    };
  });

  return filesWithUrls;
};

// ---------------------------
// Get All Projects
// ---------------------------
export const getProjects = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  // Fetching all projects created by the user
  const { data, error } = await supabase
    .from('project')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return { data };
};

// ---------------------------
// Create New Project
// ---------------------------
export const createProject = async (projectData: any) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  const newProject = {
    ...projectData,
    status: projectData.status || "Active",
    org_id: "11111111-1111-1111-1111-111111111111", // Hardcoded as requested
    created_by: user.id
  };

  const { data, error } = await supabase
    .from("project")
    .insert([newProject])
    .select()
    .single();

  if (error) {
    console.error("SUPABASE CREATE PROJECT ERROR:", error);
    throw new Error(error.message);
  }

  return data;
};

// ---------------------------
// Update Project
// ---------------------------
export const updateProject = async (projectData: any) => {
  if (!projectData.id) throw new Error("Project ID is required for update");

  const { data, error } = await supabase
    .from("project")
    .update(projectData)
    .eq("id", projectData.id)
    .select()
    .single();

  if (error) {
    console.error("SUPABASE UPDATE PROJECT ERROR:", error);
    throw new Error(error.message);
  }

  return data;
};


// ---------------------------
// User/Auth
// ---------------------------
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    window.location.href = "/login"
    throw new Error(error.message)

  };
  return user;
};

export const signOutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};
