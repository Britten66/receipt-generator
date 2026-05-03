import { Send, FileText, CheckCircle, Ban } from "lucide-react";

const ICONS = {
  draft:  FileText,
  sent:   Send,
  paid:   CheckCircle,
  voided: Ban,
};

export default function StatusBadge({ status, style }) {
  const Icon = ICONS[status] || FileText;
  return (
    <span className={`stamp ${status}`} style={style}>
      <Icon size={11} strokeWidth={2} />
      {status}
    </span>
  );
}
