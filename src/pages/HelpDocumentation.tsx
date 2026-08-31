/**
 * Help / Documentation reference page.
 *
 * One section per Documentation area (Viewing Documents, Uploading &
 * Folders, Downloading & Previewing, Editing / Versioning / Deleting)
 * showing who can do what in plain English. Written for non-technical
 * users — uses role display names, not role codes. Mirrors HelpTasks.tsx /
 * HelpFinance.tsx / HelpProgramme.tsx / HelpMeetings.tsx /
 * HelpCommunication.tsx's shape and styling deliberately, so this reads as
 * the same reference family rather than a second design.
 *
 * IMPORTANT — read before editing: unlike Meetings/Channels, this
 * feature's document.view/upload/edit/delete/manage codes ARE genuinely
 * checked server-side on nearly every path (documents/permissions.py,
 * called directly from views — not the unused HasPerm DRF class). Don't
 * describe them as UI-only. Two real gaps do exist and are documented on
 * purpose, not by omission: folder create/delete has no document
 * permission check at all, and the links()/obligations() actions on a
 * document only require document.view, not document.edit. Also: Documents
 * does NOT use a same-origin proxy for preview like Meeting/Channel
 * attachments do — every link (preview or download) is a freshly-minted
 * presigned S3 URL, generated only after the permission check passes.
 * Don't reintroduce a "proxy" claim without re-checking
 * documents/serializers.py first (it only ever emits "downloadUrl").
 *
 * Source of truth:
 *   - Document / Folder models        → documents/models.py (Folder.
 *     visibility: all|professional_team|contractor|individual)
 *   - Access gate (view)              → documents/views.py
 *     (DocumentViewSet.get_queryset — project access + document.view +
 *     visible_folder_q; denied access is a 404, not a 403)
 *   - Permission codes & grants       → documents/permissions.py
 *     (can_read/edit/delete/upload_document*, can_change_document_status),
 *     user/migrations/0026_simplify_document_permissions.py (the final,
 *     current grant table — nothing after it touches these codes)
 *   - Per-project override            → project/models.py
 *     (ProjectRolePermission), permissions/core.py (Layer 3)
 *   - Upload / storage                → storage/views.py (content-type
 *     allowlist, advisory size ceiling), storage/s3.py (presigned upload,
 *     no local-disk fallback for normal uploads)
 *   - Download / preview              → documents/serializers.py
 *     (_presigned_download_url — always fresh, no proxy, no separate
 *     stale-checkable endpoint)
 *   - Folder management gap           → documents/views.py
 *     (DocumentFolderViewSet.create/destroy — project access only)
 *   - Links/obligations gap           → documents/views.py
 *     (links(), obligations() — document.view only, not document.edit)
 *
 * Update this page whenever those rules change.
 */
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type Row = { action: string; who: string; when: string; note?: string };

interface DocumentationSection {
  type: string;
  title: string;
  description: string;
  rows: Row[];
}

