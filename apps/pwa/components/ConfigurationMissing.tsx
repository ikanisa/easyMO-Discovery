import React from 'react';
import { AlertTriangle, Settings, ExternalLink, RefreshCw } from 'lucide-react';

interface ConfigurationMissingProps {
    missingVars: string[];
}

/**
 * Full-screen error component shown when required environment variables are missing.
 * Provides clear instructions for fixing the configuration.
 */
const ConfigurationMissing: React.FC<ConfigurationMissingProps> = ({ missingVars }) => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="max-w-lg w-full">
                {/* Error Card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-10 h-10 text-amber-400" />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-white text-center mb-2">
                        Configuration Missing
                    </h1>
                    <p className="text-slate-400 text-center mb-6">
                        The app cannot start because required environment variables are not set.
                    </p>

                    {/* Missing Variables */}
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                        <h2 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Missing Variables
                        </h2>
                        <ul className="space-y-2">
                            {missingVars.map((varName) => (
                                <li key={varName} className="flex items-center gap-2 text-red-300 font-mono text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                    {varName}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-slate-300">
                            How to fix this:
                        </h2>

                        {/* Cloudflare Pages */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-blue-400 mb-2">
                                Cloudflare Pages
                            </h3>
                            <ol className="text-sm text-slate-400 space-y-1 list-decimal list-inside">
                                <li>Go to your Cloudflare Pages project</li>
                                <li>Navigate to <strong>Settings → Environment Variables</strong></li>
                                <li>Add the missing variables for Production</li>
                                <li>Trigger a new deployment</li>
                            </ol>
                        </div>

                        {/* Local Development */}
                        <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-slate-300 mb-2">
                                Local Development
                            </h3>
                            <p className="text-sm text-slate-400 mb-2">
                                Create a <code className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">.env</code> file in the app directory:
                            </p>
                            <pre className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto">
                                {missingVars.map(v => `${v}=your_value_here`).join('\n')}
                            </pre>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex gap-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Retry
                        </button>
                        <a
                            href="https://developers.cloudflare.com/pages/configuration/environment-variables/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Docs
                        </a>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-500 text-xs mt-6">
                    easyMO Discovery • Environment Configuration Error
                </p>
            </div>
        </div>
    );
};

export default ConfigurationMissing;
