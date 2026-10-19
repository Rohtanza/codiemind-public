import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { validateEmail } from '../../utils/validation';

export function InviteDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const valid = validateEmail(email);
  return (
    <Modal onClose={onClose}>
      <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      <button disabled={!valid}>Send invite</button>
    </Modal>
  );
}
