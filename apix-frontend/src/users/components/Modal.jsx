import { useEffect, useRef, useId } from "react";
import { X } from "lucide-react";
export default function Modal({ title, children, onClose }) {
  const ref = useRef();
  const titleId = useId();
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      className="uw-dialog"
      aria-labelledby={titleId}
      ref={ref}
      onCancel={onClose}
      onClose={onClose}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button onClick={onClose} aria-label="Close dialog">
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
