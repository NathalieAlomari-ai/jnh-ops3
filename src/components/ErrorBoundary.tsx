import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null, showDetails: false }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    const { error, errorInfo, showDetails } = this.state

    if (!error) return this.props.children

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">

          <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 px-6 py-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-red-900">Something went wrong</h1>
                <p className="text-sm text-red-600 mt-0.5">The application encountered an unexpected error</p>
              </div>
            </div>

            {/* Error message */}
            <div className="px-6 py-5">
              <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                <p className="text-sm font-mono text-slate-800 break-words">
                  {error.message || 'An unknown error occurred'}
                </p>
              </div>

              {/* Stack trace toggle */}
              {errorInfo?.componentStack && (
                <div className="mt-4">
                  <button
                    onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    {showDetails ? 'Hide' : 'Show'} stack trace
                  </button>

                  {showDetails && (
                    <pre className="mt-2 bg-slate-900 text-slate-300 text-xs rounded-lg px-4 py-3 overflow-auto max-h-48 leading-relaxed">
                      {errorInfo.componentStack.trim()}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload page
              </button>
              <button
                onClick={() => this.setState({ error: null, errorInfo: null, showDetails: false })}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>

        </div>
      </div>
    )
  }
}
