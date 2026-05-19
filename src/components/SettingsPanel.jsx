import React, { useState, useEffect } from 'react'

const SETTINGS_KEY = 'upgrader_settings'

function loadSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    return saved ? JSON.parse(saved) : {
      claudeApiKey: '',
      theme: 'dark',
      autoScanOnUpload: true,
      showMockWarnings: true,
    }
  } catch (e) {
    return {
      claudeApiKey: '',
      theme: 'dark',
      autoScanOnUpload: true,
      showMockWarnings: true,
    }
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function getSettings() {
  return loadSettings()
}

function SettingsPanel({ isOpen, onClose }) {
  const [settings, setSettings] = useState(loadSettings)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleChange(field, value) {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 1000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <h2 className="font-semibold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">

          {/* Claude API Key */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              AI Configuration
            </p>
            <div className="space-y-2">
              <label className="text-sm text-slate-300 block">Claude API Key</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.claudeApiKey}
                  onChange={e => handleChange('claudeApiKey', e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-2.5 pr-12 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-sm outline-none focus:border-cyan-500 transition-all font-mono"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showApiKey
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>
                    }
                  </svg>
                </button>
              </div>
              {settings.claudeApiKey ? (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  API key configured — Claude AI migration enabled
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  API key required for AI-powered migration plan generation
                </p>
              )}
            </div>
          </div>

          {/* Scanner Preferences */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
              Scanner Preferences
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div>
                  <p className="text-sm text-slate-300">Auto-scan on upload</p>
                  <p className="text-xs text-slate-500">Automatically scan project when folder is uploaded</p>
                </div>
                <button
                  onClick={() => handleChange('autoScanOnUpload', !settings.autoScanOnUpload)}
                  className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${settings.autoScanOnUpload ? 'bg-cyan-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.autoScanOnUpload ? 'left-5' : 'left-0.5'}`}/>
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div>
                  <p className="text-sm text-slate-300">Show mock data warnings</p>
                  <p className="text-xs text-slate-500">Display notice when showing simulated results</p>
                </div>
                <button
                  onClick={() => handleChange('showMockWarnings', !settings.showMockWarnings)}
                  className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${settings.showMockWarnings ? 'bg-cyan-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.showMockWarnings ? 'left-5' : 'left-0.5'}`}/>
                </button>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-700/50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Application Upgrader</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
              <span>AI-Powered Spring Migration Assistant</span>
              <span>Cognizant</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white'
            }`}
          >
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default SettingsPanel