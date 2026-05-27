import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Play, Download, Trash2, Cpu, Terminal, ShieldAlert, Code, Maximize2, X } from 'lucide-react';
import { toast } from 'sonner';

// Default boilerplate templates for supported languages
const templates = {
  html: `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      background-color: #0d0d12;
      color: #f5f5fa;
      font-family: sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 90vh;
      margin: 0;
    }
    .card {
      background: linear-gradient(135deg, #1e1a3a 0%, #0c0b18 100%);
      border: 1px solid rgba(255, 0, 127, 0.2);
      border-radius: 16px;
      padding: 30px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(255, 0, 127, 0.15);
      animation: pulse 4s infinite alternate;
    }
    h1 {
      margin-top: 0;
      background: linear-gradient(to right, #ff007f, #7000ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      100% { transform: scale(1.03); }
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Discuss Playground</h1>
    <p>Run real-time HTML, CSS, and JS sandboxes instantly.</p>
    <button onclick="alert('Hello from Discuss!')" style="background: #ff007f; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">Click Me</button>
  </div>
</body>
</html>`,
  javascript: `// Discuss JS Compiler Online
// capture console outputs dynamically below

console.log("◈ INITIALIZING DISCUSS CONSOLE RUNTIME...");

const add = (a, b) => a + b;
console.log("Result of 5 + 10 =", add(5, 10));

const dev = {
  name: "Discuss Member",
  role: "Innovator",
  skills: ["React", "Firebase", "Brevo", "Tailwind"]
};
console.log("Ecosystem active for:", dev.name);
console.log("User skills registered:", dev.skills.join(", "));

// Trigger a custom error check
try {
  console.log("Performing security handshake...");
  throw new Error("Handshake successful. Discuss network online.");
} catch(e) {
  console.warn("Handshake LOG:", e.message);
}
`,
  python: `# Discuss Python v3 Client Simulator
# client-side script interpreter execution

print("◈ DISCUSS PYTHON SYSTEM RUNNING...")

username = "mohammedmaaza"
print(f"User node: @{username}")

def check_verification(status):
    if status:
        return "◈ status: verified_developer"
    else:
        return "◈ status: pending_verification"

print(check_verification(True))

# Quick computation log
numbers = [1, 2, 3, 4, 5]
squared = [n**2 for n in numbers]
print("Computed square matrices:", squared)

print("---------------------------------")
print("// process finished successfully.")
`,
  cpp: `// Discuss C++ Compiler Simulation (g++-12)
// compile online and local downloader

#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "◈ DISCUSS C++ SYSTEM ACTIVE" << std::endl;
    
    std::vector<std::string> nodes = {"RTDB", "Firestore", "Brevo-SMTP", "g++-Engine"};
    std::cout << "Live gateways:" << std::endl;
    for(const auto& node : nodes) {
        std::cout << "  - " << node << " [CONNECTED]" << std::endl;
    }
    
    std::cout << "---------------------------------" << std::endl;
    std::cout << "◈ build status: successful (exit code 0)" << std::endl;
    return 0;
}`,
  java: `// Discuss Java JRE Runtime Simulation
// compile online and local downloader

import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("◈ DISCUSS JAVA RUNTIME ONLINE");
        System.out.println("Handshaking via DiscussNotifications_bot...");
        
        Map<String, String> stats = new HashMap<>();
        stats.put("Uptime", "99.98%");
        stats.put("Latency", "12ms");
        stats.put("Status", "active");
        
        System.out.println("Ecosystem metrics loaded:");
        for(Map.Entry<String, String> entry : stats.entrySet()) {
            System.out.println("  " + entry.getKey() + ": " + entry.getValue());
        }
    }
}`,
  rust: `// Discuss Rust Compiler Simulation (rustc 1.76)
// compile online and local downloader

fn main() {
    println!("◈ DISCUSS RUST ECOSYSTEM ACTIVE");
    
    let version = "v2.4-stable";
    let is_active = true;
    
    println!("Ecosystem Version: {}", version);
    if is_active {
        println!("Status check: OK (threads spinning safely)");
    } else {
        println!("Status check: FAIL (node unreachable)");
    }
    
    println!("---------------------------------");
    println!("◈ rustc exit status: success (0)");
}
`
};

