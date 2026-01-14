"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from 'next/navigation'
import { 
  AlertCircle, 
  Upload, 
  FileText, 
  FileJson,
  CheckCircle2,
  ShieldAlert,
  Plus
} from 'lucide-react'
import { ingestPdfStream, api } from "../../lib/api" 

// --- UI COMPONENTS ---
const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary',
  size?: 'default' | 'sm' | 'lg' | 'icon'
}>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-bold uppercase tracking-wide ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    
    const variants = {
      default: "bg-orange-600 text-white hover:bg-zinc-900 shadow-sm",
      secondary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
      outline: "border border-zinc-300 bg-transparent hover:bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800",
      ghost: "hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-50",
      destructive: "bg-red-600 text-white hover:bg-red-700"
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-sm px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ""}`}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`bg-white dark:bg-zinc-900 rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-950 dark:text-zinc-50 ${className || ""}`}
      {...props}
    />
  )
)
Card.displayName = "Card"

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "success" }>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={`relative w-full rounded-sm border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 ${
        variant === "destructive"
          ? "border-red-500/50 text-red-600 dark:border-red-500 [&>svg]:text-red-600 dark:border-red-900/50 dark:text-red-500 dark:dark:border-red-900 dark:[&>svg]:text-red-500"
          : variant === "success"
          ? "border-emerald-500/50 text-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-500/50 dark:text-emerald-50 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
          : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50 [&>svg]:text-zinc-950 dark:[&>svg]:text-zinc-50"
      } ${className || ""}`}
      {...props}
    />
  )
)
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`text-sm [&_p]:leading-relaxed ${className || ""}`}
      {...props}
    />
  )
)
AlertDescription.displayName = "AlertDescription"

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDark])

  return (
    <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="rounded-full border border-zinc-200 dark:border-zinc-800">
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="12" cy="12" r="5"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M17.56 17.56l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M17.56 6.44l1.42-1.42"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-900"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      )}
    </Button>
  )
}

// --- MAIN COMPONENT ---

export default function AdminDashboard() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false) 

  // Remote files
  const [remoteUploadedPdfs, setRemoteUploadedPdfs] = useState<string[]>([])
  const [remoteGeneratedReports, setRemoteGeneratedReports] = useState<string[]>([])
  const [isFetchingRemote, setIsFetchingRemote] = useState(false)

  // Upload States
  const [isSingleUploading, setIsSingleUploading] = useState(false)
  const [singleProgress, setSingleProgress] = useState(0)
  const [singleStatusMsg, setSingleStatusMsg] = useState("")

  const [isBulkUploading, setIsBulkUploading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const [bulkStatusMsg, setBulkStatusMsg] = useState("")
  
  // Alert States
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  // Security Check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await api.user.getProfile().catch(() => null);
        if (user && user.role === 'admin') {
          setAuthorized(true);
        } else {
          router.push("/");
        }
      } catch (e) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  async function fetchRemoteFiles() {
    setIsFetchingRemote(true)
    try {
      // ✅ UPDATED: Use api.ingestion.list()
      const data = await api.ingestion.list()
      
      const newUploaded = Array.isArray(data.uploaded_pdfs) ? data.uploaded_pdfs : []
      const newReports = Array.isArray(data.generated_reports) ? data.generated_reports : []

      setRemoteUploadedPdfs(newUploaded)
      setRemoteGeneratedReports(newReports)
    } catch (err: any) {
      console.error('Error fetching remote files', err)
      setErrorMessage(err?.message || 'Failed to fetch remote files')
    } finally {
      setIsFetchingRemote(false)
    }
  }

  // Load files on mount if authorized
  useEffect(() => {
    if(authorized) fetchRemoteFiles()
  }, [authorized])

  async function handleDownloadMd(filename: string) {
    try {
      setErrorMessage("")
      // ✅ UPDATED: Use api.ingestion.getDownloadUrl()
      const url = api.ingestion.getDownloadUrl(filename)
      window.open(url, '_blank')
    } catch (err: any) {
      console.error('Error downloading md', err)
      setErrorMessage(err?.message || 'Failed to download report')
    }
  }

  const handleSingleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    setErrorMessage("")
    setSuccessMessage("")
    setIsSingleUploading(true)
    setSingleProgress(0)
    setSingleStatusMsg("Starting upload...")

    const file = files[0]
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorMessage("Only PDF files are allowed")
      setIsSingleUploading(false)
      return
    }

    await ingestPdfStream(file, {
      onProgress: (progress, message) => {
        setSingleProgress(progress)
        setSingleStatusMsg(message)
      },
      onError: (msg) => {
        setErrorMessage(msg)
        setIsSingleUploading(false)
      },
      onComplete: () => {
         setSingleProgress(100)
         setSingleStatusMsg("Complete")
         setSuccessMessage("File successfully uploaded.")
         setTimeout(() => setIsSingleUploading(false), 1000)
         fetchRemoteFiles() // Refresh list
      }
    })
    
    event.target.value = ""
  }

  // Loading state for auth
  if (!authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4 text-zinc-500">
          <ShieldAlert className="h-12 w-12 animate-pulse" />
          <p>Verifying Admin Privileges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col p-4 md:p-8 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans">
      
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-5 text-zinc-900 dark:text-white pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Header */}
      <div className="relative z-10 mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="outline" onClick={() => router.push("/")} className="inline-flex">Back</Button>
          </div>
          <div className="text-center mx-4 flex-1">
            <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">PDF Management</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">Upload fleet manuals, maintenance logs, and compliance reports.</p>
          </div>
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-medium ml-2">{errorMessage}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success" className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="font-medium ml-2">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      <div className="grid md:grid-cols-2 gap-6 mb-8 relative z-10">
        <Card className={`group relative overflow-hidden transition-all duration-300 ${isSingleUploading ? 'border-orange-500 ring-1 ring-orange-500' : 'hover:border-orange-500 dark:hover:border-orange-500'}`}>
          <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-300 ${isSingleUploading ? 'bg-orange-600' : 'bg-zinc-200 dark:bg-zinc-800 group-hover:bg-orange-600'}`} />
          <div className="p-6 md:p-8 pl-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-sm text-orange-600">
                <Upload className="w-6 h-6" />
              </div>
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-wide">Single PDF Upload</h2>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 text-sm">Upload individual fleet documents manually.</p>

            <div className="space-y-4">
              <label className="block">
                <div className={`relative border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-all group/upload ${isSingleUploading ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 cursor-not-allowed' : 'border-zinc-300 dark:border-zinc-700 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10'}`}>
                  <input type="file" accept=".pdf" onChange={handleSingleFileUpload} disabled={isSingleUploading || isBulkUploading} className="hidden" />
                  <FileText className={`w-12 h-12 mx-auto mb-3 transition-colors ${isSingleUploading ? 'text-orange-500 animate-pulse' : 'text-zinc-400 dark:text-zinc-600 group-hover/upload:text-orange-500'}`} />
                  <p className="text-zinc-900 dark:text-white font-bold uppercase text-sm tracking-wide">{isSingleUploading ? "Processing..." : "Click to browse"}</p>
                </div>
              </label>

              {isSingleUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{singleStatusMsg}</span>
                    <span className="text-xs font-bold text-orange-600">{Math.round(singleProgress)}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-orange-600 h-full transition-all duration-300" style={{ width: `${singleProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Placeholder for Bulk Upload (Disabled for simplicity in this snippet) */}
        <Card className="opacity-50 cursor-not-allowed">
           <div className="p-6 md:p-8 pl-8 flex items-center justify-center h-full">
               <p className="text-zinc-500">Bulk Upload (Coming Soon)</p>
           </div>
        </Card>
      </div>

      {/* Remote Files List */}
      <div className="grid md:grid-cols-2 gap-6 mb-6 relative z-10">
        <Card>
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-orange-600" />
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-wide">Remote PDFs <span className="text-zinc-400 ml-2">({remoteUploadedPdfs.length})</span></h2>
              <div className="ml-auto">
                <Button variant="ghost" size="sm" onClick={fetchRemoteFiles} className="inline-flex">Refresh</Button>
              </div>
            </div>

            {isFetchingRemote ? (
              <div className="text-sm text-zinc-500">Loading...</div>
            ) : remoteUploadedPdfs.length === 0 ? (
              <div className="text-sm text-zinc-500">No PDFs found.</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {remoteUploadedPdfs.map((name) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-sm border border-zinc-200 dark:border-zinc-800">
                    <div className="truncate text-sm font-medium">{name}</div>
                    <Button variant="secondary" size="sm" onClick={() => handleDownloadMd(name)}>Download</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <FileJson className="w-6 h-6 text-emerald-600" />
              <h2 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-wide">Reports <span className="text-zinc-400 ml-2">({remoteGeneratedReports.length})</span></h2>
              <div className="ml-auto">
                 <Button variant="ghost" size="sm" onClick={fetchRemoteFiles} className="inline-flex">Refresh</Button>
              </div>
            </div>

            {isFetchingRemote ? (
              <div className="text-sm text-zinc-500">Loading...</div>
            ) : remoteGeneratedReports.length === 0 ? (
              <div className="text-sm text-zinc-500">No reports found.</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {remoteGeneratedReports.map((name) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-sm border border-zinc-200 dark:border-zinc-800">
                    <div className="truncate text-sm font-medium">{name}</div>
                    <Button variant="secondary" size="sm" onClick={() => handleDownloadMd(name)}>Download</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}