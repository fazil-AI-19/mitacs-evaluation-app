import { useState } from 'react';
import type { CriterionConfig, ResearchReview } from '../../types';

interface Props {
  review: ResearchReview;
  criteria: CriterionConfig[];
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className={`h-3 w-6 rounded ${n <= score ? 'bg-mitacs-blue' : 'bg-gray-200'}`}
        />
      ))}
      <span className="text-xs text-gray-500">{score}/5</span>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        N/A
      </span>
    );
  }
  if (score <= 3) {
    return (
      <div className="flex items-center gap-2">
        <ScoreBar score={score} />
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          Needs Improvement
        </span>
      </div>
    );
  }
  return <ScoreBar score={score} />;
}

export default function ResearchReviewPanel({ review, criteria }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(criteria.map(c => c.key)));

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // If no criteria config provided, fall back to scanning review keys for _score fields
  const displayCriteria: CriterionConfig[] =
    criteria.length > 0
      ? criteria
      : Object.keys(review)
          .filter((k) => k.endsWith('_score') && k !== 'overall_scientific_score')
          .map((k) => ({
            key: k.replace(/_score$/, ''),
            label: k
              .replace(/_score$/, '')
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase()),
            enabled: true,
          }));

  return (
    <div>
      <h3 className="font-semibold text-gray-800 mb-3">Research Review</h3>

      {/* Overall score */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Overall Research Score</span>
          <span className="font-medium">
            {(review.overall_scientific_score as number).toFixed(0)}/100
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-mitacs-blue h-2 rounded-full transition-all"
            style={{ width: `${review.overall_scientific_score as number}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">Based on non-policy criteria only</p>
      </div>

      {/* Criteria scores */}
      <div className="space-y-2 mb-4">
        {displayCriteria.map((c) => {
          const score = (review[`${c.key}_score`] as number) ?? 0;
          const comment = (review.criteria_comments as Record<string, string>)?.[c.key];
          const isCollapsed = collapsed.has(c.key);
          const isNA = score === 0;
          const isPolicy = c.is_policy ?? false;

          return (
            <div
              key={c.key}
              className={`border rounded p-2 ${isPolicy ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100'}`}
            >
              <button className="w-full text-left" onClick={() => toggleCollapsed(c.key)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{c.label}</span>
                    {isPolicy && (
                      <span className="text-xs text-blue-500 font-normal">(policy)</span>
                    )}
                    {c.is_custom && (
                      <span className="text-xs text-blue-400 font-normal">(custom)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={score} />
                    {!isNA && (
                      <span className="text-xs text-gray-400">{isCollapsed ? '▼' : '▲'}</span>
                    )}
                  </div>
                </div>
              </button>
              {!isCollapsed && !isNA && comment && (
                <p className="mt-2 text-sm text-gray-600 leading-relaxed border-t pt-2">
                  {comment}
                </p>
              )}
              {isNA && comment && (
                <p className="mt-1 text-xs text-gray-400 italic">{comment}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-1">Summary</h4>
        <p className="text-sm text-gray-600 leading-relaxed">{review.summary as string}</p>
      </div>
    </div>
  );
}
