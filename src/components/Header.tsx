import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="p-2 flex gap-2 bg-white text-black justify-between">
      <nav className="flex flex-row">
        <div className="px-2 font-bold">
          <Link to="/">Home</Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/state-migration">State Migration</Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/about">About</Link>
        </div>

        <div className="px-2 font-bold">
          <Link 
            to="/explorer" 
            search={{
              view: 'kriskogram' as const,
              year: undefined as number | undefined,
              minThreshold: 0,
              maxThreshold: 200000,
              maxEdges: 500,
              showAllNodes: false,
              egoNodeId: null,
              egoNeighborSteps: 1,
              egoStepColoring: false,
              edgeWeightScale: 'linear',
            }}
          >
            Explorer
          </Link>
        </div>

        <div className="px-2 font-bold">
          <Link to="/datasets">Datasets</Link>
        </div>
      </nav>
    </header>
  )
}
