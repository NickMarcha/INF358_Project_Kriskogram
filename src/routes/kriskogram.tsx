import { createFileRoute } from '@tanstack/react-router';
import KriskogramDemo from '../components/KriskogramDemo';

export const Route = createFileRoute('/kriskogram')({
  component: KriskogramDemo,
});