const SECTIONS: DocumentationSection[] = [
  {
    type: "VIEWING",
    title: "Viewing Documents",
    description:
      "Two things have to both be true for you to see a document: your role has to be allowed to view documents at all, and the folder it's filed in has to be visible to you.",
    rows: [
      {
        action: "View documents at all (the Documents page)",
        who:
          "Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager, Architect, Consultant Quantity Surveyor, Consultant Planning Engineer, Planning Engineer, Structural/Mechanical/Electrical Engineer, Site Engineer, Site Supervisor, Foreman, Quantity Surveyor, Legal, Administrator, Project Administrator, Principal/PM, Super User.",
        when: "Anytime on the project.",
        note:
          "This is the widest of the five document permissions — most project roles have it. If your role isn't listed, this page's own list may be out of date for your project: an admin can grant or revoke it per project, so treat this as the platform default, not a guarantee.",
      },
      {
        action: "See a document filed inside a restricted folder",
        who:
          "Depends on the folder's own visibility setting: everyone (default), the professional/design team only, the contractor side only, or a specific named list of people — set when the folder was created.",
        when: "Anytime, as long as you match the folder's visibility.",
        note:
          "A document that isn't filed in any folder skips this check entirely — anyone who can view documents at all can see it. If a document is outside your access, the app shows it as simply not existing rather than telling you it's restricted — that's deliberate, so you can't confirm a sensitive document's existence just by trying different links.",
      },
    ],
  },
  {
    type: "UPLOADING",
    title: "Uploading & Folders",
    description:
      "Adding a new document, and the folders documents get filed into.",
    rows: [
      {
        action: "Upload a document",
        who:
          "Everyone who can view documents, except Consultant Planning Engineer, Planning Engineer, Site Engineer, Site Supervisor, and Foreman.",
        when: "Anytime on the project.",
        note:
          "Your file goes straight from your browser to storage — it never passes through the app's own server. Certain file types (like SVG images) are blocked outright for security reasons. The file-size limit is a number your browser reports about its own upload, not something the server can strictly enforce — so treat it as a guideline, not a hard wall.",
      },
      {
        action: "Create a new folder (Drawings / Documents tabs)",
        who: "Anyone who can upload documents.",
        when: "During the upload flow, when filing into a new folder.",
        note:
          "This isn't restricted to admins — anyone who can upload can also create a folder and set who it's visible to. It's really the upload screen itself that's gated, not folder creation specifically: there's no separate permission check on creating a folder, only on being allowed onto that screen in the first place. The Contracts tab is different: its folder structure is fixed and can't be added to.",
      },
      {
        action: "Delete a folder",
        who: "Anyone who can see it, as long as it isn't one of the app's built-in Contracts folders.",
        when: "Anytime.",
        note:
          "There's currently no extra check here beyond being able to see the folder — it doesn't require the same permission that gates deleting a document itself. Worth being careful with, since it's more open than you might expect.",
      },
    ],
  },
  {
    type: "DOWNLOADING",
    title: "Downloading & Previewing",
    description:
      "Opening or saving a document's file.",
    rows: [
      {
        action: "Preview or download a document",
        who: "Anyone who can view that specific document (see Viewing Documents above).",
        when: "Anytime.",
        note:
          "Every link you get for a document — whether you're previewing it or downloading it — is generated fresh, at the moment you load the page, only after your access has already been checked. There's no separate, reusable \"download link\" endpoint that could be called later with different access, and no proxy step in between — it's a direct, short-lived link to the file.",
      },
    ],
  },
  {
    type: "EDITING",
    title: "Editing, Versioning & Deleting",
    description:
      "Changing a document's details, adding a new version, or removing it — three different rules, not one.",
    rows: [
      {
        action: "Edit a document's details",
        who:
          "Whoever originally uploaded it — always. Anyone else needs their role to hold document-edit rights: Client/Owner, Client Project Manager, Project Manager, Construction Manager, Contracts Manager, Administrator, Project Administrator, Principal/PM, Super User.",
        when: "Anytime.",
      },
      {
        action: "Upload a new version of a document",
        who:
          "Whoever originally uploaded it — always. Anyone else needs the same role list as uploading a document (a slightly wider list than editing).",
        when: "Anytime.",
        note:
          "A new version is treated more like \"another upload\" than \"an edit\" — worth knowing if you're wondering why someone can add a revision but not edit the document's other details.",
      },
      {
        action: "Delete a document",
        who:
          "Client/Owner, Client Project Manager, Project Manager, Administrator, Project Administrator, or Principal/PM — always. The uploader can also delete their own document, but only if nothing else in the app links to it and it has no open compliance items against it.",
        when: "Anytime, subject to the above.",
        note:
          "This is narrower than \"you uploaded it, you can delete it\" — once something references your document, only the roles above can remove it, and you'll be asked to confirm.",
      },
      {
        action: "Change a document's status (Active / Finance Gated / Archived)",
        who:
          "Client/Owner, Client Project Manager, Project Manager, Administrator, or Principal/PM. This is the narrowest of the five document permissions — the uploader has no special access to this one, unlike editing or versioning.",
        when: "Anytime, following the allowed status transitions.",
      },
      {
        action: "Add or remove a document's links to other records, or add/edit its compliance obligations",
        who: "Anyone who can view the document.",
        when: "Anytime.",
        note:
          "Unlike almost everything else on this page, this one currently doesn't require document-edit rights — merely being able to see the document is enough. If that surprises you, it should — it's inconsistent with how editing a document's own details works, and is worth flagging if you rely on it as a real restriction.",
      },
    ],
  },
];

