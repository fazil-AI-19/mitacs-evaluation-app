import { useEffect, useState } from 'react';
import Navbar from '../../components/layout/Navbar';
import { getConfig, saveConfig } from '../../api/config';
import type { EvaluationConfig, SectionConfig, CriterionConfig } from '../../types';

type Tab = 'preliminary' | 'research' | 'decision';

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function ToggleSwitch({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-mitacs-focus focus:ring-offset-2 ${
        enabled ? 'bg-mitacs-blue' : 'bg-gray-300'
      }`}
      aria-pressed={enabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function ConfirmModal({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Remove item</h3>
        <p className="text-sm text-gray-600 mb-6">
          Remove <span className="font-medium">"{label}"</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-2 text-gray-400 hover:text-red-600 transition-colors focus:outline-none"
      title="Delete"
    >
      ✕
    </button>
  );
}

export default function EvaluationConfigPage() {
  const [activeTab, setActiveTab] = useState<Tab>('preliminary');
  const [config, setConfig] = useState<EvaluationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ label: string; action: () => void } | null>(null);

  // Add-section form state
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState('');

  // Add-criterion form state
  const [showAddCriterion, setShowAddCriterion] = useState(false);
  const [newCriterionLabel, setNewCriterionLabel] = useState('');
  const [newCriterionDesc, setNewCriterionDesc] = useState('');

  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch(() => setError('Failed to load configuration.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;

    // Validate weights
    const { completeness, scientific } = config.decision.weights;
    const total = Math.round((completeness + scientific) * 100);
    if (total !== 100) {
      setError('Completeness weight and scientific weight must sum to 100%.');
      return;
    }

    // Validate thresholds
    const { accept, revise_and_resubmit } = config.decision.thresholds;
    if (revise_and_resubmit >= accept) {
      setError('The "Accept" threshold must be greater than the "Revise & Resubmit" threshold.');
      return;
    }
    if (accept > 100 || accept < 0 || revise_and_resubmit < 0 || revise_and_resubmit > 100) {
      setError('Thresholds must be between 0 and 100.');
      return;
    }

    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      const updated = await saveConfig(config);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (idx: number, patch: Partial<SectionConfig>) => {
    if (!config) return;
    const sections = config.preliminary.required_sections.map((s, i) =>
      i === idx ? { ...s, ...patch } : s
    );
    setConfig({ ...config, preliminary: { ...config.preliminary, required_sections: sections } });
  };

  const deleteSection = (idx: number) => {
    if (!config) return;
    const sections = config.preliminary.required_sections.filter((_, i) => i !== idx);
    setConfig({ ...config, preliminary: { ...config.preliminary, required_sections: sections } });
  };

  const addSection = () => {
    if (!config || !newSectionLabel.trim()) return;
    const key = slugify(newSectionLabel);
    if (!key) return;
    const newSection: SectionConfig = { key, label: newSectionLabel.trim(), enabled: true, is_custom: true };
    setConfig({
      ...config,
      preliminary: {
        ...config.preliminary,
        required_sections: [...config.preliminary.required_sections, newSection],
      },
    });
    setNewSectionLabel('');
    setShowAddSection(false);
  };

  const updateCriterion = (idx: number, patch: Partial<CriterionConfig>) => {
    if (!config) return;
    const criteria = config.research_review.criteria.map((c, i) =>
      i === idx ? { ...c, ...patch } : c
    );
    setConfig({ ...config, research_review: { ...config.research_review, criteria } });
  };

  const deleteCriterion = (idx: number) => {
    if (!config) return;
    const criteria = config.research_review.criteria.filter((_, i) => i !== idx);
    setConfig({ ...config, research_review: { ...config.research_review, criteria } });
  };

  const addCriterion = () => {
    if (!config || !newCriterionLabel.trim()) return;
    const key = slugify(newCriterionLabel);
    if (!key) return;
    const newCriterion: CriterionConfig = {
      key,
      label: newCriterionLabel.trim(),
      enabled: true,
      is_policy: false,
      is_custom: true,
      description: newCriterionDesc.trim(),
    };
    setConfig({
      ...config,
      research_review: {
        ...config.research_review,
        criteria: [...config.research_review.criteria, newCriterion],
      },
    });
    setNewCriterionLabel('');
    setNewCriterionDesc('');
    setShowAddCriterion(false);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'preliminary', label: 'Preliminary Review' },
    { id: 'research', label: 'Research Review' },
    { id: 'decision', label: 'Decision' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Evaluation Configuration</h1>
        <p className="text-sm text-gray-500 mb-6">
          Adjust which sections and criteria the AI pipeline checks, update agent instructions, and
          configure how the final score is calculated. Changes take effect on the next proposal
          evaluation.
        </p>

        {loading && (
          <div className="text-center py-12 text-gray-500">Loading configuration…</div>
        )}

        {!loading && config && (
          <>
            {/* Tab bar */}
            <div className="flex border-b border-gray-200 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-mitacs-blue text-mitacs-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'preliminary' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">Required Sections</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Toggle which sections must be present for a proposal to pass the completeness
                    check. Add custom sections or delete sections you don't need.
                  </p>
                  <ul className="divide-y divide-gray-100">
                    {config.preliminary.required_sections.map((section, idx) => (
                      <li key={section.key} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{section.label}</span>
                          {section.is_custom && (
                            <span className="text-xs text-blue-500 font-normal">(custom)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <ToggleSwitch
                            enabled={section.enabled}
                            onChange={(v) => updateSection(idx, { enabled: v })}
                          />
                          <DeleteButton onClick={() => setDeleteConfirm({ label: section.label, action: () => deleteSection(idx) })} />
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Add section form */}
                  {showAddSection ? (
                    <div className="mt-4 border border-gray-200 rounded-md p-4 space-y-3">
                      <input
                        type="text"
                        placeholder="Section label (e.g. Risk Assessment)"
                        value={newSectionLabel}
                        onChange={(e) => setNewSectionLabel(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addSection}
                          disabled={!newSectionLabel.trim()}
                          className="bg-mitacs-blue hover:bg-mitacs-navy disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowAddSection(false); setNewSectionLabel(''); }}
                          className="text-gray-500 hover:text-gray-700 px-4 py-1.5 rounded text-sm border border-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddSection(true)}
                      className="mt-4 text-sm text-mitacs-blue hover:text-mitacs-navy font-medium"
                    >
                      + Add Section
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">
                    Additional Agent Instructions
                  </h2>
                  <p className="text-sm text-gray-500 mb-3">
                    Extra instructions appended to the Preliminary Review agent's task prompt.
                    Leave blank to use the default prompt.
                  </p>
                  <textarea
                    rows={4}
                    value={config.preliminary.prompt_additions}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        preliminary: { ...config.preliminary, prompt_additions: e.target.value },
                      })
                    }
                    placeholder="e.g. Pay particular attention to budget justification details…"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus resize-y"
                  />
                </div>
              </div>
            )}

            {activeTab === 'research' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">
                    Evaluation Criteria
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Toggle which criteria are assessed. Disabled criteria receive a score of 0 and
                    are excluded from the scientific merit average. Add custom criteria or delete
                    criteria you don't need.
                  </p>
                  <ul className="divide-y divide-gray-100">
                    {config.research_review.criteria.map((criterion, idx) => (
                      <li key={criterion.key} className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-gray-700">{criterion.label}</span>
                            {criterion.is_policy && (
                              <span className="ml-2 text-xs text-gray-400">(0 = N/A, excluded from score)</span>
                            )}
                            {criterion.is_custom && (
                              <span className="ml-2 text-xs text-blue-500">(custom)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <ToggleSwitch
                              enabled={criterion.enabled}
                              onChange={(v) => updateCriterion(idx, { enabled: v })}
                            />
                            <DeleteButton onClick={() => setDeleteConfirm({ label: criterion.label, action: () => deleteCriterion(idx) })} />
                          </div>
                        </div>
                        {/* Show description textarea for custom criteria */}
                        {criterion.is_custom && (
                          <textarea
                            rows={2}
                            value={criterion.description ?? ''}
                            onChange={(e) => updateCriterion(idx, { description: e.target.value })}
                            placeholder="Scoring rubric — describe how to score this criterion (1-5)…"
                            className="mt-2 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus resize-y text-gray-600"
                          />
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Add criterion form */}
                  {showAddCriterion ? (
                    <div className="mt-4 border border-gray-200 rounded-md p-4 space-y-3">
                      <input
                        type="text"
                        placeholder="Criterion label (e.g. Budget Clarity)"
                        value={newCriterionLabel}
                        onChange={(e) => setNewCriterionLabel(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
                      />
                      <textarea
                        rows={3}
                        placeholder="Scoring rubric — describe how the AI should score this criterion (1-5). E.g. 'Score based on clarity and detail of the budget breakdown…'"
                        value={newCriterionDesc}
                        onChange={(e) => setNewCriterionDesc(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus resize-y"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addCriterion}
                          disabled={!newCriterionLabel.trim()}
                          className="bg-mitacs-blue hover:bg-mitacs-navy disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddCriterion(false);
                            setNewCriterionLabel('');
                            setNewCriterionDesc('');
                          }}
                          className="text-gray-500 hover:text-gray-700 px-4 py-1.5 rounded text-sm border border-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddCriterion(true)}
                      className="mt-4 text-sm text-mitacs-blue hover:text-mitacs-navy font-medium"
                    >
                      + Add Criterion
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">
                    Additional Agent Instructions
                  </h2>
                  <p className="text-sm text-gray-500 mb-3">
                    Extra instructions appended to the Research Review agent's task prompt.
                  </p>
                  <textarea
                    rows={4}
                    value={config.research_review.prompt_additions}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        research_review: {
                          ...config.research_review,
                          prompt_additions: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. Focus particularly on novelty and knowledge contribution…"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus resize-y"
                  />
                </div>
              </div>
            )}

            {activeTab === 'decision' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">Score Weights</h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Weights used to compute the final score. Completeness + Scientific must equal
                    100%.
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Completeness Weight (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(config.decision.weights.completeness * 100)}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, Number(e.target.value)));
                          setConfig({
                            ...config,
                            decision: {
                              ...config.decision,
                              weights: {
                                completeness: val / 100,
                                scientific: (100 - val) / 100,
                              },
                            },
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Scientific Merit Weight (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={Math.round(config.decision.weights.scientific * 100)}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(100, Number(e.target.value)));
                          setConfig({
                            ...config,
                            decision: {
                              ...config.decision,
                              weights: {
                                scientific: val / 100,
                                completeness: (100 - val) / 100,
                              },
                            },
                          });
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Current total:{' '}
                    {Math.round(
                      (config.decision.weights.completeness +
                        config.decision.weights.scientific) *
                        100
                    )}
                    %{' '}
                    {Math.round(
                      (config.decision.weights.completeness +
                        config.decision.weights.scientific) *
                        100
                    ) !== 100 && (
                      <span className="text-red-600 font-medium">— must equal 100%</span>
                    )}
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-1">
                    Decision Thresholds
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Final score thresholds for each recommendation. Accept threshold must be greater
                    than Revise &amp; Resubmit threshold.
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Accept (score ≥)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={config.decision.thresholds.accept}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            decision: {
                              ...config.decision,
                              thresholds: {
                                ...config.decision.thresholds,
                                accept: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Revise &amp; Resubmit (score ≥)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={config.decision.thresholds.revise_and_resubmit}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            decision: {
                              ...config.decision,
                              thresholds: {
                                ...config.decision.thresholds,
                                revise_and_resubmit: Number(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
                      />
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-400 space-y-0.5">
                    <p>Score &ge; {config.decision.thresholds.accept} → Accept</p>
                    <p>
                      Score &ge; {config.decision.thresholds.revise_and_resubmit} and &lt;{' '}
                      {config.decision.thresholds.accept} → Revise &amp; Resubmit
                    </p>
                    <p>Score &lt; {config.decision.thresholds.revise_and_resubmit} → Reject</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error / success banner */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            {saved && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                Configuration saved successfully.
              </div>
            )}

            {/* Save button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-mitacs-blue hover:bg-mitacs-navy disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Saving…' : 'Save Configuration'}
              </button>
            </div>
          </>
        )}
      </div>

      {deleteConfirm && (
        <ConfirmModal
          label={deleteConfirm.label}
          onConfirm={() => {
            deleteConfirm.action();
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
