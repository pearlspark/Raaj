'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Play,
  BookOpen,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Tv,
  ExternalLink,
  ShieldCheck,
  Video,
  FileText,
  Clock,
} from 'lucide-react';

interface Batch {
  _id: string;
  name: string;
  batchType?: string;
  previewImage?: {
    baseUrl?: string;
    key?: string;
  };
  subjects?: Array<{
    _id: string;
    name: string;
  }>;
}

function getTimestamp(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return 0;
}

function calculateLatency(start: number): number {
  const current = getTimestamp();
  return Math.round(current - start);
}

export const EduAppView: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    title: string;
    videoUrl: string;
    proxyApplied: boolean;
  } | null>(null);
  const [lastApiTelemetry, setLastApiTelemetry] = useState<{
    endpoint: string;
    status: number;
    latency: number;
    requestId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setIsLoading(true);
      const start = getTimestamp();
      try {
        const res = await fetch('/api/batches');
        const data = await res.json();
        const latency = calculateLatency(start);
        const reqId = res.headers.get('x-request-id') || 'req_' + Math.random().toString(36).slice(2, 8);

        if (!ignore) {
          setLastApiTelemetry({
            endpoint: '/api/batches',
            status: res.status,
            latency,
            requestId: reqId,
          });

          if (Array.isArray(data)) {
            setBatches(data);
            if (data.length > 0) {
              setSelectedBatch(data[0]);
            }
          } else if (data && data.data) {
            setBatches(data.data);
            if (data.data.length > 0) {
              setSelectedBatch(data.data[0]);
            }
          }
        }
      } catch (e) {
        // fallback
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, []);

  // Fetch schedule / details when batch is selected
  const handleSelectBatch = async (batch: Batch) => {
    setSelectedBatch(batch);
    const start = getTimestamp();
    try {
      const res = await fetch(`/api/todays-schedule?batchId=${batch._id}`);
      const data = await res.json();
      const latency = calculateLatency(start);
      setScheduleData(data?.data || null);

      setLastApiTelemetry({
        endpoint: `/api/todays-schedule?batchId=${batch._id}`,
        status: res.status,
        latency,
        requestId: res.headers.get('x-request-id') || 'req_sched',
      });
    } catch (e) {
      // ignore
    }
  };

  // Play video with Pearl proxy simulation
  const handlePlayVideo = async (subjectId: string, scheduleId: string, title: string) => {
    const start = getTimestamp();
    try {
      const batchId = selectedBatch?._id || 'demo_batch';
      const res = await fetch(`/api/video-url?batchId=${batchId}&subjectId=${subjectId}&scheduleId=${scheduleId}`);
      const data = await res.json();
      const latency = calculateLatency(start);

      setLastApiTelemetry({
        endpoint: `/api/video-url?batchId=${batchId}`,
        status: res.status,
        latency,
        requestId: res.headers.get('x-request-id') || 'req_vid',
      });

      const videoUrl =
        data?.video_url ||
        'https://pearl.mscilearn.in/d1d34p8vz63oiq.cloudfront.net/demo-lecture/master.m3u8';

      setVideoModal({
        isOpen: true,
        title: title || 'Physics - Electrostatics Lecture 01',
        videoUrl,
        proxyApplied: videoUrl.includes('pearl.mscilearn.in'),
      });
    } catch (e) {
      setVideoModal({
        isOpen: true,
        title: title || 'Lecture Stream',
        videoUrl: 'https://pearl.mscilearn.in/d1d34p8vz63oiq.cloudfront.net/demo-lecture/master.m3u8',
        proxyApplied: true,
      });
    }
  };

  const filteredBatches = batches.filter((b) =>
    b.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              PW Student App & Video Player Interface
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              PROTECTED BY SHIELD
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            This student-facing educational portal routes all media, batch schedules, and video links through the API Gateway, enforcing domain policies and Pearl CDN security.
          </p>
        </div>

        {/* Live Gateway Telemetry Pill */}
        {lastApiTelemetry && (
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>HTTP {lastApiTelemetry.status}</span>
            </div>
            <div className="text-slate-400">
              Latency: <span className="text-white font-semibold">{lastApiTelemetry.latency}ms</span>
            </div>
            <div className="text-slate-500 hidden sm:inline">
              ReqID: {lastApiTelemetry.requestId.slice(0, 10)}...
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Batches & Active Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Batch Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-400" />
              Enrolled Batches
            </h3>
            <span className="text-xs text-slate-500 font-mono">{filteredBatches.length} batches</span>
          </div>

          <div className="relative text-xs">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search batches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading batches from gateway...</div>
            ) : filteredBatches.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">No batches found</div>
            ) : (
              filteredBatches.map((batch) => {
                const isSelected = selectedBatch?._id === batch._id;

                return (
                  <div
                    key={batch._id}
                    onClick={() => handleSelectBatch(batch)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/40 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white line-clamp-1">{batch.name}</div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                      <span>ID: {batch._id?.slice(0, 10)}...</span>
                      {batch.batchType && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {batch.batchType}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Batch Details, Schedule & Lecture Player */}
        <div className="md:col-span-2 space-y-4">
          {selectedBatch ? (
            <div className="space-y-4">
              {/* Batch Banner */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedBatch.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                    <span>Batch ID: {selectedBatch._id}</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePlayVideo('sub_physics', 'sched_lec_1', 'Electrostatics - Master Lecture')}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Stream Lecture Video</span>
                </button>
              </div>

              {/* Today's Lectures & Subjects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Lecture Card 1 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold">
                      PHYSICS
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">10:00 AM</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Electrostatics: Electric Charges & Fields (Part 1)
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Coulomb&apos;s law, superposition principle, and vector problems.
                  </p>
                  <button
                    onClick={() =>
                      handlePlayVideo('sub_phy_01', 'sch_01', 'Electrostatics: Electric Charges & Fields')
                    }
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Watch with Pearl CDN</span>
                  </button>
                </div>

                {/* Lecture Card 2 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                      CHEMISTRY
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">12:30 PM</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Chemical Kinetics: Rate of Reaction & Orders
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Differential rate equations and integrated rate laws.
                  </p>
                  <button
                    onClick={() =>
                      handlePlayVideo('sub_chem_02', 'sch_02', 'Chemical Kinetics: Rate of Reaction')
                    }
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Watch with Pearl CDN</span>
                  </button>
                </div>

                {/* Lecture Card 3 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      MATHEMATICS
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">03:00 PM</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Calculus: Continuity & Differentiability
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Left and right hand limits, continuity at points.
                  </p>
                  <button
                    onClick={() =>
                      handlePlayVideo('sub_math_03', 'sch_03', 'Calculus: Continuity & Differentiability')
                    }
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Watch with Pearl CDN</span>
                  </button>
                </div>

                {/* Lecture Card 4 - DPP & Notes */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                      DAILY PRACTICE (DPP)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">PDF + Video</span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    DPP Solution Discussion & Lecture Slides
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Step-by-step video solution for problem set #01.
                  </p>
                  <button
                    onClick={() =>
                      handlePlayVideo('sub_dpp_01', 'sch_dpp', 'DPP 01 Solution Discussion')
                    }
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Solution Stream</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/40 text-slate-500 text-xs">
              Select a batch on the left to inspect protected schedule and lecture video streams.
            </div>
          )}
        </div>
      </div>

      {/* Interactive Video Player Modal */}
      {videoModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-4">
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white text-sm font-bold">
                <Video className="w-4 h-4 text-sky-400" />
                <span>{videoModal.title}</span>
              </div>
              <button
                onClick={() => setVideoModal(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            {/* Simulated Video Canvas / Player */}
            <div className="px-4">
              <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="w-16 h-16 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 group-hover:scale-105 transition-transform cursor-pointer">
                  <Play className="w-7 h-7 fill-white ml-1" />
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-mono">
                  <span>04:12 / 48:30</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Pearl Stream Active
                  </span>
                </div>
              </div>
            </div>

            {/* Resolved URL & Proxy Inspection Box */}
            <div className="px-4 pb-4 space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>RESOLVED VIDEO STREAM URL</span>
                  {videoModal.proxyApplied && (
                    <span className="text-emerald-400 font-bold">
                      PEARL PROXY APPLIED (ORIGIN SHIELDED)
                    </span>
                  )}
                </div>
                <div className="text-sky-300 break-all text-[11px] select-all">
                  {videoModal.videoUrl}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>CloudFront direct origin hidden behind Pearl security proxy.</span>
                </div>

                <button
                  onClick={() => setVideoModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                >
                  Close Player
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
