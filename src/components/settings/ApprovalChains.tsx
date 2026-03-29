import { ArrowRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

const data = [
  {
    title: "Purchase Order Approval",
    items: [
      { id: 1, title: "Site Manager", subTitle: "Review" },
      { id: 2, title: "Quantity Surveyor", subTitle: "Cost Check" },
      { id: 3, title: "Project Manager", subTitle: "Final Approval" },
    ],
  },
  {
    title: "Variation Order Workflow",
    items: [
      { id: 4, title: "Engineer", subTitle: "Technical Review" },
      { id: 5, title: "Quantity Surveyor", subTitle: "Cost Impact" },
      { id: 6, title: "Project Manager", subTitle: "Client Approval" },
    ],
  },
];

function ApprovalChains() {
  return (
    <div className="space-y-4">
      {data.map((workflow, workflowIndex) => (
        <div
          key={workflowIndex}
          className="border border-border rounded-lg bg-white overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">{workflow.title}</span>
          </div>

          {/* Steps */}
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {workflow.items.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 border border-border rounded-lg bg-muted/50 px-3 py-2.5">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div>
                      <p className="text-sm text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.subTitle}</p>
                    </div>
                  </div>
                  {index !== workflow.items.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg border-border text-muted-foreground mt-4">
              + Add Step
            </Button>
          </div>
        </div>
      ))}

      <button className="w-full border border-dashed border-border rounded-lg p-4 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
        + Create New Approval Chain
      </button>
    </div>
  );
}

export default ApprovalChains;