const GLOBAL_NOTES = [
  "Unlike Meetings and Communication, Documentation's permission codes are genuinely checked by the server on nearly every action described above — not just used to hide buttons in the interface.",
  "The role lists on this page are organisation-wide defaults. A project admin can grant or revoke any of the document permissions for a specific role on a specific project via Settings → Permissions, so what you actually see may differ from this page for a particular project.",
  "Two actions on this page are more open than the rest: deleting a folder, and adding/editing a document's links or compliance obligations. Both currently require less than you'd expect by comparison to editing or deleting the document itself — this page calls that out rather than describing them as more restricted than they really are.",
  "Documents are also visible through Django's own staff admin panel to anyone with staff/superuser access on the server — a separate, broader surface entirely outside the permissions described on this page.",
];

export default function HelpDocumentation() {
  const navigate = useNavigate();

  // Back goes to wherever the user actually came from — the Help hub, a
  // deep link out of /documents, anywhere — rather than always dumping them on
  // /documents. history.state.idx is React Router's history index: 0 (or
  // undefined) means this page is the first entry, so there is nothing to
  // pop and we fall back to /documents.
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/documents", { replace: true });
  };

  return (
    <div className="help-reference-page min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <h1 className="text-2xl font-normal text-foreground tracking-tight">
          Documentation reference
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Plain-English guide to Viewing Documents, Uploading & Folders,
          Downloading & Previewing, and Editing, Versioning & Deleting.
          Access here is checked in two layers — your role, and the
          folder's own visibility setting — and this page explains both.
        </p>

        {/* Quick jump nav */}
        <div className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <a
              key={s.type}
              href={`#${s.type.toLowerCase()}`}
              className="text-xs px-2.5 py-1 rounded-full border border-border text-foreground hover:bg-muted transition-colors"
            >
              {s.title}
            </a>
          ))}
        </div>

        {/* Per-area sections */}
        <div className="mt-10 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.type} id={s.type.toLowerCase()} className="scroll-mt-6">
              <h2 className="text-lg font-normal text-foreground">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {s.description}
              </p>

              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left font-normal px-4 py-2.5 w-1/4">Action</th>
                      <th className="text-left font-normal px-4 py-2.5 w-2/5">Who can do it</th>
                      <th className="text-left font-normal px-4 py-2.5">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.rows.map((r, i) => (
                      <tr key={i} className="border-t border-border align-top">
                        <td className="px-4 py-3 text-foreground">{r.action}</td>
                        <td className="px-4 py-3 text-foreground leading-relaxed">{r.who}</td>
                        <td className="px-4 py-3 text-foreground leading-relaxed">
                          {r.when}
                          {r.note && (
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                              {r.note}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        {/* Cross-cutting rules */}
        <section className="mt-12">
          <h2 className="text-lg font-normal text-foreground">Rules that apply across Documentation</h2>
          <div className="mt-4 rounded-xl border border-border bg-card px-5 py-4">
            <ul className="space-y-2.5 text-sm text-foreground leading-relaxed list-disc pl-5">
              {GLOBAL_NOTES.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mt-12 text-xs text-muted-foreground">
          Last updated 2026-08-27. If the platform behaves differently from
          what's described here, the platform's behaviour is the bug — please
          let the team know.
        </p>
      </div>
    </div>
  );
}
