'use client';

import React, { useState, useEffect } from 'react';
import type { ICPProfile } from '@/types/icp';
import ICPList from './components/ICPList';
import ICPEditor from './components/ICPEditor';
import { Loader2 } from 'lucide-react';

export default function ICPManagementPage() {
  const [profiles, setProfiles] = useState<ICPProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'LIST' | 'EDIT' | 'CREATE'>('LIST');
  const [selectedProfile, setSelectedProfile] = useState<ICPProfile | null>(null);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/icp');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setProfiles(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch ICP profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreateNew = () => {
    const blankProfile: ICPProfile = {
      id: `icp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: 'New Ideal Customer Profile',
      description: 'Profile targeting qualified high-intent leads.',
      targetService: 'WEBSITE_REDESIGN',
      targetNiche: 'Local Services',
      isActive: true,
      scoringConfig: {
        mode: 'additive',
        maxScore: 100,
        highPriorityThreshold: 70,
        mediumPriorityThreshold: 40,
        minPassingScore: 0,
        zeroScoreOnDisqualification: false,
      },
      rules: [
        {
          id: `rule-${Date.now()}-1`,
          name: 'Must have at least 10 Google Reviews',
          type: 'HARD_FILTER',
          condition: {
            field: 'reviewCount',
            operator: 'greater_than_or_equal',
            value: 10,
          },
          explanation: 'Validates active local business revenue and customer traffic',
        },
        {
          id: `rule-${Date.now()}-2`,
          name: 'Poor or Outdated Website Performance (< 50)',
          type: 'SOFT_SIGNAL',
          condition: {
            field: 'websiteData.performanceScore',
            operator: 'less_than',
            value: 50,
          },
          weight: 25,
          explanation: 'Severe page speed issues indicate strong redesign pitch readiness',
        },
        {
          id: `rule-${Date.now()}-3`,
          name: 'Exclude Peer Marketing & Web Agencies',
          type: 'EXCLUSION',
          condition: {
            field: 'industry',
            operator: 'contains_any',
            value: 'marketing, agency, web design, software',
          },
          explanation: 'Disqualify industry peers and digital competitors',
        },
      ],
    };

    setSelectedProfile(blankProfile);
    setMode('CREATE');
  };

  const handleSelectProfile = (profile: ICPProfile) => {
    setSelectedProfile(profile);
    setMode('EDIT');
  };

  const handleSaveSuccess = (savedProfile: ICPProfile) => {
    setMode('LIST');
    setSelectedProfile(null);
    fetchProfiles();
  };

  const handleCancel = () => {
    setMode('LIST');
    setSelectedProfile(null);
  };

  return (
    <div className="p-6 md:p-8">
      {mode === 'LIST' && (
        <ICPList
          profiles={profiles}
          loading={loading}
          onSelectProfile={handleSelectProfile}
          onCreateNew={handleCreateNew}
          onRefresh={fetchProfiles}
        />
      )}

      {mode === 'CREATE' && selectedProfile && (
        <ICPEditor
          initialProfile={selectedProfile}
          isNew={true}
          onSave={handleSaveSuccess}
          onCancel={handleCancel}
        />
      )}

      {mode === 'EDIT' && selectedProfile && (
        <ICPEditor
          initialProfile={selectedProfile}
          isNew={false}
          onSave={handleSaveSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
