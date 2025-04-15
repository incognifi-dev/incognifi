import React from "react";

export function TitleBar() {
  return (
    <div className="flex items-center h-10 pt-2 bg-[#7c3aed] draggable">
      {/* Spacer for macOS traffic lights */}
      <div className="w-20" />

      {/* Empty space */}
      <div className="flex-1" />
    </div>
  );
}
