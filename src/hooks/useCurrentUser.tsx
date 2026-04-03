import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/Api";

interface Organization {
  id: number;
  name: string;
  company_reg_number: string | null;
  ck_number: string | null;
  vat_number: string | null;
  company_size: string | null;
}

interface Profile {
  id: number;
  phone_number: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  professional_reg_number: string | null;
  professional_body: string | null;
  id_number: string | null;
}

interface InsuranceDocument {
  s3_key: string | null;
  file_name: string | null;
  expiry_date: string | null;
}

interface BankingDetails {
  bank_name: string | null;
  branch_name: string | null;
  branch_code: string | null;
  account_number: string | null;
  account_type: string | null;
  swift_code: string | null;
}

export interface User {
  id: number;
  email: string;
  name: string;
  account_type: "organisation" | "individual";
  organization: Organization | null;
  role: { id: number; name: string; code: string } | null;
  profile: Profile | null;
  insurance_document: InsuranceDocument | null;
  banking_details: BankingDetails | null;
  is_email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const getCurrentUser = async (): Promise<User | null> => {
  const userStr = localStorage.getItem("user");
  const localUser = userStr ? (JSON.parse(userStr) as User) : null;

  try {
    // Attempt to fetch fresh profile from API to ensure we have latest organization meta
    const data = await getProfile();
    if (data) {
      // Merge: keeping local for speed and refreshing on success
      localStorage.setItem("user", JSON.stringify(data));
      return data;
    }
  } catch (error) {
    if (!localUser) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      window.location.href = "/login";
    }
  }
  return localUser;
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });
};
