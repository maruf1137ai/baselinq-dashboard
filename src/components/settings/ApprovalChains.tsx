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
    <div className="chains space-y-6">
      {data.map((workflow, workflowIndex) => (
        <div
          key={workflowIndex}
          className="border border-border_color p-6 rounded-[10px]">
          {/* Workflow Title */}
          <div className="title text-base text-[#1A1A1A] mb-4">
            {workflow.title}
          </div>

          {/* Items */}
          <div className="list flex flex-wrap items-center gap-4">
            {workflow.items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-4">
                {/* Step Item */}
                <div className="item border border-border_color rounded-[10px] bg-[#FAFAFA] py-5 px-4">
                  <div className="flex items-center gap-2">
                    <button>
                      <GripVertical className="h-4 w-4 text-[#6B7280]" />
                    </button>
                    <div className="title text-base text-[#1A1A1A]">
                      {item.title}
                    </div>
                  </div>
                  <span className="text-sm text-[#6B7280] mt-2">
                    {item.subTitle}
                  </span>
                </div>

                {/* Arrow — show ONLY if not last item */}
                {index !== workflow.items.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-[#6B7280]" />
                )}
              </div>
            ))}
          </div>

          {/* Button */}
          <Button className="bg-transparent text-[#6B7280] border border-border_color hover:border-primary transition-all mt-4 hover:bg-primary hover:text-white">
            <span className="mr-1">+</span>
            Add Step
          </Button>
        </div>
      ))}

      <Button className="bg-transparent text-[#6B7280] border border-dashed border-border_color hover:border-primary transition-all mt-6 hover:bg-primary hover:text-white w-full flex items-center justify-start">
        <span className="mr-1">+</span>
        Create New Approval Chain
      </Button>
    </div>
  );
}

export default ApprovalChains;
