import { Navbar as BsNavbar, Button, Badge, Stack } from 'react-bootstrap';
import { Cpu, Play, Save } from 'lucide-react';
export default function MioComponenteNavbar({ activeTab, setActiveTab, hasNewOutput, setHasNewOutput }) {

interface NavbarProps {
  onExecute: () => void;
}

export const Navbar = ({ onExecute }: NavbarProps) => (
  <BsNavbar bg="black" variant="dark" className="px-4 border-bottom border-secondary">
    <BsNavbar.Brand className="d-flex align-items-center gap-2">
      <Cpu size={28} className="text-warning" />
      <span className="fw-bold">RIGHI-IDE</span>
      <Badge bg="warning" text="dark">AI ENGINE</Badge>
    </BsNavbar.Brand>
    <Stack direction="horizontal" gap={2} className="ms-auto">
      <Button variant="outline-light" size="sm"><Save size={16} /> Salva</Button>
      <Button variant="warning" size="sm" className="fw-bold" onClick={onExecute}>
        <Play size={16} /> ESEGUI
      </Button>
    </Stack>
  </BsNavbar>
);
