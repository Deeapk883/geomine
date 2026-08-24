'use client';

import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  UploadCloud, 
  MapPin, 
  Image as ImageIcon, 
  Loader2, 
  Pickaxe, 
  MessageSquare,
  Trash2,
  CheckCircle2,
  Bot
} from 'lucide-react';
import { useMineStore } from '../../store/useMineStore';
import { analyzeMiningChat } from '../../services/api';
import { ChatMessage } from '../../types';

export const GeminiChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'gemini',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: 'Hello! I am your Gemini Mining Intelligence Assistant. Drop a map screenshot or pit image and specify the rough location/area — I will identify what is being mined!'
    }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const roiCoordinates = useMineStore((state) => state.roiCoordinates);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle image file selection / drop
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }
    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUseMapLocation = () => {
    if (roiCoordinates && roiCoordinates[0] && roiCoordinates[0].length > 0) {
      const [lng, lat] = roiCoordinates[0][0];
      setLocationInput(`Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`);
    } else {
      alert('No ROI selected on map. Please draw a region on the map first.');
    }
  };

  const handleSend = async () => {
    if (!selectedImage && !locationInput.trim() && !messageInput.trim()) {
      alert('Please upload an image or provide a location/area description.');
      return;
    }

    const loc = locationInput.trim();
    const textPrompt = messageInput.trim() || 'Identify what is being mined in this image.';

    // Create User Message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textPrompt,
      location: loc || undefined,
      imagePreview: selectedImage || undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAnalyzing(true);

    // Reset Input fields
    const currentImg = selectedImage;
    setSelectedImage(null);
    setImageFileName('');
    setMessageInput('');

    setTimeout(scrollToBottom, 100);

    try {
      const res = await analyzeMiningChat(currentImg, loc, textPrompt);

      const geminiMsg: ChatMessage = {
        id: `gemini-${Date.now()}`,
        sender: 'gemini',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        location: res.location,
        analysis: res.analysis
      };

      setMessages((prev) => [...prev, geminiMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: 'gemini',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `⚠️ Analysis failed: ${err?.message || 'Could not communicate with Gemini API.'}`
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAnalyzing(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <>
      {/* Floating Toggle Button (Bottom-Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute bottom-6 right-6 z-[9999] flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full shadow-2xl shadow-emerald-950/60 border border-emerald-400/40 transition-all duration-300 transform hover:scale-105 group"
          title="Open Gemini Mining Chatbot"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-emerald-200 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-300 rounded-full animate-ping" />
          </div>
          <span className="font-semibold text-sm tracking-wide font-sans">Gemini Mining AI</span>
        </button>
      )}

      {/* Floating Chat Modal Panel */}
      {isOpen && (
        <div className="absolute bottom-6 right-6 z-[9999] w-[420px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-4rem)] flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100 animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-slate-800/80 border-b border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-900/40">
                <Bot className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h3 className="font-semibold text-sm leading-none text-slate-100 flex items-center gap-1.5">
                  Gemini Mining Chatbot
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live AI
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Drop map images & identify minerals</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([
                  {
                    id: 'welcome-msg',
                    sender: 'gemini',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    text: 'Hello! I am your Gemini Mining Intelligence Assistant. Drop a map screenshot or pit image and specify the rough location/area — I will identify what is being mined!'
                  }
                ])}
                className="p-1.5 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                title="Clear Chat History"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-medium text-slate-400">
                    {msg.sender === 'user' ? 'You' : 'Gemini AI'}
                  </span>
                  <span className="text-[10px] text-slate-500">• {msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed border ${
                    msg.sender === 'user'
                      ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-100 rounded-tr-none'
                      : 'bg-slate-800/90 border-slate-700/70 text-slate-200 rounded-tl-none shadow-lg'
                  }`}
                >
                  {/* User attached location pill */}
                  {msg.location && (
                    <div className="flex items-center gap-1 mb-2 px-2 py-1 rounded-md bg-slate-900/60 border border-slate-700/50 text-[11px] text-emerald-400 font-medium">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{msg.location}</span>
                    </div>
                  )}

                  {/* User uploaded image thumbnail */}
                  {msg.imagePreview && (
                    <div className="mb-2 overflow-hidden rounded-lg border border-slate-700/80 max-h-48">
                      <img
                        src={msg.imagePreview}
                        alt="Map Snippet"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {/* Simple text content */}
                  {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                  {/* Gemini Structured Mining Analysis Card */}
                  {msg.analysis && (
                    <div className="space-y-3">
                      {/* Identified Material Badge */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/30">
                        <div className="flex items-center gap-2">
                          <Pickaxe className="w-4 h-4 text-emerald-400" />
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">Identified Material</div>
                            <div className="text-sm font-bold text-slate-100">{msg.analysis.mined_material}</div>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            msg.analysis.confidence === 'High'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : msg.analysis.confidence === 'Medium'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          }`}
                        >
                          {msg.analysis.confidence} Confidence
                        </span>
                      </div>

                      {/* Visual Observations */}
                      {msg.analysis.visual_findings && msg.analysis.visual_findings.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Visual Findings:
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 pl-1">
                            {msg.analysis.visual_findings.map((item, idx) => (
                              <li key={idx} className="leading-snug">{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Geological Context */}
                      {msg.analysis.location_context && (
                        <div className="text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-slate-700/40">
                          <span className="font-semibold text-slate-200">Geological Context: </span>
                          {msg.analysis.location_context}
                        </div>
                      )}

                      {/* Executive Summary */}
                      {msg.analysis.summary && (
                        <p className="text-[11px] text-slate-200 font-medium pt-1 border-t border-slate-700/40">
                          {msg.analysis.summary}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isAnalyzing && (
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[10px] font-medium text-emerald-400">Gemini AI</span>
                </div>
                <div className="bg-slate-800/90 border border-slate-700/70 text-slate-200 rounded-2xl rounded-tl-none p-3.5 text-xs flex items-center gap-2.5 shadow-lg">
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-slate-300">Analyzing visual features & regional geology...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Controls */}
          <div className="p-3 bg-slate-800/90 border-t border-slate-700/70 space-y-2.5">
            
            {/* Image Dropzone / Preview */}
            {selectedImage ? (
              <div className="flex items-center justify-between p-2 bg-emerald-950/40 border border-emerald-600/40 rounded-xl">
                <div className="flex items-center gap-2 overflow-hidden">
                  <img src={selectedImage} alt="Thumbnail" className="w-9 h-9 rounded object-cover border border-emerald-500/40" />
                  <span className="text-xs text-slate-200 truncate max-w-[200px]">{imageFileName}</span>
                </div>
                <button
                  onClick={() => { setSelectedImage(null); setImageFileName(''); }}
                  className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-2 px-3 bg-slate-900/60 hover:bg-slate-900/90 border border-dashed border-slate-600/80 hover:border-emerald-500/60 rounded-xl cursor-pointer transition-colors text-slate-400 hover:text-slate-200 group"
              >
                <UploadCloud className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                <span className="text-xs font-medium">Drop map screenshot or click to upload</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={(e) => e.target.files && e.target.files[0] && handleImageFile(e.target.files[0])}
                  className="hidden"
                />
              </div>
            )}

            {/* Location / Area Row */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Area / Location (optional, e.g. Stone Quarry, Site A)"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-900/80 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
              <button
                type="button"
                onClick={handleUseMapLocation}
                className="px-2 py-1.5 bg-slate-700/60 hover:bg-slate-700 border border-slate-600/60 rounded-lg text-[11px] font-medium text-emerald-300 hover:text-emerald-200 transition-colors whitespace-nowrap"
                title="Auto-fill location from current map ROI"
              >
                📍 Active ROI
              </button>
            </div>

            {/* Prompt Text & Send Button */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask Gemini (optional text)..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && handleSend()}
                className="flex-1 px-3 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
              <button
                onClick={handleSend}
                disabled={isAnalyzing || (!selectedImage && !locationInput.trim() && !messageInput.trim())}
                className="p-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl shadow-md transition-all duration-200"
                title="Send to Gemini"
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
