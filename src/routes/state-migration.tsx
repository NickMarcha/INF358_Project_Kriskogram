import { createFileRoute } from '@tanstack/react-router'
import { StateMigrationDemo } from '../components/StateMigrationDemo'

// State-to-State Migration Demo Route
export const Route = createFileRoute('/state-migration')({
  component: StateMigrationPage,
})

function StateMigrationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <StateMigrationDemo />
    </div>
  )
}

