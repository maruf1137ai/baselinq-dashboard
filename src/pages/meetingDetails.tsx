import { DashboardLayout } from "@/components/DashboardLayout";
import { ArrowLeft, ChevronDown, Calendar, MapPin, Users, FileText, MoreHorizontal, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import AiIcon from "@/components/icons/AiIcon";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { usePost } from "@/hooks/usePost";
import { toast } from "sonner";

const meetingData = {
  title: "Werner/Darren — Dashboard Review",
  status: "held",
  date: "March 23, 2026",
  time: "09:00 AM – 10:36 AM",
  location: "Virtual — Video Call",
  participants: [
    { name: "Grant Mcevoy", role: "Stakeholder" },
    { name: "Maruf Mia", role: "Frontend Developer" },
    { name: "David Zeeman", role: "Stakeholder" },
    { name: "Risalat Shahriar", role: "Product Lead" },
    { name: "Darren Ogden", role: "Industry Consultant" },
    { name: "Vans Arc", role: "Professional User" },
  ],
  summary: {
    overview: "Discussion centred on the platform's onboarding sequence, with participants reaching consensus that legal liability must be tied to a registered company entity before any project can be initiated on the system.",
    sections: [
      {
        title: "Onboarding Flow Must Be Reversed",
        body: "The current flow was identified as flawed — it forces project creation before a user or company has been properly registered. The group agreed the sequence must be restructured so that company onboarding comes first, laying the legal and organisational foundation before any project work begins.",
      },
      {
        title: "Company Registration and Legal Accountability",
        body: "Registering a company entity was established as a prerequisite to project creation. This requires capturing VAT number, CK number, professional indemnity insurance, and other compliance details. Accountability for project activity rests with the registered company, not the individual user — ensuring that if a team member departs, access and responsibility transfer cleanly.",
      },
      {
        title: "Required Data and Project Health Monitoring",
        body: "Professional liability insurance details, policy numbers, and banking information must all be collected during company onboarding. The group identified a Project Health tab as essential for surfacing risks tied to incomplete company information, keeping professionals informed without blocking project progress.",
      },
    ],
  },
  decisions: [
    { text: "Onboarding Flow Must Be Reversed", owner: "Darren Ogden" },
    { text: "Mandatory Entity Registration Before Project Creation", owner: "Darren Ogden" },
    { text: "Company Holds Legal Liability, Not the Individual User", owner: "Darren Ogden" },
    { text: "User Matrix Required for Role-Based Access Control", owner: "Vans Arc" },
    { text: "Project Health Tab to Flag Incomplete Onboarding Data", owner: "Darren Ogden" },
    { text: "Insurance Details Must Be Captured in Company Profile", owner: "Darren Ogden" },
    { text: "Banking Details to Be Included in Company Onboarding", owner: "Risalat Shahriar" },
    { text: "Client Populates Own Details via Email Invite Link", owner: "Vans Arc" },
    { text: "Digital Signature Required for Legal Documents", owner: "Vans Arc" },
    { text: "Contractor Onboarding Deferred — Separate Discussion Needed", owner: "Darren Ogden" },
  ],
  actionItems: [
    { text: "Document daily construction industry workflow and compile required company onboarding fields (VAT, CK numbers, etc.)", owner: "Darren Ogden & Vans Arc", due: "Mar 25" },
    { text: "Restructure signup flow: (1) create & onboard company, (2) invite users, (3) create or join a project", owner: "The Group", due: "Mar 26" },
    { text: "Allow project details to be edited by users at any point during the project lifecycle", owner: "The Group", due: "Mar 26" },
    { text: "Show company profile completion percentage on the settings page to encourage full registration", owner: "The Group", due: "Mar 27" },
    { text: "Flag outstanding company details on the landing page and add a corresponding task to the Project Manager's dashboard", owner: "The Group", due: "Mar 27" },
    { text: "Update client detail page so company/client registration precedes project onboarding", owner: "David Zeeman", due: "Mar 25" },
    { text: "Add banking details, professional registration number, registered organisation, and insurance details (with drag-and-drop) to professional onboarding; show dashboard alert when any field is missing", owner: "David Zeeman", due: "Mar 25" },
    { text: "Schedule and attend tomorrow's session on dashboard and project overviews", owner: "The Group", due: "Mar 25" },
    { text: "Complete all action items today and prepare items to demo tomorrow", owner: "David Zeeman & The Group", due: "Mar 25" },
    { text: "Populate and simplify the responsibility matrix document outlining rights per user role", owner: "Vans Arc & Darren Ogden", due: "Mar 26" },
  ],
  transcript: [
    { speaker: "Risalat Shahriar", time: "00:00", text: "Let me send the link to the call." },
    { speaker: "Grant Mcevoy", time: "00:00", text: "The document page really looks good." },
    { speaker: "Risalat Shahriar", time: "00:00", text: "Thank you, nice." },
    { speaker: "Grant Mcevoy", time: "00:00", text: "I'm not sure if everyone is on the right link. Let me re-invite Darren and Vera." },
    { speaker: "David Zeeman", time: "00:00", text: "I just clicked from the email and it works." },
    { speaker: "Risalat Shahriar", time: "00:00", text: "Yeah, I also clicked from my calendar. Just drop the link in the chat for them." },
    { speaker: "Darren Ogden", time: "00:05", text: "How many links was I supposed to click on?" },
    { speaker: "Grant Mcevoy", time: "00:05", text: "It goes Monday, Tuesday, Wednesday — Monday would have been the right one for today." },
    { speaker: "Risalat Shahriar", time: "00:05", text: "Grant could have just sent one invite with the option to customise the schedule. No problem though." },
    { speaker: "Darren Ogden", time: "00:05", text: "We're all here. Well done everyone." },
    { speaker: "Vans Arc", time: "00:06", text: "Am I the only one confused with all the links? I was clicking on all of them waiting for one to open." },
    { speaker: "Darren Ogden", time: "00:06", text: "No, you weren't the only one." },
    { speaker: "Darren Ogden", time: "00:06", text: "Grant, is the intention that we meet today, tomorrow and Wednesday?" },
    { speaker: "Grant Mcevoy", time: "00:06", text: "Yes — separate focused sessions. Today is onboarding, then tomorrow something else, so it's not one long two-hour meeting." },
    { speaker: "Risalat Shahriar", time: "00:06", text: "The meeting title says it — tomorrow is going to be the dashboard review. Today's focus is onboarding, just getting feedback and leads on the specific segments." },
  ],
};

const TASK_CONFIGS = [
  {
    type: 'VO',
    url: 'tasks/variation-orders/',
    payload: (title: string, projectId: string) => ({
      project: parseInt(projectId), title, description: title,
      taskStatus: 'Draft', discipline: 'Architectural', line_items: [],
      currency: 'ZAR', sub_total: 0, tax_type: 'VAT', tax_rate: 15, tax_amount: 0, grand_total: 0,
    }),
  },
  {
    type: 'SI',
    url: 'tasks/site-instructions/',
    payload: (title: string, projectId: string) => ({
      project: parseInt(projectId), title, instruction: title,
      taskStatus: 'Open', discipline: 'Architectural', urgency: 'Normal',
    }),
  },
  {
    type: 'RFI',
    url: 'tasks/requests-for-information/',
    payload: (title: string, projectId: string) => ({
      project: parseInt(projectId), subject: title, question: title,
      description: title, taskStatus: 'Open', discipline: 'Architectural',
    }),
  },
  {
    type: 'DC',
    url: 'tasks/delay-claims/',
    payload: (title: string, projectId: string) => ({
      project: parseInt(projectId), title, description: title,
      taskStatus: 'Draft', estimated_cost_currency: 'ZAR',
    }),
  },
  {
    type: 'CPI',
    url: 'tasks/critical-path-items/',
    payload: (title: string, projectId: string) => ({
      project: parseInt(projectId), task_activity_name: title, description: title,
    }),
  },
];

export default function MeetingDetails() {
  const [showTranscript, setShowTranscript] = useState(false);
  const [approvingIndex, setApprovingIndex] = useState<number | null>(null);
  const { mutateAsync: postRequest } = usePost();
  const meeting = meetingData;

  const handleApprove = async (item: { text: string; owner: string; due?: string }, index: number) => {
    const projectId = localStorage.getItem('selectedProjectId');
    if (!projectId) { toast.error('No project selected.'); return; }
    const config = TASK_CONFIGS[index % TASK_CONFIGS.length];
    setApprovingIndex(index);
    try {
      const result = await postRequest({ url: config.url, data: config.payload(item.text, projectId) });
      try {
        await postRequest({
          url: 'channels/',
          data: { project: parseInt(projectId), taskId: result?.task?.id, taskType: result?.task?.taskType, name: item.text, channel_type: 'public' },
        });
      } catch { /* non-fatal */ }
      toast.success(`${config.type} task created successfully.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? err?.message ?? 'Failed to create task.');
    } finally {
      setApprovingIndex(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          to="/meetings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Meetings
        </Link>

        {/* Meeting Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-normal tracking-tight text-foreground">{meeting.title}</h1>
            <Badge className="bg-green-50 text-green-700 border-0 text-xs px-2 py-0.5 rounded-full">
              Completed
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {meeting.date} • {meeting.time}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {meeting.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {meeting.participants.length} participants
            </span>
          </div>
        </div>

        {/* AI Summary */}
        <div className="p-4 border border-border rounded-lg">
          <div className="flex items-center gap-1.5 mb-3">
            <AiIcon size={16} className="text-primary" />
            <h2 className="text-sm font-medium text-foreground">AI Summary</h2>
          </div>
          <p className="text-sm text-foreground leading-relaxed mb-4">{meeting.summary.overview}</p>
          <div className="space-y-4">
            {meeting.summary.sections.map((s, i) => (
              <div key={i}>
                <p className="text-sm font-medium text-foreground mb-1">{s.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Decisions */}
        <div className="p-4 border border-border rounded-lg">
          <h2 className="text-sm font-medium text-foreground mb-3">Key Decisions</h2>
          <div className="space-y-2">
            {meeting.decisions.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <div>
                  <p className="text-sm text-foreground">{d.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">→ {d.owner}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div className="p-4 border border-border rounded-lg">
          <h2 className="text-sm font-medium text-foreground mb-3">Action Items</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left text-xs text-muted-foreground font-normal px-4 py-2.5">Action</th>
                  <th className="text-left text-xs text-muted-foreground font-normal px-4 py-2.5 w-40">Owner</th>
                  <th className="text-left text-xs text-muted-foreground font-normal px-4 py-2.5 w-28">Due</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {meeting.actionItems.map((item, i) => {
                  const isCreating = approvingIndex === i;
                  return (
                    <tr key={i} className={`border-t border-border transition-colors ${isCreating ? 'bg-primary/5' : ''}`}>
                      <td className="text-sm text-foreground px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.text}
                          {isCreating && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                              <Loader2 className="h-3 w-3 animate-spin" /> Creating task…
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-sm text-muted-foreground px-4 py-3">{item.owner}</td>
                      <td className="text-sm text-muted-foreground px-4 py-3">{item.due}</td>
                      <td className="pr-3 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              disabled={isCreating}
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-36" align="end">
                            <DropdownMenuItem onSelect={() => handleApprove(item, i)}>
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50">
                              Decline
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Participants */}
        <div className="p-4 border border-border rounded-lg">
          <h2 className="text-sm font-medium text-foreground mb-3">Participants</h2>
          <div className="flex flex-wrap gap-2">
            {meeting.participants.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-[10px] text-primary font-medium">{p.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div>
                  <span className="text-xs text-foreground">{p.name}</span>
                  <span className="text-xs text-muted-foreground ml-1">• {p.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transcript (Collapsible) */}
        <div className="p-4 border border-border rounded-lg">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showTranscript ? 'rotate-180' : ''}`} />
            <FileText className="h-4 w-4" />
            Transcript
          </button>

          {showTranscript && (
            <div className="mt-3 border border-border rounded-lg p-4 space-y-3">
              {meeting.transcript.map((segment, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-xs text-muted-foreground w-10 shrink-0 pt-0.5">{segment.time}</span>
                  <div>
                    <span className="text-xs font-medium text-foreground">{segment.speaker}</span>
                    <p className="text-sm text-muted-foreground mt-0.5">{segment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
