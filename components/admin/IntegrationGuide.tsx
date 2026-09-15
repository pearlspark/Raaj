'use client';

import React, { useState } from 'react';
import {
  GlassShieldIcon,
  CrystalKeyIcon,
  LiquidGlobeIcon,
  PulseRadarIcon,
  QuantumCpuIcon,
} from '../ui/PremiumIcons';
import {
  BookOpen,
  Copy,
  Check,
  Terminal,
  Code,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';

interface ApiEndpointDef {
  id: string;
  name: string;
  category: 'Core Batches' | 'Lectures & Videos' | 'Resources & Tests' | 'Auth & Health';
  method: 'GET' | 'POST';
  path: string;
  description: string;
  rateLimit: number;
  params: { name: string; type: string; required: boolean; description: string; example: string }[];
  sampleResponse: Record<string, any>;
}

const API_ENDPOINTS: ApiEndpointDef[] = [
  {
    id: 'batches',
    name: 'Get All Active Batches',
    category: 'Core Batches',
    method: 'GET',
    path: '/api/batches',
    description: 'Returns the roster of all enrolled and accessible educational batches, including Lakshya JEE 2027.',
    rateLimit: 120,
    params: [],
    sampleResponse: {
      success: true,
      data: [
        {
          _id: '634bd315ed7a360018558283',
          name: 'Lakshya JEE 2027 - Physics, Chemistry & Mathematics',
          class: '12th',
          exam: 'JEE Advanced',
          status: 'ACTIVE',
          subjects: [
            { _id: 'subj_phys_001', subject: 'Physics' },
            { _id: 'subj_math_002', subject: 'Mathematics' },
            { _id: 'subj_chem_003', subject: 'Chemistry' },
          ],
        },
      ],
    },
  },
  {
    id: 'batch-details',
    name: 'Get Batch Syllabus & Details',
    category: 'Core Batches',
    method: 'GET',
    path: '/api/batch-details',
    description: 'Fetches detailed batch syllabus, subjects, teachers, and enrolled lecture modules.',
    rateLimit: 120,
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: 'Unique identifier of the batch',
        example: '634bd315ed7a360018558283',
      },
    ],
    sampleResponse: {
      success: true,
      data: {
        _id: '634bd315ed7a360018558283',
        name: 'Lakshya JEE 2027 - Physics, Chemistry & Mathematics',
        description: 'Complete syllabus coverage for JEE Advanced 2027 with daily live lectures and DPPs.',
        subjects: [
          { _id: 'sub_physics', subject: 'Physics', totalLectures: 140 },
          { _id: 'sub_chem', subject: 'Chemistry', totalLectures: 150 },
        ],
      },
    },
  },
  {
    id: 'todays-schedule',
    name: "Get Today's Class Schedule",
    category: 'Lectures & Videos',
    method: 'GET',
    path: '/api/todays-schedule',
    description: 'Retrieves all live classes and recorded lectures scheduled for the current calendar date.',
    rateLimit: 120,
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: 'Target batch identifier',
        example: '634bd315ed7a360018558283',
      },
    ],
    sampleResponse: {
      success: true,
      data: [
        {
          scheduleId: 'sched_lec_1',
          subjectId: 'sub_physics',
          topic: 'Electrostatics: Electric Charges, Field Lines & Flux',
          startTime: '10:00 AM',
          endTime: '11:45 AM',
          status: 'COMPLETED',
          videoAvailable: true,
        },
      ],
    },
  },
  {
    id: 'topics',
    name: 'Get Subject Chapters & Topics',
    category: 'Core Batches',
    method: 'GET',
    path: '/api/topics',
    description: 'Lists all curriculum units, chapters, and topics inside a subject module.',
    rateLimit: 120,
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: 'Target batch identifier',
        example: '634bd315ed7a360018558283',
      },
      {
        name: 'subjectId',
        type: 'string',
        required: true,
        description: 'Subject ID to retrieve chapters for',
        example: 'sub_physics',
      },
    ],
    sampleResponse: {
      success: true,
      data: [
        { _id: 'top_01', name: 'Electrostatics & Gauss Law', totalLectures: 12 },
        { _id: 'top_02', name: 'Current Electricity', totalLectures: 10 },
      ],
    },
  },
  {
    id: 'contents',
    name: 'Get Topic Lecture Contents',
    category: 'Lectures & Videos',
    method: 'GET',
    path: '/api/contents',
    description: 'Retrieves lectures, exercise sheets, and attachments linked to a particular topic.',
    rateLimit: 120,
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: 'Batch identifier',
        example: '634bd315ed7a360018558283',
      },
      {
        name: 'subjectId',
        type: 'string',
        required: true,
        description: 'Subject identifier',
        example: 'sub_physics',
      },
      {
        name: 'topicId',
        type: 'string',
        required: false,
        description: 'Topic/Chapter identifier',
        example: 'top_01',
      },
    ],
    sampleResponse: {
      success: true,
      data: [
        {
          _id: 'doc_01',
          title: 'Class Notes & Lecture Formula Sheet (PDF)',
          type: 'DOCUMENT',
          url: 'https://pearl.mscilearn.in/d1d34p8vz63oiq.cloudfront.net/notes/lecture_notes_01.pdf',
        },
      ],
    },
  },
  {
    id: 'video-url',
    name: 'Get Stream Video URL (HLS / m3u8)',
    category: 'Lectures & Videos',
    method: 'GET',
    path: '/api/video-url',
    description: 'Fetches cryptographic CDN playback URLs (HLS .m3u8) with automatic Pearl Proxy fallback for Lakshya JEE 2027.',
    rateLimit: 20,
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: 'Batch identifier',
        example: '634bd315ed7a360018558283',
      },
      {
        name: 'subjectId',
        type: 'string',
        required: true,
        description: 'Subject or Video identifier',
        example: 'sub_physics',
      },
      {
        name: 'scheduleId',
        type: 'string',
        required: true,
        description: 'Lecture schedule / Child identifier',
        example: 'sched_lec_1',
      },
    ],
    sampleResponse: {
      success: true,
      video_url: 'https://pearl.mscilearn.in/d1d34p8vz63oiq.cloudfront.net/master-stream/634bd315ed7a360018558283/sched_lec_1/master.m3u8',
      topic_name: 'Electrostatics & Continuous Charge Distributions - Master Lecture',
      proxy_applied: true,
      cdn_provider: 'CloudFront via Pearl Gateway Proxy',
      quality_options: [
        { label: '1080p HD', url: 'https://pearl.mscilearn.in/...' },
        { label: '720p', url: 'https://pearl.mscilearn.in/...' },
      ],
    },
  },
  {
    id: 'live-url',
    name: 'Get Live Class Stream URL',
    category: 'Lectures & Videos',
    method: 'GET',
    path: '/api/live-url',
    description: 'Fetches active live broadcast streaming feed for scheduled ongoing classes.',
    rateLimit: 30,
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: 'Batch identifier',
        example: '634bd315ed7a360018558283',
      },
      {
        name: 'subjectId',
        type: 'string',
        required: true,
        description: 'Subject identifier',
        example: 'sub_physics',
      },
      {
        name: 'scheduleId',
        type: 'string',
        required: true,
        description: 'Schedule identifier',
        example: 'sched_lec_1',
      },
    ],
    sampleResponse: {
      success: true,
      live_url: 'https://pearl.mscilearn.in/d1d34p8vz63oiq.cloudfront.net/live-stream/634bd315ed7a360018558283/sched_lec_1/live.m3u8',
      is_live: true,
    },
  },
  {
    id: 'lecture-details',
    name: 'Get Individual Lecture Metadata',
    category: 'Lectures & Videos',
    method: 'GET',
    path: '/api/lecture-details',
    description: 'Returns comprehensive metadata, duration, chapter mapping, and resources for a lecture.',
    rateLimit: 60,
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: 'Batch identifier',
        example: '634bd315ed7a360018558283',
      },
      {
        name: 'scheduleId',
        type: 'string',
        required: true,
        description: 'Lecture schedule identifier',
        example: 'sched_lec_1',
      },
    ],
    sampleResponse: {
      success: true,
      lecture: {
        id: 'sched_lec_1',
        title: 'Electrostatics & Continuous Charge Distributions',
        durationSeconds: 6180,
        faculty: 'Senior Faculty',
      },
    },
  },
  {
    id: 'slides',
    name: 'Get Lecture Slides & PDF Notes',
    category: 'Resources & Tests',
    method: 'GET',
    path: '/api/slides',
    description: 'Fetches presentation slide decks, formula sheets, and class annotations in PDF format.',
    rateLimit: 60,
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: 'Batch identifier',
        example: '634bd315ed7a360018558283',
      },
      {
        name: 'scheduleId',
        type: 'string',
        required: true,
        description: 'Lecture schedule identifier',
        example: 'sched_lec_1',
      },
    ],
    sampleResponse: {
      success: true,
      slidesUrl: 'https://pearl.mscilearn.in/d1d34p8vz63oiq.cloudfront.net/notes/lecture_notes_01.pdf',
    },
  },
  {
    id: 'test-solution-video',
    name: 'Get Test Question Video Solution',
    category: 'Resources & Tests',
    method: 'GET',
    path: '/api/test-solution-video',
    description: 'Returns video breakdown and step-by-step video solution for test series problems.',
    rateLimit: 40,
    params: [
      {
        name: 'testId',
        type: 'string',
        required: true,
        description: 'Test series identifier',
        example: 'test_jee_adv_01',
      },
      {
        name: 'questionId',
        type: 'string',
        required: true,
        description: 'Question identifier',
        example: 'q_phy_08',
      },
    ],
    sampleResponse: {
      success: true,
      video_url: 'https://pearl.mscilearn.in/d1d34p8vz63oiq.cloudfront.net/solutions/test_jee_adv_01/q_phy_08.m3u8',
    },
  },
  {
    id: 'khazana',
    name: 'Access Khazana Library Archive',
    category: 'Resources & Tests',
    method: 'GET',
    path: '/api/khazana',
    description: 'Accesses historical archive of legendary faculty recordings and alternate teacher lectures.',
    rateLimit: 60,
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: 'Batch identifier',
        example: '634bd315ed7a360018558283',
      },
    ],
    sampleResponse: {
      success: true,
      faculties: [
        { name: 'Physics Master Faculty', lecturesCount: 180 },
        { name: 'Chemistry Master Faculty', lecturesCount: 165 },
      ],
    },
  },
  {
    id: 'announcements',
    name: 'Get Batch Announcements',
    category: 'Core Batches',
    method: 'GET',
    path: '/api/announcements',
    description: 'Broadcast notifications, class rescheduling bulletins, and test schedule alerts.',
    rateLimit: 120,
    params: [
      {
        name: 'batchId',
        type: 'string',
        required: true,
        description: 'Batch identifier',
        example: '634bd315ed7a360018558283',
      },
    ],
    sampleResponse: {
      success: true,
      announcements: [
        {
          id: 'ann_01',
          title: 'Sunday Mock Test Series 01 - Schedule',
          date: '2026-09-20',
          important: true,
        },
      ],
    },
  },
  {
    id: 'auth-token',
    name: 'Generate Short-Lived Access Token',
    category: 'Auth & Health',
    method: 'POST',
    path: '/api/auth/token',
    description: 'Exchange Client ID and Client Secret for a 15-minute Bearer access token for client apps.',
    rateLimit: 30,
    params: [
      {
        name: 'clientId',
        type: 'string (Body)',
        required: true,
        description: 'Issued API Client ID',
        example: 'client_live_a1b2c3d4',
      },
      {
        name: 'clientSecret',
        type: 'string (Body)',
        required: true,
        description: 'Client Secret (shown once upon creation)',
        example: 'sec_live_9f8e7d6c...',
      },
    ],
    sampleResponse: {
      success: true,
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      token_type: 'Bearer',
      expires_in: 900,
    },
  },
  {
    id: 'health',
    name: 'System Gateway Health Probe',
    category: 'Auth & Health',
    method: 'GET',
    path: '/api/health',
    description: 'High-frequency telemetry check for gateway uptime, memory, and security shield status.',
    rateLimit: 300,
    params: [],
    sampleResponse: {
      status: 'HEALTHY',
      uptimeSeconds: 84200,
      activeShield: true,
      version: '3.4.0',
    },
  },
];

