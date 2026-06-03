import Editor from '@monaco-editor/react';
import { Code2 } from 'lucide-react';

interface EditorProps {
  value: string;
  onChange: (val: string | undefined) => void;
}

export const EditorSection = ({ value, onChange }: EditorProps) => (
  <div className="h-100 d-flex flex-column">
    <div className="bg-secondary bg-opacity-25 p-2 px-3 d-flex align-items-center gap-2 border-bottom border-secondary">
      <Code2 size={14} className="text-warning" />
      <small className="fw-bold text-uppercase">Input Naturale</small>
    </div>
    <Editor
      height="100%"
      defaultLanguage="plaintext"
      theme="vs-dark"
      value={value}
      onChange={onChange}
      options={{ fontSize: 16, minimap: { enabled: false }, padding: { top: 20 } }}
    />
  </div>
);
