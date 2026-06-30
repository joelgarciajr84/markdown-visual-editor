import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

export interface SlashItem {
  title: string;
  description: string;
  icon: string;
  keywords: string[];
  command: (props: { editor: unknown; range: unknown }) => void;
}

interface SlashMenuProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

export interface SlashMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);

    useEffect(() => {
      setSelected(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }) {
        if (event.key === "ArrowUp") {
          setSelected((i) => (i - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelected((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          if (items[selected]) {
            command(items[selected]);
          }
          return true;
        }
        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="mve-slash-menu">
          <div className="mve-slash-empty">Nenhum resultado</div>
        </div>
      );
    }

    return (
      <div className="mve-slash-menu">
        <div className="mve-slash-header">Blocos</div>
        {items.map((item, i) => (
          <button
            key={item.title}
            className={`mve-slash-item${i === selected ? " mve-slash-item--active" : ""}`}
            onMouseDown={(e) => {
              e.preventDefault();
              command(item);
            }}
            onMouseEnter={() => setSelected(i)}
          >
            <span className="mve-slash-icon">{item.icon}</span>
            <span className="mve-slash-text">
              <strong className="mve-slash-title">{item.title}</strong>
              <span className="mve-slash-desc">{item.description}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }
);

SlashMenu.displayName = "SlashMenu";
