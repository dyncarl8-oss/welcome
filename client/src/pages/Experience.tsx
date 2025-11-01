import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import Header from "@/components/Header";
import AdminDashboard from "@/components/AdminDashboard";
import CustomerView from "@/components/CustomerView";
import LoadingState from "@/components/LoadingState";
import AccessDenied from "@/components/AccessDenied";
import { apiCall } from "@/lib/api";

type AccessLevel = "admin" | "customer" | "no_access" | null;

export default function Experience() {
  const [, params] = useRoute("/experiences/:experienceId");
  const experienceId = params?.experienceId;
  
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateAccess = async () => {
      if (!experienceId) {
        setAccessLevel("no_access");
        setError("No experience ID provided");
        setIsLoading(false);
        return;
      }

      try {
        // The x-whop-user-token header is automatically added by Whop in production
        // or by the dev proxy in local development
        const data = await apiCall("/api/validate-access", {
          method: "POST",
          body: JSON.stringify({ experienceId }),
        });
        
        if (data.hasAccess) {
          setAccessLevel(data.accessLevel);
          setUserName(data.userName || null);
          setUserId(data.userId || null);
          setCompanyId(data.companyId || null);
          setError(null);
        } else {
          setAccessLevel("no_access");
          setError("Access denied");
        }
      } catch (err) {
        console.error("Error validating access:", err);
        setAccessLevel("no_access");
        setError(err instanceof Error ? err.message : "Failed to validate access");
      } finally {
        setIsLoading(false);
      }
    };

    validateAccess();
  }, [experienceId]);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
  }, []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!accessLevel || accessLevel === "no_access") {
    return <AccessDenied error={error} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header role={accessLevel} userId={userId} companyId={companyId} />
      <main>
        {accessLevel === "admin" ? <AdminDashboard userName={userName} experienceId={experienceId} /> : <CustomerView experienceId={experienceId} />}
      </main>
    </div>
  );
}
