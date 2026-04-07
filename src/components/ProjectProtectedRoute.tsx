import React from "react";
import { Navigate } from "react-router-dom";

interface ProjectProtectedRouteProps {
  children: React.ReactNode;
}

const ProjectProtectedRoute = ({ children }: ProjectProtectedRouteProps) => {
  const selectedProjectId = localStorage.getItem("selectedProjectId");

  if (!selectedProjectId) {
    // If no project is selected, redirect to the project selection page
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
};

export default ProjectProtectedRoute;
