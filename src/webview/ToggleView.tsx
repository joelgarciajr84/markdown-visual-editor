import React, { useLayoutEffect, useRef, useState } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";

interface ToggleViewProps {
  node: { attrs: Record<string, unknown> };
  updateAttributes: (attrs: Record<string, unknown>) => void;
}

export function ToggleView({ node, updateAttributes }: ToggleViewProps) {
  const [open, setOpen] = useState(true);
  const titleRef = useRef<HTMLSpanElement>(null);
  const editingRef = useRef(false);

  // Sync title from Tiptap attribute, but never overwrite while user is typing
  useLayoutEffect(() => {
    if (titleRef.current && !editingRef.current) {
      titleRef.current.textContent = (node.attrs.summary as string) || "Toggle";
    }
  }, [node.attrs.summary]);

  return (
    <NodeViewWrapper data-type="toggle">
      <div className={`mve-toggle${open ? " mve-toggle--open" : ""}`}>
        <div
          className="mve-toggle-header"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="mve-toggle-arrow">{open ? "▼" : "▶"}</span>
          <span
            ref={titleRef}
            contentEditable
            suppressContentEditableWarning
            className="mve-toggle-title"
            onFocus={() => {
              editingRef.current = true;
            }}
            onBlur={(e) => {
              editingRef.current = false;
              updateAttributes({
                summary: e.currentTarget.textContent || "Toggle",
              });
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLElement).blur();
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div
          className="mve-toggle-body"
          style={open ? undefined : { display: "none" }}
        >
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
