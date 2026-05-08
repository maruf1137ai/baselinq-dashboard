/**
 * Werner spec rev G — shared document header.
 *
 * Top of every task doc (RFI, SI, VO, GI, IC, Claim). Project info on
 * the left, Print/Export on the right. Identical layout per Werner pages
 * 3-11 — that consistency is itself a requirement (Vans repeated it
 * three times in the meeting: "it almost sits there as a certificate
 * completed with all the information collected within that one
 * environment").
 */
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentHeaderProps {
  projectName: string;
  projectNumber: string;
  projectAddress: string;
  employer: string;
  /** "REQUEST FOR INFORMATION", "SITE INSTRUCTION", "VARIATION ORDER" etc. */
  docTypeLabel: string;
  /** Show seal / signature graphic (SI, VO, Claim — the contractually-binding docs). */
  showSeal?: boolean;
  onPrint?: () => void;
}

export function DocumentHeader({
  projectName,
  projectNumber,
  projectAddress,
  employer,
  docTypeLabel,
  showSeal = false,
  onPrint,
}: DocumentHeaderProps) {
  return (
    <div className="px-6 pt-5 pb-4 bg-gray-100 border-b border-gray-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900 underline">
            {docTypeLabel}
          </h2>
          <dl className="mt-3 grid grid-cols-[140px_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-gray-700">Project name:</dt>
            <dd className="text-gray-900">{projectName}</dd>
            <dt className="text-gray-700">Project address:</dt>
            <dd className="text-gray-900">{projectAddress}</dd>
            <dt className="text-gray-700">Project No:</dt>
            <dd className="text-gray-900">{projectNumber}</dd>
            <dt className="text-gray-700">Employer:</dt>
            <dd className="text-gray-900">{employer}</dd>
          </dl>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" size="sm" onClick={onPrint} className="h-8 bg-white">
            <Printer className="mr-1.5 h-3.5 w-3.5" />
            Print / Export
          </Button>
          {showSeal && <SealGraphic />}
        </div>
      </div>
    </div>
  );
}

/** Document/signature/seal/fingerprint visual stamp on certificate-grade docs.
 *  Werner spec page 5 / 8 / 11 / 12. */
function SealGraphic() {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-2xl" role="img" aria-label="document">📄</span>
      <span className="font-script italic text-gray-700 text-sm" style={{ fontFamily: "cursive" }}>
        signature
      </span>
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-green-200 text-green-800 text-[10px] font-semibold">
        Seal
      </span>
      <span className="text-xl" role="img" aria-label="fingerprint">🔏</span>
    </div>
  );
}
