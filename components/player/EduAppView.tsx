'use client';

import React, { useState, useEffect } from 'react';
import { GlassPlayerIcon, GlassShieldIcon } from '../ui/PremiumIcons';
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
      const batchId = selectedBatch?._id || 'lakshya-jee-2027';
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
        'https://pearl.mscilearn.in/d1d34p8vz63oiq.cloudfront.net/lakshya-jee/lecture-01/master.m3u8';

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
        videoUrl: 'https://pearl.mscilearn.in/d1d34p8vz63oiq.cloudfront.net/lakshya-jee/lecture-01/master.m3u8',
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
      <div className="p-6 rounded-3xl liquid-glass border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl liquid-badge text-cyan-400">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              PW Student Portal & Video Player Interface
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              SHIELD PROTECTED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5 max-w-2xl font-medium">
            Educational student portal routing all lecture streams, batch schedules, and video tokens through the Gateway Enclave with automated Pearl CDN obfuscation.
          </p>
        </div>

        {/* Live Gateway Telemetry Pill */}
        {lastApiTelemetry && (
          <div className="p-3 rounded-2xl liquid-glass-subtle text-[11px] font-mono flex items-center gap-3">
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
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Enrolled Batches
            </h3>
            <span className="text-xs text-slate-400 font-mono px-2 py-0.5 rounded-lg liquid-glass-subtle">
              {filteredBatches.length} active
            </span>
          </div>

          <div className="relative text-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search batches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl liquid-glass-input text-slate-100 placeholder-slate-500 text-xs focus:outline-none"
            />
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
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
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'liquid-glass border-cyan-500/40 shadow-[0_8px_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                        : 'liquid-glass-subtle hover:border-white/20'
                    }`}
                  >
                    <div className="font-semibold text-xs text-white line-clamp-1">{batch.name}</div>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
                      <span className="font-mono">ID: {batch._id?.slice(0, 12)}...</span>
                      {batch.batchType && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-cyan-300 font-mono text-[10px] border border-white/10">
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
              <div className="p-5 rounded-3xl liquid-glass border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{selectedBatch.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                    <span>Batch ID: {selectedBatch._id}</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePlayVideo('sub_physics', 'sched_lec_1', 'Electrostatics - Master Lecture')}
                  className="px-4 py-2.5 rounded-2xl liquid-btn-primary text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Stream Lecture Video</span>
                </button>
              </div>

              {/* Today's Lectures & Subjects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Lecture Card 1 */}
                <div className="p-4.5 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-white/20 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 text-[10px] font-bold border border-cyan-500/25">
                      PHYSICS
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">10:00 AM</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      Electrostatics: Electric Charges & Fields (Part 1)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Coulomb&apos;s law, superposition principle, and vector problems.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handlePlayVideo('sub_phy_01', 'sch_01', 'Electrostatics: Electric Charges & Fields')
                    }
                    className="w-full py-2.5 rounded-xl liquid-btn-glass text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                    <span>Watch via Pearl CDN</span>
                  </button>
                </div>

                {/* Lecture Card 2 */}
                <div className="p-4.5 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-white/20 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-300 text-[10px] font-bold border border-indigo-500/25">
                      CHEMISTRY
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">12:30 PM</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      Chemical Kinetics: Rate of Reaction & Orders
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Differential rate equations and integrated rate laws.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handlePlayVideo('sub_chem_02', 'sch_02', 'Chemical Kinetics: Rate of Reaction')
                    }
                    className="w-full py-2.5 rounded-xl liquid-btn-glass text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                    <span>Watch via Pearl CDN</span>
                  </button>
                </div>

                {/* Lecture Card 3 */}
                <div className="p-4.5 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-white/20 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/25">
                      MATHEMATICS
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">03:00 PM</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      Calculus: Continuity & Differentiability
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Left and right hand limits, continuity at points.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handlePlayVideo('sub_math_03', 'sch_03', 'Calculus: Continuity & Differentiability')
                    }
                    className="w-full py-2.5 rounded-xl liquid-btn-glass text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                    <span>Watch via Pearl CDN</span>
                  </button>
                </div>

                {/* Lecture Card 4 - DPP & Notes */}
                <div className="p-4.5 rounded-2xl liquid-glass-subtle border border-white/10 hover:border-white/20 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/25">
                      DAILY PRACTICE (DPP)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">PDF + Stream</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      DPP Solution Discussion & Lecture Slides
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Step-by-step video solution for problem set #01.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handlePlayVideo('sub_dpp_01', 'sch_dpp', 'DPP 01 Solution Discussion')
                    }
                    className="w-full py-2.5 rounded-xl liquid-btn-glass text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-cyan-400 text-cyan-400" />
                    <span>Solution Stream</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl liquid-glass-subtle text-slate-400 text-xs">
              Select a batch on the left to inspect protected schedule and lecture video streams.
            </div>
          )}
        </div>
      </div>

      {/* Interactive Video Player Modal */}
      {videoModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="w-full max-w-2xl liquid-glass rounded-3xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.8)] border border-white/10 space-y-4">
            {/* Header */}
            <div className="px-5 py-4 liquid-glass-subtle border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white text-sm font-bold">
                <GlassPlayerIcon size={20} className="text-cyan-400" />
                <span>{videoModal.title}</span>
              </div>
              <button
                onClick={() => setVideoModal(null)}
                className="w-8 h-8 rounded-xl liquid-btn-glass text-slate-400 hover:text-white flex items-center justify-center text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Simulated Video Canvas / Player */}
            <div className="px-5">
              <div className="aspect-video w-full rounded-2xl bg-black/60 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                <div className="w-18 h-18 rounded-3xl liquid-btn-primary text-white flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform cursor-pointer">
                  <Play className="w-8 h-8 fill-white ml-1" />
                </div>
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-300 font-mono">
                  <span>04:12 / 48:30</span>
                  <span className="text-emerald-400 flex items-center gap-1.5 font-semibold px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Pearl Stream Active
                  </span>
                </div>
              </div>
            </div>

            {/* Resolved URL & Proxy Inspection Box */}
            <div className="px-5 pb-5 space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl liquid-glass-subtle border border-white/10 space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-bold tracking-wider">RESOLVED VIDEO STREAM URL</span>
                  {videoModal.proxyApplied && (
                    <span className="text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      PEARL PROXY APPLIED (ORIGIN SHIELDED)
                    </span>
                  )}
                </div>
                <div className="text-cyan-300 break-all text-[11px] select-all bg-black/30 p-2.5 rounded-xl border border-white/5">
                  {videoModal.videoUrl}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>CloudFront direct origin hidden behind Pearl security proxy.</span>
                </div>

                <button
                  onClick={() => setVideoModal(null)}
                  className="px-4 py-2 rounded-xl liquid-btn-glass text-slate-200 text-xs font-semibold cursor-pointer"
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
