import React from "react";
import { Navigate } from "react-router-dom";
import { hasSession } from "@/lib/authSession";

const ProtectedRoute = ({ children }) => {
  // Cookie mode: a reload has no access token yet, only a session to resume.
  if (!hasSession()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