export const IntegrationGuide: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpointDef>(API_ENDPOINTS[0]);
  const [activeLang, setActiveLang] = useState<'browser' | 'curl' | 'node' | 'python'>('browser');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const categories = ['ALL', 'Core Batches', 'Lectures & Videos', 'Resources & Tests', 'Auth & Health'];

  const filteredEndpoints = API_ENDPOINTS.filter((ep) => {
    const matchesCat = selectedCategory === 'ALL' || ep.category === selectedCategory;
    const matchesSearch =
      ep.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generateCodeSnippet = (ep: ApiEndpointDef, lang: 'browser' | 'curl' | 'node' | 'python') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    const queryParams = ep.params
      .filter((p) => !p.type.includes('Body'))
      .map((p) => `${p.name}=${encodeURIComponent(p.example)}`)
      .join('&');
    const fullPath = queryParams ? `${ep.path}?${queryParams}` : ep.path;
    const fullUrl = `${origin}${fullPath}`;

    if (lang === 'browser') {
      if (ep.method === 'POST') {
        return `// 1. In your frontend (running on an authorized whitelisted domain):
async function callApi() {
  const response = await fetch('${fullUrl}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': window.location.origin
    },
    body: JSON.stringify({
      clientId: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET'
    })
  });
  const data = await response.json();
  return data;
}`;
      }

      return `// 1. In your frontend (running on an authorized whitelisted domain):
// First retrieve a short-lived token or pass Bearer token in Authorization header:
async function fetch${ep.name.replace(/[^a-zA-Z0-9]/g, '')}() {
  const response = await fetch('${fullUrl}', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer <ACCESS_TOKEN>',
      'Origin': window.location.origin
    }
  });

  if (!response.ok) {
    throw new Error(\`API returned \${response.status}\`);
  }

  const result = await response.json();
  console.log('API Result:', result);
  return result;
}`;
    }

    if (lang === 'curl') {
      if (ep.method === 'POST') {
        return `# cURL Request
curl -X POST "${fullUrl}" \\
  -H "Content-Type: application/json" \\
  -H "Origin: https://example.com" \\
  -d '{"clientId":"YOUR_CLIENT_ID","clientSecret":"YOUR_CLIENT_SECRET"}'`;
      }

      return `# cURL Request (With Bearer Token & Origin)
curl -X GET "${fullUrl}" \\
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \\
  -H "Origin: https://example.com"`;
    }

    if (lang === 'node') {
      return `// Node.js (with HMAC-SHA256 Canonical Signature)
import crypto from 'crypto';
import axios from 'axios';

const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const URL = '${fullUrl}';

async function executeRequest() {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const method = '${ep.method}';
  const endpoint = '${ep.path}';

  // Build Canonical String: METHOD:ENDPOINT:TIMESTAMP:NONCE:
  const canonical = \`\${method}:\${endpoint}:\${timestamp}:\${nonce}:\`;
  const signature = crypto.createHmac('sha256', CLIENT_SECRET).update(canonical).digest('hex');

  const response = await axios({
    method: '${ep.method}',
    url: URL,
    headers: {
      'X-Client-ID': CLIENT_ID,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature
    }
  });

  return response.data;
}`;
    }

    if (lang === 'python') {
      return `# Python 3.9+ (with HMAC-SHA256 Signature)
import time
import uuid
import hmac
import hashlib
import requests

CLIENT_ID = "YOUR_CLIENT_ID"
CLIENT_SECRET = "YOUR_CLIENT_SECRET"
URL = "${fullUrl}"

def call_endpoint():
    timestamp = str(int(time.time() * 1000))
    nonce = uuid.uuid4().hex
    canonical = f"${ep.method}:${ep.path}:{timestamp}:{nonce}:"

    signature = hmac.new(
        CLIENT_SECRET.encode('utf-8'),
        canonical.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    headers = {
        "X-Client-ID": CLIENT_ID,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature
    }

    response = requests.${ep.method.toLowerCase()}(URL, headers=headers)
    return response.json()

print(call_endpoint())`;
    }

    return '';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl liquid-glass border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-2xl liquid-glass-subtle border border-cyan-500/30 text-cyan-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                API Catalog & Developer Integration Guide
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 max-w-2xl font-medium leading-relaxed">
              Complete catalog of 15 production API endpoints. Give this guide to client teams and developers to consume batches (including <span className="text-cyan-300 font-mono font-semibold">Lakshya JEE 2027</span>), lecture videos, slides, and notes securely.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl liquid-glass-subtle border border-emerald-500/30 flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 font-semibold">Gateway Live & Protected</span>
            </div>
          </div>
        </div>

        {/* 3 Step Integration Walkthrough */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-white/10">
          <div className="p-4 rounded-2xl liquid-glass-subtle border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">Step 1</span>
              <LiquidGlobeIcon size={16} className="text-cyan-400" />
            </div>
            <div className="text-xs font-bold text-white">Whitelist Your Domain</div>
            <p className="text-[11px] text-slate-400">
              Add your frontend domain in the <strong>Domain Whitelist</strong> tab. A Client ID and Client Secret are automatically issued.
            </p>
          </div>

          <div className="p-4 rounded-2xl liquid-glass-subtle border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Step 2</span>
              <CrystalKeyIcon size={16} className="text-emerald-400" />
            </div>
            <div className="text-xs font-bold text-white">Choose Authentication</div>
            <p className="text-[11px] text-slate-400">
              Frontends obtain a Bearer Token via <code className="text-cyan-300 font-mono text-[10px]">/api/auth/token</code>. Backend servers sign headers with HMAC-SHA256.
            </p>
          </div>

          <div className="p-4 rounded-2xl liquid-glass-subtle border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Step 3</span>
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xs font-bold text-white">Consume Endpoints</div>
            <p className="text-[11px] text-slate-400">
              Query batches, schedules, and stream URLs. Lakshya JEE 2027 runs smoothly with built-in Pearl Proxy resilience.
            </p>
          </div>
        </div>
      </div>

      {/* Main Catalog View: Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Endpoints Directory */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search & Filter */}
          <div className="space-y-3 p-4 rounded-3xl liquid-glass border border-white/10 shadow-lg">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search endpoints (e.g. video-url, batch, topics)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl liquid-glass-input text-white text-xs placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* Category Chips */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'liquid-btn-primary text-white shadow-md'
                      : 'liquid-btn-glass text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoints List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredEndpoints.map((ep) => {
              const isSelected = selectedEndpoint.id === ep.id;

              return (
                <div
                  key={ep.id}
                  onClick={() => setSelectedEndpoint(ep)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'liquid-glass border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'liquid-glass-subtle border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                          ep.method === 'GET'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">{ep.name}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-500 ${isSelected ? 'text-cyan-400 translate-x-0.5' : ''}`} />
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-slate-400">
                    <span className="truncate max-w-[200px] text-cyan-300">{ep.path}</span>
                    <span className="text-[10px] text-slate-500 font-sans">{ep.rateLimit} req/min</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Endpoint Detail & Interactive Code Generator */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-3xl liquid-glass border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5)] space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                      selectedEndpoint.method === 'GET'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}
                  >
                    {selectedEndpoint.method}
                  </span>
                  <h3 className="text-base font-bold text-white">{selectedEndpoint.name}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">{selectedEndpoint.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(selectedEndpoint.path, 'path-copy')}
                  className="px-3 py-1.5 rounded-xl liquid-btn-glass text-slate-300 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'path-copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{selectedEndpoint.path}</span>
                </button>
              </div>
            </div>

            {/* Parameters Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                Parameters & Query Schema
              </h4>
              {selectedEndpoint.params.length === 0 ? (
                <div className="p-3 rounded-2xl liquid-glass-subtle text-xs text-slate-400">
                  No parameters required. Endpoint responds directly with full dataset.
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="liquid-glass-subtle text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Param</th>
                        <th className="py-2.5 px-3 font-semibold">Type</th>
                        <th className="py-2.5 px-3 font-semibold">Required</th>
                        <th className="py-2.5 px-3 font-semibold">Description / Example</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {selectedEndpoint.params.map((p) => (
                        <tr key={p.name} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-semibold text-cyan-300">{p.name}</td>
                          <td className="py-2.5 px-3 text-slate-400 font-sans">{p.type}</td>
                          <td className="py-2.5 px-3">
                            {p.required ? (
                              <span className="text-rose-400 font-sans font-bold">YES</span>
                            ) : (
                              <span className="text-slate-500 font-sans">Optional</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-300">
                            <div>{p.description}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              e.g.: <span className="text-emerald-400">{p.example}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Code Generator Snippets */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Executable Code Implementation
                </h4>
                <div className="flex items-center gap-1">
                  {(['browser', 'curl', 'node', 'python'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        activeLang === lang
                          ? 'liquid-btn-primary text-white shadow'
                          : 'liquid-btn-glass text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang === 'browser' ? 'Browser (Fetch)' : lang === 'curl' ? 'cURL' : lang === 'node' ? 'Node.js' : 'Python'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 liquid-glass-subtle overflow-hidden relative">
                <button
                  onClick={() =>
                    handleCopy(
                      generateCodeSnippet(selectedEndpoint, activeLang),
                      `code-${selectedEndpoint.id}-${activeLang}`
                    )
                  }
                  className="absolute right-3 top-3 p-1.5 rounded-xl liquid-btn-glass text-slate-400 hover:text-white cursor-pointer z-10"
                  title="Copy code snippet"
                >
                  {copiedKey === `code-${selectedEndpoint.id}-${activeLang}` ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed bg-black/40">
                  {generateCodeSnippet(selectedEndpoint, activeLang)}
                </pre>
              </div>
            </div>

            {/* Sample Response Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sample JSON Response
                </h4>
                <button
                  onClick={() =>
                    handleCopy(
                      JSON.stringify(selectedEndpoint.sampleResponse, null, 2),
                      `resp-${selectedEndpoint.id}`
                    )
                  }
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === `resp-${selectedEndpoint.id}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy JSON</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl border border-white/10 bg-black/50 font-mono text-[11px] text-emerald-300/90 overflow-x-auto max-h-48 leading-relaxed">
                {JSON.stringify(selectedEndpoint.sampleResponse, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
