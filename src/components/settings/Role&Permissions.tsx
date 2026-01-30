import { ChevronDown, Shield } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

const data = [
  {
    title: "Project Manager",
    items: [
      { id: 1, title: "Finance" },
      { id: 2, title: "Compliance" },
      { id: 3, title: "Tasks" },
      { id: 4, title: "Communication" },
      { id: 5, title: "Documents" },
      { id: 6, title: "Programme" },
    ],
  },

  {
    title: "Quantity Surveyor",
    items: [
      { id: 7, title: "Finance" },
      { id: 8, title: "Compliance" },
      { id: 9, title: "Tasks" },
      { id: 10, title: "Communication" },
      { id: 11, title: "Documents" },
      { id: 12, title: "Programme" },
    ],
  },

  {
    title: "Site Manager",
    items: [
      { id: 13, title: "Finance" },
      { id: 14, title: "Compliance" },
      { id: 15, title: "Tasks" },
      { id: 16, title: "Communication" },
      { id: 17, title: "Documents" },
      { id: 18, title: "Programme" },
    ],
  },
];

const RolePermissions = () => {
  const [openIndex, setOpenIndex] = useState(null);

  // build initial checked map from data
  const initialChecked = useMemo(() => {
    const map = {};
    data.forEach((role) => {
      role.items.forEach((item) => {
        map[item.id] = false;
      });
    });
    return map;
  }, []);

  const [checked, setChecked] = useState(() => {
    // Optionally load from localStorage:
    // const saved = localStorage.getItem("role_permissions_checked");
    // return saved ? JSON.parse(saved) : initialChecked;
    return initialChecked;
  });

  // Optional: persist changes to localStorage
  useEffect(() => {
    // localStorage.setItem("role_permissions_checked", JSON.stringify(checked));
  }, [checked]);

  const toggle = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const onToggleChecked = (itemId) => {
    setChecked((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <div className="role space-y-4">
      {data.map((role, index) => (
        <div
          key={role.title + index}
          className="item border border-border_color rounded-[10px] overflow-hidden">
          {/* Header */}
          <button
            onClick={() => toggle(index)}
            className="header py-4 px-6 flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="icon p-2.5 rounded-[10px] bg-[rgba(152,152,152,0.10)]">
                <Shield className="h-5 w-5 text-current" />
              </div>
              <span className="text-base text-[#1A1A1A]">{role.title}</span>
            </div>

            <ChevronDown
              className={`h-4 w-4 text-[#6B7280] transition-transform duration-200 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Content: still conditionally rendered, but state is preserved in React */}
          {openIndex === index && (
            <div className="content py-4 px-6 space-y-3 border-t border-border_color">
              {role.items.length === 0 ? (
                <p className="text-sm text-gray-500">No items found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {role.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center justify-between w-full p-3 rounded-[10px] border border-border_color bg-white cursor-pointer">
                      <span className="text-[#1A1A1A] text-sm">
                        {item.title}
                      </span>

                      <input
                        type="checkbox"
                        checked={!!checked[item.id]}
                        onChange={() => onToggleChecked(item.id)}
                        className="h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default RolePermissions;
