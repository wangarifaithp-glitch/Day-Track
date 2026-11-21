import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 sm:mb-6">
        <ArrowLeft size={16} />
        Back to overview
      </Link>
      <Card className="grid min-h-[260px] w-full place-items-center px-4 py-10 text-center sm:min-h-[320px] sm:p-8 lg:min-h-[420px]">
        <div className="w-full max-w-lg">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">DAYTRACK</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            This section is ready for implementation in a future phase.
          </p>
        </div>
      </Card>
    </div>
  )
}
