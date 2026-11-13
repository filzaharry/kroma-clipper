/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WorkspaceViewId } from './design-system/tokens';
import { VideoSource, ClippingRuleConfig, ClipCandidate, RenderTask, ScheduledPost } from './types';
import {
  MOCK_VIDEOS,
  INITIAL_CLIPPING_RULES,
  MOCK_CLIPS,
  MOCK_RENDER_TASKS,
  MOCK_SCHEDULED_POSTS,
} from './data/mockData';
import { evaluateHighlightCandidates } from './utils/clippingRules';

// Layout & Views
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MediaLibraryView } from './components/upload/MediaLibraryView';
import { RulesConfigView } from './components/rules/RulesConfigView';
import { AnalysisView } from './components/analysis/AnalysisView';
import { CandidatesView } from './components/candidates/CandidatesView';
import { ClipEditorView } from './components/editor/ClipEditorView';
import { ExportQueueView } from './components/export/ExportQueueView';
import { SocialScheduleView } from './components/publish/SocialScheduleView';

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<WorkspaceViewId>('candidates');

  // Video and Rules State
  const [videos, setVideos] = useState<VideoSource[]>(MOCK_VIDEOS);
  const [activeVideo, setActiveVideo] = useState<VideoSource | null>(MOCK_VIDEOS[0]);
  const [rules, setRules] = useState<ClippingRuleConfig>(INITIAL_CLIPPING_RULES);

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(100);

  // Candidates & Editor State
  const [candidates, setCandidates] = useState<ClipCandidate[]>(MOCK_CLIPS);
  const [activeClip, setActiveClip] = useState<ClipCandidate | null>(MOCK_CLIPS[0]);

  // Render Queue & Publishing State
  const [renderTasks, setRenderTasks] = useState<RenderTask[]>(MOCK_RENDER_TASKS);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>(MOCK_SCHEDULED_POSTS);

  // Run Rule-Based Analysis Engine
  const handleRunAnalysis = () => {
    if (!activeVideo) return;
    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setCurrentView('analysis');

    let current = 10;
    const interval = setInterval(() => {
      current += 18;
      if (current >= 100) {
        clearInterval(interval);
        setAnalysisProgress(100);
        setIsAnalyzing(false);

        // Evaluate highlights using the pure rules utility
        const newCandidates = evaluateHighlightCandidates(activeVideo, rules);
        if (newCandidates.length > 0) {
          setCandidates(newCandidates);
          setActiveClip(newCandidates[0]);
        }
      } else {
        setAnalysisProgress(current);
      }
    }, 280);
  };

  // Open clip in dedicated NLE editor workspace
  const handleOpenEditor = (clip: ClipCandidate) => {
    setActiveClip(clip);
    setCurrentView('editor');
  };

  // Approve / Reject handlers
  const handleApproveClip = (clipId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, status: c.status === 'approved' ? 'candidate' : 'approved' } : c))
    );
  };

  const handleRejectClip = (clipId: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, status: c.status === 'rejected' ? 'candidate' : 'rejected' } : c))
    );
  };

  // Start Render Handler
  const handleStartRender = (config: Partial<RenderTask>) => {
    const newTask: RenderTask = {
      id: `render-${Date.now()}`,
      clipId: config.clipId || activeClip?.id || 'clip-unknown',
      clipTitle: config.clipTitle || activeClip?.title || 'Highlight Clip',
      aspectRatio: config.aspectRatio || activeClip?.aspectRatio || '9:16',
      resolution: config.resolution || '1080x1920',
      framerate: config.framerate || 60,
      bitrateMbps: config.bitrateMbps || 18,
      format: config.format || 'mp4',
      includeSubtitles: config.includeSubtitles || 'burned',
      progress: 0,
      status: 'rendering',
      fileSizeBytes: config.fileSizeBytes || 85000000,
      createdAt: new Date().toISOString(),
    };

    setRenderTasks((prev) => [newTask, ...prev]);
    setCurrentView('export');

    // Simulate encoding progress
    let renderPct = 0;
    const renderTimer = setInterval(() => {
      renderPct += 25;
      if (renderPct >= 100) {
        clearInterval(renderTimer);
        setRenderTasks((prev) =>
          prev.map((t) =>
            t.id === newTask.id
              ? { ...t, progress: 100, status: 'completed', completedAt: new Date().toISOString() }
              : t
          )
        );
      } else {
        setRenderTasks((prev) =>
          prev.map((t) => (t.id === newTask.id ? { ...t, progress: renderPct } : t))
        );
      }
    }, 400);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#111315] text-[#E7E9EC]">
      {/* Strict 3-zone Header */}
      <Header
        currentView={currentView}
        onSelectView={setCurrentView}
        activeVideo={activeVideo}
        candidatesCount={candidates.length}
        onRunAnalysis={handleRunAnalysis}
        isAnalyzing={isAnalyzing}
      />

      {/* Main Workspace: Docked Sidebar + Active Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* DaVinci / Linear Inspired Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          activeVideo={activeVideo}
          candidatesCount={candidates.length}
          renderQueueCount={renderTasks.filter((t) => t.status === 'completed').length}
        />

        {/* View Switching */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#111315] relative">
          {currentView === 'library' && (
            <MediaLibraryView
              videos={videos}
              activeVideo={activeVideo}
              onSelectVideo={setActiveVideo}
              onUploadNew={(newVid) => {
                setVideos((prev) => [newVid, ...prev]);
                setActiveVideo(newVid);
              }}
              onProceedToRules={() => setCurrentView('rules')}
            />
          )}

          {currentView === 'rules' && (
            <RulesConfigView
              rules={rules}
              onChangeRules={setRules}
              activeVideo={activeVideo}
              onRunAnalysis={handleRunAnalysis}
              isAnalyzing={isAnalyzing}
            />
          )}

          {currentView === 'analysis' && (
            <AnalysisView
              activeVideo={activeVideo}
              rules={rules}
              isAnalyzing={isAnalyzing}
              analysisProgress={analysisProgress}
              onReviewCandidates={() => setCurrentView('candidates')}
              detectedClipsCount={candidates.length}
            />
          )}

          {currentView === 'candidates' && (
            <CandidatesView
              candidates={candidates}
              onOpenEditor={handleOpenEditor}
              onApproveClip={handleApproveClip}
              onRejectClip={handleRejectClip}
              onQueueRender={(clip) => {
                setActiveClip(clip);
                handleStartRender({
                  clipId: clip.id,
                  clipTitle: clip.title,
                  aspectRatio: clip.aspectRatio,
                });
              }}
            />
          )}

          {currentView === 'editor' && activeClip && (
            <ClipEditorView
              clip={activeClip}
              onUpdateClip={(updated) => {
                setActiveClip(updated);
                setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
              }}
              onExportClip={(clip) => {
                handleStartRender({
                  clipId: clip.id,
                  clipTitle: clip.title,
                  aspectRatio: clip.aspectRatio,
                });
              }}
              onScheduleClip={(clip) => {
                setActiveClip(clip);
                setCurrentView('publish');
              }}
              onBackToCandidates={() => setCurrentView('candidates')}
            />
          )}

          {currentView === 'export' && (
            <ExportQueueView
              tasks={renderTasks}
              onStartRender={handleStartRender}
              activeClip={activeClip}
            />
          )}

          {currentView === 'publish' && (
            <SocialScheduleView
              scheduledPosts={scheduledPosts}
              candidates={candidates}
              onAddScheduledPost={(post) => setScheduledPosts((prev) => [post, ...prev])}
              onRemoveScheduledPost={(id) =>
                setScheduledPosts((prev) => prev.filter((p) => p.id !== id))
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