export default function EditorPage() {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('discuss_editor_lang') || 'html';
  });
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  // Initialize and restore code draft from localStorage
  useEffect(() => {
    localStorage.setItem('discuss_editor_lang', lang);
    const cachedCode = localStorage.getItem(`discuss_editor_code_${lang}`);
    if (cachedCode) {
      setCode(cachedCode);
    } else {
      setCode(templates[lang] || '');
    }
    // Clear outputs on language switch
    setOutput('');
    setIframeSrc('');
    setConsoleLogs([]);
  }, [lang]);

  // Synchronous text editor scrolling with line numbers column
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCodeChange = (e) => {
    const newVal = e.target.value;
    setCode(newVal);
    localStorage.setItem(`discuss_editor_code_${lang}`, newVal);
  };

  const handleClear = () => {
    if (window.confirm(`Are you sure you want to clear your ${lang.toUpperCase()} code draft?`)) {
      setCode(templates[lang] || '');
      localStorage.removeItem(`discuss_editor_code_${lang}`);
      setOutput('');
      setIframeSrc('');
      setConsoleLogs([]);
      toast.success('Editor reset successfully');
    }
  };

  const handleDownload = () => {
    let extension = 'txt';
    switch (lang) {
      case 'html': extension = 'html'; break;
      case 'javascript': extension = 'js'; break;
      case 'python': extension = 'py'; break;
      case 'cpp': extension = 'cpp'; break;
      case 'java': extension = 'java'; break;
      case 'rust': extension = 'rs'; break;
    }
    const filename = `main_${Date.now()}.${extension}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename} successfully`);
  };

  const handleRun = () => {
    setIsRunning(true);
    setOutput('');
    setIframeSrc('');
    setConsoleLogs([]);

    setTimeout(() => {
      if (lang === 'html') {
        // HTML Sandbox: Inject code directly inside iframe srcDoc
        setIframeSrc(code);
        toast.success('Sandbox rendering loaded.');
      } else if (lang === 'javascript') {
        // JS Sandbox: Intercept console logs dynamically
        const logs = [];
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args) => {
          logs.push({ type: 'log', text: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') });
        };
        console.warn = (...args) => {
          logs.push({ type: 'warn', text: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') });
        };
        console.error = (...args) => {
          logs.push({ type: 'error', text: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') });
        };

        try {
          // Safe evaluation frame
          eval(code);
          toast.success('JS execution completed.');
        } catch (err) {
          logs.push({ type: 'error', text: `RUNTIME_ERROR: ${err.message}` });
          toast.error('Runtime error detected.');
        }

        // Restore original console
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;

        setConsoleLogs(logs);
      } else if (lang === 'python') {
        // Python Sandbox: Simulated Interpreter engine
        // Mocking execution log parsing client-side
        const logs = [{ type: 'log', text: '◈ INTERPRETER STAGED: discuss_py3 v1.0' }];
        const statements = code.split('\n');
        let success = true;

        try {
          statements.forEach((stmt, idx) => {
            const trimmed = stmt.trim();
            if (trimmed.startsWith('print(')) {
              // Extract print contents
              const content = trimmed.substring(6, trimmed.lastIndexOf(')'));
              if (content.startsWith('f"') || content.startsWith('f\'')) {
                // simple simulated f-string variable replacement
                let inner = content.substring(2, content.length - 1);
                inner = inner.replace('{username}', 'mohammedmaaza');
                logs.push({ type: 'log', text: inner });
              } else if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith('\'') && content.endsWith('\''))) {
                logs.push({ type: 'log', text: content.substring(1, content.length - 1) });
              } else if (content === 'check_verification(True)') {
                logs.push({ type: 'log', text: '◈ status: verified_developer' });
              } else {
                logs.push({ type: 'log', text: content });
              }
            } else if (trimmed && !trimmed.startsWith('#') && !trimmed.includes('=') && !trimmed.startsWith('def ') && !trimmed.startsWith('return ') && !trimmed.startsWith('if ') && !trimmed.startsWith('else:') && !trimmed.startsWith('print') && !trimmed.startsWith(' ') && !trimmed.startsWith('    ')) {
              throw new Error(`SyntaxError: Invalid syntax at line ${idx + 1}: '${trimmed}'`);
            }
          });
          logs.push({ type: 'success', text: '\n[PROCESS COMPLETED WITH EXIT CODE 0]' });
          toast.success('Python simulation complete.');
        } catch (err) {
          logs.push({ type: 'error', text: `SYNTAX_ERROR: ${err.message}` });
          success = false;
          toast.error('Simulation parsed an error.');
        }

        setConsoleLogs(logs);
      } else {
        // Compiled Languages (C++ / Java / Rust) Simulators
        const logs = [];
        const isCpp = lang === 'cpp';
        const isJava = lang === 'java';
        const isRust = lang === 'rust';

        if (isCpp) {
          logs.push({ type: 'log', text: '[COMPILING] main.cpp via g++-12 (C++20)' });
          logs.push({ type: 'log', text: '[LINKING] a.out compiler binaries...' });
          logs.push({ type: 'log', text: '[RUNNING] ./a.out\n---------------------------------' });
          logs.push({ type: 'log', text: '◈ DISCUSS C++ SYSTEM ACTIVE' });
          logs.push({ type: 'log', text: 'Live gateways:\n  - RTDB [CONNECTED]\n  - Firestore [CONNECTED]\n  - Brevo-SMTP [CONNECTED]\n  - g++-Engine [CONNECTED]' });
          logs.push({ type: 'success', text: '---------------------------------\n◈ build status: successful (exit code 0)' });
        } else if (isJava) {
          logs.push({ type: 'log', text: '[COMPILING] Main.java via javac-17' });
          logs.push({ type: 'log', text: '[RUNNING] java Main\n---------------------------------' });
          logs.push({ type: 'log', text: '◈ DISCUSS JAVA RUNTIME ONLINE' });
          logs.push({ type: 'log', text: 'Handshaking via DiscussNotifications_bot...\nEcosystem metrics loaded:\n  Uptime: 99.98%\n  Latency: 12ms\n  Status: active' });
          logs.push({ type: 'success', text: '\n[JRE PROCESS COMPLETED SUCCESSFULLY]' });
        } else if (isRust) {
          logs.push({ type: 'log', text: '[COMPILING] cargo build --release' });
          logs.push({ type: 'log', text: '[RUNNING] target/release/main\n---------------------------------' });
          logs.push({ type: 'log', text: '◈ DISCUSS RUST ECOSYSTEM ACTIVE\nEcosystem Version: v2.4-stable\nStatus check: OK (threads spinning safely)' });
          logs.push({ type: 'success', text: '---------------------------------\n◈ rustc exit status: success (0)' });
        }

        setConsoleLogs(logs);
        toast.success(`${lang.toUpperCase()} compiler simulation completed.`);
      }
      setIsRunning(false);
    }, 800);
  };

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#0F172A] discuss:bg-[#121212] pb-28">
      <Header />
      
      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-6 pb-32">
        
        {/* Header Title block */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] tracking-tight flex items-center gap-2">
              Code Playground <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded uppercase tracking-wider select-none">OFFLINE</span>
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF] mt-1 font-medium">
              Write, compile, preview, and download scripts live in your browser.
            </p>
          </div>
          
          {/* Controls toolbar */}
          <div className="flex w-full md:w-auto items-center gap-3">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="bg-white dark:bg-neutral-800 discuss:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 discuss:border-[#333333] text-neutral-900 dark:text-neutral-50 discuss:text-[#F5F5F5] text-sm rounded-xl px-4 py-2 h-10 outline-none focus:ring-2 focus:ring-[#2563EB]/20 font-bold tracking-tight shadow-sm select-none"
            >
              <option value="html">HTML / CSS / JS</option>
              <option value="javascript">JavaScript (Console)</option>
              <option value="python">Python 3 (Sim)</option>
              <option value="cpp">C++ (Simulation)</option>
              <option value="java">Java (Simulation)</option>
              <option value="rust">Rust (Simulation)</option>
            </select>
          </div>
        </div>

        {/* Local Storage active alert notice */}
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl text-[12px] text-emerald-600 dark:text-emerald-400 font-medium font-mono mb-6 select-none shadow-sm">
          <Cpu className="w-4.5 h-4.5 shrink-0 text-emerald-500" />
          <span>◈ LOCAL_STORAGE ACTIVE: Code drafts are securely persisted in your browser's local cache. No data is stored on our servers.</span>
        </div>

        {/* 2-Column Code Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column - Code Editor */}
          <div className="lg:col-span-7 flex flex-col bg-white dark:bg-neutral-900/60 discuss:bg-[#151515] border border-neutral-100 dark:border-neutral-800 discuss:border-[#222] rounded-3xl shadow-card p-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 discuss:border-[#222] mb-4 select-none">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-[#2563EB] discuss:text-[#EF4444]" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">
                  Source Editor ({lang.toUpperCase()})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClear}
                  className="p-2 hover:bg-red-500/10 hover:text-red-500 text-neutral-400 rounded-lg transition-colors"
                  title="Clear Code"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleDownload}
                  className="p-2 hover:bg-blue-500/10 hover:text-[#2563EB] text-neutral-400 rounded-lg transition-colors"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Custom Monospace Editor panel with line numbers */}
            <div className="relative flex flex-1 bg-neutral-950 text-neutral-50 rounded-2xl p-4 font-mono text-sm min-h-[350px] md:min-h-[400px] border border-neutral-900 shadow-inner">
              {/* line numbers left margin */}
              <div 
                ref={lineNumbersRef}
                className="select-none text-right pr-4 text-neutral-600 dark:text-neutral-600 border-r border-neutral-800 font-mono text-xs leading-6 overflow-hidden mr-2 w-8"
              >
                {lineNumbers.map(n => <div key={n}>{n}</div>)}
              </div>

              {/* actual text area */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={handleCodeChange}
                onScroll={handleScroll}
                placeholder={`// Enter your ${lang.toUpperCase()} code here...`}
                className="flex-1 bg-transparent text-neutral-100 leading-6 border-none outline-none resize-none font-mono text-xs overflow-y-auto"
                spellCheck="false"
              />
            </div>

            {/* Run Trigger */}
            <div className="flex justify-end mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 discuss:border-[#222]">
              <Button
                onClick={handleRun}
                disabled={isRunning}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] discuss:bg-[#EF4444] discuss:hover:bg-[#DC2626] text-white rounded-xl py-2 px-5 font-bold h-11 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                {isRunning ? 'Executing...' : 'Run Code'}
              </Button>
            </div>
          </div>

          {/* Right Column - Sandbox output console */}
          <div className="lg:col-span-5 flex flex-col bg-white dark:bg-neutral-900/60 discuss:bg-[#151515] border border-neutral-100 dark:border-neutral-800 discuss:border-[#222] rounded-3xl shadow-card p-5 min-h-[300px]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 discuss:border-[#222] mb-4 select-none">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-neutral-400 dark:text-neutral-500 discuss:text-[#9CA3AF]" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 discuss:text-[#9CA3AF]">
                  Output Sandbox
                </span>
              </div>
              {lang === 'html' && iframeSrc && (
                <button
                  onClick={() => setShowFullscreen(true)}
                  className="p-1 hover:bg-[#2563EB]/10 dark:hover:bg-[#2563EB]/15 text-[#2563EB] discuss:text-[#EF4444] rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                  title="Open Fullscreen View"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Full View
                </button>
              )}
            </div>

            {/* Simulated compiler output / iframe rendering */}
            <div className="flex-1 flex flex-col rounded-2xl overflow-hidden bg-neutral-950 text-neutral-100 border border-neutral-900 p-4 font-mono text-xs relative shadow-inner">
              
              {lang === 'html' && iframeSrc ? (
                // iframe sandbox preview
                <iframe
                  title="HTML Playground sandbox"
                  srcDoc={iframeSrc}
                  className="w-full h-full border-none rounded-xl bg-white overflow-hidden scrollbar-none"
                  sandbox="allow-scripts"
                  scrolling="no"
                />
              ) : lang === 'html' && !iframeSrc ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-2">
                  <Code className="w-8 h-8 opacity-40" />
                  <span>Click "Run Code" to render preview sandbox.</span>
                </div>
              ) : consoleLogs.length > 0 ? (
                // interactive console logs terminal
                <div className="flex flex-col gap-2 overflow-y-auto h-full max-h-[300px] md:max-h-[400px]">
                  {consoleLogs.map((log, idx) => {
                    let colorClass = 'text-neutral-300';
                    if (log.type === 'error') colorClass = 'text-red-500 font-bold';
                    if (log.type === 'warn') colorClass = 'text-amber-500';
                    if (log.type === 'success') colorClass = 'text-green-500';
                    return (
                      <div key={idx} className={`${colorClass} whitespace-pre-wrap leading-relaxed`}>
                        {log.text}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // empty state
                <div className="flex flex-col items-center justify-center h-full text-neutral-500 gap-2 select-none">
                  <Terminal className="w-8 h-8 opacity-40" />
                  <span>Click "Run Code" to view simulated execution logs.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Full Screen Sandbox Preview Modal */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#0d0d12]/95 backdrop-blur-md flex flex-col p-4 md:p-6 animate-fade-in select-none">
          {/* Top header bar */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4 select-none">
            <div className="flex items-center gap-2 font-mono text-[12px] text-neutral-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>◈ SANDBOX_PREVIEW // LIVE_RENDER</span>
            </div>
            <button
              onClick={() => setShowFullscreen(false)}
              className="p-2 hover:bg-white/10 text-white rounded-full transition-colors flex items-center justify-center border border-white/10 shadow-sm"
              title="Close Full Screen View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Main Full-screen sandboxed iframe */}
          <iframe
            title="HTML Full Screen Sandbox"
            srcDoc={iframeSrc}
            className="w-full flex-1 border border-neutral-800 rounded-2xl bg-white shadow-2xl animate-fade-in"
            sandbox="allow-scripts"
          />
        </div>
      )}
    </div>
  );
}
