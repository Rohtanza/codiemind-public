import React from 'react';
import { Card } from './Card';
import './ProfileCard.css';

export function ProfileCard({ name }: { name: string }) {
  return <Card title={name} />;
}
